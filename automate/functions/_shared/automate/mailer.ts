// DeskKit Automate — the only place that hands an email to a provider.
//
// SAFE BY DEFAULT: unless MAIL_MODE is exactly "live", nothing is sent —
// the email is recorded as "simulated" (the staging project never has
// MAIL_MODE=live). In live mode, MAIL_ALLOWLIST (comma-separated
// addresses) limits real sending to those addresses only, for a
// controlled pilot; everyone else is simulated.

import { classifyHttp } from "./engine.ts";

export type Outgoing = { id: string; to: string; toName?: string | null; fromName: string; replyTo?: string | null; subject: string; html: string };
export type SendResult =
  | { kind: "sent"; providerId: string | null }
  | { kind: "simulated" }
  | { kind: "quota" | "transient" | "permanent"; error: string };

const FROM_ADDRESS = "noreply@deskkit.co.il";

function cleanName(s: string): string {
  return String(s || "DeskKit").replace(/[<>"\\\r\n]/g, "").slice(0, 80) || "DeskKit";
}

export function mailMode(): { live: boolean; allowlist: string[] } {
  const live = Deno.env.get("MAIL_MODE") === "live" && !!Deno.env.get("RESEND_API_KEY");
  const allowlist = (Deno.env.get("MAIL_ALLOWLIST") || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return { live, allowlist };
}

// fault: injected by the staging tests only ("transient" | "permanent" | "quota").
export async function deliver(m: Outgoing, fault: string | null): Promise<SendResult> {
  if (fault === "transient") return { kind: "transient", error: "simulated provider outage" };
  if (fault === "permanent") return { kind: "permanent", error: "simulated rejected address" };
  if (fault === "quota") return { kind: "quota", error: "simulated daily quota" };

  const { live, allowlist } = mailMode();
  if (!live || (allowlist.length && !allowlist.includes(m.to.toLowerCase()))) return { kind: "simulated" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        // Same message id = the provider sends it once, even if we retry.
        "Idempotency-Key": m.id,
      },
      body: JSON.stringify({
        from: `${cleanName(m.fromName)} <${FROM_ADDRESS}>`,
        to: [m.to], subject: m.subject, html: m.html,
        ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      }),
    });
    const body = await res.json().catch(() => null) as { id?: string; name?: string; message?: string } | null;
    const kind = classifyHttp(res.status, body);
    if (kind === "ok") return { kind: "sent", providerId: body?.id || null };
    return { kind, error: `${res.status} ${body?.name || ""} ${String(body?.message || "").slice(0, 200)}`.trim() };
  } catch (e) {
    return { kind: "transient", error: String((e as Error).message || e).slice(0, 200) };
  }
}
