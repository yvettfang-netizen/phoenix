# DB-03 revised candidate — 0044 without 0043

**Status: current 0042 dependency rebase verified; PG16/17 GitHub Actions PASS.** PR [#82](https://github.com/yvettfang-netizen/phoenix/pull/82), workflow run [44705376689](https://github.com/yvettfang-netizen/phoenix/actions/runs/44705376689), completed 2026-11-20.

## Rebase facts

- Current 0042 SQL SHA-256: `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea`.
- 0044 SQL SHA-256: `b097f1bae3c8950f5ebf51abe3317d9111d4b9012b389628eb2436f5c8896020`.
- Formal migrations remain 0001–0037.
- Isolated ledger: 39 rows (0001–0037 + 0042 + 0044).
- Expected and verified isolated catalog: 100 tables and 90 policies.
- 0043 remains excluded; formal 0035 task-transfer authority remains unchanged.

The earlier DB-03 PASS evidence from workflow 44698019286 used the superseded 0042 SHA `0d4a3de80b56ccb167049a846e17b9b6fc4ef3e152b57aa4600d87367a33cb65`. It is historical only and is not used as evidence for this rebase.

## Current GitHub Actions evidence

| Check | Result |
|---|---|
| Source guard: 0042/0044 SHA and manifest | PASS |
| Candidate secret scan | PASS |
| Existing backend typecheck/build/tests | PASS |
| PG16 fresh/repeat/drift/source replay/conflict/RLS/rollback | 11/11 PASS |
| PG17 fresh/repeat/drift/source replay/conflict/RLS/rollback | 11/11 PASS |
| PG16/PG17 synthetic evidence artifacts | Uploaded |

Jobs: source/backend `136183546864`; PG16 `136183788245`; PG17 `136183788276`.

## Scope retained

- Keep 0044 review-only study enrollment and lifecycle occurrence tables.
- Stable source identity `(source_system, source_review_ref)`, source version and payload SHA-256.
- Identical replay returns the existing row; changed version/payload returns `SOURCE_CONFLICT_REVIEW_REQUIRED`.
- Internal-only ingestion; explicitly no runtime grants.
- No contact, notifications, tasks, projects or active lifecycle dispatch.

## Safety boundary

No shared non-production installation, real identity, contact workflow, notification dispatch, production migration or deployment is authorized. PR #82 remains Draft.
