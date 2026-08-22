/* Refined animated cursor: a precise dot plus a thin trailing ring, for
   fine-pointer devices only (touch is untouched). The native cursor is
   NEVER hidden until the replacement is actually in position — it only
   activates on a real mousemove, and immediately hands back control
   (native cursor visible again) whenever the pointer leaves the page,
   the tab loses visibility, or the window loses focus. This closes the
   earlier bug where switching tabs or navigating left no cursor visible
   at all until the mouse physically moved again. */
(function () {
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let active = false;

  function activate() {
    if (active) return;
    active = true;
    document.documentElement.classList.add("custom-cursor-active");
  }
  function deactivate() {
    active = false;
    document.documentElement.classList.remove("custom-cursor-active");
  }

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    activate();
  });

  document.documentElement.addEventListener("mouseleave", deactivate);
  window.addEventListener("blur", deactivate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") deactivate();
  });

  function loop() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const HOVER_SELECTOR = "a, button, .btn, .tab, .lang-big, .card, .swatch, .fab, .chat-chip, " +
    "select, input, textarea, [role='button'], .job-remove, .photo-remove, .project-remove, .star, .btn-mini, .widget-close";

  document.addEventListener("mouseover", (e) => {
    if (e.target.closest && e.target.closest(HOVER_SELECTOR)) document.documentElement.classList.add("cursor-hover");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest && e.target.closest(HOVER_SELECTOR)) document.documentElement.classList.remove("cursor-hover");
  });
  document.addEventListener("mousedown", () => document.documentElement.classList.add("cursor-down"));
  document.addEventListener("mouseup", () => document.documentElement.classList.remove("cursor-down"));
})();
