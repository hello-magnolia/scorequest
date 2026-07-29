-- ============================================================
-- ScoreQuest — Supabase database setup
-- Run this once in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================

-- 1. profiles table: one row per user, holds hero name + game progress.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  hero_name   text,                                       -- the name the player CHOSE in the intro
  full_name   text,                                       -- the real name Google handed us (parent surfaces only)
  xp          integer     not null default 0,
  streak      integer     not null default 0,
  realms      jsonb       not null default '{}'::jsonb,  -- { "algebra": {"level":2,"cleared":true}, ... }
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- 1b. Upgrade path: `create table if not exists` above is a no-op on an existing
--     project, so add the column explicitly for installs that predate it.
alter table public.profiles add column if not exists full_name text;

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
--    hero_name is the name the player picks for themselves in the intro, so it is
--    set ONLY from an explicit hero_name in the signup metadata (the email form
--    collects one). Google sign-ups leave it null on purpose: the intro's "WHO ARE U"
--    step fills it in, and until then the UI says "Adventurer". A real legal name is
--    not a hero name.
--    full_name holds whatever the provider told us, for parent-facing surfaces only.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, hero_name, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'hero_name', '')), ''),
    nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'full_name',   -- Google provides full_name
      new.raw_user_meta_data ->> 'name',        -- some providers use name
      ''
    )), '')
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
