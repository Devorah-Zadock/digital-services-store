/* "יש לי כבר קורות חיים — הדביקו ונמלא בשבילכם": fills the builder
   from a CV the person already has. They paste its text (or pick a
   .docx/.txt file, read right here in the browser), the cv-import Edge
   Function turns it into the builder's own content object (same shape
   as js/cv-content.js's templates), and it replaces the current content
   — keeping the chosen design and photo — as one undoable step. From
   there it's the normal builder: edit, autosave, download.

   Same call pattern as js/ai-writer.js (session token + apikey to
   /functions/v1/...) and the same limit messaging (AI_UPGRADE_MESSAGE
   from js/ats-checker.js). The server enforces the cap and the input
   length; the checks here only save a round trip.

   Reuses .domain-guide-overlay/.domain-guide-modal and the ATS modal's
   textarea/error styles; only the few new bits live in
   css/cv-builder.css. Nothing pasted is stored or logged here. */

const CV_IMPORT_MAX_CHARS = 12000;
const CV_IMPORT_MIN_CHARS = 30;
const CV_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

// Mostly Hebrew letters → "he", mostly Latin → "en", too little to tell → null.
function cvImportGuessLang(text) {
  const he = (text.match(/[֐-׿]/g) || []).length;
  const en = (text.match(/[A-Za-z]/g) || []).length;
  if (he + en < 40) return null;
  return he >= en * 0.3 ? "he" : "en";
}

/* ---------- Reading a file in the browser (no libraries) ---------- */

/* A .docx is a zip; the text lives in word/document.xml. Finds that one
   entry through the zip's central directory and inflates it with the
   browser's own DecompressionStream — enough for a CV, without shipping
   a zip/docx library to every visitor. */
