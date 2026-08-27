# Questionnaire Backend Proxy — Controlled Local Demo

This Node.js + SQLite proxy lets the WeChat simulator submit minimized Education Compass answers to a real local database. It is not a production backend.

## Boundary

- listens on loopback only; client endpoint is fixed to `http://127.0.0.1:8787`
- uses short-lived `local_demo` sessions, not WeChat identity
- accepts only current Education Compass submission fields
- enforces validation, ownership within a Demo session, idempotency, SQLite transaction rollback, and metadata-only audit events
- excludes backend source and SQLite runtime data from the Mini Program package
- uses fictional data only; no NOVA, external AI, production API, or customer database

## Run and test

Requires a Node runtime with `node:sqlite`.

```text
pnpm backend:start
pnpm backend:test
```

Endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | local process/database readiness |
| POST | `/v1/demo/sessions` | loopback Demo session |
| POST | `/v1/questionnaire-submissions` | authenticated, idempotent questionnaire write |

Production requires an approved HTTPS WeChat domain, server-side code exchange, managed encrypted storage, server-derived family/advisor authorization, consent, audit, export/deletion, retention, monitoring, and security/privacy approval.
