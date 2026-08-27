/* One place to see everything saved under this account — sites, the
   quote-app business profile, and the CV — instead of it being
   scattered across separate tools with no shared view between them. */

function myContentRowHtml(href, name, sub) {
  return `<a href="${href}" class="my-site-row">
    <span class="my-site-row-name">${escapeHtmlNav(name)}</span>
    ${sub ? `<span class="my-site-row-tpl">${escapeHtmlNav(sub)}</span>` : ""}
  </a>`;
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    const list = document.getElementById("my-content-rows");
    if (!user || !list) return;

    const rows = [];

    const { data: sites } = await supabaseClient
      .from("site_projects").select("template, data")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (sites && sites.length) {
      sites.forEach((s) => {
        const bizName = s.data && s.data.businessName && s.data.businessName.trim();
        rows.push(myContentRowHtml("sites.html?template=" + encodeURIComponent(s.template), bizName || "אתר עסקי", "בניית אתר"));
      });
    } else {
      rows.push(myContentRowHtml("sites.html?browse=1", "עדיין לא בניתם אתר", "בניית אתר — להתחלה"));
    }

    const { data: profile } = await supabaseClient.from("profiles").select("business_name").eq("id", user.id).maybeSingle();
    const profileName = profile && profile.business_name && profile.business_name.trim();
    rows.push(myContentRowHtml("quote-app.html", profileName || "עדיין לא הגדרתם פרטי עסק", "הצעות מחיר"));

    const { data: cv } = await supabaseClient.from("cv_saves").select("data").eq("user_id", user.id).maybeSingle();
    const cvName = cv && cv.data && cv.data.content && cv.data.content.name && cv.data.content.name.trim();
    rows.push(myContentRowHtml("builder.html", cvName || "עדיין לא יצרתם קורות חיים", "קורות חיים"));

    list.innerHTML = rows.join("");
  });
});
