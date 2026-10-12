// DeskKit Automate — every email the automations send, in one place.
//
// Two looks: emails to the BUSINESS OWNER come from DeskKit; emails to the
// owner's CLIENTS carry the business's own name, are sent on its behalf,
// and replies go to the business (reply_to), never to DeskKit.

import { escapeHtml, fill, shekels, textToHtml, whatsappLink } from "./engine.ts";

export type Business = { name: string; replyEmail: string | null; phone: string | null; type: string | null; lang?: "he" | "en" | null };
export type Ctx = {
  business: Business;
  appUrl: string;                        // the Automate app (links in owner emails)
  config: Record<string, unknown>;
  contact?: { id: string; name: string; email: string | null; phone: string | null; message: string | null; amount: number; source: string } | null;
  quote?: { id: string; token: string; client_name: string; client_email: string; title: string | null; total: number | null; sent_at: string; expires_at?: string | null } | null;
  invoice?: { invoice_id: string; invoice_number: number | null; client_name: string | null; client_email: string | null; amount: number | null; due_date: string } | null;
  publicBaseUrl: string;                 // where q.html lives
  optoutUrl?: string | null;             // client emails: "stop emailing me" (signed link)
  attention?: { kind: string; title: string; reason: string; amount: number | null; since?: string | null }[];
  weekly?: Record<string, number>;
};

// "YYYY-MM-DD…" or an ISO time → "DD/MM/YYYY" (Israel date).
function israelDate(v: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00:00Z") : new Date(v);
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Jerusalem" });
}
export type Built = { subject: string; html: string; toRole: "owner" | "client"; purpose: string };

function vars(ctx: Ctx): Record<string, string> {
  const name = ctx.contact?.name || ctx.quote?.client_name || ctx.invoice?.client_name || "";
  return {
    "שם": name.split(/\s+/)[0] || name,
    "עסק": ctx.business.name,
    "קישור": ctx.quote ? `${ctx.publicBaseUrl}/q.html?t=${ctx.quote.token}` : String(ctx.config.review_url || ""),
    "חשבונית": ctx.invoice?.invoice_number != null ? String(ctx.invoice.invoice_number) : "",
    "סכום": ctx.invoice?.amount != null ? shekels(ctx.invoice.amount) : "",
    "מועד": ctx.invoice ? ctx.invoice.due_date.split("-").reverse().join("/") : ctx.quote?.expires_at ? israelDate(ctx.quote.expires_at) : "",
  };
}
// The same values under the English placeholder names ({name}, {business}…),
// used by the English texts.
function varsAll(ctx: Ctx): Record<string, string> {
  const v = vars(ctx);
  return { ...v, name: v["שם"], business: v["עסק"], link: v["קישור"], invoice: v["חשבונית"], amount: v["סכום"], date: v["מועד"] };
}

function button(label: string, href: string): string {
  return `<p style="margin:18px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#14B8A6;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:10px;">${escapeHtml(label)}</a></p>`;
}

function frame(headerHtml: string, body: string, footer: string, en = false): string {
  const dir = en ? "ltr" : "rtl";
  const align = en ? "left" : "right";
  return `<!doctype html><html lang="${en ? "en" : "he"}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F4;"><div dir="${dir}" style="background:#F1F5F4;padding:22px 12px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">
<div style="background:#0F766E;padding:16px 22px;color:#fff;font-size:19px;font-weight:800;">${headerHtml}</div>
<div style="padding:22px;color:#111827;font-size:16px;line-height:1.7;text-align:${align};">${body}</div>
<div style="padding:12px 22px 18px;color:#667085;font-size:12.5px;line-height:1.6;border-top:1px solid #EEF2F1;text-align:${align};">${footer}</div>
</div></div></body></html>`;
}

function isEn(ctx: Ctx): boolean {
  return ctx.business.lang === "en";
}

