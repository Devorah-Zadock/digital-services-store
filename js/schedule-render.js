/* Main controller for the school schedule builder: renders every setup
   tab from scheduleState, runs the solver (schedule-worker.js) and
   renders/edits the result grid. schedule-cloud-save.js reads/writes
   the scheduleState global declared here — same shared-globals pattern
   already used for quoteEventState between quote-render.js and
   quote-cloud-save.js. */

let scheduleState = defaultScheduleState();
let scheduleWorker = null;
let scheduleSolving = false;
let scheduleResultView = { kind: "class", entityId: null };

function schedEsc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- paywall (Gumroad license, same pattern as js/site-builder.js) ----------
   Filling in every setup tab (subjects/classes/teachers/rooms/
   assignments) stays free and unlimited; only actually running the
   solver ("🎲 צור מערכת שעות" / "המשך לשפר") requires a redeemed
   license — same "honest caveat" as everywhere else on this site: a
   client-side check against Gumroad's API, not real DRM, but the same
   barrier the CV/sites builders already used successfully before the CV
   one went free. */
const SCHEDULE_GUMROAD_CONFIG = { productId: "K122yL6VSdTui67Be5ZiYw==", checkoutUrl: "https://dizstudio.gumroad.com/l/koixys" };
const SCHEDULE_UNLOCK_KEY = "deskkit_schedule_unlocked_" + SCHEDULE_GUMROAD_CONFIG.productId;
/* Fixed, not per-project like site templates: there's only one version
   of this tool, so one purchase should unlock every project this account
   ever builds here — passed as redeem-license's generic "template" scope
   key, which it treats as an opaque string. */
const SCHEDULE_LICENSE_TEMPLATE = "schedule-builder";

function scheduleIsUnlocked() {
  return localStorage.getItem(SCHEDULE_UNLOCK_KEY) === "1";
}

let scheduleLastVerifiedPurchase = null;
let scheduleVerifying = false;

/* Same send-receipt Edge Function the site builder already uses (email +
   attached PDF, via Resend/PDFShift — see that function's own comment
   for the two secrets it needs) — just not wired up here until now.
   Best-effort and silent on failure, same as the site builder's version:
   a receipt email failing must never block someone who just paid and is
   waiting to actually use the tool. */
async function sendSchedulePurchaseReceipt() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const sessionEmail = data.session && data.session.user && data.session.user.email;
    const purchase = scheduleLastVerifiedPurchase;
    const buyerEmail = (purchase && purchase.email) || sessionEmail;
    if (!buyerEmail) return;
    const amount = purchase && purchase.price != null ? `${(purchase.price / 100).toFixed(2)} ₪` : "499.00 ₪";
    await supabaseClient.functions.invoke("send-receipt", {
      body: {
        buyerEmail,
        buyerName: (purchase && purchase.full_name) || "",
        itemDescription: "בונה מערכת שעות לבית ספר — DeskKit",
        amount,
      },
    });
  } catch (err) {
    // silent — a failed receipt email is a support follow-up, not a
    // reason to interrupt someone who just finished paying
  }
}

function refreshScheduleUnlockUi() {
  const unlocked = scheduleIsUnlocked();
  document.getElementById("sched-unlock-gate").hidden = unlocked;
  document.getElementById("sched-unlock-done").hidden = !unlocked;
}

/* Verification itself happens server-side in the redeem-license Edge
   Function (see that file) — it re-verifies the key with Gumroad itself
   and atomically claims it against this account, so the same purchased
   key can't unlock a second, unrelated account. */
