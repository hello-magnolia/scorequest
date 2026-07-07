/* ============================================================
   ScoreQuest — Supabase configuration
   ------------------------------------------------------------
   Paste your project's two PUBLIC values below. Both are safe to
   commit to a public repo — the anon key is designed to be shipped
   in client-side code. Row Level Security (see supabase_setup.sql)
   is what actually protects your data, not the secrecy of this key.

   Find them at:  Supabase dashboard -> Project Settings -> API
     - Project URL   -> SUPABASE_URL
     - anon / public -> SUPABASE_ANON_KEY

   Until these are filled in, the site runs in "demo mode": the login
   UI still works and stores progress in memory for the session, but
   nothing is saved to a real account.
   ============================================================ */
window.SCOREQUEST_CONFIG = {
  SUPABASE_URL: "__SUPABASE_URL__",
  SUPABASE_ANON_KEY: "__SUPABASE_ANON_KEY__",
};
