# P0.1 Founder Decision Brief — Remaining Contract Choices

**Status:** PROPOSED FOR FOUNDER REVIEW · no SQL or migration approval  
**Source:** P0.1 Technical Evidence Review  
**Commercial rules:** HOLD remains unchanged.

This brief narrows the remaining decisions to the smallest product/architecture choices. The recommendations below are not approved until Founder confirms them.

## 1. One Person, one Principal, multiple capabilities

### Evidence
- `auth.principals.person_id` is unique.
- `auth.principals.principal_kind` is single-valued.
- Formal context validation maps FAMILY Principal to FAMILY context and TEACHER/SUPERVISOR Principal to STAFF context.
- Learning teacher authorization checks `learning.current_staff_kind()='TEACHER'`.
- Therefore a person who is both FAMILY actor and Teacher cannot currently use both capabilities with the same Principal.

### Recommended decision
**Keep one Principal per Person; decouple capabilities from `principal_kind`.**

Derive:
- Student: own `core.student_profiles`.
- Parent: current verified `core.guardian_authorities` plus purpose-specific Consent.
- Teacher: existing `learning.teacher` record plus active `learning.teacher_assignment` for the exact class/student.
- Administrator: a narrowly scoped, revocable teaching-management grant.
- Founder: a distinct global grant, not inherited from Administrator.

Keep existing Principal kinds and legacy callers compatible during transition. Do not create another Principal, login account, workspace session or generic organization membership just to represent an additional capability.

**Founder decision requested:** approve this capability-derived model and the minimal separate Administrator/Founder grant, or retain the current single-kind restriction (which would mean a person cannot simultaneously be Parent/Student and Teacher/Admin).

## 2. Administrator vs Founder authority

### Evidence
- Existing learning management uses `SUPERVISOR` or internal service.
- `SUPERVISOR` can manage course/class/teacher assignment and publish/retract learning outputs.
- The reviewed Canonical learning model does not separate Administrator from Founder.

### Recommended decision
- Administrator: teaching operations only (course, class, teacher assignment, schedule, attendance correction, publication approval within assigned Academy scope).
- Founder: global Academy oversight and authorization administration.
- Teacher: only assigned class/student operations.
- Staff/Advisor: no teaching permission unless a separate explicit teaching assignment/grant exists.

Do not let CRM Staff, Channel Partner or Partner referral imply Academy Administrator or Teacher rights.

**Founder decision requested:** accept the above permission boundary and allow a minimal revocable capability grant for Administrator/Founder.

## 3. Hybrid and timezone scheduling

### Evidence
- Existing `learning.schedule_slot` already protects teacher overlap.
- Class-row locking protects group capacity.
- Student slot overlap and room overlap are not represented.
- `room_label` is text, not a stable resource identity.
- Timestamps are `timestamptz`, but no IANA timezone is retained on a slot.

### Recommended decision
- One lesson slot is the single source for Online, Onsite and Hybrid.
- Hybrid is one session, not duplicate classes. **The teacher assigns each enrolled student to Online or Onsite participation**; the student/parent cannot self-select or change it.
- For Online or Onsite sessions, the teacher sets the mode for the whole session.
- Only the assigned teacher or an explicitly authorized teaching administrator may change mode/participation. Changes are audited, re-check resource capacity/conflicts atomically, and notify affected students/parents.
- Onsite/Hybrid reserves one stable physical room; Online does not.
- All slots reserve teacher time and each student's time; database concurrency controls prevent overlaps.
- Store UTC instants plus an IANA timezone for the intended local schedule and display. Reject ambiguous/nonexistent DST local times unless the user explicitly selects the offset.
- No travel/setup buffer by default; add one only if Operations demonstrates a real need.

**Founder correction recorded:** teacher controls the session mode and each Hybrid student's Online/Onsite participation; student/parent self-selection is not allowed.

**Founder decision still requested:** confirm timezone/DST presentation policy and no default travel buffer. Online provider capacity remains an implementation verification item.

## 4. Assessment evidence, review and retention

### Evidence
- `education.score_record` and `education.language_test` are append-only.
- `score_record` has a numeric score but no scale/version/dimension/evidence-document field.
- `language_test.score_json` accepts any non-empty JSON object without instrument-specific validation.
- `learning.stage_report` already supports teacher draft/submission/publication/retraction, but it is a teaching narrative rather than a formal exam result.

### Recommended decision
For CAT4, DSE, A-Level, IELTS, JLPT and Cantonese:
- retain original score/grade and the exact scale;
- record instrument edition/version and dimension/subtest;
- retain source/assessor, date, evidence reference and entry actor;
- require a verification/review state before presenting a result as official/teacher-confirmed;
- parent visibility is controlled by current Guardian Authority, Consent and publication policy;
- corrections create a superseding result/event; never overwrite the original;
- AI proposals remain separate and cannot become formal results without qualified human review;
- no cross-instrument conversion, average or ranking.

**Founder decision requested:** approve the separate-instrument/no-cross-scale principle (already directionally confirmed) and authorize an academic/legal review to define evidence retention and third-party report licensing before SQL.

## 5. Canonical-only Student identity and the existing application Student model

### Evidence
- The Education Compass application source still defines application-local `users`, `families`, `students`, `assessments` and report/order records.
- The application login role is currently `family_user | admin`.
- Canonical migration 0023 maps application Family identity to Canonical Family/Principal, but the session bridge explicitly does not approve single-student translation based on Family mapping alone.
- `integration.legacy_id_mappings` can represent Student Profile mappings, but the reviewed bridge does not yet resolve an application Student ID to the Canonical Student ID.

### Recommended decision
- Canonical `core.student_profiles.person_id` remains the only Student ID authority.
- Existing application Student IDs are legacy references only; map them to Canonical Student IDs using verified mapping evidence.
- Do not create a new Academy Student master.
- Keep any application-local operational records only as needed, linked to Canonical IDs; do not treat local `students` as the master identity.
- Do not delete or migrate live data until the actual deployed database and data inventory are verified. Source code presence alone does not prove a live database is active.

**Founder decision requested:** confirm Canonical-only Student identity and treat the application Student table as a legacy/operational projection to be reconciled, not a second authority.

## 6. Items that do NOT require Founder approval now

Codex can continue directly with:
- source/PR/CI rechecks;
- migration and function diff review;
- test design and automated synthetic tests;
- ERD and migration impact updates;
- security review of any revised candidate.

Jimson is not assigned unless a specific private non-production operation or credential/permission is unavailable to Codex. No such manual exception is currently identified.

## 7. Gate after Founder decisions

Once Founder confirms the choices above:
1. Codex revises the contracts and migration impact matrix.
2. Assistant performs the direct Xuanwu security pass.
3. Codex prepares a minimal Forward Migration proposal with exact RLS/ACL, idempotency, concurrency, revocation, pool and rollback tests.
4. Founder separately approves SQL authoring.
5. Only then may a candidate migration be authored and tested on PG16/17.

No migration number is reserved by this brief. No SQL or production action is authorized.
