# DeskKit Automate

Self-service business automations for DeskKit customers. **Staging only for
now**: nothing in this folder is deployed to the live site.

- `sql/10_engine.sql` — data model, events, run queue, outbox, quotas, RLS
- `sql/90_staging_test_helpers.sql` — fault injection (staging only, never live)
- `functions/` — Edge Functions: `automate-worker` (background), `automate-api`
  (the app), `lead-intake` (site contact forms), `quote-public` (client's quote link)
- `functions/_shared/automate/` — templates (the automation library), engine
  (pure logic), messages (all emails), mailer (simulated unless `MAIL_MODE=live`)
- `web/` — the Automate app pages, copied onto the staging web app
- `tests/unit` — engine logic (Deno), `tests/e2e/run.py` — full flows on staging

Run: GitHub → Actions → **Staging (Automate)** → `setup` (first time) or
`deploy-and-test`. See `docs` in the report for the rollout plan.
