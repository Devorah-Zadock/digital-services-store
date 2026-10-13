#!/usr/bin/env python3
"""Browser tests for the free tools: tax-calculator.html and sign.html.

Serves this repository on a free local port and drives the real pages in
Chromium. Every request to another host (Google Fonts, Supabase…) is
aborted, so the run needs no network and proves the tools work offline:

    python3 tests/tools/e2e_tools.py

Needs Python Playwright and a Chromium (CHROMIUM_PATH, else the sandbox's
/opt/pw-browsers/chromium-1194 build, else Playwright's own).
Exit code 1 if any check fails.
"""
import functools, http.server, os, re, socket, socketserver, sys, tempfile, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
CHROMIUM = os.environ.get("CHROMIUM_PATH") or (DEFAULT_CHROME if os.path.exists(DEFAULT_CHROME) else None)

RESULTS = []
def check(name, ok, info=""):
    RESULTS.append((bool(ok), name, str(info)[:240]))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  [{str(info)[:240]}]"), flush=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

def serve():
    port = free_port()
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{port}"


def open_page(browser, base, path, width, lang="he"):
    ctx = browser.new_context(viewport={"width": width, "height": 900}, accept_downloads=True,
                              device_scale_factor=2 if width < 500 else 1)
    ctx.add_init_script(f"try {{ localStorage.setItem('deskkit_lang', '{lang}'); }} catch (e) {{}}")
    # Offline: anything not served by the local server is aborted.
    ctx.route(re.compile(r"^(?!http://127\.0\.0\.1).*"), lambda route: route.abort())
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    def on_console(msg):
        # Aborted third-party requests log "Failed to load resource" — that's
        # this harness blocking the network, not a page bug.
        if msg.type == "error" and "Failed to load resource" not in msg.text and "net::ERR" not in msg.text:
            errors.append("console: " + msg.text)
    page.on("console", on_console)
    page.goto(f"{base}/{path}", wait_until="load")
    page.wait_for_timeout(400)
    return ctx, page, errors


def no_overflow(page):
    return page.evaluate("() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })")


def test_layout(browser, base):
    for path in ("tax-calculator.html", "sign.html", "tools.html"):
        for width in (375, 1280):
            ctx, page, errors = open_page(browser, base, path, width)
            m = no_overflow(page)
            check(f"{path} @{width}px: no JS errors", not errors, errors)
            check(f"{path} @{width}px: no horizontal overflow", m["sw"] <= m["iw"], m)
            ctx.close()


def money_text(page, sel):
    return page.locator(sel).inner_text().replace("‎", "").replace("‏", "").strip()


def test_calculator(browser, base):
    ctx, page, errors = open_page(browser, base, "tax-calculator.html", 1280)
    # Default inputs: revenue 180,000, expenses 30,000, 2.25 points →
    # net 120,860.71/yr, 10,071.73/mo (worked by hand in tests/tools/tax-calc.test.js).
    check("calculator: default net per year", money_text(page, "#tc-se-net-year") == "120,861 ₪", money_text(page, "#tc-se-net-year"))
    check("calculator: default net per month", money_text(page, "#tc-se-net-month") == "10,072 ₪", money_text(page, "#tc-se-net-month"))
    check("calculator: breakdown shows 3 bracket rows + the NI-deduction row", page.locator("#tc-se-table tr.ft-sub").count() == 4,
          page.locator("#tc-se-table tr.ft-sub").count())

    # Typing updates live: 900,000 revenue, no expenses → surtax row appears.
    page.fill("#tc-se-revenue", "900000")
    page.fill("#tc-se-expenses", "0")
    check("calculator: high income → net 509,316", money_text(page, "#tc-se-net-year") == "509,316 ₪", money_text(page, "#tc-se-net-year"))
    check("calculator: surtax row shown", "מס יסף" in page.locator("#tc-se-table").inner_text())

    # Woman radio sets 2.75 points.
    page.fill("#tc-se-revenue", "30000")
    page.check("input[name='tc-se-gender'][value='woman']", force=True)
    check("calculator: woman → 2.75 points", page.input_value("#tc-se-points") == "2.75", page.input_value("#tc-se-points"))
    check("calculator: low income woman → net 26,820", money_text(page, "#tc-se-net-year") == "26,820 ₪", money_text(page, "#tc-se-net-year"))

    # VAT tab.
    page.click("#tc-tab-vat")
    check("calculator: VAT panel visible", page.locator("#tc-panel-vat").is_visible())
    page.fill("#tc-vat-revenue", "11000")
    status = page.locator("#tc-vat-status").inner_text()
    check("calculator: 11,000/month is over the patur ceiling by 9,167", "9,167" in status and "עוסק מורשה" in status, status)

    # Salaried tab.
    page.click("#tc-tab-sal")
    page.fill("#tc-sal-gross", "15000")
    check("calculator: salaried 15,000 → net 12,212", money_text(page, "#tc-sal-net-month") == "12,212 ₪", money_text(page, "#tc-sal-net-month"))

    # Keyboard: arrow keys move between tabs (RTL: ArrowLeft = next).
    page.focus("#tc-tab-se")
    page.keyboard.press("ArrowLeft")
    check("calculator: arrow key moves to next tab", page.evaluate("document.activeElement.id") == "tc-tab-vat")

    # English mode re-renders JS-built results.
    page.click("#lang-toggle")
    page.wait_for_timeout(200)
    check("calculator: English mode", "Net" in page.locator("#tc-sal-results").inner_text() and page.evaluate("document.documentElement.dir") == "ltr")
    check("calculator: no JS errors during use", not errors, errors)
    ctx.close()


