// DeskKit Automate — every email the automations send, in one place.
//
// Two looks: emails to the BUSINESS OWNER come from DeskKit; emails to the
// owner's CLIENTS carry the business's own name, are sent on its behalf,
// and replies go to the business (reply_to), never to DeskKit.

import { escapeHtml, fill, shekels, textToHtml, whatsappLink } from "./engine.ts";

export type Business = { name: string; replyEmail: string | null; phone: string | null; type: string | null };
export type Ctx = {
  business: Business;
  appUrl: string;                        // the Automate app (links in owner emails)
  config: Record<string, unknown>;
  contact?: { id: string; name: string; email: string | null; phone: string | null; message: string | null; amount: number; source: string } | null;
  quote?: { id: string; token: string; client_name: string; client_email: string; title: string | null; total: number | null; sent_at: string; expires_at?: string | null } | null;
  invoice?: { invoice_id: string; invoice_number: number | null; client_name: string | null; client_email: string | null; amount: number | null; due_date: string } | null;
  publicBaseUrl: string;                 // where q.html lives
  attention?: { kind: string; title: string; reason: string; amount: number | null }[];
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

function button(label: string, href: string): string {
  return `<p style="margin:18px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#14B8A6;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:10px;">${escapeHtml(label)}</a></p>`;
}

function frame(headerHtml: string, body: string, footer: string): string {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F4;"><div dir="rtl" style="background:#F1F5F4;padding:22px 12px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">
<div style="background:#0F766E;padding:16px 22px;color:#fff;font-size:19px;font-weight:800;">${headerHtml}</div>
<div style="padding:22px;color:#111827;font-size:16px;line-height:1.7;text-align:right;">${body}</div>
<div style="padding:12px 22px 18px;color:#667085;font-size:12.5px;line-height:1.6;border-top:1px solid #EEF2F1;text-align:right;">${footer}</div>
</div></div></body></html>`;
}

function ownerEmail(ctx: Ctx, body: string): string {
  return frame("DeskKit Automate", body,
    `קיבלת את המייל כי הפעלת אוטומציה ב-DeskKit. אפשר להשהות או לשנות אותה בכל רגע ב<a href="${escapeHtml(ctx.appUrl)}" style="color:#667085;">מסך האוטומציות</a>.`);
}

function clientEmail(ctx: Ctx, body: string): string {
  return frame(escapeHtml(ctx.business.name), body,
    `נשלח בשם ${escapeHtml(ctx.business.name)} באמצעות DeskKit.` +
    (ctx.business.replyEmail ? ` אפשר להשיב למייל הזה ישירות ל${escapeHtml(ctx.business.name)}.` : ""));
}

function contactCard(c: NonNullable<Ctx["contact"]>): string {
  const wa = whatsappLink(c.phone, `היי ${c.name.split(/\s+/)[0]}, קיבלתי את הפנייה שלך`);
  return `<div style="background:#F6F8F7;border:1px solid #E3EAE7;border-radius:10px;padding:12px 14px;margin:10px 0;">
    <b style="font-size:17px;">${escapeHtml(c.name)}</b><br>
    ${c.phone ? `📞 <a href="tel:${escapeHtml(c.phone)}" style="color:#0F766E;">${escapeHtml(c.phone)}</a><br>` : ""}
    ${c.email ? `✉️ <a href="mailto:${escapeHtml(c.email)}" style="color:#0F766E;">${escapeHtml(c.email)}</a><br>` : ""}
    ${c.message ? `<div style="margin-top:8px;color:#344054;">${escapeHtml(c.message).replace(/\n/g, "<br>")}</div>` : ""}
  </div>${wa ? button("לענות בוואטסאפ", wa) : ""}`;
}

export function buildMessage(id: string, ctx: Ctx): Built {
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
