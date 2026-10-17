#!/usr/bin/env python3
"""Browser tests for the website builder's editing UX (sites.html -> the
Builder Shell): the publish dialog's colours, design moods on every
template (+ "↩ חזרה לעיצוב הקודם"), in-place canvas updates while typing,
the plain-text בס"ד, and click-anything-to-edit organised by section.

Runs the real page from this repository in Chromium against a MOCKED
Supabase (no network, no real accounts, no real data) — the same harness
as tests/sites/e2e_seo_moods.py:

    python3 tests/sites/e2e_builder_ux.py

Screenshots go to $SHOT_DIR (default: /tmp/deskkit-builder-ux).
Exit code 1 if any check fails.
"""
import colorsys, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from e2e_seo_moods import Backend, CHROMIUM, REF, ROOT, SB, offline, serve, session  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

SHOTS = os.environ.get("SHOT_DIR") or "/tmp/deskkit-builder-ux"
os.makedirs(SHOTS, exist_ok=True)

RESULTS = []
def check(name, ok, info=""):
    RESULTS.append((bool(ok), name, str(info)[:400]))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  [{str(info)[:400]}]"), flush=True)

FRAME = "document.getElementById('bshell-canvas-iframe')"
OLD_PRIMARY = "#15803D"

def project(template, **extra):
    data = {
        "schemaVersion": 1, "businessName": "הייי בדיקה", "tagline": "שורת תיאור קצרה", "about": "אנחנו עסק קטן.",
        "primaryColor": OLD_PRIMARY, "fontFamily": "", "phone": "050-1234567", "whatsapp": "", "email": "hello@example.co.il", "address": "תל אביב",
        "services": [{"name": "תכנון", "desc": "תכנון מלא", "price": "100"}, {"name": "ליווי", "desc": "ליווי צמוד", "price": ""},
                     {"name": "הום סטיילינג", "desc": "סטיילינג לפני מכירה", "price": "300"}],
        "headings": {"services": "", "about": "", "contact": ""}, "pages": {"about": False, "contact": False},
        "heroImage": "", "heroImages": [], "videoUrl": "", "heroVideoBg": False,
        # A per-text colour + font saved by an older version of the builder.
        "textStyles": {"businessName": {"color": "E11D48", "font": "suezOne"}, "heading-services": {"size": "30", "color": "7C3AED"}},
        "showBsd": True,
    }
    data.update(extra)
    return data


def open_builder(br, port, template, data, width=1400, height=900):
    be = Backend()
    be.rows["p1"] = {"id": "p1", "user_id": be.uid, "template": template, "status": "draft", "data": data,
                     "publish_count": 0, "published_url": None, "updated_at": "2020-01-01T00:00:00Z"}
    ctx = br.new_context(viewport={"width": width, "height": height})
    ctx.route("**/*", offline(port))
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.route(SB + "/**", be.handle)
    base = f"http://127.0.0.1:{port}"
    pg.goto(f"{base}/index.html")
    s = session(be.uid)
    pg.evaluate(f"localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(s))}); localStorage.setItem('deskkit_lang','he'); localStorage.setItem('deskkit_cookie_ok','1')")
    pg.goto(f"{base}/sites.html?site=p1", wait_until="networkidle")
    pg.wait_for_function("document.getElementById('bshell-root').classList.contains('active') && siteState.data.businessName === 'הייי בדיקה'", timeout=20000)
    pg.wait_for_function("!document.getElementById('auth-gate-overlay')", timeout=20000)
    pg.wait_for_function(f"{FRAME}.contentDocument && {FRAME}.contentDocument.querySelector('[data-bshell-top]')", timeout=20000)
    pg.wait_for_timeout(300)
    return ctx, pg, be


def settle(pg):
    """Waits for a double-buffered canvas swap (if one started) to finish."""
    pg.wait_for_function("!document.querySelector('.bshell-canvas-buffer')", timeout=10000)
    pg.wait_for_timeout(150)

def mark(pg):
    pg.evaluate(f"{FRAME}.contentWindow.__dkMark = 'same-document'")
def marked(pg):
    return pg.evaluate(f"{FRAME}.contentWindow.__dkMark") == "same-document"


