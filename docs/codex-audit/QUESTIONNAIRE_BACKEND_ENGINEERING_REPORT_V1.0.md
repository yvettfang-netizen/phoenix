# Phoenix Family OS™ Questionnaire Backend Engineering Report V1.0

Report Type: Engineering Report  
Project Name / Canonical Project ID: Phoenix Family OS™ MVP / `phoenix-family-os-mvp`  
Version / Sprint / Task: V0.1 / Sprint 2 follow-on / Questionnaire backend proxy V1.0  
Repository: `D:\CODEX\PhoenixNova\Phoenix Family OS\phoenix-family-os-mvp`  
Branch: `codex/phoenix-family-os-v0.1-sprint2`  
Baseline SHA: `5c039f8205e735ab6bfbf94e7a819f8feeb3c108`  
Current/Final SHA: `5c039f8205e735ab6bfbf94e7a819f8feeb3c108` (changes intentionally uncommitted)  
Worktree Status: DIRTY — implementation changes plus two pre-existing untracked audit reports  
Environment: Windows NT 10.0.26200.0; Node.js 24.19.0; pnpm 11.19.0; TypeScript 5.9.3  
Report Date / Timezone: 2026-08-17 17:18:38 / Asia/Shanghai (UTC+08:00)  
Owner: Codex engineering implementation; production/security owner not assigned  
Overall Status: **PARTIAL — controlled Local Demo backend complete and verified; production backend not implemented**  
Current Release Gate: **Local simulator + fictional data: GO; real family data / physical device / public release: NO-GO**

## 1. Outcome and scope

The approved task was to add a backend proxy and database path capable of receiving mini program questionnaire submissions. A complete local vertical slice now exists:

```text
Education Compass submit
→ local assessment with recoverable sync intent
→ persistent outbox
→ fixed loopback mini API client
→ Node HTTP proxy
→ Local Demo session + ownership + validation
→ idempotent SQLite transaction
→ metadata-only audit + validated receipt
```

The implementation deliberately does not connect to a hosted database, production API, NOVA, an external AI model, or real customer data. No dependency was installed; no commit, push, deployment, WeChat submission, secret read, or production connection was performed.

At baseline the tracked worktree was unchanged. These two untracked files already existed and were preserved without modification by this task:

- `docs/codex-audit/SPRINT_2_TASK_3_WECHAT_ACCEPTANCE_REPORT_V1.0.md`
- `docs/codex-audit/Family_Growth_Core_Repo_Evidence_Audit_2026-08-17.md`

## 2. Completed

- **Implemented:** file-backed SQLite migration and connection; Local Demo session with hashed bearer tokens; questionnaire API; strict input validation; ownership checks; transaction and audit event; idempotency conflict handling.
- **Implemented:** mini program API adapter, persistent outbox, bounded retry delay, permanent-failure tombstone, receipt store, acknowledged-ID ledger, sync-intent reconciliation, and `App.onShow` retry while a local user is active.
- **Implemented:** logout clears the backend bearer session; full Local Demo reset clears all questionnaire sync state so stale synthetic submissions are not uploaded into a reset profile.
- **Implemented:** Education Compass payload minimization. The remote payload excludes user ID, role, parent/student names, phone, profile, generated report, Timeline, and analytics.
- **Implemented:** fixed `127.0.0.1:8787` destination. Local storage cannot redirect questionnaire content to an arbitrary URL.
- **Implemented:** WeChat package exclusion for the entire `backend/` directory, including SQLite/WAL runtime files.
- **Verified:** mini API adapter → HTTP proxy → file-backed SQLite with synthetic questionnaire data.
- **Verified:** token hashing, field/enum validation, duplicate replay, changed-content conflict, cross-session family denial, transaction rollback, audit/log redaction, malformed receipt rejection, retry/recovery, concurrent flush behavior, and minimized page payload.
- **Documented:** backend runbook, ADR, architecture, schema, production boundary, rollback, and this engineering report.
- **Deferred:** real `wx.login` / `code2Session`, HTTPS domain, managed PostgreSQL, production RBAC, consent, retention, export, deletion, monitoring, backups, and physical-device connectivity.
- **Blocked:** any real family/minor data or Production Ready claim until the deferred production controls are approved, built, and independently verified.

