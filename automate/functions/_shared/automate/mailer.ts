// DeskKit Automate — the only place that hands an email to a provider.
//
// SAFE BY DEFAULT: unless AUTOMATE_MAIL_MODE is exactly "live", nothing is sent —
// the email is recorded as "simulated" (the staging project never has
// AUTOMATE_MAIL_MODE=live). In live mode, AUTOMATE_MAIL_ALLOWLIST (comma-separated
// addresses) limits real sending to those addresses only, for a
// controlled pilot; everyone else is simulated.
//
// PROVIDERS: AUTOMATE_MAIL_PROVIDER picks who sends — "resend" (default),
// "ses" (Amazon SES) or "brevo". Each one is a small adapter below that
// turns the same Outgoing message into that provider's request and its
// answer into the same SendResult, so the worker, the automations and the
// tests never know which provider is behind it. Switching provider is a
// settings change, never a code change. (Sign-up / password-reset emails
// are sent by Supabase Auth through its own SMTP settings and never pass
// through here — changing this provider can't affect them.)

import { classifyHttp } from "./engine.ts";

export type Outgoing = { id: string; to: string; toName?: string | null; fromName: string; replyTo?: string | null; subject: string; html: string; unsubscribe?: string | null };
export type SendResult =
  | { kind: "sent"; providerId: string | null }
  | { kind: "simulated" }
  | { kind: "quota" | "transient" | "permanent"; error: string };
export type Provider = "resend" | "ses" | "brevo";

type Env = (k: string) => string | undefined;
const realEnv: Env = (k) => Deno.env.get(k);

