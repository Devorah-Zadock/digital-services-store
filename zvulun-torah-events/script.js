document.body.classList.add('ready');

const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = (data.get('name') || '').toString().trim();
    const phone = (data.get('phone') || '').toString().trim();
    const date = (data.get('date') || '').toString().trim();
    const message = (data.get('message') || '').toString().trim();

    const lines = [
      `שלום, שמי ${name}`,
      `טלפון: ${phone}`,
      date ? `תאריך האירוע: ${date}` : null,
      message ? `פרטים נוספים: ${message}` : null,
      'אשמח לפרטים על הכנסת ספר תורה.',
    ].filter(Boolean);

    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/972506927171?text=${text}`, '_blank', 'noopener');
  });
}
