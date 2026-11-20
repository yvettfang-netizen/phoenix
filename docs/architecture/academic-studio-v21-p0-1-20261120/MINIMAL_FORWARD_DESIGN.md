# Phoenix Academic Studio V2.1 — Minimal Forward Design

**Status:** PROPOSED DESIGN · no SQL file · no migration number · no runtime changes  
**Source baseline:** [SOURCE_BASELINE.md](SOURCE_BASELINE.md)  
**Founder binding decisions:** Student-first dual view; global shared teaching resources; teacher-controlled delivery mode; separate assessment systems; lesson-hour commercial rules HOLD.

## 1. Executive decision

The Canonical schema already contains most of the teaching foundation. Do not rebuild it.

**Reuse the existing identity, course, class, enrollment, teacher, assignment, schedule, attendance, report and evidence records. Add only three bounded capability areas:**

1. A small capability/context extension so one Principal can enter Student, Parent and Corporate workspaces without duplicate identities.
2. Stable rooms and per-student schedule participation so teacher-controlled Online / Onsite / Hybrid scheduling can be enforced under concurrency.
3. A scale-aware assessment attempt/result pair so CAT4, DSE, A-Level, IELTS, JLPT and Cantonese results remain distinct and reviewable.

No package purchase, lesson-hour debit, refund or teacher settlement objects are included.

## 2. Identity and workspace capability — reuse first

### 2.1 Existing Canonical authority

Reuse without duplication:

- `core.people`: one natural-person identity.
- `core.student_profiles`: one Student ID per person.
- `core.families` / `core.family_memberships`: family relationships.
- `core.guardian_authorities`: verified, scoped, time-bounded and revocable guardian authority.
- `consent.grants`: purpose/data-class-specific consent.
- `auth.principals`: one Principal per Person (`person_id` is UNIQUE).
- `auth.context_exchange_tickets` and `auth.session_contexts`: existing one-use ticket and backend-bound context.
- `learning.teacher` and `learning.teacher_assignment`: teacher identity and current class/student teaching scope.

Do not create a second Person, Student Profile, Family, Principal, login account, session table, context-ticket table or generic workspace-session subsystem.

### 2.2 Principal kind must stop being the whole capability model

**Proven gap:** `auth.principals.principal_kind` is single-valued. Formal `auth.validate_context_request()` maps FAMILY Principal → FAMILY channel and TEACHER/SUPERVISOR Principal → STAFF channel. `learning.current_staff_kind()` derives the teaching role from that one value. A person who already has a FAMILY Principal cannot simply receive a second TEACHER Principal because `auth.principals.person_id` is unique.

**Minimum proposed model: derive ordinary capabilities from existing domain facts; explicitly grant only Academy administration.**

| Capability | Authority source | Scope |
|---|---|---|
| Student | The actor's own `core.student_profiles.person_id` | Own learning and growth records only |
| Parent / Guardian | Active family membership + verified `core.guardian_authorities` for the exact subject + applicable Consent | Only children and data classes currently authorised |
| Teacher | Existing active `learning.teacher` row + active, time-valid `learning.teacher_assignment` for the exact class/student + applicable Learning Consent | Assigned classes/students only |
| Administrator | New narrow `learning.academy_staff_grants` row with `ACADEMY_ADMIN` | Global Academy teaching operations |
| Founder | Same grant object with distinct `ACADEMY_FOUNDER` capability | Global Academy oversight and grant governance |

No generic role-binding framework or organization/tenant scope is needed for Academy.

### 2.3 Reuse the existing context mechanism with three human views

Proposed context channels:

| Channel | Purpose | Family ID in context | Server-side rule |
|---|---|---|---|
| `STUDENT` (additive) | Student Learning Center | NULL | Active Principal maps to actor; actor has own Student Profile; all student reads are self-only |
| `FAMILY` (existing) | Parent / Family Center | Required | Current family membership; every child read separately checks verified Guardian Authority and applicable Consent |
| `STAFF` (existing) | Corporate OS teacher/admin workbench | NULL for global staff context | Active teacher capability or active Academy Admin/Founder grant; every student operation checks assignment/authority |

ADVISOR, PARTNER and INTERNAL channels remain compatible with their existing rules. Partner referral or channel membership never grants teaching authority.

The channel changes require updating the existing check constraints on `auth.session_contexts` and `auth.context_exchange_tickets`, plus `auth.validate_context_request()`, `auth.issue_context_ticket()`, `auth.redeem_context_ticket()` and relevant protected read functions. This is an extension of the existing ticket/context lifecycle, not a second one.

### 2.4 Login and switching rules

