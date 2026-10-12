/* DeskKit Automate — the app (automate.html).
   Reads the owner's own data straight from Supabase (row-level security
   limits every query to this account) and does every change that needs
   checks through the automate-api function. */
(function () {
  "use strict";

  const S = {
    user: null, session: null, overview: null, catalog: null, autos: {},
    contacts: [], tasks: [], quotes: [], shares: [], invoices: [], tracked: [],
  };
  // UI language: the site-wide DeskKit preference (js/i18n.js — dkL /
  // localStorage deskkit_lang). The page reloads when it changes.
  const L = (he, en) => (typeof dkL === "function" ? dkL(he, en) : he);
  const EN = L("he", "en") === "en";
  const LOCALE = EN ? "en-US" : "he-IL";
  // A catalog object's text in the UI language: tx(t, "name") → t.nameEn in English.
  const tx = (o, k) => (EN && o && o[k + "En"] != null && o[k + "En"] !== "" ? o[k + "En"] : o[k]);
  const STATUS = {
    active: [L("פעילה", "Active"), "on"], paused: [L("מושהית", "Paused"), "off"], needs_attention: [L("דורשת טיפול", "Needs attention"), "bad"], blocked_quota: [L("ממתינה למכסה", "Waiting for quota"), "warn"],
  };
  const STAGES = { new: L("פנייה חדשה", "New lead"), inprogress: L("בטיפול", "In progress"), followup: L("פולו-אפ", "Follow-up"), won: L("נסגר בהצלחה", "Won"), lost: L("לא רלוונטי", "Not relevant") };
  const MSG_STATUS = {
    simulated: [L("נשלח (סביבת ניסוי)", "Sent (test environment)"), "info"], sent: [L("נשלח", "Sent"), "on"], queued: [L("ממתין לשליחה", "Waiting to send"), "off"], sending: [L("נשלח עכשיו", "Sending now"), "off"],
    deferred: [L("ממתין (שעות שקטות/מכסה)", "Waiting (quiet hours/quota)"), "warn"], pending_approval: [L("מחכה לאישורך", "Awaiting your approval"), "warn"], failed: [L("לא נשלח", "Not sent"), "bad"], cancelled: [L("בוטל", "Cancelled"), "off"],
  };
  const RUN_STATUS = {
    queued: [L("בתור", "Queued"), "off"], running: [L("פועל", "Running"), "info"], waiting: [L("ממתין", "Waiting"), "info"], retrying: [L("ניסיון חוזר", "Retrying"), "warn"],
    succeeded: [L("הושלם", "Completed"), "on"], stopped: [L("נעצר — לא נדרש עוד", "Stopped — no longer needed"), "off"], failed: [L("נכשל", "Failed"), "bad"], cancelled: [L("בוטל", "Cancelled"), "off"],
  };
  const SHARE_STATUS = { sent: [L("ממתינה לתשובה", "Awaiting reply"), "warn"], approved: [L("אושרה", "Approved"), "on"], declined: [L("נדחתה", "Declined"), "bad"], cancelled: [L("בוטלה", "Cancelled"), "off"], expired: [L("פג תוקף", "Expired"), "off"] };
  const IS_STAGING = /workers\.dev$/.test(location.hostname);

  // ------------------------------------------------------------ helpers
  const $ = (id) => document.getElementById(id);
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function money(n) { const v = Number(n); return Number.isFinite(v) && v ? "₪" + v.toLocaleString(LOCALE, { maximumFractionDigits: 0 }) : ""; }
  function when(iso) {
    if (!iso) return "";
    const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000;
    if (diff >= 0 && diff < 60) return L("עכשיו", "just now");
    if (diff >= 0 && diff < 3600) return L(`לפני ${Math.round(diff / 60)} דק׳`, `${Math.round(diff / 60)} min ago`);
    if (diff >= 0 && diff < 86400) return L(`לפני ${Math.round(diff / 3600)} שע׳`, `${Math.round(diff / 3600)} hr ago`);
    return d.toLocaleDateString(LOCALE, { day: "numeric", month: "numeric", year: "2-digit" });
  }
  function pill(map, key) { const v = map[key] || [key, "off"]; return `<span class="au-pill ${v[1]}">${esc(v[0])}</span>`; }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "au-toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function waLink(phone, text) {
    const d = String(phone || "").replace(/\D/g, ""); if (d.length < 9) return null;
    const intl = d.startsWith("972") ? d : d.startsWith("0") ? "972" + d.slice(1) : d;
    return `https://wa.me/${intl}` + (text ? `?text=${encodeURIComponent(text)}` : "");
  }
  const ERRORS = {
    "limit-active": L("הגעת למספר האוטומציות הפעילות בתוכנית. אפשר להשהות אחת אחרת.", "You've reached your plan's number of active automations. You can pause another one."),
    business_name: L("צריך שם עסק.", "A business name is required."), reply_email: L("כתובת המייל לתשובות לא תקינה.", "The reply email address isn't valid."), client_email: L("מייל הלקוח לא תקין.", "The client's email isn't valid."),
    client_name: L("צריך שם לקוח.", "A client name is required."), due_date: L("צריך תאריך לתשלום.", "A due date is required."), "not-issued": L("אפשר לעקוב רק אחרי חשבונית שהופקה.", "Only an issued invoice can be tracked."),
    notify_email: L("כתובת המייל להתראות לא תקינה.", "The notification email address isn't valid."),
  };
  // Server-written texts (alerts, attention reasons, history steps, task
  // titles) are stored in Hebrew; in English they're shown translated here.
  // Anything unrecognised is shown as stored.
  const EN_TEXT = [
    [/^האוטומציה "(.+)" לא הצליחה להשלים פעולה( כמה פעמים ברצף ולכן סומנה "דורש טיפול")?\. פרטים בהיסטוריה\.$/, (m) => `The automation "${tplNameEn(m[1])}" couldn't complete an action${m[2] ? " several times in a row, so it was marked \"Needs attention\"" : ""}. Details in Activity.`],
    [/^הגעתם למכסת המיילים החודשית/, () => "You've reached your monthly email quota. Actions are waiting and will run when the quota renews."],
    [/^הגעתם למכסת ההפעלות החודשית|^הגעתם למכסת/, () => "You've reached your monthly quota. Actions are waiting and will run when the quota renews."],
    [/^הגענו לתקרת המיילים היומית/, () => "The daily email cap for automations was reached. Messages are waiting and will go out tomorrow morning."],
    [/^ספק המיילים דיווח/, () => "The email provider reported its daily quota is used up. Messages are waiting and will go out tomorrow."],
    [/^מייל אל (\S+) לא נשלח \((.*)\)\. כדאי לבדוק שהכתובת נכונה\.$/, (m) => `An email to ${m[1]} wasn't sent (${m[2]}). Check that the address is correct.`],
    // history step summaries (automate-worker)
    [/^ההודעה כבר הוכנה$/, () => "The message was already prepared"],
    [/^אין כתובת מייל — ההודעה לא נשלחה$/, () => "No email address — the message wasn't sent"],
    [/^הוכנה הודעה אלייך — מחכה לאישורך$/, () => "A message to you was prepared — awaiting your approval"],
    [/^הוכנה הודעה ל(.+) — מחכה לאישורך$/, (m) => `A message to ${m[1] === "לקוח" ? "the client" : m[1]} was prepared — awaiting your approval`],
    [/^נשלח מייל אלייך: (.*)$/, (m) => `Email sent to you: ${m[1]}`],
    [/^נשלח מייל ל(.+?): (.*)$/, (m) => `Email sent to ${m[1] === "לקוח" ? "the client" : m[1]}: ${m[2]}`],
    [/^נפתחה משימה: (.*)$/, (m) => `Task opened: ${enText(m[1])}`],
    [/^נפתחו (\d+) משימות קליטה$/, (m) => `${m[1]} onboarding tasks opened`],
    [/^ההצעה לא נמצאה$/, () => "The quote wasn't found"],
    [/^(.+) סומן\/ה כלקוח\/ה שנסגר\/ה$/, (m) => `${m[1]} was marked as won`],
    [/^הלקוח לא נמצא$/, () => "The client wasn't found"],
    [/^השלב כבר עודכן$/, () => "The stage was already updated"],
    [/^(.+) סומן\/ה "לא רלוונטי"$/, (m) => `${m[1]} was marked "Not relevant"`],
    [/^(.+) הועבר\/ה ל"פולו-אפ"$/, (m) => `${m[1]} was moved to "Follow-up"`],
    [/^שבוע בלי פעילות — לא נשלח סיכום$/, () => "A week with no activity — no summary sent"],
    [/^אין כתובת מייל$/, () => "No email address"],
    [/^נשלח סיכום שבועי$/, () => "Weekly summary sent"],
    [/^אין דברים פתוחים — לא נשלח סיכום$/, () => "Nothing open — no summary sent"],
    [/^נשלח סיכום בוקר \((\d+) פריטים\)$/, (m) => `Morning brief sent (${m[1]} items)`],
    [/^ממתין עד (.*)$/, (m) => `Waiting until ${m[1]}`],
    [/^התנאי לא מתקיים$/, () => "Condition not met"],
    [/^המכסה החודשית נגמרה — הפעולה תתבצע כשתתחדש$/, () => "Monthly quota used up — the action will run when it renews"],
    [/^הפעולה נכשלה$/, () => "The action failed"],
    [/^ניסיון (\d+) נכשל — ננסה שוב$/, (m) => `Attempt ${m[1]} failed — will retry`],
    // task titles (templates.ts steps)
    [/^לחזור אל (.+)$/, (m) => `Get back to ${m[1]}`],
    [/^להתקשר ל(.+) לגבי הצעת המחיר$/, (m) => `Call ${m[1]} about the quote`],
    [/^לתאם עם (.+) את תחילת העבודה$/, (m) => `Schedule the start of work with ${m[1]}`],
    [/^לבדוק את התשלום של (.+) \(חשבונית (.*)\)$/, (m) => `Check ${m[1]}'s payment (invoice ${m[2]})`],
    [/^להחליט על (.+): להמשיך או לסגור$/, (m) => `Decide on ${m[1]}: continue or close`],
    [/^להתקשר ל(.+) לתיאום הביקור הבא$/, (m) => `Call ${m[1]} to schedule the next visit`],
    [/^לבדוק אם (.+) רלוונטי\/ת שוב$/, (m) => `Check whether ${m[1]} is relevant again`],
  ];
  function enText(s) {
    if (!EN || !s) return s;
    for (const [re, fn] of EN_TEXT) { const m = String(s).match(re); if (m) return fn(m); }
    return s;
  }
  function tplNameEn(heName) { const t = ((S.catalog && S.catalog.templates) || []).find((x) => x.name === heName); return t ? tx(t, "name") : heName; }
  async function api(action, body) {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session && data.session.access_token;
    const res = await fetch(SUPABASE_URL + "/functions/v1/automate-api", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ action, ...(body || {}) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = String(json.error || res.status);
      if (code === "not-in-pilot") throw new Error("PILOT");
      const missing = code.startsWith("missing:") ? L("חסרה הגדרה: ", "Missing setting: ") + code.slice(8) : null;
      throw new Error(missing || ERRORS[code] || L("משהו השתבש. נסו שוב.", "Something went wrong. Please try again."));
    }
    return json;
  }
  async function q(table, build) {
    let query = supabaseClient.from(table).select("*");
    if (build) query = build(query);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  function openModal(html) { $("au-dialog").innerHTML = html; $("au-modal").hidden = false; }
  function closeModal() { $("au-modal").hidden = true; $("au-dialog").innerHTML = ""; }
  $("au-modal").addEventListener("click", (e) => { if (e.target.id === "au-modal" || e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("au-modal").hidden) closeModal(); });

  // ------------------------------------------------------------ loading
  async function loadOverview() {
    S.overview = await api("overview");
    S.catalog = S.overview.catalog;
    S.autos = {};
    (S.overview.automations || []).forEach((a) => { S.autos[a.template_key] = a; });
  }
  async function loadData() {
    const [contacts, tasks, quotes, shares, invoices, tracked] = await Promise.all([
      q("contacts", (x) => x.order("created_at", { ascending: false }).limit(300)),
      q("tasks", (x) => x.eq("status", "open").order("due_at", { ascending: true, nullsFirst: false }).limit(100)),
      q("quote_saves", (x) => x.order("updated_at", { ascending: false }).limit(50)),
      q("quote_shares", (x) => x.order("sent_at", { ascending: false }).limit(100)),
      q("invoice_saves", (x) => x.eq("status", "issued").order("issued_at", { ascending: false }).limit(100)),
      q("invoice_tracking", (x) => x.order("due_date", { ascending: true }).limit(200)),
    ]);
    Object.assign(S, { contacts, tasks, quotes, shares, invoices, tracked });
  }
  function tplName(key) { const t = (S.catalog.templates || []).find((x) => x.key === key); return t ? `${t.icon} ${tx(t, "name")}` : key; }

  // ------------------------------------------------------------ header
  function renderHeader() {
    const p = S.overview.profile; const u = S.overview.usage || {}; const l = u.limits || {};
    const tagline = L("תהליכים שעובדים בשבילך ברקע", "Processes that work for you in the background");
    $("au-biz-line").textContent = p ? `${p.business_name} · ${tagline}` : tagline;
    $("au-usage").innerHTML = `${L("החודש", "This month")}: <b>${u.runs || 0}</b>/${l.runs_per_month || "—"} ${L("הפעלות", "runs")} · <b>${u.emails || 0}</b>/${l.emails_per_month || "—"} ${L("מיילים", "emails")}<br>
      <button class="au-btn" id="au-edit-profile" style="margin-top:6px;">${L("פרטי העסק", "Business details")}</button>`;
    $("au-edit-profile").onclick = () => openWizard(2);
    $("au-alerts").innerHTML = (S.overview.alerts || []).map((a) => `<div class="au-alert ${esc(a.level)}"><span>${esc(enText(a.message))}</span>
      <button class="au-btn" data-resolve="${a.id}">${L("הבנתי", "Got it")}</button></div>`).join("");
  }
  $("au-alerts").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-resolve]"); if (!b) return;
    await api("resolve-alert", { id: Number(b.dataset.resolve) }).catch(() => {});
    b.closest(".au-alert").remove();
  });

  // ------------------------------------------------------------ today
  async function renderToday() {
    let att;
    try { att = await api("attention"); } catch (e) { $("au-attention").innerHTML = `<div class="au-card au-empty">${esc(e.message)}</div>`; return; }
    const approvals = att.approvals || [];
    $("au-approvals").innerHTML = approvals.length ? `<h2 class="au-section-title" style="margin-top:0;">${L("הודעות שמחכות לאישורך", "Messages awaiting your approval")}</h2>
      <div class="au-list">${approvals.map((m) => `<div class="au-card au-item">
        <div class="au-item-main"><div class="au-item-title">${esc(m.subject)}</div>
          <div class="au-item-sub">${L("אל", "To")} ${esc(m.to_name || "")} &lt;${esc(m.to_email)}&gt; · ${L("הוכנה", "prepared")} ${esc(when(m.created_at))}</div></div>
        <div class="au-actions"><button class="au-btn" data-preview="${m.id}">${L("תצוגה", "Preview")}</button>
          <button class="au-btn primary" data-approve="${m.id}">${L("שליחה", "Send")}</button><button class="au-btn" data-cancel-msg="${m.id}">${L("ביטול", "Cancel")}</button></div>
      </div>`).join("")}</div>` : "";
    S._approvals = approvals;

    const items = (att.items || []).filter((i) => i.kind !== "message_approval");
    const count = items.length + approvals.length;
    $("au-today-count").textContent = count; $("au-today-count").hidden = !count;
    $("au-attention").innerHTML = items.length ? items.map(attentionCard).join("")
      : `<div class="au-card au-empty">${L("🎉 הכל מטופל. אין כרגע לידים, הצעות או חשבוניות שנופלים בין הכיסאות.", "🎉 All handled. No leads, quotes or invoices are slipping through the cracks right now.")}</div>`;

    $("au-tasks").innerHTML = S.tasks.length ? S.tasks.map((t) => {
      const c = S.contacts.find((x) => x.id === t.contact_id);
      const late = t.due_at && Date.parse(t.due_at) < Date.now();
      return `<div class="au-card au-item"><div class="au-item-main">
        <div class="au-item-title">${esc(enText(t.title))}</div>
        <div class="au-item-sub">${c ? esc(c.name) + " · " : ""}${t.due_at ? (late ? `<span style="color:#B42318">${L("באיחור", "Overdue")} · </span>` : "") + L("עד ", "Due ") + esc(new Date(t.due_at).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short" })) : ""}${t.origin === "automation" ? L(" · נוצרה אוטומטית", " · Created automatically") : ""}</div></div>
        <div class="au-actions"><button class="au-btn primary" data-task-done="${t.id}">${L("✓ בוצע", "✓ Done")}</button><button class="au-btn" data-task-dismiss="${t.id}">${L("לא רלוונטי", "Not relevant")}</button></div></div>`;
    }).join("") : `<div class="au-card au-empty">${L("אין משימות פתוחות.", "No open tasks.")}</div>`;
  }

  function attentionCard(i) {
    const c = S.contacts.find((x) => x.id === i.ref_id);
    let actions = "";
    if (i.kind === "lead_unhandled" || i.kind === "followup_stuck") {
      const wa = c && waLink(c.phone, `${L("היי", "Hi")} ${String(c.name).split(" ")[0]}, `);
      actions = `${wa ? `<a class="au-btn" target="_blank" rel="noopener" href="${esc(wa)}">${L("וואטסאפ", "WhatsApp")}</a>` : ""}
        ${c && c.phone ? `<a class="au-btn" href="tel:${esc(c.phone)}">${L("חיוג", "Call")}</a>` : ""}
        <button class="au-btn primary" data-handled="${i.ref_id}">${L("סימנתי שטיפלתי", "Mark as handled")}</button>`;
    } else if (i.kind === "quote_waiting") {
      actions = `<button class="au-btn" data-goto="quotes">${L("להצעה", "View quote")}</button>`;
    } else if (i.kind === "invoice_overdue") {
      actions = `<button class="au-btn primary" data-paid="${i.ref_id}">${L('סמן "שולם"', 'Mark "Paid"')}</button>`;
    } else if (i.kind === "task_overdue") {
      actions = `<button class="au-btn primary" data-task-done="${i.ref_id}">${L("✓ בוצע", "✓ Done")}</button>`;
    }
    return `<div class="au-card au-item"><div class="au-item-main">
      <div class="au-item-title">${esc(attentionTitle(i))} ${i.amount ? `<span class="au-pill info">${esc(money(i.amount))}</span>` : ""}</div>
      <div class="au-item-sub">${esc(attentionReason(i))}</div></div><div class="au-actions">${actions}</div></div>`;
  }

  // automate_attention (SQL) writes its title fallback and reason in
  // Hebrew; in English they are rebuilt from the kind and dates.
  function daysSince(iso) { const t = Date.parse(iso); return Number.isFinite(t) ? Math.max(1, Math.floor((Date.now() - t) / 864e5)) : 1; }
  function attentionTitle(i) {
    if (!EN) return i.title;
    if (i.kind === "task_overdue") return enText(i.title);
    const m = /^חשבונית (.*)$/.exec(i.title || "");
    return i.kind === "invoice_overdue" && m ? "Invoice " + m[1] : i.title;
  }
  function attentionReason(i) {
    if (!EN) return i.reason;
    const n = daysSince(i.since);
    return {
      lead_unhandled: "New enquiry not handled yet",
      quote_waiting: `Quote unanswered for ${n} day${n === 1 ? "" : "s"}`,
      invoice_overdue: `Payment is ${n} day${n === 1 ? "" : "s"} overdue`,
      task_overdue: "Task past its due date",
      message_approval: "A client message is awaiting your approval",
      followup_stuck: "In Follow-up with no change for a week",
    }[i.kind] || i.reason;
  }

  document.addEventListener("click", async (e) => {
    const t = e.target.closest("button, a"); if (!t || !t.dataset) return;
    const d = t.dataset;
    try {
      if (d.preview) {
        const m = (S._approvals || []).find((x) => x.id === d.preview);
        if (m) openModal(`<h2>${esc(m.subject)}</h2><p class="au-item-sub">${L("אל", "To")} ${esc(m.to_email)}</p>
          <iframe sandbox="" style="width:100%;height:440px;border:1px solid #E3EAE7;border-radius:10px;" srcdoc="${esc(m.html)}"></iframe>
          <div class="au-actions" style="margin-top:12px;"><button class="au-btn primary" data-approve="${m.id}">${L("שליחה", "Send")}</button><button class="au-btn" data-close>${L("סגירה", "Close")}</button></div>`);
      } else if (d.approve) {
        t.disabled = true; await api("approve-message", { id: d.approve }); closeModal(); toast(L("נשלח לתור — יוצא תוך דקה (בשעות המותרות)", "Queued — goes out within a minute (during allowed hours)")); await refresh();
      } else if (d.cancelMsg) {
        await api("cancel-message", { id: d.cancelMsg }); toast(L("ההודעה בוטלה", "Message cancelled")); await refresh();
      } else if (d.handled) {
        await supabaseClient.from("contacts").update({ stage: "inprogress" }).eq("id", d.handled); toast(L("סומן כמטופל — התזכורות נעצרו", "Marked as handled — reminders stopped")); await refresh();
      } else if (d.paid) {
        await api("invoice-status", { invoice_id: d.paid, status: "paid" }); toast(L("סומן כשולם — התזכורות נעצרו", "Marked as paid — reminders stopped")); await refresh();
      } else if (d.unpaid) {
        await api("invoice-status", { invoice_id: d.unpaid, status: "unpaid" }); await refresh();
      } else if (d.taskDone || d.taskDismiss) {
        await supabaseClient.from("tasks").update({ status: d.taskDone ? "done" : "dismissed", done_at: new Date().toISOString() }).eq("id", d.taskDone || d.taskDismiss);
        await refresh();
      } else if (d.goto) {
        location.hash = d.goto;
      }
    } catch (err) { toast(err.message || L("משהו השתבש", "Something went wrong")); t.disabled = false; }
  });

  // ------------------------------------------------------------ automations
  function renderTemplates() {
    const anyActive = Object.keys(S.autos).length > 0;
    $("au-pack-banner").hidden = false;
    $("au-open-wizard").textContent = anyActive ? L("לשנות סוג עסק / להפעיל חבילה", "Change business type / turn on a package") : L("להפעלה בלחיצה", "Turn on in one click");
    $("au-templates").innerHTML = S.catalog.templates.map((t) => {
      const a = S.autos[t.key];
      const st = a ? pill(STATUS, a.status) : `<span class="au-pill off">${L("לא פעילה", "Off")}</span>`;
      const btns = a
        ? `<button class="au-btn" data-config="${t.key}">${L("הגדרות", "Settings")}</button>
           ${a.status === "paused" ? `<button class="au-btn primary" data-resume="${t.key}">${L("להמשיך", "Resume")}</button>` : `<button class="au-btn" data-pause="${t.key}">${L("השהיה", "Pause")}</button>`}
           <button class="au-btn danger" data-remove="${t.key}">${L("הסרה", "Remove")}</button>`
        : `<button class="au-btn primary" data-config="${t.key}">${L("הפעלה", "Turn on")}</button>`;
      const needs = tx(t, "needs") || [];
      return `<div class="au-card au-tpl"><div class="au-item"><span class="au-tpl-icon">${t.icon}</span>${st}</div>
        <h3>${esc(tx(t, "name"))}</h3><p>${esc(tx(t, "outcome"))}</p>
        <details><summary style="cursor:pointer;font-size:13.5px;color:#0F766E;font-weight:600;">${L("איך זה עובד", "How it works")}</summary>
          <ol class="au-how">${(tx(t, "howItWorks") || []).map((h) => `<li>${esc(h)}</li>`).join("")}</ol>
          ${needs.length ? `<p style="font-size:13px;">${L("צריך", "Requires")}: ${needs.map(esc).join(" · ")}</p>` : ""}</details>
        <div class="au-actions" style="margin-top:10px;">${btns}</div></div>`;
    }).join("");
  }

  function fieldHtml(f, value) {
    const id = "cfg-" + f.key;
    const help = tx(f, "help") ? `<div class="au-help">${esc(tx(f, "help"))}</div>` : "";
    const phs = tx(f, "placeholders");
    const ph = phs ? `<div class="au-help">${L("אפשר להשתמש ב:", "You can use:")} ${phs.map(esc).join(" ")}</div>` : "";
    const label = esc(tx(f, "label"));
    if (f.type === "bool") return `<div class="au-field"><label class="au-check"><input type="checkbox" id="${id}" ${value ? "checked" : ""}> ${label}</label>${help}</div>`;
    if (f.type === "int") return `<div class="au-field"><label for="${id}">${label}${f.unit ? ` (${esc(tx(f, "unit"))})` : ""}</label>
      <input class="au-input" type="number" id="${id}" min="${f.min}" max="${f.max}" value="${esc(value)}" style="max-width:140px;">${help}</div>`;
    if (f.type === "choice") return `<div class="au-field"><label for="${id}">${label}</label><select id="${id}">${f.options.map((o) =>
      `<option value="${esc(o.value)}" ${o.value === value ? "selected" : ""}>${esc(tx(o, "label"))}</option>`).join("")}</select>${help}</div>`;
    if (f.type === "url") return `<div class="au-field"><label for="${id}">${label}${f.required ? " *" : ""}</label>
      <input class="au-input" type="url" dir="ltr" id="${id}" value="${esc(value)}" placeholder="https://">${help}</div>`;
    return `<div class="au-field"><label for="${id}">${label}</label>${f.multiline
      ? `<textarea id="${id}" maxlength="${f.maxLength}">${esc(value)}</textarea>`
      : `<input class="au-input" id="${id}" maxlength="${f.maxLength}" value="${esc(value)}">`}${ph}${help}</div>`;
  }

  function readFields(fields) {
    const out = {};
    fields.forEach((f) => {
      const el = $("cfg-" + f.key); if (!el) return;
      out[f.key] = f.type === "bool" ? el.checked : f.type === "int" ? Number(el.value) : el.value;
    });
    return out;
  }

  // English UI → the English default wordings (templates.ts defaultEn, and
  // the business pack's overridesEn), sent with the activation so the
  // server stores them; Hebrew → {} and the server applies its own
  // (Hebrew) defaults exactly as before.
  function englishTextDefaults(t, packKey) {
    if (!EN) return {};
    const out = {};
    t.config.forEach((f) => { if (f.type === "text" && f.defaultEn) out[f.key] = f.defaultEn; });
    const pack = (S.catalog.packs || []).find((p) => p.key === packKey);
    return Object.assign(out, (pack && pack.overridesEn && pack.overridesEn[t.key]) || {});
  }

  function openConfig(key) {
    const t = S.catalog.templates.find((x) => x.key === key);
    const a = S.autos[key];
    const cfg = (a && a.config) || {};
    const packKey = (a && a.pack) || (S.overview.profile && S.overview.profile.business_type) || null;
    const enDefaults = a ? {} : englishTextDefaults(t, packKey);
    const val = (f) => (cfg[f.key] !== undefined ? cfg[f.key] : enDefaults[f.key] !== undefined ? enDefaults[f.key] : f.default);
    openModal(`<h2>${t.icon} ${esc(tx(t, "name"))}</h2><p class="au-item-sub">${esc(tx(t, "outcome"))}</p>
      <div class="au-card" style="background:#F6F8F7;margin:12px 0;"><b>${L("מה יקרה:", "What will happen:")}</b><ol class="au-how au-steps-preview">${(tx(t, "howItWorks") || []).map((h) => `<li>${esc(h)}</li>`).join("")}</ol></div>
      ${t.config.map((f) => fieldHtml(f, val(f))).join("") || `<p class="au-item-sub">${L("אין מה להגדיר — רק להפעיל.", "Nothing to set up — just turn it on.")}</p>`}
      <div class="au-actions" style="margin-top:16px;"><button class="au-btn primary" id="cfg-save">${a ? L("שמירה", "Save") : L("הפעלה", "Turn on")}</button><button class="au-btn" data-close>${L("ביטול", "Cancel")}</button></div>
      <div class="au-item-sub" id="cfg-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("cfg-save").onclick = async () => {
      $("cfg-save").disabled = true;
      try {
        await api("activate", { template: key, config: readFields(t.config), pack: packKey });
        closeModal(); toast(a ? L("נשמר", "Saved") : L("הופעל! מעכשיו זה עובד ברקע", "Turned on! It now works in the background")); await refresh(true);
      } catch (err) { $("cfg-err").textContent = err.message; $("cfg-save").disabled = false; }
    };
  }

  $("au-templates").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    try {
      if (b.dataset.config) openConfig(b.dataset.config);
      else if (b.dataset.pause) { await api("pause", { template: b.dataset.pause }); toast(L("הושהתה. שום דבר לא יישלח עד שתמשיכו.", "Paused. Nothing will be sent until you resume.")); await refresh(true); }
      else if (b.dataset.resume) { await api("resume", { template: b.dataset.resume }); toast(L("ממשיכה לעבוד", "Running again")); await refresh(true); }
      else if (b.dataset.remove) {
        openModal(`<h2>${L("להסיר את האוטומציה?", "Remove this automation?")}</h2><p>${L("תהליכים שעוד ממתינים יבוטלו, והודעות שעוד לא נשלחו לא יישלחו. אפשר תמיד להפעיל אותה מחדש.", "Processes still waiting will be cancelled, and messages not yet sent won't be sent. You can always turn it on again.")}</p>
          <div class="au-actions"><button class="au-btn danger" id="rm-ok">${L("הסרה", "Remove")}</button><button class="au-btn" data-close>${L("ביטול", "Cancel")}</button></div>`);
        $("rm-ok").onclick = async () => { await api("remove", { template: b.dataset.remove }); closeModal(); toast(L("הוסרה", "Removed")); await refresh(true); };
      }
    } catch (err) { toast(err.message); }
  });

  // ------------------------------------------------------------ wizard
  let wiz = { pack: null };
  function openWizard(step) {
    const p = S.overview.profile || {};
    if (step === 2) return wizardDetails(p, true);
    openModal(`<h2>${L("מה סוג העסק שלך?", "What type of business do you have?")}</h2><p class="au-item-sub">${L("לפי זה נכין ניסוחים ומשימות שמתאימים לך. אפשר לשנות כל דבר אחר כך.", "We'll use this to prepare wording and tasks that fit you. You can change anything later.")}</p>
      <div class="au-packs">${S.catalog.packs.map((k) => `<button class="au-pack ${p.business_type === k.key ? "selected" : ""}" data-pack="${k.key}"><span style="font-size:24px">${k.icon}</span><b>${esc(tx(k, "name"))}</b></button>`).join("")}</div>
      <div class="au-actions"><button class="au-btn primary" id="wz-next" disabled>${L("המשך", "Continue")}</button><button class="au-btn" data-close>${L("אחר כך", "Later")}</button></div>`);
    wiz.pack = p.business_type || null;
    if (wiz.pack) $("wz-next").disabled = false;
    $("au-dialog").querySelectorAll("[data-pack]").forEach((b) => b.onclick = () => {
      $("au-dialog").querySelectorAll(".au-pack").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected"); wiz.pack = b.dataset.pack; $("wz-next").disabled = false;
    });
    $("wz-next").onclick = () => wizardDetails(p, false);
  }
  function wizardDetails(p, onlyProfile) {
    openModal(`<h2>${L("פרטי העסק", "Business details")}</h2><p class="au-item-sub">${L("יופיעו בהודעות שנשלחות ללקוחות שלך בשמך.", "These appear in messages sent to your clients on your behalf.")}</p>
      <div class="au-field"><label for="wz-name">${L("שם העסק *", "Business name *")}</label><input class="au-input" id="wz-name" maxlength="120" value="${esc(p.business_name || "")}"></div>
      <div class="au-field"><label for="wz-reply">${L("לאיזה מייל יגיעו תשובות של לקוחות", "Where should client replies go")}</label><input class="au-input" id="wz-reply" type="email" dir="ltr" value="${esc(p.reply_email || S.user.email || "")}"></div>
      <div class="au-field"><label for="wz-notify">${L("לאן לשלוח לך התראות", "Where should we send you notifications")}</label><input class="au-input" id="wz-notify" type="email" dir="ltr" value="${esc(p.notify_email || S.user.email || "")}"></div>
      <div class="au-field"><label for="wz-phone">${L("טלפון העסק", "Business phone")}</label><input class="au-input" id="wz-phone" dir="ltr" value="${esc(p.phone || "")}"></div>
      <div class="au-field"><label for="wz-lang">${L("שפת המיילים שנשלחים בשמך", "Language of the emails sent for you")}</label><select class="au-input" id="wz-lang"><option value="he"${(p.lang || (EN ? "en" : "he")) === "he" ? " selected" : ""}>עברית</option><option value="en"${(p.lang || (EN ? "en" : "he")) === "en" ? " selected" : ""}>English</option></select></div>
      <div class="au-actions"><button class="au-btn primary" id="wz-save">${onlyProfile ? L("שמירה", "Save") : L("המשך", "Continue")}</button><button class="au-btn" data-close>${L("ביטול", "Cancel")}</button></div>
      <div class="au-item-sub" id="wz-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("wz-save").onclick = async () => {
      try {
        await api("save-profile", { business_name: $("wz-name").value, reply_email: $("wz-reply").value, notify_email: $("wz-notify").value,
          phone: $("wz-phone").value, lang: $("wz-lang").value, business_type: onlyProfile ? (p.business_type || null) : wiz.pack });
        if (onlyProfile) { closeModal(); toast(L("נשמר", "Saved")); await refresh(true); return; }
        await refresh(true); wizardPick();
      } catch (err) { $("wz-err").textContent = err.message; }
    };
  }
  function wizardPick() {
    const pack = S.catalog.packs.find((x) => x.key === wiz.pack);
    const list = pack.templates.map((k) => S.catalog.templates.find((t) => t.key === k)).filter(Boolean);
    openModal(`<h2>${pack.icon} ${L(`מצב טייס ל${esc(pack.name)}`, `Autopilot for ${esc(tx(pack, "name"))}`)}</h2><p class="au-item-sub">${L("אלה התהליכים שנפעיל. אפשר לבטל סימון, ולשנות כל אחד אחר כך.", "These are the processes we'll turn on. You can uncheck any of them, and change each one later.")}</p>
      <div class="au-list" style="margin:12px 0;">${list.map((t) => `<label class="au-card au-check" style="align-items:flex-start;">
        <input type="checkbox" data-wz="${t.key}" checked style="margin-top:4px;"><span><b>${t.icon} ${esc(tx(t, "name"))}</b><br><span class="au-item-sub">${esc(tx(t, "outcome"))}</span></span></label>`).join("")}</div>
      <p class="au-item-sub">${L('הודעות ללקוחות על כסף (הצעות וחשבוניות) יחכו לאישור שלך — אפשר לשנות להגדרה "אוטומטית".', 'Client messages about money (quotes and invoices) will wait for your approval — you can switch this to "Send automatically".')}</p>
      <div class="au-actions"><button class="au-btn primary" id="wz-go">${L("הפעלה", "Turn on")}</button><button class="au-btn" data-close>${L("ביטול", "Cancel")}</button></div>
      <div class="au-item-sub" id="wz-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("wz-go").onclick = async () => {
      $("wz-go").disabled = true;
      const keys = [...$("au-dialog").querySelectorAll("[data-wz]")].filter((x) => x.checked).map((x) => x.dataset.wz);
      const failed = [];
      for (const k of keys) {
        const t = S.catalog.templates.find((x) => x.key === k);
        try { await api("activate", { template: k, config: t ? englishTextDefaults(t, wiz.pack) : {}, pack: wiz.pack }); } catch (err) { failed.push(err.message); }
      }
      closeModal(); toast(failed.length ? L(`הופעלו ${keys.length - failed.length} — ${failed[0]}`, `${keys.length - failed.length} turned on — ${failed[0]}`) : L(`הופעלו ${keys.length} אוטומציות 🚀`, `${keys.length} automations turned on 🚀`));
      await refresh(true); location.hash = "today";
    };
  }
  $("au-open-wizard").onclick = () => openWizard(1);

  // ------------------------------------------------------------ contacts
  function renderContacts() {
    const rows = S.contacts.map((c) => `<tr>
      <td><b>${esc(c.name)}</b>${c.source === "site_form" ? ` <span class="au-pill info">${L("מהאתר", "From website")}</span>` : ""}${c.message ? `<div class="au-item-sub">${esc(c.message.slice(0, 120))}</div>` : ""}</td>
      <td dir="ltr" style="text-align:end;">${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a><br>` : ""}${c.email ? esc(c.email) : ""}</td>
      <td><select data-stage="${c.id}" class="au-input" style="padding:5px 8px;font-size:13.5px;">${Object.entries(STAGES).map(([k, v]) => `<option value="${k}" ${k === c.stage ? "selected" : ""}>${v}</option>`).join("")}</select></td>
      <td>${esc(money(c.amount))}</td><td class="au-item-sub">${esc(when(c.created_at))}</td>
      <td><div class="au-actions">${c.stage === "won" && !c.job_done_at ? `<button class="au-btn" data-jobdone="${c.id}">${L("העבודה הסתיימה", "Job done")}</button>` : ""}${c.job_done_at ? `<span class="au-pill on">${L("הסתיים", "Done")}</span>` : ""}
        <button class="au-btn danger" data-delcontact="${c.id}" title="${L("מחיקה", "Delete")}">✕</button></div></td></tr>`).join("");
    $("au-contacts").innerHTML = `<thead><tr><th>${L("שם", "Name")}</th><th>${L("פרטים", "Details")}</th><th>${L("שלב", "Stage")}</th><th>${L("סכום", "Amount")}</th><th>${L("נוסף", "Added")}</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="au-empty">${L("עוד אין לקוחות. פניות מטופס האתר יופיעו כאן לבד.", "No clients yet. Enquiries from your website form will show up here automatically.")}</td></tr>`}</tbody>`;
    $("au-demo-lead").hidden = !IS_STAGING;
    renderImport();
  }

  function renderImport() {
    const box = $("au-import");
    const local = typeof dkCrmLocalLeads === "function" ? dkCrmLocalLeads() : [];
    const flag = "deskkit_crm_imported_v1_" + S.user.id;
    let done = false; try { done = !!localStorage.getItem(flag); } catch (e) { /* ignore */ }
    if (!local.length || done) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="au-card" style="border-color:#F5C77E;background:#FFFBF2;margin-bottom:14px;">
      <div class="au-item-title">${L(`נמצאו ${local.length} לידים ששמורים רק בדפדפן הזה`, `Found ${local.length} leads saved only in this browser`)}</div>
      <p class="au-item-sub">${L("אפשר להעביר אותם לחשבון שלך — כך הם יגובו, יהיו זמינים מכל מכשיר, והאוטומציות יוכלו לעבוד איתם. לידים שמועברים לא מפעילים הודעות או תזכורות. העותק בדפדפן לא נמחק.", "You can move them to your account so they're backed up, available on any device, and the automations can work with them. Moved leads don't trigger messages or reminders. The copy in this browser isn't deleted.")}</p>
      <label class="au-check" style="margin:8px 0;"><input type="checkbox" id="imp-ok"> ${L(`אני מאשר/ת להעביר את ${local.length} הלידים מהדפדפן הזה לחשבון שלי ב-DeskKit`, `I agree to move the ${local.length} leads from this browser to my DeskKit account`)}</label>
      <div class="au-actions"><button class="au-btn primary" id="imp-go" disabled>${L("הורדת גיבוי והעברה", "Download a backup and move")}</button><button class="au-btn" id="imp-later">${L("לא עכשיו", "Not now")}</button></div>
      <div class="au-item-sub" id="imp-res" style="margin-top:6px;"></div></div>`;
    $("imp-ok").onchange = () => { $("imp-go").disabled = !$("imp-ok").checked; };
    $("imp-later").onclick = () => { box.innerHTML = ""; };
    $("imp-go").onclick = async () => {
      $("imp-go").disabled = true;
      try {
        dkCrmDownloadBackup("csv");   // a file copy first, always
        const r = await api("import-contacts", { leads: local });
        if (r.verified) {
          try { localStorage.setItem(flag, new Date().toISOString()); } catch (e) { /* ignore */ }
          $("imp-res").textContent = L(`הועברו ואומתו ${r.onServer} לידים ✓ העותק בדפדפן נשאר כגיבוי.`, `${r.onServer} leads moved and verified ✓ The copy in this browser stays as a backup.`);
          await refresh();
        } else {
          $("imp-res").textContent = L(`ההעברה לא אומתה במלואה (${r.onServer}/${r.withId}). שום דבר לא נמחק — אפשר לנסות שוב.`, `The move couldn't be fully verified (${r.onServer}/${r.withId}). Nothing was deleted — you can try again.`);
          $("imp-go").disabled = false;
        }
      } catch (err) { $("imp-res").textContent = err.message; $("imp-go").disabled = false; }
    };
  }

  $("au-contact-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const row = { name: $("c-name").value.trim(), phone: $("c-phone").value.trim() || null, email: $("c-email").value.trim() || null, amount: Number($("c-amount").value) || 0 };
    if (!row.name) return;
    const { error } = await supabaseClient.from("contacts").insert(row);
    if (error) { toast(L("לא נשמר: ", "Not saved: ") + error.message); return; }
    e.target.reset(); toast(L("נוסף", "Added")); await refresh();
  });
  $("au-contacts").addEventListener("change", async (e) => {
    const s = e.target.closest("[data-stage]"); if (!s) return;
    await supabaseClient.from("contacts").update({ stage: s.value }).eq("id", s.dataset.stage);
    toast(s.value === "won" ? L("מזל טוב! 🎉", "Congratulations! 🎉") : L("עודכן", "Updated")); await refresh();
  });
  $("au-contacts").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.jobdone) { await supabaseClient.from("contacts").update({ job_done_at: new Date().toISOString() }).eq("id", b.dataset.jobdone); toast(L("סומן — אם בקשת ביקורת פעילה, היא תצא בזמן שקבעת", "Marked — if the review request is on, it will go out at the time you set")); await refresh(); }
    if (b.dataset.delcontact) {
      openModal(`<h2>${L("למחוק את הלקוח?", "Delete this client?")}</h2><p>${L("המחיקה סופית, כולל המשימות שלו.", "Deleting is permanent, including the client's tasks.")}</p><div class="au-actions"><button class="au-btn danger" id="del-ok">${L("מחיקה", "Delete")}</button><button class="au-btn" data-close>${L("ביטול", "Cancel")}</button></div>`);
      $("del-ok").onclick = async () => { await supabaseClient.from("contacts").delete().eq("id", b.dataset.delcontact); closeModal(); await refresh(); };
    }
  });
  $("au-demo-lead").addEventListener("click", async () => {
    try {
      const { slug } = await api("demo-site");
      const n = Math.floor(Math.random() * 900 + 100);
      const res = await fetch(SUPABASE_URL + "/functions/v1/lead-intake", { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ site: slug, name: L(`לקוח לדוגמה ${n}`, `Sample client ${n}`), phone: "050-000-0" + n, email: `demo-${n}@example.com`, message: L("שלום, אשמח לקבל הצעת מחיר", "Hi, I'd like to get a quote"), consent: true }) });
      if (!res.ok) throw new Error(L("לא נשלח", "Not sent"));
      toast(L("נשלחה פנייה לדוגמה — תוך דקה תראו את האוטומציה פועלת", "A sample enquiry was sent — within a minute you'll see the automation working")); setTimeout(refresh, 1500);
    } catch (err) { toast(err.message); }
  });

  // ------------------------------------------------------------ quotes
  function renderQuotes() {
    $("au-shares").innerHTML = S.shares.length ? S.shares.map((s) => `<div class="au-card au-item">
      <div class="au-item-main"><div class="au-item-title">${esc(s.client_name)} ${pill(SHARE_STATUS, s.status)}</div>
        <div class="au-item-sub">${esc(s.title || "")}${s.total ? " · " + esc(money(s.total)) : ""} · ${L("נשלחה", "sent")} ${esc(when(s.sent_at))}${s.decided_at && s.status !== "cancelled" ? ` · ${s.status === "approved" ? L("אושרה", "approved") : L("נענתה", "answered")} ${esc(when(s.decided_at))}${s.decided_name ? L(" ע\"י ", " by ") + esc(s.decided_name) : ""}` : ""}</div></div>
      <div class="au-actions"><button class="au-btn" data-copy="${esc(s.token)}">${L("העתקת קישור", "Copy link")}</button>${s.status === "sent" ? `<button class="au-btn danger" data-cancelshare="${s.id}">${L("ביטול ההצעה", "Cancel quote")}</button>` : ""}</div></div>`).join("")
      : `<div class="au-card au-empty">${L("עוד לא שלחת הצעות דרך DeskKit.", "You haven't sent any quotes through DeskKit yet.")}</div>`;
    $("au-quotes").innerHTML = S.quotes.length ? S.quotes.map((x) => {
      const d = x.data || {};
      return `<div class="au-card au-item"><div class="au-item-main"><div class="au-item-title">${esc(d.eventName || L("הצעת מחיר", "Quote"))}</div>
        <div class="au-item-sub">${esc(d.recipient ? L("לכבוד ", "To ") + d.recipient : "")}${d.price ? " · ₪" + esc(d.price) : ""} · ${L("עודכנה", "updated")} ${esc(when(x.updated_at))}</div></div>
        <div class="au-actions"><button class="au-btn primary" data-sendquote="${x.id}">${L("שליחה ללקוח", "Send to client")}</button></div></div>`;
    }).join("") : `<div class="au-card au-empty">${L("אין הצעות שמורות.", "No saved quotes.")} <a href="quote-app.html">${L("ליצירת הצעת מחיר", "Create a quote")}</a></div>`;
  }
  $("panel-quotes").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.copy) {
      const link = `${location.origin}/q.html?t=${b.dataset.copy}`;
      try { await navigator.clipboard.writeText(link); toast(L("הקישור הועתק", "Link copied")); } catch (err) { prompt(L("הקישור להצעה:", "Quote link:"), link); }
    } else if (b.dataset.cancelshare) {
      await api("cancel-quote", { id: b.dataset.cancelshare }).catch((err) => toast(err.message)); toast(L("ההצעה בוטלה — התזכורות נעצרו", "Quote cancelled — reminders stopped")); await refresh();
    } else if (b.dataset.sendquote) {
      const qq = S.quotes.find((x) => x.id === b.dataset.sendquote); const d = (qq && qq.data) || {};
      const fuName = esc(tplName("quote_followup").replace(/^\S+\s/, ""));
      openModal(`<h2>${L("שליחת הצעת מחיר ללקוח", "Send a quote to a client")}</h2><p class="au-item-sub">${L("הלקוח יקבל מייל עם קישור לצפייה בהצעה ולאישור בלחיצה.", "The client gets an email with a link to view the quote and approve it in one click.")}</p>
        <div class="au-field"><label for="sq-name">${L("שם הלקוח *", "Client name *")}</label><input class="au-input" id="sq-name" value="${esc(d.recipient || "")}"></div>
        <div class="au-field"><label for="sq-email">${L("מייל הלקוח *", "Client email *")}</label><input class="au-input" id="sq-email" type="email" dir="ltr"></div>
        <div class="au-field"><label for="sq-title">${L("כותרת", "Title")}</label><input class="au-input" id="sq-title" value="${esc(d.eventName || "")}"></div>
        <div class="au-field"><label for="sq-days">${L("תוקף ההצעה (ימים)", "Quote valid for (days)")}</label><input class="au-input" id="sq-days" type="number" min="1" max="90" value="30" style="max-width:120px;"></div>
        ${S.autos.quote_followup ? `<p class="au-item-sub">${L('✓ "הצעות מחיר שלא נשכחות" פעילה — אם לא תהיה תשובה, נדאג לתזכורת.', `✓ "${fuName}" is on — if there's no answer, we'll send a reminder.`)}</p>` : `<p class="au-item-sub">${L('טיפ: הפעילו את "הצעות מחיר שלא נשכחות" כדי שתזכורת תצא לבד.', `Tip: turn on "${fuName}" so a reminder goes out on its own.`)}</p>`}
        <div class="au-actions"><button class="au-btn primary" id="sq-go">${L("שליחה", "Send")}</button><button class="au-btn" data-close>${L("ביטול", "Cancel")}</button></div>
        <div class="au-item-sub" id="sq-err" style="color:#B42318;margin-top:8px;"></div>`);
      $("sq-go").onclick = async () => {
        $("sq-go").disabled = true;
        try {
          const r = await api("send-quote", { quote_id: qq.id, client_name: $("sq-name").value, client_email: $("sq-email").value, title: $("sq-title").value, expires_days: Number($("sq-days").value) });
          closeModal(); toast(r.emailed ? L("נשלחה! 📨", "Sent! 📨") : L("נוצר קישור, אבל המייל לא יצא (מכסה)", "A link was created, but the email wasn't sent (quota)")); await refresh();
        } catch (err) { $("sq-err").textContent = err.message; $("sq-go").disabled = false; }
      };
    }
  });

  // ------------------------------------------------------------ invoices
  function renderInvoices() {
    const trackedIds = new Set(S.tracked.map((x) => x.invoice_id));
    const today = new Date().toISOString().slice(0, 10);
    $("au-tracked").innerHTML = S.tracked.length ? S.tracked.map((i) => {
      const late = i.status === "unpaid" && i.due_date < today;
      const st = i.status === "paid" ? `<span class="au-pill on">${L("שולם", "Paid")}</span>` : i.status === "cancelled" ? `<span class="au-pill off">${L("בוטל", "Cancelled")}</span>`
        : late ? `<span class="au-pill bad">${L("באיחור", "Overdue")}</span>` : `<span class="au-pill warn">${L("ממתין לתשלום", "Awaiting payment")}</span>`;
      return `<div class="au-card au-item"><div class="au-item-main"><div class="au-item-title">${L("חשבונית", "Invoice")} ${esc(i.invoice_number ?? "")} · ${esc(i.client_name || "")} ${st}</div>
        <div class="au-item-sub">${i.amount ? esc(money(i.amount)) + " · " : ""}${L("לתשלום עד", "Due")} ${esc(i.due_date.split("-").reverse().join("/"))}${i.client_email ? " · " + esc(i.client_email) : L(" · אין מייל — לא יישלחו תזכורות ללקוח", " · No email — no reminders will be sent to the client")}</div></div>
        <div class="au-actions">${i.status === "paid" ? `<button class="au-btn" data-unpaid="${i.invoice_id}">${L("בטל סימון", "Unmark")}</button>` : `<button class="au-btn primary" data-paid="${i.invoice_id}">${L('סמן "שולם"', 'Mark "Paid"')}</button>`}</div></div>`;
    }).join("") : `<div class="au-card au-empty">${L("אין חשבוניות במעקב.", "No tracked invoices.")}</div>`;
    const open = S.invoices.filter((i) => !trackedIds.has(i.id));
    $("au-invoices").innerHTML = open.length ? open.map((i) => `<div class="au-card au-item"><div class="au-item-main">
        <div class="au-item-title">${L("חשבונית", "Invoice")} ${esc(i.number ?? "")} · ${esc((i.data || {}).recipientName || "")}</div>
        <div class="au-item-sub">${L("הופקה", "Issued")} ${esc(when(i.issued_at))}</div></div>
        <div class="au-actions"><button class="au-btn primary" data-track="${i.id}">${L("מעקב תשלום", "Track payment")}</button></div></div>`).join("")
      : `<div class="au-card au-empty">${S.invoices.length ? L("כל החשבוניות כבר במעקב.", "All invoices are already tracked.") : L('אין חשבוניות שהופקו. <a href="invoice-app.html">להפקת חשבונית</a>', 'No issued invoices. <a href="invoice-app.html">Issue an invoice</a>')}</div>`;
  }
  $("au-invoices").addEventListener("click", (e) => {
    const b = e.target.closest("[data-track]"); if (!b) return;
    const inv = S.invoices.find((x) => x.id === b.dataset.track);
    const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const ciName = esc(tplName("invoice_collect").replace(/^\S+\s/, ""));
    openModal(`<h2>${L("מעקב תשלום — חשבונית", "Track payment — invoice")} ${esc(inv.number ?? "")}</h2>
      <div class="au-field"><label for="ti-name">${L("שם הלקוח", "Client name")}</label><input class="au-input" id="ti-name" value="${esc((inv.data || {}).recipientName || "")}"></div>
      <div class="au-field"><label for="ti-email">${L("מייל הלקוח (לתזכורות)", "Client email (for reminders)")}</label><input class="au-input" id="ti-email" type="email" dir="ltr"></div>
      <div class="au-field"><label for="ti-due">${L("לתשלום עד *", "Due date *")}</label><input class="au-input" id="ti-due" type="date" value="${due}" style="max-width:200px;"></div>
      <div class="au-field"><label for="ti-amount">${L("סכום (₪)", "Amount (₪)")}</label><input class="au-input" id="ti-amount" type="number" min="0" style="max-width:160px;"></div>
      ${S.autos.invoice_collect ? `<p class="au-item-sub">${L('✓ "גבייה בלי מבוכה" פעילה — אם יעבור המועד, תצא תזכורת לפי ההגדרות שלך.', `✓ "${ciName}" is on — if the due date passes, a reminder goes out according to your settings.`)}</p>` : `<p class="au-item-sub">${L('טיפ: הפעילו את "גבייה בלי מבוכה" כדי שתזכורות יצאו לבד.', `Tip: turn on "${ciName}" so reminders go out on their own.`)}</p>`}
      <div class="au-actions"><button class="au-btn primary" id="ti-go">${L("שמירה", "Save")}</button><button class="au-btn" data-close>${L("ביטול", "Cancel")}</button></div>
      <div class="au-item-sub" id="ti-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("ti-go").onclick = async () => {
      try {
        await api("track-invoice", { invoice_id: inv.id, client_name: $("ti-name").value, client_email: $("ti-email").value, due_date: $("ti-due").value, amount: $("ti-amount").value === "" ? null : Number($("ti-amount").value) });
        closeModal(); toast(L("במעקב", "Tracking")); await refresh();
      } catch (err) { $("ti-err").textContent = err.message; }
    };
  });

  // ------------------------------------------------------------ history
  async function renderHistory() {
    let h;
    try { h = await api("history", { limit: 50 }); } catch (e) { $("au-history").innerHTML = `<div class="au-card au-empty">${esc(e.message)}</div>`; return; }
    if (!h.runs.length) { $("au-history").innerHTML = `<div class="au-card au-empty">${L("עוד לא קרה כלום. כשאוטומציה תפעל — תראו כאן כל צעד.", "Nothing has happened yet. When an automation runs, you'll see every step here.")}</div>`; return; }
    const subjectName = (r) => {
      if (r.subject_type === "contact") { const c = S.contacts.find((x) => x.id === r.subject_id); return c ? c.name : L("לקוח", "Client"); }
      if (r.subject_type === "quote") { const s = S.shares.find((x) => x.id === r.subject_id); return s ? L("הצעה ל", "Quote for ") + s.client_name : L("הצעת מחיר", "Quote"); }
      if (r.subject_type === "invoice") { const i = S.tracked.find((x) => x.invoice_id === r.subject_id); return i ? L("חשבונית ", "Invoice ") + (i.invoice_number ?? "") : L("חשבונית", "Invoice"); }
      return r.template_key === "weekly_report" ? L("סיכום שבועי", "Weekly summary") : L("סיכום יומי", "Daily summary");
    };
    $("au-history").innerHTML = h.runs.map((r) => {
      const steps = h.steps.filter((s) => s.run_id === r.id && s.status !== "skipped" && !/ממשיכים|ההמתנה הסתיימה/.test(s.summary || ""));
      const msgs = h.messages.filter((m) => m.run_id === r.id);
      return `<div class="au-card"><div class="au-item"><div class="au-item-main"><div class="au-item-title">${esc(tplName(r.template_key))} · ${esc(subjectName(r))}</div>
        <div class="au-item-sub">${L("התחיל", "Started")} ${esc(when(r.created_at))}${r.status === "waiting" ? ` · ${L("הצעד הבא", "next step")} ${esc(new Date(r.next_run_at).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short" }))}` : ""}</div></div>${pill(RUN_STATUS, r.status)}</div>
        <ul class="au-timeline">${steps.map((s) => `<li>${s.status === "ok" ? "✓" : s.status === "waiting" ? "⏳" : s.status === "failed" ? "✕" : s.status === "blocked" ? "⏸" : "↻"} ${esc(enText(s.summary) || s.step_key)}<span class="t">${esc(when(s.created_at))}</span></li>`).join("")}</ul>
        ${msgs.length ? `<div style="margin-top:6px;">${msgs.map((m) => `<div class="au-item-sub">✉️ ${esc(m.subject)} → ${esc(m.to_email)} ${pill(MSG_STATUS, m.status)}</div>`).join("")}</div>` : ""}</div>`;
    }).join("");
  }

  // ------------------------------------------------------------ tabs + refresh
  const TABS = ["today", "automations", "contacts", "quotes", "invoices", "history"];
  function currentTab() { const h = location.hash.replace("#", ""); return TABS.includes(h) ? h : "today"; }
  function showTab() {
    const t = currentTab();
    document.querySelectorAll(".au-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
    TABS.forEach((k) => { $("panel-" + k).hidden = k !== t; });
    if (t === "history") renderHistory();
    if (t === "today") renderToday();
  }
  document.querySelectorAll(".au-tab").forEach((b) => b.addEventListener("click", () => { location.hash = b.dataset.tab; }));
  window.addEventListener("hashchange", showTab);

  async function refresh(withOverview) {
    try {
      if (withOverview) await loadOverview();
      await loadData();
      renderHeader(); renderTemplates(); renderContacts(); renderQuotes(); renderInvoices();
      const t = currentTab();
      if (t === "today") await renderToday();
      if (t === "history") await renderHistory();
    } catch (err) { toast(err.message || L("שגיאת טעינה", "Loading error")); }
  }

  // The header's EN/עברית button: this page builds its screen in JS, so a
  // switch reloads it (same as <html data-i18n-reload> pages with header.js).
  const langBtn = $("lang-toggle");
  if (langBtn) langBtn.addEventListener("click", () => {
    try { localStorage.setItem("deskkit_lang", EN ? "he" : "en"); } catch (err) { /* storage unavailable */ }
    location.reload();
  });
  if (EN) { const burger = document.querySelector("header.site .burger"); if (burger) burger.setAttribute("aria-label", "Menu"); }

  async function start() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) { location.href = "account.html?redirect=" + encodeURIComponent(location.pathname.split("/").pop() || "automate.html"); return; }
    S.session = data.session; S.user = data.session.user;
    try { await loadOverview(); } catch (err) {
      $("au-gate").innerHTML = err.message === "PILOT"
        ? L(`<h1 style="font-family:Rubik,Heebo,sans-serif;">DeskKit Automate — בקרוב ✨</h1><p>אוטומציות שעובדות בשבילך ברקע: פניות שלא נופלות, הצעות מחיר שלא נשכחות, גבייה בלי מבוכה.</p><p>אנחנו פותחים את זה בהדרגה. נעדכן אותך במייל כשיגיע תורך.</p>`,
            `<h1 style="font-family:Rubik,Heebo,sans-serif;">DeskKit Automate — coming soon ✨</h1><p>Automations that work for you in the background: leads that don't slip away, quotes that don't get forgotten, getting paid without the awkwardness.</p><p>We're opening it gradually. We'll email you when it's your turn.</p>`)
        : `<p>${esc(err.message)}</p>`;
      return;
    }
    $("au-gate").hidden = true; $("au-main").hidden = false;
    await refresh(false);
    showTab();
    if (!S.overview.profile) openWizard(1);
    setInterval(() => { if (!document.hidden && $("au-modal").hidden) refresh(); }, 30000);
  }
  document.addEventListener("DOMContentLoaded", start);
})();
