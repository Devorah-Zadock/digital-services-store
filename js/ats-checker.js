/* ATS Checker — paste a job description, get back how well the CV
   currently open in the builder matches it: a 1-100 score, keywords the
   posting mentions that the CV is missing, and a couple of concrete
   phrasing tips. Talks to the ats-check Edge Function, which is the only
   place that calls OpenAI and enforces the free-attempt cap — nothing
   here can be trusted to enforce it itself, so failures/limits always
   come back from the server, never computed locally.

   Reads `state` (the live CV content + language) straight from builder.js
   — both are loaded as plain scripts on builder.html and share one global
   scope, same as the rest of that page's script tags. Self-contained and
   built on demand like domain-guide.js, so pages that never open it pay
   nothing for it. */

function atsCvPlainText(content) {
  const lines = [];
  if (content.name) lines.push(content.name);
  if (content.title) lines.push(content.title);
  if (content.summary) lines.push(content.summary);
  (content.jobs || []).forEach((j) => {
    const head = [j.title, j.place, j.dates].filter(Boolean).join(" — ");
    if (head) lines.push(head);
    if (j.bullets) lines.push(j.bullets);
  });
  (content.projects || []).forEach((p) => {
    if (p.title) lines.push(p.title);
    if (p.bullets) lines.push(p.bullets);
  });
  if (content.education) lines.push(content.education);
  if (content.skills) lines.push(content.skills);
  return lines.filter(Boolean).join("\n");
}

function atsScoreColor(score) {
  if (score >= 80) return "#1F5C4E";
  if (score >= 50) return "#C99A3B";
  return "#B0392B";
}

async function atsRunCheck() {
  const overlay = document.getElementById("ats-check-overlay");
  const textarea = document.getElementById("ats-jobdesc");
  const submitBtn = document.getElementById("ats-submit-btn");
  const resultBox = document.getElementById("ats-result");
  const errorBox = document.getElementById("ats-error");
  const attemptsNote = document.getElementById("ats-attempts-note");

  const jobDescription = textarea.value.trim();
  errorBox.hidden = true;
  if (!jobDescription) {
    errorBox.textContent = "צריך להדביק קודם את תיאור המשרה.";
    errorBox.hidden = false;
    return;
  }
  if (!state.content) {
    errorBox.textContent = "לא נמצא קורות חיים פתוח לבדיקה.";
    errorBox.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "בודק...";
  resultBox.hidden = true;

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) throw new Error("not signed in");

    const res = await fetch(SUPABASE_URL + "/functions/v1/ats-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({
        jobDescription,
        cvText: atsCvPlainText(state.content),
        lang: state.lang,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "שגיאה לא צפויה");

    if (data.limitReached) {
      attemptsNote.textContent = `נוצלו כל ${data.limit} הבדיקות החינמיות שלך.`;
      errorBox.textContent = "הגעת למכסת הבדיקות החינמיות. נדבר בקרוב על אפשרות להרחיב את המכסה.";
      errorBox.hidden = false;
      submitBtn.disabled = true;
      return;
    }

    attemptsNote.textContent = `נותרו לך ${Math.max(0, data.limit - data.count)} מתוך ${data.limit} בדיקות חינם.`;

    const scoreEl = document.getElementById("ats-score-badge");
    scoreEl.textContent = data.score != null ? `${data.score}/100` : "—";
    scoreEl.style.background = data.score != null ? atsScoreColor(data.score) : "#DADFDD";

    const keywordsEl = document.getElementById("ats-keywords");
    keywordsEl.innerHTML = (data.missingKeywords || []).length
      ? data.missingKeywords.map((k) => `<span class="ats-keyword-chip">${escapeHtmlAts(k)}</span>`).join("")
      : `<span class="ats-keywords-empty">לא נמצאו מילות מפתח חשובות שחסרות — יפה!</span>`;

    const tipsEl = document.getElementById("ats-tips");
    tipsEl.innerHTML = (data.tips || []).map((t) => `<li>${escapeHtmlAts(t)}</li>`).join("");

    resultBox.hidden = false;
    submitBtn.disabled = data.count >= data.limit;
  } catch (err) {
    errorBox.textContent = "משהו השתבש בבדיקה. אפשר לנסות שוב בעוד רגע. (" + (err.message || err) + ")";
    errorBox.hidden = false;
  } finally {
    submitBtn.textContent = "בדוק התאמה";
    if (!submitBtn.disabled) submitBtn.disabled = false;
    void overlay;
  }
}

function escapeHtmlAts(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("ats-check-btn");
  if (btn) btn.addEventListener("click", openAtsChecker);
});

async function openAtsChecker() {
  if (document.getElementById("ats-check-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "ats-check-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal ats-modal" role="dialog" aria-modal="true" aria-labelledby="ats-check-title">
      <button type="button" class="domain-guide-close" id="ats-check-close" aria-label="סגירה">✕</button>
      <h2 id="ats-check-title">בדיקת התאמה למשרה (ATS)</h2>
      <p class="lead">מדביקים כאן את תיאור המשרה שאליה שולחים את קורות החיים, ומקבלים ציון התאמה, מילות מפתח שחסרות, וטיפים קצרים לשיפור — לפני ששולחים.</p>
      <textarea class="ats-textarea" id="ats-jobdesc" placeholder="הדביקו כאן את תיאור המשרה..." rows="7"></textarea>
      <div class="ats-attempts" id="ats-attempts-note">בודקים את היתרה שלך...</div>
      <button type="button" class="btn btn-gold ats-submit-btn" id="ats-submit-btn">בדוק התאמה</button>
      <div class="ats-error" id="ats-error" hidden></div>
      <div class="ats-result" id="ats-result" hidden>
        <div class="ats-score-row">
          <div class="ats-score-badge" id="ats-score-badge">--</div>
          <div class="ats-score-label">ציון התאמה</div>
        </div>
        <h3>מילות מפתח שחסרות</h3>
        <div class="ats-keywords" id="ats-keywords"></div>
        <h3>טיפים לשיפור</h3>
        <ul class="ats-tips" id="ats-tips"></ul>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("ats-check-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
  document.getElementById("ats-submit-btn").addEventListener("click", atsRunCheck);

  const attemptsNote = document.getElementById("ats-attempts-note");
  try {
    const { data } = await supabaseClient.from("ai_usage").select("count").eq("tool", "ats-check").maybeSingle();
    const used = data ? data.count : 0;
    attemptsNote.textContent = `נותרו לך ${Math.max(0, 3 - used)} מתוך 3 בדיקות חינם.`;
    if (used >= 3) document.getElementById("ats-submit-btn").disabled = true;
  } catch (e) {
    attemptsNote.textContent = "עד 3 בדיקות חינם.";
  }
}
