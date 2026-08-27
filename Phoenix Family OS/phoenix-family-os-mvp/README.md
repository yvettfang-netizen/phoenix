# Phoenix Family OS™ Mini Program MVP V0.1

Phoenix Family OS™ is a native WeChat Mini Program Local Demo for validating a focused family-growth relationship loop:

```text
Education Compass
→ Family Profile / Child Profile
→ 成长洞察
→ Family Timeline
→ Advisor Service
```

## Current capability

- Family Demo login and local session
- Family Profile and Child Profile
- Education Compass questionnaire
- deterministic, explainable local-rule Growth Insight
- Family Timeline
- Advisor request and internal Advisor/Admin Demo routes
- controlled loopback questionnaire proxy with local SQLite

Growth Blueprint, Reminder, NOVA model/chat, ASKWISE integration, production identity, production database, server-side RBAC, and public release are not implemented.

## Demo boundary

- `project.config.json` uses `touristappid`.
- `wx.login` does not exchange code for production OpenID; the app uses `local_family_user`.
- most Family OS records are stored in local `wx` storage.
- the backend is fixed to `127.0.0.1:8787`, uses `local_demo` sessions, and only receives minimized Education Compass submissions.
- use fictional test data only; do not use real family or minor information.
- `services/ai-provider.js` uses local rules. Customer UI calls the output `成长洞察`, not AI chat.

## Import and verify

Import this directory into WeChat Developer Tools. A controlled AppID and platform/device evidence are still required for acceptance.

```text
pnpm test
pnpm typecheck
pnpm build
```

`pnpm build` is the repository static validator, not a WeChat compiler. `pnpm lint` is not configured.

## Documentation baseline

- `docs/engineering-memory/PROJECT_CONTEXT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SCHEMA.md`
- `docs/MVP_ACCEPTANCE.md`
- `docs/engineering-memory/TECHNICAL_DEBT_REGISTER.md`
- `docs/engineering-memory/ENGINEERING_DECISION_LOG.md`
- `docs/MIGRATION_REGISTER.md`
