# Academic Studio B1 — Teacher Scheduling Candidate

**Draft / no migration number / not installed.** Exact parent: formal Canonical 0001–0037.

This independent candidate introduces the missing *physical resource and participant reservation* contract, without rebuilding `learning.course`, `class`, `enrollment`, `teacher`, `teacher_assignment`, `schedule_slot` or attendance.

**Implementation:** `database/canonical/forward-candidates/academic-studio/b1_teacher_scheduling.sql`.

It adds:
- Global, stable `learning.room` with site code, capacity and IANA timezone.
- Delivery mode, room ID, timezone and finalization fields to existing `learning.schedule_slot`.
- `learning.schedule_slot_participant`, linked by the existing class/enrollment roster, with an exclusion constraint for student overlaps.
- An exclusion constraint for room overlaps and a cancellation trigger to release student reservations when the *existing* formal slot-state function finishes/cancels a slot.
- Immutable `learning.schedule_slot_event` records of mode changes, student participation changes and finalization.
- Narrow protected functions to let the **assigned LEAD Teacher** set ONLINE/ONSITE/HYBRID, assign individual participation mode and finalize. Students and parents have no mutation path.
- In HYBRID, one slot/roster and at least one ONLINE and one ONSITE participant. Room capacity counts only onsite participants.

No company- or region-based teaching tenant is introduced. Calendar instants use existing `timestamptz`; local timezone is IANA. There is no travel/setup buffer. No vendor-specific video provider, meeting link, billing or course-hour ledger is included.

## Testing

New independent GitHub Actions PG16/17 jobs start from formal 0001–0037 in owned, disposable containers, verify:
- missing isolated flag denies installation;
- new objects FORCE RLS; app has no direct table SELECT;
- teacher/room/student GiST collision constraints are present;
- protected delivery-mode function has no PUBLIC EXECUTE;
- cancelled existing slot release hook exists;
- candidate repeat is rejected, original ledger unchanged;
- test container/volume/credentials removed.

**Not yet proven by the initial smoke:** business-level concurrency under simultaneous sessions, runtime identity binding, notification delivery, DST fold/gap from a local input, video provider capacity, or full teacher/guardian browser experience. Follow-up B2 must exercise real separate LOGIN actors, simultaneous room/student writes, consent expiry, stale assignment, change events, and cancellation/restore before SQL promotion.

**Gate:** Founder architecture approval authorized only candidate authoring and disposable CI. Candidate SQL merge, shared/nonproduction installation and production are separately HOLD.
