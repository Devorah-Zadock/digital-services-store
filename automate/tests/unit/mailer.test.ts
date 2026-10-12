// Provider adapters: same Outgoing message → each provider's request, and
// each provider's answer → the same SendResult. No network: fetch is faked.
function ok(v: unknown, msg = "") { if (!v) throw new Error("assertion failed " + msg); }
function eq(a: unknown, b: unknown) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`expected ${y}, got ${x}`); }
import { deliver, mailMode, sigV4, type Outgoing } from "../../functions/_shared/automate/mailer.ts";

const msg: Outgoing = { id: "11111111-2222-3333-4444-555555555555", to: "client@example.com", toName: "Client", fromName: "Studio <x>", replyTo: "owner@example.com", subject: "Hi", html: "<p>Hi</p>", unsubscribe: "https://x/u?t=1" };
const envOf = (o: Record<string, string>) => (k: string) => o[k];
type Call = { url: string; init: RequestInit };
function fakeFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Call[] = [];
  const f = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers }));
  }) as unknown as typeof fetch;
  return { f, calls };
}
const LIVE = { AUTOMATE_MAIL_MODE: "live" };

Deno.test("AWS SigV4 matches the official test vector (get-vanilla)", async () => {
  const h = await sigV4({
    method: "GET", host: "example.amazonaws.com", path: "/", body: "", region: "us-east-1", service: "service",
    accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", amzDate: "20150830T123600Z",
  });
  eq(h.Authorization, "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31");
});

Deno.test("not live, or the provider isn't configured → simulated, nothing sent", async () => {
  const { f, calls } = fakeFetch(200, {});
  eq((await deliver(msg, null, { env: envOf({}), fetch: f })).kind, "simulated");
  eq((await deliver(msg, null, { env: envOf({ ...LIVE, AUTOMATE_MAIL_PROVIDER: "ses" }), fetch: f })).kind, "simulated");
  eq((await deliver(msg, null, { env: envOf({ ...LIVE, AUTOMATE_MAIL_PROVIDER: "brevo" }), fetch: f })).kind, "simulated");
  eq(calls.length, 0);
  eq(mailMode(envOf({ ...LIVE, AUTOMATE_MAIL_PROVIDER: "nonsense", RESEND_API_KEY: "k" })).provider, "resend");
});

Deno.test("allowlist: only listed addresses are really sent", async () => {
  const { f, calls } = fakeFetch(200, { id: "r1" });
  const env = envOf({ ...LIVE, RESEND_API_KEY: "k", AUTOMATE_MAIL_ALLOWLIST: "owner@example.com" });
  eq((await deliver(msg, null, { env, fetch: f })).kind, "simulated");
  eq(calls.length, 0);
});