## 3. Modified files

All rows are uncommitted at this report point. `C` means created and `M` means modified; no file was deleted.

| File | C/M | Change and reason | Impact |
| --- | --- | --- | --- |
| `.gitignore` | M | Ignore SQLite/WAL, backend runtime data, and `.env` | Prevent accidental Git inclusion of local data/secrets |
| `app.js` | M | Reconcile and flush while a local user session is active | Retry/recover pending questionnaire writes |
| `package.json` | M | Add backend start/test commands and include new checks in full test | Repeatable local operation and verification |
| `project.config.json` | M | Exclude `backend` from mini program packaging | Prevent DB/backend source entering WeChat package |
| `models/schema.js` | M | Add optional `sync_requested_at` to assessment contract | Recover sync intent without uploading legacy records |
| `pages/compass-questionnaire/index.js` | M | Mark sync intent, enqueue minimized payload, recover on partial local failure | Connect existing submit flow without blocking report navigation |
| `services/auth.js` | M | Clear backend Local Demo session on logout | Prevent token reuse after identity exit |
| `services/repository.js` | M | Clear sync/session state during full Demo reset | Prevent stale queued records crossing a reset boundary |
| `services/backend-api.js` | C | Fixed-loopback request/session client and strict receipt validation | Safe Local Demo transport boundary |
| `services/questionnaire-sync.js` | C | Outbox, retry, receipt, ack ledger, failure tombstone, reconciliation | Offline and uncertain-response resilience |
| `backend/migrations/001_questionnaire_submissions.sql` | C | Initial constrained relational schema and indexes | Versioned database initialization |
| `backend/database.js` | C | SQLite open/migration ledger/foreign-key/WAL setup | File-backed local database connection |
| `backend/auth.js` | C | Local Demo session creation/authentication with token hash | Controlled synthetic-user isolation |
| `backend/validation.js` | C | Top-level/answer allowlists, enum/length/date/identifier checks | Reject malformed or expanded payloads |
| `backend/questionnaire-service.js` | C | Ownership, idempotency, transaction, audit | One durable submission or full rollback |
| `backend/server.js` | C | HTTP routes, body limit, safe errors, loopback-only gate | Runnable backend proxy |
| `backend/README.md` | C | Local runbook and production prerequisites | Safe operator handoff |
| `tests/backend-questionnaire.test.js` | C | Database/API/auth/ownership/rollback/redaction checks | Server integration evidence |
| `tests/backend-api.test.js` | C | Client destination/session/401/receipt checks | Mini API contract evidence |
| `tests/questionnaire-sync.test.js` | C | Outbox/retry/failure/recovery/concurrency checks | Sync reliability evidence |
| `tests/questionnaire-page-sync.test.js` | C | Page-to-outbox minimized payload flow | Mini page integration evidence |
| `tests/backend-e2e.test.js` | C | Mini adapter through HTTP into file SQLite | Full local vertical-slice evidence |
| `tests/validate-project.js` | M | Assert backend packaging exclusion | Static package safety gate |
| `docs/ARCHITECTURE.md` | M | Record controlled backend/outbox architecture | Remove architecture drift |
| `docs/DATA_SCHEMA.md` | M | Record sync-intent and backend tables | Remove schema drift |
| `docs/architecture/ADR-001-CONTROLLED-QUESTIONNAIRE-BACKEND-PROXY.md` | C | Decision, alternatives, limits, rollback | Architecture traceability |
| `docs/codex-audit/QUESTIONNAIRE_BACKEND_ENGINEERING_REPORT_V1.0.md` | C | Current report | Engineering evidence and handoff |

## 4. Technical change

### 4.1 API and data contract