- If Student and Parent capabilities are both valid, login defaults to STUDENT.
- Student view is self-only and cannot read parent finance, siblings or family administration.
- Parent switch is an explicit user action. The server issues a fresh short-lived FAMILY ticket only after rechecking current membership and at least one active verified Guardian Authority in that family. Each child read then rechecks Guardian Authority for that exact subject and the applicable Consent. Family membership alone is not enough to enter the Parent view.
- Parent-only users default to FAMILY.
- Teacher-only and Academy Admin/Founder users enter STAFF / Corporate OS.
- A user with multiple capabilities keeps one Principal and one authenticated identity. Switching views re-resolves capability; it never creates a new account.
- Revocation, expiry, Principal disable and Consent withdrawal deny the next protected request; do not rely on cached UI role labels.
- Student and STAFF global contexts use `family_id=NULL`. Protected functions must therefore resolve the target Student's actual family from the Canonical enrollment/relationship records and must not assume `auth.current_family_id()` is always populated.

### 2.5 Minimum new identity object

**Proposed only:** `learning.academy_staff_grants`

| Field | Purpose |
|---|---|
| `grant_id` | UUIDv7 primary key |
| `principal_id` | Existing Principal; never a new identity |
| `capability_code` | `ACADEMY_ADMIN` or `ACADEMY_FOUNDER` |
| `status` | ACTIVE / REVOKED |
| `valid_from`, `valid_until` | Effective period |
| `granted_by_principal_id` | Auditable grant authority |
| `revoked_by_principal_id`, `revoked_at` | Revocation evidence |
| `authorization_version` | Increment on revoke/change |
| `reason_code`, `created_at` | Audit reason and timestamp |

No region, company, organization, franchise or tenant column. The initial Founder grant must be bootstrapped through the existing controlled internal-service path; it must not be self-granted through the browser. Founder must approve the bootstrap authority before SQL.

Existing `learning.register_staff_principal()` must not create a second Principal for a person who already has one. Existing person Principal is reused; Teacher is registered in `learning.teacher`; Administrator/Founder is granted through the new capability grant. Any legacy SUPERVISOR rows must be inventoried and explicitly mapped; do not silently elevate them to Founder.

### 2.6 Required function behavior changes

- `auth.validate_context_request()`: derive STUDENT, FAMILY and STAFF access from current Canonical facts, not solely `principal_kind`.
- `learning.current_staff_kind()`: resolve Founder/Admin grant first, then active Teacher capability; retain any legacy SUPERVISOR behavior only under an explicit compatibility decision.
- `learning.teacher_has_class_access()`: validate active teacher identity, active assignment, exact class/student relationship and Consent. It must not require the Principal's single kind to equal TEACHER.
- `learning.can_manage_learning()`: allow only internal service or active Academy Admin/Founder grant; do not let CRM Staff, Advisor, Partner or Teacher inherit management rights.
- `learning.can_read_sensitive()` and published-report reads: support STUDENT self-only, FAMILY guardian-authorised, and STAFF assignment/admin-scoped reads.
- Teacher internal drafts remain teacher/admin-only. Parent and Student views receive only published feedback/reports.

## 3. Teaching catalogue and course enrollment — reuse

Reuse existing Canonical objects:

| Existing object | Reuse |
|---|---|
| `learning.course` / `course_version` | Course catalogue and effective-dated versioning |
| `learning.class` | One-to-one or small-group teaching group and capacity |
| `learning.enrollment` |凤启学苑 course enrollment; do not confuse with University/education study history |
| `learning.teacher` / `teacher_assignment` | One teacher identity and time-bounded class assignment |
| `learning.enrollment_class` | Existing class roster |
| `learning.attendance_record` / `attendance_correction` | Attendance and append-only correction history |
| `learning.after_class_card` / `publication` | Teacher lesson card and publish/retract lifecycle |
| `learning.stage_report` | Teacher-authored growth narrative |

Do not create a second course, teacher, class, enrollment, class roster or attendance model.

Existing `learning.enrollment` activation currently checks an Operations COURSE entitlement. Keep that contract. It is not a lesson-hour balance.

## 4. Scheduling — smallest required extension

### 4.1 Existing controls to keep

- `learning.schedule_slot` is the single timetable slot.
- A GiST exclusion constraint already prevents overlapping non-cancelled slots for the same teacher.
- `learning.place_enrollment_in_class()` locks the class row before checking capacity, protecting the final small-group seat.
- `learning.teacher_assignment` already has one active LEAD teacher per class.

### 4.2 Proven gaps

- `schedule_slot.room_label` is free text; no stable room ID or room capacity exists.
- No future per-student slot assignment exists; attendance is recorded after the lesson.
- No student-level overlap constraint spans different classes.
- No explicit Online / Onsite / Hybrid mode or per-student Hybrid assignment exists.
- No IANA timezone is retained on the slot.
- No provider-neutral meeting reference contract is connected to the current timetable API.

### 4.3 Minimum proposed objects

