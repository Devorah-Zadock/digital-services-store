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

  const L = (he, en) => (typeof dkL === "function" ? dkL(he, en) : he);

  function show(state) {
    if (state === "bad") {
      icon.textContent = "⚠️";
      title.textContent = L("הקישור לא תקין", "This link isn't valid");
      text.textContent = L("ייתכן שהקישור הועתק חלקית. אפשר לבטל את העדכונים גם ב\"החשבון שלי\", או לכתוב לנו בעמוד יצירת הקשר.", "The link may have been copied only partly. You can also turn off updates in \"My account\", or write to us on the contact page.");
      btn.hidden = true;
      return;
    }
    if (state === "error") {
      icon.textContent = "⚠️";
      title.textContent = L("משהו השתבש", "Something went wrong");
      text.textContent = L("לא הצלחנו לעדכן כרגע. נסו לרענן את העמוד בעוד דקה.", "We couldn't update right now. Try refreshing the page in a minute.");
      btn.hidden = true;
      return;
    }
    const subscribed = state === true;
    icon.textContent = subscribed ? "🎉" : "✅";
    title.textContent = subscribed ? L("חזרת לרשימת העדכונים", "You're back on the updates list") : L("הוסרת מרשימת העדכונים", "You've been removed from the updates list");
    text.textContent = subscribed
      ? L("מעולה! נמשיך לשלוח מדי פעם עדכונים קצרים על כלים חדשים וטיפים.", "Great! We'll keep sending occasional short updates about new tools and tips.")
      : L("לא נשלח לך יותר עדכונים ומבצעים במייל. הוסרת בטעות?", "We won't send you any more updates or offers by email. Removed by mistake?");
    btn.textContent = subscribed ? L("הסרה מהרשימה", "Unsubscribe") : L("החזרה לרשימת העדכונים", "Resubscribe to updates");
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
