document.addEventListener("DOMContentLoaded", () => {
  const burger = document.querySelector(".burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
  }

  document.querySelectorAll(".nav-dropdown-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = btn.closest(".nav-dropdown");
      const wasOpen = dd.classList.contains("open");
      document.querySelectorAll(".nav-dropdown.open").forEach((o) => o.classList.remove("open"));
      if (!wasOpen) dd.classList.add("open");
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".nav-dropdown.open").forEach((o) => o.classList.remove("open"));
  });

  const form = document.querySelector("form.contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#name").value.trim();
      const email = form.querySelector("#email").value.trim();
      const message = form.querySelector("#message").value.trim();
      const subject = encodeURIComponent("פנייה מהאתר - " + name);
      const body = encodeURIComponent(message + "\n\nלחזרה: " + email);
      window.location.href = `mailto:digital.dz.studio@gmail.com?subject=${subject}&body=${body}`;
    });
  }
});
