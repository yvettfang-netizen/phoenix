# Student Lifecycle Data Model — DB-03 design gate

**Status: DESIGN / HOLD. No DB-03 SQL is included in DB-02.** The current catalog has `core.student_profiles`, `education.academic_record`, `education.applications` and `crm.follow_ups`; `learning.enrollment` is course participation and cannot represent real university study. No `education.study_enrollments` or `crm.lifecycle_occurrences` table was observed in the isolated 0043 catalog.

## Minimal candidate model, pending source and rule approval

| Candidate | Field / rule | Boundary |
|---|---|---|
| `education.study_enrollments` | `study_enrollment_id`, canonical `student_person_id`, family ID, institution/program identifier, country, academic calendar code, actual start, expected and actual graduation, status, source/evidence document ID, revision, timestamps | One student can have sequential studies; no second Student or Person. Study evidence and guardian/assent use existing protections. |
| Lifecycle rule registry | Rule key/version, eligible geography/calendar, relative trigger, purpose, valid window | Calendar rules need approved source, not hardcoded “year 2/3/4” dates. |
| `crm.lifecycle_occurrences` or approved equivalent | Stable unique `(study_enrollment_id, journey_cycle_id, rule_key)`, due time, status, revision, assigned principal, consent snapshot reference, audit/event ID | Two workers must upsert the same occurrence; an expected graduation change updates only an unfinished occurrence. |
| Existing `crm.follow_ups` | One authorized actionable followup linked to occurrence | Service notification and marketing purpose are separate; historical referral is not marketing permission. |
| New `service.projects` | Created only after a distinct contract and formal activation event | Mere interest or followup never creates a paid project. |

## Proposed state and idempotency

`CANDIDATE → REVIEWED → ASSIGNED → COMPLETED`, with `CANCELLED` or `EXPIRED` terminal transitions. Rule computation records the calendar/source version and revision. If expected graduation changes, pending due dates are recalculated within the same stable occurrence key; completed history is not rewritten. A contact or guardian/assent withdrawal blocks new sends and uncompleted tasks. A retry with the same event ID returns the same outcome, while changed payload under the same ID is denied.

## Approval facts still required

1. University/program and academic calendar source authority, including country and transfer/leave rules.
2. The approved long-term service-contact purpose and any distinct marketing opt-in text; student majority and guardian/assent handover rule.
3. Followup ownership, assignment queue and escalation SLA; duplicate and delayed event policy.
4. Data retention/deletion policy and authoritative transition events for study, contract, payment and project opening.

PG16/17 lifecycle writes, double-worker due-date behavior, real identity and four-year outcome are **NOT RUN**. DB-03 must receive its own numbered migration candidate and Draft PR after 0043 review, with separate synthetic acceptance.