function ownerEmail(ctx: Ctx, body: string): string {
  if (isEn(ctx)) {
    return frame("DeskKit Automate", body,
      `You're getting this email because you turned on an automation in DeskKit. You can pause or change it at any time on the <a href="${escapeHtml(ctx.appUrl)}" style="color:#667085;">automations screen</a>.`, true);
  }
  return frame("DeskKit Automate", body,
    `קיבלת את המייל כי הפעלת אוטומציה ב-DeskKit. אפשר להשהות או לשנות אותה בכל רגע ב<a href="${escapeHtml(ctx.appUrl)}" style="color:#667085;">מסך האוטומציות</a>.`);
}

function clientEmail(ctx: Ctx, body: string): string {
  const b = escapeHtml(ctx.business.name);
  if (isEn(ctx)) {
    return frame(b, body,
      `Sent on behalf of ${b} via DeskKit.` +
      (ctx.business.replyEmail ? ` You can reply to this email to reach ${b} directly.` : "") +
      (ctx.optoutUrl ? `<br><a href="${escapeHtml(ctx.optoutUrl)}" style="color:#667085;">Don't want automated emails from ${b}? Unsubscribe</a>` : ""), true);
  }
  return frame(b, body,
    `נשלח בשם ${b} באמצעות DeskKit.` +
    (ctx.business.replyEmail ? ` אפשר להשיב למייל הזה ישירות ל${b}.` : "") +
    (ctx.optoutUrl ? `<br><a href="${escapeHtml(ctx.optoutUrl)}" style="color:#667085;">לא רוצים לקבל מיילים אוטומטיים מ${b}? להסרה</a>` : ""));
}

function contactCard(c: NonNullable<Ctx["contact"]>, en = false): string {
  const first = c.name.split(/\s+/)[0];
  const wa = whatsappLink(c.phone, en ? `Hi ${first}, I got your message` : `היי ${first}, קיבלתי את הפנייה שלך`);
  return `<div style="background:#F6F8F7;border:1px solid #E3EAE7;border-radius:10px;padding:12px 14px;margin:10px 0;">
    <b style="font-size:17px;">${escapeHtml(c.name)}</b><br>
    ${c.phone ? `📞 <a href="tel:${escapeHtml(c.phone)}" style="color:#0F766E;">${escapeHtml(c.phone)}</a><br>` : ""}
    ${c.email ? `✉️ <a href="mailto:${escapeHtml(c.email)}" style="color:#0F766E;">${escapeHtml(c.email)}</a><br>` : ""}
    ${c.message ? `<div style="margin-top:8px;color:#344054;">${escapeHtml(c.message).replace(/\n/g, "<br>")}</div>` : ""}
  </div>${wa ? button(en ? "Reply on WhatsApp" : "לענות בוואטסאפ", wa) : ""}`;
}

const H2 = (t: string) => `<h2 style="margin:0 0 8px;font-size:20px;">${t}</h2>`;
const P = (t: string, style = "") => `<p style="margin:0 0 6px;${style}">${t}</p>`;
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
function daysSince(iso: string | null | undefined): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? Math.max(1, Math.floor((Date.now() - t) / 864e5)) : 1;
}
function attentionEn(a: NonNullable<Ctx["attention"]>[number]): { title: string; reason: string } {
  const n = daysSince(a.since);
  const m = /^חשבונית (.+)$/.exec(a.title || "");
  const title = a.kind === "invoice_overdue" && m ? "Invoice " + m[1] : a.title;
  const reason = ({
    lead_unhandled: "New enquiry not handled yet",
    quote_waiting: `Quote unanswered for ${days(n)}`,
    invoice_overdue: `Payment is ${days(n)} overdue`,
    task_overdue: "Task past its due date",
    message_approval: "A client message is awaiting your approval",
    followup_stuck: "In Follow-up with no change for a week",
  } as Record<string, string>)[a.kind] || a.reason;
  return { title, reason };
}

export function buildMessage(id: string, ctx: Ctx): Built {
  return isEn(ctx) ? buildEn(id, ctx) : buildHe(id, ctx);
}

