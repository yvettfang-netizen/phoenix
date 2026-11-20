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
- Current 0042 SHA-256: `9fdfef2a566eaa73fec98405e0d5d1ac5ea066c6319b0c2a5111482275562991`.
- Updated 0044 SHA-256: `026c400325d1edeedb9f66e431f8cf79de3bbb8da2a5a2e6bebdf66a2548b4e0`.
- 39 isolated ledger rows, 100 tables and 90 policies.
- Updated rebase verified locally on PG16 12/12 and PG17 12/12; exact `77d8026` GitHub Actions [44721181075](https://github.com/yvettfang-netizen/phoenix/actions/runs/44721181075) also passed source/backend and both database jobs. [PG16 receipt](evidence/PG16_0044_REBASE_20261120.json), [PG17 receipt](evidence/PG17_0044_REBASE_20261120.json), [CI receipt](evidence/CURRENT_PG16_PG17_RESULT.json).
- Earlier CI evidence against 0042 SHAs `0d4a3de80b56ccb167049a846e17b9b6fc4ef3e152b57aa4600d87367a33cb65` and `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea` is historical and superseded.

## Candidate decision

- Keep `education.study_enrollments` as immutable SOURCE_REVIEW_REQUIRED records.
- Keep `education.lifecycle_review_occurrences` as immutable REVIEW_REQUIRED candidates.
- Reuse Canonical family, student, institution, program and principal references.
- Enforce current family membership and institution/program consistency.
- Enforce stable source identity with `UNIQUE(source_system, source_review_ref)`.
- Identical source replay returns the existing record; changed source version or payload is a conflict requiring review.
- Identical occurrence replay returns the original row; a changed due date requires source review without changing the original occurrence.
- Keep both tables FORCE RLS with restrictive default-deny policies and no runtime grants.
- No contact, notification, task, project or marketing authority.

## HOLD before active reminders

1. Approved university/program and academic-calendar source authority, including country and transfer/leave rules.
2. Approved long-term service-contact purpose and distinct marketing opt-in text; student majority and guardian/assent handover.
3. Followup ownership, assignment queue, escalation SLA, duplicate and delayed-event policy.
4. Data retention/deletion policy and authoritative transition events for study, contract, payment and project opening.

No contact, notification, task, project or real-data operation is authorized by this review-only candidate.
