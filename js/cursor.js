/* Refined animated cursor: a ring + inner dot, both children of one wrapper
   that gets the position transform on every mousemove — since neither the
   ring nor the dot has its own position logic, they're always perfectly
   locked together (no lag, no "two circles chasing" effect), just a livelier
   two-layer look with a smooth grow/shrink transition on hover and click.
   Fine-pointer devices only (touch untouched). The native cursor is NEVER
   hidden until the replacement is actually in position — it only activates
   on a real mousemove, and immediately hands back control (native cursor
   visible again) whenever the pointer leaves the page, the tab loses
   visibility, or the window loses focus. */
(function () {
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

  const wrap = document.createElement("div");
  wrap.className = "cursor-wrap";
  wrap.innerHTML = `<div class="cursor-ring"></div><div class="cursor-dot"></div>`;
  document.body.appendChild(wrap);

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
    wrap.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    activate();
  });

  document.documentElement.addEventListener("mouseleave", deactivate);
  window.addEventListener("blur", deactivate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") deactivate();
  });

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
