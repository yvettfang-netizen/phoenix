# DB-03 revised candidate — 0044 without 0043

**Status: rebased to the current 0042 SHA; PG16/17 re-test required.** PR [#82](https://github.com/yvettfang-netizen/phoenix/pull/82) now follows the updated DB-01 candidate in PR [#77](https://github.com/yvettfang-netizen/phoenix/pull/77).

## Rebase facts

- Current 0042 SQL SHA-256: `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea`.
- 0044 SQL SHA-256 remains: `b097f1bae3c8950f5ebf51abe3317d9111d4b9012b389628eb2436f5c8896020`.
- Formal migrations remain 0001–0037.
- Isolated ledger remains 39 rows (0001–0037 + 0042 + 0044).
- Expected isolated catalog after rebase: 100 tables and 90 policies.
- 0043 remains excluded. Formal 0035 task-transfer authority remains unchanged.

The previous DB-03 PASS evidence was run against the earlier 0042 SHA `0d4a3de80b56ccb167049a846e17b9b6fc4ef3e152b57aa4600d87367a33cb65`; it does not prove compatibility with the consolidated 0042 candidate. It is retained only as historical evidence. The current PR must pass its own source guard, backend validation, PG16 and PG17 acceptance before its status can return to PASS.

## Scope retained

- Keep 0044 review-only study enrollment and lifecycle occurrence tables.
- Stable source identity `(source_system, source_review_ref)`, source version and payload SHA-256.
- Identical replay returns the existing row; changed version/payload returns `SOURCE_CONFLICT_REVIEW_REQUIRED`.
- Internal-only ingestion; explicitly no runtime grants.
- No contact, notifications, tasks, projects or active lifecycle dispatch.

## HOLD

No shared non-production installation, real identity, contact workflow, notification dispatch, production migration or deployment is authorized.
