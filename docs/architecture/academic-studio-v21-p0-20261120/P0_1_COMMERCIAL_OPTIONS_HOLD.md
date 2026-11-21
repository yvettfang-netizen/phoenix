# Commercial Rules Decision Packet — Founder HOLD

**Status:** DISCUSSION ONLY · NOT APPROVED · DO NOT IMPLEMENT  
**Founder decision:** HOLD all lesson-hour commercial rules pending explicit Founder approval.

This packet makes decisions visible. It does not choose a default, set prices or authorize SQL, payment integration, debit, refund or settlement.

## 1. Authority boundary

Before implementation, Founder must identify:
- system of record for contracts/orders and who may amend them;
- payment processor/bank/Operations source that confirms received funds;
- refund source of truth and approver;
- who owns package pricing, discounts, gifts and promotional entitlements;
- who approves make-up exceptions;
- who approves teacher rates and settlement exceptions;
- accounting/tax treatment and evidence retention owner.

A browser callback or staff checkbox cannot establish that money has been received or refunded. `operations_ref.entitlement_ref` is an external entitlement reference and is not the financial ledger.

## 2. Decisions required (options are alternatives, not recommendations)

| Policy | Option A | Option B | Option C / unresolved |
|---|---|---|---|
| Package activation | Activate only after authoritative payment success | Activate after approved manual reconciliation with evidence | Split deposit/partial-payment activation; rules must be explicit |
| Unit of entitlement | Minutes, one universal unit | Lesson credits with fixed duration per package | Hybrid; avoid floating-hour arithmetic |
| Lesson consumption | Actual confirmed delivered minutes | Full booked duration after a defined attendance outcome | Contract-specific minimum/cap; Founder must define |
| Early cancellation | No debit | Policy-based cancellation window | Course/package-specific window; freeze policy version at purchase |
| Late cancellation | No debit | Full lesson debit | Partial debit or exception-based rule |
| Student no-show | No debit | Full debit | Partial debit; define proof and dispute route |
| Teacher cancellation | Always no student debit; arrange replacement | Refund/re-credit and optional reschedule | Exact replacement deadline and responsibility |
| Make-up | Restore entitlement then book a new slot | Create linked replacement without immediate ledger credit | Exception approval, expiry and repeat-make-up rules |
| Package expiry | Fixed validity from activation | Validity starts at first lesson | No expiry / case-specific; consumer-law review required |
| Refund | Pro-rata unused balance | Original package rate less consumed lessons at package rate | Tiered/discount allocation; define partial refund and fees |
| Gifts/promotions | Non-refundable, separate bucket | Same refundability as purchased entitlement | Expiry/transfer rules need explicit disclosure |
| Teacher settlement basis | Confirmed delivered minutes × rate | Per lesson/session rate | Group lesson split, assistant rates, cancellation pay |
| Settlement approval | Admin confirms, Founder/Finance approves | Dual approval by teaching lead + Finance | Threshold-based; exact authority matrix required |

## 3. Mandatory cross-cutting controls regardless of chosen policy

- Purchase and refund must be backed by authoritative source events and immutable external references.
- Every write has an idempotency key, source event ID/version, actor Principal, timestamp and reason.
- Never mutate historical debit/credit; append compensating events.
- Booking reservation is not consumption.
- Teacher confirmation is necessary but may not alone be sufficient where attendance or disputes require review.
- Refund of money and reversal of learning entitlement are related but distinct events; reconcile both.
- A package may not be overdrawn by concurrent lessons.
- A refund may not exceed the refundable amount computed from the approved contract version and authoritative ledger.
- Teacher payable is not the same as student hour debit; preserve separate rate contract and settlement line.
- Disputed sessions freeze only the disputed amount/line; never silently edit past entries.

## 4. Required sample scenarios for Founder decision

1. Student buys 20 hours with a 10% promotion; completes 3 × 90-minute lessons; asks for a refund.
2. Student cancels 4 hours before class, then cancels 30 minutes before class.
3. Teacher cancels after student has travelled to the venue.
4. Student is absent but claims the online meeting link failed.
5. One student in a six-person group misses class; teacher delivered the session to five others.
6. Teacher teaches 45 minutes of a planned 90-minute lesson and both parties dispute the duration.
7. A paid package expires with unused hours.
8. A package is partly refunded after one gifted lesson and one discounted lesson.
9. A substitute teacher completes a lesson; rate differs from the original teacher.
10. Finance reports a refund success event after the Academy has already processed a retry.

For each scenario, the decision packet must show customer impact, teacher compensation impact, accounting impact, fraud/dispute risk and exact ledger events under each policy option.

## 5. Exit gate

No commercial SQL, API write path, debit/refund/settlement implementation or production configuration until Founder signs a versioned policy decision covering all relevant rows and edge cases. The current status remains **HOLD**.
