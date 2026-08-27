# Phoenix Family OS™ Engineering Rules

- Scope: only `Phoenix Family OS/phoenix-family-os-mvp` inside the `phoenix` monorepo
- Canonical remote: `https://github.com/yvettfang-netizen/phoenix.git`
- Product: Phoenix Family OS™ MVP V0.1
- Status: Local Demo / Acceptance preparation

## Active product contract

The MVP relationship loop is:

```text
Education Compass
→ Family Profile / Child Profile
→ 成长洞察
→ Family Timeline
→ Advisor Service
```

Family users use the WeChat Mini Program. Advisor and Admin routes are internal Demo surfaces and must not appear in normal family navigation. ASKWISE is only a future Learning Support Layer; it must not duplicate Family Profile or appear without a real contract.

Do not add or restore membership, payment, CRM, marketplace, wealth/health platforms, large identity journeys, autonomous agents, or historical Phoenix OS/Family Passport concepts. Do not create placeholder Growth Blueprint pages or claim unimplemented modules are available.

## Truthfulness and naming

- Customer-visible assistant name, if a real service is later approved: `NOVA｜凤启家庭助手`.
- Current `services/ai-provider.js` uses deterministic local rules. UI copy must say `成长洞察`; it must not claim AI chat, model reasoning, knowledge retrieval, or autonomous action.
- Growth Insight supports family discussion and does not replace an advisor, school, psychological, medical, legal, or other professional conclusion.
- Do not alter Compass questions, scoring/rules, user schema, authentication, API, or database unless a later task explicitly authorizes it.

## Data, identity, and permission boundary

- `touristappid`, `local_family_user`, client guards, `wx` local storage, and loopback SQLite are Demo-only.
- Use synthetic data only. Never place secrets, AppSecret, credentials, real family data, or minor data in source, tests, logs, screenshots, or reports.
- Client-side role hiding is not production RBAC. Production requires server-derived identity, family ownership, advisor assignment, consent, audit, export/deletion, retention, and encrypted managed storage.
- The loopback backend may receive minimized Education Compass submissions only; it is not a production API.

## Brand and UX

- Use existing approved-in-repository brand exports only. Do not redraw, generate, crop, recolor, or replace the Logo.
- Primary tokens: Phoenix Navy `#0D1B2A`, Phoenix Gold `#C8A24A`, Ivory `#F8F3EA`.
- Chinese is the primary reading language. English is limited to product names or short supporting labels.
- Preserve status-bar, capsule, safe-area, scrolling, and fixed-action protections.

## Engineering workflow

1. Verify repository, branch, SHA, remote, and worktree.
2. Work on a non-`main` branch and keep changes inside this Family OS directory.
3. Inspect the complete page/service/data/test call chain before editing.
4. Make the minimum approved change; do not mix product expansion or dependency upgrades.
5. Review `git diff`, run relevant tests, record exact results and limitations.
6. Prefer reviewable commits and `git revert` for rollback; do not use destructive workspace-wide recovery.

Current commands:

```text
pnpm test
pnpm typecheck
pnpm build
```

`pnpm build` is a static validator, not WeChat compilation. `pnpm lint` is not configured. WeChat DevTools, simulator, device, brand, security, and release checks must be reported separately.

## Release gates

- Internal Demo may use only synthetic data with Demo boundaries shown accurately.
- Real families, Public RC, Production, upload, and WeChat review remain NO-GO until their explicit gates and authorizations are complete.
- Testing or a successful Push does not authorize Merge, deployment, upload, or review submission.