| Route | Auth | Behavior |
| --- | --- | --- |
| `GET /health` | none | Reports process/database readiness and `local_demo` mode |
| `POST /v1/demo/sessions` | loopback only | Creates a 12-hour opaque token; stores only SHA-256 hash |
| `POST /v1/questionnaire-submissions` | bearer | Validates, authorizes, transactionally stores, audits, and returns a receipt |

The request accepts only `clientSubmissionId`, `familyId`, `studentId`, `questionnaireType`, `answers`, and `submittedAt`. `answers` must contain exactly the current ten Education Compass keys. Select and multi-select values use the UI enums; text/list/body sizes are bounded.

The response removes the local outbox item only when `status` is `synced`, `submissionId` is non-empty, and `receivedAt` is a valid date. Other 2xx shapes remain retryable protocol failures.

### 4.2 Database and migration

The local SQLite schema contains:

- `schema_migrations`
- `users`
- `demo_sessions`
- `families`
- `students`
- `questionnaire_submissions`
- `audit_log`

`(user_id, client_submission_id)` is unique. The normalized payload hash distinguishes a safe replay from changed content. Family/student creation, questionnaire insert, and audit insert execute inside one `BEGIN IMMEDIATE` transaction. Tests prove an injected audit failure rolls all three domain writes back.

Question answers are stored as JSON in `questionnaire_submissions`. Audit metadata and error logs exclude answers and tokens. This remains unencrypted development storage and cannot hold real data.

### 4.3 Auth, permission, consent, and audit

- The authenticated user comes from the bearer session, not the request body.
- A synthetic family ID becomes owned by the first Local Demo session that creates it; another session receives `403`.
- A student ID cannot be reused under another family.
- Client-supplied `userId`, role, OpenID, and extra fields are rejected.
- Local Demo authentication cannot be disabled or bound beyond loopback; no unimplemented external-auth mode can accidentally accept an old Demo token.
- Normal logout clears the bearer session. Full Demo reset also clears outbox, receipt, acknowledgement, failure, and backend-session storage.
- Audit covers session creation and questionnaire create/duplicate metadata.
- Consent, production role/assignment authorization, sensitive-read audit, export, deletion, retention, and revocation remain unimplemented and are release blockers.

### 4.4 Local compatibility and recovery

The existing deterministic `phoenix_rule_engine_v0.1` remains unchanged and must not be described as a real AI Family Assistant. Local report/Timeline behavior remains local-first.

Each newly submitted assessment records `sync_requested_at` in its first persisted record. If later local writes or outbox storage fail, reconciliation can rebuild that one submission. Assessments created before this feature have no marker and are never auto-uploaded.

The client endpoint is intentionally fixed to loopback. This works for an approved simulator setup, not a physical phone. A hosted endpoint requires a separate approved HTTPS/domain/security change.

## 5. Test evidence

All tests used synthetic fixtures. Temporary SQLite directories were created under the OS temp directory and removed after each test. No production service was contacted.

| Command | Exit | Wall time | Key result | Coverage limitation |
| --- | ---: | ---: | --- | --- |
| `pnpm backend:test` | 0 | 1.638 s | Server, client, sync, page integration, and HTTP→file SQLite E2E all reported success | Node harness; not actual WeChat runtime |
| `pnpm test` | 0 | 2.672 s | Existing regression plus all new backend/sync/E2E checks reported success | No coverage percentage; no hosted DB |
| `pnpm typecheck` | 0 | 1.884 s | Existing TypeScript scope emitted no error | Existing `tsconfig` does not typecheck every JS runtime path |
| `pnpm build` | 0 | 1.442 s | 15-page static validator and backend package exclusion reported success | Static validation is not WeChat compilation |
| `git diff --check` | 0 | 0.485 s | No whitespace error | Git emitted expected LF→CRLF working-copy warnings |

WeChat Developer Tools compilation, simulator interaction, and device testing were **NOT RUN in this backend implementation turn**. The user separately reported stable-tool/base-library adaptation, but that statement is not converted here into new backend acceptance evidence.

## 6. Independent review and remediation

An independent read-only review found no P0 inside the loopback + fictional-data boundary and identified four P1 items. All four were addressed before final tests:

