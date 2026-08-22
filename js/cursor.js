/* Animated custom cursor: a small dot that tracks the mouse exactly, plus a
   ring that trails behind it with easing. Only on devices with a real mouse
   (pointer: fine) — touch devices keep the native cursor untouched. */
(function () {
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.documentElement.classList.add("custom-cursor-active");

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let active = false;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    if (!active) { active = true; dot.style.opacity = "1"; ring.style.opacity = "1"; }
  });
  document.addEventListener("mouseleave", () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  });

  function loop() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
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
