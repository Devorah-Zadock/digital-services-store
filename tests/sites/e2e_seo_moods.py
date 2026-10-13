#!/usr/bin/env python3
"""Browser tests for the website builder's SEO panel and design moods
(sites.html -> the Builder Shell's "הגדרות האתר" panel).

Runs the real page from this repository in Chromium against a MOCKED
Supabase (no network, no real accounts, no real data):

    python3 tests/sites/e2e_seo_moods.py

Checks:
  * every template renders byte-identical output to the pre-change
    baseline when seo/mood are unset (node tests/sites/render_all.js)
  * SEO fields -> counters (colour) -> Google preview -> real meta/og tags,
    escaped; share-image picker; hero alt text; autosave
  * each of the 4 moods applies (colour, fonts, CSS variables), every
    template renders with no JS errors and no new horizontal overflow at
    375px and 1280px, and "ללא" restores identical output

Needs Python Playwright and Chromium (CHROMIUM_PATH, or the default below).
Exit code 1 if any check fails.
"""
import base64, functools, http.server, json, os, re, socketserver, subprocess, sys, threading, time, uuid
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SB = "https://vafkjsetlrpaczsmqvqs.supabase.co"
REF = "vafkjsetlrpaczsmqvqs"
CHROMIUM = os.environ.get("CHROMIUM_PATH") or "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
MOODS = ["tech", "warm", "minimal", "corporate"]

RESULTS = []
def check(name, ok, info=""):
    RESULTS.append((bool(ok), name, str(info)[:300]))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  [{str(info)[:300]}]"), flush=True)


# ------------------------------------------------------------------ harness
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]

def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
def session(uid):
    exp = int(time.time()) + 3600
    tok = b64({"alg": "HS256"}) + "." + b64({"sub": uid, "exp": exp, "email": f"{uid}@example.com", "role": "authenticated", "aud": "authenticated"}) + ".sig"
    return {"access_token": tok, "refresh_token": "r", "expires_at": exp, "expires_in": 3600, "token_type": "bearer",
            "user": {"id": uid, "email": f"{uid}@example.com", "aud": "authenticated", "role": "authenticated"}}

class Backend:
    """In-memory stand-in for the site_projects table + auth."""
    def __init__(self, uid="u-1"):
        self.uid = uid
        self.rows = {}
        self.posts = 0
    def handle(self, route):
        req = route.request
        url = req.url
        if "/auth/v1/" in url:
            s = session(self.uid)
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(s["user"] if "/user" in url else s))
        if "/rest/v1/site_projects" in url:
            if req.method == "GET":
                m = re.search(r"[?&]id=eq\.([^&]+)", url); u = re.search(r"user_id=eq\.([^&]+)", url)
                rows = [r for r in self.rows.values() if (not m or r["id"] == m.group(1)) and (not u or r["user_id"] == u.group(1))]
                if "pgrst.object" in req.headers.get("accept", ""):
                    if not rows:
                        return route.fulfill(status=406, content_type="application/json", body=json.dumps({"code": "PGRST116", "message": "0 rows"}))
                    return route.fulfill(status=200, content_type="application/json", body=json.dumps(rows[0]))
                return route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))
            if req.method == "POST":
                self.posts += 1
                body = json.loads(req.post_data or "{}")
                body = body[0] if isinstance(body, list) else body
                body.setdefault("id", str(uuid.uuid4()))
                row = dict(self.rows.get(body["id"], {}))
                row.update(json.loads(json.dumps(body)))
                self.rows[body["id"]] = row
                acc = req.headers.get("accept", "")
                return route.fulfill(status=201, content_type="application/json", body=json.dumps(row if "pgrst.object" in acc else [row]))
        if "/functions/v1/" in url:
            return route.fulfill(status=200, content_type="application/json", body="{}")
        return route.fulfill(status=200, content_type="application/json", body="[]")

def offline(port):
    """Everything that isn't the local server or the mocked Supabase gets an
    empty answer (Google Fonts, captcha...) — the tests never touch the net."""
    def handler(route):
        url = route.request.url
        if url.startswith(f"http://127.0.0.1:{port}/") or url.startswith("data:") or url.startswith("about:"):
            return route.continue_()
        ctype = "text/css" if "fonts.googleapis.com" in url else "text/plain"
        return route.fulfill(status=200, content_type=ctype, body="")
    return handler