async function verifyScheduleLicense() {
  if (scheduleVerifying) return;
  const input = document.getElementById("sched-license-input");
  const note = document.getElementById("sched-license-note");
  const key = input.value.trim();
  if (!key) { note.textContent = "יש להזין קוד רישוי."; note.className = "unlock-note err"; return; }
  if (!scheduleCurrentUserId) { note.textContent = "יש להתחבר לחשבון כדי לפתוח את הכלי."; note.className = "unlock-note err"; return; }
  scheduleVerifying = true;
  note.textContent = "בודקים...";
  note.className = "unlock-note";
  try {
    const { data, error } = await supabaseClient.functions.invoke("redeem-license", {
      body: { licenseKey: key, productId: SCHEDULE_GUMROAD_CONFIG.productId, userId: scheduleCurrentUserId, template: SCHEDULE_LICENSE_TEMPLATE },
    });
    if (error || !data) {
      note.textContent = "שגיאת חיבור לשירות האימות. נסו שוב בעוד רגע.";
      note.className = "unlock-note err";
      return;
    }
    if (!data.success) {
      const invalidMsg = "קוד לא תקין. בדקו את המייל שקיבלתם ב-Gumroad ונסו שוב." + (data.gumroadMessage ? ` (Gumroad: ${data.gumroadMessage})` : "");
      note.textContent = data.reason === "redeemed-elsewhere" ? "קוד הרישוי הזה כבר שימש לפתיחת חשבון אחר." : invalidMsg;
      note.className = "unlock-note err";
      return;
    }
    scheduleLastVerifiedPurchase = data.purchase || null;
    localStorage.setItem(SCHEDULE_UNLOCK_KEY, "1");
    note.textContent = "נפתח בהצלחה!";
    note.className = "unlock-note ok";
    refreshScheduleUnlockUi();
    sendSchedulePurchaseReceipt();
  } catch (err) {
    note.textContent = "שגיאת חיבור לשירות האימות. נסו שוב בעוד רגע.";
    note.className = "unlock-note err";
  } finally {
    scheduleVerifying = false;
  }
}

function wireScheduleUnlock() {
  const buyLink = document.getElementById("sched-buy-link");
  buyLink.href = SCHEDULE_GUMROAD_CONFIG.checkoutUrl;
  wireBuyLinkOnce(buyLink, "deskkit_schedule_buyclicked_" + SCHEDULE_GUMROAD_CONFIG.productId);
  document.getElementById("sched-verify-btn").addEventListener("click", verifyScheduleLicense);
  refreshScheduleUnlockUi();
}

/* ---------- tabs ---------- */

function schedShowTab(tab) {
  document.querySelectorAll(".sched-tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".sched-tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tabPanel === tab));
}

/* ---------- settings tab ---------- */

function renderSettingsTab() {
  document.getElementById("sched-days-select").value = String(scheduleState.settings.days);
  document.getElementById("sched-periods-input").value = scheduleState.settings.periodsPerDay;
}

function wireSettingsTab() {
  document.getElementById("sched-days-select").addEventListener("change", (e) => {
    scheduleState.settings.days = parseInt(e.target.value, 10);
    onScheduleStructureChanged();
  });
  document.getElementById("sched-periods-input").addEventListener("change", (e) => {
    const v = Math.min(SCHEDULE_MAX_PERIODS, Math.max(1, parseInt(e.target.value, 10) || 1));
    scheduleState.settings.periodsPerDay = v;
    onScheduleStructureChanged();
  });
}

function onScheduleStructureChanged() {
  if (scheduleState.timetable) scheduleState.timetable = null;
  renderTeachersTab();
  renderResultTab();
}

/* ---------- subjects tab ---------- */

function renderSubjectsTab() {
  const wrap = document.getElementById("sched-subjects-list");
  if (!scheduleState.subjects.length) {
    wrap.innerHTML = '<p class="sched-hint">עוד לא הוספתם מקצועות.</p>';
    return;
  }
  wrap.innerHTML = scheduleState.subjects.map(subjectRowHtml).join("");
}

function subjectRowHtml(s) {
  const roomOptions = ['<option value="">ללא חדר מיוחד</option>']
    .concat(scheduleState.rooms.map((r) => `<option value="${r.id}"${r.id === s.roomId ? " selected" : ""}>${schedEsc(scheduleDisplayName(r.name))}</option>`))
    .join("");
  return `<div class="sched-row sched-subject-cols" data-subject-id="${s.id}">
    <input type="color" class="sched-color-input" data-field="color" value="${s.color}">
    <input type="text" class="sched-text-input" data-field="name" value="${schedEsc(s.name)}" placeholder="שם המקצוע">
    <select class="sched-select" data-field="roomId">${roomOptions}</select>
    <input type="number" class="sched-num-input" data-field="maxConsecutive" min="1" max="${SCHEDULE_MAX_PERIODS}" placeholder="ללא הגבלה" value="${s.maxConsecutive || ""}">
    <button type="button" class="sched-row-del" data-action="delete-subject" title="מחיקה" aria-label="מחיקה">🗑</button>
  </div>`;
}