function buildEn(id: string, ctx: Ctx): Built {
  const v = varsAll(ctx);
  const app = ctx.appUrl;
  const biz = ctx.business.name;
  const auto = ctx.config.client_messages === "auto";
  const text = (k: string) => clientEmail(ctx, textToHtml(fill(String(ctx.config[k] || ""), v)));
  switch (id) {
    case "new_lead": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `New enquiry from your website: ${c.name}`,
        html: ownerEmail(ctx, `${H2("New enquiry from your website 🎯")}
          ${P("Reply quickly: an enquiry answered within the first hour is much easier to win.")}
          ${contactCard(c, true)}${button("Open in your client list", `${app}#contacts`)}`) };
    }
    case "lead_reminder":
    case "lead_cooling": {
      const c = ctx.contact!;
      const cooling = id === "lead_cooling";
      return { toRole: "owner", purpose: id,
        subject: cooling ? `${c.name} is still waiting for a reply` : `Reminder: get back to ${c.name}`,
        html: ownerEmail(ctx, `${H2(cooling ? "This lead is cooling down ⏳" : "Reminder to reply to an enquiry")}
          ${P(`${cooling ? "More than a day has passed and the enquiry isn't marked as handled yet." : "This enquiry is still marked as a \"New lead\"."} If you've already replied, mark it \"Handled\" and the reminders will stop.`)}
          ${contactCard(c, true)}${button("Mark as handled / open", `${app}#contacts`)}`) };
    }
    case "lead_ack":
      return { toRole: "client", purpose: id, subject: `We've received your enquiry — ${biz}`, html: text("auto_reply_text") };
    case "quote_sent": {
      const q = ctx.quote!;
      return { toRole: "client", purpose: id, subject: `A quote from ${biz}${q.title ? ` — ${q.title}` : ""}`,
        html: clientEmail(ctx, `<p style="margin:0 0 12px;">Hello ${escapeHtml(v.name)},</p>
          <p style="margin:0 0 12px;">Here is our quote${q.title ? ` for ${escapeHtml(q.title)}` : ""}. You can view it and approve it with one click:</p>
          ${button("View and approve the quote", v.link)}
          <p style="margin:0;color:#475467;font-size:14px;">Questions? Just reply to this email.</p>`) };
    }
    case "quote_reminder":
      return { toRole: "client", purpose: id, subject: `Reminder: your quote from ${biz}`, html: text("reminder_text") };
    case "quote_waiting": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `${q.client_name} hasn't answered your quote yet`,
        html: ownerEmail(ctx, `${H2("A quote is waiting for an answer")}
          ${P(`The quote for <b>${escapeHtml(q.client_name)}</b>${q.total != null ? ` (${shekels(q.total)})` : ""} was sent and hasn't been approved yet. ${auto ? "We sent the client a gentle reminder." : "We prepared a reminder for the client — it's waiting for your approval on the \"Today\" screen."}`)}
          ${button("Open the Today screen", `${app}#today`)}`) };
    }
    case "quote_approved": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `🎉 ${q.client_name} approved your quote`,
        html: ownerEmail(ctx, `${H2("Quote approved! 🎉")}
          ${P(`<b>${escapeHtml(q.client_name)}</b> approved the quote${q.title ? ` "${escapeHtml(q.title)}"` : ""}${q.total != null ? ` for ${shekels(q.total)}` : ""}. We opened a task for you to schedule the start of the work.`)}
          ${button("Go to Today", `${app}#today`)}`) };
    }
    case "invoice_reminder":
      return { toRole: "client", purpose: id, subject: `Payment reminder — ${biz}`, html: text("reminder_text") };
    case "invoice_overdue": {
      const i = ctx.invoice!;
      return { toRole: "owner", purpose: id, subject: `Invoice ${i.invoice_number ?? ""} isn't marked as paid yet`,
        html: ownerEmail(ctx, `${H2("An invoice is waiting for payment")}
          ${P(`The payment date of invoice <b>${escapeHtml(v.invoice)}</b>${i.client_name ? ` (${escapeHtml(i.client_name)})` : ""}${i.amount != null ? ` for ${shekels(i.amount)}` : ""} has passed. ${auto ? "We sent the client a polite reminder." : "We prepared a polite reminder for the client — it's waiting for your approval."}`)}
          ${P("Already paid? Mark it \"Paid\" and the reminders will stop. (DeskKit isn't connected to your bank — marking it is up to you.)", "color:#475467;font-size:14px;")}
          ${button("Go to invoices", `${app}#invoices`)}`) };
    }
    case "welcome":
      return { toRole: "client", purpose: id, subject: `Welcome to ${biz}`, html: text("welcome_text") };
    case "onboarding_stuck": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `Open onboarding tasks: ${c.name}`,
        html: ownerEmail(ctx, `${H2("Is a client's onboarding stuck?")}
          ${P(`<b>${escapeHtml(c.name)}</b> still has open onboarding tasks. Worth making sure nothing was forgotten.`)}
          ${button("Go to tasks", `${app}#today`)}`) };
    }
    case "review_request":
      return { toRole: "client", purpose: id, subject: `${biz} — we'd love to hear what you thought`, html: text("review_text") };
    case "lead_followup":
      return { toRole: "client", purpose: id, subject: `${biz} — still interested?`, html: text("followup_text") };
    case "lead_decide": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `${c.name}: keep going or close?`,
        html: ownerEmail(ctx, `${H2("A lead that isn't moving 🌱")}
          ${P(`The enquiry from <b>${escapeHtml(c.name)}</b> has been open for a few days with no quote and no decision${c.email ? ", even after the follow-up message" : ""}. We moved it to "Follow-up" and opened a task for you to decide.`)}
          ${contactCard(c, true)}${button("Decide now", `${app}#contacts`)}`) };
    }
    case "lead_closed": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `${c.name}'s lead was closed`,
        html: ownerEmail(ctx, `${H2("We closed an old lead")}
          ${P(`There was no progress with <b>${escapeHtml(c.name)}</b>, so we marked it "Not relevant" (as you asked). If they come back, you can restore it in one click.`)}
          ${button("Go to your client list", `${app}#contacts`)}`) };
    }
    case "service_due":
      return { toRole: "client", purpose: id, subject: `${biz} — time for your next visit`, html: text("reminder_text") };
    case "paid_thanks":
      return { toRole: "client", purpose: id, subject: `Thank you! Payment received — ${biz}`, html: text("thanks_text") };
    case "referral_request":
      return { toRole: "client", purpose: id, subject: `${biz} — a small request`, html: text("referral_text") };
    case "quote_declined": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `${q.client_name} declined your quote`,
        html: ownerEmail(ctx, `${H2("Quote declined")}
          ${P(`<b>${escapeHtml(q.client_name)}</b> marked the quote${q.title ? ` "${escapeHtml(q.title)}"` : ""}${q.total != null ? ` (${shekels(q.total)})` : ""} as not a fit. ${ctx.config.ask_feedback === false ? "" : "Tomorrow we'll gently ask what was missing, so you can learn for next time."}`)}
          ${button("Go to Today", `${app}#today`)}`) };
    }
    case "quote_feedback":
      return { toRole: "client", purpose: id, subject: `${biz} — a quick question`, html: text("feedback_text") };
    case "quote_reengage":
      return { toRole: "client", purpose: id, subject: `${biz} — still interested?`, html: text("reengage_text") };
    case "quote_expiring":
      return { toRole: "client", purpose: id, subject: `Your quote from ${biz} is valid until ${v.date}`, html: text("expiry_text") };
    case "quote_expiring_owner": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `The quote for ${q.client_name} expires on ${v.date}`,
        html: ownerEmail(ctx, `${H2("A quote is about to expire ⏳")}
          ${P(`The quote for <b>${escapeHtml(q.client_name)}</b>${q.total != null ? ` (${shekels(q.total)})` : ""} is valid until <b>${escapeHtml(v.date)}</b> and hasn't been answered yet. ${auto ? "We sent the client a gentle reminder." : "We prepared a reminder for the client — it's waiting for your approval."} It's a good time to call.`)}
          ${button("Go to Today", `${app}#today`)}`) };
    }
    case "weekly": {
      const w = ctx.weekly || {};
      const n = (k: string) => Number(w[k] || 0);
      const row = (label: string, value: string, note = "") =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #EEF2F1;">${label}</td><td style="padding:7px 0;border-bottom:1px solid #EEF2F1;text-align:right;font-weight:700;">${value}${note ? ` <span style="font-weight:400;color:#667085;font-size:13px;">${note}</span>` : ""}</td></tr>`;
      const rows = [
        row("New enquiries", String(n("leads_new")), n("leads_new") ? `(${n("leads_handled")} handled)` : ""),
        row("Clients won", String(n("clients_won"))),
        row("Quotes sent", String(n("quotes_sent"))),
        row("Quotes approved", String(n("quotes_approved")), n("quotes_approved_total") ? `(${shekels(n("quotes_approved_total"))})` : ""),
        row("Payments received", String(n("paid_count")), n("paid_total") ? `(${shekels(n("paid_total"))})` : ""),
        row("Tasks completed", String(n("tasks_done"))),
      ].join("");
      const open: string[] = [];
      if (n("quotes_waiting")) open.push(`${n("quotes_waiting")} quote(s) waiting for an answer`);
      if (n("overdue_count")) open.push(`${n("overdue_count")} overdue invoice(s)${n("overdue_total") ? ` (${shekels(n("overdue_total"))})` : ""}`);
      if (n("tasks_overdue")) open.push(`${n("tasks_overdue")} task(s) past their due date`);
      return { toRole: "owner", purpose: id, subject: `📊 Your week: ${n("leads_new")} enquiries, ${n("quotes_approved")} quotes approved`,
        html: ownerEmail(ctx, `${H2("Your week in summary 📊")}
          <table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 12px;">${rows}</table>
          ${open.length ? P(`<b>Still open:</b> ${open.map(escapeHtml).join(" · ")}`) : P("Nothing left open — a tidy week! 🎉")}
          ${button("Open DeskKit Automate", `${app}#today`)}`) };
    }
    case "digest": {
      const all = ctx.attention || [];
      const items = all.slice(0, 8);
      const rows = items.map((a) => { const t = attentionEn(a); return `<li style="margin:0 0 8px;"><b>${escapeHtml(t.title)}</b> — ${escapeHtml(t.reason)}${a.amount ? ` · ${shekels(a.amount)}` : ""}</li>`; }).join("");
      const more = all.length - items.length;
      return { toRole: "owner", purpose: id, subject: `☀️ ${items.length + Math.max(0, more)} thing(s) need you today`,
        html: ownerEmail(ctx, `${H2("Good morning! Here's what needs you today")}
          <ol style="margin:0 0 10px;padding-inline-start:20px;">${rows}</ol>${more > 0 ? `<p style="margin:0;color:#475467;">And ${more} more.</p>` : ""}
          ${button("Take care of it now", `${app}#today`)}`) };
    }
  }
  throw new Error("unknown message " + id);
}

function buildHe(id: string, ctx: Ctx): Built {
  const v = vars(ctx);
  const app = ctx.appUrl;
  switch (id) {
    case "new_lead": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `פנייה חדשה מהאתר: ${c.name}`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">פנייה חדשה מהאתר 🎯</h2>
          <p style="margin:0 0 6px;">כדאי לחזור מהר — פנייה שמקבלת מענה בשעה הראשונה נסגרת הרבה יותר בקלות.</p>
          ${contactCard(c)}${button("לפתוח ברשימת הלקוחות", `${app}#contacts`)}`) };
    }
    case "lead_reminder":
    case "lead_cooling": {
      const c = ctx.contact!;
      const cooling = id === "lead_cooling";
      return { toRole: "owner", purpose: id,
        subject: cooling ? `${c.name} עדיין מחכה/ה לתשובה` : `תזכורת: לחזור אל ${c.name}`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">${cooling ? "הליד מתקרר ⏳" : "תזכורת לחזור לפנייה"}</h2>
          <p style="margin:0 0 6px;">${cooling ? "עבר יותר מיום מאז הפנייה ועדיין לא סומן שטיפלת בה." : "הפנייה הזו עדיין מסומנת כ\"ליד חדש\"."} אם כבר חזרת — סמנו \"טופל\" והתזכורות ייעצרו.</p>
          ${contactCard(c)}${button("לסמן כטופל / לפתוח", `${app}#contacts`)}`) };
    }
    case "lead_ack":
      return { toRole: "client", purpose: id, subject: `קיבלנו את הפנייה שלך — ${ctx.business.name}`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.auto_reply_text || ""), v))) };
    case "quote_sent": {
      const q = ctx.quote!;
      return { toRole: "client", purpose: id, subject: `הצעת מחיר מ${ctx.business.name}${q.title ? ` — ${q.title}` : ""}`,
        html: clientEmail(ctx, `<p style="margin:0 0 12px;">שלום ${escapeHtml(v["שם"])},</p>
          <p style="margin:0 0 12px;">מצורפת הצעת המחיר שלנו${q.title ? ` עבור ${escapeHtml(q.title)}` : ""}. אפשר לצפות בה ולאשר בלחיצה:</p>
          ${button("לצפייה בהצעה ולאישור", v["קישור"])}
          <p style="margin:0;color:#475467;font-size:14px;">לשאלות — אפשר פשוט להשיב למייל הזה.</p>`) };
    }
    case "quote_reminder":
      return { toRole: "client", purpose: id, subject: `תזכורת: הצעת המחיר מ${ctx.business.name}`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.reminder_text || ""), v))) };
    case "quote_waiting": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `${q.client_name} עוד לא ענה/תה על הצעת המחיר`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">הצעה ממתינה לתשובה</h2>
          <p style="margin:0 0 6px;">ההצעה ל<b>${escapeHtml(q.client_name)}</b>${q.total != null ? ` (${shekels(q.total)})` : ""} נשלחה ועדיין לא אושרה. ${ctx.config.client_messages === "auto" ? "שלחנו ללקוח תזכורת עדינה." : "הכנו תזכורת ללקוח — היא מחכה לאישורך במסך \"היום\"."}</p>
          ${button("לפתוח את מסך היום", `${app}#today`)}`) };
    }
    case "quote_approved": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `🎉 ${q.client_name} אישר/ה את הצעת המחיר`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">ההצעה אושרה! 🎉</h2>
          <p style="margin:0 0 6px;"><b>${escapeHtml(q.client_name)}</b> אישר/ה את ההצעה${q.title ? ` "${escapeHtml(q.title)}"` : ""}${q.total != null ? ` על סך ${shekels(q.total)}` : ""}. פתחנו לך משימה לתאם את תחילת העבודה.</p>
          ${button("למסך היום", `${app}#today`)}`) };
    }
    case "invoice_reminder":
      return { toRole: "client", purpose: id, subject: `תזכורת תשלום — ${ctx.business.name}`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.reminder_text || ""), v))) };
    case "invoice_overdue": {
      const i = ctx.invoice!;
      return { toRole: "owner", purpose: id, subject: `חשבונית ${i.invoice_number ?? ""} עדיין לא סומנה כשולמה`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">חשבונית ממתינה לתשלום</h2>
          <p style="margin:0 0 6px;">מועד התשלום של חשבונית <b>${escapeHtml(v["חשבונית"])}</b>${i.client_name ? ` (${escapeHtml(i.client_name)})` : ""}${i.amount != null ? ` על סך ${shekels(i.amount)}` : ""} עבר. ${ctx.config.client_messages === "auto" ? "שלחנו ללקוח תזכורת מנומסת." : "הכנו ללקוח תזכורת מנומסת — היא מחכה לאישורך."}</p>
          <p style="margin:0 0 6px;color:#475467;font-size:14px;">כבר שולם? סמנו \"שולם\" והתזכורות ייעצרו. (DeskKit לא מחובר לבנק — הסימון הוא שלך.)</p>
          ${button("לחשבוניות", `${app}#invoices`)}`) };
    }
    case "welcome":
      return { toRole: "client", purpose: id, subject: `ברוכים הבאים ל${ctx.business.name}`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.welcome_text || ""), v))) };
    case "onboarding_stuck": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `משימות קליטה פתוחות: ${c.name}`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">קליטת לקוח נתקעה?</h2>
          <p style="margin:0 0 6px;">ללקוח <b>${escapeHtml(c.name)}</b> יש עדיין משימות קליטה פתוחות. כדאי לוודא שלא נשכח כלום.</p>
          ${button("למשימות", `${app}#today`)}`) };
    }
    case "review_request":
      return { toRole: "client", purpose: id, subject: `${ctx.business.name} — נשמח לשמוע מה חשבת`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.review_text || ""), v))) };
    case "lead_followup":
      return { toRole: "client", purpose: id, subject: `${ctx.business.name} — עדיין רלוונטי?`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.followup_text || ""), v))) };
    case "lead_decide": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `${c.name}: להמשיך או לסגור?`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">ליד שלא מתקדם 🌱</h2>
          <p style="margin:0 0 6px;">הפנייה של <b>${escapeHtml(c.name)}</b> פתוחה כבר כמה ימים בלי הצעת מחיר ובלי סגירה${c.email ? ", גם אחרי הודעת המעקב" : ""}. העברנו אותה ל"פולו-אפ" ופתחנו לך משימה להחליט.</p>
          ${contactCard(c)}${button("להחליט עכשיו", `${app}#contacts`)}`) };
    }
    case "lead_closed": {
      const c = ctx.contact!;
      return { toRole: "owner", purpose: id, subject: `הליד של ${c.name} נסגר`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">סגרנו ליד ישן</h2>
          <p style="margin:0 0 6px;">לא הייתה התקדמות עם <b>${escapeHtml(c.name)}</b>, אז סימנו אותו "לא רלוונטי" (כמו שביקשת). אם הוא יחזור — אפשר להחזיר אותו לרשימה בלחיצה.</p>
          ${button("לרשימת הלקוחות", `${app}#contacts`)}`) };
    }
    case "service_due":
      return { toRole: "client", purpose: id, subject: `${ctx.business.name} — הגיע הזמן לביקור הבא`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.reminder_text || ""), v))) };
    case "paid_thanks":
      return { toRole: "client", purpose: id, subject: `תודה! התשלום התקבל — ${ctx.business.name}`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.thanks_text || ""), v))) };
    case "referral_request":
      return { toRole: "client", purpose: id, subject: `${ctx.business.name} — בקשה קטנה`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.referral_text || ""), v))) };
    case "quote_declined": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `${q.client_name} דחה/תה את הצעת המחיר`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">הצעה נדחתה</h2>
          <p style="margin:0 0 6px;"><b>${escapeHtml(q.client_name)}</b> סימן/ה שההצעה${q.title ? ` "${escapeHtml(q.title)}"` : ""}${q.total != null ? ` (${shekels(q.total)})` : ""} לא מתאימה. ${ctx.config.ask_feedback === false ? "" : "מחר נשאל אותו/ה בעדינות מה היה חסר, כדי ללמוד להבא."}</p>
          ${button("למסך היום", `${app}#today`)}`) };
    }
    case "quote_feedback":
      return { toRole: "client", purpose: id, subject: `${ctx.business.name} — שאלה קצרה`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.feedback_text || ""), v))) };
    case "quote_reengage":
      return { toRole: "client", purpose: id, subject: `${ctx.business.name} — עדיין רלוונטי?`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.reengage_text || ""), v))) };
    case "quote_expiring":
      return { toRole: "client", purpose: id, subject: `הצעת המחיר מ${ctx.business.name} בתוקף עד ${v["מועד"]}`,
        html: clientEmail(ctx, textToHtml(fill(String(ctx.config.expiry_text || ""), v))) };
    case "quote_expiring_owner": {
      const q = ctx.quote!;
      return { toRole: "owner", purpose: id, subject: `ההצעה ל${q.client_name} פגה ב-${v["מועד"]}`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">הצעה לפני סוף התוקף ⏳</h2>
          <p style="margin:0 0 6px;">ההצעה ל<b>${escapeHtml(q.client_name)}</b>${q.total != null ? ` (${shekels(q.total)})` : ""} בתוקף עד <b>${escapeHtml(v["מועד"])}</b> ועדיין לא נענתה. ${ctx.config.client_messages === "auto" ? "שלחנו ללקוח תזכורת עדינה." : "הכנו ללקוח תזכורת — היא מחכה לאישורך."} זה זמן טוב להתקשר.</p>
          ${button("למסך היום", `${app}#today`)}`) };
    }
    case "weekly": {
      const w = ctx.weekly || {};
      const n = (k: string) => Number(w[k] || 0);
      const row = (label: string, value: string, note = "") =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #EEF2F1;">${label}</td><td style="padding:7px 0;border-bottom:1px solid #EEF2F1;text-align:left;font-weight:700;">${value}${note ? ` <span style="font-weight:400;color:#667085;font-size:13px;">${note}</span>` : ""}</td></tr>`;
      const rows = [
        row("פניות חדשות", String(n("leads_new")), n("leads_new") ? `(${n("leads_handled")} טופלו)` : ""),
        row("לקוחות שנסגרו", String(n("clients_won"))),
        row("הצעות מחיר שנשלחו", String(n("quotes_sent"))),
        row("הצעות שאושרו", String(n("quotes_approved")), n("quotes_approved_total") ? `(${shekels(n("quotes_approved_total"))})` : ""),
        row("תשלומים שהתקבלו", String(n("paid_count")), n("paid_total") ? `(${shekels(n("paid_total"))})` : ""),
        row("משימות שהושלמו", String(n("tasks_done"))),
      ].join("");
      const open: string[] = [];
      if (n("quotes_waiting")) open.push(`${n("quotes_waiting")} הצעות מחכות לתשובה`);
      if (n("overdue_count")) open.push(`${n("overdue_count")} חשבוניות באיחור${n("overdue_total") ? ` (${shekels(n("overdue_total"))})` : ""}`);
      if (n("tasks_overdue")) open.push(`${n("tasks_overdue")} משימות שהמועד שלהן עבר`);
      return { toRole: "owner", purpose: id, subject: `📊 השבוע שלך: ${n("leads_new")} פניות, ${n("quotes_approved")} הצעות אושרו`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">סיכום השבוע 📊</h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 12px;">${rows}</table>
          ${open.length ? `<p style="margin:0 0 6px;"><b>עדיין פתוח:</b> ${open.map(escapeHtml).join(" · ")}</p>` : `<p style="margin:0 0 6px;">אין דברים פתוחים — שבוע מסודר! 🎉</p>`}
          ${button("לפתוח את DeskKit Automate", `${app}#today`)}`) };
    }
    case "digest": {
      const items = (ctx.attention || []).slice(0, 8);
      const rows = items.map((a) => `<li style="margin:0 0 8px;"><b>${escapeHtml(a.title)}</b> — ${escapeHtml(a.reason)}${a.amount ? ` · ${shekels(a.amount)}` : ""}</li>`).join("");
      const more = (ctx.attention || []).length - items.length;
      return { toRole: "owner", purpose: id, subject: `☀️ ${items.length + Math.max(0, more)} דברים דורשים טיפול היום`,
        html: ownerEmail(ctx, `<h2 style="margin:0 0 8px;font-size:20px;">בוקר טוב! הנה מה שדורש טיפול היום</h2>
          <ol style="margin:0 0 10px;padding-inline-start:20px;">${rows}</ol>${more > 0 ? `<p style="margin:0;color:#475467;">ועוד ${more}.</p>` : ""}
          ${button("לטפל עכשיו", `${app}#today`)}`) };
    }
  }
  throw new Error("unknown message " + id);
}
