# Email providers — recommendation and safe migration plan (12.10.2026)

Nothing here has been bought, opened or switched. Prices are from current
third-party summaries (the providers' own pages could not be reached from
the build environment) — re-check them on the official pricing pages
before any decision.

## How DeskKit sends email today

| Stream | What | How |
|---|---|---|
| **Auth** | sign-up confirmation, password reset, email change | Supabase Auth → custom SMTP `smtp.resend.com` (set by `.github/scripts/supabase_api.py smtp-resend`), sender `noreply@deskkit.co.il`, Hebrew templates in `supabase/templates/` |
| **Account** | welcome, owner updates/mailing, admin security codes, receipts, contact form | Resend API from Edge Functions (`supabase/functions/_shared/mail.ts`, `admin-stats`, `send-receipt`, `submit-contact-message`) |
| **Automate** | the automations' emails to business owners and their clients | `automate/functions/_shared/automate/mailer.ts` — now provider-neutral (below) |

All three share one Resend account and its free quota (100/day, 3,000/month).
The risk to protect: automations using up the quota → sign-up and
password-reset emails stop. Protection in place: Automate's own daily cap
(`email_caps.automation_daily`, 30) and now a monthly cap
(`email_caps.automation_monthly`, 2,000), per-business monthly limits,
the emergency stop, and simulated mail until a deliberate switch.

**Changing Automate's provider never touches the Auth stream**: Supabase
Auth uses its own SMTP settings and never goes through `mailer.ts`.

## Built now (tested on staging, nothing sent)

- **One switch, three providers.** `AUTOMATE_MAIL_PROVIDER = resend | ses | brevo`
  (default `resend`). Optional `AUTOMATE_RESEND_API_KEY` (a separate key for
  automations), `AUTOMATE_MAIL_FROM` (e.g. a sending subdomain),
  `AUTOMATE_SES_*`, `AUTOMATE_BREVO_API_KEY`. Without a provider's keys it
  is never "live". Errors are mapped to the same three outcomes (wait for
  quota/account problem, retry later, bad address), so the worker, the
  automations and their tests don't change. SES requests are signed with
  AWS SigV4 (checked against AWS's official test vector).
- **Bounces and spam complaints.** `mail-events` receives the provider's
  reports (Resend webhook, SES via SNS, Brevo webhook) and adds the address
  to `automate_suppressions`; no automation sends to it again, waiting
  messages are cancelled, and the business gets an alert.
- **Bill protection.** A whole-system monthly cap on emails really sent.

## Comparison

Monthly cost (approximate):

| Monthly volume | Resend | Amazon SES | Brevo |
|---|---|---|---|
| 50,000 | ~$20 (Pro) | ~$5–8 | ~$25–55 (sources disagree) |
| 100,000 | ~$35 (Pro 100k) / $90 (Scale) | ~$10–16 | ~$65–69 |
| 500,000 | ~$350 (Scale) | ~$50–80 (+~$25 optional dedicated IP) | ~$399 |

| | Resend | Amazon SES | Brevo |
|---|---|---|---|
| Setup | Done today (DNS, SMTP, API) | Hardest: AWS account, domain DKIM, **sandbox exit request (manual review)**, IAM key, configuration set + SNS for bounces | Medium: account, domain DNS, sometimes an account review |
| Reliability | Good; developer-focused, newer company | Very high (AWS); strict reputation rules (review at 5% bounces / 0.1% complaints, possible pause) | Established; shared IPs also carry marketing mail |
| Limits | Free 100/day; paid has no daily cap, per-second rate limit | Sandbox 200/day; production quota grows with good sending | Free 300/day |
| Bounces / complaints | Webhooks | SNS notifications | Webhooks |
| Surprise-bill protection | Overage is charged automatically per extra 1,000 (no self-set cap found) | Pure pay-per-use, no hard cap (AWS Budgets only alerts) | Fixed monthly volumes / prepaid credits act as a natural cap |

In every case the real protection is our own caps (daily, monthly, per business) — now built in.

## Recommendation

1. **Yes — keep the provider switch** (built, free). It costs nothing to
   keep and removes lock-in.
2. **Now and during the pilot:** stay on Resend free. Nothing to buy.
3. **When automated email passes ~2,000/month or ~70/day** (first real
   customers): **Resend Pro (~$20/month for 50k)** — zero migration, same
   DNS. Raise `automation_monthly` to match (e.g. 40,000), leaving room for
   Auth email. *Needs your approval.*
4. **Above ~100,000/month sustained:** move **only the Automate stream** to
   **Amazon SES** (saves roughly $80–300/month at 100k–500k), keep Auth and
   account email on Resend. *Needs your approval.*
5. **Brevo:** not as the main provider (pricing is unclear, and it's
   marketing-oriented). It could serve as a backup.

## Safe migration plan (for step 4, when approved)

1. Separate sending subdomain for automations (e.g. `notify.deskkit.co.il`),
   with SPF/DKIM/DMARC records only for it. The main domain and Auth email
   are untouched.
2. Open the provider account (approval), verify the subdomain, request
   production access (SES), create a send-only key, and point bounce/complaint
   notifications to `mail-events`.
3. Put the keys in the live secrets **without** switching:
   `AUTOMATE_MAIL_PROVIDER` stays `resend`.
4. Pilot: switch the provider with `AUTOMATE_MAIL_ALLOWLIST` = owner only;
   check delivery, inbox placement, bounce handling.
5. Gradual warm-up: raise the daily cap step by step over 2–4 weeks; watch
   bounce < 2% and complaints < 0.1%.
6. Rollback at any moment: set `AUTOMATE_MAIL_PROVIDER=resend` (one setting,
   no deploy). Messages already sent are recorded per provider.
7. After it's stable, keep the old provider's key for 30 days as a fallback.

Auth email check before and after every step: a test sign-up and a password
reset to the owner's address (Supabase Auth → Resend SMTP).
