/* Site-wide floating widgets: feedback/rating modal + a small rule-based
   guide chatbot. Both are self-injecting (no markup needed in the HTML
   pages) — just include this script after main.js.

   Feedback storage: submissions go to a Google Form, which Google Forms
   saves as new rows in a linked Google Sheet — free, no submission limit,
   and it persists permanently (survives refresh, not just this browser).
   admin.html then reads that same sheet back and displays it nicely.
   See README "משוב ודירוג" for the one-time setup steps. Until the three
   constants below are filled in, the widget still works — it just falls
   back to a "send us an email" link instead of auto-submitting.

   GOOGLE_FORM_ACTION_URL: your form's action URL — take the form's
   "viewform" link and replace /viewform with /formResponse.
   GOOGLE_FORM_ENTRY_RATING / _MESSAGE / _PAGE: the entry.NNNNNNNNN field
   ID for each of the form's three questions (get these via the form's
   "Get pre-filled link" option — see README for exact steps). */
const GOOGLE_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeKcW1dglT94Psp3CVBwYMkCjy9deBVRHQs1ckl7X3XvaKXNQ/formResponse";
const GOOGLE_FORM_ENTRY_RATING = "2035073733";
const GOOGLE_FORM_ENTRY_MESSAGE = "505234675";
const GOOGLE_FORM_ENTRY_PAGE = "358160448";

const CHAT_FAQ = [
  { kw: ["קו\"ח", "קוח", "קורות חיים", "cv", "resume", "בילדר", "builder"],
    a: "עורכים קורות חיים חיים בבילדר — בוחרים תבנית, ממלאים פרטים, ורואים תוצאה מיד. ההורדה כ-PDF חינמית לגמרי.",
    link: { href: "products.html?cat=cv", label: "לתבניות קורות החיים" } },
  { kw: ["מצגת", "מצגות", "powerpoint", "pptx", "deck"],
    a: "יש 5 תבניות מצגות עסקיות מוכנות, כולן חינם להורדה ישירה כקובץ PowerPoint מלא לעריכה.",
    link: { href: "products.html?cat=deck", label: "לתבניות המצגות" } },
  { kw: ["אקסל", "excel", "xlsx", "תקציב", "חשבונית", "גיליון"],
    a: "יש שני קבצי Excel מוכנים — תקציב חודשי אישי וחשבונית עסקית, עם נוסחאות אמיתיות (לא מספרים קבועים).",
    link: { href: "products.html?cat=xlsx", label: "לתבניות ה-Excel" } },
  { kw: ["חינם", "כסף", "תשלום", "עולה", "מחיר", "לשלם"],
    a: "הכול באתר חינמי לגמרי כרגע — בלי הרשמה ובלי כרטיס אשראי." },
  { kw: ["צבע", "גופן", "פונט", "עיצוב", "פלטה"],
    a: "בבילדר אפשר לבחור צבע ראשי וגם גופן מתוך כמה אפשרויות — התצוגה המקדימה מתעדכנת מיד." },
  { kw: ["תמונה", "פרופיל", "אווטאר", "photo", "picture"],
    a: "בבילדר יש אפשרות להעלות תמונת פרופיל (או להסיר אותה) — היא מופיעה בעיגול ליד השם." },
  { kw: ["אנגלית", "english", "שפה", "language", "עברית", "ltr", "rtl"],
    a: "בראש עמוד הבילדר יש כפתור שפה גדול וברור — עברית או אנגלית, כולל היפוך כיוון אוטומטי של כל התבנית." },
  { kw: ["הורדה", "pdf", "שמירה", "export", "הדפסה"],
    a: "לוחצים על \"הורדת PDF\" בתחתית הבילדר — זה פותח את חלון ההדפסה של הדפדפן, ובוחרים \"שמירה כ-PDF\"." },
  { kw: ["צור קשר", "יצירת קשר", "קשר", "מייל", "email", "contact", "שאלה", "עזרה", "בעיה"],
    a: "אפשר לכתוב לנו דרך עמוד צור קשר ונחזור אליכם בהקדם.",
    link: { href: "contact.html", label: "לעמוד צור קשר" } },
  { kw: ["קטלוג", "מוצרים", "תבניות", "products"],
    a: "כל התבניות — קורות חיים, מצגות וגיליונות Excel — נמצאות בקטלוג, מסונן לפי קטגוריה.",
    link: { href: "products.html", label: "לקטלוג המלא" } },
];
const CHAT_FALLBACK = {
  a: "לא הצלחתי למצוא תשובה מדויקת לזה. אפשר לנסות לשאול אחרת, או לפנות אלינו ישירות.",
  link: { href: "contact.html", label: "לעמוד צור קשר" },
};
const CHAT_QUICK = [
  "איך בונים קורות חיים?",
  "המצגות בחינם?",
  "איך מורידים PDF?",
  "אפשר לשנות גופן וצבע?",
  "אפשר להעלות תמונה?",
  "יש תבניות באנגלית?",
  "יש קבצי Excel?",
  "איך יוצרים קשר?",
];

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function chatMatch(text) {
  const q = String(text || "").trim().toLowerCase();
  if (!q) return null;
  let best = null, bestScore = 0;
  CHAT_FAQ.forEach((item) => {
    const score = item.kw.filter((k) => q.includes(k.toLowerCase())).length;
    if (score > bestScore) { bestScore = score; best = item; }
  });
  return best || CHAT_FALLBACK;
}

