# DB-02 execution report — 2026-11-20 UTC

**Verdict: CONDITIONAL.** Isolated 0043 task-responsibility handoff passes local PG16/17 synthetic tests. Full CRM/client/channel handoff, HTTP integration, real identity and nonproduction installation remain HOLD. This report does not call candidate SQL a formal or deployed migration.

## Source and change

| Item | Observed result |
|---|---|
| Formal migration authority | Main `database/canonical/migrations/` through 0037 in checked baseline `9db147ac3a5d135d50b90bfea5a7316ce747d90b` |
| Dependency | DB-01 [PR #77](https://github.com/yvettfang-netizen/phoenix/pull/77) HEAD `9f51b430164515d2aa5c92c2a2569a6fd6c549e4`, 0042 SHA-256 `0d4a3de80b56ccb167049a846e17b9b6fc4ef3e152b57aa4600d87367a33cb65` |
| Numbering | Founder confirmed 0043 isolated candidate. 0038–0041 preserved for other branches. |
| 0043 SHA-256 | `6e043ffdeeb228dac59c605ba763e95f052bdedcdae37b652cba9b6666d18a3a` |
| Objects | Two new Service tables, eight new functions including a restricted inbox, two FORCE RLS tables with two policies, immutable event trigger and one-open-request unique index. No new master data. |
| Branch / Draft PR | `codex/enterprise-v31-db02-handoff-20261120` based on PR #77; [Draft PR #78](https://github.com/yvettfang-netizen/phoenix/pull/78), first published commit `0786e08366343ffca05c546b463c9880a33653d2` |

The code review caught and removed a broad schema-wide function REVOKE before final tests. The final SQL revokes PUBLIC only on the eight newly introduced functions. An idempotent rejection/cancellation replay and a restricted audited inbox were added before fixing the candidate SHA.

## Commands and original structured evidence

| Command | PG16 | PG17 | Evidence |
|---|---|---|---|
| `node database/canonical/verification/v0043/verify-source.mjs` | PASS | Same source | `PASS 0043 source guard sha256=6e043ffd… parent=0042 historical=37` |
| `node database/canonical/verification/v0043/acceptance.mjs 16/17` | PASS 13 checks | PASS 13 checks | [PG16](evidence/pg16/acceptance.json), [PG17](evidence/pg17/acceptance.json) |
| `node database/canonical/verification/v0043/catalog.mjs 16/17` | PASS | PASS | [PG16 catalog](evidence/pg16/catalog.json), [PG17 catalog](evidence/pg17/catalog.json) |
| Existing backend `npm run typecheck`, `npm run build`, `npm test` | PASS | Shared code | `npm test`: 148 pass, 0 fail, 0 skipped; no backend source changed in DB-02 |
| Digest-pinned Gitleaks `dir /scan` on 0043 SQL, v0043 tests, package docs/evidence and workflow | PASS | Same tree | Four scans: `no leaks found`; local scan only, GitHub CI pending |
| `git diff --check` | PASS | Same tree | No whitespace errors |

The 13 acceptance groups include fresh install, 0037+0042 upgrade, repeat, checksum drift rejection, real app/binder LOGIN separation, cross-organization and Partner denial, Staff Viewer denial, recipient-only accept, inbox filtering, natural expiry, idempotent replay, task event exactly-once, two app-connection competition, failed transfer atomic rollback, role revocation, narrow EXECUTE grants, FORCE RLS and audit denial. A dedicated synthetic backup LOGIN exported a custom dump and password-free roles, manifest digests were checked before restore, and a **new disposable cluster** recovered all 39 ledger rows, 102 tables, 92 policies, 87 audit rows, five handoff rows and the transferred task assignee on PG16 and PG17. The manifest is unsigned and this is a logical restore, not WAL/PITR or an RPO/RTO claim. Each test starts owned disposable clusters, uses only synthetic data and removes its own containers. The catalog records **39 ledger rows, 102 tables, 315 functions, 92 policies** on both PG versions; these are candidate-cluster counts.

## Remaining gate status

| Work item | Status | Reason |
|---|---|---|
| DB-01 0042 | PASS local candidate, Draft PR | Not merged or deployed |
| DB-02 0043 SQL | PASS local candidate | Narrow task handoff only |
| DB-02 broader client/channel transfer | HOLD | No approved transfer scope, contact owner, customer notice or consent purpose |
| DB-02 HTTP route and real identity E2E | NOT RUN | Candidate does not contain an app route or controlled real account mapping |
| DB-03 student journey | DESIGN / HOLD | Source calendars, contact/marketing purpose, lifecycle owner missing; no SQL here |
| DB-04 docs and AI | DESIGN / HOLD | Cross-project subject/purpose, AI fact approval and retention contract missing |
| DB-05 ASKWISE | DESIGN / HOLD | Authoritative session/event mapping, old SQLite reconciliation and recovery evidence missing |
| Nonproduction install, Tencent, production, old DB deletion | NOT RUN | Outside this development package |

**Unique next engineering step after this Draft PR:** independent review of fixed 0043 SHA and its trusted HTTP adapter contract, while Jimson reconciles current main and migration numbering. DB-03 can proceed on a separate branch after its source/consent facts are fixed; no need to reopen or copy master identity tables.
