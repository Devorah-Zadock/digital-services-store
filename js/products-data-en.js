/* English texts for the catalog (js/products-data.js holds the Hebrew).
   Loaded after products-data.js and i18n.js; when the interface is in
   English it swaps each product's texts in place, so every page that reads
   PRODUCTS (catalog, product page, home) shows English without changes of
   its own. Decks and spreadsheets are Hebrew (RTL) files — the English
   texts say so honestly. */
(function () {
  "use strict";
  if (typeof PRODUCTS === "undefined" || typeof currentLang !== "function" || currentLang() !== "en") return;

  const BADGES = {
    "חינם": "Free", "PDF מותאם אישית": "Custom PDF", "עברית RTL": "Hebrew or English", "בילדר חי": "Live builder",
    "קובץ PowerPoint (.pptx)": "PowerPoint file (.pptx)", "7 שקפים": "7 slides", "6 שקפים": "6 slides", "5 שקפים": "5 slides",
    "16:9 · עברית RTL": "16:9 · Hebrew (RTL)", "קובץ Excel (.xlsx)": "Excel file (.xlsx)", "נוסחאות מובנות": "Built-in formulas",
  };
  const FORMATS = { "PDF מותאם אישית": "Custom PDF", "PowerPoint (.pptx)": "PowerPoint (.pptx)", "Excel (.xlsx)": "Excel (.xlsx)" };
  const CATEGORIES = { general: "General", dev: "Development", design: "Design", accounting: "Accounting", deck: "Presentations", xlsx: "Spreadsheets" };
  const FREE = "Instant, free download (Hebrew file)";
  const XL = "Instant, free download — a regular Excel file";
  const YELLOW = "Yellow cells show exactly what to fill in";
  const LIVE = "Live editing on the site before you download";

  const T = {
    "cv-general-modern": ["Resume template — sidebar", "Dark sidebar with an initials avatar and an experience timeline. Fits any field.",
      "A modern two-column design: a dark sidebar with an initials avatar, contact details and skills as tags, next to an experience timeline. Fits any field and any career stage.",
      ["Edit your details and see the result live", "Pick the color that suits you", "Completely free PDF download — no payment", "Hebrew or English, your choice, in the same builder"]],
    "cv-dev-dark": ["Resume template — developers (dark sidebar)", "Dark navy sidebar, technical timeline, tech tags. Made for developers.",
      "A two-column tech design with a dark navy sidebar — technologies shown as tags, a prominent GitHub link, and a timeline that highlights projects and measurable impact.",
      ["Technologies shown as tags, not a dry list", "A dedicated spot for your GitHub / portfolio link", "Live editing, including the sidebar color", "For developers at every level — junior to senior"]],
    "cv-dev-minimal": ["Resume template — developers (bold)", "Huge name, colored role tag, numbered headings. Bold and current.",
      "A contemporary editorial design: a big, bold name, a colored role tag, numbered section headings and skills as tags. For anyone who wants to look current without giving up order.",
      ["Big, bold typography that gets noticed", "Room for GitHub, portfolio and personal site links", LIVE, "Also good when moving between technical roles"]],
    "cv-dev-fullstack": ["Resume template — Full-Stack (turquoise sidebar)", "Turquoise sidebar with a projects section. For Full-Stack developers.",
      "A two-column turquoise design with a dedicated projects section — show personal projects with a GitHub link next to your work experience. Great for developers who want to show what they build on their own, not just where they worked.",
      ["A separate projects section — with a link for each", "Sidebar with technology tags", "Live editing, including colors", "Also suits career changers into tech"]],
    "cv-dev-junior": ["Resume template — junior / bootcamp grads (bold)", "Puts projects and education first when there isn't much work experience yet.",
      "A bold design built for people starting out in programming — bootcamp grads, career changers or new graduates. The projects section takes center stage to make up for limited work experience.",
      ["Built to highlight projects instead of work history", "Room to feature a final / bootcamp project", LIVE, "Also suits a career change into programming"]],
    "cv-design-creative": ["Resume template — designers (bold)", "Huge name, a decorative graphic shape, colorful tags. Not another boring template.",
      "A bold editorial design with large typography, a decorative graphic shape and skills as colorful tags — a CV that shows design taste instead of just describing it. A dedicated spot for your portfolio link.",
      ["Huge type and a graphic shape that catch the eye", "A dedicated portfolio link", "Choose the main color in the live builder", "For graphic, UX/UI and brand designers"]],
    "cv-design-portfolio": ["Resume template — designers (sidebar)", "Burgundy sidebar, initials avatar, experience timeline.",
      "A restrained two-column design with a soft burgundy sidebar, an initials avatar and an experience timeline. For designers who'd rather let their work (in a separate portfolio) do the talking.",
      ["A tidy sidebar with every detail at a glance", "Room for a portfolio / personal site link", LIVE, "Also suits print and brand designers"]],
    "cv-design-uiux": ["Resume template — UI/UX (turquoise sidebar)", "Turquoise sidebar, initials avatar, room for a portfolio link.",
      "A professional two-column turquoise design focused on user research and testing experience. For UI/UX designers who work in a structured product process.",
      ["A sidebar with every detail at a glance", "A dedicated portfolio link (Dribbble/Behance)", "Live editing, including colors", "For product designers and UX researchers"]],
    "cv-design-motion": ["Resume template — motion / video (bold)", "Large, creative-style typography for motion and video people.",
      "A bold purple design with large type and numbered headings — for motion designers, video editors and creatives who want a CV that feels like part of their portfolio.",
      ["Large type that grabs attention immediately", "Room for a showreel or Vimeo/YouTube link", "Choose the main color in the live builder", "For motion design, video editing and animation"]],
    "cv-accounting-classic": ["Resume template — accounting (classic)", "Quiet, polished serif design with numbered headings. ATS-friendly.",
      "A quiet, polished design in a classic serif with numbered section headings and a thin frame — no unnecessary color, but not boring either. For accounting, finance and roles that call for a serious, trustworthy impression.",
      ["A conservative design for traditional workplaces", "A clear structure that applicant-tracking systems (ATS) read well", "Live editing, always a free download", "For accounting, finance and audit"]],
    "cv-accounting-modern": ["Resume template — accounting (modern sidebar)", "Dark turquoise sidebar — a more current look for accounting roles.",
      "A more modern two-column take on the classic version — still professional and serious, but with a colored sidebar and an initials avatar. For anyone who wants to look current without losing seriousness.",
      ["A more modern look than the classic, still professional", "A sidebar with every detail at a glance", "Live editing, always a free download", "Good for bookkeepers early in their career"]],
    "cv-finance-analyst": ["Resume template — financial analyst (quiet)", "Quiet, polished dark-green design for financial analysis roles.",
      "A quiet, polished design with numbered headings in a business dark green — for financial analysts, economists and business data roles that call for a precise, professional impression.",
      ["A serious business design for the finance world", "A clear place for analytical tools (Excel, Power BI, SQL)", "Live editing, always a free download", "For analysts, economists and research roles"]],
    "cv-business-clean": ["Resume template — clean business", "Quiet, polished design with numbered headings, for any business or operations role.",
      "A quiet, polished design with a soft navy accent and numbered section headings — a safe, professional choice for roles that don't fit a specific category: operations, management, customer service and more.",
      ["A neutral design that suits almost any role", "A clear, readable structure", LIVE, "A safe pick when you're not sure which template fits"]],
    "cv-sales": ["Resume template — sales / business development (bold)", "Large type with a graphic shape; puts goals and results in numbers up front.",
      "A bold orange-red design with large type — built to highlight achievements in numbers (sales targets, revenue, percent of target), exactly what makes a sales recruiter stop and read.",
      ["A structure that highlights measurable results", "Large type that gets noticed", "Choose the main color in the live builder", "For sales, business development and account managers"]],
    "cv-customer-service": ["Resume template — customer service / success (sidebar)", "Turquoise-grey sidebar, for service and customer roles.",
      "A pleasant, professional two-column design in a soft turquoise-grey — for customer service, Customer Success and technical support roles, with a structure that highlights retention and satisfaction.",
      ["A structure that highlights service metrics (retention, satisfaction)", "A sidebar with every detail at a glance", "Live editing, always a free download", "For customer service, success and support"]],
    "biz-deck-profile": ["Company profile template", "A full 7-slide PowerPoint deck in one consistent design. Free.",
      "A full 7-slide PowerPoint deck in a consistent, professional design — for client meetings, investors or presenting your business. Includes title, about us, services, process, numbers, team and contact slides.",
      ["A fully editable PowerPoint file — text, colors and images", "A consistent color palette that looks professional", "Numbers and process slides ready to fill", "Instant, free download with a simple sign-in"]],
    "deck-product-launch": ["Product presentation template", "A PowerPoint for launching a product — problem, features, pricing. Free.",
      "A PowerPoint for presenting a new product or service — the problem it solves, key features, three-tier pricing and a call to action. For launches and sales meetings.",
      ["A flow that takes viewers from problem to solution", "A ready three-tier pricing slide — easy to adapt", "A fully editable PowerPoint file", FREE]],
    "deck-content-webinar": ["Content / webinar template", "A PowerPoint for a talk, webinar or lesson. Free.",
      "A PowerPoint for teaching content — a talk, webinar or lesson. Includes an agenda slide, content slides with icons, key takeaways and a closing slide. A clear structure that's easy to fill.",
      ["An agenda slide that tells viewers what to expect", "Highlighted content slides with an icon per point", "A key-takeaways slide at the end", FREE]],
    "deck-investor-pitch": ["Investor pitch template", "A fundraising PowerPoint — problem, market, traction, ask. Free.",
      "A PowerPoint for an investor pitch — problem and solution, market size, traction and the ask. A classic pitch-deck structure covering everything an investor wants to see.",
      ["The classic problem–solution–market–traction–ask flow", "A ready market-size slide (TAM/SAM/SOM)", "A traction slide with room for your numbers", FREE]],
    "deck-creative-portfolio": ["Creative portfolio template", "A PowerPoint for showing work and projects. Free.",
      "A minimal, elegant PowerPoint for a portfolio — for freelancers, designers and creatives. Includes about, selected work, a client testimonial and contact slides.",
      ["A minimal design that leaves room for your work", "A ready testimonial slide for a client quote", "A fully editable PowerPoint file", FREE]],
    "deck-cinematic-pitch": ["Dark cinematic pitch template", "A dark-mode PowerPoint with neon glow and a dramatic growth chart. Free.",
      "A PowerPoint on deep charcoal with turquoise and purple glow — built to impress investors and clients. Includes title, vision, services, a styled growth chart, advantages and contact slides.",
      ["A dark background with glow effects behind the numbers", "A data slide with a styled, highlighted bar chart", "A fully editable PowerPoint file — text, colors and images", "Instant, free download with a simple sign-in"]],
    "deck-editorial-brand": ["Fashion magazine template", "A PowerPoint in a luxury magazine style with large serif type. Free.",
      "A clean, luxurious PowerPoint that feels like leafing through a fashion magazine — large serif type, generous white space and soft earth tones. For fashion brands, architects and premium businesses.",
      ["Elegant serif headings", "Generous white space that lets content breathe", "A fully editable PowerPoint file", FREE]],
    "deck-neopop-business": ["Energetic pop-art template", "A bold, colorful neo-brutalist PowerPoint. Free.",
      "A bold, colorful PowerPoint — acid yellow, tangerine and royal blue with thick comic-style black frames. For talks, workshops and young brands that want to lift the energy in the room.",
      ["Bold colors and thick black frames on every slide", "'Sticker' slides for numbers and achievements", "A fully editable PowerPoint file", FREE]],
    "xlsx-budget": ["Monthly budget template", "An Excel sheet for tracking income and expenses with an automatic summary. Free.",
      "An Excel sheet for a personal monthly budget — enter income and expenses by category, and the summary (total income, total expenses, balance) updates automatically with formulas. Only the yellow cells need filling.",
      ["Real formulas — no fixed numbers to update by hand", YELLOW, "Income/expense/balance summary updates by itself", XL]],
    "xlsx-invoice": ["Business invoice template", "An Excel invoice with automatic VAT. Free.",
      "An Excel business invoice — business and client details, a table of lines with quantity and unit price, and a summary with subtotal, VAT (17%, Israel) and total, all calculated with formulas.",
      ["Automatic line totals (quantity × price)", "VAT and total calculated for you", YELLOW, XL]],
    "xlsx-expense": ["Business expense tracker template", "An Excel sheet for business expenses by category and supplier, with automatic totals. Free.",
      "An Excel sheet for a business's running expenses — date, category, supplier, description and amount for each expense. The summary totals each category (rent, equipment, marketing, software, shipping and more) and the overall total, so you always know where the money goes.",
      ["Automatic breakdown of expenses by category", YELLOW, "Empty rows ready for more entries", XL]],
    "xlsx-clients": ["Client tracker template", "A simple Excel sheet for leads and clients — contact details, status and notes. Free.",
      "An Excel sheet for managing clients and leads without a complicated CRM — name, phone, email, status (lead / active / closed), first-contact date and free notes. The summary counts clients in each status and the total.",
      ["Automatic count of clients by status", YELLOW, "Empty rows ready for more entries", XL]],
    "xlsx-cashflow": ["Cash-flow template", "An Excel monthly cash-flow sheet with balances that roll over automatically. Free.",
      "An Excel cash-flow forecast — income and expenses for each month, and each month's closing balance automatically becomes the next month's opening balance. See in advance whether there will be enough cash, not only afterwards.",
      ["Balances roll over automatically month to month", YELLOW, "A period summary of income, expenses and closing balance", XL]],
    "xlsx-inventory": ["Inventory tracker template", "An Excel inventory sheet with stock value and a 'reorder' status calculated for you. Free.",
      "An Excel inventory sheet — quantity in stock, reorder point and unit cost for each item. Stock value is calculated automatically, and any item below its reorder point is flagged 'reorder' by itself — no need to scan every row.",
      ["Stock value calculated per item and in total", "Automatic 'reorder' flag based on your reorder point", YELLOW, XL]],
    "xlsx-timeline": ["Project timeline template", "An Excel sheet for project tasks, with duration and status (in progress / late / done) calculated for you. Free.",
      "An Excel project schedule — owner, start and end dates and percent complete for each task. Duration is calculated automatically, and the status (in progress / late / done) updates against today's date.",
      ["Each task's duration calculated from its dates", "'Late' flagged automatically against today's date", YELLOW, XL]],
    "xlsx-pnl": ["Profit & loss template", "An Excel monthly P&L with gross profit, net profit and margins calculated for you. Free.",
      "An Excel monthly profit-and-loss statement — revenue, cost of sales and operating expenses by line. Gross profit, net profit and margins are calculated automatically, so you can see clearly how much is left from every unit of revenue.",
      ["Gross and net profit calculated automatically", "Margins shown next to the amounts", YELLOW, XL]],
    "xlsx-timesheet": ["Timesheet template", "An Excel sheet for staff hours, with hours and pay calculated from an hourly rate. Free.",
      "An Excel timesheet — date, employee, start and end time for each shift. Hours worked and pay (by hourly rate) are calculated automatically, with a total at the bottom.",
      ["Hours calculated from start and end times", "Total pay calculated from the hourly rate", YELLOW, XL]],
    "xlsx-breakeven": ["Break-even & pricing template", "An Excel sheet for break-even and pricing — how many units cover your costs. Free.",
      "An Excel break-even and pricing calculator — enter fixed costs, variable cost per unit and selling price, and the sheet works out how many units you need to sell to cover costs, plus a table of profit/loss at several sales levels.",
      ["Break-even point (units and revenue) calculated automatically", "A profit/loss scenario table by units sold", YELLOW, XL]],
    "xlsx-salestargets": ["Sales vs. targets template", "An Excel sheet for sales against a monthly target, with achievement % and running totals. Free.",
      "An Excel sheet for sales against targets — a sales target and actual sales for each month. Achievement %, the gap to target and cumulative sales are calculated automatically, so you always know where you stand against the annual goal.",
      ["Target achievement % calculated for each month", "Cumulative sales update by themselves", YELLOW, XL]],
    "xlsx-vendors": ["Vendor comparison template", "An Excel sheet comparing suppliers by price, delivery time and quality, with an automatic recommendation. Free.",
      "An Excel sheet for comparing suppliers — price, delivery time and quality rating for each. The sheet calculates a weighted score per supplier and recommends the highest-scoring one, so the decision isn't based on price alone.",
      ["A weighted score calculated for each supplier", "The recommended supplier is marked automatically", YELLOW, XL]],
  };

  PRODUCTS.forEach((p) => {
    const t = T[p.slug];
    if (t) { p.title = t[0]; p.shortDesc = t[1]; p.heroDesc = t[2]; p.checklist = t[3]; }
    if (p.formatBadges) p.formatBadges = p.formatBadges.map((b) => BADGES[b] || b);
    if (FORMATS[p.format]) p.format = FORMATS[p.format];
    if (CATEGORIES[p.categorySlug]) p.category = CATEGORIES[p.categorySlug];
  });
})();
