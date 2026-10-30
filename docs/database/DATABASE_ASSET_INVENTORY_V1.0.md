# Phoenix database asset inventory V1.0

**Owner:** Jimson

**Inventory date:** 2026-10-30 (Asia/Shanghai)

**Evidence basis:** Git state, local Docker runtime, V1.17–V1.28 execution
reports and the Tencent deployment report.

## Status definitions

- **ACTIVE:** currently running or the current implemented source.
- **LIMITED:** intentionally isolated, non-production or behind the current
  migration head.
- **EPHEMERAL:** created only for a test and removed after the run.
- **RETAINED / NON-AUTHORITATIVE:** preserved for evidence or compatibility but
  not a valid destination for new business development.
- **HOLD:** not activated because an approval, contract or real integration fact
  is missing.

## Runtime and source assets

| Asset | Location | Status | Current evidence | Decision |
|---|---|---|---|---|
| Canonical PostgreSQL 16 local development | Docker `phoenix-canonical-foundation-pg16-1`, database `phoenix_canonical_dev` | ACTIVE / synthetic only | Healthy on 2026-10-30; V1.28 reports ledger 25, 50 tables, 41 RLS policies and zero mapping/identity/managed rows | Keep for local development |
| Canonical PostgreSQL 17 compatibility | Docker `phoenix-canonical-foundation-pg17-1`, database `phoenix_canonical_dev` | ACTIVE / compatibility only | Healthy on 2026-10-30; same V1.28 catalog and zero-row result | Keep for compatibility testing |
| Canonical implementation source | Private repository `phoenix-canonical-db`, branch `codex/canonical-postgresql-phase1`, commit `48bb6c3` | ACTIVE provenance | Migrations 0001–0025, PG16/PG17 full acceptance and fresh restore PASS | Retain; freeze after main copy is merged |
| Canonical main-repository copy | `phoenix/database/canonical/` on `codex/canonical-postgresql-mainline-copy` | ACTIVE candidate / pending merge | 668 Git-tracked source files copied from `48bb6c3`; byte comparison evidence is committed with this change | Becomes writable authority after review and merge |
| Tencent Canonical PostgreSQL 16 | Isolated non-production host, database `phoenix_canonical_dev` | LIMITED / behind current head | Last read-only evidence 2026-10-26: ledger 22, 50 tables, 41 policies, zero real family/business rows, no published PostgreSQL port | Keep isolated; do not treat as current or production; 0023–0025 not deployed |
| Disposable PG16/PG17 F10 and restore clusters | Local Docker, network-isolated | EPHEMERAL | V1.28 PASS; containers removed by test harness | Recreate only for synthetic verification |
| Local mock object store | `database/canonical/runtime/mock-object-store` when tests run | EPHEMERAL / ignored | Test-only; no COS or real files | Keep ignored and synthetic |

## Retained, stopped or non-authoritative assets

| Asset | Status | Rule |
|---|---|---|
| Conflicting legacy `006` migration namespace | RETAINED / DISABLED | Never copy into the Canonical migration ledger |
| Legacy `phoenix_core` production enablement | HOLD / NOT AUTHORITATIVE | No new business may target it; no deletion is authorized by this inventory |
| Founder OS D1 or legacy identifier migration | HOLD | Preserve existing business assets; migrate only under an approved ID contract |
| Feishu, legacy MySQL/PostgreSQL and real customer data | HOLD / NOT CONNECTED | No import or live connection has been authorized |
| Real COS/private object storage | HOLD | Canonical stores metadata only; current storage is local mock/test |
| Historical verified dumps and manifests | RETAINED EVIDENCE | Not an active database; restore only under the matching migration manifest |
| Anonymous historical Docker volumes | RETAINED / OWNER UNKNOWN | Not classified for deletion; require separate volume-to-project attribution |

## Asset conclusion

The only current development authority is the Canonical PostgreSQL migration
chain. Local PG16 and PG17 are synthetic development/compatibility runtimes.
Tencent is an isolated non-production copy at migration 0022 and is not current
with the local 0025 head. No production Canonical database or real-data
migration is complete.
