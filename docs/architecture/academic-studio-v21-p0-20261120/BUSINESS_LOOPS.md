# Three Academic Studio business loops

All structures and APIs below are **PROPOSED**. Existing Canonical objects are identified in [the reuse matrix](DATABASE_REUSE_AND_GAPS.md). No package, booking, room, assessment or settlement table was installed in P0.

## 1. Lesson package, consumption and settlement

| Step | Required source and state | Authorised action / invariant |
| --- | --- | --- |
| Purchase | Authoritative contract/order and payment event; `PURCHASED_PENDING` | Payment reference is validated by Finance/Operations. Browser declaration cannot activate hours. |
| Activation | Contract service scope, payment confirmation, student/enrollment and effective dates; `ACTIVE` | Idempotent activation event records source version; package has one student/family scope. |
| Booking | Active class/slot, capacity, student authority, active package; `BOOKED` | Reserve a seat; **do not debit**. Cancel/expire releases reservation with history. |
| Teaching confirmation | Teacher assignment, delivered slot, attendance and any permitted exception; `DELIVERED_PENDING_REVIEW → CONFIRMED` | Teacher confirms actual duration; unconfirmed or disputed lessons cannot become consumed. |
| Consumption | Approved confirmation; immutable `DEBIT` event | Unique source confirmation prevents double debit. Balance is a projection of immutable events, never an editable field. |
| Make-up | Original event, approved reason, new slot; `CREDIT_COMPENSATION` then new booking | No silent overwrite of old attendance/debit. Policy for expired package and who may approve is a Founder/Operations decision. |
| Refund | Authoritative refund event and allocation rule; `REFUND_ADJUSTMENT` | Link to original purchase/debit. Finance owns money; lesson ledger mirrors entitlement impact only. |
| Teacher settlement | Confirmed delivered duration, rate-contract version and approved exceptions; `ACCRUED → APPROVED → SETTLED` | Reconciliation line references confirmation. Payroll/payment authority remains external; reversal is compensating. |

API candidates: `POST /v1/learning/bookings`, `POST /v1/learning/lessons/{id}/confirm`, `GET /v1/learning/packages/{id}/ledger`, `POST /v1/learning/settlement-lines/{id}/approve`. Each write needs verified principal, resource scope, idempotency key, expected revision and audit reason. Exact prices, refund formula, lesson duration and staff approval chain are HOLD.

## 2. One-to-one, small group, online, offline and hybrid scheduling

`learning.class`, `learning.enrollment_class`, `learning.teacher_assignment` and `learning.schedule_slot` are existing. The 0022 GiST exclusion prevents overlapping non-cancelled slots for the same teacher. `room_label` is plain text; no canonical room ID or room collision constraint exists. A student may be enrolled in overlapping classes. Booking is not modelled per slot.

Proposal: a versioned teaching mode (`ONE_TO_ONE`/`SMALL_GROUP` plus `ONLINE`/`ONSITE`/`HYBRID`), stable resource identity for physical rooms, and per-student slot booking. One transactional allocator checks: active teacher assignment, student's current enrollment and capacity, teacher overlap, student overlap, room overlap when onsite/hybrid, travel/setup buffers if approved, and consent/guardian rules for minors. Enforce the three resource collisions at DB level with exclusion constraints or serialization plus verified locking; an API preflight alone races under concurrency. Online meeting links remain private, not part of public catalogue.

Negative cases: simultaneous booking requests, two classes same teacher, one student two classes, two classes same room, class cancelled after reservation, teacher reassigned mid-course, timezone/daylight transition. Permission to view a timetable does not permit editing another student's booking.

## 3. Independent assessments and unified growth timeline

`education.score_record` and `education.language_test` are existing generic facts, while `learning.stage_report` is an existing teaching report. These are not a complete instrument/attempt/result authority for CAT4, DSE, A-Level, IELTS, JLPT and Cantonese capability. Do not encode every exam as a free-text subject or treat an ASKWISE diagnosis as a formal exam result.

Propose separate, versioned instrument definitions and attempts with: `instrument_code`, edition, locale, age/level applicability, score scale and subscale schema, test date, assessor/source, evidence reference, review status, visibility policy and superseding result. Each of the six systems has its own score interpretation and permitted comparisons. Cross-exam numerical averages and inferred conversion are forbidden until a reviewed mapping exists. ASKWISE retains its own task/retry/evidence engine; only a consented, versioned summary may enter an authorised Academy projection.

The growth timeline is a provenance-bearing read projection over published learning reports, approved assessment results, education facts and applicable service milestones. Every item carries source type/id/revision, event time, publication time and current viewer scope. Withdrawal/retraction hides future reads while preserving necessary audit. Parent view requires current guardian authority and Consent; student self-view uses their own principal; teacher access is assignment-specific.

Negative cases: other family, revoked guardian, unassigned teacher, stale report revision, unapproved exam attempt, mismatched instrument scale, withdrawn Consent, cross-student timeline aggregation. Real identities, testing licences, score scales and retention decisions remain HOLD.
