# Founder P0.1 Gate Plan — Contract Closure

**Status:** CODEX SOURCE REVIEW COMPLETE · FOUNDER CONTRACT DECISIONS PENDING  
**Gate:** P0.1 — Identity, Shared Resources and Assessment Contracts  
**Not authorized:** migration authoring/install, production access, payment integration or real learner data.

**Delegation rule:** [Codex First / Jimson Manual Only](../../engineering/CODEX_FIRST_JIMSON_MANUAL_ONLY.md). Codex and the assistant execute all repository, GitHub, SQL/source, API, automated-test and technical documentation work available through connected tools. The assistant also performs the Xuanwu-style security second pass directly. Jimson is exception-only.

## 1. Owners and outputs

| Owner | Work | Required output |
|---|---|---|
| Codex / Assistant | Primary source audit, exact SHA/PR reconciliation, SQL/API/RLS/ACL analysis, automated evidence collection, test generation and execution where available, evidence report and minimum-gap proposal | Source paths, blob SHAs, commands, raw outputs and REUSE/GAP/UNVERIFIED matrix |
| Assistant in Xuanwu role | Direct security second pass: identity threats, RLS/ACL, context lifecycle, revocation, pool reuse, negative tests and evidence integrity | Security findings linked to source evidence; clearly distinguished from human attestation |
| Jimson | Only a specific manual action that requires a private environment, credential/permission, physical operation or human attestation unavailable to Codex/assistant | Exact run result, environment/version, command/steps, timestamp and sanitized raw evidence |
| Founder | Approve unresolved product/commercial rules and next gate | Explicit P0.1 exit decision and, separately, commercial policy approval |

## 2. Completed Codex / Xuanwu work

- Re-fetched current `main`, PR #76, PR #77 and PR #83 heads.
- Inspected formal Canonical identity, auth, consent, learning, education, entitlement and projection migrations.
- Traced current application AuthService, session-family bridge, Canonical family projection, learning catalog, app bootstrap and HTTP routes.
- Re-reviewed PR #77's latest 0042 candidate and its latest CI state; did not rely on an older 21/21 result.
- Completed the source-backed REUSE / GAP / UNVERIFIED matrix.
- Performed the direct Xuanwu-style security pass over Principal-kind conflict, guardian/Consent checks, context-ticket lifecycle, connection-pool cleanup, teacher assignment, student/room scheduling and assessment visibility.
- Confirmed PR #83's prior exact HEAD checks; the new evidence-review commit will trigger its own CI run.

See [P0.1 Technical Evidence Review](P0_1_TECHNICAL_EVIDENCE_REVIEW.md) for exact source fingerprints and findings.

## 3. Work sequence from this point

1. Founder reviews the P0.1 evidence report and confirms the remaining product contracts:
   - one Principal with multiple capabilities, especially Parent/Student + Teacher;
   - Administrator vs Founder authority and whether current SUPERVISOR scope is acceptable;
   - hybrid roster/meeting semantics and timezone/DST policy;
   - six assessment systems' evidence, licensing, review and retention requirements;
   - Canonical-only Student identity and treatment of the legacy application-local Student model.
2. Codex translates the confirmed decisions into the smallest migration impact proposal. Do not allocate a migration number yet.
3. The assistant performs another direct Xuanwu security pass on that proposal.
4. Jimson is not assigned any work now. If later a designated private non-production database/secret/host cannot be accessed by Codex, create one exact manual execution ticket only for that missing action.
5. Founder explicitly approves or rejects the separate minimal Forward Migration proposal.
6. Only after approval may Codex author a candidate SQL migration and run fresh PG16/17, RLS/ACL, concurrency, pool-reuse, revocation, repeat/drift and restore tests.

## 4. Jimson ticket requirements (exception-only)

Every future Jimson assignment must include:
- exact action Codex cannot perform and why;
- named non-production target environment;
- exact command or manual steps;
- expected result and evidence format;
- safety boundary, stop condition and rollback instruction;
- repository path for uploading sanitized evidence.

Do not send secrets or credentials in GitHub comments or task text. Do not send broad "please review architecture" requests.

## 5. Current status

| Item | Status |
|---|---|
| Founder P0 decisions | DECIDED |
| Canonical source audit | COMPLETE |
| Direct Xuanwu-style security second pass | COMPLETE |
| Identity capability contract | GAP identified; Founder contract decision pending |
| Shared resource contract | Existing core reusable; student/room/mode/timezone gaps identified |
| Assessment contract | Existing records reusable; instrument/version/review gaps identified |
| Legacy application Student → Canonical mapping | GAP / runtime state UNVERIFIED |
| PR #77 / 0042 for Academic Studio | HOLD |
| Commercial rules | HOLD |
| Jimson manual-only exceptions | NONE IDENTIFIED |
| Actual private non-production installed schema / grants | UNVERIFIED; not needed to finish this source-contract review |
| Minimal Forward Migration approval | NOT GRANTED |

## 6. Exit criteria

- Founder confirms the remaining product/authority/assessment/resource contracts.
- Each proposed migration object is justified by a proven gap.
- No duplicate Principal, session, ticket or context system is introduced.
- Commercial rules remain HOLD and excluded from implementation.
- PG16/17 test evidence or a precise UNVERIFIED reason is complete.
- Assistant security second pass is recorded.
- Founder explicitly approves the next gate.

**P0.1 source review is complete; P0.1 product/contract closure is not. No SQL is authorized, installed, merged or deployed.**
