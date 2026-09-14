/* DeskKit CRM — a self-contained lead-tracking Kanban board. Deliberately
   no backend and no account system: every lead lives in this browser's
   own localStorage, so "access" is just a purchase flag (see
   crm-product.html) rather than a real login. That's a conscious scope
   choice for this product, not an oversight — see crm-product.html's own
   comments for the purchase-simulation flow this unlock flag comes from. */

const CRM_LEADS_KEY = "deskkit_crm_leads";
const CRM_UNLOCK_KEY = "deskkit_crm_unlocked";

const CRM_STAGES = [
  { key: "new", label: "ליד חדש" },
  { key: "inprogress", label: "בטיפול / נשלחה הצעה" },
  { key: "followup", label: "פולו-אפ" },
  { key: "won", label: "נסגר בהצלחה!" },
];

function crmIsUnlocked() {
  try { return localStorage.getItem(CRM_UNLOCK_KEY) === "1"; } catch (err) { return false; }
}

function crmUnlock() {
  try { localStorage.setItem(CRM_UNLOCK_KEY, "1"); } catch (err) { /* storage unavailable */ }
}

function loadLeads() {
  try {
    const raw = localStorage.getItem(CRM_LEADS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveLeads(leads) {
  try { localStorage.setItem(CRM_LEADS_KEY, JSON.stringify(leads)); } catch (err) { /* storage full/unavailable */ }
}

function escapeHtmlCrm(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatIls(n) {
  const num = Number(n) || 0;
  return "₪" + num.toLocaleString("he-IL");
}

/* ---------- Board state + rendering ---------- */
let crmLeads = [];
let crmEditingId = null; // null while adding a new lead, otherwise the lead being edited

function crmInit() {
  // crm.js is also loaded by crm-product.html (for crmUnlock() in its own
  // purchase script) — without this guard, the unlock-gate below redirected
  // that page to itself in a loop, since it obviously has no #crm-board.
  if (!document.getElementById("crm-board")) return;
  if (!crmIsUnlocked()) {
    window.location.href = "crm-product.html";
    return;
  }
  crmLeads = loadLeads();
  crmRenderBoard();
  crmWireModal();
  crmWireAddButtons();
}

function crmRenderBoard() {
  const board = document.getElementById("crm-board");
  if (!board) return;

  board.innerHTML = CRM_STAGES.map((stage) => {
    const stageLeads = crmLeads.filter((l) => l.stage === stage.key);
    const stageTotal = stageLeads.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    return `
      <div class="crm-col" data-stage="${stage.key}">
        <div class="crm-col-head">
          <h3>${escapeHtmlCrm(stage.label)}</h3>
          <span class="crm-col-count">${stageLeads.length}</span>
        </div>
        <div class="crm-col-total">${formatIls(stageTotal)}</div>
        <div class="crm-col-body" data-stage="${stage.key}">
          ${stageLeads.map(crmCardHtml).join("") || `<p class="crm-col-empty">אין כאן לידים עדיין</p>`}
        </div>
        <button type="button" class="crm-col-add" data-stage="${stage.key}">+ הוספת ליד</button>
      </div>`;
  }).join("");

  crmWireCardEvents();
  crmWireColumnDrop();
  crmRenderSummary();
}

function crmCardHtml(lead) {
  const stageIdx = CRM_STAGES.findIndex((s) => s.key === lead.stage);
  const canBack = stageIdx > 0;
  const canForward = stageIdx < CRM_STAGES.length - 1;
  return `
    <div class="crm-card" draggable="true" data-id="${lead.id}">
      <div class="crm-card-top">
        <span class="crm-card-name">${escapeHtmlCrm(lead.name)}</span>
        <button type="button" class="crm-card-del" data-id="${lead.id}" aria-label="מחיקה" title="מחיקה">✕</button>
      </div>
      ${lead.phone ? `<a class="crm-card-line" href="tel:${escapeHtmlCrm(lead.phone)}" onclick="event.stopPropagation()">📞 ${escapeHtmlCrm(lead.phone)}</a>` : ""}
      ${lead.email ? `<a class="crm-card-line" href="mailto:${escapeHtmlCrm(lead.email)}" onclick="event.stopPropagation()">✉️ ${escapeHtmlCrm(lead.email)}</a>` : ""}
      ${lead.notes ? `<p class="crm-card-notes">${escapeHtmlCrm(lead.notes)}</p>` : ""}
      <div class="crm-card-bottom">
        <span class="crm-card-amount">${formatIls(lead.amount)}</span>
        <span class="crm-card-moves">
          <button type="button" class="crm-move-btn" data-id="${lead.id}" data-dir="back" ${canBack ? "" : "disabled"} title="שלב אחורה">◂</button>
          <button type="button" class="crm-move-btn" data-id="${lead.id}" data-dir="forward" ${canForward ? "" : "disabled"} title="שלב קדימה">▸</button>
        </span>
      </div>
    </div>`;
}

function crmRenderSummary() {
  const el = document.getElementById("crm-summary-total");
  if (!el) return;
  const openTotal = crmLeads
    .filter((l) => l.stage !== "won")
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  el.textContent = formatIls(openTotal);
}

/* ---------- Card interactions: edit / delete / move / drag ---------- */
function crmWireCardEvents() {
  document.querySelectorAll(".crm-card").forEach((cardEl) => {
    cardEl.addEventListener("click", (e) => {
      if (e.target.closest(".crm-card-del") || e.target.closest(".crm-move-btn") || e.target.closest("a")) return;
      crmOpenModal(cardEl.dataset.id);
    });
    cardEl.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", cardEl.dataset.id);
      e.dataTransfer.effectAllowed = "move";
      cardEl.classList.add("dragging");
    });
    cardEl.addEventListener("dragend", () => cardEl.classList.remove("dragging"));
  });

  document.querySelectorAll(".crm-card-del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!confirm("למחוק את הליד הזה?")) return;
      crmLeads = crmLeads.filter((l) => l.id !== btn.dataset.id);
      saveLeads(crmLeads);
      crmRenderBoard();
    });
  });

  document.querySelectorAll(".crm-move-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lead = crmLeads.find((l) => l.id === btn.dataset.id);
      if (!lead) return;
      const idx = CRM_STAGES.findIndex((s) => s.key === lead.stage);
      const nextIdx = btn.dataset.dir === "forward" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= CRM_STAGES.length) return;
      lead.stage = CRM_STAGES[nextIdx].key;
      saveLeads(crmLeads);
      crmRenderBoard();
    });
  });

  document.querySelectorAll(".crm-col-add").forEach((btn) => {
    btn.addEventListener("click", () => crmOpenModal(null, btn.dataset.stage));
  });
}

