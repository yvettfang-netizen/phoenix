# DB-05 readiness audit — Academy / ASKWISE learning evidence

**Status: DESIGN / HOLD.** This separate Draft design package is stacked after DB-04 [PR #80](https://github.com/yvettfang-netizen/phoenix/pull/80). It performs no SQLite read, migration, new SQL, real student mapping, external AI call or deployment.

## Measured existing authority

| Current structure | Actual role | DB-05 boundary |
|---|---|---|
| Canonical `core.student_profiles(person_id)` | One canonical student person | Reuse; never derive a new student identity from name or email. |
| Canonical `learning.enrollment` | Course-version enrollment, family/student FK, active-enrollment uniqueness | Reuse for Academy course participation, not university degree study. |
| Canonical `learning.after_class_card`, `learning.publication`, `learning.stage_report` | Teacher-authored/published family summaries | Do not publish raw ASKWISE attempts automatically or overwrite a newer reviewed report. |
| ASKWISE `askwise-learning-engine/src/lib/db.ts` | Actual `better-sqlite3` file `data/askwise.db` on request; local `students`, `experiments`, `daily_tasks`, `learning_sessions`, `attempts`, `diagnoses`, `hints`, `learning_evidences` and reflection/map tables | Separate legacy/pilot storage exists in source. It is not evidence of Canonical persistence. No file data was opened. |
| ASKWISE Compass `mock-adapter.ts` | In-memory `sessionsById` / `sessionsByIdempotency`, mock student and experiment mapping | A mock adapter restart is not a durable migration or idempotency guarantee. |
| `ASKWISE_EDUCATION_COMPASS_DATA_CONTRACT_V1.md` | Historical V1.1 integration contract with external student/assessment mapping and source tracking | Useful interface evidence, but sample IDs are not authoritative Canonical mappings. |

The existing SQLite source seeds a named pilot student in code and has `INSERT OR REPLACE` on `learning_evidences`. Neither pattern is acceptable as an automatic canonical student merge or an immutable evidence write. No ASKWISE schema is added to Canonical in this PR.

## Minimum future data contract

1. A signed, versioned assignment event from Academy or Education identifies a *reviewed* Canonical student ID, source assignment ID, entitlement, allowed task and expiry. The consumer cannot create a new `core.student_profiles` row by matching a name.
2. ASKWISE returns source system/version, immutable source event ID, local task/session ID, canonical student mapping reference, attempt/evidence revision, result status and a digest of approved summary. Duplicate `(source_system, source_event_id, source_version)` returns the same outcome; changed payload conflicts. Later revisions append, not overwrite older verified evidence.
3. A controlled Academy reviewer accepts an education summary for publication through existing `learning.after_class_card` or `learning.stage_report` only if its family/student/enrollment scope, consent/guardian state, course entitlement and current version all match. Raw student answers, AI prompts and private diagnosis remain within their authorized processing boundary.
4. Family OS reads only the approved, currently published projection. 鳌鱼 may present reviewed feedback but cannot grant Corporate OS rights or publish directly.
5. Retiring SQLite requires field-by-field mapping, collision review, count/hash reconciliation, immutable backup, fresh-cluster restore, read parity and a rollback window. A Draft PR or a green mock test alone does not authorize deletion.

## Specific HOLD facts

- The authoritative ASKWISE repository/runtime version and whether the SQLite file contains any real records; **do not provide the file or real student data to this audit**.
- Exact source student/assessment-to-Canonical mapping approval, rights to process learning answers and existing consent/assent text.
- Course assignment event authority, entitlement source, parser/summary version and reviewer identity/permission.
- Retention, deletion, object/evidence handling and redaction for attempts and diagnosis; old/new version conflict policy.
- Read-only legacy inventory, signed migration mapping, count/digest parity and backup/restore test before any retirement.

**PG16/17 DB-05 persistence, separated LOGIN tests, actual ASKWISE runtime integration, family projection and legacy migration are NOT RUN.** The next package needs a distinct numbered forward candidate only after the above source and authorization contract is fixed. No new student master or second Canonical database is proposed.
