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


-- ============================================================
-- 7. Practice attempts: one row per answered question (practice.html).
--    Powers progress by skill and, later, difficulty calibration.
--    Safe to re-run.
-- ============================================================
create table if not exists public.attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  correct     boolean not null,
  response    text,
  ms          integer,
  skill       text,
  domain      text,
  difficulty  smallint,
  session_id  text,
  created_at  timestamptz not null default now()
);
create index if not exists attempts_user_time on public.attempts (user_id, created_at desc);
create index if not exists attempts_question on public.attempts (question_id);
alter table public.attempts enable row level security;
drop policy if exists "attempts: insert own" on public.attempts;
create policy "attempts: insert own" on public.attempts for insert with check (auth.uid() = user_id);
drop policy if exists "attempts: read own" on public.attempts;
create policy "attempts: read own" on public.attempts for select using (auth.uid() = user_id);

-- ============================================================
-- 8. The question bank lives here (source of truth: the research pipeline's
--    originals/, published with pipeline/export_app_bank.py --supabase).
--    Two tables on purpose: what a student SEES (questions) and what grades
--    them (question_keys). The browser can read questions when signed in and
--    can never read question_keys; it grades by calling check_answer(), which
--    returns correct-or-not plus the explanation and records the attempt in
--    the same step. Safe to re-run.
-- ============================================================
create table if not exists public.questions (
  id          text primary key,                     -- SQ-ALG-001
  section     text not null check (section in ('math', 'rw')),
  domain      text not null,
  skill       text not null,
  difficulty  smallint not null check (difficulty between 1 and 3),
  type        text not null check (type in ('mcq', 'spr')),
  status      text not null default 'draft' check (status in ('draft', 'reviewed', 'approved', 'retired')),
  stem        text not null,
  choices     jsonb,          -- [{key, text|figure}] WITHOUT correct or trap
  passage     jsonb,
  figure      jsonb,
  "table"     jsonb,
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);
create index if not exists questions_domain_skill on public.questions (domain, skill, difficulty) where status = 'approved';

create table if not exists public.question_keys (
  question_id text primary key references public.questions (id) on delete cascade,
  correct_key text,            -- mcq
  accepted    text[],          -- spr, Digital SAT entry forms
  traps       jsonb,           -- {"A": "subtracted-wrong-side", ...}
  explanation text not null
);

create table if not exists public.question_reports (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  question_id text not null references public.questions (id) on delete cascade,
  page        text,
  note        text,
  created_at  timestamptz not null default now()
);

-- Waypoints: the map as data. One row per marker on a realm's path, in order.
-- mode: clash (a 5-question round that gates progress), lesson (a scroll on the
-- skill with two checks), rapid (timed, never gates), reading (one passage, many
-- questions), empty (placed in the editor, hidden in play). rounds: how many
-- difficulty tiers a clash waypoint has (1 easy, 2 adds medium, 3 adds hard).
create table if not exists public.waypoints (
  id          text primary key,                     -- lorewood-1
  realm       text not null,
  position    smallint not null,
  skill       text,
  mode        text not null default 'clash' check (mode in ('clash', 'lesson', 'rapid', 'reading', 'boss', 'empty')),
  rounds      smallint not null default 1 check (rounds between 1 and 3),
  title       text,
  lesson      jsonb,                                -- lesson mode: {intro, patterns[], example{...}, checks[]}
  updated_at  timestamptz not null default now()
);
alter table public.waypoints add column if not exists also jsonb;   -- extra skills folded into this marker
create index if not exists waypoints_realm on public.waypoints (realm, position);

-- Visible questions and waypoints: any signed-in player, approved rows only.
-- Keys: nobody. Reports: insert your own. Writes to the bank: service role only
-- (the pipeline), which bypasses RLS.
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.question_reports enable row level security;
alter table public.waypoints enable row level security;
drop policy if exists "questions: read approved" on public.questions;
create policy "questions: read approved" on public.questions for select
  using (auth.role() = 'authenticated' and status = 'approved');
drop policy if exists "waypoints: read" on public.waypoints;
create policy "waypoints: read" on public.waypoints for select using (auth.role() = 'authenticated');
drop policy if exists "reports: insert own" on public.question_reports;
create policy "reports: insert own" on public.question_reports for insert
  with check (auth.uid() = user_id);

-- Grade an answer on the server. The key never reaches the browser.
-- Grid-ins: exact match or numeric equality against each accepted form
-- (1/2, .5 and 0.5 all count). Records the attempt as the calling user.
create or replace function public.check_answer(
  p_question_id text, p_response text, p_ms integer default null, p_session_id text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q public.questions%rowtype;
  k public.question_keys%rowtype;
  ok boolean := false;
  v numeric;
  a text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into q from public.questions where id = p_question_id and status = 'approved';
  if not found then raise exception 'unknown question'; end if;
  select * into k from public.question_keys where question_id = p_question_id;
  if q.type = 'mcq' then
    ok := (p_response = k.correct_key);
  else
    v := public.sat_number(p_response);
    foreach a in array coalesce(k.accepted, '{}') loop
      if trim(a) = trim(p_response) or (v is not null and public.sat_number(a) = v) then ok := true; end if;
    end loop;
  end if;
  insert into public.attempts (user_id, question_id, correct, response, ms, skill, domain, difficulty, session_id)
    values (auth.uid(), q.id, ok, p_response, p_ms, q.skill, q.domain, q.difficulty, p_session_id);
  return jsonb_build_object(
    'correct', ok,
    'key', case when q.type = 'mcq' then k.correct_key else k.accepted[1] end,
    'explanation', k.explanation,
    'trap', case when q.type = 'mcq' and not ok then k.traps ->> p_response else null end
  );
end $$;

-- "3/4" -> 0.75, "1.25" -> 1.25, anything else -> null
create or replace function public.sat_number(t text) returns numeric
language plpgsql immutable as $$
declare n numeric; d numeric;
begin
  t := replace(trim(t), '−', '-');
  if t ~ '^-?\d+/\d+$' then
    n := split_part(t, '/', 1)::numeric; d := split_part(t, '/', 2)::numeric;
    if d = 0 then return null; end if;
    return round(n / d, 9);
  elsif t ~ '^-?(\d+\.?\d*|\.\d+)$' then
    return round(t::numeric, 9);
  end if;
  return null;
exception when others then return null;
end $$;

grant select on public.questions, public.waypoints to authenticated;
grant insert on public.question_reports to authenticated;
grant usage, select on sequence public.question_reports_id_seq to authenticated;
grant execute on function public.check_answer(text, text, integer, text) to authenticated;
grant execute on function public.sat_number(text) to authenticated;
revoke all on public.question_keys from anon, authenticated;

-- Done. Publish the bank from the research folder:
--   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 pipeline/export_app_bank.py --supabase
