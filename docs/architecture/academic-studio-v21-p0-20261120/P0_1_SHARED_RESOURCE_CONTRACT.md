# P0.1 Shared Teaching Resource Contract

**Status:** FOUNDER-CORRECTED CONTRACT PROPOSAL · no SQL or runtime change authorized

**Founder correction (2026-11-20):** teaching mode is assigned by the teacher, not self-selected by the student. For a Hybrid session, the teacher assigns each student to online or onsite participation.  
**Founder decision:** shared global teaching resources

## 1. Binding decisions

- One canonical teacher Person and one teacher Principal per individual, reused across regions.
- One canonical Student Person/Profile, reused across all courses and service projects.
- One global learning catalogue, enrollment and timetable model; no regional teaching tenants, duplicate teacher accounts or Hong Kong/Beijing teaching workspaces.
- Physical rooms are distinct real-world resources with stable IDs and location attributes. Location is a resource property, not a tenant boundary.
- Online meeting-provider integration remains replaceable. Meeting credentials/links are private to authorized participants and never public catalogue data.
- A hybrid lesson reserves every applicable resource: teacher, enrolled student(s), physical room if used, and online session/provider capacity if that provider exposes such a constraint.
- The teacher (or an explicitly authorized teaching administrator) determines the delivery mode for each scheduled session. A student/parent cannot self-select or change Online/Onsite participation.
- For a Hybrid session, the teacher assigns each enrolled student to Online or Onsite participation. This is one lesson slot and one roster, not duplicate classes or student-selected attendance modes.
- A mode/participation change is a teacher-controlled schedule change: record actor, time, prior value, new value and reason; notify affected students/parents; re-check resource conflicts and capacity atomically.

## 2. Existing Canonical model

| Existing object | Verified source capability | Gap / review |
|---|---|---|
| `learning.teacher` | teacher keyed by `core.people` Person | Reuse; confirm lifecycle operations |
| `learning.class` | course version, capacity, status, date range | Reuse; confirm group/one-to-one configuration |
| `learning.enrollment` | student, family, course version, state | Reuse; do not confuse with education study enrollment |
| `learning.teacher_assignment` | class + teacher + role + validity/status | Reuse; assignment currently class-scoped |
| `learning.enrollment_class` | student enrollment linked to class | Reuse |
| `learning.schedule_slot` | teacher, time interval, room_label, status | Teacher overlap exclusion exists; room_label is not a stable room resource |
| `learning.attendance_record` | attendance per slot/enrollment | Reuse |
| `learning.attendance_correction` | correction history | Reuse |

## 3. Teaching mode model

The following is a proposed contract, not an approved enum or SQL:

- Delivery mode: ONLINE / ONSITE / HYBRID.
- Class format: ONE_TO_ONE / SMALL_GROUP.
- One-to-one capacity must be 1 active student.
- Small-group capacity is an explicit positive integer and active enrollment count must not exceed it.
- Hybrid means both remote and onsite participation are supported for the same scheduled session; it does not imply duplicate course bookings.
- The teacher assigns the participation mode (Online or Onsite) for each enrolled student in that Hybrid session. Students and parents have read-only visibility; they may request a change through the teacher but cannot mutate the assignment.
- For an ONLINE or ONSITE session, the teacher sets the mode for the whole session. Students/parents cannot override it.
- Only the assigned teacher may create or change the session mode or an individual student's Hybrid participation assignment. Every change is audited and triggers a notice to affected participants.
- A mode change must atomically re-check the applicable room/provider capacity and resource conflicts. If the new allocation cannot be satisfied, reject it and preserve the previous assignment.
- Each scheduled session stores an explicit IANA timezone for presentation and local business rules while storing authoritative instants in timestamptz.
- DST gaps/folds must be handled explicitly; do not silently shift or duplicate local times.
- Buffer/travel/setup time is not assumed. Founder/Operations must decide whether it is required and the duration per resource type.

## 4. Resource conflict invariants

