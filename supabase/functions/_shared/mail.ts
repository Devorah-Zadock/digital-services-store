// Emails DeskKit sends its own customers (welcome, service notices and
// the owner's updates) — one look, one sender, one unsubscribe link.
// Used by account-welcome, email-preferences and admin-stats.
//
// Unsubscribe links carry the account id plus an HMAC of it (keyed from
// the service-role secret), so one click unsubscribes without signing in,
// and nobody can unsubscribe somebody else by guessing.

export const SITE = "https://deskkit.co.il";
export const FROM = "DeskKit <noreply@deskkit.co.il>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let keyPromise: Promise<CryptoKey> | null = null;
function unsubKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SERVICE_ROLE_KEY + ":email-unsubscribe-v1"));
      return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    })();
  }
  return keyPromise;
}

export async function unsubToken(userId: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await unsubKey(), new TextEncoder().encode(userId));
  return b64url(new Uint8Array(sig)).slice(0, 32);
}

export async function unsubTokenValid(userId: unknown, token: unknown): Promise<boolean> {
  if (typeof userId !== "string" || typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(userId) || token.length !== 32) return false;
  const expected = await unsubToken(userId);
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

// The page people land on, and the address mail apps call for one-click
// unsubscribe (RFC 8058) — both end at email-preferences.
export async function unsubLinks(userId: string): Promise<{ page: string; oneClick: string }> {
  const q = `u=${encodeURIComponent(userId)}&t=${encodeURIComponent(await unsubToken(userId))}`;
  return { page: `${SITE}/unsubscribe.html?${q}`, oneClick: `${SUPABASE_URL}/functions/v1/email-preferences?${q}` };
}

export async function unsubHeaders(userId: string): Promise<Record<string, string>> {
  const { oneClick } = await unsubLinks(userId);
  return { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

// Plain text the owner typed → safe HTML: paragraphs, line breaks and
// clickable https links. Nothing she types can inject markup.
export function textToHtml(text: string): string {
  return String(text || "").trim().split(/\n{2,}/).map((para) => {
    const withLinks = esc(para).replace(/https:\/\/[^\s<>"']+/g, (u) => `<a href="${u}" style="color:#0F766E;font-weight:600;">${u}</a>`);
    return `<p style="margin:0 0 14px;">${withLinks.replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

export function button(label: string, href: string): string {
  return `<p style="margin:22px 0;"><a href="${esc(href)}" style="display:inline-block;background:#14B8A6;color:#fff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:10px;">${esc(label)}</a></p>`;
}

// footer: why they got it + (for updates) the unsubscribe link.
export function layout(bodyHtml: string, opts: { unsubscribeUrl?: string; why?: string } = {}): string {
  const why = opts.why || "קיבלת את המייל הזה כי יש לך חשבון ב-DeskKit.";
  const unsub = opts.unsubscribeUrl
    ? ` <a href="${esc(opts.unsubscribeUrl)}" style="color:#667085;">להסרה מרשימת העדכונים בלחיצה אחת</a>.`
    : "";
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F4;">
<div dir="rtl" style="background:#F1F5F4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0F766E;padding:18px 24px;">
      <a href="${SITE}/" style="color:#fff;text-decoration:none;font-size:22px;font-weight:800;letter-spacing:.3px;">DeskKit</a>
    </div>
    <div style="padding:26px 24px 10px;color:#111827;font-size:16px;line-height:1.7;text-align:right;">${bodyHtml}</div>
    <div style="padding:14px 24px 22px;color:#667085;font-size:12.5px;line-height:1.6;border-top:1px solid #EEF2F1;text-align:right;">
      ${esc(why)}${unsub}<br>
      זהו מייל אוטומטי ואין צורך להשיב עליו. יש שאלה? כתבו לנו ב<a href="${SITE}/contact.html" style="color:#667085;">עמוד יצירת הקשר</a>.
    </div>
  </div>
</div></body></html>`;
}

export type Mail = { to: string; subject: string; html: string; headers?: Record<string, string> };

export function mailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

// One email. Returns true when Resend accepted it.
export async function sendMail(m: Mail): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [m.to], subject: m.subject, html: m.html, headers: m.headers }),
  });
  return res.ok;
}

// Up to 100 emails in one request. "quota" = Resend's daily/monthly limit
// or rate limit — stop and continue later; nothing in this batch was sent.
export async function sendBatch(mails: Mail[]): Promise<"ok" | "quota" | "error"> {
  if (!RESEND_API_KEY) return "error";
  if (!mails.length) return "ok";
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(mails.map((m) => ({ from: FROM, to: [m.to], subject: m.subject, html: m.html, headers: m.headers }))),
  });
  if (res.ok) return "ok";
  return res.status === 429 ? "quota" : "error";
}
