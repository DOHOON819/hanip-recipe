-- Expand Recipe Book categories for an international audience.
-- Run once in the Supabase SQL Editor for an existing project.

alter table public.recipes
  drop constraint if exists recipes_category_check;

alter table public.recipes
  add constraint recipes_category_check
  check (category in (
    '한식', '일식', '중식', '멕시칸', '아메리칸', '프렌치', '이탈리안', '인도식',
    '브런치', '도시락', '간편식', '면·파스타', '채식',
    '디저트', '음료', '기타'
  ));
