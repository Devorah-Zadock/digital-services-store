# DeskKit Automate — where things stand (12.10.2026)

## On the live site
- Engine installed (11.10, one transaction, after a fresh backup + restore test and a
  full rehearsal on a restored copy): 13 new tables, RLS everywhere, no visitor rights,
  no change to any existing table.
- State: **emergency stop ON**, pilot list = the owner's admin account only, emails
  **simulated only** (`AUTOMATE_MAIL_MODE=sink`, allowlist = owner), worker scheduled
  every 2 minutes (answers "killed" while the stop is on).
- Pilot app: https://deskkit.co.il/automate-app.html (unlinked; anyone else sees
  "coming soon"). Admin → "Automate" tab: status + emergency stop.
- Isolation: lead-intake refuses sites outside the pilot; browser writes require
  `automate_my_access()`; `pilot-check` verifies no data of other accounts.
- To try it: Admin → Automate → turn the emergency stop off. Everything stays
  simulated (no real email) until a separate, approved switch.

## Automations (13)
Sales: lead_autopilot, lead_nurture, quote_followup, quote_expiry, quote_won, quote_lost ·
Money: invoice_collect, paid_thanks · Service: client_onboarding, review_request,
service_reminder · Assistant: daily_digest, weekly_report.
Six business packs. Every automation is tested end to end on staging (T1–T27).

## Since 11.10
- Clients can unsubscribe: every client email has a signed link (and a
  one-click header for mail apps); opted-out addresses get nothing more
  from that business (`automate_optouts`, `client-optout`, `optout.html`).
- English: the app, packs and every email; each business picks the
  language of its emails. Hebrew output is unchanged.
- "Reach out again later" (a marketing email) is off by default.
- Pro tier: accounts with DeskKit Pro get higher limits (see PRICING.md).

## Keeping live up to date
`Automate (live)` → `upgrade`: re-applies the engine (one transaction, settings kept),
redeploys the four functions, runs the pilot isolation check.

## Still open (owner decisions)
1. Real emails for the owner only (`AUTOMATE_MAIL_MODE=live`, allowlist = owner).
2. Charging for Automate — see PRICING.md (nothing is charged today).
3. A lawyer's review of the updated privacy/terms before opening to customers.
4. Email volume plan before ~100 active businesses (free provider: 100/day total).
