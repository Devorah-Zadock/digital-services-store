/* Persists individual quotes (quote_saves table — one row per saved quote,
   not per user, since a business creates many quotes over time) so they
   show up in the "my content" rail and can be reopened later, the same
   way a CV or a site project can. Separate from the `profiles` table
   (quote-app.js), which only holds the one-time reusable business
   letterhead — never the per-quote event details this file saves.

   quoteCurrentUserId/quoteSavedId are set by quote-app.js (routeAfterAuth /
   routeAsGuest / loadQuoteById below) — plain shared globals, same pattern
   already used for quoteEventState between quote-app.js and quote-render.js.

   Explicit-save only: saveQuoteNow only runs from #quote-save-btn below —
   editing was silently creating a new saved quote before anyone chose to
   keep anything. */

let quoteCurrentUserId = null;
let quoteSavedId = null;

async function saveQuoteNow() {
  if (!quoteCurrentUserId || !quoteEventState) return "no-user";
  const row = { user_id: quoteCurrentUserId, data: quoteEventState, updated_at: new Date().toISOString() };
  if (quoteSavedId) row.id = quoteSavedId;
  const { data, error } = await supabaseClient.from("quote_saves").upsert(row).select().single();
  if (error) return error;
  quoteSavedId = data.id;
  const url = new URL(location.href);
  url.searchParams.set("quote", data.id);
  history.replaceState(null, "", url);
  if (window.refreshMyPanel) window.refreshMyPanel();
  return null;
}

/* Called from quote-app.js's routeAfterAuth when the URL names a specific
   saved quote (?quote=<id>) — the .eq("user_id", userId) is what stops
   someone from loading another business's quote just by guessing an id,
   same belt-and-suspenders check the RLS policy already enforces server-side. */
async function loadQuoteById(id, userId) {
  const { data } = await supabaseClient.from("quote_saves").select("id, data").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  quoteSavedId = data.id;
  return data.data;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("quote-save-btn");
  const status = document.getElementById("quote-save-status");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!quoteCurrentUserId) { window.location.href = "account.html?redirect=quote-app.html"; return; }
    btn.disabled = true;
    const err = await saveQuoteNow();
    btn.disabled = false;
    status.classList.remove("ok");
    status.textContent = err ? "השמירה נכשלה, נסו שוב" : "נשמר ✓";
    if (!err) status.classList.add("ok");
    setTimeout(() => { status.textContent = ""; status.classList.remove("ok"); }, 2500);
  });
});
