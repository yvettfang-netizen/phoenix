# Phoenix Academic Studio — Package B0 scheduling candidate

**Status: DRAFT / NOT APPROVED FOR INSTALLATION OR MERGE.** Isolated technical slice, not live timetable service.

**Source:** main `f1d8af3f9338b4cb8a1afca48c6d85f1396d9da3`, formal Canonical 0001–0037 unchanged. Independent of unmerged Package A PR #92, PR #77 workspace sessions and lesson-hour commercial rules.

## Reuse
- Existing `learning.schedule_slot`, `learning.teacher`, `learning.teacher_assignment`, `learning.enrollment_class`, `learning.enrollment`, `learning.attendance_record` and forced RLS.
- Teacher overlap already prevented by formal 0022 exclusion; class seats enforced by existing class-row lock.
- No duplicate Student/Teacher/Principal/Class/Enrollment/attendance authority.

## Proposed bounded objects
1. `learning.room`: shared physical resource with capacity, location and IANA zone; no region-company tenant.
2. Existing `learning.schedule_slot` gains delivery mode, teacher set-by and finalization state. Teacher decides Online/Onsite/Hybrid; students/parents cannot select.
3. `learning.schedule_slot_participant` is the per-student teacher assignment of Online/Onsite within one slot/roster. Database GiST prevents active student time conflicts; a separate GiST prevents room overlaps.
4. `learning.schedule_slot_event` is an immutable audit-of-change record. It is not a second Family Timeline or notification store.
5. Narrow `set_slot_delivery`, `assign_slot_participant`, `finalize_slot_delivery` functions check active assigned LEAD teacher in STAFF context. Existing cancellation releases active slot reservations.

## Test gate
Disposable PG16/17 harness starts from formal 0001–0037 plus unnumbered B0; tests isolated-install guard, migration ledger, forced RLS/ACL, duplicate-install refusal, LEAD teacher mode/participant/finalization, room/student collision, immutable event and cancellation. Synthetic data only.

## Explicit blockers — no production promotion
- Post-finalization rescheduling, participant mode change, room move, substitute teacher, roster changes and reliable external notification are not implemented in B0.
- Concurrent separate-LOGIN users and live authority/Consent revocation require extended acceptance; current smoke is an initial isolated PG structural and function test.
- Provider-specific capacity, protected meeting links, local-time DST gap/fold resolution, and user-facing timetable/read projections remain unimplemented.
- Package A global STAFF/Consent integration must be tested against the eventual single approved A migration; no combining draft candidates or double-installing S1.
- No lesson-hour purchase/debit/refund/settlement functions, real learner data, shared database installation, release, or SQL merge authorized.

**Outcome:** Candidate and test source prepared for review only; do not claim global timetable end-to-end completion.
