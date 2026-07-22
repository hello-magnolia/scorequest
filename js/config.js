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
  SUPABASE_URL: "https://moasnmwcikwybriwaoip.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_1wAdb8Ok-hOb4gWqKCuqcw_cBfyyTdc",

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
    basic_monthly:     "__STRIPE_LINK_BASIC_MONTHLY__",
    basic_annual:      "__STRIPE_LINK_BASIC_ANNUAL__",
    allaccess_monthly: "__STRIPE_LINK_ALLACCESS_MONTHLY__",
    allaccess_annual:  "__STRIPE_LINK_ALLACCESS_ANNUAL__",
    complete_monthly:  "__STRIPE_LINK_COMPLETE_MONTHLY__",
    complete_annual:   "__STRIPE_LINK_COMPLETE_ANNUAL__",
  },
};
