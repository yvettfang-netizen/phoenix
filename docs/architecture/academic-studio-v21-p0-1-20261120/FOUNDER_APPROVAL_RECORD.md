# Founder Approval Record — Phoenix Academic Studio V2.1 P0.1

**Decision ID:** FOUNDER-APPROVAL-ACADEMIC-STUDIO-P0.1-20261121  
**Decision date:** 2026-11-21 (Asia/Shanghai)  
**Authority:** Founder  
**Reviewed PR:** #90  
**Reviewed design baseline:** `5b7777e1e4b407393c77095a33a80dcfee68c2e1` (Canonical main after PR #88)  
**Status:** APPROVED IN PRINCIPLE — Codex may author candidate forward SQL and disposable PG16/17 tests. No shared database install or production action is approved.

## 1. Architecture approval

Founder approves the P0.1 minimal Canonical extension, subject to the binding decisions and safeguards below.

### Identity and capabilities
- One Canonical Person, one Student Profile per student and one Principal per natural person.
- Student capability derives from the actor's own `core.student_profiles`.
- Parent capability derives from current family membership plus verified, scope-appropriate Guardian Authority and applicable Consent for the exact child/resource.
- Teacher capability derives from the existing `learning.teacher` record and current, time-valid `learning.teacher_assignment`.
- No second Principal, login, session, context-ticket or workspace-session subsystem.
- Add a narrow `learning.academy_staff_grants` object for only `ACADEMY_ADMIN` and `ACADEMY_FOUNDER`.
- Initial Founder grant is bootstrapped only through a controlled internal-service operation; no browser self-grant. Administrator cannot grant/revoke Founder or elevate itself.
- Student + Parent defaults to Student. Parent switch is explicit and revalidates the exact current Guardian Authority and Consent. A FAMILY context is not blanket permission to every Family OS data class; each protected service continues to enforce its own authority and consent scope.

### Context and privacy
- Add `STUDENT` to the existing context channel vocabulary.
- Permit global `STAFF` context with `family_id=NULL` for authorized teachers and Academy Admin/Founder.
- Reuse existing one-use `auth.context_exchange_tickets`, backend-bound `auth.session_contexts`, bind/redeem/clear and pool cleanup. No new session or ticket table.
- Student context is self-only and cannot expose parent finance, siblings or Family administration.
- Global STAFF reads must use a subject-scoped Consent check; existing family-bound `consent.has_active_consent()` remains unchanged for existing FAMILY flows.
- The STAFF Consent helper must match exact grantee Principal/person, subject, purpose and data class; confirm current subject membership in the grant family, active verified grantor authority for the relevant scope, active/non-expired/non-withdrawn consent, and current teacher assignment or Academy grant. It returns only a boolean and is callable only inside protected functions.

### Administrator / Founder permissions
- Administrator manages Academy teaching operations: course/class catalogue, teacher records/assignments, timetable, attendance correction, and learning publication within Academy scope.
- Founder includes Administrator permissions plus global oversight, grant governance and audit access.
- Teacher is restricted to assigned classes/students and approved teaching actions.
- Advisor, general Staff and Partner/Channel relationships do not imply teaching capability.
- Existing `SUPERVISOR` semantics must be inventoried and explicitly handled; no automatic elevation to Founder or Administrator.

### Scheduling and delivery mode
- Reuse current course, class, enrollment, roster, teacher, teacher assignment, schedule slot, attendance and teaching feedback objects.
- Global shared teacher/student/resource identity; no regional teaching tenants.
- The assigned **LEAD teacher** is the sole authority to set/change the session mode. ASSISTANT teachers are read-only for mode changes. An explicitly authorized Academy Administrator may perform a documented emergency correction only if Founder separately approves that exception; the initial implementation should not add this override.
- Students and parents cannot self-select or change ONLINE / ONSITE / HYBRID. They may request a change through the teacher.
- HYBRID is one slot and one roster. The LEAD teacher assigns each enrolled student to ONLINE or ONSITE.
- A slot may be finalized as HYBRID only when at least one active participant is ONLINE and at least one is ONSITE. If all participants are in one mode, the teacher must set the session to ONLINE or ONSITE.
- ONSITE/HYBRID requires a stable room. ONLINE does not reserve a physical room.
- Every mode, room, participant or time change is atomic, checks teacher/student/room/provider capacity, appends immutable before/after evidence, and notifies affected students/parents. Failed changes preserve the previous schedule.
- Room capacity counts only ONSITE participants; class capacity remains governed by existing class enrollment.
- Timezone: ONSITE/HYBRID uses the room's IANA timezone; ONLINE uses an IANA timezone explicitly selected by the LEAD teacher. Store UTC instants. Reject DST gaps; ambiguous DST folds require explicit offset. No default travel/setup buffer.

### Assessment and growth archive
- Approve in principle the separate `education.assessment_attempt` / `education.assessment_result` model.
- CAT4, DSE, A-Level, IELTS, JLPT and Cantonese retain distinct instrument versions, score scales and dimensions. No cross-instrument conversion, average, ranking or universal score.
- An assessment belongs to the Canonical Student subject, not to one Family. Do not store a single `family_id` as the assessment's ownership key; a student may have more than one authorized family context. Parent access is resolved dynamically by current family membership, exact Guardian Authority and Consent. Evidence documents retain their own existing document/family authorization.
- Keep only the minimum result metadata and references to existing Docs. Do not copy full proprietary reports, raw answers or ASKWISE attempts into the assessment tables or Family Timeline.
- Official result verification is performed by an authorized Academy Administrator/Founder or a separately approved qualified reviewer; assigned teachers may submit teacher assessments and review teaching evidence within their assignment. AI_PROPOSAL is never a formal verified result without a qualified human reviewer.
- Corrections append a superseding attempt/event; no silent overwrite. Retention/licensing rules for each third-party report must be confirmed before any real report binaries or optional sensitive fields are stored. Synthetic test fixtures only during SQL testing.

### Education Compass application
- The current in-memory Education Compass login remains an isolated demo/test fixture only; it is not a production login and must not be extended as a second account system.
- Production student/parent entry is Family OS; teacher/admin entry is Corporate OS. Both use Phoenix Core identity and Canonical APIs.

### Commercial rules
- Lesson-hour purchase, activation, debit, cancellation/no-show, make-up, expiry, refund and teacher settlement remain **HOLD** and are excluded from all candidate migrations and runtime work.

## 2. Authorization granted to Codex

Codex is authorized to:
1. Finalize the minimal migration impact plan and exact DDL/function/security design.
2. Create candidate forward SQL in a new Draft PR, separate from PR #90's design documents.
3. Add PG16 and PG17 disposable-cluster tests using synthetic data.
4. Run fresh install, repeat/drift, RLS/ACL, separate LOGIN, negative authorization, revocation/expiry, pool-reuse, teacher/student/room concurrency, restore and rollback tests.
5. Repair failures and rerun tests autonomously.
6. Perform a direct Xuanwu-style security second pass and publish the evidence report.
7. Continue until a step requires a private host/database/Cloudflare/COS credential or an explicitly human-only operational action; only that exact action may be assigned to Jimson.

## 3. Not authorized

This approval does **not** authorize:
- modifying historical migrations 0001–0037;
- installing a candidate migration in a shared non-production or production database;
- production deployment, live data changes or real learner data testing;
- physical deletion of remote legacy database instances or cloud resources;
- merging a candidate SQL PR or releasing runtime changes without the subsequent Founder gate;
- any lesson-hour commercial implementation.

No migration number is reserved by this record. Codex must scan current main and all candidate migration manifests before allocating one. The first SQL candidate must be additive and forward-only, with no legacy data import.

**Founder decision:** P0.1 minimal architecture approved in principle; candidate SQL authoring and disposable PG16/17 testing authorized. Shared database installation and production release remain separately gated.