All checks must be concurrency-safe. A browser preflight alone is insufficient.

### Teacher
No overlapping non-cancelled lesson intervals for the same teacher. Existing `learning.schedule_slot` exclusion constraint already protects teacher overlap for rows in that table. Verify it is still present in the live non-production schema before relying on it.

### Student
A student may not be actively booked into overlapping scheduled lessons, even when those lessons belong to different classes, courses, delivery modes or families. This needs a per-student booking relation or equivalent canonical representation plus a database-level exclusion/serialization strategy.

### Physical room
A room cannot host overlapping onsite/hybrid lessons. Existing `room_label` text cannot safely enforce identity or collision; a stable room resource is required if Founder wants managed room booking.

### Capacity
Reservation and capacity increment must be atomic. Concurrent attempts for the final seat must not both succeed. Active seats only count current non-cancelled bookings/enrollments under the agreed booking lifecycle.

### Assignment and eligibility
At reservation and lesson start, check current teacher assignment, active student enrollment, class status, student/guardian authority and applicable Consent. A stale assignment or withdrawn authority must not allow a new booking or lesson record.

## 5. Allocation transaction (logical contract)

1. Resolve authenticated actor and authorized subject.
2. Lock the class/session allocation row or use an equivalent serialization mechanism.
3. Re-read class state, active teacher assignment and capacity.
4. Check teacher overlap.
5. Check each student's overlap across all classes.
6. If ONSITE/HYBRID, check stable room identity and room overlap.
7. Read the teacher-authorized delivery mode and, for HYBRID, each teacher-assigned student participation mode; reject any client-supplied override.
8. If ONLINE/HYBRID, obtain a private meeting reference through replaceable provider adapter; no vendor lock-in.
9. Create booking/reservation with idempotency key and expected revision.
10. Commit all resource reservations atomically; on any failure, create no partial booking.
11. On cancellation/reschedule/substitute teacher or teacher-directed mode change, release old reservations and acquire new ones atomically while retaining event history.

## 6. Negative and concurrency tests

- Same teacher receives two overlapping requests concurrently → exactly one succeeds.
- Same student attempts two overlapping courses concurrently → exactly one succeeds.
- Same room receives two onsite/hybrid reservations concurrently → exactly one succeeds.
- Two students compete for last small-group seat → exactly one succeeds.
- Online lesson does not reserve a physical room.
- Hybrid lesson reserves room and teacher plus each participant; teacher assigns each student's Online/Onsite participation.
- Student/parent attempts to change delivery mode or Hybrid participation directly → DENY; no state change.
- Assigned teacher changes a student's Hybrid participation → ALLOW only after capacity/conflict checks; old and new values, actor, time and reason are audited and affected participants are notified.
- Unassigned teacher attempts a mode/participation change → DENY.
- Teacher-directed mode change that would overbook the room/provider or create a student/teacher conflict → DENY atomically; prior schedule remains intact.
- Cancelled slot releases availability but retains cancellation history.
- Reschedule is atomic; failure leaves old booking intact.
- Teacher assignment revoked between preview and commit → booking denied.
- DST spring-forward nonexistent local time → explicit validation error.
- DST fall-back ambiguous local time → require explicit offset/choice.
- Teacher moving between regions uses same teacher identity and a single UTC timeline.
- No regional tenant or separate regional teacher login is created.

## 7. Unverified items and decisions still needed

- Real room inventory, locations, capacities, access hours and maintenance blocks.
- Confirm actual online-provider capacity and whether a Hybrid session uses one provider meeting for all remote participants (recommended) or per-student meeting links.
- Provider capability for online meeting creation, cancellation, recording and participant access.
- Whether travel/setup buffers are needed.
- Existing runtime writes and DB locking strategy for class capacity.
- Live non-production constraint inventory.

**Recommendation:** reuse existing learning entities; only propose a room resource and per-student booking object after Jimson confirms there is no equivalent formal object elsewhere in Canonical or the service runtime. No migration number allocated.