**Extend existing `learning.schedule_slot`** with:
- `delivery_mode` — ONLINE / ONSITE / HYBRID; nullable only for historical rows or newly created slots awaiting teacher confirmation.
- `room_id` — nullable stable room FK; required for ONSITE and HYBRID after teacher confirmation.
- `timezone_name` — IANA timezone for local schedule interpretation; UTC `starts_at/ends_at` remain authoritative.
- `delivery_mode_set_by_principal_id` and `delivery_mode_set_at` — teacher authority evidence.

Keep `room_label` for legacy display only; do not use it as a collision key.

**Add `learning.room`**:
- `room_id` UUIDv7 PK;
- location/site code and display name;
- room code/name;
- capacity;
- IANA timezone;
- ACTIVE / INACTIVE status;
- created/updated actor and timestamps.

No company/region tenant. A room is a physical resource with a location attribute.

**Add `learning.schedule_slot_participant`**:
- slot_id + class_id;
- enrollment_id + family_id + student_person_id (composite FK to the existing class roster);
- teacher-assigned `participation_mode` ONLINE / ONSITE;
- status ASSIGNED / CANCELLED;
- copied slot start/end instants maintained only by a trusted trigger;
- assigned_by_principal_id and assigned_at.

The table is the per-student reservation and Hybrid assignment. It does not create a second enrollment or attendance record.

**Add `learning.schedule_slot_event`** (append-only):
- slot_id;
- optional enrollment_id for an individual Hybrid participant;
- event type (mode set/changed, participant assigned/reassigned, room changed, rescheduled, cancelled);
- old/new mode, room and/or time values;
- reason code;
- actor Principal and occurred_at.

This preserves the required before/after evidence. Existing access-decision audit remains in use for ALLOW/DENY; it is not a substitute for the schedule change history.

### 4.4 Binding business rules

1. The assigned teacher sets the session mode. Students and parents are read-only.
2. For ONLINE or ONSITE, the teacher sets the mode for the entire session.
3. For HYBRID, the teacher assigns every enrolled student to ONLINE or ONSITE within the same slot and class roster.
4. A student/parent cannot create, change or override the mode or participation assignment. They may request a change through the teacher.
5. The assigned LEAD teacher is the recommended single authority where a class has multiple teachers. Founder should confirm whether an ASSISTANT may ever change the mode.
6. A mode/room/time change is atomic: lock slot and applicable room, re-check teacher/student/room/provider capacity and conflicts, append event, then publish the new state. If any check fails, keep the old assignment unchanged.
7. ONSITE and HYBRID require a stable room. ONLINE does not reserve a room.
8. Room overlap is enforced at database level using the same time-range exclusion approach as teacher overlap.
9. Student overlap across all classes is enforced at database level using a GiST exclusion on the active per-student slot reservation time range.
10. Room capacity counts only ONSITE participants. Class capacity remains the existing enrollment/class capacity.
11. A HYBRID session is one slot, not duplicated Online and Onsite classes. Recommended finalization rule: at least one participant is assigned to each mode; if not, teacher changes the session to ONLINE or ONSITE.
12. Students/parents receive the latest schedule through the Family OS read projection. Publish a Family Timeline event for material schedule changes using the existing append-only event contract; do not create a second notification or timeline database.

### 4.5 Time and meeting provider

- Store authoritative instants as `timestamptz`.
- Store an IANA `timezone_name` for local display and DST interpretation.
- Reject nonexistent or ambiguous local times unless the teacher explicitly selects a valid offset.
- Proposed timezone default: physical room's timezone for ONSITE/HYBRID; teacher-selected schedule timezone for ONLINE. Founder confirmation remains pending.
- Do not assume travel/setup buffers; none is included by default.
- Keep the meeting provider behind an adapter. Do not add provider-specific credentials or meeting tables until a provider and secret-handling contract are selected. Meeting links must be private to authorised participants.

## 5. Assessment and growth archive — smallest required extension

### 5.1 Existing records to reuse

- `education.academic_record`: school/qualification history and evidence.
- `education.score_record`: append-only numeric subject scores.
- `education.language_test`: append-only language-test payload and evidence.
- `learning.stage_report` / `learning.publication`: teacher narrative, review and family publication/retraction.
- `docs.documents`: evidence authority and document versioning.
- Existing consent and access audit functions.

### 5.2 Why existing score tables are insufficient

- `education.score_record.score` is numeric only and has no instrument version, score scale, dimension or review/publication lifecycle.
- `education.language_test.score_json` accepts any non-empty JSON object and does not validate instrument-specific scales or versions.
- CAT4, DSE and A-Level are not all language tests; a single JSON language-test row is not a reliable common assessment authority.
- `learning.stage_report` is a teacher narrative, not a formal test result.

