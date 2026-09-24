/* Domain-connection guide popup — explains, in plain Hebrew, how to buy
   an Israeli domain and point it at the site's Netlify address. Injected
   on demand (not eagerly) so it costs nothing on pages that never open
   it; shared by the publish-success screen (sites.html) and the "my
   sites" rail (every page) so there's exactly one copy of this content
   to keep accurate. */
function openDomainGuide() {
  if (document.getElementById("domain-guide-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "domain-guide-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal" role="dialog" aria-modal="true" aria-labelledby="domain-guide-title">
      <button type="button" class="domain-guide-close" id="domain-guide-close" aria-label="סגירה">✕</button>
      <h2 id="domain-guide-title">רוצים כתובת אתר משלכם?</h2>
      <p class="lead">האתר שלכם כרגע באוויר עם כתובת חינמית (כמו <bdi>deskkit-xyz.netlify.app</bdi>). אפשר לקנות כתובת משלכם — למשל <bdi>www.העסק-שלי.co.il</bdi> — ולחבר אותה לאתר. לוקח כמה דקות להגדיר, ונראה הרבה יותר מקצועי.</p>

      <div class="domain-guide-step">
        <div class="domain-guide-num">1</div>
        <div class="domain-guide-step-body">
          <h3>קונים כתובת (דומיין)</h3>
          <p>נכנסים לאחד האתרים הבאים, מחפשים את השם שרוצים (למשל "המספרה-של-דנה.co.il") ורוכשים אותו. עולה בדרך כלל 60–150 ₪ לשנה.</p>
          <div class="domain-guide-providers">
            <a href="https://domains.co.il" target="_blank" rel="noopener">Box (domains.co.il)</a>
            <a href="https://www.livedns.co.il" target="_blank" rel="noopener">LiveDNS</a>
          </div>
        </div>
      </div>

      <div class="domain-guide-step">
        <div class="domain-guide-num">2</div>
        <div class="domain-guide-step-body">
          <h3>מוסיפים אותו ב-Netlify</h3>
          <p>נכנסים לחשבון ה-Netlify שלכם (אותו חשבון שתפסתם בו את האתר), ובהגדרות האתר לוחצים <b>Add custom domain</b> ומזינים את הכתובת שקניתם. Netlify יציג רשימה של 4 כתובות בשם <b>Name servers</b> (כתובת שרת — מעין תעודת זהות שמקשרת בין השם שלכם לאתר) — משאירים את זה פתוח בצד.</p>
        </div>
      </div>

      <div class="domain-guide-step">
        <div class="domain-guide-num">3</div>
        <div class="domain-guide-step-body">
          <h3>מחברים בין השניים</h3>
          <p>חוזרים לאתר שבו קניתם את הדומיין, מחפשים אזור בשם <b>Name Servers</b> (או "שרתי שמות"), ומחליפים את מה שכתוב שם בארבעת הכתובות שקיבלתם מ-Netlify בשלב הקודם. תוך כמה שעות (לפעמים עד יממה) הכתובת החדשה שלכם תתחיל לעבוד.</p>
        </div>
      </div>

      <div class="domain-guide-note">לא בטוחים באיזה שלב אתם? גם ב-Box וגם ב-LiveDNS יש תמיכה טלפונית בעברית שיכולה לעזור להגדיר את זה תוך כמה דקות.</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("domain-guide-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
}
