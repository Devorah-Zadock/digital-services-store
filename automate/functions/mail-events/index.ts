// DeskKit Automate — receives bounce / complaint reports from the email
// provider (Resend webhook, Amazon SES via SNS, Brevo webhook) and stops all
// automated email to those addresses (automate_suppressions). Called by the
// provider, never by browsers.
//
//   POST /functions/v1/mail-events?p=resend|ses|brevo&k=<key>
//
// <key> is AUTOMATE_MAIL_EVENTS_SECRET when set, otherwise derived from the
// project's service key (so no extra secret is needed). The service role
// itself may also call it (tests). Logs never contain addresses.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseMailEvent } from "../_shared/automate/mailevents.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function same(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function expectedKey(): Promise<string> {
  const set = Deno.env.get("AUTOMATE_MAIL_EVENTS_SECRET");
  if (set) return set;
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("deskkit-mail-events-v1:" + SERVICE_ROLE_KEY));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const url = new URL(req.url);
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const key = url.searchParams.get("k") || req.headers.get("x-mail-events-key") || "";
  if (!same(key, await expectedKey()) && !same(bearer, SERVICE_ROLE_KEY)) return json({ error: "unauthorized" }, 401);

  const provider = url.searchParams.get("p") || "resend";
  // SNS posts JSON as text/plain — read the text and parse it ourselves.
  const raw = await req.text();
  if (raw.length > 200_000) return json({ error: "too large" }, 413);
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad json" }, 400); }

  const parsed = parseMailEvent(provider, body);
  if (parsed.kind === "ignore") return json({ ok: true, ignored: parsed.why });
  if (parsed.kind === "sns-confirm") {
    const r = await fetch(parsed.subscribeUrl).catch(() => null);
    return json({ ok: !!r && r.ok, confirmed: !!r && r.ok });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let suppressed = 0;
  for (const ev of parsed.events) {
    const { error } = await db.from("automate_suppressions")
      .upsert({ email: ev.email, reason: ev.reason, provider, detail: ev.detail }, { onConflict: "email", ignoreDuplicates: true });
    if (error) return json({ error: "server" }, 500);   // the provider retries
    suppressed++;
    // Anything still waiting for this address is not sent.
    await db.from("automation_messages").update({ status: "cancelled", error: "suppressed:" + ev.reason })
      .ilike("to_email", ev.email.replace(/[\\%_]/g, (m) => "\\" + m)).in("status", ["pending_approval", "queued", "deferred"]);
    // Tell the business whose email it was (one alert of this kind a day).
    if (ev.providerMessageId) {
      const { data: m } = await db.from("automation_messages").select("id, user_id, to_email")
        .eq("provider_id", ev.providerMessageId).maybeSingle();
      if (m) {
        await db.from("automation_messages").update({ error: ev.reason === "complaint" ? "complaint" : "bounced" }).eq("id", m.id);
        await db.rpc("automate_alert", {
          p_user: m.user_id, p_level: "warning", p_kind: ev.reason === "complaint" ? "client_complaint" : "client_bounce",
          p_message: ev.reason === "complaint"
            ? `${m.to_email} סימן/ה מייל אוטומטי כספאם. לא יישלחו אליו/ה עוד מיילים אוטומטיים.`
            : `המייל אל ${m.to_email} חזר — הכתובת לא קיימת. כדאי לתקן את הכתובת אצל הלקוח.`,
        });
      }
    }
  }
  console.log(`mail-events ${provider}: ${suppressed} address(es) suppressed`);
  return json({ ok: true, suppressed });
});
