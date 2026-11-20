# Phoenix Academic Studio V2.1 — P0.1 actual technical review

**Verdict: HOLD for the P0.1 exit gate.** This is a source, database-behavior and security review, not a migration, deployment or acceptance of the six preview pages as live business functions. Review baseline: `phoenix/main@9db147ac3a5d135d50b90bfea5a7316ce747d90b`, Draft [PR #83](https://github.com/yvettfang-netizen/phoenix/pull/83) `80cbf0d98b346f12587568689196e07a8f6e481e`, Draft [PR #76](https://github.com/yvettfang-netizen/phoenix/pull/76) `78f3716f31403907b6ab254a86cf6df888e5ebfe`, Draft [PR #77](https://github.com/yvettfang-netizen/phoenix/pull/77) `380fec99da5151fd28b8a5d3a2acaaa7292d3c23`. The exact GitHub and source-hash output is [`baseline-raw.log`](p01-evidence/baseline-raw.log).

The review began on PR #83 `1b9b9358…`. PR #83 advanced to `80cbf0d9…` during execution. The only changed paths were `P0_1_GATE_PLAN.md` and `CODEX_FIRST_JIMSON_MANUAL_ONLY.md`; the new text directs the assistant to perform the Xuanwu security pass directly. Formal SQL, application code, the three P0.1 contracts and probe inputs did not change. The isolated worktree was fast-forwarded and the final PG16/17 behavior probes ran against `80cbf0d9…`.

## 1. What was actually executed

| Check | Actual outcome | Evidence |
| --- | --- | --- |
| Exact source and SHA | main and PR #76/#77/#83 recorded; 37 formal SQL files. PR #77's current 0042 blob SHA-256 is `1bd86f098a8382d943da109ad05d226ee8edcfe1e75d8161983a86b9ce02d75e`. | [`capture-baseline.ps1`](p01-evidence/capture-baseline.ps1), [`baseline-raw.log`](p01-evidence/baseline-raw.log) |
| Exact-head GitHub CI | PR #76 24/24 PASS; PR #83 `80cbf0d9…` 24/24 PASS; PR #77 `380fec99…` 19 PASS / 2 FAIL. These jobs do not contain the P0.1 membership-expiry and room/student-overlap probes. | [`baseline-raw.log`](p01-evidence/baseline-raw.log), [PR #83 checks](https://github.com/yvettfang-netizen/phoenix/pull/83/checks) |
| Existing source-manifest verifier | `node database/canonical/verification/v0037/verify-source.mjs` confirmed the historical 35 hashes plus byte-exact 0036/0037, 37 SQL files and LF text. | [`source-inventory-raw.log`](p01-evidence/source-inventory-raw.log) |
| Source/API tracing | 0003/0007/0008/0009/0012/0018/0019/0022/0037, the Academy contracts, server `/v1/learning/catalog` and PR #77 0042 were inspected. | [`capture-source.ps1`](p01-evidence/capture-source.ps1), [`source-raw.log`](p01-evidence/source-raw.log) |
| PG16 fresh and repeat | 37 applied, then 37 checksum skips; ledger SHA-256 equals all 37 source files. Server `160015`. | [`pg16-raw.log`](p01-evidence/pg16-raw.log) |
| PG17 fresh and repeat | Same; server `170011`. | [`pg17-raw.log`](p01-evidence/pg17-raw.log) |
| RLS/ACL | 14/14 Learning tables FORCE RLS. Separate reader LOGIN cannot SELECT `learning.teacher`; can execute public catalog; cannot execute internal teacher-scope helper. | Both PG raw logs |
| Jimson read-only query syntax | The exact [`nonprod-readonly-preflight.sql`](p01-evidence/nonprod-readonly-preflight.sql) ran successfully under a separate, non-superuser reader LOGIN on PG16 and PG17. This validates the query, not the named nonproduction environment. | Both PG raw logs |
| One-use session path | Separate real binder/app LOGINs issued and redeemed a ticket; `clear_context()` made the same-backend subsequent read return zero. | Both PG raw logs |
| Guardian, Consent, teacher assignment | Published card: authorized parent 1 → 0 after Consent withdrawal; assigned teacher 1 → 0 after assignment revocation. | Both PG raw logs |
| Student + Parent on one Principal | The same FAMILY Principal read its own Student card and its verified child's card: 1 + 1 on both versions. After child Consent withdrawal, child = 0 while self = 1. This tests database reads, not login navigation. | Both PG raw logs |
| Post-bind family membership expiry | **FAIL:** published-card read 1 → **1** on the same app backend after membership ended. | Both PG raw logs, [security second pass](P0_1_SECURITY_SECOND_PASS.md) |
| Scheduling | Teacher overlap denied. Same room with two teachers accepted; same student in two simultaneously scheduled classes accepted. | Both PG raw logs |
| Principal kind | Second TEACHER Principal for the same FAMILY Person rejected by unique constraint. | Both PG raw logs |
| Cleanup | Both labelled containers and protected temporary credential files removed. No host port was opened; containers used `--network none`. | Both PG raw logs |
| Evidence safety scan | Pinned Gitleaks v8.30.1 scanned the P0 package before push: `no leaks found`. | [`gitleaks-local.log`](p01-evidence/gitleaks-local.log) |

Execution commands were `node --check docs/architecture/academic-studio-v21-p0-20261120/p01-evidence/verify-pg.mjs` and `node .../verify-pg.mjs 16|17`, plus the two capture scripts. The exact [probe source](p01-evidence/verify-pg.mjs) creates only disposable synthetic fixtures and records unmodified command outputs. Generated passwords and ticket values are never placed in command arguments or logs.
The evidence files are pinned by [`SHA256SUMS.txt`](p01-evidence/SHA256SUMS.txt).

## 2. Identity and authorization finding

[`0003_core_consent_access.sql`](../../../database/canonical/migrations/0003_core_consent_access.sql) establishes one `auth.principals.person_id` per Person; [`0022_learning_core.sql`](../../../database/canonical/migrations/0022_learning_core.sql) adds TEACHER/SUPERVISOR kinds but retains a single `principal_kind`. A synthetic student who was also a verified guardian used one FAMILY Principal to read its own and its child's published cards. There is **no implemented trusted Academy capability resolver or Student-default/explicit-Parent-switch route** in the reviewed server. The existing `/v1/learning/catalog` is a default-off published-course read, not a login router.

The separate binder/app ticket, current context and `clear_context()` mechanism is usable; no second session/ticket/context table is justified for this P0.1 purpose. Consent and teacher-assignment revocation work on the tested read. **Family membership expiry does not:** the current `learning.can_read_sensitive()` rechecks guardian authority and Consent but omits a fresh family-membership check after binding. This is a proven next-read denial defect, not merely missing documentation. The assistant security pass is in [`P0_1_SECURITY_SECOND_PASS.md`](P0_1_SECURITY_SECOND_PASS.md); it is not a separate human signature.

An actor who is both FAMILY and TEACHER cannot be represented as two Principals for the same Person. Before any capability implementation, define how the one Principal obtains scoped teacher capability without duplicating a natural person, weakening the family authority checks or copying PR #77's workspace session architecture. `SUPERVISOR` exists as a Principal kind, but an Academy-specific, narrowly scoped teaching-admin grant and UI authorization were not established by this test.

## 3. Shared resources and assessment finding

`learning.teacher`, `class`, `enrollment`, `enrollment_class`, `schedule_slot`, `attendance_record` and publication/report functions exist and installed in both clusters. Teacher identity is a shared `core.people` FK. The GiST exclusion on `schedule_slot` enforces teacher overlap. `room_label` is free text; no stable room FK or room overlap constraint exists. There is no per-student slot reservation or collision constraint. `learning.place_enrollment_in_class()` locks the class before counting seats, but the **concurrent last-seat acceptance is not yet tested**. None of these source facts authorizes a regional teaching tenant or a second student master.

`education.score_record`, `education.language_test` and `learning.stage_report` are generic facts and narrative reports. Formal 0001–0037 has no approved CAT4/DSE/A-Level/IELTS/JLPT/Cantonese instrument edition, original-scale schema, examiner/review authority, retraction model or governed longitudinal assessment projection. A single numeric average across these instruments is prohibited by the Founder decision. `education.study_enrollments` is absent and must not be confused with `learning.enrollment`.

## 4. PR #77 / 0042 disposition

Current 0042 is a **Draft forward candidate**, not a formal migration. It creates `auth.workspace_sessions` and new workspace ticket/context functions. That conflicts with the Founder P0.1 decision to reuse the existing Canonical session mechanism and avoid a multi-company Academy tenant model. PR #77's exact-head PG16 and PG17 `workspace-authorization` jobs are **FAIL**, with SQL syntax error near `ELSE`; the [raw failed output](p01-evidence/pr77-failed-raw.log) and [Actions run](https://github.com/yvettfang-netizen/phoenix/actions/runs/44708668551) are separate from P0.1 test results. Do not install 0042 or import its session model into Academy.

## 5. Minimal next implementation boundary — proposal only

1. **Security first:** a new, separately reviewed forward change should make family-scoped Learning reads recheck current actor membership on every request. Audit sibling read helpers for the same weakness and add a same-backend post-revocation negative test. No historical SQL edits.
2. **Identity/API:** resolve Student, Parent, Teacher and Admin capabilities from existing Principal, Person, Student, family/guardian/Consent and assignment facts on the trusted server; specify default Student navigation and explicit Parent switching. If a single Principal cannot carry a needed cross-kind capability, propose only the minimal additive capability structure after compatibility and RLS review.
3. **Resources:** design globally shared room identity and per-student slot booking; enforce teacher/student/room overlap under concurrency and test last-seat races, timezone boundaries and pool reuse. Reuse the existing teacher and class identity.
4. **Assessments:** design six versioned instrument/scale contracts and provenance-bearing attempts, reviewer publication and retraction, then a read projection for one growth timeline. Preserve original scales; no conversion rules are approved.
5. **Commercial:** maintain separate HOLD. The existing [decision packet](P0_1_COMMERCIAL_OPTIONS_HOLD.md) contains alternatives, not a selected lesson-hour, refund, payment or teacher-settlement policy.

No migration number, SQL file, new database or live API is approved by this report. Future candidates require a fresh formal/candidate number scan, exact DDL/RLS/ACL review, PG16/17 fresh/upgrade/negative/concurrency/restore tests, and Founder approval.

## 6. Remaining evidence and exit gate

| Item | Status | Exact remaining evidence |
| --- | --- | --- |
| PR #83 exact-head CI | **PASS: 24/24** | [`baseline-raw.log`](p01-evidence/baseline-raw.log) fixes head `80cbf0d9…`. Recheck if the PR head changes; generic CI success does not close the P0.1 defects. |
| Academy Student/Parent route, teacher/admin UI, six assessment APIs | **GAP / NOT RUN** | Implemented trusted backend and real synthetic HTTP→DB negative tests after approved design. Static previews do not count. |
| Named nonproduction Canonical installation | **UNVERIFIED** | Only the narrow [Jimson read-only runtime ticket](P0_1_JIMSON_NONPROD_TICKET.md), if the target and least-privilege profile are available. This does not authorize installing a candidate. |
| Real identity provider, real student/guardian evidence, commercial authority | **HOLD** | Controlled factual and Founder policy evidence. No real student data requested for this review. |
| Independent human security signature, if required | **UNVERIFIED** | This assistant performed the required Xuanwu-role second pass; no separate human/credential attestation is claimed. |

**P0.1 exit recommendation: HOLD** until the membership revocation defect has a reviewed forward fix and negative tests, the Student/Parent capability contract is implementable without a duplicate identity/session system, room/student scheduling conflicts are addressed, and assessment governance is approved. P0 static page previews remain design artifacts. Production, Tencent upgrade, real data, commercial SQL, merge and deployment were not performed.
