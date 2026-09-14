/* Small, tasteful motion touches shared across pages: scroll-reveal fade-ins
   and a subtle mouse-tracked tilt on product cards. Pure CSS/JS, no libraries. */
document.addEventListener("DOMContentLoaded", () => {
  // Deliberately excludes .card: catalog grids can have many cards below the
  // fold, and product listings must never depend on a scroll event firing.
  const revealTargets = document.querySelectorAll(".feature, .step, .banner, .section-head");
  if ("IntersectionObserver" in window && revealTargets.length) {
    revealTargets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach((el) => io.observe(el));
    // Safety net: never let anything stay invisible if the observer
    // somehow doesn't fire for an element (e.g. zero-height edge cases).
    setTimeout(() => revealTargets.forEach((el) => el.classList.add("in-view")), 2500);
  }

  if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-6px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }
});