| Review finding | Remediation | Evidence |
| --- | --- | --- |
| Backend/SQLite could enter mini package | Ignore whole `backend/`; add validator | `project.config.json`, `tests/validate-project.js` |
| Any 2xx could delete outbox | Strict receipt validation; malformed 2xx test | `services/backend-api.js`, `tests/backend-api.test.js` |
| Local partial write could lose sync intent | Persist `sync_requested_at`; reconcile only marked records | page, schema, sync and recovery tests |
| Disabled Demo/non-loopback mode could reuse old token | Refuse disabled/external and non-loopback startup | `backend/server.js`, backend negative test |

A follow-up read-only review ran `pnpm backend:test` and `pnpm test`, confirmed all four remediations, and found no remaining P0/P1 that blocks the strictly scoped loopback + fictional-data Demo.

## 7. Open risks and release gate

| Priority | Risk | State / gate impact | Owner and mitigation |
| --- | --- | --- | --- |
| P0 | No real WeChat identity, HTTPS, server-derived membership/RBAC, consent, or lifecycle control | OPEN; blocks any real family/minor data and production | Product + Security + Backend: approve contract and controlled non-production environment |
| P1 | Physical phones cannot reach computer loopback | OPEN; blocks device acceptance of backend path | Platform owner: approved HTTPS request domain and deployed non-production API |
| P1 | SQLite is local development storage, not managed production persistence | OPEN; blocks Public RC/Production | Backend/Infrastructure: provision approved managed PostgreSQL and migration pipeline |
| P1 | UI does not show local/pending/synced/failed state or upload consent | OPEN; blocks accurate real-user acceptance | Product/Privacy: approve visible status and consent contract before implementation |
| P1 | Existing local assessment/report/Timeline multi-write is not one local transaction | MITIGATED for sync intent, still OPEN for local partial reports | Engineering: separate transactional local use-case/reconciliation task |
| P2 | Retry timing is event-driven by submit/onShow; no in-foreground network recovery timer | OPEN; delayed sync possible, no silent data drop | Engineering: add approved scheduler/network listener with lifecycle tests |
| P2 | An already in-flight request cannot be cancelled/revoked on logout; acknowledgement/failure ID ledgers are unbounded | OPEN; acceptable only for fictional Local Demo data | Engineering/Privacy: add server revoke and bounded lifecycle design before real data |
| P2 | Local Demo reset is implemented, but production export/delete/retention behavior for submissions, audit, outbox, ack IDs, receipts, and failure tombstones is not defined | OPEN; real-data blocker already covered by P0 | Privacy/Product: define lifecycle contract |
| P2 | Migration checksum/re-entry, DB lock, backup/restore, rate limit, and observability evidence is incomplete | OPEN; production operations not ready | Backend/Infrastructure/Security |

Gate decisions:

- Controlled Local Demo with fictional data: **GO**
- Internal Demo RC using WeChat simulator plus this local backend: **CONDITIONAL GO**, pending actual simulator execution/evidence
- Physical-device backend acceptance: **NO-GO**
- Real family/minor data: **NO-GO**
- Public RC / Production: **NO-GO**

## 8. Rollback

- Safe checkpoint: baseline commit `5c039f8205e735ab6bfbf94e7a819f8feeb3c108`.
- No commit was created, so rollback must selectively remove/revert only the files listed in this report while preserving the two pre-existing untracked audit reports and any user changes. Do not use `git reset --hard` or broad cleanup commands.
- Stop the local backend before rollback. If an approved synthetic evidence database exists, preserve it separately before changing code; never delete a database of unknown provenance.
- Post-rollback verification: `pnpm test`, `pnpm typecheck`, `pnpm build`, then the original Local Demo Compass flow.

## 9. Unique next recommendation

**Start `pnpm backend:start` in the approved local environment, complete one Education Compass submission with a fictional family in the actual WeChat Developer Tools simulator, and retain the compile/network/receipt plus SQLite row evidence; this is the single missing check for the Local Demo backend acceptance gate.**
