# DeskKit Automate — checkpoint (paused 11.10.2026)

Paused at the owner's request to work on the main site. Resume from "Next".

## Done (all on staging, all tests green)
- Engine: `automate/sql/10_engine.sql` (tables, events, runs, outbox, quotas,
  kill switch, quiet hours, pilot gate, 90-day retention, RLS everywhere).
- Functions: automate-worker, automate-api, lead-intake, quote-public.
- Library: 7 automations + 6 business packs (`functions/_shared/automate/templates.ts`).
- App: `automate/web/automate.html` (+ js/automate-app.js), `q.html`.
- Staging: project `deskkit-staging` (free), web `deskkit-staging-web.deskkit.workers.dev`,
  workflow "Staging (Automate)" (setup / deploy / test / deploy-and-test / status).
- Tests: 13 unit, local SQL suite, 77 e2e, 8 browser — last run green.
- Docs: OPERATIONS.md, ROLLOUT.md, PRIVACY-DRAFT-he.md.
- Live site: only grant hardening, 50/day campaign cap, CRM backup/no-silent-wipe/delete warning, anonymous CRM count.

## Missing before selling
1. Go-live (ROLLOUT.md steps 1–4) — needs owner approval at each step.
2. ~~Contact-form block~~ — built (staging only, off by default); Turnstile decision before live (ROLLOUT step 4).
3. ~~Admin-area card~~ — built: admin → "Automate" tab, tested on staging (e2e T18).
4. Real email deliverability test (pilot, owner's address only).
5. Payment / plan: how a customer buys Automate (Gumroad membership or other) — owner decision.
6. English UI; legal review of the privacy/terms draft.
7. Paid email plan decision before ~100 active businesses.

## Next
- Re-run `deploy-and-test` on staging (the free project pauses after 7 idle days — restore it in the Supabase dashboard first if needed).
- Then: present go-live step 1 for approval; meanwhile build the admin card and the
  contact-form block behind a per-site switch (off by default), on staging first.