Deno.test("Resend: request shape, idempotency, separate automations key, sender override", async () => {
  const { f, calls } = fakeFetch(200, { id: "re_1" });
  const env = envOf({ ...LIVE, RESEND_API_KEY: "main", AUTOMATE_RESEND_API_KEY: "auto", AUTOMATE_MAIL_FROM: "hello@mail.deskkit.co.il" });
  eq(await deliver(msg, null, { env, fetch: f }), { kind: "sent", providerId: "re_1" });
  const c = calls[0];
  eq(c.url, "https://api.resend.com/emails");
  const h = c.init.headers as Record<string, string>;
  eq(h.Authorization, "Bearer auto");
  eq(h["Idempotency-Key"], msg.id);
  const b = JSON.parse(String(c.init.body));
  eq(b.from, "Studio x <hello@mail.deskkit.co.il>");
  eq(b.reply_to, "owner@example.com");
  eq(b.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
});

Deno.test("Resend: errors are classified (quota waits, account problem waits, bad address fails)", async () => {
  const env = envOf({ ...LIVE, RESEND_API_KEY: "k" });
  eq((await deliver(msg, null, { env, fetch: fakeFetch(429, { name: "daily_quota_exceeded" }).f })).kind, "quota");
  eq((await deliver(msg, null, { env, fetch: fakeFetch(429, { name: "rate_limit_exceeded" }).f })).kind, "transient");
  eq((await deliver(msg, null, { env, fetch: fakeFetch(403, { name: "validation_error", message: "domain not verified" }).f })).kind, "quota");
  eq((await deliver(msg, null, { env, fetch: fakeFetch(422, { name: "validation_error" }).f })).kind, "permanent");
  eq((await deliver(msg, null, { env, fetch: fakeFetch(503, {}).f })).kind, "transient");
});

Deno.test("Brevo: request shape and error classes", async () => {
  const env = envOf({ ...LIVE, AUTOMATE_MAIL_PROVIDER: "brevo", AUTOMATE_BREVO_API_KEY: "bk" });
  const { f, calls } = fakeFetch(201, { messageId: "<b1@brevo>" });
  eq(await deliver(msg, null, { env, fetch: f }), { kind: "sent", providerId: "<b1@brevo>" });
  eq(calls[0].url, "https://api.brevo.com/v3/smtp/email");
  eq((calls[0].init.headers as Record<string, string>)["api-key"], "bk");
  const b = JSON.parse(String(calls[0].init.body));
  eq(b.sender, { name: "Studio x", email: "noreply@deskkit.co.il" });
  eq(b.to, [{ email: "client@example.com", name: "Client" }]);
  eq(b.replyTo, { email: "owner@example.com" });
  eq(b.headers["X-DeskKit-Message"], msg.id);
  eq((await deliver(msg, null, { env, fetch: fakeFetch(402, { code: "not_enough_credits" }).f })).kind, "quota");
  eq((await deliver(msg, null, { env, fetch: fakeFetch(429, {}).f })).kind, "transient");
  eq((await deliver(msg, null, { env, fetch: fakeFetch(400, { code: "invalid_parameter" }).f })).kind, "permanent");
});

Deno.test("Amazon SES: signed v2 request and error classes", async () => {
  const env = envOf({ ...LIVE, AUTOMATE_MAIL_PROVIDER: "ses", AUTOMATE_SES_REGION: "eu-central-1", AUTOMATE_SES_ACCESS_KEY_ID: "AKID", AUTOMATE_SES_SECRET_ACCESS_KEY: "secret", AUTOMATE_SES_CONFIGURATION_SET: "deskkit" });
  const now = new Date("2026-10-12T10:00:00Z");
  const { f, calls } = fakeFetch(200, { MessageId: "ses-1" });
  eq(await deliver(msg, null, { env, fetch: f, now }), { kind: "sent", providerId: "ses-1" });
  eq(calls[0].url, "https://email.eu-central-1.amazonaws.com/v2/email/outbound-emails");
  const h = calls[0].init.headers as Record<string, string>;
  ok(h.Authorization.startsWith("AWS4-HMAC-SHA256 Credential=AKID/20261012/eu-central-1/ses/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature="));
  eq(h["x-amz-date"], "20261012T100000Z");
  const b = JSON.parse(String(calls[0].init.body));
  eq(b.Destination.ToAddresses, ["client@example.com"]);
  eq(b.ConfigurationSetName, "deskkit");
  ok(b.Content.Simple.Headers.some((x: { Name: string }) => x.Name === "List-Unsubscribe"));
  const err = (status: number, type: string) => fakeFetch(status, { message: "x" }, { "x-amzn-errortype": type }).f;
  eq((await deliver(msg, null, { env, fetch: err(400, "AccountSuspendedException"), now })).kind, "quota");
  eq((await deliver(msg, null, { env, fetch: err(400, "SendingPausedException"), now })).kind, "quota");
  eq((await deliver(msg, null, { env, fetch: err(429, "TooManyRequestsException"), now })).kind, "transient");
  eq((await deliver(msg, null, { env, fetch: err(400, "MessageRejected"), now })).kind, "permanent");
});

Deno.test("a network failure is a temporary problem (retried)", async () => {
  const env = envOf({ ...LIVE, RESEND_API_KEY: "k" });
  const boom = (() => Promise.reject(new Error("connection reset"))) as unknown as typeof fetch;
  eq((await deliver(msg, null, { env, fetch: boom })).kind, "transient");
});
