# DeskKit Automate — pricing model (draft, nothing charged yet)

No payment flow exists for Automate and none is connected. This is the plan
the code is ready for; turning anything on is the owner's decision.

## Tiers (built in: `automate_settings.plan_limits`, read by `automate_limits()`)

| | Free | Pro |
|---|---|---|
| Who | every account in the pilot | accounts that already have DeskKit Pro (`customer_profiles.is_pro`) |
| Active automations | 12 | 30 |
| Automation runs / month | 300 | 2,000 |
| Automated emails / month | 200 | 1,000 |
| Price | free | included in the existing DeskKit Pro (no new charge) |

The numbers are settings, not code: change them in `automate_settings`
(key `plan_limits`) without a deploy. When a business reaches a limit,
nothing is lost: the automation waits and continues next month (tested, T8).

## Why this shape

- **Free must be useful on its own** — one business pack plus a couple of
  add-ons fits (unit test "every pack fits the free plan").
- **Pro reuses what already exists.** DeskKit already sells Pro (one-time
  payment). Giving Pro accounts higher Automate limits adds value to that
  purchase without a new payment flow, new terms or new tax handling.
- **The real cost is email.** The email provider's free plan allows about
  100 emails a day for the whole site; Automate gets at most 30 of them
  (`email_caps.automation_daily`), so sign-up and password emails always fit.

## When to charge (later, owner's decision)

1. Finish the pilot with real email for the owner only, and see which
   automations matter.
2. Before ~100 active businesses: move email to a paid plan (the provider's
   entry paid plan is roughly $20/month for tens of thousands of emails).
   That's the point where a monthly Automate subscription makes sense —
   e.g. a small monthly fee for Pro limits, with Free kept as is.
3. Charging monthly needs: a payment provider with subscriptions, an update
   to the terms (price, renewal, cancellation — Israeli consumer-protection
   rules on cancelling recurring payments), and receipts. None of this is
   built; nothing here commits to a price.
