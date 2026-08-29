# Questionnaire Backend Proxy (Controlled Local Demo)

## Status and boundary

This backend gives the WeChat Developer Tools simulator a real server and SQLite database for Education Compass questionnaire submissions. It is a controlled, non-production vertical slice.

- Use fictional test families only.
- The server binds to `127.0.0.1` by default.
- The mini program client is fixed to `http://127.0.0.1:8787`; it cannot be redirected from local storage.
- Local Demo sessions are not WeChat identity and are not valid production authentication.
- The SQLite file is unencrypted local development storage and is ignored by Git.
- No external AI model, NOVA service, production API, or real customer database is connected.

## Run

Prerequisite: Node.js 24 or a runtime that provides `node:sqlite`. No new package is required.

```powershell
pnpm backend:start
```

Defaults:

| Setting | Default | Purpose |
| --- | --- | --- |
| `PFS_BACKEND_HOST` | `127.0.0.1` | Listen address |
| `PFS_BACKEND_PORT` | `8787` | Listen port |
| `PFS_DATABASE_PATH` | `backend/data/phoenix-family-os.sqlite` | Local SQLite file |
| `PFS_ENABLE_DEMO_AUTH` | enabled on loopback only | Local Demo session endpoint |

The server refuses to start on a non-loopback host. It also refuses `PFS_ENABLE_DEMO_AUTH=false` because no external authentication provider is implemented; this prevents an old Local Demo token from being reused under a misleading public/server mode. Do not place secrets in these variables or commit `.env` files.

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

Run the automated backend and outbox checks:

```powershell
pnpm backend:test
```

## API

| Method and path | Authentication | Result |
| --- | --- | --- |
| `GET /health` | None | Process and database readiness only |
| `POST /v1/demo/sessions` | Loopback Local Demo only | Short-lived opaque bearer session |
| `POST /v1/questionnaire-submissions` | Bearer session | Transactional, idempotent questionnaire write |

The submission body accepts only the current ten Education Compass answer keys plus `clientSubmissionId`, `familyId`, `studentId`, `questionnaireType`, and `submittedAt`. The server rejects unknown answer fields and payloads larger than 64 KiB.

Idempotency is enforced by `(authenticated user, clientSubmissionId)`. Replaying the same content returns the existing receipt; reusing the identifier for different content returns `409`.

## Mini program data flow

1. The assessment is saved with `sync_requested_at`, making the intent to sync recoverable in the same local record.
2. The existing deterministic Growth Insight report and Timeline events are saved locally, and a minimized questionnaire payload is placed in `PFS_QUESTIONNAIRE_OUTBOX_V01`.
3. The app attempts an asynchronous upload on submission and each `App.onShow`.
4. Network/server failures remain pending with bounded exponential backoff.
5. Only a validated `synced` receipt with server ID and server timestamp can acknowledge/remove an outbox item.
6. Missing outbox entries are reconstructed only from new assessments carrying `sync_requested_at`; historical Local Demo assessments are not auto-uploaded.
7. Successful receipt metadata is retained separately; permanent validation/authorization conflicts retain an ID/error tombstone without duplicating answer content.

Normal logout clears the Local Demo backend bearer session but preserves pending outbox work for the same local family to retry after login. `repository.resetDemoData()` clears the outbox, receipts, acknowledgement IDs, failure tombstones, and backend session together with the Local Demo database.

No historical `PFS_DB_V01` records are uploaded automatically. The UI does not yet display pending/synced/failed state, so this implementation must not be described to users as confirmed remote persistence.

## Production prerequisites

Before any real family or minor data is allowed, replace this Local Demo boundary with all of the following:

- HTTPS service on an approved WeChat request domain;
- `wx.login` code exchange on the server, with AppSecret in an approved secret store;
- server-derived user/family membership and assignment-based RBAC;
- explicit consent, revocation, retention, export, deletion, and sensitive-read audit contracts;
- managed PostgreSQL (or an approved equivalent), encrypted transport/storage, backups, migration controls, monitoring, and incident response;
- rate limiting, request correlation, security review, privacy review, and negative end-to-end tests;
- visible and accurate local/pending/synced/failed states.

The production API must never trust client-supplied user IDs, roles, OpenIDs, or family authorization. `project.config.json` excludes the entire `backend/` directory so backend source, SQLite, WAL, and migration files do not enter the mini program package. This Local Demo implementation is simulator-oriented: a physical phone resolves `127.0.0.1` to the phone itself and therefore requires a separately approved HTTPS environment.
