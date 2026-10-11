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
  const STATUS = {
    active: ["פעילה", "on"], paused: ["מושהית", "off"], needs_attention: ["דורשת טיפול", "bad"], blocked_quota: ["ממתינה למכסה", "warn"],
  };
  const STAGES = { new: "פנייה חדשה", inprogress: "בטיפול", followup: "פולו-אפ", won: "נסגר בהצלחה", lost: "לא רלוונטי" };
  const MSG_STATUS = {
    simulated: ["נשלח (סביבת ניסוי)", "info"], sent: ["נשלח", "on"], queued: ["ממתין לשליחה", "off"], sending: ["נשלח עכשיו", "off"],
    deferred: ["ממתין (שעות שקטות/מכסה)", "warn"], pending_approval: ["מחכה לאישורך", "warn"], failed: ["לא נשלח", "bad"], cancelled: ["בוטל", "off"],
  };
  const RUN_STATUS = {
    queued: ["בתור", "off"], running: ["פועל", "info"], waiting: ["ממתין", "info"], retrying: ["ניסיון חוזר", "warn"],
    succeeded: ["הושלם", "on"], stopped: ["נעצר — לא נדרש עוד", "off"], failed: ["נכשל", "bad"], cancelled: ["בוטל", "off"],
  };
  const SHARE_STATUS = { sent: ["ממתינה לתשובה", "warn"], approved: ["אושרה", "on"], declined: ["נדחתה", "bad"], cancelled: ["בוטלה", "off"], expired: ["פג תוקף", "off"] };
  const IS_STAGING = /workers\.dev$/.test(location.hostname);

  // ------------------------------------------------------------ helpers
  const $ = (id) => document.getElementById(id);
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function money(n) { const v = Number(n); return Number.isFinite(v) && v ? "₪" + v.toLocaleString("he-IL", { maximumFractionDigits: 0 }) : ""; }
  function when(iso) {
    if (!iso) return "";
    const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000;
    if (diff >= 0 && diff < 60) return "עכשיו";
    if (diff >= 0 && diff < 3600) return `לפני ${Math.round(diff / 60)} דק׳`;
    if (diff >= 0 && diff < 86400) return `לפני ${Math.round(diff / 3600)} שע׳`;
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" });
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
    "limit-active": "הגעת למספר האוטומציות הפעילות בתוכנית. אפשר להשהות אחת אחרת.",
    business_name: "צריך שם עסק.", reply_email: "כתובת המייל לתשובות לא תקינה.", client_email: "מייל הלקוח לא תקין.",
    client_name: "צריך שם לקוח.", due_date: "צריך תאריך לתשלום.", "not-issued": "אפשר לעקוב רק אחרי חשבונית שהופקה.",
  };
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
      const missing = code.startsWith("missing:") ? "חסרה הגדרה: " + code.slice(8) : null;
      throw new Error(missing || ERRORS[code] || "משהו השתבש. נסו שוב.");
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
  function tplName(key) { const t = (S.catalog.templates || []).find((x) => x.key === key); return t ? `${t.icon} ${t.name}` : key; }

  // ------------------------------------------------------------ header
  function renderHeader() {
    const p = S.overview.profile; const u = S.overview.usage || {}; const l = u.limits || {};
    $("au-biz-line").textContent = p ? `${p.business_name} · תהליכים שעובדים בשבילך ברקע` : "תהליכים שעובדים בשבילך ברקע";
    $("au-usage").innerHTML = `החודש: <b>${u.runs || 0}</b>/${l.runs_per_month || "—"} הפעלות · <b>${u.emails || 0}</b>/${l.emails_per_month || "—"} מיילים<br>
      <button class="au-btn" id="au-edit-profile" style="margin-top:6px;">פרטי העסק</button>`;
    $("au-edit-profile").onclick = () => openWizard(2);
    $("au-alerts").innerHTML = (S.overview.alerts || []).map((a) => `<div class="au-alert ${esc(a.level)}"><span>${esc(a.message)}</span>
      <button class="au-btn" data-resolve="${a.id}">הבנתי</button></div>`).join("");
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
    $("au-approvals").innerHTML = approvals.length ? `<h2 class="au-section-title" style="margin-top:0;">הודעות שמחכות לאישורך</h2>
      <div class="au-list">${approvals.map((m) => `<div class="au-card au-item">
        <div class="au-item-main"><div class="au-item-title">${esc(m.subject)}</div>
          <div class="au-item-sub">אל ${esc(m.to_name || "")} &lt;${esc(m.to_email)}&gt; · הוכנה ${esc(when(m.created_at))}</div></div>
        <div class="au-actions"><button class="au-btn" data-preview="${m.id}">תצוגה</button>
          <button class="au-btn primary" data-approve="${m.id}">שליחה</button><button class="au-btn" data-cancel-msg="${m.id}">ביטול</button></div>
      </div>`).join("")}</div>` : "";
    S._approvals = approvals;

    const items = (att.items || []).filter((i) => i.kind !== "message_approval");
    const count = items.length + approvals.length;
    $("au-today-count").textContent = count; $("au-today-count").hidden = !count;
    $("au-attention").innerHTML = items.length ? items.map(attentionCard).join("")
      : `<div class="au-card au-empty">🎉 הכל מטופל. אין כרגע לידים, הצעות או חשבוניות שנופלים בין הכיסאות.</div>`;

    $("au-tasks").innerHTML = S.tasks.length ? S.tasks.map((t) => {
      const c = S.contacts.find((x) => x.id === t.contact_id);
      const late = t.due_at && Date.parse(t.due_at) < Date.now();
      return `<div class="au-card au-item"><div class="au-item-main">
        <div class="au-item-title">${esc(t.title)}</div>
        <div class="au-item-sub">${c ? esc(c.name) + " · " : ""}${t.due_at ? (late ? '<span style="color:#B42318">באיחור · </span>' : "") + "עד " + esc(new Date(t.due_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })) : ""}${t.origin === "automation" ? " · נוצרה אוטומטית" : ""}</div></div>
        <div class="au-actions"><button class="au-btn primary" data-task-done="${t.id}">✓ בוצע</button><button class="au-btn" data-task-dismiss="${t.id}">לא רלוונטי</button></div></div>`;
    }).join("") : `<div class="au-card au-empty">אין משימות פתוחות.</div>`;
  }

  function attentionCard(i) {
    const c = S.contacts.find((x) => x.id === i.ref_id);
    let actions = "";
    if (i.kind === "lead_unhandled" || i.kind === "followup_stuck") {
      const wa = c && waLink(c.phone, `היי ${String(c.name).split(" ")[0]}, `);
      actions = `${wa ? `<a class="au-btn" target="_blank" rel="noopener" href="${esc(wa)}">וואטסאפ</a>` : ""}
        ${c && c.phone ? `<a class="au-btn" href="tel:${esc(c.phone)}">חיוג</a>` : ""}
        <button class="au-btn primary" data-handled="${i.ref_id}">סימנתי שטיפלתי</button>`;
    } else if (i.kind === "quote_waiting") {
      actions = `<button class="au-btn" data-goto="quotes">להצעה</button>`;
    } else if (i.kind === "invoice_overdue") {
      actions = `<button class="au-btn primary" data-paid="${i.ref_id}">סמן "שולם"</button>`;
    } else if (i.kind === "task_overdue") {
      actions = `<button class="au-btn primary" data-task-done="${i.ref_id}">✓ בוצע</button>`;
    }
    return `<div class="au-card au-item"><div class="au-item-main">
      <div class="au-item-title">${esc(i.title)} ${i.amount ? `<span class="au-pill info">${esc(money(i.amount))}</span>` : ""}</div>
      <div class="au-item-sub">${esc(i.reason)}</div></div><div class="au-actions">${actions}</div></div>`;
  }

  document.addEventListener("click", async (e) => {
    const t = e.target.closest("button, a"); if (!t || !t.dataset) return;
    const d = t.dataset;
    try {
      if (d.preview) {
        const m = (S._approvals || []).find((x) => x.id === d.preview);
        if (m) openModal(`<h2>${esc(m.subject)}</h2><p class="au-item-sub">אל ${esc(m.to_email)}</p>
          <iframe sandbox="" style="width:100%;height:440px;border:1px solid #E3EAE7;border-radius:10px;" srcdoc="${esc(m.html)}"></iframe>
          <div class="au-actions" style="margin-top:12px;"><button class="au-btn primary" data-approve="${m.id}">שליחה</button><button class="au-btn" data-close>סגירה</button></div>`);
      } else if (d.approve) {
        t.disabled = true; await api("approve-message", { id: d.approve }); closeModal(); toast("נשלח לתור — יוצא תוך דקה (בשעות המותרות)"); await refresh();
      } else if (d.cancelMsg) {
        await api("cancel-message", { id: d.cancelMsg }); toast("ההודעה בוטלה"); await refresh();
      } else if (d.handled) {
        await supabaseClient.from("contacts").update({ stage: "inprogress" }).eq("id", d.handled); toast("סומן כמטופל — התזכורות נעצרו"); await refresh();
      } else if (d.paid) {
        await api("invoice-status", { invoice_id: d.paid, status: "paid" }); toast("סומן כשולם — התזכורות נעצרו"); await refresh();
      } else if (d.unpaid) {
        await api("invoice-status", { invoice_id: d.unpaid, status: "unpaid" }); await refresh();
      } else if (d.taskDone || d.taskDismiss) {
        await supabaseClient.from("tasks").update({ status: d.taskDone ? "done" : "dismissed", done_at: new Date().toISOString() }).eq("id", d.taskDone || d.taskDismiss);
        await refresh();
      } else if (d.goto) {
        location.hash = d.goto;
      }
    } catch (err) { toast(err.message || "משהו השתבש"); t.disabled = false; }
  });

  // ------------------------------------------------------------ automations
  function renderTemplates() {
    const anyActive = Object.keys(S.autos).length > 0;
    $("au-pack-banner").hidden = false;
    $("au-open-wizard").textContent = anyActive ? "לשנות סוג עסק / להפעיל חבילה" : "להפעלה בלחיצה";
    $("au-templates").innerHTML = S.catalog.templates.map((t) => {
      const a = S.autos[t.key];
      const st = a ? pill(STATUS, a.status) : `<span class="au-pill off">לא פעילה</span>`;
      const btns = a
        ? `<button class="au-btn" data-config="${t.key}">הגדרות</button>
           ${a.status === "paused" ? `<button class="au-btn primary" data-resume="${t.key}">להמשיך</button>` : `<button class="au-btn" data-pause="${t.key}">השהיה</button>`}
           <button class="au-btn danger" data-remove="${t.key}">הסרה</button>`
        : `<button class="au-btn primary" data-config="${t.key}">הפעלה</button>`;
      return `<div class="au-card au-tpl"><div class="au-item"><span class="au-tpl-icon">${t.icon}</span>${st}</div>
        <h3>${esc(t.name)}</h3><p>${esc(t.outcome)}</p>
        <details><summary style="cursor:pointer;font-size:13.5px;color:#0F766E;font-weight:600;">איך זה עובד</summary>
          <ol class="au-how">${t.howItWorks.map((h) => `<li>${esc(h)}</li>`).join("")}</ol>
          ${t.needs.length ? `<p style="font-size:13px;">צריך: ${t.needs.map(esc).join(" · ")}</p>` : ""}</details>
        <div class="au-actions" style="margin-top:10px;">${btns}</div></div>`;
    }).join("");
  }

  function fieldHtml(f, value) {
    const id = "cfg-" + f.key;
    const help = f.help ? `<div class="au-help">${esc(f.help)}</div>` : "";
    const ph = f.placeholders ? `<div class="au-help">אפשר להשתמש ב: ${f.placeholders.map(esc).join(" ")}</div>` : "";
    if (f.type === "bool") return `<div class="au-field"><label class="au-check"><input type="checkbox" id="${id}" ${value ? "checked" : ""}> ${esc(f.label)}</label>${help}</div>`;
    if (f.type === "int") return `<div class="au-field"><label for="${id}">${esc(f.label)}${f.unit ? ` (${esc(f.unit)})` : ""}</label>
      <input class="au-input" type="number" id="${id}" min="${f.min}" max="${f.max}" value="${esc(value)}" style="max-width:140px;">${help}</div>`;
    if (f.type === "choice") return `<div class="au-field"><label for="${id}">${esc(f.label)}</label><select id="${id}">${f.options.map((o) =>
      `<option value="${esc(o.value)}" ${o.value === value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>${help}</div>`;
    if (f.type === "url") return `<div class="au-field"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>
      <input class="au-input" type="url" dir="ltr" id="${id}" value="${esc(value)}" placeholder="https://">${help}</div>`;
    return `<div class="au-field"><label for="${id}">${esc(f.label)}</label>${f.multiline
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

  function openConfig(key) {
    const t = S.catalog.templates.find((x) => x.key === key);
    const a = S.autos[key];
    const cfg = (a && a.config) || {};
    const val = (f) => (cfg[f.key] !== undefined ? cfg[f.key] : f.default);
    openModal(`<h2>${t.icon} ${esc(t.name)}</h2><p class="au-item-sub">${esc(t.outcome)}</p>
      <div class="au-card" style="background:#F6F8F7;margin:12px 0;"><b>מה יקרה:</b><ol class="au-how au-steps-preview">${t.howItWorks.map((h) => `<li>${esc(h)}</li>`).join("")}</ol></div>
      ${t.config.map((f) => fieldHtml(f, val(f))).join("") || '<p class="au-item-sub">אין מה להגדיר — רק להפעיל.</p>'}
      <div class="au-actions" style="margin-top:16px;"><button class="au-btn primary" id="cfg-save">${a ? "שמירה" : "הפעלה"}</button><button class="au-btn" data-close>ביטול</button></div>
      <div class="au-item-sub" id="cfg-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("cfg-save").onclick = async () => {
      $("cfg-save").disabled = true;
      try {
        await api("activate", { template: key, config: readFields(t.config), pack: (a && a.pack) || (S.overview.profile && S.overview.profile.business_type) || null });
        closeModal(); toast(a ? "נשמר" : "הופעל! מעכשיו זה עובד ברקע"); await refresh(true);
      } catch (err) { $("cfg-err").textContent = err.message; $("cfg-save").disabled = false; }
    };
  }

  $("au-templates").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    try {
      if (b.dataset.config) openConfig(b.dataset.config);
      else if (b.dataset.pause) { await api("pause", { template: b.dataset.pause }); toast("הושהתה. שום דבר לא יישלח עד שתמשיכו."); await refresh(true); }
      else if (b.dataset.resume) { await api("resume", { template: b.dataset.resume }); toast("ממשיכה לעבוד"); await refresh(true); }
      else if (b.dataset.remove) {
        openModal(`<h2>להסיר את האוטומציה?</h2><p>תהליכים שעוד ממתינים יבוטלו, והודעות שעוד לא נשלחו לא יישלחו. אפשר תמיד להפעיל אותה מחדש.</p>
          <div class="au-actions"><button class="au-btn danger" id="rm-ok">הסרה</button><button class="au-btn" data-close>ביטול</button></div>`);
        $("rm-ok").onclick = async () => { await api("remove", { template: b.dataset.remove }); closeModal(); toast("הוסרה"); await refresh(true); };
      }
    } catch (err) { toast(err.message); }
  });

  // ------------------------------------------------------------ wizard
  let wiz = { pack: null };
  function openWizard(step) {
    const p = S.overview.profile || {};
    if (step === 2) return wizardDetails(p, true);
    openModal(`<h2>מה סוג העסק שלך?</h2><p class="au-item-sub">לפי זה נכין ניסוחים ומשימות שמתאימים לך. אפשר לשנות כל דבר אחר כך.</p>
      <div class="au-packs">${S.catalog.packs.map((k) => `<button class="au-pack ${p.business_type === k.key ? "selected" : ""}" data-pack="${k.key}"><span style="font-size:24px">${k.icon}</span><b>${esc(k.name)}</b></button>`).join("")}</div>
      <div class="au-actions"><button class="au-btn primary" id="wz-next" disabled>המשך</button><button class="au-btn" data-close>אחר כך</button></div>`);
    wiz.pack = p.business_type || null;
    if (wiz.pack) $("wz-next").disabled = false;
    $("au-dialog").querySelectorAll("[data-pack]").forEach((b) => b.onclick = () => {
      $("au-dialog").querySelectorAll(".au-pack").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected"); wiz.pack = b.dataset.pack; $("wz-next").disabled = false;
    });
    $("wz-next").onclick = () => wizardDetails(p, false);
  }
  function wizardDetails(p, onlyProfile) {
    openModal(`<h2>פרטי העסק</h2><p class="au-item-sub">יופיעו בהודעות שנשלחות ללקוחות שלך בשמך.</p>
      <div class="au-field"><label for="wz-name">שם העסק *</label><input class="au-input" id="wz-name" maxlength="120" value="${esc(p.business_name || "")}"></div>
      <div class="au-field"><label for="wz-reply">לאיזה מייל יגיעו תשובות של לקוחות</label><input class="au-input" id="wz-reply" type="email" dir="ltr" value="${esc(p.reply_email || S.user.email || "")}"></div>
      <div class="au-field"><label for="wz-notify">לאן לשלוח לך התראות</label><input class="au-input" id="wz-notify" type="email" dir="ltr" value="${esc(p.notify_email || S.user.email || "")}"></div>
      <div class="au-field"><label for="wz-phone">טלפון העסק</label><input class="au-input" id="wz-phone" dir="ltr" value="${esc(p.phone || "")}"></div>
      <div class="au-actions"><button class="au-btn primary" id="wz-save">${onlyProfile ? "שמירה" : "המשך"}</button><button class="au-btn" data-close>ביטול</button></div>
      <div class="au-item-sub" id="wz-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("wz-save").onclick = async () => {
      try {
        await api("save-profile", { business_name: $("wz-name").value, reply_email: $("wz-reply").value, notify_email: $("wz-notify").value,
          phone: $("wz-phone").value, business_type: onlyProfile ? (p.business_type || null) : wiz.pack });
        if (onlyProfile) { closeModal(); toast("נשמר"); await refresh(true); return; }
        await refresh(true); wizardPick();
      } catch (err) { $("wz-err").textContent = err.message; }
    };
  }
  function wizardPick() {
    const pack = S.catalog.packs.find((x) => x.key === wiz.pack);
    const list = pack.templates.map((k) => S.catalog.templates.find((t) => t.key === k)).filter(Boolean);
    openModal(`<h2>${pack.icon} מצב טייס ל${esc(pack.name)}</h2><p class="au-item-sub">אלה התהליכים שנפעיל. אפשר לבטל סימון, ולשנות כל אחד אחר כך.</p>
      <div class="au-list" style="margin:12px 0;">${list.map((t) => `<label class="au-card au-check" style="align-items:flex-start;">
        <input type="checkbox" data-wz="${t.key}" checked style="margin-top:4px;"><span><b>${t.icon} ${esc(t.name)}</b><br><span class="au-item-sub">${esc(t.outcome)}</span></span></label>`).join("")}</div>
      <p class="au-item-sub">הודעות ללקוחות על כסף (הצעות וחשבוניות) יחכו לאישור שלך — אפשר לשנות להגדרה "אוטומטית".</p>
      <div class="au-actions"><button class="au-btn primary" id="wz-go">הפעלה</button><button class="au-btn" data-close>ביטול</button></div>
      <div class="au-item-sub" id="wz-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("wz-go").onclick = async () => {
      $("wz-go").disabled = true;
      const keys = [...$("au-dialog").querySelectorAll("[data-wz]")].filter((x) => x.checked).map((x) => x.dataset.wz);
      const failed = [];
      for (const k of keys) { try { await api("activate", { template: k, config: {}, pack: wiz.pack }); } catch (err) { failed.push(err.message); } }
      closeModal(); toast(failed.length ? `הופעלו ${keys.length - failed.length} — ${failed[0]}` : `הופעלו ${keys.length} אוטומציות 🚀`);
      await refresh(true); location.hash = "today";
    };
  }
  $("au-open-wizard").onclick = () => openWizard(1);

  // ------------------------------------------------------------ contacts
  function renderContacts() {
    const rows = S.contacts.map((c) => `<tr>
      <td><b>${esc(c.name)}</b>${c.source === "site_form" ? ' <span class="au-pill info">מהאתר</span>' : ""}${c.message ? `<div class="au-item-sub">${esc(c.message.slice(0, 120))}</div>` : ""}</td>
      <td dir="ltr" style="text-align:end;">${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a><br>` : ""}${c.email ? esc(c.email) : ""}</td>
      <td><select data-stage="${c.id}" class="au-input" style="padding:5px 8px;font-size:13.5px;">${Object.entries(STAGES).map(([k, v]) => `<option value="${k}" ${k === c.stage ? "selected" : ""}>${v}</option>`).join("")}</select></td>
      <td>${esc(money(c.amount))}</td><td class="au-item-sub">${esc(when(c.created_at))}</td>
      <td><div class="au-actions">${c.stage === "won" && !c.job_done_at ? `<button class="au-btn" data-jobdone="${c.id}">העבודה הסתיימה</button>` : ""}${c.job_done_at ? '<span class="au-pill on">הסתיים</span>' : ""}
        <button class="au-btn danger" data-delcontact="${c.id}" title="מחיקה">✕</button></div></td></tr>`).join("");
    $("au-contacts").innerHTML = `<thead><tr><th>שם</th><th>פרטים</th><th>שלב</th><th>סכום</th><th>נוסף</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="au-empty">עוד אין לקוחות. פניות מטופס האתר יופיעו כאן לבד.</td></tr>`}</tbody>`;
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
      <div class="au-item-title">נמצאו ${local.length} לידים ששמורים רק בדפדפן הזה</div>
      <p class="au-item-sub">אפשר להעביר אותם לחשבון שלך — כך הם יגובו, יהיו זמינים מכל מכשיר, והאוטומציות יוכלו לעבוד איתם. לידים שמועברים לא מפעילים הודעות או תזכורות. העותק בדפדפן לא נמחק.</p>
      <label class="au-check" style="margin:8px 0;"><input type="checkbox" id="imp-ok"> אני מאשר/ת להעביר את ${local.length} הלידים מהדפדפן הזה לחשבון שלי ב-DeskKit</label>
      <div class="au-actions"><button class="au-btn primary" id="imp-go" disabled>הורדת גיבוי והעברה</button><button class="au-btn" id="imp-later">לא עכשיו</button></div>
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
          $("imp-res").textContent = `הועברו ואומתו ${r.onServer} לידים ✓ העותק בדפדפן נשאר כגיבוי.`;
          await refresh();
        } else {
          $("imp-res").textContent = `ההעברה לא אומתה במלואה (${r.onServer}/${r.withId}). שום דבר לא נמחק — אפשר לנסות שוב.`;
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
    if (error) { toast("לא נשמר: " + error.message); return; }
    e.target.reset(); toast("נוסף"); await refresh();
  });
  $("au-contacts").addEventListener("change", async (e) => {
    const s = e.target.closest("[data-stage]"); if (!s) return;
    await supabaseClient.from("contacts").update({ stage: s.value }).eq("id", s.dataset.stage);
    toast(s.value === "won" ? "מזל טוב! 🎉" : "עודכן"); await refresh();
  });
  $("au-contacts").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.jobdone) { await supabaseClient.from("contacts").update({ job_done_at: new Date().toISOString() }).eq("id", b.dataset.jobdone); toast("סומן — אם בקשת ביקורת פעילה, היא תצא בזמן שקבעת"); await refresh(); }
    if (b.dataset.delcontact) {
      openModal(`<h2>למחוק את הלקוח?</h2><p>המחיקה סופית, כולל המשימות שלו.</p><div class="au-actions"><button class="au-btn danger" id="del-ok">מחיקה</button><button class="au-btn" data-close>ביטול</button></div>`);
      $("del-ok").onclick = async () => { await supabaseClient.from("contacts").delete().eq("id", b.dataset.delcontact); closeModal(); await refresh(); };
    }
  });
  $("au-demo-lead").addEventListener("click", async () => {
    try {
      const { slug } = await api("demo-site");
      const n = Math.floor(Math.random() * 900 + 100);
      const res = await fetch(SUPABASE_URL + "/functions/v1/lead-intake", { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ site: slug, name: `לקוח לדוגמה ${n}`, phone: "050-000-0" + n, email: `demo-${n}@example.com`, message: "שלום, אשמח לקבל הצעת מחיר", consent: true }) });
      if (!res.ok) throw new Error("לא נשלח");
      toast("נשלחה פנייה לדוגמה — תוך דקה תראו את האוטומציה פועלת"); setTimeout(refresh, 1500);
    } catch (err) { toast(err.message); }
  });

  // ------------------------------------------------------------ quotes
  function renderQuotes() {
    $("au-shares").innerHTML = S.shares.length ? S.shares.map((s) => `<div class="au-card au-item">
      <div class="au-item-main"><div class="au-item-title">${esc(s.client_name)} ${pill(SHARE_STATUS, s.status)}</div>
        <div class="au-item-sub">${esc(s.title || "")}${s.total ? " · " + esc(money(s.total)) : ""} · נשלחה ${esc(when(s.sent_at))}${s.decided_at && s.status !== "cancelled" ? ` · ${s.status === "approved" ? "אושרה" : "נענתה"} ${esc(when(s.decided_at))}${s.decided_name ? " ע\"י " + esc(s.decided_name) : ""}` : ""}</div></div>
      <div class="au-actions"><button class="au-btn" data-copy="${esc(s.token)}">העתקת קישור</button>${s.status === "sent" ? `<button class="au-btn danger" data-cancelshare="${s.id}">ביטול ההצעה</button>` : ""}</div></div>`).join("")
      : `<div class="au-card au-empty">עוד לא שלחת הצעות דרך DeskKit.</div>`;
    $("au-quotes").innerHTML = S.quotes.length ? S.quotes.map((x) => {
      const d = x.data || {};
      return `<div class="au-card au-item"><div class="au-item-main"><div class="au-item-title">${esc(d.eventName || "הצעת מחיר")}</div>
        <div class="au-item-sub">${esc(d.recipient ? "לכבוד " + d.recipient : "")}${d.price ? " · ₪" + esc(d.price) : ""} · עודכנה ${esc(when(x.updated_at))}</div></div>
        <div class="au-actions"><button class="au-btn primary" data-sendquote="${x.id}">שליחה ללקוח</button></div></div>`;
    }).join("") : `<div class="au-card au-empty">אין הצעות שמורות. <a href="quote-app.html">ליצירת הצעת מחיר</a></div>`;
  }
  $("panel-quotes").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.copy) {
      const link = `${location.origin}/q.html?t=${b.dataset.copy}`;
      try { await navigator.clipboard.writeText(link); toast("הקישור הועתק"); } catch (err) { prompt("הקישור להצעה:", link); }
    } else if (b.dataset.cancelshare) {
      await api("cancel-quote", { id: b.dataset.cancelshare }).catch((err) => toast(err.message)); toast("ההצעה בוטלה — התזכורות נעצרו"); await refresh();
    } else if (b.dataset.sendquote) {
      const qq = S.quotes.find((x) => x.id === b.dataset.sendquote); const d = (qq && qq.data) || {};
      openModal(`<h2>שליחת הצעת מחיר ללקוח</h2><p class="au-item-sub">הלקוח יקבל מייל עם קישור לצפייה בהצעה ולאישור בלחיצה.</p>
        <div class="au-field"><label for="sq-name">שם הלקוח *</label><input class="au-input" id="sq-name" value="${esc(d.recipient || "")}"></div>
        <div class="au-field"><label for="sq-email">מייל הלקוח *</label><input class="au-input" id="sq-email" type="email" dir="ltr"></div>
        <div class="au-field"><label for="sq-title">כותרת</label><input class="au-input" id="sq-title" value="${esc(d.eventName || "")}"></div>
        <div class="au-field"><label for="sq-days">תוקף ההצעה (ימים)</label><input class="au-input" id="sq-days" type="number" min="1" max="90" value="30" style="max-width:120px;"></div>
        ${S.autos.quote_followup ? '<p class="au-item-sub">✓ "הצעות מחיר שלא נשכחות" פעילה — אם לא תהיה תשובה, נדאג לתזכורת.</p>' : '<p class="au-item-sub">טיפ: הפעילו את "הצעות מחיר שלא נשכחות" כדי שתזכורת תצא לבד.</p>'}
        <div class="au-actions"><button class="au-btn primary" id="sq-go">שליחה</button><button class="au-btn" data-close>ביטול</button></div>
        <div class="au-item-sub" id="sq-err" style="color:#B42318;margin-top:8px;"></div>`);
      $("sq-go").onclick = async () => {
        $("sq-go").disabled = true;
        try {
          const r = await api("send-quote", { quote_id: qq.id, client_name: $("sq-name").value, client_email: $("sq-email").value, title: $("sq-title").value, expires_days: Number($("sq-days").value) });
          closeModal(); toast(r.emailed ? "נשלחה! 📨" : "נוצר קישור, אבל המייל לא יצא (מכסה)"); await refresh();
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
      const st = i.status === "paid" ? '<span class="au-pill on">שולם</span>' : i.status === "cancelled" ? '<span class="au-pill off">בוטל</span>'
        : late ? '<span class="au-pill bad">באיחור</span>' : '<span class="au-pill warn">ממתין לתשלום</span>';
      return `<div class="au-card au-item"><div class="au-item-main"><div class="au-item-title">חשבונית ${esc(i.invoice_number ?? "")} · ${esc(i.client_name || "")} ${st}</div>
        <div class="au-item-sub">${i.amount ? esc(money(i.amount)) + " · " : ""}לתשלום עד ${esc(i.due_date.split("-").reverse().join("/"))}${i.client_email ? " · " + esc(i.client_email) : " · אין מייל — לא יישלחו תזכורות ללקוח"}</div></div>
        <div class="au-actions">${i.status === "paid" ? `<button class="au-btn" data-unpaid="${i.invoice_id}">בטל סימון</button>` : `<button class="au-btn primary" data-paid="${i.invoice_id}">סמן "שולם"</button>`}</div></div>`;
    }).join("") : `<div class="au-card au-empty">אין חשבוניות במעקב.</div>`;
    const open = S.invoices.filter((i) => !trackedIds.has(i.id));
    $("au-invoices").innerHTML = open.length ? open.map((i) => `<div class="au-card au-item"><div class="au-item-main">
        <div class="au-item-title">חשבונית ${esc(i.number ?? "")} · ${esc((i.data || {}).recipientName || "")}</div>
        <div class="au-item-sub">הופקה ${esc(when(i.issued_at))}</div></div>
        <div class="au-actions"><button class="au-btn primary" data-track="${i.id}">מעקב תשלום</button></div></div>`).join("")
      : `<div class="au-card au-empty">${S.invoices.length ? "כל החשבוניות כבר במעקב." : 'אין חשבוניות שהופקו. <a href="invoice-app.html">להפקת חשבונית</a>'}</div>`;
  }
  $("au-invoices").addEventListener("click", (e) => {
    const b = e.target.closest("[data-track]"); if (!b) return;
    const inv = S.invoices.find((x) => x.id === b.dataset.track);
    const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    openModal(`<h2>מעקב תשלום — חשבונית ${esc(inv.number ?? "")}</h2>
      <div class="au-field"><label for="ti-name">שם הלקוח</label><input class="au-input" id="ti-name" value="${esc((inv.data || {}).recipientName || "")}"></div>
      <div class="au-field"><label for="ti-email">מייל הלקוח (לתזכורות)</label><input class="au-input" id="ti-email" type="email" dir="ltr"></div>
      <div class="au-field"><label for="ti-due">לתשלום עד *</label><input class="au-input" id="ti-due" type="date" value="${due}" style="max-width:200px;"></div>
      <div class="au-field"><label for="ti-amount">סכום (₪)</label><input class="au-input" id="ti-amount" type="number" min="0" style="max-width:160px;"></div>
      ${S.autos.invoice_collect ? '<p class="au-item-sub">✓ "גבייה בלי מבוכה" פעילה — אם יעבור המועד, תצא תזכורת לפי ההגדרות שלך.</p>' : '<p class="au-item-sub">טיפ: הפעילו את "גבייה בלי מבוכה" כדי שתזכורות יצאו לבד.</p>'}
      <div class="au-actions"><button class="au-btn primary" id="ti-go">שמירה</button><button class="au-btn" data-close>ביטול</button></div>
      <div class="au-item-sub" id="ti-err" style="color:#B42318;margin-top:8px;"></div>`);
    $("ti-go").onclick = async () => {
      try {
        await api("track-invoice", { invoice_id: inv.id, client_name: $("ti-name").value, client_email: $("ti-email").value, due_date: $("ti-due").value, amount: $("ti-amount").value === "" ? null : Number($("ti-amount").value) });
        closeModal(); toast("במעקב"); await refresh();
      } catch (err) { $("ti-err").textContent = err.message; }
    };
  });

  // ------------------------------------------------------------ history
  async function renderHistory() {
    let h;
    try { h = await api("history", { limit: 50 }); } catch (e) { $("au-history").innerHTML = `<div class="au-card au-empty">${esc(e.message)}</div>`; return; }
    if (!h.runs.length) { $("au-history").innerHTML = `<div class="au-card au-empty">עוד לא קרה כלום. כשאוטומציה תפעל — תראו כאן כל צעד.</div>`; return; }
    const subjectName = (r) => {
      if (r.subject_type === "contact") { const c = S.contacts.find((x) => x.id === r.subject_id); return c ? c.name : "לקוח"; }
      if (r.subject_type === "quote") { const s = S.shares.find((x) => x.id === r.subject_id); return s ? "הצעה ל" + s.client_name : "הצעת מחיר"; }
      if (r.subject_type === "invoice") { const i = S.tracked.find((x) => x.invoice_id === r.subject_id); return i ? "חשבונית " + (i.invoice_number ?? "") : "חשבונית"; }
      return "סיכום יומי";
    };
    $("au-history").innerHTML = h.runs.map((r) => {
      const steps = h.steps.filter((s) => s.run_id === r.id && s.status !== "skipped" && !/ממשיכים|ההמתנה הסתיימה/.test(s.summary || ""));
      const msgs = h.messages.filter((m) => m.run_id === r.id);
      return `<div class="au-card"><div class="au-item"><div class="au-item-main"><div class="au-item-title">${esc(tplName(r.template_key))} · ${esc(subjectName(r))}</div>
        <div class="au-item-sub">התחיל ${esc(when(r.created_at))}${r.status === "waiting" ? ` · הצעד הבא ${esc(new Date(r.next_run_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }))}` : ""}</div></div>${pill(RUN_STATUS, r.status)}</div>
        <ul class="au-timeline">${steps.map((s) => `<li>${s.status === "ok" ? "✓" : s.status === "waiting" ? "⏳" : s.status === "failed" ? "✕" : s.status === "blocked" ? "⏸" : "↻"} ${esc(s.summary || s.step_key)}<span class="t">${esc(when(s.created_at))}</span></li>`).join("")}</ul>
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
    } catch (err) { toast(err.message || "שגיאת טעינה"); }
  }

  async function start() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) { location.href = "account.html?redirect=automate.html"; return; }
    S.session = data.session; S.user = data.session.user;
    try { await loadOverview(); } catch (err) {
      $("au-gate").innerHTML = err.message === "PILOT"
        ? `<h1 style="font-family:Rubik,Heebo,sans-serif;">DeskKit Automate — בקרוב ✨</h1><p>אוטומציות שעובדות בשבילך ברקע: פניות שלא נופלות, הצעות מחיר שלא נשכחות, גבייה בלי מבוכה.</p><p>אנחנו פותחים את זה בהדרגה. נעדכן אותך במייל כשיגיע תורך.</p>`
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
