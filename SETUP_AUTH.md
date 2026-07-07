# Setting up login (Supabase) — ~10 minutes

The auth UI is already built. To turn on real accounts + Google login, do these
five steps once. Everything you paste is a **public** value that's safe to
commit — the real protection is Row Level Security, set up in step 2.

## 1. Create a free Supabase project
- Go to https://supabase.com, sign in with GitHub, **New project**.
- Name it `scorequest`, pick a region near you, set a database password (save it
  somewhere; you won't need it for the site).
- Wait ~2 minutes for it to provision.

## 2. Create the database table + security rules
- In the project: **SQL Editor → New query**.
- Open `supabase_setup.sql` from this repo, copy the whole thing, paste, **Run**.
- You should see "Success". This creates the `profiles` table, the Row Level
  Security policies (each user can touch only their own row), and a trigger that
  auto-creates a profile when someone signs up.

## 3. Paste your two public keys into the site
- In Supabase: **Project Settings → API**.
- Copy **Project URL** and the **anon / public** key.
- Open `js/config.js` and replace the two placeholders:
  ```js
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGci...your anon key...",
  ```
- Commit + push. (Both values are meant to live in client code — this is safe.)

## 4. Turn on Google login
- In Supabase: **Authentication → Providers → Google → enable**.
- It asks for a Google **Client ID** and **Client Secret**. Get them here:
  - Go to https://console.cloud.google.com → **APIs & Services → Credentials**.
  - **Create Credentials → OAuth client ID → Web application**.
  - Under **Authorized redirect URIs**, add the callback URL Supabase shows you
    on the Google provider page (looks like
    `https://YOUR-PROJECT.supabase.co/auth/v1/callback`).
  - Copy the generated Client ID + Secret back into Supabase, **Save**.
- (Email/password login works without any of this — Google is the extra step.)

## 5. Tell Supabase where your site lives
- In Supabase: **Authentication → URL Configuration**.
- Set **Site URL** to your live URL: `https://hello-magnolia.github.io/scorequest/`
- Add the same URL under **Redirect URLs**. For local testing also add
  `http://localhost:8000`.

That's it. Reload the site: **Log in** / **Start free** open the "Choose your
hero" modal, Google works, and each hero's XP, streak, and cleared realms save
to their profile row.

---

### How it stays secure
- The anon key in `config.js` is **designed** to be public. On its own it can do
  nothing — every table read/write is gated by the RLS policies from step 2,
  which check `auth.uid() = id`. A visitor can only ever see and edit their own
  profile.
- No password hashing, sessions, or OAuth secrets ever touch your repo. Supabase
  holds those server-side. The Google Client Secret lives only in the Supabase
  dashboard, never in the site.

### Before setup is done: demo mode
Until `config.js` has real keys, the site runs in **demo mode** — the login modal
still works, "hero" progress is kept in your browser's localStorage for the
session, and the Google button explains it needs configuration. Nothing breaks;
it just isn't saved to a real account yet.