function wireSubjectsTab() {
  document.getElementById("sched-add-subject").addEventListener("click", () => {
    scheduleAddSubject(scheduleState, "", "#1F5C4E", null);
    renderSubjectsTab();
    renderAssignmentsTab();
  });
  const wrap = document.getElementById("sched-subjects-list");
  wrap.addEventListener("input", (e) => {
    const row = e.target.closest("[data-subject-id]");
    if (!row) return;
    const s = scheduleState.subjects.find((x) => x.id === row.dataset.subjectId);
    if (!s) return;
    const field = e.target.dataset.field;
    if (field === "name") { s.name = e.target.value; renderAssignmentsTab(); }
    if (field === "color") s.color = e.target.value;
    if (field === "maxConsecutive") { const v = parseInt(e.target.value, 10); s.maxConsecutive = v > 0 ? v : null; }
  });
  wrap.addEventListener("change", (e) => {
    const row = e.target.closest("[data-subject-id]");
    if (!row) return;
    const s = scheduleState.subjects.find((x) => x.id === row.dataset.subjectId);
    if (!s) return;
    if (e.target.dataset.field === "roomId") s.roomId = e.target.value || null;
  });
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="delete-subject"]');
    if (!btn) return;
    const row = btn.closest("[data-subject-id]");
    if (!confirm("למחוק את המקצוע? שיבוצי הוראה שמשתמשים בו יימחקו גם הם.")) return;
    scheduleRemoveSubject(scheduleState, row.dataset.subjectId);
    scheduleState.timetable = null;
    renderSubjectsTab();
    renderTeachersTab();
    renderAssignmentsTab();
    renderResultTab();
  });
}

/* ---------- classes tab ---------- */

function renderClassesTab() {
  const wrap = document.getElementById("sched-classes-list");
  if (!scheduleState.classes.length) {
    wrap.innerHTML = '<p class="sched-hint">עוד לא הוספתם כיתות.</p>';
    return;
  }
  wrap.innerHTML = scheduleState.classes.map((c) => `
    <div class="sched-row sched-class-cols" data-class-id="${c.id}">
      <input type="text" class="sched-text-input" data-field="name" value="${schedEsc(c.name)}" placeholder="שם הכיתה">
      <input type="number" class="sched-num-input" data-field="maxDailyPeriod" min="1" max="${SCHEDULE_MAX_PERIODS}" placeholder="כל היום" value="${c.maxDailyPeriod || ""}">
      <button type="button" class="sched-row-del" data-action="delete-class" title="מחיקה" aria-label="מחיקה">🗑</button>
    </div>`).join("");
}

function wireClassesTab() {
  document.getElementById("sched-add-class").addEventListener("click", () => {
    scheduleAddClass(scheduleState, "");
    renderClassesTab();
    renderAssignmentsTab();
  });
  const wrap = document.getElementById("sched-classes-list");
  wrap.addEventListener("input", (e) => {
    const row = e.target.closest("[data-class-id]");
    if (!row) return;
    const c = scheduleState.classes.find((x) => x.id === row.dataset.classId);
    if (!c) return;
    const field = e.target.dataset.field;
    if (field === "name") { c.name = e.target.value; renderAssignmentsTab(); }
    if (field === "maxDailyPeriod") { const v = parseInt(e.target.value, 10); c.maxDailyPeriod = v > 0 ? v : null; }
  });
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="delete-class"]');
    if (!btn) return;
    const row = btn.closest("[data-class-id]");
    if (!confirm("למחוק את הכיתה? שיבוצי הוראה שמשתמשים בה יימחקו גם הם.")) return;
    scheduleRemoveClass(scheduleState, row.dataset.classId);
    scheduleState.timetable = null;
    renderClassesTab();
    renderAssignmentsTab();
    renderResultTab();
  });
}

/* ---------- rooms tab ---------- */

function renderRoomsTab() {
  const wrap = document.getElementById("sched-rooms-list");
  if (!scheduleState.rooms.length) {
    wrap.innerHTML = '<p class="sched-hint">עוד לא הוספתם חדרים מיוחדים.</p>';
    return;
  }
  wrap.innerHTML = scheduleState.rooms.map((r) => `
    <div class="sched-row sched-room-cols" data-room-id="${r.id}">
      <input type="text" class="sched-text-input" data-field="name" value="${schedEsc(r.name)}" placeholder="שם החדר">
      <input type="number" class="sched-num-input" data-field="count" min="1" max="30" value="${r.count}">
      <button type="button" class="sched-row-del" data-action="delete-room" title="מחיקה" aria-label="מחיקה">🗑</button>
    </div>`).join("");
}