def draw(page, sel, points):
    # Mouse coordinates are viewport-relative: the pad must be on screen.
    page.locator(sel).scroll_into_view_if_needed()
    box = page.locator(sel).bounding_box()
    page.mouse.move(box["x"] + box["width"] * points[0][0], box["y"] + box["height"] * points[0][1])
    page.mouse.down()
    for (fx, fy) in points[1:]:
        page.mouse.move(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy, steps=6)
    page.mouse.up()


STROKE_A = [(0.15, 0.6), (0.25, 0.3), (0.35, 0.7), (0.45, 0.35), (0.55, 0.65)]
STROKE_B = [(0.6, 0.5), (0.75, 0.45), (0.9, 0.55)]


def test_signature(browser, base, width):
    ctx, page, errors = open_page(browser, base, "sign.html", width)
    canvas = "#sg-pad-box canvas"
    empty = lambda: page.evaluate("window.dkSignPad.isEmpty()")
    tag = f"@{width}px"
    check(f"sign {tag}: pad starts empty", empty())
    check(f"sign {tag}: canvas backing store is devicePixelRatio-aware",
          page.evaluate("(() => { const c = document.querySelector('#sg-pad-box canvas'); return Math.abs(c.width - c.getBoundingClientRect().width * devicePixelRatio) <= 1; })()"))

    # Page must not scroll while drawing (touch-action:none on the canvas).
    check(f"sign {tag}: canvas has touch-action none", page.eval_on_selector(canvas, "c => getComputedStyle(c).touchAction") == "none")

    draw(page, canvas, STROKE_A)
    check(f"sign {tag}: drawing makes isEmpty() false", not empty())
    ink = page.evaluate("(() => { const c = document.querySelector('#sg-pad-box canvas'); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for (let i=3;i<d.length;i+=4) if (d[i]>0) n++; return n; })()")
    check(f"sign {tag}: ink pixels on canvas", ink > 50, ink)

    draw(page, canvas, STROKE_B)
    page.click("#sg-undo")
    check(f"sign {tag}: undo removes only the last stroke", not empty())
    page.click("#sg-undo")
    check(f"sign {tag}: second undo empties the pad", empty())

    draw(page, canvas, STROKE_A)
    page.click("#sg-clear")
    check(f"sign {tag}: clear empties the pad", empty())

    # Download buttons with an empty pad show an error, not a file.
    page.click("#sg-png")
    check(f"sign {tag}: PNG with empty pad shows error", "err" in (page.get_attribute("#sg-msg", "class") or ""))

    # Blue ink, then resize: drawing survives.
    page.click(".ft-swatch[data-color='#1D4ED8']")
    draw(page, canvas, STROKE_A)
    page.set_viewport_size({"width": width + 40 if width < 500 else width - 300, "height": 900})
    page.wait_for_timeout(300)
    check(f"sign {tag}: drawing survives a resize", not empty() and page.evaluate("(() => { const c = document.querySelector('#sg-pad-box canvas'); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; for (let i=3;i<d.length;i+=4) if (d[i]>0) return true; return false; })()"))
    page.set_viewport_size({"width": width, "height": 900})
    page.wait_for_timeout(300)

    tmp = tempfile.mkdtemp(prefix="dk-sign-")
    with page.expect_download() as dl:
        page.click("#sg-png")
    png = os.path.join(tmp, "sig.png")
    dl.value.save_as(png)
    data = open(png, "rb").read()
    check(f"sign {tag}: PNG download is a non-empty PNG", len(data) > 200 and data[:8] == b"\x89PNG\r\n\x1a\n", len(data))

    page.fill("#sg-title", "הסכם עבודה — עיצוב לוגו")
    page.fill("#sg-text", "\n".join(f"{i}. הצד השני מתחייב לספק את העבודה בזמן ובאיכות שסוכמה (Logo v{i})." for i in range(1, 91)))
    page.fill("#sg-name", "ישראלה ישראלי")
    check(f"sign {tag}: date defaults to today", re.match(r"^\d{4}-\d{2}-\d{2}$", page.input_value("#sg-date") or "") is not None)
    with page.expect_download(timeout=30000) as dl:
        page.click("#sg-pdf")
    pdf = os.path.join(tmp, "doc.pdf")
    dl.value.save_as(pdf)
    data = open(pdf, "rb").read()
    pages = len(re.findall(rb"/Type\s*/Page[^s]", data))
    check(f"sign {tag}: PDF download starts with %PDF", data[:4] == b"%PDF", data[:8])
    check(f"sign {tag}: long agreement spans more than one PDF page", pages >= 2, pages)
    check(f"sign {tag}: PDF filename", dl.value.suggested_filename.endswith(".pdf"), dl.value.suggested_filename)
    m = no_overflow(page)
    check(f"sign {tag}: no horizontal overflow after use", m["sw"] <= m["iw"], m)
    check(f"sign {tag}: no JS errors during use", not errors, errors)
    ctx.close()


def main():
    httpd, base = serve()
    try:
        with sync_playwright() as p:
            kw = {"executable_path": CHROMIUM} if CHROMIUM else {}
            browser = p.chromium.launch(**kw)
            test_layout(browser, base)
            test_calculator(browser, base)
            test_signature(browser, base, 1280)
            test_signature(browser, base, 375)
            browser.close()
    finally:
        httpd.shutdown()
    failed = [r for r in RESULTS if not r[0]]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
