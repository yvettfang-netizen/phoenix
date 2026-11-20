# Founder P0.1 Gate Plan — Contract Closure

**Status:** READY FOR CODEX/JIMSON REVIEW · Founder decision already recorded  
**Gate:** P0.1 — Identity, Shared Resources and Assessment Contracts  
**Not authorized:** migration authoring/install, production access, payment integration or real learner data.

## 1. Owners and outputs

| Owner | Work | Required output |
|---|---|---|
| Codex | Reconcile P0 decisions with exact current main/PR heads; prepare contract package | source-anchored P0.1 documents, no invented implementation |
| Jimson | Canonical schema/API/RLS/ACL review; non-production feasibility and gap validation | signed review table: REUSE / GAP / UNVERIFIED per object and function |
| Founder | Approve unresolved product and policy choices | explicit P0.1 exit decision and, separately, commercial policy approval |

## 2. Work sequence

1. Re-fetch current `main`, PR #76, PR #77 and PR #83 heads. If any head differs from the captured baseline, refresh evidence and re-review changed paths before relying on previous findings.
2. Review `P0_1_IDENTITY_CONTRACT.md`; resolve trusted identity claims, student default, parent switch, administrator capability and pool lifecycle.
3. Review `P0_1_SHARED_RESOURCE_CONTRACT.md`; confirm room inventory, hybrid semantics, timezone and buffer rules.
4. Review `P0_1_ASSESSMENT_CONTRACT.md`; confirm instrument field contracts, assessor authority, evidence, visibility and retention.
5. Keep `P0_1_COMMERCIAL_OPTIONS_HOLD.md` separate. Gather choices only; no implementation.
6. Complete `P0_1_MIGRATION_IMPACT_AND_NEGATIVE_TESTS.md` with Jimson's exact source/schema evidence.
7. Submit a P0.1 review report with all unresolved decisions, no SQL changes, and a recommended minimal migration boundary.
8. Return to Founder for explicit approval to draft a separate forward migration.

## 3. Exit criteria

- Identity default and parent switch behavior mapped to actual server-side capability checks.
- No duplicate session/ticket/context model.
- Teaching resources use one shared identity and globally coordinated availability.
- Every required room/student/teacher collision has a concurrency-safe implementation path.
- Six assessment systems have separate score contracts and a governed timeline projection.
- Commercial rules remain HOLD and excluded from all implementation scope.
- Every migration object is justified by a proven gap, and PG16/17 test design is complete.
- Jimson's review is attached and Founder explicitly approves the next gate.

## 4. Status tracking

| Item | Status |
|---|---|
| Founder decisions | DECIDED |
| Identity contract draft | PROPOSED |
| Shared resource contract draft | PROPOSED |
| Assessment contract draft | PROPOSED |
| Commercial decision packet | HOLD |
| Migration impact / negative matrix | PROPOSED |
| Jimson review | PENDING |
| Minimal Forward Migration approval | NOT GRANTED |

**Do not interpret the preparation of these documents as P0.1 acceptance or migration approval.**