function bubbleHtml(text, link, who) {
  return `<div class="chat-msg chat-msg-${who}">
    <div class="chat-bubble">${escapeHtml(text)}${link ? `<a href="${link.href}" class="chat-link">${escapeHtml(link.label)} ←</a>` : ""}</div>
  </div>`;
}

function injectFeedbackWidget() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button type="button" class="fab fab-feedback no-print" id="feedback-fab" title="שתפו משוב" aria-label="שתפו משוב">★</button>
    <div class="widget-overlay no-print" id="feedback-overlay">
      <div class="widget-modal">
        <button type="button" class="widget-close" id="feedback-close" aria-label="סגירה">✕</button>
        <h3>מה דעתכם על DeskKit?</h3>
        <p class="widget-sub">דירוג קצר עוזר לנו להשתפר — לוקח חצי דקה.</p>
        <div class="star-row" id="star-row">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star" data-star="${n}" aria-label="${n} כוכבים">★</button>`).join("")}</div>
        <textarea id="feedback-text" rows="3" placeholder="רוצים להוסיף עוד משהו? (לא חובה)"></textarea>
        <button type="button" class="btn btn-gold" id="feedback-submit" style="width:100%;">שליחת משוב</button>
        <div class="widget-note" id="feedback-note"></div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  let rating = 0;
  const stars = wrap.querySelectorAll(".star");
  stars.forEach((s) => s.addEventListener("click", () => {
    rating = Number(s.dataset.star);
    stars.forEach((st) => st.classList.toggle("filled", Number(st.dataset.star) <= rating));
  }));

  const overlay = document.getElementById("feedback-overlay");
  const closeFeedback = () => overlay.classList.remove("open");
  document.getElementById("feedback-fab").addEventListener("click", () => overlay.classList.add("open"));
  document.getElementById("feedback-close").addEventListener("click", closeFeedback);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeFeedback(); });

  document.getElementById("feedback-submit").addEventListener("click", async () => {
    const note = document.getElementById("feedback-note");
    if (!rating) { note.textContent = "בחרו דירוג לפני השליחה 🙂"; note.className = "widget-note warn"; return; }
    const text = document.getElementById("feedback-text").value.trim();

    if (!GOOGLE_FORM_ACTION_URL) {
      const mailHref = `mailto:digital.dz.studio@gmail.com?subject=${encodeURIComponent("משוב על האתר — " + rating + " כוכבים")}&body=${encodeURIComponent(text)}`;
      note.innerHTML = `תודה! טופס המשוב האוטומטי עוד לא מחובר — אם תרצו, אפשר <a href="${mailHref}">לשלוח לנו את זה במייל</a>.`;
      note.className = "widget-note";
      return;
    }
    note.textContent = "שולח…";
    note.className = "widget-note";
    try {
      const body = new URLSearchParams();
      body.set(GOOGLE_FORM_ENTRY_RATING, String(rating));
      body.set(GOOGLE_FORM_ENTRY_MESSAGE, text);
      body.set(GOOGLE_FORM_ENTRY_PAGE, location.pathname);
      // Google Forms doesn't send CORS headers, so the response is opaque
      // (mode: "no-cors") — we can't confirm success from the fetch result
      // itself, only that the request went out. This is the standard,
      // widely-used technique for posting to Google Forms from a static site.
      await fetch(GOOGLE_FORM_ACTION_URL, { method: "POST", mode: "no-cors", body });
      note.textContent = "תודה על המשוב!";
      note.className = "widget-note ok";
      document.getElementById("feedback-text").value = "";
    } catch (err) {
      note.textContent = "משהו השתבש בשליחה — נסו שוב בעוד רגע.";
      note.className = "widget-note warn";
    }
  });
}

function injectChatWidget() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button type="button" class="fab fab-chat no-print" id="chat-fab" title="עוזר DeskKit" aria-label="פתיחת צ'אט עזרה">💬</button>
    <div class="chat-panel no-print" id="chat-panel">
      <div class="chat-head">
        <span>עוזר DeskKit</span>
        <button type="button" class="widget-close" id="chat-close" aria-label="סגירה">✕</button>
      </div>
      <div class="chat-body" id="chat-body"></div>
      <div class="chat-quick" id="chat-quick">${CHAT_QUICK.map((q) => `<button type="button" class="chat-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join("")}</div>
      <form class="chat-input-row" id="chat-form">
        <input type="text" id="chat-input" placeholder="כתבו שאלה..." autocomplete="off">
        <button type="submit" class="btn btn-teal">שליחה</button>
      </form>
    </div>`;
  document.body.appendChild(wrap);

  const panel = document.getElementById("chat-panel");
  const body = document.getElementById("chat-body");
  let greeted = false;

  function addMsg(text, link, who) {
    body.insertAdjacentHTML("beforeend", bubbleHtml(text, link, who));
    body.scrollTop = body.scrollHeight;
  }

  function ask(text) {
    if (!text.trim()) return;
    addMsg(text, null, "user");
    const match = chatMatch(text);
    setTimeout(() => addMsg(match.a, match.link, "bot"), 300);
  }

  document.getElementById("chat-fab").addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && !greeted) {
      greeted = true;
      addMsg("היי! אני העוזר של DeskKit 👋 אפשר לשאול אותי על התבניות, הבילדר או ההורדות.", null, "bot");
    }
  });
  document.getElementById("chat-close").addEventListener("click", () => panel.classList.remove("open"));
  document.getElementById("chat-quick").addEventListener("click", (e) => {
    const q = e.target.dataset.q;
    if (q) ask(q);
  });
  document.getElementById("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    ask(input.value);
    input.value = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  injectFeedbackWidget();
  injectChatWidget();
});