### 5.3 Minimum proposed normalized pair

**Add `education.assessment_attempt`** for one instrument sitting/assessment event:
- attempt_id UUIDv7;
- family_id and student_person_id;
- instrument_code: CAT4 / DSE / A_LEVEL / IELTS / JLPT / CANTONESE;
- instrument_version and awarding_body/provider where applicable;
- assessed_on;
- source_type: OFFICIAL_RESULT / TEACHER_ASSESSMENT / SELF_REPORTED / AI_PROPOSAL;
- lifecycle_status: DRAFT / SUBMITTED / VERIFIED / REVIEWED / PUBLISHED / REJECTED / RETRACTED / SUPERSEDED;
- assessor_person_id, entered_by_principal_id;
- evidence_document_id (FK to existing Docs);
- reviewed_by_principal_id, reviewed_at, published_at;
- supersedes_attempt_id for correction without overwriting the original;
- created_at.

**Add `education.assessment_result`** for one dimension/result within an attempt:
- result_id UUIDv7;
- attempt_id FK;
- dimension_code (OVERALL, LISTENING, VERBAL, DSE subject, etc.);
- score_scale_code (e.g. IELTS_BAND, CAT4_SAS, DSE_GRADE, A_LEVEL_GRADE, JLPT_LEVEL, JLPT_SECTION_SCORE, CANTONESE_RUBRIC_V1);
- numeric_value or text_value, exactly one populated;
- optional unit/grade label only where the scale contract requires it.

No universal score or cross-instrument conversion field.

### 5.4 Assessment rules

- Preserve the exact original score, grade, scale, dimension, instrument edition and source.
- IELTS Overall and four bands remain IELTS bands; CAT4 standard age scores remain CAT4; DSE and A-Level grades remain their own grade systems; JLPT level/section scores remain JLPT; Cantonese results retain the rubric version and skill dimension.
- No cross-instrument average, ranking, percentile conversion or normalized “overall ability” score.
- Official/self-reported/teacher-assessed/AI-proposed sources are visibly distinct.
- AI_PROPOSAL cannot become PUBLISHED without qualified human review and a recorded reviewer.
- Student sees only their own permitted records. Parent sees only PUBLISHED records for children backed by current Guardian Authority and Consent. Teacher sees only assigned student records needed for the teaching task. Admin/Founder access is audited and grant-scoped.
- Corrections append a superseding attempt/event; no silent overwrite or delete.
- Use `docs.documents` for evidence; do not copy raw assessment answers or full report binaries into Family Timeline.
- Use existing Family Timeline event contract as the presentation layer. New event types require registry review; do not create a second timeline table.
- Existing Canonical score_record/language_test rows remain intact. No bulk copy or deletion is proposed. After cutover, new supported standardized assessments should write to the new attempt/result authority, while old rows remain historical/legacy until a separate read-compatibility decision.

## 6. Commercial rules remain HOLD

No lesson-hour package, payment activation, hour ledger, cancellation/no-show debit, make-up credit, expiry, refund or teacher settlement table/API is included.

Reuse existing `learning.enrollment` and `operations_ref` course entitlement validation as it exists. `operations_ref.entitlement_ref` is not a lesson-hour ledger or payment/refund ledger.

## 7. Migration boundaries — not yet numbered

| Candidate package | Proposed changes | Explicit exclusions |
|---|---|---|
| A — Identity/context | Add STUDENT channel; allow global STAFF context with NULL family_id; update existing ticket/context constraints and validator; add `learning.academy_staff_grants`; update staff/teacher authorization functions and projections | No new Person, Student, Principal, login, session, ticket or workspace-session table |
| B — Scheduling | Add `learning.room`, slot delivery fields, `learning.schedule_slot_participant`, append-only `learning.schedule_slot_event`, conflict/capacity functions | No duplicate class/enrollment/attendance; no student-selected mode; no vendor-specific meeting credentials |
| C — Assessment | Add `education.assessment_attempt` and `education.assessment_result`, audited lifecycle and projections | No single universal score, no automatic cross-scale conversion, no raw ASKWISE answer copying |
| Commercial | NONE | All lesson-hour purchase/debit/refund/settlement logic remains HOLD |

Each package needs its own Draft PR, candidate migration, PG16/17 fresh/repeat/drift, separate LOGIN, RLS/ACL, negative, concurrency, revoke/expiry, pool-reuse, restore and rollback evidence. Founder approval is required before SQL authoring and before any installation.

## 8. Current conclusion

The minimum design is an extension of Canonical PostgreSQL, not a new education database. The core course/teacher/enrollment/attendance model is reused. The only proposed new domain objects are one Academy Admin/Founder grant, room and per-student schedule assignment/event records, and a normalized assessment attempt/result pair. All remain proposals until Founder closes the remaining decisions.
