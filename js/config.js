/* ============================================================
   ScoreQuest - Supabase configuration
   ------------------------------------------------------------
   Paste your project's two PUBLIC values below. Both are safe to
   commit to a public repo - the anon key is designed to be shipped
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

  /* ----------------------------------------------------------
     Stripe Payment Links - one per plan x billing period.
     Create them at: Stripe dashboard -> Payment links -> New
       - Add the product/price (set the 7-day free trial there)
       - Set the confirmation page to:
         https://hello-magnolia.github.io/scorequest/success.html
     Then paste each link URL below. Until filled in, the checkout
     page runs in demo mode: the flow works but the final button
     explains that live payments are not connected yet.
     ---------------------------------------------------------- */
  STRIPE_LINKS: {
    adventurer_monthly:  "__STRIPE_LINK_ADVENTURER_MONTHLY__",
    adventurer_annual:   "__STRIPE_LINK_ADVENTURER_ANNUAL__",
    guildmaster_monthly: "__STRIPE_LINK_GUILDMASTER_MONTHLY__",
    guildmaster_annual:  "__STRIPE_LINK_GUILDMASTER_ANNUAL__",
    champion_monthly:    "__STRIPE_LINK_CHAMPION_MONTHLY__",
    champion_annual:     "__STRIPE_LINK_CHAMPION_ANNUAL__",
  },
};
