/* Site-wide floating widgets: feedback/rating modal + a small rule-based
   guide chatbot. Both are self-injecting (no markup needed in the HTML
   pages) — just include this script after main.js.

   FEEDBACK_ENDPOINT: paste a Formspree endpoint here to receive ratings by
   email AND have them saved permanently in a private inbox you can revisit
   any time (see README "משוב ודירוג", and see admin.html for a private
   in-site page linking to that inbox). Until it's set, the form still
   works — it just falls back to a "send us an email" link instead of
   auto-submitting. */
const FEEDBACK_ENDPOINT = "https://formspree.io/f/moeagwvk";

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
    a: "הכלים חינמיים לגמרי — נדרשת כניסה מהירה עם מייל או Google כדי שהעבודה שלכם תישמר, בלי צורך בכרטיס אשראי." },
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

    if (!FEEDBACK_ENDPOINT) {
      const mailHref = `mailto:digital.dz.studio@gmail.com?subject=${encodeURIComponent("משוב על האתר — " + rating + " כוכבים")}&body=${encodeURIComponent(text)}`;
      note.innerHTML = `תודה! טופס המשוב האוטומטי עוד לא מחובר — אם תרצו, אפשר <a href="${mailHref}">לשלוח לנו את זה במייל</a>.`;
      note.className = "widget-note";
      return;
    }
    note.textContent = "שולח…";
    note.className = "widget-note";
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ rating, message: text, page: location.pathname }),
      });
      if (!res.ok) throw new Error("bad response");
      note.textContent = "תודה על המשוב!";
      note.className = "widget-note ok";
      document.getElementById("feedback-text").value = "";
    } catch (err) {
      note.textContent = "משהו השתבש בשליחה — נסו שוב בעוד רגע.";
      note.className = "widget-note warn";
    }
  });
}

function injectAccessibilityFab() {
  const a = document.createElement("a");
  a.href = "accessibility.html";
  a.className = "fab fab-a11y no-print";
  a.title = "הצהרת נגישות";
  a.setAttribute("aria-label", "הצהרת נגישות");
  a.textContent = "♿";
  document.body.appendChild(a);
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
  injectAccessibilityFab();
});
