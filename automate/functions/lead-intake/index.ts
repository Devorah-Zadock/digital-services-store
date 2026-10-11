// DeskKit Automate — receives the contact form on a site built with
// DeskKit and saves the enquiry for the site's owner. Public by design
// (visitors aren't signed in); the site owner's id is looked up from the
// site's own address, never taken from the request.
//
// Protection: Cloudflare Turnstile when configured, a hidden honeypot
// field, length limits, and per-site limits (20 enquiries an hour; the
// same person within 10 minutes counts once).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));

  // Bots fill every field; people never see this one. Pretend success.
  if (str(body.website, 200)) return json({ ok: true });

  const slug = str(body.site, 63).toLowerCase();
  const name = str(body.name, 200);
  const phone = str(body.phone, 40);
  const email = str(body.email, 254);
  const message = str(body.message, 2000);
  if (!SLUG_RE.test(slug)) return json({ error: "site" }, 400);
  if (!name) return json({ error: "name" }, 400);
  if (!phone && !email) return json({ error: "contact" }, 400);
  if (email && !EMAIL_RE.test(email)) return json({ error: "email" }, 400);
  if (phone && phone.replace(/\D/g, "").length < 9) return json({ error: "phone" }, 400);

  if (TURNSTILE_SECRET) {
    const form = new FormData();
    form.append("secret", TURNSTILE_SECRET);
    form.append("response", str(body.turnstile, 4000));
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })
      .then((r) => r.json()).catch(() => ({ success: false }));
    if (!v.success) return json({ error: "captcha" }, 400);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: site } = await db.from("site_projects").select("id, user_id").eq("slug", slug).maybeSingle();
  if (!site) return json({ error: "site" }, 404);

  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db.from("contacts").select("id", { count: "exact", head: true })
    .eq("user_id", site.user_id).eq("source", "site_form").gte("created_at", hourAgo);
  if ((count || 0) >= 20) return json({ error: "busy" }, 429);

  const tenMin = new Date(Date.now() - 600e3).toISOString();
  let dupe = db.from("contacts").select("id").eq("user_id", site.user_id).eq("source", "site_form").gte("created_at", tenMin);
  dupe = email ? dupe.eq("email", email) : dupe.eq("phone", phone);
  const { data: same } = await dupe.limit(1);
  if (same && same.length) return json({ ok: true, duplicate: true });

  const { error } = await db.from("contacts").insert({
    user_id: site.user_id, name, phone: phone || null, email: email || null, message: message || null,
    source: "site_form", site_project_id: site.id, consent_contact: body.consent === true, stage: "new",
  });
  if (error) return json({ error: "server" }, 500);
  return json({ ok: true });
});