function wireRoomsTab() {
  document.getElementById("sched-add-room").addEventListener("click", () => {
    scheduleAddRoom(scheduleState, "", 1);
    renderRoomsTab();
    renderSubjectsTab();
  });
  const wrap = document.getElementById("sched-rooms-list");
  wrap.addEventListener("input", (e) => {
    const row = e.target.closest("[data-room-id]");
    if (!row) return;
    const r = scheduleState.rooms.find((x) => x.id === row.dataset.roomId);
    if (!r) return;
    const field = e.target.dataset.field;
    if (field === "name") { r.name = e.target.value; renderSubjectsTab(); }
    if (field === "count") r.count = Math.max(1, parseInt(e.target.value, 10) || 1);
  });
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="delete-room"]');
    if (!btn) return;
    const row = btn.closest("[data-room-id]");
    if (!confirm("למחוק את החדר? מקצועות שמשויכים אליו יישארו בלי חדר נדרש.")) return;
    scheduleRemoveRoom(scheduleState, row.dataset.roomId);
    scheduleState.timetable = null;
    renderRoomsTab();
    renderSubjectsTab();
    renderResultTab();
  });
}

/* ---------- teachers tab (incl. availability grid) ---------- */

function availabilityGridHtml(teacher) {
  const days = scheduleState.settings.days, periods = scheduleState.settings.periodsPerDay;
  let header = '<div class="sched-avail-label"></div>';
  for (let d = 0; d < days; d++) header += `<div class="sched-avail-daylabel">${schedEsc(scheduleDayName(d))}</div>`;
  let rows = `<div class="sched-avail-row sched-avail-header">${header}</div>`;
  for (let p = 0; p < periods; p++) {
    let cells = `<div class="sched-avail-label">${p + 1}</div>`;
    for (let d = 0; d < days; d++) {
      const key = slotKey(d, p);
      const off = teacher.unavailable.includes(key);
      cells += `<button type="button" class="sched-avail-cell${off ? " off" : ""}" data-day="${d}" data-period="${p}" title="${schedEsc(scheduleDayName(d))}, שיעור ${p + 1}"></button>`;
    }
    rows += `<div class="sched-avail-row">${cells}</div>`;
  }
  return `<div class="sched-avail-grid" style="--sched-avail-cols:${days};">${rows}</div>`;
}

function teacherCardHtml(t) {
  const subjectChecks = scheduleState.subjects.length
    ? scheduleState.subjects.map((s) => `<label class="sched-check"><input type="checkbox" data-field="subject" value="${s.id}"${t.subjectIds.includes(s.id) ? " checked" : ""}> ${schedEsc(scheduleDisplayName(s.name))}</label>`).join("")
    : '<p class="sched-hint">הוסיפו קודם מקצועות בלשונית "מקצועות".</p>';
  return `<div class="sched-teacher-card" data-teacher-id="${t.id}">
    <div class="sched-teacher-head">
      <input type="text" class="sched-text-input" data-field="name" value="${schedEsc(t.name)}" placeholder="שם המורה">
      <button type="button" class="sched-row-del" data-action="delete-teacher" title="מחיקה" aria-label="מחיקה">🗑</button>
    </div>
    <div class="sched-teacher-subjects">
      <label class="sched-subfield-label">מקצועות שהמורה מלמד/ת</label>
      <p class="sched-hint" style="margin:0 0 8px;">סמנו כל מקצוע שהמורה הזו יכולה ללמד — בלשונית "שיבוצי הוראה" אפשר לשבץ אותה רק למקצוע שסימנתם כאן.</p>
      <div class="sched-check-list">${subjectChecks}</div>
    </div>
    <div class="sched-teacher-avail">
      <label class="sched-subfield-label">שעות לא זמינות (לחיצה על משבצת מסמנת/מבטלת חסימה)</label>
      ${availabilityGridHtml(t)}
    </div>
  </div>`;
}

function renderTeachersTab() {
  const wrap = document.getElementById("sched-teachers-list");
  if (!scheduleState.teachers.length) {
    wrap.innerHTML = '<p class="sched-hint">עוד לא הוספתם מורים.</p>';
    return;
  }
  wrap.innerHTML = scheduleState.teachers.map(teacherCardHtml).join("");
}

