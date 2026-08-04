-- Run once after add-optional-photo-media.sql.
alter table public.recipes
  add column if not exists image_fit text not null default 'cover'
  check (image_fit in ('cover', 'contain'));
