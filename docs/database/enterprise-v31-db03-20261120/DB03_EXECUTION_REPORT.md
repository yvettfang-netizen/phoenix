# DB-03 revised candidate — 0044 without 0043

**Status: updated 0042 dependency and 0044 idempotency verified locally and in GitHub Actions on PG16/17.** PR [#82](https://github.com/yvettfang-netizen/phoenix/pull/82), exact code/evidence commit `77d8026748006bc12cf8eaca38b164f7bd5412dc`, 2026-11-20. Earlier workflow [44705376689](https://github.com/yvettfang-netizen/phoenix/actions/runs/44705376689) is historical for the previous 0042 SHA.

## Rebase facts

- Current 0042 SQL SHA-256: `9fdfef2a566eaa73fec98405e0d5d1ac5ea066c6319b0c2a5111482275562991`.
- Updated 0044 SQL SHA-256: `026c400325d1edeedb9f66e431f8cf79de3bbb8da2a5a2e6bebdf66a2548b4e0`.
- Formal migrations remain 0001–0037.
- Isolated ledger: 39 rows (0001–0037 + 0042 + 0044).
- Expected and verified isolated catalog: 100 tables and 90 policies.
- 0043 remains excluded; formal 0035 task-transfer authority remains unchanged.

Earlier DB-03 PASS evidence from workflows 44698019286 and 44705376689 used superseded 0042 SHAs. Neither proves this updated candidate.

## Current local evidence

| Check | Result |
|---|---|
| Source guard: 0042/0044 SHA and manifest | PASS |
| Existing backend typecheck/build/tests | PASS; 148 tests |
| PG16 fresh/repeat/drift/source and occurrence replay/conflict/RLS/rollback | 12/12 PASS |
| PG17 fresh/repeat/drift/source and occurrence replay/conflict/RLS/rollback | 12/12 PASS |
| GitHub Actions at `77d8026` | [44721181075](https://github.com/yvettfang-netizen/phoenix/actions/runs/44721181075): source/backend, PG16 and PG17 PASS |

Local commands: `node database/canonical/verification/v0044/verify-source.mjs`, `node database/canonical/verification/v0044/acceptance.mjs 16`, `node database/canonical/verification/v0044/acceptance.mjs 17`, and in `Phoenix Compass/education compass/server`: `npm run typecheck`, `npm run build`, `npm test`. Raw structured synthetic receipts: [PG16](evidence/PG16_0044_REBASE_20261120.json) and [PG17](evidence/PG17_0044_REBASE_20261120.json). All disposable owned containers were cleaned; no shared non-production database was changed.

GitHub job IDs: source/backend `136237018397`, PG16 `136237454592`, PG17 `136237454300`. GitHub logs show `RESULT PASS PG16 checks=12` and `RESULT PASS PG17 checks=12`. Artifact digests and exact run association are in [current CI receipt](evidence/CURRENT_PG16_PG17_RESULT.json). The documentation update after `77d8026` does not alter SQL or test code; its own CI status must be checked separately.

## Scope retained

- Keep 0044 review-only study enrollment and lifecycle occurrence tables.
- Stable source identity `(source_system, source_review_ref)`, source version and payload SHA-256.
- Identical replay returns the existing row; changed version/payload returns `SOURCE_CONFLICT_REVIEW_REQUIRED`.
- Stable lifecycle occurrence identity `(study_enrollment_id,journey_cycle_id,rule_key)` now has internal-only idempotent recording: an identical due-date replay returns the existing occurrence; a changed due date returns a review conflict without mutation.
- Internal-only ingestion; explicitly no runtime grants.
- No contact, notifications, tasks, projects or active lifecycle dispatch.

## Safety boundary

No shared non-production installation, real identity, contact workflow, notification dispatch, production migration or deployment is authorized. PR #82 remains Draft.