function wireTeachersTab() {
  document.getElementById("sched-add-teacher").addEventListener("click", () => {
    scheduleAddTeacher(scheduleState, "");
    renderTeachersTab();
    renderAssignmentsTab();
  });
  const wrap = document.getElementById("sched-teachers-list");

  wrap.addEventListener("input", (e) => {
    const card = e.target.closest("[data-teacher-id]");
    if (!card) return;
    const t = scheduleState.teachers.find((x) => x.id === card.dataset.teacherId);
    if (!t) return;
    if (e.target.dataset.field === "name") { t.name = e.target.value; renderAssignmentsTab(); }
  });

  wrap.addEventListener("change", (e) => {
    const card = e.target.closest("[data-teacher-id]");
    if (!card) return;
    const t = scheduleState.teachers.find((x) => x.id === card.dataset.teacherId);
    if (!t) return;
    if (e.target.dataset.field === "subject") {
      const sid = e.target.value;
      if (e.target.checked) { if (!t.subjectIds.includes(sid)) t.subjectIds.push(sid); }
      else t.subjectIds = t.subjectIds.filter((id) => id !== sid);
      renderAssignmentsTab();
    }
  });

  wrap.addEventListener("click", (e) => {
    const delBtn = e.target.closest('[data-action="delete-teacher"]');
    if (delBtn) {
      const card = delBtn.closest("[data-teacher-id]");
      if (!confirm("למחוק את המורה? שיבוצי הוראה שמשתמשים בו/בה יימחקו גם הם.")) return;
      scheduleRemoveTeacher(scheduleState, card.dataset.teacherId);
      scheduleState.timetable = null;
      renderTeachersTab();
      renderAssignmentsTab();
      renderResultTab();
      return;
    }
    const cell = e.target.closest(".sched-avail-cell");
    if (cell) {
      const card = cell.closest("[data-teacher-id]");
      const t = scheduleState.teachers.find((x) => x.id === card.dataset.teacherId);
      if (!t) return;
      const key = slotKey(parseInt(cell.dataset.day, 10), parseInt(cell.dataset.period, 10));
      const idx = t.unavailable.indexOf(key);
      if (idx === -1) t.unavailable.push(key); else t.unavailable.splice(idx, 1);
      cell.classList.toggle("off", idx === -1);
    }
  });
}

/* ---------- assignments tab ---------- */

function assignmentRowHtml(a) {
  const classOpts = scheduleState.classes.map((c) => `<option value="${c.id}"${c.id === a.classId ? " selected" : ""}>${schedEsc(scheduleDisplayName(c.name))}</option>`).join("");
  const subjOpts = scheduleState.subjects.map((s) => `<option value="${s.id}"${s.id === a.subjectId ? " selected" : ""}>${schedEsc(scheduleDisplayName(s.name))}</option>`).join("");
  const eligible = scheduleTeachersForSubject(scheduleState, a.subjectId);
  const teacherPool = eligible.length ? eligible : scheduleState.teachers;
  const teacherOpts = teacherPool.map((t) => `<option value="${t.id}"${t.id === a.teacherId ? " selected" : ""}>${schedEsc(scheduleDisplayName(t.name))}</option>`).join("");
  return `<div class="sched-row sched-assign-cols" data-assignment-id="${a.id}">
    <select class="sched-select" data-field="classId">${classOpts}</select>
    <select class="sched-select" data-field="subjectId">${subjOpts}</select>
    <select class="sched-select" data-field="teacherId">${teacherOpts}</select>
    <input type="number" class="sched-num-input" data-field="weeklyHours" min="1" max="20" value="${a.weeklyHours}">
    <button type="button" class="sched-row-del" data-action="delete-assignment" title="מחיקה" aria-label="מחיקה">🗑</button>
  </div>`;
}

function renderAssignmentsTab() {
  const wrap = document.getElementById("sched-assignments-list");
  const addBtn = document.getElementById("sched-add-assignment");
  const canAdd = scheduleState.classes.length && scheduleState.subjects.length && scheduleState.teachers.length;
  addBtn.disabled = !canAdd;
  if (!scheduleState.assignments.length) {
    wrap.innerHTML = canAdd
      ? '<p class="sched-hint">עוד לא הוספתם שיבוצי הוראה.</p>'
      : '<p class="sched-hint">הוסיפו קודם מקצועות, כיתות ומורים.</p>';
    return;
  }
  wrap.innerHTML = scheduleState.assignments.map(assignmentRowHtml).join("");
}

