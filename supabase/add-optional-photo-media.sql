-- Run once for existing projects that already use schema.sql.
alter table public.recipes alter column video_path drop not null;
alter table public.recipes alter column video_url drop not null;
alter table public.recipes alter column video_mime drop not null;
alter table public.recipes alter column video_size_bytes drop not null;

alter table public.recipes add column if not exists image_path text unique;
alter table public.recipes add column if not exists image_url text;
alter table public.recipes add column if not exists image_mime text check (image_mime in ('image/jpeg', 'image/png', 'image/webp'));
alter table public.recipes add column if not exists image_size_bytes bigint check (image_size_bytes > 0 and image_size_bytes <= 10485760);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Public recipe images are viewable" on storage.objects for select using (bucket_id = 'recipe-images');
create policy "Guests upload only to their own image folder" on storage.objects for insert to authenticated with check (
  bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "Guests update only their own images" on storage.objects for update to authenticated using (
  bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
) with check (
  bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "Guests delete only their own images" on storage.objects for delete to authenticated using (
  bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
