// Site-wide daily AI cap (supabase/sql/ai_global_budget.sql), checked by
// every AI function right after the user's own slot is taken.
//
// If the check itself fails (database hiccup, SQL not deployed yet) the
// call goes ahead: every user is still held to their own limit, so a
// broken fuse must not take all AI features down.

// deno-lint-ignore no-explicit-any
export async function aiGlobalReserve(admin: any): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("ai_global_reserve");
    if (error) {
      console.error("ai_global_reserve failed", error.code || "", (error.message || "").slice(0, 200));
      return true;
    }
    return data !== false;
  } catch (_e) {
    console.error("ai_global_reserve threw");
    return true;
  }
}

export function aiBusyMessage(lang?: unknown): string {
  return lang === "en"
    ? "AI features are very busy today. Please try again tomorrow — your try wasn't used."
    : "כלי ה-AI עמוסים מאוד היום. נסו שוב מחר — הניסיון שלכם לא נוצל.";
}

// Upper bound on the length of any AI answer, so no single call can
// cost much more than usual. Real answers are far shorter than this.
export const AI_MAX_OUTPUT_TOKENS = 4000;