function wireAssignmentsTab() {
  document.getElementById("sched-add-assignment").addEventListener("click", () => {
    const c = scheduleState.classes[0], s = scheduleState.subjects[0];
    if (!c || !s) return;
    const eligible = scheduleTeachersForSubject(scheduleState, s.id);
    const t = eligible[0] || scheduleState.teachers[0];
    if (!t) return;
    scheduleAddAssignment(scheduleState, c.id, s.id, t.id, 2);
    renderAssignmentsTab();
  });
  const wrap = document.getElementById("sched-assignments-list");
  wrap.addEventListener("input", (e) => {
    const row = e.target.closest("[data-assignment-id]");
    if (!row) return;
    const a = scheduleState.assignments.find((x) => x.id === row.dataset.assignmentId);
    if (!a) return;
    if (e.target.dataset.field === "weeklyHours") a.weeklyHours = Math.max(1, parseInt(e.target.value, 10) || 1);
  });
  wrap.addEventListener("change", (e) => {
    const row = e.target.closest("[data-assignment-id]");
    if (!row) return;
    const a = scheduleState.assignments.find((x) => x.id === row.dataset.assignmentId);
    if (!a) return;
    const field = e.target.dataset.field;
    if (field === "classId") a.classId = e.target.value;
    if (field === "teacherId") a.teacherId = e.target.value;
    if (field === "subjectId") {
      a.subjectId = e.target.value;
      // The teacher dropdown is about to re-render filtered to whoever
      // teaches the NEW subject — a.teacherId has to move with it, or the
      // saved assignment would silently keep pointing at a teacher who
      // (per the checkboxes on their own card) doesn't actually teach
      // this subject, even though the visible dropdown shows someone else.
      const eligible = scheduleTeachersForSubject(scheduleState, a.subjectId);
      const pool = eligible.length ? eligible : scheduleState.teachers;
      a.teacherId = pool[0] ? pool[0].id : "";
      renderAssignmentsTab();
    }
  });
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="delete-assignment"]');
    if (!btn) return;
    const row = btn.closest("[data-assignment-id]");
    scheduleRemoveAssignment(scheduleState, row.dataset.assignmentId);
    scheduleState.timetable = null;
    renderAssignmentsTab();
    renderResultTab();
  });
}

/* ---------- result tab: solver orchestration ---------- */

function getScheduleWorker() {
  if (!scheduleWorker) scheduleWorker = new Worker("js/schedule-worker.js");
  return scheduleWorker;
}

function setSolvingUi(active, statusText) {
  scheduleSolving = active;
  document.getElementById("sched-generate-btn").disabled = active;
  document.getElementById("sched-improve-btn").disabled = active;
  const el = document.getElementById("sched-solver-status");
  el.classList.toggle("running", active);
  if (statusText) el.textContent = statusText;
}

function runSolver(continueFromCurrent) {
  if (scheduleSolving || !scheduleIsUnlocked()) return;
  const problem = buildScheduleProblem(scheduleState);
  if (!problem.lessons.length) {
    alert("אין שיעורים לשיבוץ — הוסיפו שיבוצי הוראה בלשונית המתאימה קודם.");
    return;
  }
  const worker = getScheduleWorker();
  const budget = Math.min(9000, Math.max(2500, problem.lessons.length * 15));
  setSolvingUi(true, "מריצים שיבוץ אוטומטי… (" + problem.lessons.length + " שיעורים)");

  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === "progress") {
      document.getElementById("sched-solver-status").textContent =
        `מחפשים פתרון… הפרות קשות: ${msg.bestHard} · איכות: ${Math.round(msg.bestSoft)} · איטרציה ${msg.iter.toLocaleString("he")}`;
    } else if (msg.type === "done") {
      scheduleState.timetable = { placement: msg.placement, hard: msg.hard, soft: msg.soft, generatedAt: Date.now() };
      setSolvingUi(false);
      const ok = msg.hard === 0;
      document.getElementById("sched-solver-status").textContent = ok
        ? "מערכת שעות נוצרה בהצלחה, ללא התנגשויות."
        : `מערכת שעות נוצרה עם ${msg.hard} התנגשויות שלא נפתרו — נסו "המשך לשפר", או בדקו שהאילוצים לא סותרים זה את זה.`;
      document.getElementById("sched-improve-btn").hidden = false;
      renderResultTab();
    }
  };
  worker.postMessage({
    cmd: "solve",
    problem,
    timeBudgetMs: budget,
    initialPlacement: continueFromCurrent && scheduleState.timetable ? scheduleState.timetable.placement : null,
  });
}

function wireResultControls() {
  document.getElementById("sched-generate-btn").addEventListener("click", () => runSolver(false));
  document.getElementById("sched-improve-btn").addEventListener("click", () => runSolver(true));
}

/* ---------- result tab: grid rendering + manual drag edit ---------- */

function buildCellLessonMap(problem, placement, kind, entityId) {
  const map = {};
  problem.lessons.forEach((l) => {
    const match = kind === "class" ? l.classId === entityId : l.teacherId === entityId;
    if (!match) return;
    const pos = placement[l.id];
    if (!pos) return;
    map[slotKey(pos.day, pos.period)] = l.id;
  });
  return map;
}

