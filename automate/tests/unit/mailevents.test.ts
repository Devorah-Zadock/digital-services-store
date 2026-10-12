// Bounce / complaint reports from each provider → the same events.
import { parseMailEvent } from "../../functions/_shared/automate/mailevents.ts";

function eq(a: unknown, b: unknown) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`expected ${y}, got ${x}`); }

Deno.test("Resend: bounce and complaint suppress; other events are ignored", () => {
  eq(parseMailEvent("resend", { type: "email.bounced", data: { email_id: "re_1", to: ["Client <A@Example.com>"], bounce: { type: "Permanent", message: "no such user" } } }),
    { kind: "events", events: [{ email: "a@example.com", reason: "bounce", providerMessageId: "re_1", detail: "no such user" }] });
  eq(parseMailEvent("resend", { type: "email.bounced", data: { to: ["a@example.com"], bounce: { type: "Transient" } } }).kind, "ignore");
  eq(parseMailEvent("resend", { type: "email.complained", data: { email_id: "re_2", to: ["b@example.com"] } }),
    { kind: "events", events: [{ email: "b@example.com", reason: "complaint", providerMessageId: "re_2", detail: "marked as spam" }] });
  eq(parseMailEvent("resend", { type: "email.delivered", data: { to: ["a@example.com"] } }).kind, "ignore");
});

Deno.test("Amazon SES via SNS: permanent bounce, complaint, confirmation; soft bounce ignored", () => {
  const note = (m: unknown) => ({ Type: "Notification", Message: JSON.stringify(m) });
  eq(parseMailEvent("ses", note({ eventType: "Bounce", mail: { messageId: "s1" }, bounce: { bounceType: "Permanent", bounceSubType: "General", bouncedRecipients: [{ emailAddress: "x@example.com" }] } })),
    { kind: "events", events: [{ email: "x@example.com", reason: "bounce", providerMessageId: "s1", detail: "Permanent/General" }] });
  eq(parseMailEvent("ses", note({ notificationType: "Bounce", bounce: { bounceType: "Transient", bouncedRecipients: [{ emailAddress: "x@example.com" }] } })).kind, "ignore");
  eq(parseMailEvent("ses", note({ eventType: "Complaint", mail: { messageId: "s2" }, complaint: { complainedRecipients: [{ emailAddress: "y@example.com" }], complaintFeedbackType: "abuse" } })),
    { kind: "events", events: [{ email: "y@example.com", reason: "complaint", providerMessageId: "s2", detail: "abuse" }] });
  eq(parseMailEvent("ses", { Type: "SubscriptionConfirmation", SubscribeURL: "https://sns.eu-central-1.amazonaws.com/?Action=ConfirmSubscription&Token=t" }).kind, "sns-confirm");
  eq(parseMailEvent("ses", { Type: "SubscriptionConfirmation", SubscribeURL: "https://evil.example.com/" }).kind, "ignore");
});

Deno.test("Brevo: hard bounce / blocked / spam suppress; soft bounce ignored", () => {
  eq(parseMailEvent("brevo", { event: "hard_bounce", email: "Z@example.com", "message-id": "<b1>", reason: "550" }),
    { kind: "events", events: [{ email: "z@example.com", reason: "bounce", providerMessageId: "<b1>", detail: "550" }] });
  eq(parseMailEvent("brevo", { event: "spam", email: "z@example.com" }).kind, "events");
  eq(parseMailEvent("brevo", { event: "soft_bounce", email: "z@example.com" }).kind, "ignore");
  eq(parseMailEvent("brevo", { event: "hard_bounce", email: "not-an-email" }).kind, "ignore");
});