function crmWireColumnDrop() {
  document.querySelectorAll(".crm-col-body").forEach((zone) => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const lead = crmLeads.find((l) => l.id === id);
      if (!lead) return;
      lead.stage = zone.dataset.stage;
      saveLeads(crmLeads);
      crmRenderBoard();
    });
  });
}

function crmWireAddButtons() {
  const addBtn = document.getElementById("crm-add-lead-btn");
  if (addBtn) addBtn.addEventListener("click", () => crmOpenModal(null));
}

/* ---------- Add/edit modal ---------- */
function crmOpenModal(id, presetStage) {
  crmEditingId = id;
  const lead = id ? crmLeads.find((l) => l.id === id) : null;
  document.getElementById("crm-modal-title").textContent = lead ? "עריכת ליד" : "הוספת ליד חדש";
  document.getElementById("crm-f-name").value = lead ? lead.name : "";
  document.getElementById("crm-f-phone").value = lead ? lead.phone : "";
  document.getElementById("crm-f-email").value = lead ? lead.email : "";
  document.getElementById("crm-f-amount").value = lead ? lead.amount : "";
  document.getElementById("crm-f-notes").value = lead ? lead.notes : "";
  document.getElementById("crm-f-stage").value = lead ? lead.stage : (presetStage || "new");
  document.getElementById("crm-modal-delete").style.display = lead ? "" : "none";
  document.getElementById("crm-modal").style.display = "flex";
  document.getElementById("crm-f-name").focus();
}

function crmCloseModal() {
  document.getElementById("crm-modal").style.display = "none";
  crmEditingId = null;
}

function crmWireModal() {
  document.getElementById("crm-modal-close").addEventListener("click", crmCloseModal);
  document.getElementById("crm-modal").addEventListener("click", (e) => {
    if (e.target.id === "crm-modal") crmCloseModal();
  });
  document.getElementById("crm-modal-delete").addEventListener("click", () => {
    if (!crmEditingId) return;
    if (!confirm("למחוק את הליד הזה?")) return;
    crmLeads = crmLeads.filter((l) => l.id !== crmEditingId);
    saveLeads(crmLeads);
    crmCloseModal();
    crmRenderBoard();
  });

  document.getElementById("crm-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("crm-f-name").value.trim();
    if (!name) return;
    const data = {
      name,
      phone: document.getElementById("crm-f-phone").value.trim(),
      email: document.getElementById("crm-f-email").value.trim(),
      amount: Number(document.getElementById("crm-f-amount").value) || 0,
      notes: document.getElementById("crm-f-notes").value.trim(),
      stage: document.getElementById("crm-f-stage").value,
    };
    if (crmEditingId) {
      const lead = crmLeads.find((l) => l.id === crmEditingId);
      if (lead) Object.assign(lead, data);
    } else {
      crmLeads.push({ id: "lead-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), createdAt: Date.now(), ...data });
    }
    saveLeads(crmLeads);
    crmCloseModal();
    crmRenderBoard();
  });
}

document.addEventListener("DOMContentLoaded", crmInit);
