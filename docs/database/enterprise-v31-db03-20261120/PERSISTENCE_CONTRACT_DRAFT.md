# DB-03 persistence contract draft

**Design only; no SQL migration, runtime worker or customer contact.** This draft carries forward the approved architecture direction from PR #76 and the measured gaps in [the readiness audit](READINESS_AUDIT.md). Business source, consent and assignment details remain HOLD.

## Table proposal

### `education.study_enrollments`

| Field | Intended constraint |
|---|---|
| `study_enrollment_id` | UUIDv7 primary key; immutable identity |
| `family_id`, `student_person_id` | Existing canonical family and student FK; same-family relationship verified by a controlled write API |
| `institution_id`, `program_id` | Reference existing education masters where the source supports them; unknown master values go to review, not fabricated IDs |
| `actual_entry_date`, `expected_graduation_date`, `actual_graduation_date` | Dates with chronology checks; actual fields must carry a reviewed source |
| `country_code`, `academic_calendar_key`, `calendar_revision` | Bounded source values from an approved registry; do not guess semester dates |
| `status`, `revision`, `recorded_at`, `recorded_by_principal_id` | Versioned lifecycle and human review; statuses and transition rights await approval |
| `evidence_document_id`, `source_ref` | Existing versioned document link or source event; no object blob stored in this table |

Preserve source corrections as events or an equivalent immutable history; do not overwrite a verified entry/graduation fact without an audit event. A transferred student can have another enrollment row but not another `core.student_profiles` row.

### Lifecycle occurrence metadata

The minimum stable key is unique `(study_enrollment_id, journey_cycle_id, rule_key)`. It excludes the mutable due date, expected graduation and rule version. Store an occurrence revision, current due date, rule/calendar/source revisions, proposed owner queue, terminal state and exactly one linked actionable `crm.follow_ups` or `service.tasks` ID when actually assigned. A separate event table records CREATE, RESCHEDULE, SUPPRESS and review decisions. A repeat from the same source event returns the original result; the same event ID with changed payload is a conflict.

`journey_cycle_id` is minted and bound by a trusted server from a reviewed study/project context. The browser cannot change it to bypass dedupe. Two workers use unique-key insertion and row-version compare inside one transaction; a failed transaction leaves neither occurrence nor message event. Existing completed history is immutable. New Service Project creation remains under the existing contract/opening rules.

## Access and dispatch rule

No direct runtime table grants. New tables should use FORCE RLS with only controlled functions and separate LOGIN tests. A read projection is limited to authorized HQ reviewer or currently assigned worker and redacts student private fields by default. Existing Family OS projections keep their current guardian/capacity policy. A partner referral does not authorize four-year contact or transcript read.

The planner can only create a **review candidate**. Before any message or assignment, the executor must recheck the current student/family/guardian state, an explicit future-contact authority with matching purpose and channel, and the assigned Staff member's current organization/resource scope. Revocation suppresses queued work and makes old bound sessions unusable. This authority cannot be inferred from `EDUCATION_CASE` or a referral.

## Planned PG16/17 acceptance before promotion

Fresh and upgrade migrations; repeat and drift rejection; bad FK and cross-family refusal; source and date correction history; two-worker stable-key contention; expected-date reschedule without duplication; terminal immutability; permission withdrawal between planning and send; absent assignee HQ queue; duplicate event replays; transaction rollback and fresh-cluster restore. Use separate restricted LOGINs and synthetic students only. None of these are reported PASS by this design document.

## Promotion gate

An isolated migration number may be assigned only after Jimson checks newer candidates and Founder confirms it. The actual SQL candidate should be reviewed for exact source/status/consent semantics, then run in disposable PG16/17. Until then, status is **HOLD** for persistence and **NOT RUN** for E2E.
