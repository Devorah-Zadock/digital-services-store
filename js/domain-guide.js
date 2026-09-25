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
      <button type="button" class="domain-guide-close" id="domain-guide-close" aria-label="סגירה">✕</button>
      <h2 id="domain-guide-title">רוצים כתובת אתר משלכם?</h2>
      <p class="lead">האתר שלכם כרגע באוויר עם כתובת חינמית (בסיומת <bdi>sites.deskkit.co.il</bdi>). אם כבר יש לכם דומיין משלכם (או קניתם אחד חדש) — מזינים אותו כאן ומחברים אותו ישירות.</p>

      <div id="domain-connect-form">
        <div class="domain-connect-row">
          <input type="text" id="domain-connect-input" placeholder="www.העסק-שלי.co.il" dir="ltr" autocomplete="off">
        </div>
        <button type="button" class="btn btn-teal" id="domain-connect-btn" style="width:100%; margin-top:10px;">חיבור הדומיין</button>
        <div class="domain-connect-status" id="domain-connect-status"></div>
        <div class="domain-connect-records" id="domain-connect-records"></div>
      </div>

      <div class="domain-guide-note">אין לכם עדיין דומיין? אפשר לקנות אחד תוך כמה דקות באתרים כמו <a href="https://domains.co.il" target="_blank" rel="noopener">Box (domains.co.il)</a> או <a href="https://www.livedns.co.il" target="_blank" rel="noopener">LiveDNS</a> (בדרך כלל 60–150 ₪ לשנה) — ואז חוזרים לכאן.</div>
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
    status.textContent = "לא הצלחנו לזהות לאיזה אתר לחבר את הדומיין. נסו לפתוח את זה מדף האתר שוב.";
    btn.disabled = true;
    return;
  }

  function renderRecords(instructions, verification) {
    const rows = [];
    (instructions || []).forEach((r) => {
      const cond = r.when === "apex" ? "אם הדומיין הוא בדיוק כמו שהזנתם, בלי שום דבר לפניו" : "אם יש קידומת לפני הדומיין (כמו www)";
      rows.push(`<div class="domain-connect-record"><b>${cond}:</b> מוסיפים רשומת ${r.type}<div>Name: ${r.name}<br>Value: ${r.value}</div></div>`);
    });
    (verification || []).forEach((v) => {
      rows.push(`<div class="domain-connect-record"><b>אימות בעלות נוסף שהתבקש:</b> מוסיפים רשומת ${v.type}<div>Name: ${v.name}<br>Value: ${v.value}</div></div>`);
    });
    recordsEl.innerHTML = rows.join("");
  }

  btn.addEventListener("click", async () => {
    const domain = input.value.trim();
    if (!domain) return;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "מחברים...";
    status.className = "domain-connect-status wait";
    status.textContent = "מחברים את הדומיין...";
    recordsEl.innerHTML = "";
    try {
      const { data, error } = await supabaseClient.functions.invoke("connect-custom-domain", {
        body: { siteProjectId, domain },
      });
      if (error || !data) {
        status.className = "domain-connect-status bad";
        status.textContent = "החיבור נכשל. נסו שוב בעוד רגע.";
        return;
      }
      if (data.reason === "invalid") {
        status.className = "domain-connect-status bad";
        status.textContent = "זה לא נראה כמו דומיין תקין. בדקו שהקלדתם נכון (בלי https:// ובלי רווחים).";
        return;
      }
      if (data.reason === "taken") {
        status.className = "domain-connect-status bad";
        status.textContent = "הדומיין הזה כבר מחובר במקום אחר. אם הוא שלכם, ודאו שהוא לא עדיין מחובר לאתר/שירות קודם.";
        return;
      }
      if (!data.success) {
        status.className = "domain-connect-status bad";
        status.textContent = "החיבור נכשל. נסו שוב בעוד רגע.";
        return;
      }
      status.className = "domain-connect-status ok";
      status.textContent = data.verified
        ? "✓ הדומיין מחובר ופעיל!"
        : "✓ הדומיין נרשם. עכשיו מוסיפים את הרשומה הבאה אצל ספק הדומיין שלכם:";
      renderRecords(data.instructions, data.verification);
      if (!data.verified) {
        const checkBtn = document.createElement("button");
        checkBtn.type = "button";
        checkBtn.className = "btn btn-teal";
        checkBtn.style.cssText = "width:100%; margin-top:10px;";
        checkBtn.textContent = "בדיקת סטטוס החיבור";
        checkBtn.addEventListener("click", async () => {
          checkBtn.disabled = true;
          const checkOriginal = checkBtn.textContent;
          checkBtn.textContent = "בודקים...";
          const res = await supabaseClient.functions.invoke("custom-domain-status", { body: { siteProjectId } });
          checkBtn.disabled = false;
          checkBtn.textContent = checkOriginal;
          if (res.error || !res.data) return;
          if (res.data.connected) {
            status.className = "domain-connect-status ok";
            status.textContent = "✓ הדומיין מחובר ופעיל!";
            checkBtn.remove();
          } else {
            status.className = "domain-connect-status wait";
            status.textContent = "עדיין ממתינים ל-DNS (יכול לקחת כמה שעות). נסו לבדוק שוב מאוחר יותר.";
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
