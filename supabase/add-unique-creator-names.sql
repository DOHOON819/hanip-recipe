-- Creator names are public and cannot be reused, even with different letter case.
create unique index if not exists profiles_display_name_unique_ci on public.profiles (lower(display_name));
