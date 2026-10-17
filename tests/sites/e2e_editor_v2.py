#!/usr/bin/env python3
"""Browser tests for the on-canvas website editor (sites.html ->
js/builder-shell.js + js/builder-shell-panels.js).

Runs the real page from this repository in Chromium against a MOCKED
Supabase (no network, no real accounts, no real data) — the same harness
as tests/sites/e2e_seo_moods.py:

    python3 tests/sites/e2e_editor_v2.py

Runs against the REAL renderer and section library (js/site-templates.js,
js/site-sections.js) — text weight/spacing/width, the editable hero button,
hero photo fit/focus, site-wide button/heading/background design. One
session blocks site-sections.js to prove the editor still works (with "add
section" hidden) without it.

Screenshots: $SHOT_DIR (default: the session scratchpad editor-v2 folder).
Exit code 1 if any check fails.
"""
import base64, json, os, re, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from e2e_seo_moods import Backend, CHROMIUM, REF, ROOT, SB, offline, serve, session  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

SHOTS = os.environ.get("SHOT_DIR") or "/tmp/claude-0/-home-user-digital-services-store/e635228d-a5aa-5b43-b4d1-a501e4f97463/scratchpad/editor-v2"
os.makedirs(SHOTS, exist_ok=True)
FRAME = "document.getElementById('bshell-canvas-iframe')"
CDOC = FRAME + ".contentDocument"

RESULTS = []
def check(name, ok, info=""):
    RESULTS.append((bool(ok), name, str(info)[:500]))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  [{str(info)[:500]}]"), flush=True)

def shot(pg, name):
    pg.wait_for_timeout(250)
    pg.screenshot(path=os.path.join(SHOTS, name + ".png"))


def png_bytes(w=64, h=48, rgb=(20, 184, 166)):
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    def chunk(t, data): return struct.pack(">I", len(data)) + t + data + struct.pack(">I", zlib.crc32(t + data) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


class Be(Backend):
    """The shared mock + a switch to make saves fail, and image uploads."""
    def __init__(self):
        super().__init__()
        self.fail = False
        self.uploads = []
    def handle(self, route):
        req = route.request
        url = req.url
        if "/rest/v1/site_projects" in url and req.method == "POST" and self.fail:
            return route.fulfill(status=500, content_type="application/json", body=json.dumps({"message": "boom"}))
        if "/storage/v1/object/" in url and req.method in ("POST", "PUT"):
            path = url.split("/storage/v1/object/", 1)[1].split("?")[0]
            self.uploads.append(path)
            return route.fulfill(status=200, content_type="application/json", body=json.dumps({"Key": path, "Id": "x"}))
        return super().handle(route)


def project(**extra):
    data = {
        "schemaVersion": 1, "businessName": "סטודיו גל", "tagline": "עיצוב פנים לבתים", "about": "אנחנו מעצבים בתים.",
        "primaryColor": "#15803D", "fontFamily": "", "phone": "050-1234567", "whatsapp": "", "email": "hello@example.co.il", "address": "תל אביב",
        "services": [{"name": "תכנון", "desc": "תכנון מלא", "price": "100"}, {"name": "ליווי", "desc": "ליווי צמוד", "price": ""}, {"name": "סטיילינג", "desc": "לפני מכירה", "price": "300"}],
        "headings": {"services": "", "about": "", "contact": ""}, "pages": {"about": False, "contact": False},
        "heroImage": "", "heroImages": [], "videoUrl": "", "heroVideoBg": False, "textStyles": {},
    }
    data.update(extra)
    return data


def open_editor(br, port, template, data, width=1400, height=950, lib=True, be=None, ls=None, reuse=None):
    be = be or Be()
    if reuse is None:
        be.rows["p1"] = {"id": "p1", "user_id": be.uid, "template": template, "status": "draft", "data": data,
                         "publish_count": 0, "published_url": None, "updated_at": "2020-01-01T00:00:00Z"}
    ctx = br.new_context(viewport={"width": width, "height": height})
    ctx.route("**/*", offline(port))
    if not lib:  # the editor without the section library
        ctx.route("**/js/site-sections.js*", lambda r: r.fulfill(status=200, content_type="text/javascript", body="/* blocked by the test */"))
    # lead-intake is pilot-gated: the inline form is offered only to Automate accounts
    ctx.add_init_script(script="window.DK_AUTOMATE_ENABLED = true;")
    pg = ctx.new_page()
    pg.errors = []
    # Sandboxed preview thumbnails block the TEST's own init script (it runs in every frame) — not a page error.
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.on("console", lambda m: pg.errors.append("console: " + m.text) if m.type == "error" and "sandboxed" not in m.text and "Failed to load resource" not in m.text else None)
    pg.route(SB + "/**", be.handle)
    base = f"http://127.0.0.1:{port}"
    pg.goto(f"{base}/index.html")
    s = session(be.uid)
    extra_ls = "".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(v)});" for k, v in (ls or {}).items())
    pg.evaluate(f"localStorage.clear(); localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(s))}); localStorage.setItem('deskkit_lang','he'); localStorage.setItem('deskkit_cookie_ok','1');" + extra_ls)
    pg.goto(f"{base}/sites.html?site=p1", wait_until="networkidle")
    wait_ready(pg)
    return ctx, pg, be


def wait_ready(pg):
    pg.wait_for_function("document.getElementById('bshell-root').classList.contains('active')", timeout=20000)
    pg.wait_for_function("!document.getElementById('auth-gate-overlay')", timeout=20000)
    pg.wait_for_function(f"{CDOC} && {CDOC}.querySelector('[data-bshell-top]') && !document.querySelector('.bshell-canvas-buffer')", timeout=20000)
    pg.wait_for_timeout(500)


def settle(pg, ms=200):
    pg.wait_for_function("!document.querySelector('.bshell-canvas-buffer')", timeout=10000)
    pg.wait_for_timeout(ms)


def d(pg, expr="siteState.data"):
    return pg.evaluate(f"(v => v === undefined ? null : JSON.parse(JSON.stringify(v)))({expr})")


def hover(pg, selector, dx=0.5, dy=0.3):
    pg.evaluate(f"{CDOC}.querySelector({json.dumps(selector)}).scrollIntoView({{block:'center'}})")
    pg.wait_for_timeout(250)
    box = pg.frame_locator("#bshell-canvas-iframe").locator(selector).first.bounding_box()
    pg.mouse.move(box["x"] + box["width"] * dx, box["y"] + box["height"] * dy)
    pg.mouse.move(box["x"] + box["width"] * dx + 3, box["y"] + box["height"] * dy + 3)
    pg.wait_for_timeout(200)
    return box


def close_panel(pg):
    if pg.is_visible("#bsx-panel-close"):
        pg.click("#bsx-panel-close")
        pg.wait_for_timeout(100)


def visible_keys(pg):
    return pg.evaluate("activeBlocksForPage(siteState.data, siteState.template, 'index')")


def wait_saved(pg, be, pred, timeout=8000):
    """Waits until the backend row satisfies pred(saved_data)."""
    steps = timeout // 200
    for _ in range(steps):
        if pred(be.rows.get("p1", {}).get("data") or {}):
            return True
        pg.wait_for_timeout(200)
    return False


# Can the page be scrolled sideways at all? (body content under the editor is clipped by html)
NO_OVERFLOW = """() => { const de = document.documentElement; const y = scrollY; scrollTo(400, y); const sx = scrollX; scrollTo(0, y);
  return Math.max(de.scrollWidth - de.clientWidth, sx); }"""


