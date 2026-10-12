// DeskKit Automate — bounce / complaint reports from the email provider,
// turned into one shape whatever the provider. Pure (no I/O): used by the
// mail-events function and the unit tests.
//
//   Resend  — webhook JSON  {type: "email.bounced" | "email.complained", data: {to: [...], email_id}}
//   SES     — SNS envelope   {Type: "Notification", Message: "<json>"} whose Message is an
//             event-publishing record {eventType: "Bounce"|"Complaint", ...} or an identity
//             notification {notificationType: ...}; plus the one-time SubscriptionConfirmation
//   Brevo   — webhook JSON  {event: "hard_bounce" | "spam" | "blocked" | ..., email, "message-id"}
//
// Only hard (permanent) bounces and spam complaints suppress an address; a
// soft bounce (mailbox full, temporary) does not.

export type MailEvent = { email: string; reason: "bounce" | "complaint"; providerMessageId: string | null; detail: string };
export type Parsed =
  | { kind: "events"; events: MailEvent[] }
  | { kind: "sns-confirm"; subscribeUrl: string }
  | { kind: "ignore"; why: string };

const lower = (s: unknown) => String(s ?? "").trim().toLowerCase();
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
const clip = (s: unknown) => String(s ?? "").slice(0, 300);

function emailsOf(v: unknown): string[] {
  const list = Array.isArray(v) ? v : [v];
  return list.map((x) => lower(typeof x === "object" && x ? (x as { emailAddress?: string; email?: string }).emailAddress ?? (x as { email?: string }).email : x))
    .map((e) => (e.match(/<([^>]+)>/)?.[1] || e)).filter(validEmail);
}

export function parseResend(body: Record<string, unknown>): Parsed {
  const type = String(body.type || "");
  const data = (body.data || {}) as Record<string, unknown>;
  const id = data.email_id ? String(data.email_id) : null;
  if (type === "email.bounced") {
    const b = (data.bounce || {}) as Record<string, unknown>;
    // Resend reports permanent bounces here; if a type is given, honour it.
    if (b.type && !/permanent|hard/i.test(String(b.type))) return { kind: "ignore", why: "soft bounce" };
    return { kind: "events", events: emailsOf(data.to).map((email) => ({ email, reason: "bounce", providerMessageId: id, detail: clip(b.message || b.subType || "bounced") })) };
  }
  if (type === "email.complained") {
    return { kind: "events", events: emailsOf(data.to).map((email) => ({ email, reason: "complaint", providerMessageId: id, detail: "marked as spam" })) };
  }
  return { kind: "ignore", why: "event " + type };
}

export function parseSes(body: Record<string, unknown>): Parsed {
  if (body.Type === "SubscriptionConfirmation") {
    const url = String(body.SubscribeURL || "");
    // Only ever follow a real SNS confirmation link.
    if (/^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\//.test(url)) return { kind: "sns-confirm", subscribeUrl: url };
    return { kind: "ignore", why: "bad subscribe url" };
  }
  if (body.Type !== "Notification") return { kind: "ignore", why: "sns " + String(body.Type) };
  let msg: Record<string, unknown>;
  try { msg = typeof body.Message === "string" ? JSON.parse(body.Message) : (body.Message as Record<string, unknown>) || {}; } catch { return { kind: "ignore", why: "bad message" }; }
  const type = String(msg.eventType || msg.notificationType || "");
  const mail = (msg.mail || {}) as Record<string, unknown>;
  const id = mail.messageId ? String(mail.messageId) : null;
  if (type === "Bounce") {
    const b = (msg.bounce || {}) as Record<string, unknown>;
    if (String(b.bounceType) !== "Permanent") return { kind: "ignore", why: "soft bounce" };
    return { kind: "events", events: emailsOf(b.bouncedRecipients).map((email) => ({ email, reason: "bounce", providerMessageId: id, detail: clip(`${b.bounceType}/${b.bounceSubType || ""}`) })) };
  }
  if (type === "Complaint") {
    const c = (msg.complaint || {}) as Record<string, unknown>;
    return { kind: "events", events: emailsOf(c.complainedRecipients).map((email) => ({ email, reason: "complaint", providerMessageId: id, detail: clip(c.complaintFeedbackType || "complaint") })) };
  }
  return { kind: "ignore", why: "ses " + type };
}

export function parseBrevo(body: Record<string, unknown>): Parsed {
  const ev = String(body.event || "");
  const id = body["message-id"] ? String(body["message-id"]) : null;
  const email = lower(body.email);
  if (!validEmail(email)) return { kind: "ignore", why: "no email" };
  if (ev === "hard_bounce" || ev === "blocked" || ev === "invalid_email") return { kind: "events", events: [{ email, reason: "bounce", providerMessageId: id, detail: clip(body.reason || ev) }] };
  if (ev === "spam" || ev === "complaint") return { kind: "events", events: [{ email, reason: "complaint", providerMessageId: id, detail: "marked as spam" }] };
  return { kind: "ignore", why: "event " + ev };
}

export function parseMailEvent(provider: string, body: unknown): Parsed {
  if (!body || typeof body !== "object") return { kind: "ignore", why: "empty" };
  const b = body as Record<string, unknown>;
  if (provider === "ses") return parseSes(b);
  if (provider === "brevo") return parseBrevo(b);
  if (provider === "resend") return parseResend(b);
  return { kind: "ignore", why: "unknown provider" };
}
