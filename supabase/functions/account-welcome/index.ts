// Sends a new account its welcome email — once, ever.
//
// Every page calls this right after it finds a signed-in session
// (js/supabase-config.js; the browser remembers it was done, so it's one
// call per account per browser). The server decides: only an account
// whose email is confirmed, that was created in the last 7 days and has
// never been welcomed gets one. Marking it as welcomed and sending are
// one atomic step, so two tabs at once still send a single email.
// Accounts that existed before this feature were marked as welcomed by
// supabase/sql/email_list.sql, so they never get it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { button, layout, mailConfigured, sendMail, SITE, unsubHeaders, unsubLinks } from "../_shared/mail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

async function welcomeHtml(userId: string): Promise<string> {
  const { page } = await unsubLinks(userId);
  const item = (icon: string, title: string, text: string) =>
    `<tr><td style="padding:6px 0 6px 10px;font-size:20px;vertical-align:top;">${icon}</td><td style="padding:6px 0;"><b>${title}</b><br><span style="color:#475467;font-size:15px;">${text}</span></td></tr>`;
  return layout(
    `<h1 style="margin:0 0 12px;font-size:24px;color:#0F766E;">ברוכים הבאים ל-DeskKit! 🎉</h1>` +
    `<p style="margin:0 0 14px;">שמחים מאוד שהצטרפת. מעכשיו כל מה שתיצרו נשמר בחשבון שלכם, ואפשר להמשיך בדיוק מאיפה שעצרתם — מכל מכשיר.</p>` +
    `<p style="margin:0 0 6px;font-weight:700;">מה אפשר לעשות כבר עכשיו:</p>` +
    `<table role="presentation" style="border-collapse:collapse;margin:0 0 6px;">` +
    item("🌐", "אתר לעסק", "בונים אתר יפה בכמה דקות ומפרסמים אותו בכתובת משלכם.") +
    item("📄", "קורות חיים", "תבניות מעוצבות ובדיקת התאמה למערכות סינון (ATS).") +
    item("🧾", "הצעות מחיר וחשבוניות", "מסמכים מקצועיים עם הלוגו שלכם, מוכנים לשליחה.") +
    `</table>` +
    button("מתחילים ליצור ←", `${SITE}/tools.html`) +
    `<p style="margin:0 0 14px;color:#475467;font-size:14.5px;">מדי פעם נשלח לכם עדכון קצר על כלים חדשים, שיפורים וטיפים. לא מעוניינים? אפשר להסיר את עצמכם בלחיצה אחת בתחתית כל עדכון, או ב"החשבון שלי".</p>` +
    `<p style="margin:0 0 4px;">בהצלחה!<br>צוות DeskKit</p>`,
    { unsubscribeUrl: page, why: "קיבלת את המייל הזה כי נפתח עכשיו חשבון ב-DeskKit עם הכתובת הזו." },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "unauthorized" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData && userData.user;
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  const confirmed = !!(user.email_confirmed_at || (user as { confirmed_at?: string }).confirmed_at);
  // "done" tells the browser it never has to ask again for this account.
  if (!user.email || !confirmed) return json({ done: false, reason: "unconfirmed" });
  if (!mailConfigured()) return json({ done: false, reason: "not-configured" });

  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: claimed, error } = await admin.from("customer_profiles")
    .update({ welcome_sent_at: new Date().toISOString() })
    .eq("id", user.id).is("welcome_sent_at", null).gte("created_at", since)
    .select("id");
  if (error) return json({ done: false, reason: "error" }, 500);
  if (!claimed || !claimed.length) return json({ done: true, sent: false });

  const ok = await sendMail({
    to: user.email,
    subject: "ברוכים הבאים ל-DeskKit 🎉",
    html: await welcomeHtml(user.id),
    headers: await unsubHeaders(user.id),
  });
  if (!ok) {
    // Let the next page view try again.
    await admin.from("customer_profiles").update({ welcome_sent_at: null }).eq("id", user.id);
    return json({ done: false, reason: "send-failed" });
  }
  return json({ done: true, sent: true });
});
