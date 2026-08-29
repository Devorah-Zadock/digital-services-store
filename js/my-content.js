/* One place to see everything saved under this account — sites, the
   quote-app business profile, and the CV — instead of it being
   scattered across separate tools with no shared view between them.
   Sites and the CV can also be deleted from here — deleting doesn't
   refund a site's purchase (the license was for that template, not for
   keeping the row around forever), it just removes it from view and
   frees up "האתרים שלי" for something else. */

/* deleteAction is "site:<id>" / "cv" / omitted (nothing to delete — the
   quote-app profile row, or a placeholder row for content that doesn't
   exist yet). The delete button sits *beside* the link, not inside it —
   an interactive button nested in an <a> would double-fire on click. */
function myContentRowHtml(href, name, sub, deleteAction) {
  const del = deleteAction
    ? `<button type="button" class="my-content-delete-btn" data-delete="${deleteAction}" title="מחיקה" aria-label="מחיקה">🗑</button>`
    : "";
  return `<div class="my-content-row">
    <a href="${href}" class="my-site-row">
      <span class="my-site-row-name">${escapeHtmlNav(name)}</span>
      ${sub ? `<span class="my-site-row-tpl">${escapeHtmlNav(sub)}</span>` : ""}
    </a>${del}
  </div>`;
}

async function loadMyContent(user, list) {
  const rows = [];

  const { data: sites } = await supabaseClient
    .from("site_projects").select("id, template, data")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (sites && sites.length) {
    sites.forEach((s) => {
      const bizName = s.data && s.data.businessName && s.data.businessName.trim();
      rows.push(myContentRowHtml("sites.html?template=" + encodeURIComponent(s.template), bizName || "אתר עסקי", "בניית אתר", "site:" + s.id));
    });
  } else {
    rows.push(myContentRowHtml("sites.html?browse=1", "עדיין לא בניתם אתר", "בניית אתר — להתחלה"));
  }

  const { data: profile } = await supabaseClient.from("profiles").select("business_name").eq("id", user.id).maybeSingle();
  const profileName = profile && profile.business_name && profile.business_name.trim();
  rows.push(myContentRowHtml("quote-app.html", profileName || "עדיין לא הגדרתם פרטי עסק", "הצעות מחיר"));

  const { data: cv } = await supabaseClient.from("cv_saves").select("data").eq("user_id", user.id).maybeSingle();
  const cvName = cv && cv.data && cv.data.content && cv.data.content.name && cv.data.content.name.trim();
  rows.push(myContentRowHtml("builder.html", cvName || "עדיין לא יצרתם קורות חיים", "קורות חיים", cv ? "cv" : null));

  list.innerHTML = rows.join("");
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    const list = document.getElementById("my-content-rows");
    if (!user || !list) return;

    await loadMyContent(user, list);

    list.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-delete]");
      if (!btn) return;
      e.preventDefault();
      const [kind, id] = btn.dataset.delete.split(":");
      const confirmMsg = kind === "cv"
        ? "למחוק את קורות החיים השמורים שלכם? הפעולה בלתי הפיכה."
        : "למחוק את האתר הזה? הפעולה בלתי הפיכה — התוכן שהזנתם יימחק לצמיתות (הרכישה עצמה לא מוחזרת).";
      if (!confirm(confirmMsg)) return;
      btn.disabled = true;
      if (kind === "site") {
        await supabaseClient.from("site_projects").delete().eq("id", id).eq("user_id", user.id);
      } else if (kind === "cv") {
        await supabaseClient.from("cv_saves").delete().eq("user_id", user.id);
      }
      await loadMyContent(user, list);
    });
  });
});
