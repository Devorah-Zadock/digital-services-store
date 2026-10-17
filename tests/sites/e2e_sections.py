#!/usr/bin/env python3
"""Browser checks for the Section Library (js/site-sections.js):

    python3 tests/sites/e2e_sections.py

Renders (via `node tests/sites/sections_render.js --dump`) the home page of
a sample of light and dark templates with every section type and variant
inserted, serves them locally and, in Chromium at 360px and 1280px:
  * no horizontal overflow: the page is no wider than the same page without
    the sections (or the viewport), and nothing inside a section sticks out
    of the viewport
  * the FAQ accordion opens
  * the inline lead form shows per-field errors, then the "preview only"
    note — and NO request ever reaches supabase/functions (any such request
    fails the test)
Fully offline: every non-local request is answered with an empty response.
Needs Python Playwright and Chromium (CHROMIUM_PATH, or the default below).
Exit code 1 if any check fails.
"""
import functools, http.server, os, socketserver, subprocess, sys, tempfile, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CHROMIUM = os.environ.get("CHROMIUM_PATH") or "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
LIGHT = ["local-service", "bold", "brutal", "luxury3d", "bento", "elegant"]
DARK = ["studio", "noir", "neon", "cinematic", "playground"]

RESULTS = []
def check(name, ok, info=""):
    RESULTS.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  [{str(info)[:400]}]"), flush=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def main():
    out = tempfile.mkdtemp(prefix="dk-sections-")
    subprocess.run(["node", os.path.join(ROOT, "tests", "sites", "sections_render.js"), "--dump", out], check=True)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=out))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}/"
    function_calls = []

    def route(r):
        url = r.request.url
        if "/functions/" in url:
            function_calls.append(url)
            return r.abort()
        if url.startswith(base):
            return r.continue_()
        return r.fulfill(status=200, body="")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROMIUM if os.path.exists(CHROMIUM) else None)
        for width in (360, 1280):
            ctx = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            ctx.route("**/*", route)
            for tpl in LIGHT + DARK:
                for lang in ("he", "en"):
                    for kind in ("published", "preview"):
                        name = f"{kind}-{tpl}-{lang}@{width}"
                        pg = ctx.new_page()
                        errors = []
                        pg.on("pageerror", lambda e: errors.append(str(e)))
                        pg.goto(base + f"base-{tpl}-{lang}.html")
                        base_w = pg.evaluate("document.scrollingElement.scrollWidth")
                        pg.goto(base + f"{kind}-{tpl}-{lang}.html")
                        pg.wait_for_timeout(150)
                        w = pg.evaluate("[document.scrollingElement.scrollWidth, innerWidth]")
                        check(f"{name} no new horizontal overflow", w[0] <= max(w[1] + 1, base_w), f"{w} base={base_w}")
                        sticking = pg.evaluate("""() => {
                          const out = [];
                          document.querySelectorAll('[data-dk-sec]').forEach(sec => {
                            sec.querySelectorAll('*').forEach(el => {
                              if (el.closest('.dks-lf-hp')) return;
                              const r = el.getBoundingClientRect();
                              if (r.width && (r.left < -1 || r.right > innerWidth + 1)) out.push(sec.dataset.dkType + ' ' + el.tagName + '.' + el.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
                            });
                          });
                          return out.slice(0, 5);
                        }""")
                        check(f"{name} sections fit the viewport", not sticking, sticking)
                        types = pg.evaluate("[...new Set([...document.querySelectorAll('[data-dk-sec]')].map(s => s.dataset.dkType))].sort().join(',')")
                        check(f"{name} all section types rendered", types == "cta,faq,features,gallery,leadForm,richText,testimonials,textImage,video", types)
                        check(f"{name} no JS errors", not errors, errors)
                        if kind == "preview" and width == 360 or (kind == "published" and width == 1280):
                            # FAQ accordion opens
                            det = pg.locator(".dks-v-accordion details").first
                            det.scroll_into_view_if_needed()
                            det.locator("summary").click()
                            check(f"{name} FAQ opens", det.evaluate("e => e.open") is True)
                            # inline lead form: field errors, then preview-only note, no network
                            form = pg.locator(".dks-lf-form").first
                            form.scroll_into_view_if_needed()
                            form.locator("[data-dk-lead-send]").click()
                            pg.wait_for_timeout(50)
                            name_err = form.locator('[data-dk-err="name"]').inner_text()
                            phone_err = form.locator('[data-dk-err="phone"]').inner_text()
                            check(f"{name} lead form field errors", name_err.strip() and phone_err.strip()
                                  and form.locator('input[name="name"]').get_attribute("aria-invalid") == "true", (name_err, phone_err))
                            form.locator('input[name="name"]').fill("Test")
                            form.locator('input[name="phone"]').fill("12")
                            form.locator("[data-dk-lead-send]").click()
                            check(f"{name} lead form phone format error", form.locator('[data-dk-err="phone"]').inner_text().strip() != "")
                            form.locator('input[name="phone"]').fill("050-1234567")
                            form.locator("[data-dk-lead-send]").click()
                            pg.wait_for_timeout(100)
                            msg = form.locator("[data-dk-lead-msg]").inner_text()
                            check(f"{name} lead form preview-only note", ("preview" in msg.lower()) or ("תצוגה מקדימה" in msg), msg)
                            check(f"{name} input font-size 16px", form.locator('input[name="name"]').evaluate("e => getComputedStyle(e).fontSize") == "16px")
                            # the floating popup (same shared submit code) still works
                            pg.locator("#dk-lead-open").click()
                            pg.locator("#dk-lead-form .dk-lead-send").click()
                            check(f"{name} popup asks for a name", pg.locator("#dk-lead-msg").inner_text().strip() != "")
                            pg.locator("#dk-lead-name").fill("Test")
                            pg.locator("#dk-lead-email").fill("a@b.co")
                            pg.locator("#dk-lead-form .dk-lead-send").click()
                            pmsg = pg.locator("#dk-lead-msg").inner_text()
                            check(f"{name} popup preview-only note", ("preview" in pmsg.lower()) or ("תצוגה מקדימה" in pmsg), pmsg)
                        pg.close()
            ctx.close()
        browser.close()
    httpd.shutdown()
    check("no request ever reached supabase/functions", not function_calls, function_calls)
    print(f"{sum(RESULTS)}/{len(RESULTS)} checks passed")
    sys.exit(0 if all(RESULTS) else 1)


if __name__ == "__main__":
    main()
