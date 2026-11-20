# Founder P0.1 Gate Plan — Contract Closure

**Status:** READY FOR CODEX-FIRST EXECUTION · Founder decisions recorded  
**Gate:** P0.1 — Identity, Shared Resources and Assessment Contracts  
**Not authorized:** migration authoring/install, production access, payment integration or real learner data.

**Delegation rule:** [Codex First / Jimson Manual Only](../../engineering/CODEX_FIRST_JIMSON_MANUAL_ONLY.md). Codex performs every source, GitHub, SQL-analysis, automated-test and documentation task it can. Jimson is assigned only specific manual actions requiring access or execution Codex does not have.

## 1. Owners and outputs

| Owner | Work | Required output |
|---|---|---|
| Codex / Assistant | Directly execute all repository, GitHub, SQL/source, API, automated-test, evidence collection and technical documentation work available through connected tools | Reproducible source paths, hashes, commands, raw outputs, REUSE/GAP/UNVERIFIED matrix |
| Jimson | Exception-only manual execution in an authorized non-production environment or privileged operational checks unavailable to Codex | Exact execution ticket result with environment/version, command/steps, timestamp and sanitized raw evidence |
| Assistant in Xuanwu role | Directly perform the security-focused second pass: identity threats, RLS/ACL, context lifecycle, revocation, pool reuse, negative tests and evidence integrity | Security findings linked to raw evidence; clearly distinguish model review from any separately required human attestation |
| Founder | Approve unresolved product/commercial rules and next gate | Explicit P0.1 exit decision and, separately, commercial policy approval |

## 2. Work sequence

1. Codex re-fetches current `main`, PR #76, PR #77 and PR #83 heads. If any head differs from the captured baseline, refresh evidence and re-review changed paths before relying on previous findings.
2. Codex reviews `P0_1_IDENTITY_CONTRACT.md`, `P0_1_SHARED_RESOURCE_CONTRACT.md` and `P0_1_ASSESSMENT_CONTRACT.md`; traces actual code, SQL, API and runtime behavior accessible through connected tools.
3. Codex executes all available source checks and automated tests, including PG16/17 jobs where authorized test infrastructure is available. Record exact SHA, command, environment and output.
4. Codex completes `P0_1_MIGRATION_IMPACT_AND_NEGATIVE_TESTS.md` with source evidence and marks each item REUSE / GAP / UNVERIFIED.
5. For each remaining UNVERIFIED item, Codex must state the exact missing capability/access and decide whether it genuinely requires Jimson. Only then create a narrow Jimson manual execution ticket. Do not ask Jimson to repeat Codex-accessible work.
6. Jimson executes only those tickets in the named non-production environment and returns raw sanitized evidence. If the access or environment is unavailable, leave the item UNVERIFIED.
7. The assistant verifies any Jimson manual evidence, integrates it, updates the report and reruns all checks available through connected tools. The assistant also performs the Xuanwu security-review pass directly; do not route that analysis through Jimson.
8. Keep `P0_1_COMMERCIAL_OPTIONS_HOLD.md` separate. Codex may prepare alternatives and consequences; no implementation or policy default is authorized.
9. Submit the P0.1 review report with all unresolved decisions, no SQL changes, and a recommended minimal migration boundary.
10. Return to Founder for explicit approval to draft a separate forward migration.

## 3. Jimson ticket requirements

Every Jimson assignment must include:
- exact action Codex cannot perform and why;
- named non-production target environment;
- exact command or manual steps;
- expected result and evidence format;
- safety boundary, stop condition and rollback instruction;
- repository path for uploading the sanitized evidence.

Do not send secrets or credentials in GitHub comments or task text. No broad "please review architecture" requests.

## 4. Exit criteria

- Identity default and Parent switch behavior mapped to actual server-side capability checks.
- No duplicate session/ticket/context model.
- Teaching resources use one shared identity and globally coordinated availability.
- Every required room/student/teacher collision has a concurrency-safe implementation path.
- Six assessment systems have separate score contracts and a governed timeline projection.
- Commercial rules remain HOLD and excluded from all implementation scope.
- Every migration object is justified by a proven gap, and PG16/17 test evidence or explicit UNVERIFIED reason is complete.
- Codex's evidence report is complete; any Jimson manual evidence is attached only where required; Xuanwu security review is recorded.
- Founder explicitly approves the next gate.

## 5. Status tracking

| Item | Status |
|---|---|
| Founder decisions | DECIDED |
| Identity contract draft | PROPOSED |
| Shared resource contract draft | PROPOSED |
| Assessment contract draft | PROPOSED |
| Commercial decision packet | HOLD |
| Migration impact / negative matrix | PROPOSED |
| Codex source and automated evidence review | PENDING |
| Jimson manual-only exceptions | NOT YET IDENTIFIED |
| Xuanwu independent security review | PENDING |
| Minimal Forward Migration approval | NOT GRANTED |

**Do not interpret preparation of documents, CI PASS or a manual test plan as P0.1 acceptance or migration approval.**
