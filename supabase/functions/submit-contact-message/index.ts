// Receives contact-form and feedback-widget submissions and stores them
// permanently in contact_messages — replacing Formspree, whose free tier
// only keeps 30 days of history before a message becomes unreadable
// behind a paid plan. Also emails a notification via Resend (the same
// provider/secret already used by send-receipt) so a new message still
// shows up in the inbox immediately, the same as Formspree did — this
// function is just where it's permanently stored now.
//
// Deliberately public/unauthenticated, unlike almost every other Edge
// Function in this project: a contact form has to work for a visitor who
// isn't signed in and may never create an account at all. The real
// safeguard here isn't an auth check, it's that this function can ONLY
// INSERT a new row — contact_messages has zero RLS policies, so nothing
// a caller sends can read, list, or delete anyone else's message, and
// the service-role key this function holds never reaches the client.
//
// Deploy: paste this file's contents into Supabase Dashboard → Edge
// Functions → New Function ("submit-contact-message") → Deploy, or via
// the CLI: `supabase functions deploy submit-contact-message`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Where the notification email goes — same inbox every other DeskKit
// notification (receipts, support mailtos) already points at.
const NOTIFY_EMAIL = Deno.env.get("CONTACT_NOTIFY_EMAIL") || "digital.dz.studio@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function escapeHtml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function notifyByEmail(row: { form_type: string; name: string | null; email: string | null; rating: number | null; message: string; page: string | null }) {
  if (!RESEND_API_KEY) return; // best-effort only — the row is already saved either way
  const subject = row.form_type === "feedback"
    ? `משוב חדש באתר${row.rating ? ` — ${row.rating} כוכבים` : ""}`
    : `פנייה חדשה מהאתר${row.name ? " - " + row.name : ""}`;
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif;">
      <h3>${escapeHtml(subject)}</h3>
      ${row.name ? `<p><b>שם:</b> ${escapeHtml(row.name)}</p>` : ""}
      ${row.email ? `<p><b>מייל:</b> ${escapeHtml(row.email)}</p>` : ""}
      ${row.rating ? `<p><b>דירוג:</b> ${row.rating}/5</p>` : ""}
      <p><b>הודעה:</b><br>${escapeHtml(row.message).replace(/\n/g, "<br>")}</p>
      ${row.page ? `<p style="color:#777;font-size:12px;">נשלח מתוך: ${escapeHtml(row.page)}</p>` : ""}
    </div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "DeskKit <notifications@deskkit.co.il>", to: [NOTIFY_EMAIL], subject, html }),
    });
  } catch (_err) {
    // A failed notification email must never fail the actual submission
    // — the message is already safely stored either way.
  }
}

const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY") || "";

async function turnstileOk(token: string): Promise<boolean> {
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (_e) {
    return false;
  }
}

const GLOBAL_LIMIT_10_MIN = 100;
const PER_EMAIL_LIMIT_1_HOUR = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const formType = body.formType === "feedback" ? "feedback" : "contact";
    const message = String(body.message || "").trim().slice(0, 5000);
    let name = body.name ? String(body.name).trim().slice(0, 200) : null;
    let email = body.email ? String(body.email).trim().slice(0, 300) : null;
    const page = body.page ? String(body.page).trim().slice(0, 300) : null;
    let rating: number | null = null;
    if (body.rating !== undefined && body.rating !== null) {
      const r = Number(body.rating);
      if (Number.isFinite(r) && r >= 1 && r <= 5) rating = Math.round(r);
    }

    // A feedback submission's real content can be the star rating alone
    // — js/widgets.js's own feedback widget only requires a rating
    // before its submit button is even enabled, with the free-text box
    // optional. The contact form has no such rating field, so a message
    // there is the only content there is.
    if (!message && !(formType === "feedback" && rating)) {
      return new Response(JSON.stringify({ error: "missing message" }), { status: 400, headers: corsHeaders });
    }
    if (formType === "contact" && (!name || !email)) {
      return new Response(JSON.stringify({ error: "missing name or email" }), { status: 400, headers: corsHeaders });
    }
    if (email && !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Honeypot: the contact form has a hidden field people never see (named
    // so password managers won't autofill it). Filled = a bot — pretend it
    // worked, store and send nothing.
    if (typeof body.hp === "string" && body.hp.trim()) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    // Invisible Cloudflare Turnstile check — enforced once the
    // TURNSTILE_SECRET_KEY secret exists (until then the forms don't send
    // a token, see js/captcha.js). No puzzle is ever shown to people.
    if (TURNSTILE_SECRET_KEY) {
      const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
      if (!captchaToken || !(await turnstileOk(captchaToken))) {
        return new Response(JSON.stringify({ error: "security check failed — please refresh and try again" }), { status: 400, headers: corsHeaders });
      }
    }

    // Flood protection without keeping visitors' IPs: a cap per sender
    // email per hour, and an overall cap per 10 minutes so a script
    // can't bury the inbox (and burn the email quota) in one go.
    const since10m = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentAll } = await admin.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", since10m);
    if ((recentAll || 0) >= GLOBAL_LIMIT_10_MIN) {
      return new Response(JSON.stringify({ error: "too many messages right now — please try again later" }), { status: 429, headers: corsHeaders });
    }
    if (email) {
      const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentSame } = await admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since1h);
      if ((recentSame || 0) >= PER_EMAIL_LIMIT_1_HOUR) {
        return new Response(JSON.stringify({ error: "too many messages — please try again later" }), { status: 429, headers: corsHeaders });
      }
    }

    // Who left a feedback rating: the widget has no name/email fields, so
    // a rating used to arrive completely anonymous. supabase-js's
    // functions.invoke() sends the signed-in visitor's own session token
    // as the Authorization header; when it resolves to a real user, the
    // account's email/name are recorded — taken from the verified
    // session, never from the request body, so nobody can file feedback
    // under someone else's address. A logged-out visitor's token is just
    // the public anon key, which getUser() rejects: the rating simply
    // stays anonymous, as before. Still never required — the function
    // keeps working for visitors without an account.
    if (formType === "feedback") {
      name = null;
      email = null;
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      if (token) {
        try {
          const { data: userData } = await admin.auth.getUser(token);
          const user = userData && userData.user;
          if (user) {
            email = user.email || null;
            const meta = (user.user_metadata || {}) as Record<string, unknown>;
            const fullName = meta.full_name || meta.name;
            name = typeof fullName === "string" && fullName.trim() ? fullName.trim().slice(0, 200) : null;
          }
        } catch (_e) { /* anonymous rating — fine */ }
      }
    }

    const row = { form_type: formType, name, email, rating, message, page };
    const { error } = await admin.from("contact_messages").insert(row);
    if (error) {
      console.error("contact_messages insert failed", error.message);
      return new Response(JSON.stringify({ error: "saving the message failed" }), { status: 500, headers: corsHeaders });
    }

    await notifyByEmail(row);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