function resultGridHtml(kind, entityId) {
  const days = scheduleState.settings.days, periods = scheduleState.settings.periodsPerDay;
  const problem = buildScheduleProblem(scheduleState);
  const placement = scheduleState.timetable.placement;
  const conflicts = scheduleFindConflicts(problem, placement);
  const lessonById = {};
  problem.lessons.forEach((l) => { lessonById[l.id] = l; });
  const cellLessons = buildCellLessonMap(problem, placement, kind, entityId);

  let header = '<div class="sched-grid-corner"></div>';
  for (let d = 0; d < days; d++) header += `<div class="sched-grid-daylabel">${schedEsc(scheduleDayName(d))}</div>`;

  let rows = `<div class="sched-grid-row sched-grid-header">${header}</div>`;
  for (let p = 0; p < periods; p++) {
    let cells = `<div class="sched-grid-plabel">${p + 1}</div>`;
    for (let d = 0; d < days; d++) {
      const key = slotKey(d, p);
      const lid = cellLessons[key];
      if (lid) {
        const lesson = lessonById[lid];
        const subj = scheduleState.subjects.find((s) => s.id === lesson.subjectId);
        const other = kind === "class"
          ? scheduleState.teachers.find((t) => t.id === lesson.teacherId)
          : scheduleState.classes.find((c) => c.id === lesson.classId);
        const isConflict = conflicts.has(lid);
        cells += `<div class="sched-grid-cell filled${isConflict ? " conflict" : ""}" draggable="true" data-lesson-id="${lid}" data-day="${d}" data-period="${p}" style="--sched-subj-color:${subj ? subj.color : "#ccc"}">
          <span class="sched-cell-subj">${schedEsc(subj ? scheduleDisplayName(subj.name) : "?")}</span>
          <span class="sched-cell-sub">${schedEsc(other ? scheduleDisplayName(other.name) : "")}</span>
        </div>`;
      } else {
        cells += `<div class="sched-grid-cell empty" data-day="${d}" data-period="${p}"></div>`;
      }
    }
    rows += `<div class="sched-grid-row">${cells}</div>`;
  }
  return `<div class="sched-grid" style="--sched-grid-cols:${days};">${rows}</div>`;
}

function scheduleEntityOptionsHtml() {
  const list = scheduleResultView.kind === "class" ? scheduleState.classes : scheduleState.teachers;
  return list.map((x) => `<option value="${x.id}">${schedEsc(scheduleDisplayName(x.name))}</option>`).join("");
}

function renderResultTab() {
  const view = document.getElementById("sched-result-view");
  const improveBtn = document.getElementById("sched-improve-btn");
  if (!scheduleState.timetable) {
    view.hidden = true;
    improveBtn.hidden = true;
    return;
  }
  improveBtn.hidden = false;
  view.hidden = false;

  const list = scheduleResultView.kind === "class" ? scheduleState.classes : scheduleState.teachers;
  if (!list.length) { view.hidden = true; return; }
  if (!scheduleResultView.entityId || !list.some((x) => x.id === scheduleResultView.entityId)) {
    scheduleResultView.entityId = list[0].id;
  }

  const select = document.getElementById("sched-entity-select");
  select.innerHTML = scheduleEntityOptionsHtml();
  select.value = scheduleResultView.entityId;

  const problem = buildScheduleProblem(scheduleState);
  const conflicts = scheduleFindConflicts(problem, scheduleState.timetable.placement);
  const badge = document.getElementById("sched-conflict-badge");
  if (conflicts.size) {
    badge.hidden = false;
    badge.textContent = `${conflicts.size} שיעורים בהתנגשות`;
  } else {
    badge.hidden = true;
  }

  document.getElementById("sched-result-grid-wrap").innerHTML = resultGridHtml(scheduleResultView.kind, scheduleResultView.entityId);
}

