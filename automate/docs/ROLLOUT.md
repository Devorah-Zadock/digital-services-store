# Going live — plan (needs the owner's explicit go-ahead)

Nothing below has been done on the live site. Each step is reversible.

## 0. Before
- Run `backup-and-test` (Actions → Backup) and confirm the restore test passes.
- Staging: `deploy-and-test` green.

## 1. Database (additive only)
- Apply `automate/sql/10_engine.sql` to live (NOT 90/95 — staging only).
  Creates new tables/functions; changes no existing table or row.
- Check: `security_check_live` — every new table RLS on, no anon rights.
- Rollback: drop the new tables (they hold no data yet).

## 2. Functions + schedule, sending OFF
- Deploy `automate-worker`, `automate-api`, `lead-intake`, `quote-public` to live with
  `AUTOMATE_ENV=production`, `MAIL_MODE=sink` (simulated), access = allowlist [owner only].
- pg_cron + pg_net + vault secret (same as staging's `cron` step).
- Rollback: kill switch on, unschedule cron, delete the functions.

## 3. Pilot with the owner's own account
- `MAIL_MODE=live`, `MAIL_ALLOWLIST=<owner's addresses only>` — real emails only to the owner.
- Add the owner to `access.emails`. Use it for real for a few days.
- Admin area: an "Automate" card (kill switch, today's emails, failures).

## 4. Website contact form
- Add the contact-form block to the site templates (posts to `lead-intake`, Turnstile on).
- Off by default per site; the owner turns it on.

## 5. Gradual opening
- Add pilot customers to `access.emails`; remove `MAIL_ALLOWLIST`.
- Then `access.mode = open`; replace the "coming soon" automate.html.
- Privacy policy and terms updated BEFORE opening (see PRIVACY-DRAFT.md).

## Before 100 active businesses
- Email volume: the free plan (100/day) will not be enough → decide on a paid email plan or Amazon SES (owner's decision).

