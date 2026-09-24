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
//   DESKKIT_TAX_ID    — the business's עוסק פטור number. If unset, the
//                        receipt honestly says so instead of printing a
//                        fake-looking placeholder digit string — set this
//                        before treating any receipt as a real legal
//                        document.
//
// Gated by real auth, same as every other Edge Function in this project:
// the caller's own Supabase session token goes in Authorization, verified
// server-side via admin.auth.getUser(token). Before this, the function had
// NO auth check at all — a public, unauthenticated endpoint that anyone on
// the internet could POST to directly with any buyerEmail/itemDescription/
// amount they chose, sending a real "receipt" email (with DeskKit's name
// on it) to an arbitrary address, at real cost against the RESEND_API_KEY
// quota, and a real abuse/phishing-adjacent risk. Confirmed the legitimate
// caller (sendPurchaseReceipt() in js/site-cloud-save.js) already only
// ever calls this while signed in, via supabase-js's functions.invoke(),
// which attaches the current session's token automatically — so this is
// pure hardening, nothing for a real customer to notice.
//
// Deploy: paste this file's contents into Supabase Dashboard →
// Edge Functions → New Function ("send-receipt") → Deploy, or via the
// CLI: `supabase functions deploy send-receipt`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");
// Deliberately NOT defaulting to a fake-looking number like "000000000" —
// a real עוסק פטור receipt must show the real business ID, and a fallback
// that merely LOOKS like a real (if wrong) number is worse than an honest
// placeholder: it could ship on a real receipt without anyone noticing.
// Set DESKKIT_TAX_ID in this function's Supabase secrets before relying on
// receipts for anything legally/accountingly real.
const TAX_ID = Deno.env.get("DESKKIT_TAX_ID") || null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function receiptHtml(opts: { buyerName: string; buyerEmail: string; itemDescription: string; amount: string; receiptNumber: string; date: string }, forPdf: boolean) {
  // Honest either way: the real number if it's actually configured, or a
  // visibly-a-placeholder line (never a fake-looking digit string) if not
  // — see the TAX_ID comment above for why.
  const taxLine = TAX_ID
    ? `עוסק פטור מס' ${escapeHtml(TAX_ID)} — פטור מהוצאת חשבונית מס לפי סעיף 31 לחוק מס ערך מוסף, התשל"ו-1975.`
    : `עוסק פטור — פטור מהוצאת חשבונית מס לפי סעיף 31 לחוק מס ערך מוסף, התשל"ו-1975. (מספר עוסק פטור טרם הוגדר במערכת)`;
  const card = `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #EAEDEC; border-radius: 10px;">
  <h2 style="color:#1F5C4E; margin:0 0 4px;">קבלה — DeskKit</h2>
  <p style="color:#777; font-size:13px; margin:0 0 20px;">מספר קבלה: ${escapeHtml(opts.receiptNumber)} &nbsp;|&nbsp; תאריך: ${escapeHtml(opts.date)}</p>
  <p style="margin:0 0 4px;">לכבוד: ${escapeHtml(opts.buyerName || opts.buyerEmail)}</p>
  <p style="color:#777; font-size:12.5px; margin:0 0 16px;">מאת: דבורה צדוק (DeskKit)</p>
  <hr style="border:none; border-top:1px solid #EAEDEC;">
  <p style="margin:16px 0;">${escapeHtml(opts.itemDescription)}</p>
  <p style="font-size:19px; font-weight:bold; color:#1F5C4E; margin:0 0 20px;">סה"כ לתשלום: ${escapeHtml(opts.amount)} (פטור ממע"מ)</p>
  <hr style="border:none; border-top:1px solid #EAEDEC;">
  <p style="font-size:11.5px; color:#999; margin:16px 0 4px;">${taxLine}</p>
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

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
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
      from: "DeskKit <receipts@deskkit.co.il>",
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

    return new Response(JSON.stringify({ success: true, receiptNumber, pdfAttached: !!pdfBytes, taxIdConfigured: !!TAX_ID }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
