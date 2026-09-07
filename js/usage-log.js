/* Records a "someone actually used this tool" event into usage_events —
   feeds the "לקוחות ושימוש" admin card, alongside the existing site
   projects / cv_saves tracking, for the tools that don't otherwise leave
   a trace until something is explicitly saved (a CV or quote a person
   opens but never clicks "שמירה" on still used the tool; a downloaded
   deck/xlsx never gets saved anywhere at all).

   Best-effort and silent on failure: the table only exists once the
   one-time SQL setup (supabase/sql/usage_events.sql) has been run, so a
   fresh site shouldn't have every builder throw just because that hasn't
   happened yet — same pattern as the rest of this codebase's optional
   admin plumbing. Only ever called for a signed-in user (kind/action are
   gated behind the same login check that lets someone edit/download in
   the first place), so there's no anonymous-usage case to handle here. */
function logUsageEvent(kind, slug, action) {
  try {
    supabaseClient.auth.getSession().then(({ data }) => {
      const user = data.session && data.session.user;
      if (!user) return;
      supabaseClient.from("usage_events").insert({
        user_id: user.id, kind, slug: slug || null, action,
      }).then(() => {}, () => {});
    });
  } catch (e) { /* ignore — non-critical telemetry */ }
}
