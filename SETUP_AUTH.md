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
- **Already ran an older version? Run it again.** The file is safe to re-run: it
  adds the Google columns without dropping anything, and repairs any account
  that got stamped with a real name (see "Two names" below).

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

### Two names, on purpose

Google hands us the player's real name. A teen should not walk into Lorewood
called "Jonathan Whitmore-Chen", so the profile keeps the two apart:

| column | who fills it | where it shows |
| --- | --- | --- |
| `hero_name` | the player, in the intro | everywhere in the game |
| `full_name` | Google, automatically | parent surfaces only |

A Google signup starts with `hero_name` **null** and `hero_name_set` **false**.
That is the cue for Pomelo to ask "who are u?", exactly as an email signup gets
asked. Until they answer, the game calls them "Adventurer", never the email
handle, which is usually a real name too. Once a name is chosen the database
flips `hero_name_set` itself, and later Google sign-ins refresh `full_name` and
the avatar without ever touching the hero name.

The re-run in step 2 also repairs existing accounts: it moves the real name into
`full_name`, then clears `hero_name` for anyone whose hero name is exactly their
Google name, which is the fingerprint of the old behaviour. A hero name someone
actually typed is left alone. Those players get asked to name themselves next
time they open the map.

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
