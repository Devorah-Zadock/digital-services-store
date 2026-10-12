/* Domain-connection popup — was purely informational (Netlify's
   "Add custom domain" + swap Name Servers steps); now a real working
   connect flow, since publish-site's 2026-09-25 cutover means hosting
   is self-hosted, not Netlify — those old instructions described a
   process that no longer applies at all.
   Injected on demand (not eagerly) so it costs nothing on pages that
   never open it; shared by the publish-success screen (sites.html) and
   the "my sites" rail (every page) so there's exactly one copy of this
   content to keep accurate. Needs siteProjectId — the specific site the
   domain should attach to — passed in by the caller (site-builder.js
   already has it in scope; my-panel.js reads it off the row's own
   data-domain-guide attribute, set per-site in myPanelRowHtml). */
function openDomainGuide(siteProjectId) {
  if (document.getElementById("domain-guide-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "domain-guide-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal" role="dialog" aria-modal="true" aria-labelledby="domain-guide-title">
      <button type="button" class="domain-guide-close" id="domain-guide-close" aria-label="${dkL("סגירה", "Close")}">✕</button>
      <h2 id="domain-guide-title">${dkL("רוצים כתובת אתר משלכם?", "Want your own website address?")}</h2>
      <p class="lead">${dkL("האתר שלכם כרגע באוויר עם כתובת חינמית (בסיומת <bdi>deskkit.co.il</bdi>). אם כבר יש לכם דומיין משלכם (או קניתם אחד חדש) — מזינים אותו כאן ומחברים אותו ישירות.", "Your site is currently live on a free address (ending in <bdi>deskkit.co.il</bdi>). If you already have your own domain (or just bought one), enter it here and connect it directly.")}</p>

      <div id="domain-connect-form">
        <div class="domain-connect-row">
          <input type="text" id="domain-connect-input" placeholder="${dkL("www.העסק-שלי.co.il", "www.my-business.com")}" dir="ltr" autocomplete="off">
        </div>
        <button type="button" class="btn btn-teal" id="domain-connect-btn" style="width:100%; margin-top:10px;">${dkL("חיבור הדומיין", "Connect domain")}</button>
        <div class="domain-connect-status" id="domain-connect-status"></div>
        <div class="domain-connect-records" id="domain-connect-records"></div>
      </div>

      <div class="domain-guide-note">${dkL("אין לכם עדיין דומיין? אפשר לקנות אחד תוך כמה דקות באתרים כמו <a href=\"https://www.box.co.il\" target=\"_blank\" rel=\"noopener\">Box (box.co.il)</a> או <a href=\"https://www.livedns.co.il\" target=\"_blank\" rel=\"noopener\">LiveDNS</a> (בדרך כלל 60–150 ₪ לשנה) — ואז חוזרים לכאן.", "Don't have a domain yet? You can buy one in a few minutes from sites like <a href=\"https://www.box.co.il\" target=\"_blank\" rel=\"noopener\">Box (box.co.il)</a> or <a href=\"https://www.livedns.co.il\" target=\"_blank\" rel=\"noopener\">LiveDNS</a> (usually ₪60–150 a year), then come back here.")}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("domain-guide-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  wireDomainConnectForm(siteProjectId);
}

function wireDomainConnectForm(siteProjectId) {
  const input = document.getElementById("domain-connect-input");
  const btn = document.getElementById("domain-connect-btn");
  const status = document.getElementById("domain-connect-status");
  const recordsEl = document.getElementById("domain-connect-records");

  if (!siteProjectId) {
    status.className = "domain-connect-status bad";
    status.textContent = dkL("לא הצלחנו לזהות לאיזה אתר לחבר את הדומיין. נסו לפתוח את זה מדף האתר שוב.", "We couldn't tell which site to connect the domain to. Try opening this again from the site's page.");
    btn.disabled = true;
    return;
  }

  function renderRecords(instructions, verification) {
    const rows = [];
    (instructions || []).forEach((r) => {
      const cond = r.when === "apex" ? dkL("אם הדומיין הוא בדיוק כמו שהזנתם, בלי שום דבר לפניו", "If the domain is exactly as you entered it, with nothing before it") : dkL("אם יש קידומת לפני הדומיין (כמו www)", "If there's a prefix before the domain (like www)");
      rows.push(`<div class="domain-connect-record"><b>${cond}:</b> ${dkL(`מוסיפים רשומת ${r.type}`, `Add a ${r.type} record`)}<div>Name: ${r.name}<br>Value: ${r.value}</div></div>`);
    });
    (verification || []).forEach((v) => {
      rows.push(`<div class="domain-connect-record"><b>${dkL("אימות בעלות נוסף שהתבקש:", "Additional ownership verification requested:")}</b> ${dkL(`מוסיפים רשומת ${v.type}`, `Add a ${v.type} record`)}<div>Name: ${v.name}<br>Value: ${v.value}</div></div>`);
    });
    recordsEl.innerHTML = rows.join("");
  }

  btn.addEventListener("click", async () => {
    const domain = input.value.trim();
    if (!domain) return;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = dkL("מחברים...", "Connecting...");
    status.className = "domain-connect-status wait";
    status.textContent = dkL("מחברים את הדומיין...", "Connecting the domain...");
    recordsEl.innerHTML = "";
    try {
      const { data, error } = await supabaseClient.functions.invoke("connect-custom-domain", {
        body: { siteProjectId, domain },
      });
      if (error || !data) {
        status.className = "domain-connect-status bad";
        status.textContent = dkL("החיבור נכשל. נסו שוב בעוד רגע.", "The connection failed. Please try again in a moment.");
        return;
      }
      if (data.reason === "invalid") {
        status.className = "domain-connect-status bad";
        status.textContent = dkL("זה לא נראה כמו דומיין תקין. בדקו שהקלדתם נכון (בלי https:// ובלי רווחים).", "That doesn't look like a valid domain. Check that you typed it correctly (no https:// and no spaces).");
        return;
      }
      if (data.reason === "taken") {
        status.className = "domain-connect-status bad";
        status.textContent = dkL("הדומיין הזה כבר מחובר במקום אחר. אם הוא שלכם, ודאו שהוא לא עדיין מחובר לאתר/שירות קודם.", "This domain is already connected elsewhere. If it's yours, make sure it isn't still connected to a previous site/service.");
        return;
      }
      if (data.reason === "limit") {
        status.className = "domain-connect-status bad";
        status.textContent = dkL("הגעתם למספר הדומיינים המרבי לחשבון. לעזרה — צרו קשר.", "You've reached the maximum number of domains for your account. For help, contact us.");
        return;
      }
      if (!data.success) {
        status.className = "domain-connect-status bad";
        status.textContent = dkL("החיבור נכשל. נסו שוב בעוד רגע.", "The connection failed. Please try again in a moment.");
        return;
      }
      status.className = "domain-connect-status ok";
      status.textContent = data.verified
        ? dkL("✓ הדומיין מחובר ופעיל!", "✓ The domain is connected and live!")
        : dkL("✓ הדומיין נרשם. עכשיו מוסיפים את הרשומה הבאה אצל ספק הדומיין שלכם:", "✓ The domain is registered. Now add the following record at your domain provider:");
      renderRecords(data.instructions, data.verification);
      if (!data.verified) {
        const checkBtn = document.createElement("button");
        checkBtn.type = "button";
        checkBtn.className = "btn btn-teal";
        checkBtn.style.cssText = "width:100%; margin-top:10px;";
        checkBtn.textContent = dkL("בדיקת סטטוס החיבור", "Check connection status");
        checkBtn.addEventListener("click", async () => {
          checkBtn.disabled = true;
          const checkOriginal = checkBtn.textContent;
          checkBtn.textContent = dkL("בודקים...", "Checking...");
          const res = await supabaseClient.functions.invoke("custom-domain-status", { body: { siteProjectId } });
          checkBtn.disabled = false;
          checkBtn.textContent = checkOriginal;
          if (res.error || !res.data) return;
          if (res.data.connected) {
            status.className = "domain-connect-status ok";
            status.textContent = dkL("✓ הדומיין מחובר ופעיל!", "✓ The domain is connected and live!");
            checkBtn.remove();
          } else {
            status.className = "domain-connect-status wait";
            status.textContent = dkL("עדיין ממתינים ל-DNS (יכול לקחת כמה שעות). נסו לבדוק שוב מאוחר יותר.", "Still waiting for DNS (this can take a few hours). Try checking again later.");
          }
        });
        recordsEl.appendChild(checkBtn);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}
