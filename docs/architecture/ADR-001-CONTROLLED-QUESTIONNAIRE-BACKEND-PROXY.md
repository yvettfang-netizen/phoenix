# ADR-001｜Controlled Questionnaire Backend Proxy

- Status: Accepted for Local Demo only
- Date: 2026-08-17 (Asia/Shanghai)
- Project: Phoenix Family OS™ MVP
- Baseline: `5c039f8205e735ab6bfbf94e7a819f8feeb3c108`
- Decision owner: Engineering implementation under the user-authorized backend task
- Production/security approval: Not granted

## Context

Education Compass submissions were stored only inside the mini program's `PFS_DB_V01` local store. The project had no server, API, database migration, remote idempotency, or server-side ownership check. The immediate request is to let a database receive questionnaire answers without installing dependencies or connecting real family data.

The existing Local Demo report flow must remain usable while the network is unavailable. At the same time, a page-level `wx.request` or direct database connection would create duplicate-write, credential, privacy, and coupling risks.

## Decision

Implement a controlled vertical slice:

```text
Education Compass local completion
→ persistent mini program outbox
→ fixed loopback HTTP API
→ Local Demo bearer session
→ validation + ownership check + idempotent transaction
→ local SQLite database + metadata-only audit event
```

- Use Node.js built-in `node:http` and `node:sqlite`; add no dependency.
- Bind to `127.0.0.1` and fix the client endpoint to loopback.
- Enable the installation-derived Local Demo session only on loopback.
- Store only the current questionnaire payload needed by the backend; do not upload profile names, phone numbers, generated reports, analytics, or old local databases.
- Write `sync_requested_at` into each newly submitted local assessment so a missing outbox item can be reconstructed without opting legacy records into upload.
- Validate all ten answer keys, identifiers, dates, content length, and total request size on the server.
- Enforce `(authenticated user, clientSubmissionId)` uniqueness and reject changed replay content.
- Treat the first synthetic family/student reference created under a session as owned by that Local Demo user; reject later cross-session use.
- Keep answer content out of audit metadata and process logs.
- Preserve failed network submissions in an outbox. A server receipt, not a local page transition, is the only remote-sync evidence.
- Accept a receipt only when it contains `status="synced"`, a non-empty server submission ID, and a valid server timestamp.
- Exclude the entire `backend/` directory from WeChat packaging.

## Data decision

The migration creates `users`, `demo_sessions`, `families`, `students`, `questionnaire_submissions`, and `audit_log`. Foreign keys and explicit ownership checks protect the Local Demo relationship. Schema migrations are append-only and recorded in `schema_migrations`.

SQLite is chosen only because it is available in the approved local Node runtime and proves the server/database write path without package installation or an external service. It is not the selected production database. The production recommendation remains an approved managed PostgreSQL service behind HTTPS.

## Alternatives considered

| Alternative | Decision | Reason |
| --- | --- | --- |
| Mini program connects directly to a database | Rejected | Would expose database credentials and bypass server authorization/validation |
| Replace the entire local repository immediately | Rejected | Expands scope and breaks offline Local Demo behavior |
| Upload immediately with no outbox | Rejected | Network loss and uncertain responses would lose or duplicate submissions |
| Deploy managed PostgreSQL and real WeChat login now | Deferred | Requires approved infrastructure, domain, secrets, AppID permissions, privacy and production security decisions |
| Configurable client URL in local storage | Rejected | Could redirect sensitive questionnaire content to an unknown destination |

## Consequences and limitations

Positive:

- The simulator can write a validated questionnaire to a real database.
- Replays are idempotent and cross-session family reuse is denied.
- Offline/network or outbox-write failure preserves a recoverable sync intent in the local assessment.
- No third-party dependency or secret is introduced.

Limitations:

- Installation identity is not WeChat identity; family/member authorization is not production RBAC.
- SQLite is local, single-service development storage without production encryption, backup, HA, retention, export, or deletion controls.
- The physical-device path is unavailable because loopback resolves on the phone.
- Existing multi-write local report generation is still not one transaction.
- The UI does not expose sync state or explicit upload consent.
- Real family and minor data remain prohibited.

## Production gate

Production remains `NO-GO` until real WeChat server-side authentication, an approved HTTPS domain, managed database, server-derived family authorization, consent/audit/deletion controls, operational security, and platform/device evidence are complete. This ADR must not be cited as production approval.

## Rollback

Stop the local backend and remove/revert only the files introduced by the implementing change through a normal reviewable commit/revert workflow; do not use `git reset --hard`. Preserve any database file that contains approved test evidence before reverting. After rollback run `pnpm test`, `pnpm typecheck`, and `pnpm build`, and verify the original Local Demo Compass flow still works.
