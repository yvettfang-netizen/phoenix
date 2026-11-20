# Phoenix Nova Engineering Delegation Policy — Codex First

**Status:** Founder working rule · effective 2026-11-20  
**Scope:** Phoenix Nova engineering, database, product architecture, testing, documentation and delivery workflows.

## 1. Binding rule

**Codex executes first. Jimson is assigned only work that genuinely requires human/manual execution, a private environment, credentials or permissions unavailable to Codex, or an explicitly human-controlled operational action.**

Do not delegate to Jimson merely because a task concerns PostgreSQL, security, infrastructure or technical review. The task category does not determine the owner; actual tool access and execution capability do.

## 2. Codex-first responsibilities

Codex must independently perform all work it can complete with the repository, connected tools and authorized non-production environments, including:

- GitHub main/branch/PR/commit/CI verification and source diffs;
- formal/candidate migration inventory, SQL source inspection and SHA checks;
- schema, ERD, index, constraint, function, trigger, RLS and GRANT analysis from available source or accessible test database;
- code/API/runtime tracing and dependency analysis;
- design of SQL, tests, fixtures, synthetic data and negative acceptance cases;
- execution of automated tests, CI workflows and PG16/PG17 test jobs where available;
- logs/results collection, evidence matrix, technical reports and PR updates;
- reconciliation of review comments and preparation of the smallest justified implementation proposal.

Codex must not ask Jimson to repeat source inspections, GitHub checks, SQL text analysis, automated tests or documentation that Codex can already perform.

## 3. Jimson exception-only responsibilities

Assign Jimson only a specifically identified action when Codex has established that it cannot complete it. Examples:

- execute a command in a private non-production database/server to which Codex has no authorized connection;
- inspect a database role, secret, network boundary or runtime configuration unavailable through connected tools;
- perform an approved manual backup/restore or recovery drill in the designated non-production environment;
- manually verify a physical/operational condition that cannot be established from code or telemetry;
- provide an authorized human approval or attestation that must legally/operationally come from the system owner.

A Jimson task must state:
1. the exact capability Codex lacks and why;
2. the target environment (must be non-production unless separately authorized);
3. the exact command or manual steps;
4. expected output and evidence format;
5. safety boundary and rollback/stop condition;
6. where to upload the raw result.

Never send credentials, passwords or private keys in a PR comment or task text. Use the approved secret-handling channel.

## 4. Mandatory handoff sequence

1. Codex inspects the source and performs all accessible automated checks.
2. Codex marks each result REUSE / GAP / UNVERIFIED and records source path, SHA, command, environment and output.
3. For each UNVERIFIED item, Codex identifies the specific missing access or manual action.
4. Only those items are sent to Jimson as a concise execution ticket. Do not send a broad request such as "please review the architecture".
5. Jimson returns raw command output, timestamps, environment/version and relevant sanitized logs—not merely a conclusion.
6. Codex verifies and integrates the evidence, updates the matrix and reruns any accessible checks.
7.玄武 independently reviews security-sensitive conclusions where required.
8. Founder decides business policy and approves the next gate.

## 5. Evidence and status rules

- **REUSE:** source and behavior evidence demonstrate the existing capability satisfies the requirement.
- **GAP:** a specific requirement is demonstrably unmet by current source/runtime.
- **UNVERIFIED:** evidence or access is missing; never convert absence of access into proof of absence.
- CI PASS is evidence only for the tests actually run at the exact SHA; it does not establish production installation or business approval.
- A source definition does not prove a live database has installed the object.
- A test design does not prove the test was executed.
- A manual attestation without raw supporting evidence is not a technical verification.

## 6. Current P0.1 application

For Phoenix Academic Studio V2.1:
- Codex owns the primary source audit, SQL/code analysis, test generation/execution where authorized, and evidence report.
- Jimson is not asked to repeat those tasks.
- Jimson is engaged only for exact private non-production checks or manual operations that Codex proves it cannot access.
- Commercial lesson-hour rules remain HOLD; no debit/refund/settlement implementation.
- No migration is authorized by this delegation policy.

**Founder rule: If Codex can do it, Codex does it. Jimson is the exception path for necessary human execution, not a parallel technical analyst.**
