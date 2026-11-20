# DB-03 readiness audit — university study and long-term followup

**Status: PG16/17 review-only candidate PASS / HOLD active lifecycle.**

## Existing Canonical facts

- Formal mainline remains migrations 0001–0037.
- `core.people`, `core.student_profiles`, `core.families` remain identity authorities.
- `education.academic_record` stores academic history but does not represent a verified current university enrollment lifecycle.
- `learning.enrollment` is Academy course participation, not university enrollment.
- `crm.follow_ups` does not represent university study status or a stable source-event lifecycle.
- Existing consent purposes do not establish future educational contact or marketing permission.

## Candidate dependency and verified rebase

- 0044 is based directly on current 0042 and does not depend on 0043.
- Current 0042 SHA-256: `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea`.
- 0044 SHA-256: `b097f1bae3c8950f5ebf51abe3317d9111d4b9012b389628eb2436f5c8896020`.
- 39 isolated ledger rows, 100 tables and 90 policies.
- Current rebase verified by workflow [44705376689](https://github.com/yvettfang-netizen/phoenix/actions/runs/44705376689): PG16 11/11 and PG17 11/11 PASS.
- Earlier evidence against 0042 SHA `0d4a3de80b56ccb167049a846e17b9b6fc4ef3e152b57aa4600d87367a33cb65` is historical and superseded.

## Candidate decision

- Keep `education.study_enrollments` as immutable SOURCE_REVIEW_REQUIRED records.
- Keep `education.lifecycle_review_occurrences` as immutable REVIEW_REQUIRED candidates.
- Reuse Canonical family, student, institution, program and principal references.
- Enforce current family membership and institution/program consistency.
- Enforce stable source identity with `UNIQUE(source_system, source_review_ref)`.
- Identical source replay returns the existing record; changed source version or payload is a conflict requiring review.
- Keep both tables FORCE RLS with restrictive default-deny policies and no runtime grants.
- No contact, notification, task, project or marketing authority.

## HOLD before active reminders

1. Approved university/program and academic-calendar source authority, including country and transfer/leave rules.
2. Approved long-term service-contact purpose and distinct marketing opt-in text; student majority and guardian/assent handover.
3. Followup ownership, assignment queue, escalation SLA, duplicate and delayed-event policy.
4. Data retention/deletion policy and authoritative transition events for study, contract, payment and project opening.

No contact, notification, task, project or real-data operation is authorized by this review-only candidate.