function wireResultGrid() {
  document.querySelectorAll(".sched-view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sched-view-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      scheduleResultView.kind = btn.dataset.viewKind;
      scheduleResultView.entityId = null;
      renderResultTab();
    });
  });
  document.getElementById("sched-entity-select").addEventListener("change", (e) => {
    scheduleResultView.entityId = e.target.value;
    renderResultTab();
  });

  const gridWrap = document.getElementById("sched-result-grid-wrap");
  gridWrap.addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".sched-grid-cell.filled");
    if (!cell) return;
    e.dataTransfer.setData("text/plain", cell.dataset.lessonId);
    e.dataTransfer.effectAllowed = "move";
  });
  gridWrap.addEventListener("dragover", (e) => {
    if (e.target.closest(".sched-grid-cell")) e.preventDefault();
  });
  gridWrap.addEventListener("drop", (e) => {
    const targetCell = e.target.closest(".sched-grid-cell");
    if (!targetCell || !scheduleState.timetable) return;
    e.preventDefault();
    const lessonId = e.dataTransfer.getData("text/plain");
    if (!lessonId) return;
    const day = parseInt(targetCell.dataset.day, 10), period = parseInt(targetCell.dataset.period, 10);
    const targetLessonId = targetCell.dataset.lessonId;
    if (targetLessonId === lessonId) return;
    const placement = scheduleState.timetable.placement;
    const srcPos = placement[lessonId];
    if (!srcPos) return;
    if (targetLessonId) {
      placement[targetLessonId] = { day: srcPos.day, period: srcPos.period };
      placement[lessonId] = { day, period };
    } else {
      placement[lessonId] = { day, period };
    }
    renderResultTab();
  });
}

/* ---------- print + CSV export ---------- */

function buildAllClassesPrintHtml() {
  if (!scheduleState.timetable) return "";
  return scheduleState.classes.map((c) => `
    <div class="sched-print-page">
      <h2>מערכת שעות — ${schedEsc(scheduleDisplayName(c.name))}</h2>
      ${resultGridHtml("class", c.id)}
    </div>`).join("");
}

function csvEscape(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadTextFile(content, filename, mime) {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportResultCsv() {
  if (!scheduleState.timetable) return;
  const { kind, entityId } = scheduleResultView;
  const entity = (kind === "class" ? scheduleState.classes : scheduleState.teachers).find((x) => x.id === entityId);
  if (!entity) return;
  const days = scheduleState.settings.days, periods = scheduleState.settings.periodsPerDay;
  const problem = buildScheduleProblem(scheduleState);
  const lessonById = {};
  problem.lessons.forEach((l) => { lessonById[l.id] = l; });
  const cellLessons = buildCellLessonMap(problem, scheduleState.timetable.placement, kind, entityId);

  const rows = [["שעה"].concat(Array.from({ length: days }, (_, d) => scheduleDayName(d)))];
  for (let p = 0; p < periods; p++) {
    const row = [String(p + 1)];
    for (let d = 0; d < days; d++) {
      const lid = cellLessons[slotKey(d, p)];
      if (!lid) { row.push(""); continue; }
      const lesson = lessonById[lid];
      const subj = scheduleState.subjects.find((s) => s.id === lesson.subjectId);
      const other = kind === "class"
        ? scheduleState.teachers.find((t) => t.id === lesson.teacherId)
        : scheduleState.classes.find((c) => c.id === lesson.classId);
      row.push(`${subj ? scheduleDisplayName(subj.name) : ""} (${other ? scheduleDisplayName(other.name) : ""})`);
    }
    rows.push(row);
  }
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  downloadTextFile(csv, `מערכת-שעות-${scheduleDisplayName(entity.name)}.csv`, "text/csv;charset=utf-8;");
}

function wirePrintExport() {
  document.getElementById("sched-print-current").addEventListener("click", () => window.print());
  document.getElementById("sched-print-all").addEventListener("click", () => {
    const holder = document.getElementById("sched-print-all-holder");
    holder.innerHTML = buildAllClassesPrintHtml();
    document.body.classList.add("sched-printing-all");
    window.print();
    setTimeout(() => document.body.classList.remove("sched-printing-all"), 500);
  });
  document.getElementById("sched-export-csv").addEventListener("click", exportResultCsv);
}

/* ---------- init ---------- */

function renderAllTabs() {
  document.getElementById("sched-name-input").value = scheduleState.name;
  renderSettingsTab();
  renderSubjectsTab();
  renderClassesTab();
  renderTeachersTab();
  renderRoomsTab();
  renderAssignmentsTab();
  renderResultTab();
}

/* Called by schedule-cloud-save.js after a saved project loads over the
   default blank state, so the whole UI reflects it in one pass. */
window.scheduleOnStateLoaded = renderAllTabs;

function initSchedulePage() {
  document.querySelectorAll(".sched-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => schedShowTab(btn.dataset.tab));
  });
  document.getElementById("sched-name-input").addEventListener("input", (e) => { scheduleState.name = e.target.value; });

  wireSettingsTab();
  wireSubjectsTab();
  wireClassesTab();
  wireRoomsTab();
  wireTeachersTab();
  wireAssignmentsTab();
  wireScheduleUnlock();
  wireResultControls();
  wireResultGrid();
  wirePrintExport();

  renderAllTabs();
}

document.addEventListener("DOMContentLoaded", initSchedulePage);