function cleanName(s: string): string {
  return String(s || "DeskKit").replace(/[<>"\\\r\n]/g, "").slice(0, 80) || "DeskKit";
}
function fromAddress(env: Env): string {
  const a = (env("AUTOMATE_MAIL_FROM") || "").trim();
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(a) ? a : "noreply@deskkit.co.il";
}
function unsubHeaders(m: Outgoing): Record<string, string> {
  // Mail apps show their own "unsubscribe" button (one click, RFC 8058).
  return m.unsubscribe ? { "List-Unsubscribe": `<${m.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {};
}
const short = (s: unknown) => String(s ?? "").slice(0, 200);

export function mailProvider(env: Env = realEnv): Provider {
  const p = (env("AUTOMATE_MAIL_PROVIDER") || "resend").trim().toLowerCase();
  return p === "ses" || p === "brevo" ? p : "resend";
}

// Is the chosen provider fully configured? (Never true without its keys.)
export function providerReady(p: Provider, env: Env = realEnv): boolean {
  if (p === "ses") return !!(env("AUTOMATE_SES_REGION") && env("AUTOMATE_SES_ACCESS_KEY_ID") && env("AUTOMATE_SES_SECRET_ACCESS_KEY"));
  if (p === "brevo") return !!env("AUTOMATE_BREVO_API_KEY");
  return !!(env("AUTOMATE_RESEND_API_KEY") || env("RESEND_API_KEY"));
}

export function mailMode(env: Env = realEnv): { live: boolean; allowlist: string[]; provider: Provider } {
  const provider = mailProvider(env);
  const live = env("AUTOMATE_MAIL_MODE") === "live" && providerReady(provider, env);
  const allowlist = (env("AUTOMATE_MAIL_ALLOWLIST") || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return { live, allowlist, provider };
}

// Account-level problems (bad key, unverified sender, out of credit) must not
// fail the individual message: they wait (like a used-up quota) and the owner
// gets one alert. Only a problem with this one address is "permanent".
function accountProblem(status: number): boolean {
  return status === 401 || status === 403 || status === 402;
}

// ---------------------------------------------------------------- Resend
async function sendResend(m: Outgoing, env: Env, f: typeof fetch): Promise<SendResult> {
  const res = await f("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("AUTOMATE_RESEND_API_KEY") || env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      // Same message id = the provider sends it once, even if we retry.
      "Idempotency-Key": m.id,
    },
    body: JSON.stringify({
      from: `${cleanName(m.fromName)} <${fromAddress(env)}>`,
      to: [m.to], subject: m.subject, html: m.html,
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      ...(m.unsubscribe ? { headers: unsubHeaders(m) } : {}),
    }),
  });
  const body = await res.json().catch(() => null) as { id?: string; name?: string; message?: string } | null;
  const kind = accountProblem(res.status) ? "quota" : classifyHttp(res.status, body);
  if (kind === "ok") return { kind: "sent", providerId: body?.id || null };
  return { kind, error: `resend ${res.status} ${body?.name || ""} ${short(body?.message)}`.trim() };
}

// ---------------------------------------------------------------- Brevo
async function sendBrevo(m: Outgoing, env: Env, f: typeof fetch): Promise<SendResult> {
  const res = await f("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env("AUTOMATE_BREVO_API_KEY") || "", "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: cleanName(m.fromName), email: fromAddress(env) },
      to: [{ email: m.to, ...(m.toName ? { name: cleanName(m.toName) } : {}) }],
      subject: m.subject, htmlContent: m.html,
      ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}),
      headers: { ...unsubHeaders(m), "X-DeskKit-Message": m.id },
    }),
  });
  const body = await res.json().catch(() => null) as { messageId?: string; code?: string; message?: string } | null;
  if (res.status >= 200 && res.status < 300) return { kind: "sent", providerId: body?.messageId || null };
  const kind = accountProblem(res.status) ? "quota" : res.status === 429 || res.status >= 500 ? "transient" : "permanent";
  return { kind, error: `brevo ${res.status} ${body?.code || ""} ${short(body?.message)}`.trim() };
}

// ---------------------------------------------------------------- Amazon SES (API v2, SigV4)
const enc = new TextEncoder();
async function sha256Hex(data: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(data)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(data));
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

// AWS Signature Version 4 for one request. Returns the headers to send.
export async function sigV4(o: {
  method: string; host: string; path: string; query?: string; body: string; region: string; service: string;
  accessKeyId: string; secretAccessKey: string; amzDate: string; extraHeaders?: Record<string, string>;
}): Promise<Record<string, string>> {
  const date = o.amzDate.slice(0, 8);
  const headers: Record<string, string> = { host: o.host, "x-amz-date": o.amzDate, ...(o.extraHeaders || {}) };
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = String(v).trim().replace(/\s+/g, " ");
  const canonicalHeaders = names.map((n) => `${n}:${lower[n]}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalRequest = [o.method, o.path, o.query || "", canonicalHeaders, signedHeaders, await sha256Hex(o.body)].join("\n");
  const scope = `${date}/${o.region}/${o.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", o.amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
  let k = await hmac(enc.encode("AWS4" + o.secretAccessKey), date);
  k = await hmac(k, o.region);
  k = await hmac(k, o.service);
  k = await hmac(k, "aws4_request");
  const signature = hex(await hmac(k, toSign));
  return {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${o.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function sendSes(m: Outgoing, env: Env, f: typeof fetch, now: Date): Promise<SendResult> {
  const region = env("AUTOMATE_SES_REGION") || "eu-west-1";
  const host = `email.${region}.amazonaws.com`;
  const path = "/v2/email/outbound-emails";
  const configSet = env("AUTOMATE_SES_CONFIGURATION_SET");
  const body = JSON.stringify({
    FromEmailAddress: `${cleanName(m.fromName)} <${fromAddress(env)}>`,
    Destination: { ToAddresses: [m.to] },
    ...(m.replyTo ? { ReplyToAddresses: [m.replyTo] } : {}),
    Content: { Simple: {
      Subject: { Data: m.subject, Charset: "UTF-8" },
      Body: { Html: { Data: m.html, Charset: "UTF-8" } },
      Headers: Object.entries({ ...unsubHeaders(m), "X-DeskKit-Message": m.id }).map(([Name, Value]) => ({ Name, Value })),
    } },
    EmailTags: [{ Name: "deskkit_message", Value: m.id.replace(/[^A-Za-z0-9_-]/g, "") }],
    ...(configSet ? { ConfigurationSetName: configSet } : {}),
  });
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const headers = await sigV4({
    method: "POST", host, path, body, region, service: "ses", amzDate,
    accessKeyId: env("AUTOMATE_SES_ACCESS_KEY_ID") || "", secretAccessKey: env("AUTOMATE_SES_SECRET_ACCESS_KEY") || "",
    extraHeaders: { "content-type": "application/json" },
  });
  delete headers.host;
  const res = await f(`https://${host}${path}`, { method: "POST", headers, body });
  const out = await res.json().catch(() => null) as { MessageId?: string; message?: string; Message?: string } | null;
  if (res.status >= 200 && res.status < 300) return { kind: "sent", providerId: out?.MessageId || null };
  const type = res.headers.get("x-amzn-errortype") || "";
  const msg = short(out?.message || out?.Message);
  // Sending paused / daily quota reached / not allowed yet (sandbox, unverified sender) → wait.
  if (/SendingPaused|LimitExceeded|AccountSuspended|NotAuthorized|AccessDenied|MailFromDomainNotVerified|UnrecognizedClient|InvalidSignature/i.test(type) || accountProblem(res.status)) {
    return { kind: "quota", error: `ses ${res.status} ${type} ${msg}`.trim() };
  }
  if (res.status === 429 || res.status >= 500 || /TooManyRequests|Throttl/i.test(type)) return { kind: "transient", error: `ses ${res.status} ${type} ${msg}`.trim() };
  return { kind: "permanent", error: `ses ${res.status} ${type} ${msg}`.trim() };
}

// ---------------------------------------------------------------- entry point
// fault: injected by the staging tests only ("transient" | "permanent" | "quota").
export async function deliver(m: Outgoing, fault: string | null, deps?: { env?: Env; fetch?: typeof fetch; now?: Date }): Promise<SendResult> {
  if (fault === "transient") return { kind: "transient", error: "simulated provider outage" };
  if (fault === "permanent") return { kind: "permanent", error: "simulated rejected address" };
  if (fault === "quota") return { kind: "quota", error: "simulated daily quota" };

  const env = deps?.env || realEnv;
  const f = deps?.fetch || fetch;
  const { live, allowlist, provider } = mailMode(env);
  if (!live || (allowlist.length && !allowlist.includes(m.to.toLowerCase()))) return { kind: "simulated" };

  try {
    if (provider === "ses") return await sendSes(m, env, f, deps?.now || new Date());
    if (provider === "brevo") return await sendBrevo(m, env, f);
    return await sendResend(m, env, f);
  } catch (e) {
    return { kind: "transient", error: short((e as Error).message || e) };
  }
}
