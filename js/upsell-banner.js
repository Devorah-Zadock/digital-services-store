/* Shared, reusable upsell popup — a dismissible eye-catching card pointing
   free-tool users at the paid site builder (sites.html, 199 ₪ one-time).
   Self-contained and built on demand like domain-guide.js: nothing on a
   page pays for this until showUpsellBanner() is actually called.

   Deliberately not shown on every page load: called from specific,
   meaningful moments only (finishing a CV/quote, downloading a deck or
   xlsx template) — a popup on every single page would train people to
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

function showUpsellBanner(message, title) {
  if (upsellBannerRecentlySeen()) return;
  if (document.getElementById("upsell-banner")) return;

  const wrap = document.createElement("div");
  wrap.id = "upsell-banner";
  wrap.className = "upsell-popup-wrap no-print";
  wrap.innerHTML = `
    <div class="upsell-popup" role="dialog" aria-label="${title || "הצעה מיוחדת"}">
      <button type="button" class="upsell-popup-close" id="upsell-banner-close" aria-label="סגירה">✕</button>
      <div class="upsell-popup-icon">✨</div>
      <h4>${title || "שווה להכיר"}</h4>
      <p>${message}</p>
      <a href="sites.html?browse=1" class="btn btn-gold upsell-popup-cta">בניית אתר תדמית — 199 ₪</a>
    </div>
  `;
  document.body.appendChild(wrap);
  upsellBannerMarkSeen();
  document.getElementById("upsell-banner-close").addEventListener("click", () => wrap.remove());
}
