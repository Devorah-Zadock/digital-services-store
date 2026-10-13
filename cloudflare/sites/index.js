// DeskKit customer sites on Cloudflare — the replacement for Vercel's
// middleware.js + api/site-preview.js.
//
// Routed (see cloudflare/README.md) for every *.deskkit.co.il host except
// the ones DeskKit uses itself:
//   <slug>.deskkit.co.il/            → the site's index page
//   <slug>.deskkit.co.il/about       → about page (if published)
//   <slug>.deskkit.co.il/contact     → contact page (if published)
//   www.deskkit.co.il/...            → 301 to https://deskkit.co.il/...
//
// The published HTML is read through public.public_site_page() with the
// public anon key only (supabase/sql/public_site_page.sql) — there is no
// secret in this Worker. Each page is kept in Cloudflare's edge cache for
// 60 seconds, so a busy site doesn't hit Supabase on every visit.
//
// Images: the builder stores photos in Supabase Storage (bucket
// "site-images"). Served straight from there, every visitor's photo
// download counted against Supabase's monthly transfer allowance. Pages
// are now rewritten to load them from the site's own address
// (<slug>.deskkit.co.il/_img/<path>); this Worker fetches each file from
// Storage once per Cloudflare location and keeps it cached for 30 days.
// Uploaded file names are unique and never overwritten, so a cached copy
// can't go stale.

const APEX = "deskkit.co.il";
// First-level names DeskKit itself uses (mail, DNS-verified senders…) —
// never looked up as a customer site, whatever the DNS says.
const OWN_SUBDOMAINS = new Set([
  "www", "mail", "webmail", "ftp", "send", "rsend", "sites", "api", "admin",
  "app", "status", "cdn", "static", "assets", "email", "smtp", "imap", "pop",
]);
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const PAGES = new Set(["index", "about", "contact"]);
const EDGE_TTL_SECONDS = 60;
const IMG_PREFIX = "/_img/";
const IMG_TTL_SECONDS = 30 * 24 * 3600;
// "<user uuid>/<folder>/<file>.<ext>" — the only shape the builder writes.
const IMG_PATH_PATTERN = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}(?:\/[A-Za-z0-9._-]{1,200}){1,2}$/;
const IMG_TYPES = /^image\/(jpeg|png|webp|gif|avif)$/;

function storagePrefix(env) {
  return `${env.SUPABASE_URL}/storage/v1/object/public/site-images/`;
}

async function serveImage(request, env, ctx, path) {
  if (!IMG_PATH_PATTERN.test(path) || path.includes("..")) return notFound();
  const cacheKey = new Request(`https://img.${APEX}/${path}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  let res;
  try {
    res = await fetch(storagePrefix(env) + path);
  } catch (_e) {
    return new Response("temporarily unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  const type = (res.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (!res.ok || !IMG_TYPES.test(type)) return notFound();
  const out = new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": `public, max-age=${IMG_TTL_SECONDS}, immutable`,
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    },
  });
  if (request.method === "GET") ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

// Points the page's Storage image links at the site's own /_img/ path.
function rewriteImages(env, html) {
  return html.split(storagePrefix(env)).join(IMG_PREFIX);
}

function pageFromPath(pathname) {
  const clean = pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
  if (clean === "" || clean === "index") return "index";
  return PAGES.has(clean) ? clean : null;
}

function notFound() {
  return new Response("not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" },
  });
}

// "no-transform" keeps Cloudflare's zone features (e.g. the Web Analytics
// beacon it adds to DeskKit's own pages) out of customers' sites — their
// pages are served exactly as published.
function siteHeaders(extra) {
  const headers = {
    "Content-Type": "text/html; charset=UTF-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...extra,
  };
  if (headers["Cache-Control"]) headers["Cache-Control"] += ", no-transform";
  return headers;
}

async function loadPage(env, slug, page) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/public_site_page`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_slug: slug, p_page: page }),
  });
  if (!res.ok) throw new Error(`lookup failed: ${res.status}`);
  const html = await res.json();
  return typeof html === "string" && html ? html : null;
}

async function serveSite(request, env, ctx, slug, page) {
  // One cache entry per site page, whatever query string came with it.
  const cacheKey = new Request(`https://${slug}.${APEX}/__page/${page}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) {
    return new Response(hit.body, { status: 200, headers: siteHeaders({ "Cache-Control": "public, max-age=0", "X-DeskKit-Cache": "hit" }) });
  }

  let html;
  try {
    html = await loadPage(env, slug, page);
  } catch (_e) {
    return new Response("temporarily unavailable", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" },
    });
  }
  if (!html) return notFound();
  html = rewriteImages(env, html);

  const stored = new Response(html, { headers: siteHeaders({ "Cache-Control": `public, max-age=${EDGE_TTL_SECONDS}` }) });
  ctx.waitUntil(cache.put(cacheKey, stored));
  // The visitor's own browser always re-asks, so an owner who republishes
  // sees the change within a minute.
  return new Response(html, { status: 200, headers: siteHeaders({ "Cache-Control": "public, max-age=0", "X-DeskKit-Cache": "miss" }) });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    if (host === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }

    // Testing before the DNS switch: <worker>.workers.dev/?site=<slug>&page=about
    if (host.endsWith(".workers.dev") && env.ALLOW_PREVIEW === "1") {
      if (url.pathname.startsWith(IMG_PREFIX)) return serveImage(request, env, ctx, url.pathname.slice(IMG_PREFIX.length));
      const slug = (url.searchParams.get("site") || "").toLowerCase();
      const page = url.searchParams.get("page") || "index";
      if (!SLUG_PATTERN.test(slug) || !PAGES.has(page)) return notFound();
      return serveSite(request, env, ctx, slug, page);
    }

    const suffix = `.${APEX}`;
    if (!host.endsWith(suffix)) return notFound();
    const slug = host.slice(0, -suffix.length);
    if (!SLUG_PATTERN.test(slug) || OWN_SUBDOMAINS.has(slug)) return notFound();

    if (url.pathname.startsWith(IMG_PREFIX)) return serveImage(request, env, ctx, url.pathname.slice(IMG_PREFIX.length));
    const page = pageFromPath(url.pathname);
    if (!page) return notFound();
    return serveSite(request, env, ctx, slug, page);
  },
};
