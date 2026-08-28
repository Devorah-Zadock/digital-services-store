// Sends an exempt-dealer receipt (קבלה) by email — as both the email body
// and a real attached PDF — after a real, first-time site purchase (see
// finalizeSiteProject() in js/site-cloud-save.js, which calls this exactly
// once per project — never again on later edits or re-downloads of the
// same finalized site).
//
// Reads three secrets from the Supabase project's Edge Function settings —
// never hardcoded here, never committed anywhere:
//   RESEND_API_KEY    — from resend.com (sends the email)
//   PDFSHIFT_API_KEY  — from pdfshift.io (renders the HTML receipt to a
//                        real PDF via actual Chromium, so Hebrew/RTL text
//                        comes out correct — not something worth hand-
//                        rolling with a PDF-drawing library)
//   DESKKIT_TAX_ID    — the business's עוסק פטור number
//
// Deploy: paste this file's contents into Supabase Dashboard →
// Edge Functions → New Function ("send-receipt") → Deploy, or via the
// CLI: `supabase functions deploy send-receipt`.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");
const TAX_ID = Deno.env.get("DESKKIT_TAX_ID") || "000000000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function receiptHtml(opts: { buyerName: string; buyerEmail: string; itemDescription: string; amount: string; receiptNumber: string; date: string }, forPdf: boolean) {
  const card = `
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
  // The PDF needs a full document (charset + page background); the email
  // body is dropped straight into Resend's own HTML envelope, so it stays
  // a bare fragment there.
  if (!forPdf) return card;
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"></head><body style="margin:0; padding:24px; background:#fff;">${card}</body></html>`;
}

async function renderReceiptPdf(html: string): Promise<Uint8Array | null> {
  if (!PDFSHIFT_API_KEY) return null;
  try {
    const res = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": PDFSHIFT_API_KEY },
      body: JSON.stringify({ source: html }),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (_err) {
    return null;
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
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
    const receiptOpts = {
      buyerName: buyerName || "",
      buyerEmail,
      itemDescription,
      amount: amount || "לפי אישור הרכישה ב-Gumroad",
      receiptNumber,
      date,
    };

    // Best-effort: a customer should get their receipt email even if PDF
    // rendering has a hiccup — the email body already has every field the
    // PDF would, the attachment is a bonus, not the only copy.
    const pdfBytes = await renderReceiptPdf(receiptHtml(receiptOpts, true));

    const emailBody: Record<string, unknown> = {
      from: "DeskKit <onboarding@resend.dev>",
      to: [buyerEmail],
      subject: "קבלה על רכישתך ב-DeskKit",
      html: receiptHtml(receiptOpts, false),
    };
    if (pdfBytes) {
      emailBody.attachments = [{ filename: `${receiptNumber}.pdf`, content: toBase64(pdfBytes) }];
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(emailBody),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response(JSON.stringify({ error: errText }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, receiptNumber, pdfAttached: !!pdfBytes }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
