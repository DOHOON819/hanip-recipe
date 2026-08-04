-- 한입 레시피: 사용자 계정, 레시피, 실제 동영상 업로드를 위한 Supabase 스키마
-- Supabase SQL Editor에서 한 번 실행합니다.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 600),
  category text not null check (category in ('한식', '간편식', '면·파스타', '디저트', '음료', '기타')),
  cook_minutes integer not null check (cook_minutes between 1 and 600),
  servings integer not null default 1 check (servings between 1 and 50),
  difficulty text not null default '쉬움' check (difficulty in ('쉬움', '보통', '어려움')),
  video_path text not null unique,
  video_url text not null,
  video_mime text not null check (video_mime in ('video/mp4', 'video/webm', 'video/quicktime')),
  video_size_bytes bigint not null check (video_size_bytes > 0 and video_size_bytes <= 104857600),
  visibility text not null default 'published' check (visibility in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position integer not null check (position >= 0),
  item text not null check (char_length(item) between 1 and 120),
  quantity text not null default '' check (char_length(quantity) <= 60),
  unique (recipe_id, position)
);

create table if not exists public.recipe_steps (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position integer not null check (position >= 0),
  instruction text not null check (char_length(instruction) between 2 and 500),
  unique (recipe_id, position)
);

create table if not exists public.recipe_saves (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index if not exists recipes_public_feed_idx on public.recipes (created_at desc) where visibility = 'published';
create index if not exists recipes_author_idx on public.recipes (author_id, created_at desc);
create index if not exists ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);
create index if not exists steps_recipe_idx on public.recipe_steps (recipe_id, position);

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_saves enable row level security;

grant select on public.profiles, public.recipes, public.recipe_ingredients, public.recipe_steps to anon, authenticated;
grant insert, update, delete on public.profiles, public.recipes, public.recipe_ingredients, public.recipe_steps, public.recipe_saves to authenticated;
grant select on public.recipe_saves to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "Public profiles are readable" on public.profiles for select using (true);
create policy "Users create their profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users update their profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Published recipes are readable" on public.recipes for select using (visibility = 'published' or (select auth.uid()) = author_id);
create policy "Users create their recipes" on public.recipes for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Users update their recipes" on public.recipes for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "Users delete their recipes" on public.recipes for delete to authenticated using ((select auth.uid()) = author_id);

create policy "Recipe ingredients are readable with the recipe" on public.recipe_ingredients for select using (
  exists (select 1 from public.recipes r where r.id = recipe_id and (r.visibility = 'published' or r.author_id = (select auth.uid())))
);
create policy "Owners manage recipe ingredients" on public.recipe_ingredients for all to authenticated using (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
) with check (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
);

create policy "Recipe steps are readable with the recipe" on public.recipe_steps for select using (
  exists (select 1 from public.recipes r where r.id = recipe_id and (r.visibility = 'published' or r.author_id = (select auth.uid())))
);
create policy "Owners manage recipe steps" on public.recipe_steps for all to authenticated using (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
) with check (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
);

create policy "Users read their saves" on public.recipe_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their saves" on public.recipe_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users delete their saves" on public.recipe_saves for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-videos',
  'recipe-videos',
  true,
  104857600,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public recipe videos are playable" on storage.objects for select using (bucket_id = 'recipe-videos');
create policy "Authenticated users upload only to their folder" on storage.objects for insert to authenticated with check (
  bucket_id = 'recipe-videos' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "Users update only their videos" on storage.objects for update to authenticated using (
  bucket_id = 'recipe-videos' and (storage.foldername(name))[1] = (select auth.uid()::text)
) with check (
  bucket_id = 'recipe-videos' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "Users delete only their videos" on storage.objects for delete to authenticated using (
  bucket_id = 'recipe-videos' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
