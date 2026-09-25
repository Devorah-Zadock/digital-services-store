// Real subdomain routing for self-hosted customer sites (see
// api/site-preview.js and supabase/sql/hosted_site_pages*.sql).
//
// The first attempt at this used a `has: {type: "host"}` condition in
// vercel.json's `rewrites` — confirmed (via Vercel's own docs/community
// discussions, and by testing live: a real visit to a subdomain just
// served the main site's homepage instead) that plain vercel.json
// rewrites do NOT support host-based `has` conditions at all — that's a
// Next.js-only feature. Vercel's actual framework-agnostic mechanism for
// this is "Routing Middleware": a middleware.js at the project root,
// running on every request before the static/functions router.
//
// Written by hand instead of importing @vercel/functions's rewrite()/
// next() helpers, deliberately: this project has never had a
// package.json or an npm install step (pure static files + a couple of
// plain Node serverless functions in api/) — adding one now would change
// how Vercel builds the ENTIRE site, a much bigger risk than this file
// needs. rewrite()/next() turned out to just be a `Response` carrying a
// special `x-middleware-rewrite` / `x-middleware-next` header (confirmed
// by reading the package's own source) — reproduced directly below, so
// this stays a plain, dependency-free file like everything else here.
//
// A request to <slug>.sites.deskkit.co.il/<anything> gets rewritten to
// /api/site-preview?slug=<slug>&path=/<anything>, which already knows
// how to resolve index/about/contact from there (see resolvePageName in
// that file).
//
// Second branch, added for connect-custom-domain: a customer's OWN
// domain (e.g. www.theirbusiness.co.il) is registered on this same
// Vercel project via Vercel's API — Vercel only ever routes a request
// to this project if the host is one we (DeskKit, or a customer through
// us) explicitly added there, so ANY host that isn't one of DeskKit's
// own known domains and isn't a *.sites.deskkit.co.il subdomain must be
// a connected custom domain. Routed the same way, just with
// ?customDomain= instead of ?slug= — see api/site-preview.js's
// resolveSlug(), which looks it up in site_projects.custom_domain.
//
// Every DeskKit-owned host (deskkit.co.il, www, any *.vercel.app
// preview URL) passes straight through untouched — this must never
// affect the main site.

const SUBDOMAIN_PATTERN = /^([a-z0-9-]+)\.sites\.deskkit\.co\.il$/i;
const OWN_HOST_PATTERN = /^((www\.)?deskkit\.co\.il|sites\.deskkit\.co\.il)$|\.vercel\.app$/i;

export default function middleware(request) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const url = new URL(request.url);

  const subdomainMatch = SUBDOMAIN_PATTERN.exec(host);
  if (subdomainMatch) {
    const destination = new URL("/api/site-preview", url);
    destination.searchParams.set("slug", subdomainMatch[1]);
    destination.searchParams.set("path", url.pathname);
    return new Response(null, { headers: { "x-middleware-rewrite": destination.toString() } });
  }

  if (host && !OWN_HOST_PATTERN.test(host)) {
    const destination = new URL("/api/site-preview", url);
    destination.searchParams.set("customDomain", host);
    destination.searchParams.set("path", url.pathname);
    return new Response(null, { headers: { "x-middleware-rewrite": destination.toString() } });
  }

  return new Response(null, { headers: { "x-middleware-next": "1" } });
}
