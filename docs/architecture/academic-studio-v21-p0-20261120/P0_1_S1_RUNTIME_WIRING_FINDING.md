# P0.1-S1 runtime wiring finding

**Reviewed source baseline:** `main@5b7777e1e4b407393c77095a33a80dcfee68c2e1`  
**PR under review:** #89, candidate 0045  
**Finding status:** SOURCE REVIEW COMPLETE · DEPLOYED RUNTIME UNVERIFIED

## Evidence checked

| File | Source observation |
|---|---|
| `Phoenix Compass/education compass/server/src/http/app.ts` | The Canonical Learning HTTP route found is the course catalog route; no call to `learning.read_published_card()`, `learning.read_published_stage_report()` or `learning.can_read_sensitive()` was found. |
| `services/report-service.ts` | No reference to either protected Learning read wrapper or `can_read_sensitive`. |
| `services/assessment-service.ts` | No reference to either protected Learning read wrapper or `can_read_sensitive`. |
| `services/canonical-family-projection.ts` | Reads Family/student summaries through `core.read_family_summary()`, `core.list_student_summaries()` and `core.read_student_summary()`; this is not the after-class card or stage-report path. |
| `services/canonical-learning-catalog.ts` | Calls `learning.list_published_courses()`; it is a catalog-only path, not a student Learning-record path. |

The current main migration files 0001–0037, including 0022 and 0037, match PR #89's base for the relevant migration and verification files. The formal migration count remains 37.

## Decision impact

1. The 0045 database authorization fix remains valid and useful as a defense-in-depth control for any direct database caller and future Learning API integration.
2. **Do not claim that the deployed BFF currently exposes after-class-card or stage-report endpoints.** The inspected current-main application source does not wire those functions.
3. The Jimson nonproduction read-only receipt can verify the installed database, role settings, function fingerprint and migration ledger. If no deployed Learning card/report endpoint exists, its correct result is **NOT WIRED**, not PASS.
4. Do not add an API endpoint or enable a feature as part of this S1 migration. Route integration is a separate product/API task with its own authorization and acceptance gate.
5. A database-only preflight cannot prove the transaction lifecycle of an endpoint that is not wired.

## Gate

- Candidate SQL and PG16/17 isolated tests: PASS on the code/test commit `ab270fdc2eb78264c6d78ebbacb6d11a824e1170`.
- Read-only nonproduction receipt: PENDING.
- Deployed Learning card/report API wiring: NOT FOUND in the reviewed current-main source; deployment-specific confirmation PENDING.
- Independent human security review: PENDING.
- Installation / merge / deployment: HOLD.
