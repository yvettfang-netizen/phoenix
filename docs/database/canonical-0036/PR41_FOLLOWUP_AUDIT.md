# PR41 follow-up: effective validity and verification completeness

**Codex technical self-review / independent GitHub review still pending.** The same conversation authored and rechecked this candidate, using Xuanwu inspection/security methods. This is not a Jimson, Founder or independent specialist signature. The approved C-1–C-4 policies and their Founder responsibility are unchanged.

The original candidate5529a99bc37b600132db2028b8bc794238620a66 passed its original8 CI jobs. Additional counterexamples found the following gaps; those old checks did not cover them. The original SQL digest was0a0c3d91ccf5e8ba2a6dc4446646d1f9907410c9618754d89be770281c2527f1. Original before/after commands and results remain privately archived.

| Finding | Severity | Actual original behavior on PG16 and PG17 | Candidate correction |
|---|---|---|---|
| P41-A1 future source contract | Medium | Own retraction accepted even before the contract's valid_from | Start time applies to every operation; expiry/revocation may still permit the same author's access-reducing retraction |
| P41-A2 partner changed during wait | Medium | Controlled partner termination committed while conversion waited on its idempotency lock, yet attribution was accepted | Recheck current context/contract/partner after the wait; recheck scope in the attribution insert trigger; record denial |
| P41-A3 contact expired during wait | Medium | New Lead accepted after its contact's membership expired while waiting | Recheck family/contact/assignee after the wait and at the final attribution boundary; deny without an orphan Lead and audit the refusal |
| P41-A4 infinite validity | Low | Privileged registrar accepted infinity despite the documented bounded interval | Require finite start/end without selecting any real duration or retention term |
| P41-A5 duplicate verification paths | Low | Repeating one path could satisfy count checks while omitting a modified restore script | Require the complete unique path set; negative tests cover duplicates/omission, helper drift and candidate SQL drift |

The first three findings affect temporal eligibility/provenance. A4 requires registrar capability. A5 is an inventory validation gap; branch review/protection was not bypassed. All reproductions used disposable synthetic clusters, not real identities or production. Transaction-start created_at values are not used as proof of physical write order; the concurrency tests explicitly observe the writer waiting, complete revocation, then release the lock.

Only the unmerged, uninstalled0036 candidate and verification files changed. Frozen0001–0035 and the original0035 verifier remain byte-identical. No0037, second authority/master, domain expansion or new runtime grant was introduced. Catalog expectations stay36 migrations/93 tables/83 policies. The new0036 SQL digest is **2c977cb44e3ec01f7ad00d4c0d8f32c5e2cd8e8fd2fed796340a919dfd0b7719**.

## Permanent regression

`boundary-regression.sh` asserts all A1–A4 refusals with separate real app/binder/config LOGINs and one-use tickets, including no orphan data and persisted denial audit. It runs in the normal synthetic suite and again after fresh-cluster restore with independently regenerated passwords. `inventory-regression.ps1` verifies positive controls and three rejection cases before each disposable smoke run. New files and their digests are included in the exact versioned manifest; no open-ended migration-count allowance is added.

PG16/17 fresh,0025→0035→0036 upgrade, repeat/drift/atomicity and new boundary/restore tests have passed. The complete existing F10 and historical three-route HTTP compatibility suites also passed on both versions against the updated SQL digest. The execution evidence records these plus exact-head CI. A previous commit's8/8 does not apply automatically to this update. Current results are in [PR41 checks](https://github.com/yvettfang-netizen/phoenix/pull/41/checks).

Reproduce with the existing commands in [TEST_REPORT.md](TEST_REPORT.md). No generated password/ticket values, raw audit logs, backups or real topology are published. The unchanged required-check names, code-owner review and last-push approval remain in force.

## Remaining gate

The next human gate is a genuine independent review of the updated PR41 commit through GitHub; Jimson614's existing Write eligibility was reverified, but no approval is submitted on their behalf. Merge, persistent installation, Tencent and production remain HOLD. Actual issuer/audience/JWKS, route/source/publication configuration, protected references and applicable privacy/retention evidence remain HOLD. Governance handoff: Founder and the real data-governance reviewer must resolve those runtime facts; no Baihu or other named review is simulated here.
