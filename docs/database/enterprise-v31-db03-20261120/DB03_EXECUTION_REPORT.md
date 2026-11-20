# DB-03 execution — isolated 0044 review foundation

**Verdict: CONDITIONAL local candidate; active long-term followup HOLD.** Founder approved use of 0044 as an isolated Draft number. This report does not claim a formal migration, installed nonproduction database, verified university study source, contact permission or dispatched reminder.

## Fixed source and scope

| Item | Evidence / state |
|---|---|
| Formal authority | `yvettfang-netizen/phoenix/main`, checked baseline `9db147ac3a5d135d50b90bfea5a7316ce747d90b`, migrations 0001–0037 |
| Candidate dependencies | DB-01 [Draft PR #77](https://github.com/yvettfang-netizen/phoenix/pull/77) 0042; DB-02 [Draft PR #78](https://github.com/yvettfang-netizen/phoenix/pull/78) 0043 |
| This package | [Draft PR #79](https://github.com/yvettfang-netizen/phoenix/pull/79), branch `codex/enterprise-v31-db03-study-20261120`; 0044 isolated, not in `migrations/` |
| 0044 SHA-256 | `74cf8bd474cb3253b2b571a96308bf6e5879b0a7bf38126b2ef3bd70c4e152ad` |
| Manifest | [0044 manifest](../../../database/canonical/forward-candidates/study-lifecycle/manifest-0044-study-review.json), requires 0043 SHA-256 `6e043ffdeeb228dac59c605ba763e95f052bdedcdae37b652cba9b6666d18a3a` |

0044 adds `education.study_enrollments` and `education.lifecycle_review_occurrences` as immutable **review-only** records. Their only allowed states are `SOURCE_REVIEW_REQUIRED` and `REVIEW_REQUIRED`. It reuses existing family, student, institution, program and principal identities. Enrollment insertion checks a current family membership and matching program/institution. The occurrence key `(study_enrollment_id, journey_cycle_id, rule_key)` is unique and omits mutable due dates. Both tables have FORCE RLS, restrictive `USING(false) WITH CHECK(false)` policies and no runtime table grant. There is no CRM followup, Service task, notification, contact, delivery or project creation path.

## Reproducible local acceptance

All clusters below were local disposable Docker containers with generated synthetic credentials and data. The script cleans its owned container and fixture directory. It does not connect to Tencent, production or old data.

```text
node database/canonical/verification/v0044/verify-source.mjs
PASS source inventory: 35 historical + byte-exact0036/0037, files=37; isolated combined candidate only, all SQL LF
PASS 0043 source guard sha256=6e043ffdeeb228dac59c605ba763e95f052bdedcdae37b652cba9b6666d18a3a parent=0042 historical=37
PASS 0044 source guard sha256=74cf8bd474cb3253b2b571a96308bf6e5879b0a7bf38126b2ef3bd70c4e152ad parent=0043 historical=37

node database/canonical/verification/v0044/acceptance.mjs 16
RESULT PASS PG16 checks=10
node database/canonical/verification/v0044/acceptance.mjs 17
RESULT PASS PG17 checks=10
```

The complete per-check original structured outputs are [PG16](evidence/pg16/acceptance.json) and [PG17](evidence/pg17/acceptance.json). Both prove fresh install, upgrade, repeat, drift rejection, 40 ledger rows, 104 tables, 94 policies, current-family and program checks, uniqueness, immutable review rows, atomic rollback, two separate restricted LOGIN roles with direct access denied, test-only SELECT still hidden by restrictive FORCE RLS, and zero contact/tasks. The PG16/17 tests do **not** prove active reminders, source approval, consent, dispatch or recovery of 0044 on a fresh cluster. DB-02 separately exercised a fresh-cluster logical restore through 0043.

```text
cd "Phoenix Compass/education compass/server"
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npm test
tests 148; pass 148; fail 0; skipped 0
```

The existing backend suite was run because the candidate depends on its test module and must preserve existing Family/Service behavior. The 0044 SQL does not modify that backend. GitHub CI for the new PR HEAD is recorded separately when complete; local PASS is not a CI claim.

The digest-pinned Gitleaks image scanned the new SQL/manifest, verification scripts, DB-03 docs/evidence and workflow in four offline read-only container runs: `no leaks found` in each. `node --check` on both new `.mjs` files and `git diff --check` also passed.

## HOLD / NOT RUN

| Gate | Status | Missing evidence or contract |
|---|---|---|
| Approved study source and status transitions | HOLD | Authoritative entry/graduation registry, revision authority, dispute handling and academic calendar |
| Future contact and marketing | HOLD | Distinct purpose, notice, student majority/guardian handover, channel, withdrawal and retention; `EDUCATION_CASE` is insufficient |
| HQ review assignment and escalation | HOLD | Owner, staff scope, SLA and fallback without eligible assignee |
| Active lifecycle occurrence revisions | HOLD | Trusted cycle/rule registry, correction event, reschedule and idempotent source replay contract |
| Runtime APIs and E2E | NOT RUN | No table grants, no contact worker or real identity integration in 0044 |
| Merge, nonproduction install, Tencent, production and real data | NOT RUN | Outside isolated Draft approval |

**Next gate:** independent review of fixed 0044 SHA and approval of source, status, contact and owner contracts before a subsequent forward candidate can expose a controlled API or dispatch anything.
