/* Shared, reusable upsell banner — a dismissible bottom bar pointing
   free-tool users at the paid site builder (sites.html, 199 ₪ one-time).
   Self-contained and built on demand like domain-guide.js: nothing on a
   page pays for this until showUpsellBanner() is actually called.

   Deliberately not shown on every page load: called from specific,
   meaningful moments only (finishing a quote, downloading an xlsx
   template) — a banner on every single page would train people to
   ignore it. Dismissing it, or simply seeing it, quiets it for 24h via
   localStorage so it never nags on a fast succession of downloads. */

const UPSELL_BANNER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const UPSELL_BANNER_STORAGE_KEY = "deskkit_upsell_seen_at";

function upsellBannerRecentlySeen() {
  try {
    const seenAt = localStorage.getItem(UPSELL_BANNER_STORAGE_KEY);
    return !!seenAt && Date.now() - Number(seenAt) < UPSELL_BANNER_COOLDOWN_MS;
  } catch (e) {
    return false;
  }
}

function upsellBannerMarkSeen() {
  try { localStorage.setItem(UPSELL_BANNER_STORAGE_KEY, String(Date.now())); } catch (e) { /* ignore */ }
}

function showUpsellBanner(message) {
  if (upsellBannerRecentlySeen()) return;
  if (document.getElementById("upsell-banner")) return;
  if (document.querySelector(".cookie-notice")) return; // avoid stacking two bottom bars

  const bar = document.createElement("div");
  bar.id = "upsell-banner";
  bar.className = "upsell-banner no-print";
  bar.innerHTML = `
    <button type="button" class="upsell-banner-close" id="upsell-banner-close" aria-label="סגירה">✕</button>
    <span class="upsell-banner-icon">💡</span>
    <p>${message}</p>
    <a href="sites.html?browse=1" class="btn btn-gold upsell-banner-cta">בניית אתר תדמית — 199 ₪</a>
  `;
  document.body.appendChild(bar);
  upsellBannerMarkSeen();
  document.getElementById("upsell-banner-close").addEventListener("click", () => bar.remove());
}
