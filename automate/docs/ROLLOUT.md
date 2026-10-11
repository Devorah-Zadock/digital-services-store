# Going live — plan (needs the owner's explicit go-ahead)

Nothing below has been done on the live site. Each step is reversible.

## 0. Before (Actions → "Automate (live)" and "Backup")
- `Backup → backup-and-test`: fresh encrypted backup + restore test.
- `rehearse`: restores that backup into a throwaway database in the runner, installs
  there twice (second run must change nothing), checks RLS/rights/state, compares the
  row count of every existing table (must be identical), runs the engine tests.
- `preflight` (live, read-only): no name clashes with existing objects, secrets, admin list.

## 1. Install — DISABLED (`install`)
- `10_engine.sql` + `20_live_disabled.sql` in ONE transaction: only new tables and
  functions; no trigger or column on any existing table; every reference to an
  account is ON DELETE CASCADE (account deletion keeps working).
- Starts with: emergency stop ON, access = allowlist with nobody, no schedule, no
  functions deployed → nothing can run, nothing can be sent.
- Then `check` (read-only) any time.
- To disable later without touching the rest of the site: the admin card's emergency
  stop; or unschedule the two cron jobs. The site never depends on Automate.

## 2. Pilot prepared (`pilot-prepare`, then `pilot-check`)
- Pilot list = the one account that has an admin password (read inside the
  database — the email is never in the repository or the logs).
- Function secrets are Automate's own (`AUTOMATE_*`): mail `sink` = simulated only,
  `AUTOMATE_MAIL_ALLOWLIST` = the owner, new worker secret.
- Deploys automate-api, automate-worker, lead-intake (with the pilot gate), quote-public.
- Schedules the worker every 2 minutes (it does nothing while the emergency stop is on).
- The app: https://deskkit.co.il/automate-app.html (unlinked; others see "coming soon").
- The emergency stop stays ON — the owner turns it off from Admin → Automate when she
  wants to try it. Emails stay simulated until a separate, approved switch to live.

## 3. Real emails — owner only (needs the owner's approval)
- `AUTOMATE_MAIL_MODE=live` with `AUTOMATE_MAIL_ALLOWLIST` = the owner → real emails
  only to her own addresses; every other recipient stays simulated.

## 4. Website contact form ("השאירו פרטים")
- One shared form in every template (siteLeadFormHtml), a switch in the builder's site
  settings, off by default. Existing sites' HTML is byte-for-byte unchanged.
- The switch shows only to accounts in the pilot (`automate_my_access()`; on staging
  `DK_AUTOMATE_ENABLED`). lead-intake refuses sites whose owner isn't in the pilot.
- "I'm not a robot": the same free Cloudflare Turnstile key DeskKit's own forms use,
  loaded only when the form opens; lead-intake checks it with the existing secret.
  Check the widget's allowed hostnames with Cloudflare → `turnstile-info`.
- The owner republishes a site after turning the switch on.

## 5. Gradual opening
- Add pilot customers to `access.emails`; remove `AUTOMATE_MAIL_ALLOWLIST`.
- Then `access.mode = open`; replace the "coming soon" automate.html.
- Privacy policy and terms updated BEFORE opening (see PRIVACY-DRAFT.md).

## Before 100 active businesses
- Email volume: the free plan (100/day) will not be enough → decide on a paid email plan or Amazon SES (owner's decision).

