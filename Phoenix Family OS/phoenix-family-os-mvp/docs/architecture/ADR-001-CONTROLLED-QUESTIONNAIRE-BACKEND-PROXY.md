# ADR-001｜Controlled Questionnaire Backend Proxy

- Status: Accepted for Local Demo only
- Original decision: 2026-08-17
- Reconciled: 2026-08-27

## Decision

Use a controlled vertical slice for new Education Compass submissions:

```text
local assessment + sync intent
→ persistent outbox
→ fixed loopback HTTP API
→ local Demo bearer session
→ validation, ownership, idempotency, transaction
→ local SQLite submission + metadata-only audit
```

Use Node built-ins, bind to `127.0.0.1`, accept only the current minimized questionnaire contract, exclude answer content from audit metadata/logs, and acknowledge sync only after a validated server receipt.

## Why

This proves a recoverable server/database write path without exposing database credentials, replacing offline Local Demo behavior, installing a new runtime dependency, or connecting real family data.

## Limits

- installation identity is not WeChat identity
- physical phones cannot reach host loopback through `127.0.0.1`
- SQLite is unencrypted local development storage
- only questionnaire submissions are remotely persisted
- no production consent, retention, export/deletion, managed backup, server RBAC, or hosted monitoring

Production remains NO-GO until an approved HTTPS environment, server-side WeChat authentication, managed datastore, server-derived authorization, consent/audit/data lifecycle, security review, and platform/device evidence exist.
