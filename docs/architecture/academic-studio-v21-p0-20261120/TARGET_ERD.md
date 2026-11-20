# Academic Studio V2.1 target ERD

Status: **PROPOSED target**, anchored to verified formal Canonical 0001–0037. Names prefixed `P_` are conceptual, not existing tables or reserved migration names. Foreign keys and access paths require separate SQL review.

```mermaid
erDiagram
  core_people ||--o| core_student_profiles : identifies
  core_people ||--o{ core_family_memberships : belongs_to
  core_families ||--o{ core_family_memberships : contains
  core_people ||--o{ core_guardian_authorities : guardian
  auth_principals ||--o| core_people : actor
  core_student_profiles ||--o{ learning_enrollment : studies
  core_families ||--o{ learning_enrollment : scopes
  learning_course ||--o{ learning_course_version : versions
  learning_course_version ||--o{ learning_class : offered_as
  learning_enrollment ||--o{ learning_enrollment_class : joins
  learning_class ||--o{ learning_enrollment_class : has_student
  learning_class ||--o{ learning_teacher_assignment : assigned
  learning_class ||--o{ learning_schedule_slot : scheduled
  learning_schedule_slot ||--o{ learning_attendance_record : attendance
  learning_enrollment ||--o{ learning_stage_report : reported
  learning_enrollment ||--o{ P_lesson_package : covered_by
  P_lesson_package ||--o{ P_lesson_ledger_event : immutable_events
  learning_schedule_slot ||--o{ P_slot_booking : reserves
  learning_enrollment ||--o{ P_slot_booking : books
  P_slot_booking ||--o{ P_lesson_confirmation : evidenced
  P_lesson_confirmation ||--o{ P_lesson_ledger_event : authorizes_debit
  P_lesson_confirmation ||--o{ P_teacher_settlement_line : payable
  learning_schedule_slot }o--o| P_teaching_resource : uses
  core_student_profiles ||--o{ P_assessment_attempt : assessed
  P_assessment_catalog ||--o{ P_assessment_attempt : specifies
  P_assessment_attempt ||--o{ P_assessment_result : versioned_result
  P_assessment_result }o--o{ P_growth_timeline_projection : contributes
  learning_stage_report }o--o{ P_growth_timeline_projection : contributes
```

Existing Canonical entities are represented by their exact schema/table names with dots replaced by underscores only for Mermaid syntax. `P_growth_timeline_projection` should be a read projection or view, not an independent student master. `P_teacher_settlement_line` is evidence for a separate authorised settlement authority; it is not a payroll/payment ledger.

## Required invariants

- A booking changes slot allocation, never a package balance.
- A lesson debit requires a teacher-confirmed delivery fact, approved attendance policy, matching student/enrollment/package and an idempotent event key.
- The ledger is append-only; correction, make-up and refund are compensating events linked to the original event. No UPDATE/DELETE of history.
- Exclusion constraints or serializable transactions must prevent teacher, student and physical-room overlap, including concurrent inserts. Existing 0022 only excludes teacher overlap.
- Assessment attempts preserve instrument, edition, scale, source and evidence; growth timeline shows provenance and the viewer's current authorisation.
