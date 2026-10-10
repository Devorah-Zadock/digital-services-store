/* unsubscribe.html — the link at the bottom of every DeskKit update
   email (?u=<account>&t=<token>). Opening the page unsubscribes right
   away (one click, as promised in the email); the button undoes it.
   supabase/functions/email-preferences checks the token. */
(function () {
  const params = new URLSearchParams(location.search);
  const u = params.get("u");
  const t = params.get("t");
  const icon = document.getElementById("unsub-icon");
  const title = document.getElementById("unsub-title");
  const text = document.getElementById("unsub-text");
  const btn = document.getElementById("unsub-btn");

  function show(state) {
    if (state === "bad") {
      icon.textContent = "⚠️";
      title.textContent = "הקישור לא תקין";
      text.textContent = "ייתכן שהקישור הועתק חלקית. אפשר לבטל את העדכונים גם ב\"החשבון שלי\", או לכתוב לנו בעמוד יצירת הקשר.";
      btn.hidden = true;
      return;
    }
    if (state === "error") {
      icon.textContent = "⚠️";
      title.textContent = "משהו השתבש";
      text.textContent = "לא הצלחנו לעדכן כרגע. נסו לרענן את העמוד בעוד דקה.";
      btn.hidden = true;
      return;
    }
    const subscribed = state === true;
    icon.textContent = subscribed ? "🎉" : "✅";
    title.textContent = subscribed ? "חזרת לרשימת העדכונים" : "הוסרת מרשימת העדכונים";
    text.textContent = subscribed
      ? "מעולה! נמשיך לשלוח מדי פעם עדכונים קצרים על כלים חדשים וטיפים."
      : "לא נשלח לך יותר עדכונים ומבצעים במייל. הוסרת בטעות?";
    btn.textContent = subscribed ? "הסרה מהרשימה" : "החזרה לרשימת העדכונים";
    btn.dataset.next = subscribed ? "unsubscribe" : "subscribe";
    btn.hidden = false;
  }

  async function call(action) {
    const res = await fetch(SUPABASE_URL + "/functions/v1/email-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ u, t, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 400 && data.error === "bad-link") return "bad";
    if (!res.ok) return "error";
    return !!data.subscribed;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    show(await call(btn.dataset.next));
    btn.disabled = false;
  });

  if (!u || !t) { show("bad"); return; }
  call("unsubscribe").then(show).catch(() => show("error"));
})();
