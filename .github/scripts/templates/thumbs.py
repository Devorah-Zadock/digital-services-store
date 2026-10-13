"""Catalog thumbnails (images/previews/<slug>.webp, 1000x423) for the Excel
templates, drawn from the same preview rows the preview page shows, in the
style of the existing thumbnails: green title band, column headings, a few
real rows, then the key result on a gold bar."""
import html
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{width:1000px;height:423px;background:#fff;font-family:Arial,'Noto Sans Hebrew',sans-serif;direction:rtl;overflow:hidden}
.wrap{position:absolute;top:40px;left:0;right:0}
.title{background:#1F5C4E;color:#fff;font-size:27px;font-weight:700;padding:16px 20px 10px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th{background:#1F5C4E;color:#fff;font-size:15px;font-weight:700;padding:9px 8px 12px;text-align:center}
td{font-size:15px;padding:10px 8px;text-align:center;border-bottom:1px solid #E6E9E6;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td.in{background:#FDF6C4;color:#1A1AB0;font-weight:700}
tr.dots td{color:#777;background:#fff}
tr.kpi td{background:#C9973A;color:#fff;font-weight:700;font-size:16px;border:0}
"""


def pick(rows, header_row):
    head = rows[header_row - 1] if header_row - 1 < len(rows) else []
    cols = [i for i, c in enumerate(head) if c["v"]][:4]
    if len(cols) < 2:  # a calculator: label | value
        cols = [0, 1]
        head = [head[0] if head else {"v": ""}, {"v": ""}]
    data = []
    for r in rows[header_row:header_row + 8]:
        cells = [r[i] if i < len(r) else {"v": ""} for i in cols]
        if any(c["v"] for c in cells):
            data.append(cells)
        if len(data) == 4:
            break
    kpi = None
    for r in rows[2:header_row - 1]:
        for i, c in enumerate(r):
            nxt = next((x["v"] for x in r[i + 1:] if x["v"]), None)
            if c.get("fill") == "E8F1EE" and c["v"] and nxt and c["v"][0] not in "0123456789-₪":
                kpi = (c["v"], nxt)
                break
        if kpi:
            break
    return [head[i]["v"] if i < len(head) else "" for i in cols], data, kpi


def page(title, heads, data, kpi):
    th = "".join(f"<th>{html.escape(h)}</th>" for h in heads)
    trs = ""
    for row in data:
        trs += "<tr>" + "".join(
            f'<td class="{"in" if c.get("fill") == "FFF9C4" else ""}">{html.escape(c["v"])}</td>' for c in row) + "</tr>"
    trs += '<tr class="dots">' + "<td>...</td>" * len(heads) + "</tr>"
    if kpi:
        trs += f'<tr class="kpi"><td colspan="{len(heads) - 1}" style="text-align:right;padding-right:20px">{html.escape(kpi[0])}</td><td>{html.escape(kpi[1])}</td></tr>'
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body><div class='wrap'><div class='title'>{html.escape(title)}</div><table><tr>{th}</tr>{trs}</table></div></body></html>"


def render(meta, previews):
    from playwright.sync_api import sync_playwright
    from PIL import Image
    import io
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or ("/opt/pw-browsers/chromium" if os.path.exists("/opt/pw-browsers/chromium") else None))
        pg = b.new_page(viewport={"width": 1000, "height": 423})
        for slug, m in meta.items():
            rows = previews[slug]["rows"]
            title = rows[0][0]["v"] if rows and rows[0] else slug
            heads, data, kpi = pick(rows, m["header_row"])
            pg.set_content(page(title, heads, data, kpi))
            png = pg.screenshot()
            out = os.path.join(ROOT, "images", "previews", slug + ".webp")
            Image.open(io.BytesIO(png)).save(out, "WEBP", quality=88)
            print("  thumb", os.path.relpath(out, ROOT))
        b.close()
