/* Reusable signature pad — HTML5 canvas + Pointer Events (mouse, touch and
   pen all go through the same code path). No dependencies, no network.

     const pad = createSignaturePad(container, {
       color: "#111827",      // pen colour (changeable later: pad.setColor)
       penWidth: 2.6,         // CSS px at the width the stroke was drawn
       aspectRatio: 0.38,     // canvas height = width × this…
       minHeight: 150, maxHeight: 260,
       label: "אזור חתימה",   // aria-label for the canvas
       onChange: (pad) => {}, // after every stroke / undo / clear
     });
     pad.isEmpty(); pad.undo(); pad.clear();
     pad.toDataURL("image/png", { trim: true, background: null });
     pad.toBlob("image/png", { trim: true }).then((blob) => …);

   Strokes are stored as points in coordinates NORMALISED to the canvas
   width (x / width, y / width), not raw pixels. On a resize (rotating a
   phone, a sidebar opening) the canvas is re-created at the new size and
   every stroke redrawn from those points, so the signature scales with the
   box instead of being cropped or wiped. The canvas backing store is
   multiplied by devicePixelRatio so lines stay sharp on retina screens.

   Direction-agnostic: all coordinates come from getBoundingClientRect(),
   so an RTL page (dir="rtl") changes nothing here. */

function createSignaturePad(container, options) {
  const opts = Object.assign({
    color: "#111827",
    penWidth: 2.6,
    aspectRatio: 0.38,
    minHeight: 150,
    maxHeight: 260,
    label: "Signature",
    onChange: null,
  }, options || {});

  const canvas = document.createElement("canvas");
  canvas.className = "dk-sigpad-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", opts.label);
  // touch-action:none is what actually stops the page from scrolling or
  // zooming while a finger draws; preventDefault below is the fallback.
  canvas.style.cssText = "display:block; width:100%; touch-action:none; -ms-touch-action:none; user-select:none; -webkit-user-select:none; cursor:crosshair;";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let strokes = [];      // [{ color, w (normalised width), points: [{x, y}] }]
  let current = null;
  let activePointer = null;
  let cssW = 0, cssH = 0, dpr = 1;
  let color = opts.color;

  function notify() { if (typeof opts.onChange === "function") opts.onChange(api); }

  function measure() {
    const w = Math.max(1, Math.round(container.clientWidth || canvas.getBoundingClientRect().width || 300));
    const h = Math.round(Math.min(opts.maxHeight, Math.max(opts.minHeight, w * opts.aspectRatio)));
    return { w, h };
  }

  function resize() {
    const { w, h } = measure();
    const ratio = window.devicePixelRatio || 1;
    if (w === cssW && h === cssH && ratio === dpr) return;
    cssW = w; cssH = h; dpr = ratio;
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    redraw();
  }

  /* Smooth line: quadratic curves through the midpoints between samples
     (each sample is the control point), which removes the polyline
     "corners" of fast strokes without lagging behind the pointer. */
  function drawStroke(c, s, scale) {
    const pts = s.points;
    if (!pts.length) return;
    c.strokeStyle = s.color;
    c.fillStyle = s.color;
    c.lineWidth = Math.max(0.5, s.w * scale);
    c.lineCap = "round";
    c.lineJoin = "round";
    if (pts.length === 1) {
      c.beginPath();
      c.arc(pts[0].x * scale, pts[0].y * scale, c.lineWidth / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }
    c.beginPath();
    c.moveTo(pts[0].x * scale, pts[0].y * scale);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      c.quadraticCurveTo(pts[i].x * scale, pts[i].y * scale, mx * scale, my * scale);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last.x * scale, last.y * scale);
    c.stroke();
  }

  function redraw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of strokes) drawStroke(ctx, s, cssW);
    if (current) drawStroke(ctx, current, cssW);
  }

  function pointFrom(e) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || cssW || 1;
    return { x: (e.clientX - rect.left) / w, y: (e.clientY - rect.top) / w };
  }

  function onDown(e) {
    if (activePointer !== null) return;          // ignore a second finger
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    activePointer = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
    current = { color, w: opts.penWidth / (cssW || 1), points: [pointFrom(e)] };
    redraw();
  }

  function onMove(e) {
    if (e.pointerId !== activePointer || !current) return;
    e.preventDefault();
    // Coalesced events give every sample the hardware reported between two
    // frames — noticeably smoother lines on pens and fast mouse moves.
    const list = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
    const events = list && list.length ? list : [e];
    for (const ev of events) {
      const p = pointFrom(ev);
      const prev = current.points[current.points.length - 1];
      // Skip sub-pixel jitter (keeps the point list small).
      if (Math.abs(p.x - prev.x) * cssW < 0.6 && Math.abs(p.y - prev.y) * cssW < 0.6) continue;
      current.points.push(p);
    }
    redraw();
  }

  function onUp(e) {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (current && current.points.length) strokes.push(current);
    current = null;
    redraw();
    notify();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  // Older iOS Safari can still start a scroll from touchmove even with
  // touch-action set — belt and braces, only while a stroke is in progress.
  canvas.addEventListener("touchmove", (e) => { if (activePointer !== null) e.preventDefault(); }, { passive: false });

  let ro = null;
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(() => resize());
    ro.observe(container);
  } else {
    window.addEventListener("resize", resize);
  }
  resize();

  /* Renders the strokes onto a fresh canvas for export. `trim` crops to the
     ink plus a small margin; `background` null keeps PNG transparency. */
  function exportCanvas(o) {
    o = o || {};
    const scale = (o.scale || 2) * cssW;
    const full = { x0: 0, y0: 0, x1: cssW / cssW, y1: cssH / cssW };
    let box = full;
    if (o.trim && strokes.length) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, wMax = 0;
      for (const s of strokes) {
        wMax = Math.max(wMax, s.w);
        for (const p of s.points) {
          if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y;
          if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y;
        }
      }
      const pad = wMax + 0.02;
      box = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
    }
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round((box.x1 - box.x0) * scale));
    out.height = Math.max(1, Math.round((box.y1 - box.y0) * scale));
    const c = out.getContext("2d");
    if (o.background) { c.fillStyle = o.background; c.fillRect(0, 0, out.width, out.height); }
    c.translate(-box.x0 * scale, -box.y0 * scale);
    for (const s of strokes) drawStroke(c, s, scale);
    return out;
  }

  const api = {
    canvas,
    isEmpty() { return strokes.length === 0 && !current; },
    clear() { strokes = []; current = null; redraw(); notify(); },
    undo() { if (strokes.length) { strokes.pop(); redraw(); notify(); } },
    setColor(c) { color = c; },
    getColor() { return color; },
    toDataURL(type, o) { return exportCanvas(o).toDataURL(type || "image/png"); },
    toBlob(type, o) {
      const out = exportCanvas(o);
      return new Promise((resolve) => out.toBlob((b) => resolve(b), type || "image/png"));
    },
    resize,
    destroy() {
      if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
      canvas.remove();
    },
  };
  return api;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createSignaturePad };
}