def run(br, port):
    # ================================================= 1. workspace on load
    ctx, pg, be = open_editor(br, port, "local-service", project(), width=1280, height=860)
    st = pg.evaluate("""(() => ({
      panelHidden: document.getElementById('bsx-panel').hidden,
      oldHier: !!document.getElementById('bshell-hier'), oldProps: !!document.getElementById('bshell-props'),
      sidebarMounted: document.body.classList.contains('dk-app-sidebar-mounted'),
      collapsed: document.body.classList.contains('dk-app-sidebar-collapsed'),
      sbWidth: (document.getElementById('dk-app-sidebar') || {}).offsetWidth,
      sel: bsxSel, toolbars: [...document.querySelectorAll('.bsx-tools')].filter(t => !t.hidden).length,
    }))()""")
    check("Clean workspace: no side panel, no hierarchy/properties columns, nothing selected, no toolbars",
          st["panelHidden"] and not st["oldHier"] and not st["oldProps"] and st["sel"] is None and st["toolbars"] == 0, st)
    check("The DeskKit sidebar stays, collapsed to its icon rail inside the editor", st["sidebarMounted"] and st["collapsed"] and st["sbWidth"] and st["sbWidth"] <= 72, st)
    geo = pg.evaluate("""(() => { const f = document.getElementById('bshell-canvas-iframe').getBoundingClientRect(); const s = document.getElementById('bsx-stage').getBoundingClientRect();
      return { left: f.left - s.left, right: s.right - f.right, w: f.width, sw: s.width, h: f.height }; })()""")
    check("The site is centred on the stage at a comfortable size", abs(geo["left"] - geo["right"]) < 4 and geo["w"] > 900 and geo["h"] > 600, geo)
    shot(pg, "01_workspace_1280")
    pg.click("#bsx-sidebar-btn")
    pg.wait_for_timeout(300)
    opened = pg.evaluate("[document.body.classList.contains('dk-app-sidebar-collapsed'), localStorage.getItem('dk_sidebar_collapsed_builder'), document.getElementById('dk-app-sidebar').offsetWidth]")
    check("Sidebar toggle in the top bar opens it (and remembers the choice per viewer)", opened[0] is False and opened[1] == "0" and opened[2] > 150, opened)
    shot(pg, "02_sidebar_open")
    pg.click("#bsx-sidebar-btn")
    pg.wait_for_timeout(300)
    check("…and closes it again", pg.evaluate("document.body.classList.contains('dk-app-sidebar-collapsed') && localStorage.getItem('dk_sidebar_collapsed_builder') === '1'"))
    check("Elsewhere the sidebar keeps its own (open) default", pg.evaluate("localStorage.getItem('dk_sidebar_collapsed') === null"))
    top = pg.evaluate("""(() => ['bsx-back','bshell-top-status','bshell-save-btn','bshell-undo-btn','bshell-redo-btn','bshell-preview-btn','bshell-device-row','bshell-publish-btn','bsx-help-btn','bsx-more-btn','bsx-structure-btn']
      .map(id => [id, !!document.getElementById(id) && document.getElementById(id).offsetParent !== null]))()""")
    check("Top bar: back, save status + save, undo/redo, preview, devices, structure, help, more, publish", all(v for _, v in top if _ != "bshell-top-status"), top)
    pg.click("#bsx-help-btn")
    tips = pg.locator("#bsx-help li").count()
    check("Help '?' is a short popover (4-5 tips)", 4 <= tips <= 5, tips)
    pg.keyboard.press("Escape")
    pg.click("#bsx-more-btn")
    items = pg.evaluate("[...document.querySelectorAll('#bsx-more-menu [data-menu]')].map(b => b.dataset.menu)")
    check("The actions menu keeps the AI helper, SEO, design, business, settings", all(k in items for k in ["ai", "seo", "design", "business", "settings"]), items)
    pg.keyboard.press("Escape")
    check("No JS errors (workspace)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ================================================= 2. text editing + style toolbar (with renderer extensions)
    ctx, pg, be = open_editor(br, port, "local-service", project())
    fr = pg.frame_locator("#bshell-canvas-iframe")
    pg.evaluate(f"{FRAME}.contentWindow.__mark = 1")
    fr.locator('[data-textkey="heading-heroTitle"]').first.click()
    pg.wait_for_timeout(200)
    st = pg.evaluate(f"({{ k: bsxSel && bsxSel.kind, key: bsxSel && bsxSel.key, editing: !!bsxEdit, ce: {CDOC}.querySelector('[data-textkey=\"heading-heroTitle\"]').getAttribute('contenteditable') }})")
    check("Clicking a heading selects it and makes it editable right on the canvas", st["k"] == "text" and st["key"] == "heading-heroTitle" and st["editing"] and st["ce"] in ("plaintext-only", "true"), st)
    tb = pg.evaluate("[...document.querySelectorAll('.bsx-tools:not(.bsx-sectools):not([hidden]) [data-act]')].map(b => b.dataset.act)")
    check("Its floating toolbar: font, size, colour, bold, alignment, more", all(a in tb for a in ["font", "size", "color", "bold", "align", "text-more"]), tb)
    shot(pg, "03_text_selected")
    pg.keyboard.press("Control+A")
    pg.keyboard.type("עיצוב שמרגיש בית")
    pg.wait_for_timeout(150)
    check("Typing writes d.headings.heroTitle live", d(pg, "siteState.data.headings.heroTitle") == "עיצוב שמרגיש בית")
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(250)
    after = pg.evaluate(f"({{ t: {CDOC}.querySelector('[data-textkey=\"heading-heroTitle\"]').textContent, editing: !!bsxEdit, nl: siteState.data.headings.heroTitle.includes('\\n'), mark: {FRAME}.contentWindow.__mark }})")
    check("Enter on a one-line heading finishes editing (no line break), canvas patched in place", after["t"] == "עיצוב שמרגיש בית" and not after["editing"] and not after["nl"] and after["mark"] == 1, after)
    # Escape cancels
    fr.locator('[data-textkey="tagline"]').first.click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("טיוטה")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)
    check("Escape cancels the edit (data and canvas back to before)", d(pg, "siteState.data.tagline") == "עיצוב פנים לבתים"
          and pg.evaluate(f"{CDOC}.querySelector('[data-textkey=\"tagline\"]').textContent") == "עיצוב פנים לבתים")
    # multiline about: Enter inserts a line break
    fr.locator('[data-textkey="aboutText"]').first.click()
    pg.keyboard.press("End")
    pg.keyboard.press("Enter")
    pg.keyboard.type("שורה שנייה")
    pg.wait_for_timeout(100)
    check("Enter in the about text inserts a line break", d(pg, "siteState.data.about").endswith("\nשורה שנייה"), d(pg, "siteState.data.about"))
    # paste is plain text
    pg.evaluate(f"""(() => {{ const el = {CDOC}.querySelector('[data-textkey="aboutText"]'); const dt = new DataTransfer(); dt.setData('text/plain', ' <b>מודגש</b>'); dt.setData('text/html', '<b>מודגש</b>');
      el.dispatchEvent(new ClipboardEvent('paste', {{ clipboardData: dt, bubbles: true, cancelable: true }})); }})()""")
    pg.wait_for_timeout(100)
    check("Paste inserts plain text only", "<b>מודגש</b>" in d(pg, "siteState.data.about") and pg.evaluate(f"!{CDOC}.querySelector('[data-textkey=\"aboutText\"] b')"))
    pg.keyboard.press("Escape")
    # style toolbar on the hero heading
    fr.locator('[data-textkey="heading-heroTitle"]').first.click()
    pg.wait_for_timeout(150)
    pg.click('.bsx-tools [data-act="font"]')
    pg.click('.bsx-pop [data-font="rubik"]')
    settle(pg)
    pg.click('.bsx-tools [data-act="size"]')
    pg.click('.bsx-pop [data-size="56"]')
    settle(pg)
    pg.click('.bsx-tools [data-act="color"]')
    pg.click('.bsx-pop [data-color="#7C3AED"]')
    settle(pg)
    pg.click('.bsx-tools [data-act="bold"]')
    settle(pg)
    pg.click('.bsx-tools [data-act="align"]')
    pg.click('.bsx-pop [data-align="start"]')
    settle(pg)
    ts = d(pg, "siteState.data.textStyles['heading-heroTitle']")
    check("Style toolbar writes font/size/colour/weight/alignment to d.textStyles", ts == {"font": "rubik", "size": "56", "color": "7C3AED", "weight": "700", "align": "right"}, ts)
    cs = pg.evaluate(f"(() => {{ const el = {CDOC}.querySelector('[data-textkey=\"heading-heroTitle\"]'); const c = getComputedStyle(el); return [c.fontFamily, c.fontSize, c.color, c.fontWeight, el.getBoundingClientRect().right]; }})()")
    check("…and the canvas renders them", "Rubik" in cs[0] and cs[1] == "56px" and cs[2] == "rgb(124, 58, 237)" and cs[3] == "700", cs)
    html = pg.evaluate("currentSiteHtml('index')")
    check("…and so does the published HTML (no editor markup in it)", "font-size:56px" in html and "color:#7C3AED" in html and "font-weight:700" in html
          and "data-bshell" not in html and "contenteditable" not in html and "bsx" not in html, re.findall(r'data-textkey="heading-heroTitle"[^>]*', html)[:1])
    shot(pg, "04_text_styled")
    pg.click('.bsx-tools [data-act="text-more"]')
    pg.wait_for_selector("#bsx-panel:not([hidden]) #bsx-ts-lh")
    pg.select_option("#bsx-ts-lh", "1.7")
    settle(pg)
    check("'More' opens the one side panel with advanced options (line spacing saved)", d(pg, "siteState.data.textStyles['heading-heroTitle'].lineHeight") == "1.7"
          and pg.locator(".bsx-panel:not([hidden])").count() == 1)
    shot(pg, "05_text_panel")
    close_panel(pg)
    # services item: click one service -> edit THAT one
    fr.locator('[data-svc-idx="1"] h3').first.click(force=True)
    pg.wait_for_timeout(150)
    st = pg.evaluate("({ k: bsxSel.kind, svc: bsxSel.svc, field: bsxSel.field, editing: !!bsxEdit })")
    check("Clicking a service's name selects THAT service and edits its name in place", st == {"k": "item", "svc": 1, "field": "name", "editing": True}, st)
    pg.keyboard.press("End")
    pg.keyboard.type(" אישי")
    pg.keyboard.press("Enter")
    check("…typing changes d.services[1].name", d(pg, "siteState.data.services[1].name") == "ליווי אישי")
    fr.locator('[data-svc-idx="1"]').first.click(force=True, position={"x": 8, "y": 8})
    pg.wait_for_timeout(150)
    pg.click('.bsx-tools [data-act="item-up"]')
    settle(pg)
    check("Item toolbar: move earlier", [s["name"] for s in d(pg, "siteState.data.services")] == ["ליווי אישי", "תכנון", "סטיילינג"])
    pg.click('.bsx-tools [data-act="item-dup"]')
    settle(pg)
    check("Item toolbar: duplicate", [s["name"] for s in d(pg, "siteState.data.services")] == ["ליווי אישי", "ליווי אישי", "תכנון", "סטיילינג"])
    pg.click('.bsx-tools [data-act="item-del"]')
    pg.click(".bsx-modal [data-yes]")
    settle(pg)
    check("Item toolbar: delete (with confirm)", len(d(pg, "siteState.data.services")) == 3)
    shot(pg, "06_item_toolbar")
    check("No JS errors (text session)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ================================================= 3. buttons, images, contact details
    hero_img = f"http://127.0.0.1:{port}/images/previews/site-studio.webp"
    ctx, pg, be = open_editor(br, port, "local-service", project(heroImage=hero_img))
    fr = pg.frame_locator("#bshell-canvas-iframe")
    fr.locator(".ls-cta").first.click()
    pg.wait_for_timeout(150)
    check("Clicking the hero button selects it as a button", pg.evaluate("bsxSel.kind === 'button' && bsxSel.btn === 'heroCta'"))
    pg.click('.bsx-tools [data-act="btn-label"]')
    pg.wait_for_timeout(150)
    pg.keyboard.type("קבעו פגישה")
    pg.keyboard.press("Enter")
    settle(pg)
    check("Button label edits in place -> d.heroCta.label, canvas updated", d(pg, "siteState.data.heroCta.label") == "קבעו פגישה"
          and pg.evaluate(f"{CDOC}.querySelector('.ls-cta').textContent.trim()") == "קבעו פגישה")
    fr.locator(".ls-cta").first.click()
    pg.click('.bsx-tools [data-act="btn-action"]')
    pg.wait_for_selector("#bsx-btn-type")
    pg.select_option("#bsx-btn-type", "link")
    settle(pg)
    pg.fill("#bsx-btn-value", "https://example.com/book")
    pg.wait_for_timeout(500)
    settle(pg)
    check("Button action: link (panel)", d(pg, "siteState.data.heroCta.action") == {"kind": "link", "value": "https://example.com/book"}
          and pg.evaluate(f"{CDOC}.querySelector('.ls-cta').getAttribute('href')") == "https://example.com/book")
    pg.select_option("#bsx-btn-type", "scroll")
    settle(pg)
    opts = pg.evaluate("[...document.querySelectorAll('#bsx-btn-target option')].map(o => o.value)")
    pg.select_option("#bsx-btn-target", "ls-contact")
    settle(pg)
    a = d(pg, "siteState.data.heroCta.action")
    check("Button action: scroll to a section (list from the current order)", a == {"kind": "scroll", "value": "ls-contact"} and "ls-about" in opts
          and pg.evaluate(f"{CDOC}.querySelector('.ls-cta').getAttribute('href')") == "#ls-contact", (a, opts))
    pg.select_option("#bsx-btn-type", "tel")
    settle(pg)
    check("Button action: phone call (empty number = the business phone)", pg.evaluate(f"{CDOC}.querySelector('.ls-cta').getAttribute('href')") == "tel:0501234567")
    pg.fill("#bsx-btn-bg", "#112233")
    pg.dispatch_event("#bsx-btn-bg", "input")
    settle(pg)
    pg.click('#bsx-panel [data-seg="btn-radius"] [data-val="0"]')
    settle(pg)
    check("Button colour + corner radius saved and rendered", d(pg, "siteState.data.heroCta.style") == {"bg": "#112233", "radius": "0"}
          and pg.evaluate(f"getComputedStyle({CDOC}.querySelector('.ls-cta')).borderTopLeftRadius") == "0px"
          and pg.evaluate(f"getComputedStyle({CDOC}.querySelector('.ls-cta')).backgroundColor") == "rgb(17, 34, 51)")
    shot(pg, "07_button_panel")
    close_panel(pg)
    # never navigates
    pg.evaluate("siteState.data.heroCta.action = { kind: 'link', value: 'https://example.com/x' }; bshellRenderCanvas(); 0")
    settle(pg)
    pages_before = len(ctx.pages)
    url_before = pg.url
    fr.locator(".ls-cta").first.click()
    fr.locator('.ls-phone-pill').first.click()
    fr.locator(".ls-rail a").nth(1).click()
    pg.wait_for_timeout(500)
    check("Clicking buttons/links in the canvas never navigates, dials or opens a tab",
          len(ctx.pages) == pages_before and pg.url == url_before and pg.evaluate(f"{FRAME}.contentWindow.location.href") == "about:srcdoc")
    # image
    fr.locator(".ls-hero img").first.click()
    pg.wait_for_timeout(150)
    check("Clicking the hero photo selects it as an image", pg.evaluate("bsxSel.kind === 'image' && bsxSel.img === 'hero'"))
    tb = pg.evaluate("[...document.querySelectorAll('.bsx-tools:not(.bsx-sectools):not([hidden]) [data-act]')].map(b => b.dataset.act)")
    check("Image toolbar: replace, choose uploaded, fit, more, remove", all(x in tb for x in ["img-replace", "img-library", "img-fit", "img-more", "img-remove"]), tb)
    shot(pg, "08_image_toolbar")
    with pg.expect_file_chooser() as fc:
        pg.click('.bsx-tools [data-act="img-replace"]')
    fc.value.set_files(files=[{"name": "new-photo.png", "mimeType": "image/png", "buffer": png_bytes()}])
    pg.wait_for_function("siteState.data.heroImage && siteState.data.heroImage.includes('/storage/v1/object/public/site-images/')", timeout=10000)
    settle(pg)
    new_src = d(pg, "siteState.data.heroImage")
    check("Replace uploads through the existing pipeline (mocked storage) and swaps the image",
          be.uploads and "/hero-" in be.uploads[-1] and pg.evaluate(f"{CDOC}.querySelector('.ls-hero img').getAttribute('src')") == new_src, (be.uploads, new_src))
    fr.locator(".ls-hero img").first.click()
    pg.click('.bsx-tools [data-act="img-fit"]')
    settle(pg)
    check("Fit: 'whole image' saved (d.imageStyles.hero.fit) and rendered", d(pg, "siteState.data.imageStyles") == {"hero": {"fit": "contain"}}
          and pg.evaluate(f"getComputedStyle({CDOC}.querySelector('.ls-hero img')).objectFit") == "contain")
    pg.click('.bsx-tools [data-act="img-more"]')
    pg.wait_for_selector("#bshell-set-hero-alt")
    pg.fill("#bshell-set-hero-alt", "הצוות שלנו")
    pg.click('.bsx-focal [data-focal="50% 0%"]')
    settle(pg)
    check("Alt text and focal point saved", d(pg, "siteState.data.heroAlt") == "הצוות שלנו" and d(pg, "siteState.data.imageStyles.hero.focal") == "50% 0%"
          and pg.evaluate(f"{CDOC}.querySelector('.ls-hero img').alt") == "הצוות שלנו")
    shot(pg, "09_image_panel")
    close_panel(pg)
    # quota error message
    pg.evaluate("window.__origUpload = uploadSiteImage; uploadSiteImage = async () => { siteLastUploadError = 'quota'; return null; }; 0")
    fr.locator(".ls-hero img").first.click()
    with pg.expect_file_chooser() as fc:
        pg.click('.bsx-tools [data-act="img-replace"]')
    fc.value.set_files(files=[{"name": "big.png", "mimeType": "image/png", "buffer": png_bytes()}])
    pg.wait_for_timeout(400)
    check("A full storage allowance shows the existing quota message", "נגמר מקום האחסון" in pg.inner_text("#bsx-toasts") and d(pg, "siteState.data.heroImage") == new_src)
    pg.evaluate("uploadSiteImage = window.__origUpload; 0")
    # contact details: global
    pg.evaluate(f"{CDOC}.querySelector('#ls-contact').scrollIntoView({{block:'center'}})")
    pg.wait_for_timeout(200)
    fr.locator(".ls-contact .line", has_text="050-1234567").first.click()
    pg.wait_for_timeout(200)
    st = pg.evaluate("({ k: bsxSel.kind, b: bsxSel.bind, focus: document.activeElement && document.activeElement.dataset.tfield, note: document.querySelector('.bsx-tools .bsx-tools-note') && document.querySelector('.bsx-tools .bsx-tools-note').textContent })")
    check("Clicking the phone edits the GLOBAL phone field, with the 'business detail' note", st["k"] == "contact" and st["b"] == "phone" and st["focus"] == "contact" and "פרט עסקי" in (st["note"] or ""), st)
    shot(pg, "10_contact_toolbar")
    pg.keyboard.press("Control+A")
    pg.keyboard.type("052-7654321")
    pg.wait_for_timeout(400)
    occ = pg.evaluate(f"(() => {{ const doc = {CDOC}; return {{ topbar: doc.querySelector('.ls-topbar .phone').textContent, pill: doc.querySelector('.ls-phone-pill').textContent, line: doc.querySelector('.ls-contact .line').textContent, old: doc.body.innerHTML.includes('050-1234567') }}; }})()")
    check("…d.phone changes and every occurrence on the page updates live", d(pg, "siteState.data.phone") == "052-7654321" and occ["topbar"] == "052-7654321"
          and occ["pill"] == "052-7654321" and "052-7654321" in occ["line"] and not occ["old"], occ)
    pg.keyboard.press("Enter")
    fr.locator(".ls-contact .line", has_text="hello@example.co.il").first.click()
    pg.wait_for_timeout(150)
    pg.keyboard.press("Control+A")
    pg.keyboard.type("studio@example.co.il")
    pg.wait_for_timeout(300)
    check("Email edits update d.email everywhere", d(pg, "siteState.data.email") == "studio@example.co.il" and "studio@example.co.il" in pg.evaluate(f"{CDOC}.querySelector('#ls-contact').textContent"))
    pg.keyboard.press("Escape")
    check("No JS errors (buttons/images/contact)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ================================================= 4. sections (blank template: short sections)
    ctx, pg, be = open_editor(br, port, "blank", project(blockVariants={"hero": "centered", "services": "grid"}), height=1100)
    fr = pg.frame_locator("#bshell-canvas-iframe")
    check("Starts with the template's own sections", visible_keys(pg) == ["hero", "services", "about", "contact"], visible_keys(pg))
    hover(pg, "#ls-about")
    st = pg.evaluate("({ frame: !document.querySelector('.bsx-box.is-sec').hidden, tools: [...document.querySelectorAll('.bsx-sectools [data-sec]')].map(b => b.dataset.sec), ins: [...document.querySelectorAll('.bsx-insert')].filter(b => !b.hidden).map(b => b.dataset.at) })")
    check("Hovering a section: frame, section toolbar (drag/up/down/hide/settings) and '+' above and below",
          st["frame"] and all(t in st["tools"] for t in ["drag", "up", "down", "hide", "settings"]) and st["ins"] == ["2", "3"], st)
    shot(pg, "11_section_hover")
    pg.click('.bsx-insert[data-at="3"]')
    pg.wait_for_selector(".bsx-modal .bsx-card")
    pg.wait_for_timeout(900)
    cards = pg.evaluate("[...document.querySelectorAll('.bsx-modal .bsx-card')].length")
    prev = pg.evaluate("[...document.querySelectorAll('.bsx-modal .bsx-card-prev iframe')].length")
    cats = pg.evaluate("[...document.querySelectorAll('.bsx-modal .bsx-cat')].map(b => b.textContent.trim())")
    check("Add-section gallery: categories on the side, cards with live previews", cards == 18 and prev >= 4 and len(cats) >= 4, (cards, prev, cats))
    shot(pg, "12_add_section_gallery")
    pg.click('.bsx-cat[data-cat="אמון"]')
    pg.wait_for_timeout(300)
    check("Category filter", pg.evaluate("[...document.querySelectorAll('.bsx-modal .bsx-card')].map(c => c.dataset.type)") == ["testimonials", "testimonials", "faq", "faq"],
          pg.evaluate("[...document.querySelectorAll('.bsx-modal .bsx-card')].map(c => c.dataset.type)"))
    pg.click('.bsx-cat[data-cat=""]')
    pg.click('.bsx-card[data-type="features"][data-variant="cards"]')
    settle(pg, 500)
    keys = visible_keys(pg)
    fid = keys[3][2:] if len(keys) > 3 and keys[3].startswith("x:") else None
    check("The section is inserted exactly where '+' was clicked (after 'about'), then selected and shown",
          fid and keys == ["hero", "services", "about", "x:" + fid, "contact"] and pg.evaluate("bsxSel && bsxSel.kind === 'section' && bsxSel.secKey") == "x:" + fid
          and pg.evaluate(f"!!{CDOC}.querySelector('[data-dk-sec=\"{fid}\"]')"), keys)
    shot(pg, "13_section_added")
    # edit custom text + item
    fr.locator(f'[data-dk-sec="{fid}"] [data-dk-field="title"]').click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("שלוש סיבות")
    pg.keyboard.press("Enter")
    check("Custom section text edits go through siteSectionSetField", d(pg, f"siteState.data.sections['{fid}'].content.title") == "שלוש סיבות")
    fr.locator(f'[data-dk-sec="{fid}"] [data-dk-field="title"]').click()
    pg.click('.bsx-tools [data-act="size"]')
    pg.click('.bsx-pop [data-size="42"]')
    settle(pg)
    check("Custom section text styles go to d.sections[id].styles[path]", d(pg, f"siteState.data.sections['{fid}'].styles") == {"title": {"size": "42"}}
          and pg.evaluate(f"getComputedStyle({CDOC}.querySelector('[data-dk-sec=\"{fid}\"] [data-dk-field=\"title\"]')).fontSize") == "42px")
    fr.locator(f'[data-dk-sec="{fid}"] [data-dk-item="items.0"]').click(position={"x": 6, "y": 6})
    pg.click('.bsx-tools [data-act="item-add"]')
    settle(pg)
    check("List item toolbar: add item (siteSectionSetField on the array)", len(d(pg, f"siteState.data.sections['{fid}'].content.items")) == 4)
    # up/down
    hover(pg, f'[data-dk-sec="{fid}"]')
    pg.click('.bsx-sectools [data-sec="up"]')
    settle(pg, 400)
    check("Section 'move up' changes d.blockOrder", visible_keys(pg) == ["hero", "services", "x:" + fid, "about", "contact"], visible_keys(pg))
    # drag & drop: contact to right after hero
    pg.keyboard.press("Escape")
    hover(pg, "#ls-contact", dy=0.5)
    grip = pg.locator('.bsx-sectools [data-sec="drag"]').bounding_box()
    pg.mouse.move(grip["x"] + grip["width"] / 2, grip["y"] + grip["height"] / 2)
    pg.mouse.down()
    pg.evaluate(f"{CDOC}.defaultView.scrollTo(0, 0)")
    pg.wait_for_timeout(150)
    sv = pg.frame_locator("#bshell-canvas-iframe").locator('[data-textkey="heading-services"]').first.bounding_box()
    pg.mouse.move(sv["x"], sv["y"] - 30, steps=8)
    pg.wait_for_timeout(150)
    dl = pg.evaluate("!document.querySelector('.bsx-drop-line').hidden")
    shot(pg, "14_drag_drop")
    pg.mouse.up()
    settle(pg, 400)
    check("Drag & drop with a drop indicator reorders d.blockOrder", dl and visible_keys(pg) == ["hero", "contact", "services", "x:" + fid, "about"], (dl, visible_keys(pg)))
    # keyboard reorder on the grip
    hover(pg, "#ls-contact", dy=0.5)
    pg.focus('.bsx-sectools [data-sec="drag"]')
    pg.keyboard.press("ArrowDown")
    settle(pg, 400)
    check("Keyboard: arrow keys on the drag handle move the section", visible_keys(pg) == ["hero", "services", "contact", "x:" + fid, "about"], visible_keys(pg))
    # variant
    content_before = d(pg, f"siteState.data.sections['{fid}'].content")
    hover(pg, f'[data-dk-sec="{fid}"]')
    pg.click('.bsx-sectools [data-sec="variant"]')
    pg.wait_for_selector('.bsx-modal .bsx-card[data-variant="list"] iframe')
    pg.wait_for_timeout(600)
    shot(pg, "15_variant_picker")
    has_own = pg.evaluate("""(() => { const f = document.querySelector('.bsx-modal .bsx-card[data-variant="list"] iframe'); return !!f.contentDocument && f.contentDocument.body.textContent.includes('שלוש סיבות'); })()""")
    check("'Change design' shows each design as a live preview WITH the section's own content", has_own)
    pg.click('.bsx-modal .bsx-card[data-variant="list"]')
    settle(pg, 400)
    check("Variant change keeps the content", d(pg, f"siteState.data.sections['{fid}'].variant") == "list"
          and d(pg, f"siteState.data.sections['{fid}'].content") == content_before
          and pg.evaluate(f"{CDOC}.querySelector('[data-dk-sec=\"{fid}\"]').classList.contains('dks-v-list')"))
    # duplicate
    hover(pg, f'[data-dk-sec="{fid}"]')
    pg.click('.bsx-sectools [data-sec="duplicate"]')
    settle(pg, 400)
    keys = visible_keys(pg)
    dup = keys[keys.index("x:" + fid) + 1] if "x:" + fid in keys else None
    check("Duplicate (custom sections only) inserts a copy right after it", dup and dup.startswith("x:") and dup != "x:" + fid
          and d(pg, f"siteState.data.sections['{dup[2:]}'].content") == d(pg, f"siteState.data.sections['{fid}'].content"), keys)
    # delete with confirm + undo toast
    before = d(pg)
    hover(pg, f'[data-dk-sec="{dup[2:]}"]')
    pg.click('.bsx-sectools [data-sec="delete"]')
    pg.wait_for_selector(".bsx-modal [data-yes]")
    shot(pg, "16_delete_confirm")
    pg.click(".bsx-modal [data-yes]")
    settle(pg, 400)
    gone = dup not in visible_keys(pg) and dup[2:] not in (d(pg, "siteState.data.sections") or {})
    toast = pg.inner_text("#bsx-toasts")
    check("Delete asks first (section has content), then removes it with an Undo toast", gone and "החלק נמחק" in toast and "ביטול" in toast, toast)
    shot(pg, "17_delete_toast")
    pg.click("#bsx-toasts button")
    settle(pg, 400)
    check("Undo from the toast restores the section and its place", d(pg) == before)
    # Delete key on a selected custom section
    pg.evaluate(f"bsxSelectSection('{dup}')")
    pg.keyboard.press("Delete")
    pg.wait_for_selector(".bsx-modal [data-yes]")
    pg.click(".bsx-modal [data-no]")
    pg.wait_for_timeout(200)
    check("Delete key on a selected section asks first (Cancel keeps it)", dup in visible_keys(pg))
    # hide built-in + bring back from structure
    hover(pg, "[data-textkey='heading-services']")
    pg.click('.bsx-sectools [data-sec="hide"]')
    settle(pg, 400)
    check("Hiding a built-in section hides it (recoverable, not destroyed)", "services" not in visible_keys(pg) and d(pg, "siteState.data.hiddenBlocks") == {"services": True}
          and len(d(pg, "siteState.data.services")) == 3 and pg.evaluate("bsxSel === null"))
    pg.click("#bsx-structure-btn")
    pg.wait_for_selector('#bsx-panel [data-row="services"]')
    shot(pg, "18_structure_drawer")
    row = pg.evaluate("(() => { const r = document.querySelector('#bsx-panel [data-row=\"services\"]'); return [r.classList.contains('is-hidden'), r.textContent.includes('מוסתר')]; })()")
    check("Site structure lists it as hidden", row == [True, True], row)
    pg.click('#bsx-panel [data-struct="show"][data-key="services"]')
    settle(pg, 400)
    check("…and 'show' brings it back in place", "services" in visible_keys(pg) and not d(pg, "siteState.data.hiddenBlocks").get("services"))
    order_before = visible_keys(pg)
    pg.click(f'#bsx-panel [data-struct="down"][data-key="hero"]')
    settle(pg, 400)
    check("Structure drawer: move down", visible_keys(pg)[:2] == [order_before[1], "hero"], visible_keys(pg))
    pg.click(f'#bsx-panel [data-struct="up"][data-key="hero"]')
    settle(pg, 400)
    # structure drag
    rows = pg.locator("#bsx-panel [data-struct-grip]")
    g0 = pg.locator('#bsx-panel [data-struct-grip="about"]').bounding_box()
    t0 = pg.locator('#bsx-panel [data-row="hero"]').bounding_box()
    pg.mouse.move(g0["x"] + 5, g0["y"] + 5)
    pg.mouse.down()
    pg.mouse.move(t0["x"] + 20, t0["y"] + t0["height"] * 0.8, steps=6)
    pg.mouse.up()
    settle(pg, 400)
    check("Structure drawer: drag to reorder", visible_keys(pg)[:2] == ["hero", "about"], visible_keys(pg))
    close_panel(pg)
    # בס"ד from the dock
    on_before = bool(d(pg, "siteState.data.showBsd") or False)
    pg.click('#bsx-dock [data-dock="bsd"]')
    settle(pg)
    check("בס\"ד: one click in the quick-actions dock turns it on (and it shows on the site)", d(pg, "siteState.data.showBsd") is (not on_before)
          and pg.evaluate(f"!!{CDOC}.querySelector('.site-bsd')") and pg.get_attribute('#bsx-dock [data-dock="bsd"]', "aria-pressed") == "true")
    shot(pg, "19_bsd_on")
    pg.click('#bsx-dock [data-dock="bsd"]')
    settle(pg)
    check("…and one more click turns it off", not d(pg, "siteState.data.showBsd") and pg.evaluate(f"!{CDOC}.querySelector('.site-bsd')"))
    # lead form
    pg.click('#bsx-dock [data-dock="form"]')
    settle(pg, 600)
    lf = [k for k in visible_keys(pg) if k.startswith("x:") and d(pg, f"siteState.data.sections['{k[2:]}'].type") == "leadForm"]
    pg.wait_for_selector("#bsx-panel:not([hidden]) #bsx-form-title")
    check("'Contact form' in the dock inserts a leadForm section and opens its settings", len(lf) == 1 and pg.evaluate("bsxSel && bsxSel.secKey") == lf[0])
    lid = lf[0][2:]
    pg.fill("#bsx-form-title", "רוצים הצעת מחיר?")
    pg.fill("#bsx-form-subtitle", "נחזור תוך יום")
    pg.select_option('[data-form-field="email"]', "required")
    pg.select_option('[data-form-field="message"]', "off")
    pg.fill("#bsx-form-button", "שלחו לי")
    pg.fill("#bsx-form-success", "תודה רבה!")
    settle(pg, 300)
    c = d(pg, f"siteState.data.sections['{lid}'].content")
    check("Form settings: title, subtitle, required/optional/off fields, button, success text saved",
          c["title"] == "רוצים הצעת מחיר?" and c["subtitle"] == "נחזור תוך יום" and c["fields"]["email"] == "required" and c["fields"]["message"] == "off"
          and c["buttonLabel"] == "שלחו לי" and c["successText"] == "תודה רבה!", c)
    form = pg.evaluate(f"(() => {{ const s = {CDOC}.querySelector('[data-dk-sec=\"{lid}\"]'); return [s.querySelector('[data-dk-field=\"title\"]').textContent, !!s.querySelector('[name=message]'), s.querySelector('[name=email]').required]; }})()")
    check("…and the form on the canvas follows them", form == ["רוצים הצעת מחיר?", False, True], form)
    pg.select_option('[data-form-field="phone"]', "off")
    pg.select_option('[data-form-field="email"]', "off")
    settle(pg, 300)
    f2 = d(pg, f"siteState.data.sections['{lid}'].content.fields")
    check("Phone and email can't both be off (normalized by the library)", not (f2["phone"] == "off" and f2["email"] == "off"), f2)
    shot(pg, "20_lead_form_settings")
    fr.locator(f'[data-dk-sec="{lid}"] [data-dk-btn="buttonLabel"]').click()
    pg.wait_for_timeout(300)
    check("Clicking the form's button never submits (selects it instead)", pg.evaluate("bsxSel && bsxSel.kind === 'button'") and pg.evaluate(f"{FRAME}.contentWindow.location.href") == "about:srcdoc")
    pg.keyboard.press("Escape")
    close_panel(pg)
    # undo / redo across everything
    hist = pg.evaluate("bshellUndoStack.length")
    snapshot_now = d(pg)
    for _ in range(3):
        pg.keyboard.press("Control+z")
        settle(pg, 150)
    undone = d(pg)
    for _ in range(3):
        pg.keyboard.press("Control+Shift+z")
        settle(pg, 150)
    check("Undo (Ctrl+Z) x3 then Redo (Ctrl+Shift+Z) x3 returns to the same data", undone != snapshot_now and d(pg) == snapshot_now and hist >= 10, hist)
    pg.keyboard.press("Control+z")
    settle(pg, 150)
    pg.keyboard.press("Control+y")
    settle(pg, 150)
    check("Ctrl+Y redoes too", d(pg) == snapshot_now)
    # autosave + status, failure + retry
    check("Autosave reaches the backend", wait_saved(pg, be, lambda s: s.get("sections", {}).get(lid, {}).get("content", {}).get("title") == "רוצים הצעת מחיר?"))
    pg.wait_for_function("document.getElementById('bshell-top-status').dataset.state === 'saved'", timeout=8000)
    check("Status shows 'נשמר'", pg.inner_text("#bshell-top-status").strip() == "נשמר")
    be.fail = True
    fr.locator('[data-textkey="tagline"]').first.click()
    pg.keyboard.press("End")
    pg.keyboard.type("!")
    st1 = pg.evaluate("document.getElementById('bshell-top-status').dataset.state")
    pg.keyboard.press("Enter")
    pg.wait_for_function("document.getElementById('bshell-top-status').dataset.state === 'failed'", timeout=8000)
    shot(pg, "21_save_failed")
    check("A failed save says 'לא נשמר — ננסה שוב' with a retry button", st1 == "saving" and "לא נשמר" in pg.inner_text("#bshell-top-status") and pg.is_visible("#bsx-save-retry"), st1)
    be.fail = False
    pg.click("#bsx-save-retry")
    pg.wait_for_function("document.getElementById('bshell-top-status').dataset.state === 'saved'", timeout=8000)
    check("Retry saves the edit made while offline", be.rows["p1"]["data"]["tagline"].endswith("!") and not pg.is_visible("#bsx-save-retry"))
    # reload restores
    saved = json.loads(json.dumps(be.rows["p1"]["data"]))
    pg.reload(wait_until="networkidle")
    wait_ready(pg)
    pg.wait_for_function("siteState.data && siteState.data.sections", timeout=10000)
    re_d = d(pg)
    check("Reload opens exactly the saved project (sections, order, styles)", all(re_d.get(k) == saved.get(k) for k in ["sections", "blockOrder", "textStyles", "headings", "tagline", "services", "hiddenBlocks"]),
          [k for k in saved if re_d.get(k) != saved.get(k)])
    check("…and the canvas shows the added sections", pg.evaluate(f"{CDOC}.querySelectorAll('[data-dk-sec]').length") == len(saved.get("sections", {})))
    check("No JS errors (sections session)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ================================================= 5. design panel, business, settings, preview, video
    ctx, pg, be = open_editor(br, port, "local-service", project(textStyles={"businessName": {"color": "E11D48"}}))
    fr = pg.frame_locator("#bshell-canvas-iframe")
    pg.click('#bsx-dock [data-dock="design"]')
    pg.wait_for_selector("#bshell-set-color")
    shot(pg, "22_design_panel")
    pg.click('#bsx-preset-colors [data-preset="#2563EB"]')
    settle(pg)
    check("Design: a palette colour sets d.primaryColor and keeps per-text colours", d(pg, "siteState.data.primaryColor") == "#2563EB"
          and d(pg, "siteState.data.textStyles.businessName.color") == "E11D48")
    pg.select_option("#bshell-set-font", "assistant")
    pg.select_option("#bsx-design-heading", "suezOne")
    settle(pg)
    pg.click('[data-seg="design-btn-radius"] [data-val="pill"]')
    settle(pg)
    pg.click('[data-seg="design-bg"] [data-val="warm"]')
    settle(pg)
    check("Design: body font, heading font, button corners, background tone saved", d(pg, "siteState.data.fontFamily") == "assistant"
          and d(pg, "siteState.data.design") == {"headingFont": "suezOne", "buttonRadius": "pill", "bgTone": "warm"})
    check("…and rendered", pg.evaluate(f"getComputedStyle({CDOC}.querySelector('.ls-cta')).borderTopLeftRadius") == "999px"
          and pg.evaluate(f"getComputedStyle({CDOC}.body).backgroundColor") == "rgb(251, 247, 241)"
          and "Suez One" in pg.evaluate(f"getComputedStyle({CDOC}.querySelector('h1')).fontFamily"))
    pg.click('.bshell-mood-btn[data-mood="warm"]')
    settle(pg)
    check("Moods still work from the design panel (and reset per-text colours, with a restore button)", d(pg, "siteState.data.mood") == "warm"
          and not d(pg, "siteState.data.textStyles.businessName").get("color") and pg.is_visible("#bshell-mood-restore"))
    pg.click("#bshell-mood-restore")
    settle(pg)
    check("'↩ חזרה לעיצוב הקודם' restores the per-text colour", d(pg, "siteState.data.textStyles.businessName.color") == "E11D48" and not d(pg, "siteState.data.mood"))
    pg.click('#bsx-dock [data-dock="contact"]')
    pg.wait_for_selector("#bshell-set-phone")
    check("Only one panel at a time (dock switches the panel)", pg.locator(".bsx-panel:not([hidden])").count() == 1 and pg.evaluate("bsxPanelMode") == "business")
    pg.fill("#bshell-set-phone", "03-5555555")
    settle(pg)
    check("Business details panel edits the global phone", "03-5555555" in pg.evaluate(f"{CDOC}.body.textContent"))
    shot(pg, "23_business_panel")
    pg.click('#bsx-dock [data-dock="settings"]')
    pg.wait_for_selector("#bshell-set-site-lang")
    ids = ["bshell-set-site-lang", "bshell-set-page-about", "bshell-set-page-contact", "bshell-set-bsd", "bshell-set-hide-copyright", "bsx-set-has-whatsapp"]
    check("Advanced settings keep every site-wide switch", all(pg.locator("#" + i).count() == 1 for i in ids))
    pg.click("#bshell-set-hide-copyright")
    settle(pg)
    check("…e.g. hiding the copyright line", d(pg, "siteState.data.hideCopyright") is True and "©" not in pg.evaluate(f"{CDOC}.querySelector('.ls-footer').textContent"))
    shot(pg, "24_settings_panel")
    pg.click('#bsx-panel [data-goto="seo"]')
    pg.wait_for_selector("#bshell-seo-title")
    check("SEO stays reachable", pg.is_visible("#bshell-serp"))
    close_panel(pg)
    pg.click('#bsx-dock [data-dock="video"]')
    pg.wait_for_timeout(400)
    if pg.locator(".bsx-modal .bsx-card").count():
        pg.click('.bsx-modal .bsx-card[data-type="video"]')
        settle(pg, 500)
        pg.wait_for_selector("#bsx-panel:not([hidden]) #bsx-video-url")
        pg.fill("#bsx-video-url", "https://youtu.be/dQw4w9WgXcQ")
        settle(pg, 700)
        vid = [k for k in visible_keys(pg) if k.startswith("x:")][0][2:]
        check("Video: added as a section, URL saved and embedded live", d(pg, f"siteState.data.sections['{vid}'].content.url") == "https://youtu.be/dQw4w9WgXcQ"
              and pg.evaluate(f"!!{CDOC}.querySelector('[data-dk-sec=\"{vid}\"] iframe[src*=\"youtube.com/embed/dQw4w9WgXcQ\"]')"))
        shot(pg, "25_video_panel")
        close_panel(pg)
    # built-in video via panel (no library) is covered in the no-library session below
    pg.click("#bshell-preview-btn")
    pg.wait_for_selector("#bsx-preview-frame")
    pg.wait_for_timeout(500)
    st = pg.evaluate("({ ov: [...document.querySelectorAll('.bsx-overlay > *')].every(e => e.hidden || getComputedStyle(e).display === 'none' || getComputedStyle(document.getElementById('bsx-overlay')).display === 'none'), dock: getComputedStyle(document.getElementById('bsx-dock')).display })")
    check("Preview: the clean site with no editor tools over it", st["dock"] == "none", st)
    shot(pg, "26_preview")
    pg.click('#bsx-preview-bar [data-pv="exit"]')
    for dev, w in (("mobile", 390), ("tablet", 768), ("desktop", None)):
        pg.click(f'#bshell-device-row [data-device="{dev}"]')
        pg.wait_for_timeout(450)
        fw = pg.evaluate(f"{FRAME}.getBoundingClientRect().width")
        if w:
            check(f"Device switch: {dev} canvas is {w}px", abs(fw - w) < 2, fw)
        if dev == "mobile":
            fr.locator('[data-textkey="heading-heroTitle"]').first.click()
            pg.wait_for_timeout(250)
            shot(pg, "27_mobile_canvas_editing")
            inside = pg.evaluate("""(() => { const t = document.querySelector('.bsx-tools:not(.bsx-sectools):not([hidden])'); const s = document.getElementById('bsx-stage').getBoundingClientRect(); const r = t.getBoundingClientRect(); return r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1; })()""")
            check("Toolbars stay inside the visible area on the mobile canvas", inside)
            pg.keyboard.press("Escape")
            pg.keyboard.press("Escape")
    check("No JS errors (design/settings session)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ================================================= 6. no library: add-section hidden, legacy paths still work
    ctx, pg, be = open_editor(br, port, "local-service", project(), lib=False)
    fr = pg.frame_locator("#bshell-canvas-iframe")
    hover(pg, "#ls-about")
    st = pg.evaluate("({ ins: [...document.querySelectorAll('.bsx-insert')].filter(b => !b.hidden).length, add: !!document.querySelector('#bsx-dock [data-dock=\"add\"]'), weight: !!document.querySelector('[data-act=\"bold\"]') })")
    check("Without the section library: no '+' / 'add section' (hidden, not broken)", st["ins"] == 0 and not st["add"], st)
    fr.locator('[data-textkey="heading-heroTitle"]').first.click()
    tb = pg.evaluate("[...document.querySelectorAll('.bsx-tools:not(.bsx-sectools):not([hidden]) [data-act]')].map(b => b.dataset.act)")
    check("…the text toolbar is complete without it too", all(a in tb for a in ["font", "size", "color", "bold", "align"]), tb)
    fr.locator(".ls-cta").first.click()
    pg.wait_for_timeout(150)
    tb = pg.evaluate("[...document.querySelectorAll('.bsx-tools:not(.bsx-sectools):not([hidden]) [data-act]')].map(b => b.dataset.act)")
    check("…and the hero button is editable (label, action, colour)", all(a in tb for a in ["btn-label", "btn-action", "btn-bg"]), tb)
    pg.keyboard.press("Escape")
    hover(pg, "#ls-about")
    pg.click('.bsx-sectools [data-sec="up"]')
    settle(pg, 400)
    check("Moving a built-in section works without the library", visible_keys(pg) == ["hero", "about", "services", "contact"], visible_keys(pg))
    pg.click('#bsx-dock [data-dock="video"]')
    pg.wait_for_selector("#bshell-set-video")
    pg.fill("#bshell-set-video", "https://youtu.be/dQw4w9WgXcQ")
    settle(pg, 700)
    check("Video (built-in d.videoUrl) with live preview in the panel and on the canvas",
          pg.evaluate(f"!!{CDOC}.querySelector('.site-video-wrap iframe')") and pg.evaluate("!!document.querySelector('#bsx-panel iframe[src*=\"youtube.com/embed\"]')"))
    close_panel(pg)
    pg.evaluate(f"{CDOC}.querySelector('.site-video-wrap').scrollIntoView({{block:'center'}})")
    pg.wait_for_timeout(200)
    fr.locator(".site-video-wrap").first.click(force=True)
    pg.wait_for_timeout(200)
    check("Clicking the video selects it (embedded players don't swallow the click)", pg.evaluate("bsxSel && bsxSel.kind === 'video'"))
    pg.click('.bsx-tools [data-act="video-remove"]')
    settle(pg)
    check("…and it can be removed", d(pg, "siteState.data.videoUrl") == "" and pg.evaluate(f"!{CDOC}.querySelector('.site-video-wrap')"))
    check("No JS errors (no-library session)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ================================================= 7. every template opens, edits, no console errors
    templates = None
    for lib in (False, True):
        ctx, pg, be = open_editor(br, port, "local-service", project(), lib=lib)
        templates = pg.evaluate("Object.keys(SITE_TEMPLATES)")
        ctx.close()
        bad = []
        for tpl in templates:
            extra = {"blockVariants": {"hero": "centered", "services": "grid"}} if tpl == "blank" else {}
            ctx, pg, be = open_editor(br, port, tpl, project(**extra), lib=lib)
            fr = pg.frame_locator("#bshell-canvas-iframe")
            errs = []
            try:
                pg.evaluate(f"{CDOC}.querySelector('[data-textkey=\"heading-heroTitle\"]').scrollIntoView({{block:'center'}})")
                fr.locator('[data-textkey="heading-heroTitle"]').first.click(force=True)
                pg.keyboard.press("Control+A")
                pg.keyboard.type("כותרת חדשה")
                pg.keyboard.press("Enter")
                settle(pg, 150)
                if d(pg, "siteState.data.headings.heroTitle") != "כותרת חדשה": errs.append("title")
                keys = pg.evaluate("bsxMap.keys")
                if len(keys) < 2: errs.append(f"sections {keys}")
                pg.evaluate("bsxSelectSection(bsxMap.keys[bsxMap.keys.length - 1], { scroll: true }); 0")
                pg.wait_for_timeout(900)
                if not pg.evaluate("!document.querySelector('.bsx-sectools').hidden"): errs.append("no section toolbar")
                if lib:
                    pg.evaluate("bsxInsertSection('faq', 'accordion', 1); 0")
                    settle(pg, 300)
                    if not pg.evaluate(f"!!{CDOC}.querySelector('[data-dk-type=\"faq\"]')"): errs.append("insert")
                    if pg.evaluate("bsxMap.keys[1].indexOf('x:')") != 0: errs.append(f"insert pos {pg.evaluate('bsxMap.keys')}")
            except Exception as e:  # noqa: BLE001
                errs.append(str(e)[:120])
            if errs or pg.errors: bad.append((tpl, errs, pg.errors[:2]))
            ctx.close()
        check(f"All {len(templates)} templates open, edit text, find their sections{' and add a section' if lib else ''} with no console errors" + (" (with library)" if lib else " (without library)"), not bad, bad[:4])

    # ================================================= 8. old-shape project: nothing lost
    old = {"businessName": "עסק ישן", "tagline": "מ-2023", "phone": "050-0000000", "services": [{"name": "א", "desc": "", "price": "5"}],
           "primaryColor": "#B8860B", "heroImage": "", "customLegacyField": {"keep": [1, 2, 3]}, "fontFamily": "rubik", "email": ""}
    ctx, pg, be = open_editor(br, port, "elegant", json.loads(json.dumps(old)))
    pg.click("#bshell-save-btn")
    pg.wait_for_function("document.getElementById('bshell-top-status').dataset.state === 'saved'", timeout=8000)
    saved = be.rows["p1"]["data"]
    lost = [k for k in old if saved.get(k) != old[k]]
    added = sorted(k for k in saved if k not in old)
    allowed = {"schemaVersion", "pages", "heroImages", "heroVideoBg", "headings", "textStyles", "blockOrder"}
    check("Old-shape project: open + save with no edits keeps every field (only additive keys)", not lost and set(added) <= allowed, (lost, added))
    check("No JS errors (old project)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ================================================= 9. widths: no sideways scroll, phone usability
    for w, h in ((1280, 800), (375, 812)):
        ctx, pg, be = open_editor(br, port, "local-service", project(), width=w, height=h)
        fr = pg.frame_locator("#bshell-canvas-iframe")
        over = [pg.evaluate(NO_OVERFLOW)]
        shot(pg, f"28_load_{w}")
        fr.locator('[data-textkey="heading-heroTitle"]').first.click(force=True)
        pg.wait_for_timeout(250)
        over.append(pg.evaluate(NO_OVERFLOW))
        tools_ok = pg.evaluate("""(() => [...document.querySelectorAll('.bsx-tools:not([hidden])')].every(t => { const r = t.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; }))()""")
        shot(pg, f"29_text_selected_{w}")
        pg.keyboard.press("Escape")
        pg.click('#bsx-dock [data-dock="design"]')
        pg.wait_for_selector("#bshell-set-color")
        pg.wait_for_timeout(300)
        over.append(pg.evaluate(NO_OVERFLOW))
        panel = pg.evaluate("(() => { const p = document.getElementById('bsx-panel').getBoundingClientRect(); const b = document.getElementById('bsx-panel-body'); return { w: p.width, top: p.top, h: innerHeight, sw: b.scrollWidth, cw: b.clientWidth }; })()")
        shot(pg, f"30_design_panel_{w}")
        if w == 375:
            check("375px: the panel is a bottom sheet (full width, lower part of the screen)", panel["w"] >= 370 and panel["top"] > panel["h"] * 0.3 and panel["sw"] <= panel["cw"] + 1, panel)
        else:
            check("1280px: the panel is a column next to the canvas (doesn't cover the site)", panel["w"] <= 360 and pg.evaluate(f"{FRAME}.getBoundingClientRect().right <= document.getElementById('bsx-panel').getBoundingClientRect().left + 1 || {FRAME}.getBoundingClientRect().left >= document.getElementById('bsx-panel').getBoundingClientRect().right - 1"), panel)
        close_panel(pg)
        if w == 375:
            pg.click('#bsx-dock [data-dock="add"]')
            pg.wait_for_selector(".bsx-modal .bsx-card")
            pg.wait_for_timeout(500)
            over.append(pg.evaluate(NO_OVERFLOW))
            mw = pg.evaluate("(() => { const m = document.querySelector('.bsx-modal'); return [m.scrollWidth <= m.clientWidth + 1, m.getBoundingClientRect().right <= innerWidth + 1]; })()")
            shot(pg, "31_add_gallery_375")
            check("375px: the add-section gallery fits the phone", all(mw), mw)
            pg.keyboard.press("Escape")
            top = pg.evaluate("(() => { const t = document.getElementById('bsx-top').getBoundingClientRect(); return [t.height, [...document.querySelectorAll('#bsx-top button, #bsx-top a')].filter(b => b.offsetParent).every(b => { const r = b.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })]; })()")
            check("375px: the top bar fits on one tidy row", top[0] <= 60 and top[1], top)
        check(f"{w}px: no horizontal page scroll in any state", max(over) <= 0, over)
        check(f"{w}px: toolbars stay on screen", tools_ok)
        check(f"No JS errors ({w}px)", not pg.errors, pg.errors[:3])
        ctx.close()

    # ================================================= 10. English UI
    ctx, pg, be = open_editor(br, port, "local-service", project(siteLang="en"), lib=True, ls={"deskkit_lang": "en"})
    pg.evaluate("localStorage.setItem('deskkit_lang','en')")
    pg.reload(wait_until="networkidle")
    wait_ready(pg)
    lbl = pg.evaluate("[document.getElementById('bshell-publish-btn').textContent, document.documentElement.dir, document.querySelector('#bsx-dock [data-dock=\"design\"]').textContent.trim()]")
    check("English UI: labels in English, LTR", lbl[0] == "Publish" and lbl[1] == "ltr" and lbl[2] == "Design", lbl)
    pg.frame_locator("#bshell-canvas-iframe").locator('[data-textkey="heading-heroTitle"]').first.click()
    pg.wait_for_timeout(200)
    shot(pg, "32_english_ltr")
    pg.click('.bsx-tools [data-act="align"]')
    pg.click('.bsx-pop [data-align="start"]')
    settle(pg)
    check("Alignment 'start' on an English site is stored as left", d(pg, "siteState.data.textStyles['heading-heroTitle'].align") == "left")
    check("No JS errors (English)", not pg.errors, pg.errors[:3])
    ctx.close()


def main():
    httpd, port = serve()
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path=CHROMIUM if os.path.exists(CHROMIUM) else None)
            try:
                run(br, port)
            finally:
                br.close()
    finally:
        httpd.shutdown()
    failed = [r for r in RESULTS if not r[0]]
    print(f"\n{len(RESULTS) - len(failed)} passed, {len(failed)} failed, {len(RESULTS)} checks  (screenshots: {SHOTS})")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
