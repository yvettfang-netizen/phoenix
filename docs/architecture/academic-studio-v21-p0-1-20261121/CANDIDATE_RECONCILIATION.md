# P0.1 Existing Candidate Reconciliation — before SQL authoring

**Reviewed:** 2026-11-21  
**Current main:** `291032fef622ada0265ef131d6b364c04718d1a8`  
**Founder-approved design:** PR #90 merged at that commit.  
**Purpose:** prevent duplicate schema work and unsafe migration-number allocation.

## 1. Candidate inventory

| Proposed number | Existing owner / PR | Candidate scope | P0.1 decision |
|---|---|---|---|
| 0038 | PR #59 | Service Project Workbench | Reserved candidate; do not reuse or copy |
| 0039 | PR #59 | Service Project Summary | Reserved candidate; do not reuse or copy |
| 0040 | PR #61 | HK Identity Workbench | Reserved by prior candidate contract; verify current branch/manifest before any numbering |
| 0041 | PR #74 | Education Compass questionnaire/report artifact workflow in separate `education_compass` schema | Not the six standardized assessment score model. Keep separate and unmerged; do not duplicate its questionnaire answers/report payload in Academy score tables. |
| 0042 | PR #77 | Organization/workspace authorization and persistent workspace sessions | HOLD for Academic Studio; no dependency |
| 0043 | No active candidate found in current main tree / reviewed open PR list | None identified | Do not allocate until full repository/branch scan confirms |
| 0044 | PR #82 | Study review foundation | Separate study lifecycle proposal; not Academy course enrollment |
| 0045 | PR #89 | Live family membership recheck in `learning.can_read_sensitive()` | Relevant S1 security fix; candidate only, base is stale and one CI guard fails. Reconcile/rebase or incorporate its exact intended live-membership invariant into the P0.1 identity candidate; do not install both. |

The formal directory on current main contains 0001–0037. The candidate numbers above are not installed migrations. This table is a collision inventory, not a number reservation.

## 2. PR #89 — S1 candidate details

- Candidate SQL SHA-256: `2fb5a438d16118367ce8392134a80244d29717e25416052b482d74ad0591d41c`.
- It changes only `learning.can_read_sensitive(uuid,uuid,uuid)`.
- It adds a live `core.family_memberships` check on the FAMILY guardian-to-child branch using `clock_timestamp()`.
- It preserves Student self-read, Guardian Authority, Learning Consent, STAFF branches, signature, SECURITY DEFINER, VOLATILE, search_path, owner and ACL.
- Exact PR #89 HEAD: `a17fc176f27c1f3cdbf2ba434b8fbe2187d3ce13`, base: `02ffcdcf2c80d3d63ef737b2b9ff176bd5c3d5ab` (stale relative to current main).
- CI snapshot: 18/19 passed, one `no-parallel-database` failure. Job log shows the guard rejects a read-only SQL file placed under `docs/architecture/.../p01-evidence/`; this is a path-policy failure, not a database test failure.
- Candidate test harness claims PG16/17 same-backend next-request membership revocation tests. The candidate's own runtime ticket remains a read-only private non-production check; it does not authorize installation.

**P0.1 treatment:** preserve the live membership invariant in the new protected-read design. Do not simply assume this candidate is merged or installed. Do not send Jimson the code/CI failure; Codex can fix path and rebase/source reconciliation. Jimson is only needed for the named private non-production transaction-boundary receipt if the deployment environment is inaccessible to Codex.

## 3. PR #74 — questionnaire/report candidate is a different domain

PR #74 candidate 0041 creates schema `education_compass` with questionnaire banks, purpose evidence, questionnaire attempts, report artifacts, opaque order references and separate owner/app/publisher/settlement roles. It is a product-specific questionnaire/report flow, not a registry for CAT4, DSE, A-Level, IELTS, JLPT or Cantonese standardized scores.

P0.1 must not:
- reuse its questionnaire answer JSON as standardized test scores;
- copy proprietary report binaries or raw answers into the new score tables;
- add another Student or login identity;
- silently merge the separate report-product commercial model into the Academy lesson-hour model.

The standardized assessment attempt/result proposal is a distinct subject-owned fact model. The PR #74 candidate remains unmerged and must be separately reconciled with the current Canonical-only product architecture before any future activation.

## 4. Candidate authoring rules

1. No numeric migration number is allocated in this PR.
2. Candidate SQL stays in an unnumbered directory under `database/canonical/forward-candidates/academic-studio/`.
3. Disposable test harness applies formal 0001–0037 and then candidate files in a declared deterministic order; it does not alter the formal ledger.
4. Before promotion, Codex must scan current main and all open candidate branches/manifests again.
5. Formal 0001–0037 bytes remain unchanged.
6. Do not install 0045 separately if the P0.1 identity candidate includes the same function repair.
7. Do not include any of PR #74's questionnaire/order/report artifacts in the Academy standardized assessment candidate.
8. No shared non-production installation or production action is authorized by the P0.1 design approval.

## 5. Current next implementation order

- Package A: identity/context + live membership revocation + subject-scoped Consent + Admin/Founder grant.
- Package B: teacher-controlled scheduling resources, student slot reservation and room constraints.
- Package C: subject-owned standardized assessment attempt/result/event records, excluding the PR #74 questionnaire/report domain.
- Each package remains a separate candidate and requires exact-source, PG16/17, RLS/ACL, negative, concurrency, rollback and restore evidence.
