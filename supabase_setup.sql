-- ============================================================
-- ScoreQuest — Supabase database setup
-- Run this once in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================

-- 1. profiles table: one row per user, holds hero name + game progress.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  hero_name   text,
  xp          integer     not null default 0,
  streak      integer     not null default 0,
  realms      jsonb       not null default '{}'::jsonb,  -- { "algebra": {"level":2,"cleared":true}, ... }
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- 2. Row Level Security: this is the real protection. The public anon key
--    shipped in the browser can do NOTHING except what these policies allow —
--    each user may read and write ONLY their own row.
alter table public.profiles enable row level security;

drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "insert own profile"  on public.profiles;
drop policy if exists "update own profile"  on public.profiles;

create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Auto-create a profile row whenever a new user signs up (email or Google).
--    Pulls hero_name from signup metadata, falls back to the email handle.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, hero_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'hero_name',
      new.raw_user_meta_data ->> 'full_name',   -- Google provides full_name
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Keep updated_at fresh on every write.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Done. Next: enable the Google provider under Authentication -> Providers,
-- and add your GitHub Pages URL under Authentication -> URL Configuration
-- (see SETUP_AUTH.md).
