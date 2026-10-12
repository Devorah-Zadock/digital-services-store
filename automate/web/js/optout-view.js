/* optout.html — a business's client stops automated emails from that
   business. The signed token in the link is the only key (client-optout).
   Nothing happens until the button is pressed (email scanners open links). */
(function () {
  "use strict";
  const t = new URLSearchParams(location.search).get("t") || "";
  const $ = (id) => document.getElementById(id);
  const en = !/^he\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || "he");
  const T = en ? {
    title: "Unsubscribe from automated emails",
    ask: (b, e) => `Stop automated emails from ${b || "this business"} to ${e}?`,
    go: "Unsubscribe",
    done: (b) => `Done. You will not receive more automated emails from ${b || "this business"}.`,
    bad: "This link is not valid. You can reply to the email and ask the business to remove you.",
    err: "Something went wrong. Please try again in a moment.",
    foot: "Sent via DeskKit",
  } : {
    title: "הסרה ממיילים אוטומטיים",
    ask: (b, e) => `להפסיק לקבל מיילים אוטומטיים מ${b || "העסק"} לכתובת ${e}?`,
    go: "הסירו אותי",
    done: (b) => `בוצע. לא יישלחו אליך עוד מיילים אוטומטיים מ${b || "העסק"}.`,
    bad: "הקישור אינו תקין. אפשר להשיב למייל ולבקש מהעסק להסיר אותך.",
    err: "משהו השתבש. נסו שוב בעוד רגע.",
    foot: "נשלח באמצעות DeskKit",
  };
  if (en) { document.documentElement.lang = "en"; document.documentElement.dir = "ltr"; }
  document.title = $("ov-title").textContent = T.title;
  $("ov-foot").textContent = T.foot;

  async function call(action) {
    const res = await fetch(SUPABASE_URL + "/functions/v1/client-optout", {
      method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ t, action }),
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  }
  function show(d) {
    if (d.optedOut) { $("ov-text").hidden = true; $("ov-go").hidden = true; $("ov-done").textContent = T.done(d.business); $("ov-done").hidden = false; return; }
    $("ov-text").textContent = T.ask(d.business, d.email);
    $("ov-go").textContent = T.go; $("ov-go").hidden = false;
  }
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const r = await call("get");
      if (!r.ok) { $("ov-text").textContent = r.status === 400 ? T.bad : T.err; return; }
      show(r.data);
    } catch { $("ov-text").textContent = T.err; }
    $("ov-go").addEventListener("click", async () => {
      $("ov-go").disabled = true; $("ov-err").textContent = "";
      try {
        const r = await call("optout");
        if (r.ok) show(r.data); else { $("ov-err").textContent = T.err; $("ov-go").disabled = false; }
      } catch { $("ov-err").textContent = T.err; $("ov-go").disabled = false; }
    });
  });
})();