async function cvImportDocxText(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip");
  const entries = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  let found = null;
  for (let n = 0; n < entries && p + 46 <= bytes.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (name === "word/document.xml") { found = { method, compSize, localOffset }; break; }
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (!found) throw new Error("no document.xml");
  const lo = found.localOffset;
  const dataStart = lo + 30 + view.getUint16(lo + 26, true) + view.getUint16(lo + 28, true);
  const data = bytes.subarray(dataStart, dataStart + found.compSize);
  let xml;
  if (found.method === 0) {
    xml = new TextDecoder().decode(data);
  } else if (found.method === 8 && typeof DecompressionStream === "function") {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    xml = await new Response(stream).text();
  } else {
    throw new Error("unsupported compression");
  }
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const lines = [];
  Array.from(doc.getElementsByTagNameNS(W, "p")).forEach((para) => {
    let line = "";
    para.querySelectorAll("*").forEach((el) => {
      if (el.namespaceURI !== W) return;
      if (el.localName === "t") line += el.textContent;
      else if (el.localName === "tab") line += "\t";
      else if (el.localName === "br" || el.localName === "cr") line += "\n";
    });
    if (line.trim()) lines.push(line.trim());
  });
  return lines.join("\n");
}

async function cvImportReadFile(file) {
  const name = (file.name || "").toLowerCase();
  if (file.size > CV_IMPORT_MAX_FILE_BYTES) throw { userMessage: dkL("הקובץ גדול מדי (עד 5MB). אפשר להעתיק ממנו את הטקסט ולהדביק כאן.", "The file is too large (5MB max). You can copy its text and paste it here.") };
  if (name.endsWith(".txt") || file.type === "text/plain") return await file.text();
  if (name.endsWith(".docx")) {
    try {
      return await cvImportDocxText(await file.arrayBuffer());
    } catch (_e) {
      throw { userMessage: dkL("לא הצלחנו לקרוא את קובץ ה-Word. פתחו אותו, סמנו הכול (Ctrl+A), העתיקו והדביקו כאן.", "We couldn't read this Word file. Open it, select all (Ctrl+A), copy and paste it here.") };
    }
  }
  if (name.endsWith(".pdf")) throw { userMessage: dkL("קובץ PDF אי אפשר לקרוא כאן ישירות — פתחו אותו, סמנו הכול (Ctrl+A), העתיקו והדביקו את הטקסט כאן.", "A PDF can't be read here directly — open it, select all (Ctrl+A), copy and paste the text here.") };
  throw { userMessage: dkL("אפשר להעלות קובץ Word (.docx) או טקסט (.txt) — או פשוט להדביק את הטקסט.", "You can upload a Word (.docx) or text (.txt) file — or just paste the text.") };
}

/* ---------- The modal ---------- */

function openCvImport() {
  // The import is an AI call on the person's own account (and fills
  // what will be saved there) — ask to join first, before they spend
  // time pasting, same popup as save/download.
  if (typeof cvCurrentUserId !== "undefined" && !cvCurrentUserId) {
    if (typeof openAuthPrompt === "function") openAuthPrompt();
    return;
  }
  if (document.getElementById("cv-import-overlay")) return;
  const startLang = (typeof state !== "undefined" && state.lang === "en") ? "en" : "he";
  const overlay = document.createElement("div");
  overlay.id = "cv-import-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal ats-modal cv-import-modal" role="dialog" aria-modal="true" aria-labelledby="cv-import-title">
      <button type="button" class="domain-guide-close" id="cv-import-close" aria-label="${dkL("סגירה", "Close")}">✕</button>
      <h2 id="cv-import-title">📋 ${dkL("יש לי כבר קורות חיים", "Already have a CV?")}</h2>
      <p class="lead">${dkL("הדביקו כאן את הטקסט של קורות החיים שלכם (או העלו קובץ Word), וה-AI ימלא את כל השדות בעיצוב שבחרתם. אחר כך אפשר לערוך הכול.", "Paste the text of your CV here (or upload a Word file) and AI will fill in every field in the design you chose. You can edit everything afterwards.")}</p>
      <textarea class="ats-textarea" id="cv-import-text" dir="auto" rows="10" maxlength="${CV_IMPORT_MAX_CHARS}" placeholder="${dkL("לדוגמה: שם, פרטי קשר, ניסיון תעסוקתי, השכלה, כישורים…", "e.g. name, contact details, work experience, education, skills…")}"></textarea>
      <div class="cv-import-row">
        <label class="cv-import-file">
          <input type="file" id="cv-import-file" accept=".docx,.txt,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
          <span>📎 ${dkL("העלאת קובץ (Word / טקסט)", "Upload a file (Word / text)")}</span>
        </label>
        <span class="cv-import-count" id="cv-import-count" dir="ltr">0 / ${CV_IMPORT_MAX_CHARS.toLocaleString("en-US")}</span>
      </div>
      <div class="cv-import-lang" role="radiogroup" aria-label="${dkL("שפת קורות החיים", "CV language")}">
        <span>${dkL("למלא בשפה:", "Fill in:")}</span>
        <label><input type="radio" name="cv-import-lang" value="he"${startLang === "he" ? " checked" : ""}> עברית</label>
        <label><input type="radio" name="cv-import-lang" value="en"${startLang === "en" ? " checked" : ""}> English</label>
      </div>
      <p class="cv-import-note">${dkL("התוכן שמופיע עכשיו יוחלף (אפשר לבטל עם \"↶ בטל\"). העיצוב והתמונה נשארים.", "The current content will be replaced (you can undo with \"↶ Undo\"). The design and photo stay.")}</p>
      <button type="button" class="btn btn-gold ats-submit-btn" id="cv-import-submit">✨ ${dkL("מלאו לי את קורות החיים", "Fill in my CV")}</button>
      <div class="ats-error" id="cv-import-error" hidden></div>
    </div>`;
  document.body.appendChild(overlay);

  const textarea = overlay.querySelector("#cv-import-text");
  const count = overlay.querySelector("#cv-import-count");
  const errorBox = overlay.querySelector("#cv-import-error");
  const submit = overlay.querySelector("#cv-import-submit");
  let langTouched = false;
  let busy = false;

  const close = () => { if (!busy) { overlay.remove(); document.removeEventListener("keydown", onKey); } };
  function onKey(e) { if (e.key === "Escape") close(); }
  overlay.querySelector("#cv-import-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", onKey);

  const showError = (html) => { errorBox.innerHTML = html; errorBox.hidden = !html; };

  // Follows the pasted text's language until the person picks one.
  const onText = () => {
    count.textContent = `${textarea.value.length.toLocaleString("en-US")} / ${CV_IMPORT_MAX_CHARS.toLocaleString("en-US")}`;
    if (!langTouched) {
      const guess = cvImportGuessLang(textarea.value);
      if (guess) overlay.querySelector(`input[name="cv-import-lang"][value="${guess}"]`).checked = true;
    }
  };
  textarea.addEventListener("input", onText);
  overlay.querySelectorAll('input[name="cv-import-lang"]').forEach((r) => r.addEventListener("change", () => { langTouched = true; }));

  overlay.querySelector("#cv-import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    showError("");
    try {
      const text = (await cvImportReadFile(file)).replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) throw { userMessage: dkL("לא מצאנו טקסט בקובץ. אפשר להעתיק ולהדביק אותו כאן.", "We found no text in the file. You can copy and paste it here.") };
      textarea.value = text.slice(0, CV_IMPORT_MAX_CHARS);
      onText();
      if (text.length > CV_IMPORT_MAX_CHARS) showError(dkL("הקובץ ארוך מהמגבלה — נכנסו רק 12,000 התווים הראשונים.", "The file is longer than the limit — only the first 12,000 characters were kept."));
    } catch (err) {
      showError(escapeHtml((err && err.userMessage) || dkL("לא הצלחנו לקרוא את הקובץ.", "We couldn't read the file.")));
    }
  });

  submit.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (text.length < CV_IMPORT_MIN_CHARS) { showError(dkL("הדביקו קודם את הטקסט של קורות החיים.", "Paste the text of your CV first.")); return; }
    if (text.length > CV_IMPORT_MAX_CHARS) { showError(dkL("הטקסט ארוך מדי (עד 12,000 תווים).", "The text is too long (12,000 characters max).")); return; }
    const lang = overlay.querySelector('input[name="cv-import-lang"]:checked').value === "en" ? "en" : "he";
    showError("");
    busy = true;
    submit.disabled = true;
    textarea.disabled = true;
    const originalLabel = submit.textContent;
    submit.textContent = dkL("ממלאים את קורות החיים… (כחצי דקה)", "Filling in your CV… (about half a minute)");
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session && sessionData.session.access_token;
      if (!token) { busy = false; close(); if (typeof openAuthPrompt === "function") openAuthPrompt(); return; }
      const res = await fetch(SUPABASE_URL + "/functions/v1/cv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ text, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.limitReached) {
        showError(data.isPro
          ? dkL("הגעת למכסה היומית של ייבוא קורות חיים (20). אפשר להמשיך מחר.", "You've reached today's CV import limit (20). You can continue tomorrow.")
          : `${AI_UPGRADE_MESSAGE} <a href="#">${dkL("שדרוג ל-Pro", "Upgrade to Pro")}</a>`);
        return;
      }
      if (res.status === 422 || data.empty) { showError(dkL("לא מצאנו בטקסט פרטים של קורות חיים. בדקו שהדבקתם את כל הטקסט ונסו שוב.", "We couldn't find CV details in the text. Check that you pasted all of it and try again.")); return; }
      if (res.status === 413) { showError(dkL("הטקסט ארוך מדי (עד 12,000 תווים).", "The text is too long (12,000 characters max).")); return; }
      if (!res.ok || data.error || !data.content) throw new Error("cv-import " + res.status);
      cvImportApply(data.content, data.lang === "en" ? "en" : lang);
      busy = false;
      close();
      cvImportToast(dkL("✓ קורות החיים מולאו — עברו על הפרטים ותקנו מה שצריך.", "✓ Your CV is filled in — look it over and fix anything you need."));
    } catch (err) {
      console.error("CV import failed:", err && err.message);
      showError(dkL("משהו השתבש בייבוא. אפשר לנסות שוב בעוד רגע.", "Something went wrong with the import. Please try again in a moment."));
    } finally {
      busy = false;
      submit.disabled = false;
      textarea.disabled = false;
      submit.textContent = originalLabel;
    }
  });

  textarea.focus();
}

/* Replaces the content in one undoable step. A different language than
   the one on screen switches the CV's language too — directly, not via
   setLang(), which would load that language's example content instead. */
function cvImportApply(rawContent, lang) {
  const content = cvNormalizeContent(rawContent);
  if (!content.jobs.length) content.jobs = [{ title: "", place: "", dates: "", bullets: "" }];
  if (typeof cvbshellActiveFlag !== "undefined" && cvbshellActiveFlag) cvbshellSnapshot();
  state.lang = lang;
  document.querySelectorAll(".lang-big").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  cvReplaceContent(content, true);
}

function cvImportToast(text) {
  const el = document.createElement("div");
  el.className = "cvb-toast";
  el.setAttribute("role", "status");
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}
