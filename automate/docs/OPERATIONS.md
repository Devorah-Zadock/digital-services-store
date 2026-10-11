# DeskKit Automate — how it works and how to run it

## The moving parts
| Part | Where | What it does |
|---|---|---|
| Automation library | `functions/_shared/automate/templates.ts` | 7 automations + 6 business packs, defined once for everyone |
| Business data | `contacts`, `tasks`, `quote_shares`, `invoice_tracking`, `business_profiles` | owner-only (RLS) |
| Events | `automation_events` | written by triggers in the same transaction as the change; unique key = never twice |
| Runs | `automation_runs` | one per event × active automation; a wait is `next_run_at`, not a process |
| Step log | `automation_run_steps` | every step; a completed step can't be completed again (unique index) |
| Outbox | `automation_messages` | every email; unique key; sent by the dispatcher within caps |
| Worker | `functions/automate-worker` | pg_cron every minute (+ daily 05:00 UTC for the morning brief) |
| App API | `functions/automate-api` | everything the owner does; identity from the session only |
| Public | `functions/lead-intake`, `functions/quote-public` | site forms; the client's quote link |

## Safety controls (all in `automate_settings`)
- **Kill switch** — `kill_switch = {"on": true}` stops every run and every email at the next tick (≤ 1 minute). Nothing is lost: work waits and continues when switched off.
- **Daily email cap (whole system)** — `email_caps.automation_daily` (default 30). The free email plan has 100/day shared with sign-up and password emails; automations never take more than the cap. Over the cap, emails wait for the next morning.
- **Per-business monthly limits** — `plan_limits.free` (default 10 active automations, 300 runs, 200 emails). Over the limit: the automation is "waiting for quota", nothing is dropped, an alert is shown.
- **Quiet hours** — client emails wait outside 08:00–21:00 Israel time and over Shabbat (Fri 14:00 → Sat 20:00). Owner alerts go any time.
- **Mail mode** — nothing is really sent unless `AUTOMATE_MAIL_MODE=live`. `AUTOMATE_MAIL_ALLOWLIST` restricts live sending to listed addresses (pilot).
- **Pilot gate** — `access = {"mode": "allowlist", "emails": [...]}` (live default) or `{"mode": "open"}`.
- **Pause** — per automation, by the owner: waiting runs hold, new events start nothing.

## When things fail
| Failure | What happens |
|---|---|
| Email provider down / 5xx / timeout | email waits and retries (1 min → 12 h, up to 6 tries), then "failed" + alert |
| Address rejected | email "failed" at once + alert to the owner |
| Provider daily quota | emails wait until the next morning + system alert |
| A step throws | the run retries with backoff (5 tries), then "failed" + alert; 3 failed runs in a row → automation "needs attention" |
| Worker crashes mid-run | the run's lock expires (3 min) and another tick continues; finished steps are not repeated |
| Two workers at once | SKIP LOCKED: each run/email is taken by one worker only (tested with 4 in parallel) |
| Quote approved/declined, invoice paid, lead lost | waiting runs about it are cancelled, and unsent client emails are cancelled |

## Where to look
- Owner: the app → "מה קרה" (every run, every step, every email and its status) and alerts at the top.
- Staging counts: Actions → Staging (Automate) → `status`.
- Tests: Actions → Staging (Automate) → `deploy-and-test` (unit + 75+ end-to-end + browser smoke).

## Data lifecycle
- Deleting an account deletes all its Automate data (FK cascade; tested).
- Imports from the browser CRM keep the browser copy; nothing is deleted locally.
- Logs: finished runs, their steps, emails and alerts are deleted after 90 days (automate_cleanup, daily).
