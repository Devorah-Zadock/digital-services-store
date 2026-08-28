// Sends an exempt-dealer receipt (קבלה) by email after a real, first-time
// site purchase (see finalizeSiteProject() in js/site-cloud-save.js, which
// calls this exactly once per project — never again on later edits or
// re-downloads of the same finalized site).
//
// Reads two secrets from the Supabase project's Edge Function settings —
// never hardcoded here, never committed anywhere:
//   RESEND_API_KEY  — from resend.com
//   DESKKIT_TAX_ID  — the business's עוסק פטור number
//
// Deploy: paste this file's contents into Supabase Dashboard →
// Edge Functions → New Function ("send-receipt") → Deploy, or via the
// CLI: `supabase functions deploy send-receipt`.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TAX_ID = Deno.env.get("DESKKIT_TAX_ID") || "000000000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function receiptHtml(opts: { buyerName: string; buyerEmail: string; itemDescription: string; amount: string; receiptNumber: string; date: string }) {
  return `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #EAEDEC; border-radius: 10px;">
  <h2 style="color:#1F5C4E; margin:0 0 4px;">קבלה — DeskKit</h2>
  <p style="color:#777; font-size:13px; margin:0 0 20px;">מספר קבלה: ${escapeHtml(opts.receiptNumber)} &nbsp;|&nbsp; תאריך: ${escapeHtml(opts.date)}</p>
  <p style="margin:0 0 16px;">לכבוד: ${escapeHtml(opts.buyerName || opts.buyerEmail)}</p>
  <hr style="border:none; border-top:1px solid #EAEDEC;">
  <p style="margin:16px 0;">${escapeHtml(opts.itemDescription)}</p>
  <p style="font-size:19px; font-weight:bold; color:#1F5C4E; margin:0 0 20px;">סה"כ לתשלום: ${escapeHtml(opts.amount)} (פטור ממע"מ)</p>
  <hr style="border:none; border-top:1px solid #EAEDEC;">
  <p style="font-size:11.5px; color:#999; margin:16px 0 4px;">עוסק פטור מס' ${escapeHtml(TAX_ID)} — פטור מהוצאת חשבונית מס לפי סעיף 31 לחוק מס ערך מוסף, התשל"ו-1975.</p>
  <p style="font-size:11.5px; color:#999; margin:0;">שאלות: digital.dz.studio@gmail.com</p>
</div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  try {
    const { buyerEmail, buyerName, itemDescription, amount } = await req.json();
    if (!buyerEmail || !itemDescription) {
      return new Response(JSON.stringify({ error: "missing buyerEmail or itemDescription" }), { status: 400, headers: corsHeaders });
    }

    const receiptNumber = `DK-${Date.now()}`;
    const date = new Date().toLocaleDateString("he-IL");
    const html = receiptHtml({
      buyerName: buyerName || "",
      buyerEmail,
      itemDescription,
      amount: amount || "לפי אישור הרכישה ב-Gumroad",
      receiptNumber,
      date,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "DeskKit <onboarding@resend.dev>",
        to: [buyerEmail],
        subject: "קבלה על רכישתך ב-DeskKit",
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response(JSON.stringify({ error: errText }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, receiptNumber }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
