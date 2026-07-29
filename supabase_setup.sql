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
--     project, so add the columns explicitly for installs that predate them.
alter table public.profiles add column if not exists full_name     text;
alter table public.profiles add column if not exists avatar_url    text;
alter table public.profiles add column if not exists email         text;
alter table public.profiles add column if not exists auth_provider text;
-- hero_name_set separates "has not chosen yet" from "chose nothing". The client
-- reads it to decide whether to run the naming scene, so a Google player gets
-- asked exactly once rather than on every page load.
alter table public.profiles add column if not exists hero_name_set boolean not null default false;

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
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  amet   jsonb := coalesce(new.raw_app_meta_data,  '{}'::jsonb);
  chosen text  := nullif(trim(coalesce(meta ->> 'hero_name', '')), '');
begin
  insert into public.profiles (
    id, hero_name, hero_name_set, full_name, avatar_url, email, auth_provider
  )
  values (
    new.id,
    chosen,
    chosen is not null,
    nullif(trim(coalesce(
      meta ->> 'full_name',   -- Google provides full_name
      meta ->> 'name',        -- some providers use name
      ''
    )), ''),
    nullif(trim(coalesce(meta ->> 'avatar_url', meta ->> 'picture', '')), ''),
    new.email,
    coalesce(amet ->> 'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3b. Google refreshes full_name and the avatar on later sign-ins. Mirror those
--     into the profile, but NEVER touch hero_name: once a player has named
--     themselves, the provider does not get a vote.
create or replace function public.sync_auth_identity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  update public.profiles p set
    full_name  = coalesce(nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), ''), p.full_name),
    avatar_url = coalesce(nullif(trim(coalesce(meta ->> 'avatar_url', meta ->> 'picture', '')), ''), p.avatar_url),
    email      = coalesce(new.email, p.email)
  where p.id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data, email on auth.users
  for each row execute function public.sync_auth_identity();

-- 4. Keep updated_at fresh on every write.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 5. hero_name_set flips itself. The client just writes hero_name; the database
--    records that a real choice was made, so no browser code has to remember to
--    set the flag, and none can clear it by forgetting.
create or replace function public.mark_hero_named()
returns trigger language plpgsql as $$
begin
  if nullif(trim(coalesce(new.hero_name, '')), '') is not null then
    new.hero_name_set = true;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_hero_named on public.profiles;
create trigger profiles_hero_named
  before insert or update of hero_name on public.profiles
  for each row execute function public.mark_hero_named();

-- ============================================================
-- 6. BACKFILL for accounts created before this change.
--    Fixing the trigger only helps future signups. Players who already signed
--    in with Google are still wearing their legal name, so: copy the real name
--    into full_name where it belongs, then clear hero_name for anyone whose
--    hero name is byte-for-byte their Google name, which is the fingerprint of
--    the old fallback. A hero name someone actually typed is left alone even if
--    it happens to look like a real name. Cleared players get asked to name
--    themselves next time they open the map.
--    Naturally idempotent: after one pass nothing matches again.
-- ============================================================

-- 6a. Populate the new identity columns from auth.users for every existing row.
update public.profiles p set
  full_name     = coalesce(p.full_name,
                    nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name',
                                         u.raw_user_meta_data ->> 'name', '')), '')),
  avatar_url    = coalesce(p.avatar_url,
                    nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url',
                                         u.raw_user_meta_data ->> 'picture', '')), '')),
  email         = coalesce(p.email, u.email),
  auth_provider = coalesce(p.auth_provider, u.raw_app_meta_data ->> 'provider', 'email')
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.avatar_url is null
       or p.email is null or p.auth_provider is null);

-- 6b. Mark every pre-existing hero name as chosen, EXCEPT the borrowed ones.
--     Order matters: this runs before 6c clears them.
update public.profiles p set hero_name_set = true
where p.hero_name_set = false
  and nullif(trim(coalesce(p.hero_name, '')), '') is not null
  and not exists (
    select 1 from auth.users u
    where u.id = p.id
      and trim(coalesce(u.raw_user_meta_data ->> 'full_name',
                        u.raw_user_meta_data ->> 'name', '')) = trim(p.hero_name)
  );

-- 6c. Clear the borrowed names. full_name (set in 6a) keeps the real name for
--     the parent dashboard, so nothing is actually lost.
update public.profiles p set hero_name = null
from auth.users u
where u.id = p.id
  and p.hero_name_set = false
  and nullif(trim(coalesce(p.hero_name, '')), '') is not null
  and trim(coalesce(u.raw_user_meta_data ->> 'full_name',
                    u.raw_user_meta_data ->> 'name', '')) = trim(p.hero_name);

-- Done. Next: enable the Google provider under Authentication -> Providers,
-- and add your GitHub Pages URL under Authentication -> URL Configuration
-- (see SETUP_AUTH.md).