def run(br, port):
    base = f"http://127.0.0.1:{port}"
    hero = f"{base}/images/previews/site-studio.webp"
    gal = [f"{base}/images/previews/site-noir.webp", f"{base}/images/previews/site-bold.webp"]
    data = {
        "schemaVersion": 1, "businessName": "סטודיו גל", "tagline": "עיצוב פנים לבתים ולעסקים", "about": "אנחנו מעצבים.",
        "primaryColor": "#15803D", "fontFamily": "", "phone": "050-1234567", "whatsapp": "", "email": "a@b.co", "address": "תל אביב",
        "services": [{"name": "תכנון", "desc": "תכנון מלא", "price": "100"}, {"name": "ליווי", "desc": "", "price": ""}, {"name": "הום סטיילינג", "desc": "x", "price": ""}],
        "headings": {"services": "", "about": "", "contact": ""}, "pages": {"about": False, "contact": False},
        "heroImage": hero, "heroImages": gal, "videoUrl": "", "heroVideoBg": False, "textStyles": {},
    }
    original = json.loads(json.dumps(data))

    # ---------------------------------------------------- identical output (Node, all templates)
    baseline = json.load(open(os.path.join(ROOT, "tests", "sites", "baseline_render_hashes.json")))
    for flag in ([], ["--empty-settings"]):
        out = subprocess.run(["node", os.path.join(ROOT, "tests", "sites", "render_all.js")] + flag, capture_output=True, text=True, cwd=ROOT)
        cur = json.loads(out.stdout or "{}")
        diff = [k for k in baseline if cur.get(k) != baseline[k]]
        check(f"Identical output: {len(baseline)} documents (18 templates + blank x 4 samples x 3 pages) match the pre-change baseline"
              + (" with empty seo/mood/heroAlt" if flag else ""), not diff and len(cur) == len(baseline), diff[:5] or out.stderr)

    # ---------------------------------------------------- builder page
    be = Backend()
    be.rows["p1"] = {"id": "p1", "user_id": be.uid, "template": "local-service", "status": "draft", "data": data,
                     "publish_count": 0, "published_url": None, "updated_at": "2020-01-01T00:00:00Z"}
    ctx = br.new_context(viewport={"width": 1400, "height": 900})
    ctx.route("**/*", offline(port))
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.route(SB + "/**", be.handle)
    pg.goto(f"{base}/index.html")
    s = session(be.uid)
    pg.evaluate(f"localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(s))}); localStorage.setItem('deskkit_lang','he'); localStorage.setItem('deskkit_cookie_ok','1')")
    pg.goto(f"{base}/sites.html?site=p1", wait_until="networkidle")
    pg.wait_for_function("document.getElementById('bshell-root').classList.contains('active') && siteState.data.businessName === 'סטודיו גל'", timeout=20000)
    pg.wait_for_function("!document.getElementById('auth-gate-overlay')", timeout=20000)
    pg.wait_for_timeout(400)
    check("Builder Shell opens the seeded project", pg.evaluate("siteState.template") == "local-service")

    pg.click("#bshell-settings-btn")
    pg.wait_for_selector("#bshell-seo-group")
    check("Settings panel has the SEO group", pg.is_visible("#bshell-seo-group") and "איך האתר נראה בגוגל" in pg.inner_text("#bshell-seo-group"))
    check("Settings panel has the mood picker (none + 4)", pg.locator(".bshell-mood-btn").count() == 5,
          pg.locator(".bshell-mood-btn").count())
    check("Mood 'ללא' is selected for an existing project", pg.get_attribute('.bshell-mood-btn[data-mood=""]', "aria-checked") == "true")

    def count_state(sel): return pg.get_attribute(sel, "data-state")
    def count_color(sel): return pg.evaluate(f"getComputedStyle(document.querySelector('{sel}')).color")
    GREEN, ORANGE = "rgb(2, 122, 72)", "rgb(181, 71, 8)"

    # empty fields: automatic title/description in the preview
    check("Empty title counter is neutral", count_state("#bshell-seo-title-count") == "empty")
    check("Preview shows the automatic title (business name) while empty", pg.inner_text("#bshell-serp .bshell-serp-title") == "סטודיו גל")
    check("Preview shows the automatic description (tagline) while empty", pg.inner_text("#bshell-serp .bshell-serp-desc") == "עיצוב פנים לבתים ולעסקים")
    check("Preview shows the placeholder deskkit.co.il address before publishing", "https://your-site.deskkit.co.il" in pg.inner_text("#bshell-serp"))
    check("Preview is RTL for a Hebrew site", pg.get_attribute("#bshell-serp", "dir") == "rtl")

    # title: short -> orange, in range -> green, long -> orange + truncated preview
    pg.fill("#bshell-seo-title", "קצר")
    check("Short title counter is orange", count_state("#bshell-seo-title-count") == "warn" and count_color("#bshell-seo-title-count") == ORANGE,
          (count_state("#bshell-seo-title-count"), count_color("#bshell-seo-title-count")))
    good_title = 'סטודיו גל <script>"&\' | עיצוב פנים בתל אביב ובמרכז'  # 50-60 chars
    check("(fixture) good title is 50-60 chars", 50 <= len(good_title) <= 60, len(good_title))
    pg.fill("#bshell-seo-title", good_title)
    check("In-range title counter is green", count_state("#bshell-seo-title-count") == "good" and count_color("#bshell-seo-title-count") == GREEN,
          (count_state("#bshell-seo-title-count"), count_color("#bshell-seo-title-count")))
    check("Counter shows the length", pg.inner_text("#bshell-seo-title-count").startswith(f"{len(good_title)}/60"), pg.inner_text("#bshell-seo-title-count"))
    check("Preview title updates live (text, not markup)", pg.inner_text("#bshell-serp .bshell-serp-title") == good_title
          and pg.locator("#bshell-serp script").count() == 0, pg.inner_text("#bshell-serp .bshell-serp-title"))
    long_title = "מילה " * 20
    pg.fill("#bshell-seo-title", long_title)
    shown = pg.inner_text("#bshell-serp .bshell-serp-title")
    check("Long title counter is orange", count_state("#bshell-seo-title-count") == "warn")
    check("Desktop preview truncates a long title at ~60 chars with an ellipsis", shown.endswith("…") and len(shown) <= 61, (len(shown), shown))
    pg.click('[data-serp-device="mobile"]')
    shown_m = pg.inner_text("#bshell-serp .bshell-serp-title")
    w_m = pg.evaluate("document.getElementById('bshell-serp').getBoundingClientRect().width")
    pg.click('[data-serp-device="desktop"]')
    w_d = pg.evaluate("document.getElementById('bshell-serp').getBoundingClientRect().width")
    check("Mobile preview is narrower and keeps more of the title", w_m <= 360 and w_d == 600 and len(shown_m) > len(shown), (w_m, w_d, len(shown_m), len(shown)))
    pg.fill("#bshell-seo-title", good_title)

    # description
    good_desc = ("עיצוב פנים לבתים ולעסקים בתל אביב והמרכז: תכנון מלא, ליווי צמוד עד המפתח, והום סטיילינג לפני מכירה. "
                 "פגישת היכרות ראשונה ללא עלות — דברו איתנו עוד היום!!")
    check("(fixture) good description is 150-160 chars", 150 <= len(good_desc) <= 160, len(good_desc))
    pg.fill("#bshell-seo-desc", good_desc[:80])
    check("Short description counter is orange", count_state("#bshell-seo-desc-count") == "warn" and count_color("#bshell-seo-desc-count") == ORANGE)
    pg.fill("#bshell-seo-desc", good_desc)
    check("In-range description counter is green", count_state("#bshell-seo-desc-count") == "good" and count_color("#bshell-seo-desc-count") == GREEN)
    pg.fill("#bshell-seo-desc", good_desc + " " + good_desc)
    check("Long description counter is orange, and typing is not blocked", count_state("#bshell-seo-desc-count") == "warn"
          and pg.evaluate("siteState.data.seo.description.length") == len(good_desc) * 2 + 1)
    shown_d = pg.inner_text("#bshell-serp .bshell-serp-desc")
    check("Desktop preview truncates the description at ~160 chars", shown_d.endswith("…") and len(shown_d) <= 161, len(shown_d))
    pg.fill("#bshell-seo-desc", good_desc + ' <b>"x"</b> & y')

    # generated HTML
    def head_info(page="index"):
        return pg.evaluate("""(page) => {
          const html = currentSiteHtml(page);
          const head = html.slice(0, html.indexOf('</head>'));
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const m = (sel, attr) => { const el = doc.querySelector(sel); return el ? el.getAttribute(attr || 'content') : null; };
          return { head, title: doc.title, desc: m('meta[name="description"]'), ogTitle: m('meta[property="og:title"]'),
            ogDesc: m('meta[property="og:description"]'), ogImage: m('meta[property="og:image"]'), ogType: m('meta[property="og:type"]'),
            ogLocale: m('meta[property="og:locale"]'), ogUrl: m('meta[property="og:url"]'), twitter: m('meta[name="twitter:card"]'),
            canonical: m('link[rel="canonical"]', 'href'), heroAlt: (doc.querySelector('.ls-hero img') || {}).alt,
            titles: doc.querySelectorAll('title').length, scripts: doc.head.querySelectorAll('script').length };
        }""", page)
    h = head_info()
    want_desc = good_desc + ' <b>"x"</b> & y'
    check("Generated <title> is the SEO title", h["title"] == good_title, h["title"])
    check("Generated meta description is the SEO description", h["desc"] == want_desc, h["desc"])
    check("og:title / og:description match", h["ogTitle"] == good_title and h["ogDesc"] == want_desc)
    check("og:type=website, og:locale=he_IL, twitter:card=summary_large_image",
          h["ogType"] == "website" and h["ogLocale"] == "he_IL" and h["twitter"] == "summary_large_image", (h["ogType"], h["ogLocale"], h["twitter"]))
    check("og:image defaults to the hero image (absolute URL)", h["ogImage"] == hero, h["ogImage"])
    check("No canonical/og:url before the site has an address", h["canonical"] is None and h["ogUrl"] is None)
    check("Title/description are escaped in the raw HTML (no injected tags)",
          "&lt;script&gt;&quot;&amp;&#39;" in h["head"] and "<script>\"" not in h["head"] and "&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y" in h["head"]
          and h["titles"] == 1 and h["scripts"] == 0)

    # share image picker
    pg.click(f'.bshell-og-opt[data-og="{gal[1]}"]')
    check("Picking a gallery image stores it", pg.evaluate("siteState.data.seo.ogImage") == gal[1])
    check("og:image is the picked gallery image", head_info()["ogImage"] == gal[1])
    check("Picked option is marked active", pg.get_attribute(f'.bshell-og-opt[data-og="{gal[1]}"]', "aria-checked") == "true")
    pg.click('.bshell-og-opt[data-og=""]')
    check("'Main image' option goes back to the hero image", pg.evaluate("siteState.data.seo.ogImage === undefined") and head_info()["ogImage"] == hero)

    # Storage photo URLs survive the site Worker's /_img/ rewrite as absolute URLs
    storage_img = pg.evaluate("""() => {
      const d = JSON.parse(JSON.stringify(siteState.data));
      d.heroImages = []; d.heroImage = 'https://vafkjsetlrpaczsmqvqs.supabase.co/storage/v1/object/public/site-images/u/p/hero.jpg';
      const html = SITE_TEMPLATES['local-service'].render(d, 'index');
      const rewritten = html.split('https://vafkjsetlrpaczsmqvqs.supabase.co/storage/v1/object/public/site-images/').join('/_img/');
      const doc = new DOMParser().parseFromString(rewritten, 'text/html');
      return [doc.querySelector('meta[property="og:image"]').getAttribute('content'), doc.querySelector('.ls-hero img').getAttribute('src')];
    }""")
    check("og:image stays absolute after the Worker's image rewrite (the <img> still gets /_img/)",
          storage_img[0] == "https://vafkjsetlrpaczsmqvqs.supabase.co/storage/v1/object/public/site-images/u/p/hero.jpg" and storage_img[1].startswith("/_img/"), storage_img)

    # canonical once published
    pg.evaluate("sitePublishedUrl = 'https://studio-gal.deskkit.co.il/'")
    h2 = head_info()
    check("canonical + og:url appear once the address is known", h2["canonical"] == "https://studio-gal.deskkit.co.il/" and h2["ogUrl"] == h2["canonical"], (h2["canonical"], h2["ogUrl"]))
    pg.evaluate("siteState.data.pages.about = true")
    ha = head_info("about")
    check("About page: own title kept, SEO description, canonical about.html",
          ha["title"].startswith("אודות") and ha["desc"] == want_desc and ha["canonical"] == "https://studio-gal.deskkit.co.il/about.html", (ha["title"], ha["canonical"]))
    pg.evaluate("siteState.data.pages.about = false")
    pg.click('[data-serp-device="desktop"]')
    check("Preview shows the live address once published", "https://studio-gal.deskkit.co.il" in pg.inner_text("#bshell-serp"))
    pg.evaluate("sitePublishedUrl = null")

    # hero alt
    pg.fill("#bshell-set-hero-alt", 'הצוות "שלנו" & <הסטודיו>')
    check("Hero alt text reaches the hero <img>", head_info()["heroAlt"] == 'הצוות "שלנו" & <הסטודיו>', head_info()["heroAlt"])

    # autosave
    for _ in range(40):  # the Shell autosaves ~1.2s after the last edit
        saved = be.rows["p1"]["data"]
        if saved.get("heroAlt"): break
        pg.wait_for_timeout(250)
    check("SEO + alt are autosaved to the project", saved.get("seo", {}).get("title") == good_title and saved.get("heroAlt") == 'הצוות "שלנו" & <הסטודיו>',
          (saved.get("seo"), be.posts, list(be.rows), pg.inner_text("#bshell-top-status"), pg.evaluate("[siteCurrentUserId, siteProjectId]")))

    # clearing every SEO field returns exactly today's head
    pg.fill("#bshell-seo-title", "")
    pg.fill("#bshell-seo-desc", "")
    pg.fill("#bshell-set-hero-alt", "")
    check("Clearing the SEO fields removes d.seo", pg.evaluate("siteState.data.seo === undefined && siteState.data.heroAlt === undefined"))
    same = pg.evaluate("""(orig) => SITE_TEMPLATES['local-service'].render(siteState.data, 'index') === SITE_TEMPLATES['local-service'].render(orig, 'index')""", original)
    check("Cleared SEO -> identical HTML to the untouched project", same)

    # ---------------------------------------------------- moods via the UI
    before_html = pg.evaluate("SITE_TEMPLATES['local-service'].render(siteState.data, 'index')")
    before_data = pg.evaluate("JSON.stringify(siteState.data)")
    moods = pg.evaluate("JSON.parse(JSON.stringify(SITE_MOODS))")
    check("Exactly 4 moods", sorted(moods) == sorted(MOODS), list(moods))
    for key in MOODS:
        pg.click(f'.bshell-mood-btn[data-mood="{key}"]')
        m = moods[key]
        st = pg.evaluate("({ mood: siteState.data.mood, color: siteState.data.primaryColor, font: siteState.data.fontFamily, colorInput: document.getElementById('bshell-set-color').value, fontInput: document.getElementById('bshell-set-font').value })")
        check(f"Mood {key}: sets mood, primary colour and body font (and the fields show them)",
              st["mood"] == key and st["color"] == m["primaryColor"] and st["font"] == m["bodyFont"]
              and st["colorInput"].lower() == m["primaryColor"].lower() and st["fontInput"] == m["bodyFont"], st)
        canvas = pg.evaluate("""() => {
          const doc = document.getElementById('bshell-canvas-iframe').contentDocument;
          const cs = getComputedStyle(doc.documentElement);
          const h1 = doc.querySelector('h1');
          return { radius: cs.getPropertyValue('--border-radius').trim(), pad: cs.getPropertyValue('--section-padding').trim(),
                   primary: cs.getPropertyValue('--primary-color').trim(), h1font: h1 ? getComputedStyle(h1).fontFamily : '',
                   fontsLink: [...doc.querySelectorAll('link[href*="fonts.googleapis.com"]')].map(l => l.href).join(' ') };
        }""")
        heading_font = pg.evaluate(f"SITE_FONTS[{json.dumps(m['headingFont'])}]")
        check(f"Mood {key}: live canvas gets the CSS variables, heading font and its Google Fonts link",
              canvas["radius"] == m["radius"] and canvas["pad"] == m["sectionPadding"] and canvas["primary"].lower() == m["primaryColor"].lower()
              and heading_font["name"].split(" (")[0] in canvas["h1font"] and heading_font["googleParam"].split(":")[0] in canvas["fontsLink"], canvas)
    pg.click(f'.bshell-mood-btn[data-mood="tech"]')
    pg.fill("#bshell-set-color", "#ff0000")
    pg.dispatch_event("#bshell-set-color", "input")
    check("Colour can still be changed after a mood", pg.evaluate("siteState.data.primaryColor") == "#ff0000" and pg.evaluate("siteState.data.mood") == "tech")
    pg.click('.bshell-mood-btn[data-mood=""]')
    check("'ללא' keeps a colour picked by hand after the mood", pg.evaluate("siteState.data.primaryColor") == "#ff0000")
    pg.click("#bshell-undo-btn"); pg.click("#bshell-undo-btn")
    check("Undo goes back through the mood change", pg.evaluate("siteState.data.mood") == "tech")
    pg.click("#bshell-settings-btn")
    pg.wait_for_selector(".bshell-mood-btn")
    pg.click('.bshell-mood-btn[data-mood=""]')
    after_html = pg.evaluate("SITE_TEMPLATES['local-service'].render(siteState.data, 'index')")
    check("'ללא' restores byte-identical HTML", after_html == before_html, (len(after_html), len(before_html)))
    check("'ללא' restores the original colour/font data", pg.evaluate("JSON.stringify(siteState.data)") == before_data,
          pg.evaluate("JSON.stringify({c: siteState.data.primaryColor, f: siteState.data.fontFamily, m: siteState.data.mood})"))

    # every template x every mood: apply + none restores identical
    templates = pg.evaluate("Object.keys(SITE_TEMPLATES)")
    bad = []
    for tpl in templates:
        res = pg.evaluate("""([tpl, moods, orig]) => {
          const out = [];
          for (const page of ['index', 'about', 'contact']) {
            const d0 = JSON.parse(JSON.stringify(orig)); d0.pages = { about: true, contact: true };
            const ref = SITE_TEMPLATES[tpl].render(d0, page);
            for (const k of moods) {
              const d = JSON.parse(JSON.stringify(d0));
              bshellApplyMood(d, k);
              const html = SITE_TEMPLATES[tpl].render(d, page);
              if (html === ref || !html.includes('--border-radius:') || !html.includes('--section-padding:')) out.push(tpl + '/' + page + '/' + k + ' not applied');
              bshellApplyMood(d, '');
              if (SITE_TEMPLATES[tpl].render(d, page) !== ref) out.push(tpl + '/' + page + '/' + k + ' none differs');
              if (JSON.stringify(d) !== JSON.stringify(d0)) out.push(tpl + '/' + page + '/' + k + ' data differs');
            }
          }
          return out;
        }""", [tpl, MOODS, original])
        bad += res
    check(f"All {len(templates)} templates x 3 pages x 4 moods: mood applies, 'ללא' restores identical HTML and data", not bad, bad[:6])
    check("No JS errors in the builder page", not pg.errors, pg.errors[:3])

    # ---------------------------------------------------- render every template x mood at 375 / 1280
    sample = json.loads(json.dumps(original))
    sample["pages"] = {"about": False, "contact": False}
    docs = pg.evaluate("""([templates, moods, sample]) => {
      const out = {};
      for (const tpl of templates) for (const k of [''].concat(moods)) {
        const d = JSON.parse(JSON.stringify(sample));
        bshellApplyMood(d, k);
        out[tpl + '|' + (k || 'none')] = SITE_TEMPLATES[tpl].render(d, 'index');
      }
      return out;
    }""", [templates, MOODS, sample])
    ctx.close()

    overflow_js = """() => {
      const de = document.documentElement, b = document.body;
      return Math.max(de.scrollWidth, b ? b.scrollWidth : 0) - de.clientWidth;
    }"""
    for width in (375, 1280):
        vctx = br.new_context(viewport={"width": width, "height": 800})
        vctx.route("**/*", offline(port))
        vp = vctx.new_page()
        errs = []
        vp.on("pageerror", lambda e: errs.append(str(e)))
        base_over = {}
        fails, err_fails, rendered = [], [], 0
        for tpl in templates:
            for k in ["none"] + MOODS:
                errs.clear()
                vp.goto("about:blank")
                vp.set_content(docs[f"{tpl}|{k}"], wait_until="load")
                vp.wait_for_timeout(250)
                vp.mouse.wheel(0, 1500); vp.wait_for_timeout(150)
                over = vp.evaluate(overflow_js)
                has_h1 = vp.evaluate("!!document.querySelector('[data-textkey=\"heading-heroTitle\"]')")
                rendered += 1
                if k == "none": base_over[tpl] = over
                elif over > max(base_over[tpl], 0) + 1: fails.append(f"{tpl}/{k}: +{over}px (baseline {base_over[tpl]})")
                if errs or not has_h1: err_fails.append(f"{tpl}/{k}: {errs[:1]} h1={has_h1}")
        check(f"{width}px: {rendered} renders ({len(templates)} templates x none+4 moods) with no JS errors", not err_fails, err_fails[:5])
        already = {t: v for t, v in base_over.items() if v > 1}
        check(f"{width}px: no mood adds horizontal overflow (already overflowing without a mood: {already or 'none'})", not fails, fails[:5])
        vctx.close()


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
    print(f"\n{len(RESULTS) - len(failed)} passed, {len(failed)} failed, {len(RESULTS)} checks")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