# Every colour the canvas paints (text, backgrounds, borders, gradients).
CANVAS_COLOURS = """() => {
  const doc = document.getElementById('bshell-canvas-iframe').contentDocument;
  const out = new Set();
  doc.querySelectorAll('body *').forEach((el) => {
    if (el.closest('#deskkit-badge, #bshell-mini-toolbar, .wa-fab')) return;
    const cs = getComputedStyle(el);
    [cs.color, cs.backgroundColor, cs.borderTopColor].forEach((c) => out.add(c.replace(/\\s+/g, '')));
    (cs.backgroundImage.match(/rgba?\\([^)]*\\)/g) || []).forEach((c) => out.add(c.replace(/\\s+/g, '')));
  });
  return [...out];
}"""

def rgb(hexc):
    h = hexc.lstrip("#")
    return f"rgb({int(h[0:2], 16)},{int(h[2:4], 16)},{int(h[4:6], 16)})"


def run(br, port):
    # ------------------------------------------------ 1. בס"ד in published output (all templates)
    ctx, pg, be = open_builder(br, port, "local-service", project("local-service"))
    templates = pg.evaluate("Object.keys(SITE_TEMPLATES)")
    bsd = pg.evaluate("""(templates) => templates.map((t) => {
      const d = JSON.parse(JSON.stringify(siteState.data)); d.showBsd = true;
      const doc = new DOMParser().parseFromString(SITE_TEMPLATES[t].render(d, 'index'), 'text/html');
      const el = doc.querySelector('.site-bsd');
      return [t, el ? el.getAttribute('style') : null, el ? el.textContent : null];
    })""", templates)
    bad = [b for b in bsd if not b[1] or re.search(r"background|border|padding|border-radius|box-shadow", b[1]) or b[2] != 'בס"ד']
    check(f'בס"ד in the published HTML is plain text on all {len(templates)} templates (no background/border/padding/radius)', not bad, bad[:3])
    check('בס"ד keeps its position (top-right corner, absolute)', all("position:absolute; top:6px; right:10px;" in (b[1] or "") for b in bsd))
    cs = pg.evaluate(f"""(() => {{ const el = {FRAME}.contentDocument.querySelector('.site-bsd'); const s = getComputedStyle(el);
      return [s.backgroundColor, s.borderTopWidth, s.paddingTop, s.borderTopLeftRadius, s.boxShadow, el.getBoundingClientRect().top]; }})()""")
    check('בס"ד in the builder preview has no background, border, padding or rounding',
          cs[0] == "rgba(0, 0, 0, 0)" and cs[1] == "0px" and cs[2] == "0px" and cs[3] == "0px" and cs[4] == "none" and cs[5] < 12, cs)

    # ------------------------------------------------ 2. publish dialog
    pg.click("#bshell-publish-btn")
    pg.wait_for_selector("#dk-checklist-confirm")
    pg.click("#dk-checklist-confirm")
    pg.wait_for_selector("#dk-publish-overlay .export-panel")
    pg.evaluate("document.getElementById('unlock-done').style.display=''; document.getElementById('finish-gate').style.display='none';"
                "renderPublishClaimedScreen('https://hiii-bdika.deskkit.co.il/', true, 'site-0a1b2c3d')")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, "publish_dialog_1400.png"))
    colours = pg.evaluate("""() => {
      const out = [];
      document.querySelectorAll('.dk-publish-modal, .dk-publish-modal *').forEach((el) => {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const tag = el.id || el.className || el.tagName;
        out.push(['bg', String(tag).slice(0, 40), cs.backgroundColor]);
        (cs.backgroundImage.match(/rgba?\\([^)]*\\)/g) || []).forEach((c) => out.push(['gradient', String(tag).slice(0, 40), c]));
        if (parseFloat(cs.borderTopWidth) > 0) out.push(['border', String(tag).slice(0, 40), cs.borderTopColor]);
        if ((el.textContent || '').trim() && el.children.length === 0) out.push(['text', String(tag).slice(0, 40), cs.color]);
      });
      return out;
    }""")
    def hsl(c):
        m = re.findall(r"[\d.]+", c)
        if len(m) >= 4 and float(m[3]) < 0.3: return None  # (nearly) transparent
        r, g, b = (int(float(x)) / 255 for x in m[:3])
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        return h * 360, s, l
    warm = []
    off_accent = []
    for kind, tag, c in colours:
        v = hsl(c)
        if not v: continue
        h, s, l = v
        if s > 0.25 and 0.12 < l < 0.95:
            if 15 <= h <= 60: warm.append((kind, tag, c))
            elif not (150 <= h <= 200): off_accent.append((kind, tag, c))
    check("Publish dialog: no orange/beige/gold anywhere (computed colours of every element)", not warm, warm[:5])
    check("Publish dialog: the only accent colour is the builder's teal", not off_accent, off_accent[:5])
    note_bg = pg.evaluate("getComputedStyle(document.getElementById('publish-note')).backgroundColor")
    check("'האתר שלכם באוויר ✓' sits on a white card", note_bg == "rgb(255, 255, 255)", note_bg)
    panel_bg = pg.evaluate("getComputedStyle(document.querySelector('.dk-publish-modal .export-panel')).backgroundColor")
    check("The dialog's inner panel is not a separate teal/ice box", panel_bg in ("rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"), panel_bg)
    open_btn = pg.evaluate("getComputedStyle(document.querySelector('#publish-note .btn-teal')).backgroundColor")
    check("'פתיחת האתר' is a teal button (not near-black)", open_btn == "rgb(20, 184, 166)", open_btn)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(200)

    # ------------------------------------------------ 3. section editor on local-service (fixed checks)
    fr = pg.frame_locator("#bshell-canvas-iframe")
    mark(pg)
    fr.locator('[data-textkey="heading-services"]').first.click()
    pg.wait_for_timeout(250)
    sel = pg.evaluate("({ t: bshellSelection.type, f: bshellSelection.focus })")
    check("Clicking the services title opens the services section", sel["t"] == "services" and sel["f"] == {"key": "heading-services"}, sel)
    check("The services section editor lists every service and the title + group styles",
          pg.locator("#bshell-props-body .bshell-svc-item").count() == 3 and pg.locator('#bshell-props-body [data-text-key="heading-services"]').count() == 1
          and pg.locator('#bshell-props-body [data-style-key="svc-name"]').count() == 1 and pg.locator('#bshell-props-body [data-style-key="svc-desc"]').count() == 1
          and pg.locator('#bshell-props-body [data-style-key="heading-services"]').count() == 1)
    check("No per-item font controls (one font select per group only)",
          pg.locator("#bshell-props-body .bshell-svc-item select").count() == 0
          and pg.locator('#bshell-props-body select[data-style-prop="font"]').count() == pg.locator("#bshell-props-body .bshell-style-group").count())
    font_opts = pg.evaluate("[...document.querySelectorAll('#bshell-props-body [data-style-key=\"svc-name\"] select[data-style-prop=font] option')].map(o => o.value).filter(Boolean)")
    check("Group fonts are limited to the existing font list", sorted(font_opts) == sorted(pg.evaluate("Object.keys(SITE_FONTS)")), font_opts)

    fr.locator('[data-svc-idx="2"]').first.click()
    pg.wait_for_timeout(300)
    st = pg.evaluate("""({ t: bshellSelection.type, f: bshellSelection.focus,
      active: [document.activeElement.dataset.svcIdx, document.activeElement.dataset.svcField],
      focused: [...document.querySelectorAll('#bshell-props-body .is-focused')].map(e => e.dataset.svcItem) })""")
    check("Clicking a specific service opens the services section, focused on THAT service",
          st["t"] == "services" and st["f"] == {"svc": 2} and st["active"] == ["2", "name"] and st["focused"] == ["2"], st)
    pg.screenshot(path=os.path.join(SHOTS, "section_editor_services_1400.png"))
    pg.keyboard.type(" פלוס")
    pg.wait_for_timeout(250)
    live = pg.evaluate(f"{FRAME}.contentDocument.querySelector('[data-svc-idx=\"2\"] h3').textContent")
    check("Typing a service name updates the preview in place (no iframe reload)", marked(pg) and live == "הום סטיילינג פלוס", (marked(pg), live))

    # group style: one colour for every service name
    pg.evaluate("""(() => { const el = document.querySelector('#bshell-props-body [data-style-key="svc-name"] input[type=color]');
      el.focus(); el.value = '#0E7490'; el.dispatchEvent(new Event('input', { bubbles: true })); })()""")
    pg.wait_for_timeout(200)
    names = pg.evaluate(f"[...{FRAME}.contentDocument.querySelectorAll('[data-svc-idx] h3')].map(h => getComputedStyle(h).color)")
    check("A service-name colour applies to ALL service names at once, in place",
          marked(pg) and len(names) == 3 and set(names) == {"rgb(14, 116, 144)"} and pg.evaluate("siteState.data.textStyles['svc-name'].color").upper() == "0E7490", (names, marked(pg)))
    pg.select_option('#bshell-props-body [data-style-key="svc-desc"] select[data-style-prop="font"]', "varelaRound")
    pg.wait_for_timeout(200)
    descs = pg.evaluate(f"[...{FRAME}.contentDocument.querySelectorAll('[data-svc-idx] p')].map(p => getComputedStyle(p).fontFamily)")
    check("A description font applies to all service descriptions", marked(pg) and descs and all("Varela Round" in f for f in descs), descs)
    html = pg.evaluate("currentSiteHtml('index')")
    check("Group styles are in the published HTML (CSS, not per-item inline styles)",
          ":is([data-svc-idx] h3" in html and "color:#0e7490 !important" in html.lower() and 'data-svc-idx="0" style=' not in html)

    # contact: email + phone clicks
    fr.locator(".ls-contact .line", has_text="hello@example.co.il").first.click()
    pg.wait_for_timeout(250)
    st = pg.evaluate("({ t: bshellSelection.type, f: bshellSelection.focus, a: document.activeElement.dataset.contactKey, h: !!document.querySelector('#bshell-props-body [data-text-key=\"heading-contact\"]') })")
    check("Clicking the email in the contact section opens the contact section, email field focused", st == {"t": "contact", "f": {"contact": "email"}, "a": "email", "h": True}, st)
    pg.screenshot(path=os.path.join(SHOTS, "section_editor_contact_1400.png"))
    pg.keyboard.type(".x")
    pg.wait_for_timeout(250)
    check("Typing the email updates the contact section in place", marked(pg) and "hello@example.co.il.x" in pg.evaluate(f"{FRAME}.contentDocument.querySelector('.ls-contact').textContent"))
    fr.locator(".ls-contact .line", has_text="050-1234567").first.click()
    pg.wait_for_timeout(200)
    st = pg.evaluate("({ t: bshellSelection.type, f: bshellSelection.focus, a: document.activeElement.dataset.contactKey })")
    check("Clicking the phone at the bottom opens the contact section, phone field focused", st == {"t": "contact", "f": {"contact": "phone"}, "a": "phone"}, st)
    # (a JS click: the free-plan DeskKit badge floats over the footer corner)
    pg.evaluate(f"{FRAME}.contentDocument.querySelector('.ls-footer').click()")
    pg.wait_for_timeout(200)
    check("Clicking the footer opens the header & footer panel", pg.evaluate("bshellSelection.type") == "site"
          and pg.locator('#bshell-props-body [data-text-key="businessName"]').count() == 1 and pg.locator("#bshell-prop-hide-copyright").count() == 1)
    fr.locator('[data-textkey="aboutText"]').first.click()
    pg.wait_for_timeout(200)
    st = pg.evaluate("({ t: bshellSelection.type, f: bshellSelection.focus, a: document.activeElement.dataset.textKey })")
    check("Clicking the about text opens the about section with that text focused", st == {"t": "about", "f": {"key": "aboutText"}, "a": "aboutText"}, st)
    pg.keyboard.type(" עוד")
    pg.wait_for_timeout(200)
    check("Typing the about text patches the preview in place", marked(pg) and "אנחנו עסק קטן. עוד" in pg.evaluate(f"{FRAME}.contentDocument.querySelector('[data-textkey=aboutText]').textContent"))

    # Saved per-text overrides render unchanged until edited
    bn = pg.evaluate(f"(() => {{ const el = {FRAME}.contentDocument.querySelector('[data-textkey=businessName]'); return [getComputedStyle(el).color, el.getAttribute('style')]; }})()")
    check("An older project's per-text colour/font override still renders as before", bn[0] == "rgb(225, 29, 72)" and "Suez One" in (bn[1] or ""), bn)

    # hover hint
    fr.locator('[data-svc-idx="0"]').first.scroll_into_view_if_needed()
    box = fr.locator('[data-svc-idx="0"]').first.bounding_box()
    pg.mouse.move(box["x"] + 10, box["y"] + 10)
    pg.mouse.move(box["x"] + 30, box["y"] + 30)
    pg.wait_for_timeout(150)
    hov = pg.evaluate(f"(() => {{ const el = {FRAME}.contentDocument.querySelector('[data-svc-idx=\"0\"]'); const cs = getComputedStyle(el); return [el.classList.contains('bshell-hover-target'), cs.outlineStyle, cs.cursor]; }})()")
    check("Hovering a service card shows a dashed outline and a hand cursor", hov[0] and hov[1] == "dashed" and hov[2] == "pointer", hov)

    # a structural change (hide a section) re-renders double-buffered: same scroll, no blank frame
    pg.evaluate(f"{FRAME}.contentWindow.scrollTo(0, 900)")
    pg.wait_for_timeout(100)
    pg.evaluate("bshellSelectSection('about')")
    pg.wait_for_timeout(200)
    y0 = pg.evaluate(f"{FRAME}.contentWindow.scrollY")
    pg.evaluate("""window.__swapSeen = []; new MutationObserver(() => {
      const f = document.getElementById('bshell-canvas-iframe'); window.__swapSeen.push(!!(f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length));
    }).observe(document.querySelector('.bshell-canvas-shadow'), { childList: true })""")
    pg.click("#bshell-prop-visible", force=True)
    pg.wait_for_function(f"{FRAME}.contentWindow.__dkMark !== 'same-document' && !document.querySelector('.bshell-canvas-buffer')", timeout=10000)
    pg.wait_for_timeout(150)
    y1 = pg.evaluate(f"{FRAME}.contentWindow.scrollY")
    seen = pg.evaluate("window.__swapSeen")
    check("A full re-render (section hidden) swaps in a ready page and keeps the scroll position",
          all(seen) and abs(y1 - min(y0, pg.evaluate(f"{FRAME}.contentDocument.documentElement.scrollHeight - {FRAME}.contentWindow.innerHeight"))) < 5
          and pg.evaluate(f"!{FRAME}.contentDocument.querySelector('#ls-about')"), (seen, y0, y1))
    check("No JS errors (local-service session)", not pg.errors, pg.errors[:3])
    ctx.close()

    # ------------------------------------------------ 4. every template: moods, restore, typing, clicks
    moods = None
    for tpl in templates:
        extra = {}
        if tpl == "blank":
            extra["blockVariants"] = {"hero": "centered", "services": "grid"}  # inline colours (the "new flow" default)
        ctx, pg, be = open_builder(br, port, tpl, project(tpl, **extra))
        if moods is None: moods = pg.evaluate("JSON.parse(JSON.stringify(SITE_MOODS))")
        fr = pg.frame_locator("#bshell-canvas-iframe")
        mark(pg)
        errs = []

        # typing in a text field never reloads the canvas
        fr.locator('[data-textkey="heading-heroTitle"]').first.click()
        pg.wait_for_timeout(150)
        if pg.evaluate("document.activeElement.dataset.textKey") != "heading-heroTitle": errs.append("hero heading not focused")
        pg.keyboard.type("כותרת")
        if pg.evaluate(f"{FRAME}.contentDocument.querySelector('[data-textkey=\"heading-heroTitle\"]').textContent") != "כותרת": errs.append("hero text not patched")
        pg.keyboard.press("Control+A"); pg.keyboard.press("Backspace")  # empty -> template default, still in place
        if pg.evaluate(f"{FRAME}.contentDocument.querySelector('[data-textkey=\"heading-heroTitle\"]').textContent") != "הייי בדיקה": errs.append("default heading not restored")
        # a specific service
        # (a JS click: playground's bubbles are moving under physics)
        idx = 1
        pg.evaluate(f"""(() => {{ const doc = {FRAME}.contentDocument;
          const el = doc.querySelector('[data-svc-idx="{idx}"]') || doc.querySelectorAll(SITE_GROUP_GRID)[{idx}];
          el.scrollIntoView({{ block: 'center' }}); (el.querySelector('h3, .name, span') || el).click(); }})()""")
        pg.wait_for_timeout(200)
        st = pg.evaluate("({ f: bshellSelection.focus, t: bshellSelection.type, a: [document.activeElement.dataset.svcIdx, document.activeElement.dataset.svcField], items: bshellItemsType() })")
        if not (st["f"] == {"svc": idx} and st["t"] == st["items"] and st["a"] == [str(idx), "name"]): errs.append(f"service click {st}")
        pg.keyboard.type("!")
        if pg.evaluate("siteState.data.services[1].name") != "ליווי!": errs.append("service typing not saved")
        page_text = pg.evaluate(f"{FRAME}.contentDocument.body.textContent")
        if "ליווי!" not in page_text: errs.append("service typing not shown")
        # phone typed in the section editor / settings
        pg.click("#bshell-settings-btn")
        pg.fill("#bshell-set-phone", "050-7654321")
        if "050-7654321" not in pg.evaluate(f"{FRAME}.contentDocument.body.innerHTML") and tpl not in ("catalog", "boutique"):
            errs.append("phone not shown")
        check(f"{tpl}: typing (hero heading, service name, phone) updates the preview without reloading it", marked(pg) and not errs, (marked(pg), errs))

        # email click -> the section that holds the contact details, email focused
        has_email = pg.evaluate(f"(() => {{ const doc = {FRAME}.contentDocument; return [...doc.querySelectorAll('body *')].some(el => !el.children.length && el.textContent.includes('hello@example.co.il')) || !!doc.querySelector('a[href^=\"mailto:\"]'); }})()")
        if has_email:
            pg.evaluate(f"""(() => {{ const doc = {FRAME}.contentDocument;
              const el = [...doc.querySelectorAll('body *')].find(e => !e.children.length && e.textContent.includes('hello@example.co.il')) || doc.querySelector('a[href^="mailto:"]');
              el.scrollIntoView({{ block: 'center' }}); el.click(); }})()""")
            pg.wait_for_timeout(200)
            st = pg.evaluate("({ t: bshellSelection.type, f: bshellSelection.focus, focused: !!document.querySelector('#bshell-props-body [data-contact-field=\"email\"].is-focused'), a: document.activeElement.dataset.contactKey })")
            check(f"{tpl}: clicking the email opens the section with the contact details, email focused",
                  st["f"] == {"contact": "email"} and st["focused"] and st["a"] == "email" and st["t"] in ("contact", "site", "grid"), st)

        # mood: colours (not just the font) change in the live preview; then restore
        pg.click("#bshell-settings-btn")
        pg.wait_for_selector(".bshell-mood-btn")
        check(f"{tpl}: no restore button before any mood", pg.locator("#bshell-mood-restore").count() == 0)
        before_data = pg.evaluate("JSON.stringify({ p: siteState.data.primaryColor, f: siteState.data.fontFamily, m: siteState.data.mood, ts: siteState.data.textStyles })")
        before_cols = set(pg.evaluate(CANVAS_COLOURS))
        before_html = pg.evaluate("currentSiteHtml('index')")
        pg.click('.bshell-mood-btn[data-mood="corporate"]')
        settle(pg)
        m = moods["corporate"]
        after_cols = set(pg.evaluate(CANVAS_COLOURS))
        new_cols = {rgb(m["primaryColor"]), rgb(m["accent"])}
        old_primary_gone = rgb(OLD_PRIMARY) not in after_cols
        bn_color = pg.evaluate(f"getComputedStyle({FRAME}.contentDocument.querySelector('[data-textkey=businessName]')).color")
        check(f"{tpl}: a mood paints its primary/accent colours in the live preview, the old colour and the red per-text override are gone",
              (after_cols & new_cols) and old_primary_gone and bn_color != "rgb(225, 29, 72)" and after_cols != before_cols,
              (sorted(after_cols & new_cols), old_primary_gone, bn_color, sorted(c for c in after_cols if c.startswith("rgb(21,128"))))
        check(f"{tpl}: the restore button appears after a mood", pg.locator("#bshell-mood-restore").is_visible()
              and pg.inner_text("#bshell-mood-restore").strip() == "↩ חזרה לעיצוב הקודם")
        if tpl in ("local-service", "noir", "cinematic"):
            pg.locator("#bshell-mood-restore").scroll_into_view_if_needed()
            pg.screenshot(path=os.path.join(SHOTS, f"mood_{tpl}_corporate.png"))
        # a second mood, then restore -> back to exactly the first mood's settings
        pg.click('.bshell-mood-btn[data-mood="warm"]')
        settle(pg)
        pg.click("#bshell-mood-restore")
        settle(pg)
        corporate_state = pg.evaluate("({ p: siteState.data.primaryColor, m: siteState.data.mood, f: siteState.data.fontFamily })")
        check(f"{tpl}: restore after a second mood goes back to the first mood's design",
              corporate_state == {"p": m["primaryColor"], "m": "corporate", "f": m["bodyFont"]} and pg.locator("#bshell-mood-restore").count() == 0, corporate_state)
        # undo back to before any mood is covered by e2e_seo_moods; here: from no mood -> mood -> restore = exact original
        pg.click('.bshell-mood-btn[data-mood=""]')
        settle(pg)
        pg.click('.bshell-mood-btn[data-mood="tech"]')
        settle(pg)
        pg.click("#bshell-mood-restore")
        settle(pg)
        pg.wait_for_timeout(900)  # let the templates' own colour transitions finish
        after_data = pg.evaluate("JSON.stringify({ p: siteState.data.primaryColor, f: siteState.data.fontFamily, m: siteState.data.mood, ts: siteState.data.textStyles })")
        restored_cols = set(pg.evaluate(CANVAS_COLOURS))
        check(f"{tpl}: '↩ חזרה לעיצוב הקודם' restores colour, fonts and per-text styles exactly (data, HTML and preview colours)",
              after_data == before_data and pg.evaluate("currentSiteHtml('index')") == before_html and restored_cols == before_cols
              and pg.evaluate("siteState.data.moodPrev === undefined"),
              (after_data, before_data, sorted(restored_cols ^ before_cols)[:6]))
        check(f"{tpl}: no JS errors", not pg.errors, pg.errors[:3])
        ctx.close()

    # ------------------------------------------------ 5. 375px: section editor in the drawer
    ctx, pg, be = open_builder(br, port, "local-service", project("local-service"), width=375, height=812)
    fr = pg.frame_locator("#bshell-canvas-iframe")
    fr.locator('[data-svc-idx="1"]').first.click(force=True)
    pg.wait_for_timeout(250)
    pg.click("#bshell-mobile-props-btn")
    pg.wait_for_timeout(400)
    st = pg.evaluate("""(() => { const p = document.getElementById('bshell-props');
      return { open: p.classList.contains('bshell-drawer-open'), sw: p.scrollWidth, cw: p.clientWidth, focused: !!p.querySelector('[data-svc-item="1"].is-focused'),
               page: document.documentElement.scrollWidth - document.documentElement.clientWidth }; })()""")
    pg.screenshot(path=os.path.join(SHOTS, "section_editor_375.png"))
    check("375px: the section editor opens in the drawer, focused service highlighted, no sideways scroll",
          st["open"] and st["focused"] and st["sw"] <= st["cw"] + 1 and st["page"] <= 1, st)
    pg.click("#bshell-publish-btn")
    pg.wait_for_selector("#dk-checklist-confirm")
    pg.click("#dk-checklist-confirm")
    pg.wait_for_selector("#dk-publish-overlay .export-panel")
    pg.evaluate("document.getElementById('unlock-done').style.display=''; document.getElementById('finish-gate').style.display='none';"
                "renderPublishClaimedScreen('https://hiii-bdika.deskkit.co.il/', true, 'site-0a1b2c3d')")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, "publish_dialog_375.png"))
    w = pg.evaluate("(() => { const m = document.querySelector('.dk-publish-modal'); return [m.scrollWidth, m.clientWidth, m.getBoundingClientRect().width]; })()")
    check("375px: the publish dialog fits the screen with no sideways scroll", w[0] <= w[1] + 1 and w[2] <= 375, w)
    check("No JS errors (375px session)", not pg.errors, pg.errors[:3])
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
