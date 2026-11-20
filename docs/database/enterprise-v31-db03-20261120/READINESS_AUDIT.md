# DB-03 readiness audit — university study and long-term followup

**Status: CONDITIONAL isolated schema candidate / HOLD active lifecycle.** Founder approved 0044 as an isolated number on 2026-11-20. It is stacked after DB-01 [PR #77](https://github.com/yvettfang-netizen/phoenix/pull/77) and DB-02 [PR #78](https://github.com/yvettfang-netizen/phoenix/pull/78). It is not a formal migration or installed nonproduction capability. No real student or contact data was read.

## Checked source

- The mainline under `database/canonical/migrations/` formally ends at 0037 in baseline `9db147ac3a5d135d50b90bfea5a7316ce747d90b`; 0042/0043 are isolated Draft candidates in the parent branches. 0038–0041 are reserved elsewhere.
- The disposable PG16/17 catalog in the DB-02 evidence package records 102 tables and **no** `education.study_enrollments` or lifecycle occurrence table. It is a synthetic cluster observation, not proof of nonproduction installation.
- `core.student_profiles.person_id` is a PK/FK to `core.people`; the student identity is already unique.
- `education.academic_record` records level, school name, optional graduation date and evidence document, but no actual university entry, expected graduation revision, calendar or transfer/leave state.
- `learning.enrollment` is an Academy course enrollment; it is not a university enrollment.
- `crm.follow_ups` supports LEAD/DEAL/CLIENT target only, a non-null assigned principal, `PENDING/COMPLETED/CANCELLED`, due time and a title. It has no study enrollment/rule/occurrence key, no due-date revision history and no HQ unassigned review queue.
- `consent.grants.purpose` in the formal 0003 schema is limited to `DOCUMENT_READ`, `EDUCATION_CASE`, `IDENTITY_CASE`. Existing consent does **not** express a future `EDUCATION_FOLLOW_UP` contact or marketing purpose.
- Draft PR #76 contains a pure `student-lifecycle/planner.ts` with `PLAN_ONLY_NOT_CONNECTED`, 16 reported tests and a stable key `lifecycle.v1:{studyEnrollmentId}:{journeyCycleId}:{ruleKey}`. It has no runtime route, worker or database persistence. This package does not copy or silently activate it.

## Reuse → gap → candidate

| Existing | Reuse | Gap | Proposed separate DB-03 object / action |
|---|---|---|---|
| `core.people`, `core.student_profiles`, `core.families` | Canonical student and family FK | None | No new person/student master |
| `education.academic_record`, `education.institution`, `education.program`, `docs.documents` | Evidence and reviewed institution/program references | Actual in-study dates and source revision | 0044 stores only `SOURCE_REVIEW_REQUIRED` enrollment candidates; no runtime grant or verified status |
| `crm.clients`, `crm.follow_ups` | Existing client and followup business task | No stable lifecycle key or HQ queue; non-null assignee | 0044 stores only immutable `REVIEW_REQUIRED` occurrences; no actionable followup FK or assignment |
| `consent.grants`, guardian/capacity state | Existing education/document permission | Future contact and marketing basis absent | Distinct approved purpose/authority contract before dispatch |
| `service.projects`, `service.tasks` | Signed successor delivery | Interest is not a contract | New Service Project only after separate signed/opened event |

## Safe implementation boundary

The isolated [0044 SQL candidate](../../../database/canonical/forward-candidates/study-lifecycle/0044_study_review_foundation.sql) establishes review-only study and stable occurrence storage with no runtime table grants or RLS allow policy. It cannot automatically send, contact, assign or create a project. The immutable occurrence has a unique `(study_enrollment_id, journey_cycle_id, rule_key)` key; a changed due date cannot create a second occurrence for that key. Authorized correction, rescheduling and active dispatch still require a later forward contract and migration. An executor must recheck current student, guardian, Consent, organization and recipient scope before any future action.

## Specific required decisions before active reminders

1. Which registry or document is authoritative for actual entry, degree level, institution/program, academic calendar, transfer/leave and expected graduation? Include validation, dispute and correction process.
2. Approve distinct educational service followup versus marketing contact purposes, notice/withdrawal text, student majority and guardian-to-student handover, delivery channels and retention.
3. Define HQ review owner, assignment authority, escalation SLA, permitted recipient Staff roles and fallback if no eligible assignee exists.
4. Define source version, journey cycle creation authority, rule registry and jurisdiction/calendar offsets; a planner output alone is not a business fact.
5. Before promotion, reconcile 0038–0043 candidate dependencies with current main and independently review 0044. Number approval is only for this isolated Draft candidate.

**No queue, contact, notification, runtime grant or production change is made by 0044.** Local PG16/17 structural acceptance is recorded in [the execution report](DB03_EXECUTION_REPORT.md); active lifecycle remains HOLD.
