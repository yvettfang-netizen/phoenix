# P0 Independent Review Pack — Service Project Workbench / 0038

Status: REVIEW INPUT ONLY / HOLD. This packet organizes evidence for independent engineering, security, data-governance and business review. It is not an approval, signature, migration authorization, merge authorization or production-readiness claim. Codex must not sign for the responsible reviewer or Founder.

Scope reviewed:

- PR #59 Service Project Workbench V1, candidate inspected at 3ceac97abe5503583e5cc179b98293814d1e1b4d.
- Candidate SQL: database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql.
- Supporting P0 candidates: PR #55 (0036/0037 session BFF), PR #57 (Family Center V2), PR #58 (failure/recovery drills). These are stacked, unmerged candidates and must be rechecked at their exact current HEADs before promotion.
- Evidence: docs/database/service-project-workbench-v1/{AUDIT.md,DATA_CONTRACT.md,PERMISSIONS.md,EXECUTION_REPORT.md,ROLLBACK.md,FOUNDER_GATE.md}, plus docs/database/family-center-v2-20261105/{SCHEMA_API_GAP_AUDIT.md,PROJECTED_API_CONTRACT.md,ACCEPTANCE_AND_ROLLBACK.md,drills/FAMILY_CENTER_FINAL_RELEASE_GATE.md,drills/FAMILY_CENTER_FAILURE_DRILL_MATRIX.md}.

## 1. Candidate and migration boundary

The 0038 file is a forward candidate outside the active migration manifest. It declares seven workbench extension/reference tables and seven RLS policies; it does not create a second Person, Family, Student, Principal, Client, Project, Contract or Payment master. Existing 0001–0037 bytes are intended to remain unchanged. Recorded candidate SHA-256: 4b82dc15b86b5936258a3d32a1b91ccbaf756e8ca76cd11a609bb6373c934ecf.

The extension tables are:

- service.workbench_settings: template, stage, service scope, retention-until and optimistic revision.
- service.workbench_events: immutable command receipts, actor/subject/audience, payload digest and idempotency key.
- service.workbench_commercial_events: immutable references to the separate phoenix_operations source.
- service.workbench_applications: project association to existing education applications, institutions and programmes.
- service.workbench_materials: document-version review metadata.
- service.workbench_task_scope: subject/audience association for existing tasks.
- service.workbench_messages: bounded project communication.

The implementation reuses service.projects, service.project_subjects, service.project_assignments, service.tasks, service.project_milestones, service.deliverables, education.applications, docs.documents and existing auth/core/consent authorities. The independent reviewer must confirm every foreign key still points to the intended canonical master after stack synchronization; no source document may infer acceptance merely from a successful local migration.

## 2. Permission and identity review

Intended trust chain:

same-origin Family UI → BFF → loopback trusted API → binder LOGIN ticket → separate app LOGIN → SECURITY DEFINER function → subject-scoped projection.

Relevant implementation:

- Phoenix Compass/education compass/server/src/services/service-workbench.ts: createServiceWorkbench, resolve, assertCurrent, binder/app pool separation, one-use context ticket, connection cleanup and command routing.
- website/phoenix-nova-website-v5/lib/service-workbench-bff.ts: loopback/development-only gate, opaque HttpOnly synthetic session, header/origin rejection, bounded request/response and DTO allowlist.
- database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql: service.workbench_staff, workbench_subject, workbench_can_read, workbench_writer, workbench_snapshot, workbench_command, RLS policies and protected-history triggers.
- docs/database/service-project-workbench-v1/PERMISSIONS.md: candidate role matrix and SQL-role constraints.

The independent reviewer must verify with real PostgreSQL credentials and the exact candidate tree:

1. A browser cannot submit customer_id, family_id, project_id, principal, role or channel to obtain authority.
2. Current family, principal, actor, channel, project assignment, subject membership, Consent/guardian authority and validity windows are checked server-side.
3. A family member does not automatically receive another adult’s project or subject records. Same-family sibling access remains denied without explicit subject scope.
4. Adviser access is assignment- and Consent-scoped; manager privileges do not create a global family bypass. Observer/read-only principals cannot borrow client upload/message paths.
5. Expired or revoked session, assignment, Consent, subject authorization or provider mapping fails closed before data is returned; the post-commit live-session check remains required.
6. Binder credentials cannot read application tables, set binder role from the app connection, bypass RLS or issue arbitrary tickets. App credentials cannot impersonate Operations.
7. Durable access/write audit records are protected and contain no document bytes, secrets or raw private storage paths. Malformed gateway requests may be rejected without a database audit; that limitation remains explicit.

P0 does not map a real D1 customer session to a Canonical principal. SCHEMA_API_GAP_AUDIT.md and PROJECTED_API_CONTRACT.md leave that mapping as a dependency hold. Synthetic aliases in verification/v0038/runtime.mjs are test fixtures only.

## 3. Project operations and commercial-event consistency

Project operations are intended to be evented, idempotent and revision-checked:

- Stage, task, application, material, message, deliverable and lifecycle commands write immutable receipts through service.workbench_command.
- Same principal plus same idempotency key plus same canonical payload replays the original receipt; a changed payload conflicts.
- A stale optimistic revision is rejected.
- Project completion requires no unfinished tasks, pending milestones, unresolved application outcomes or unaccepted deliverables.
- Manager-only pause/resume/terminate/close rules preserve project history; no destructive down migration is used.
- Linked compensating corrections preserve the original event and require an authorized manager.

Commercial state is a reference, not a second financial master:

- service.record_workbench_commercial_event accepts only source references from phoenix_operations, with source event ID, evidence hash, monotonic source version and timestamp.
- Contract signed, payment confirmed/waived/reversed and opening approved/revoked are separate event kinds.
- service.workbench_opened requires the current contract/payment/opening sequence; a payment reversal invalidates opening and later payment alone does not silently reopen it.
- Browser clients, advisers and managers do not write contract/payment facts. Source authority and event signature/version rules remain unverified for real use.

The reviewer must obtain the actual Operations source schema, service-principal ownership, event-signature/version rules, project-reference reconciliation, waiver policy and reversal procedure. CRM WON, entitlement references, deposits and legacy Education/WeChat payment records must not be treated as a signed service contract or payment confirmation without source-owner evidence.

## 4. Files, Consent, private storage and retention

The candidate reuses docs.documents, docs.document_versions, docs.can_read_document and immutable version metadata. Current development restrictions include:

- Education-only material upload.
- PDF or valid UTF-8 text, maximum 512 KiB in the candidate adapter.
- No browser access to object keys; downloads re-check authorization, withdrawal, retention and content hash.
- Material version history is protected by triggers; bytes are immutable.
- Health material, deliverables and messages are excluded from the ordinary workbench projection.
- A project grant does not replace DOCUMENT_READ Consent or verified guardian scope.
- Withdrawal or expired retention hides metadata and refuses new downloads/versions.

Evidence references:

- SQL functions workbench_snapshot, workbench_download, workbench_material_visible, protect_workbench_material and docs.can_read_document calls in 0038_service_project_workbench.sql.
- docs/database/service-project-workbench-v1/DATA_CONTRACT.md, section “Documents and Health boundary”.
- docs/database/service-project-workbench-v1/ROLLBACK.md, object-hash and restore limits.

Before real uploads, the data/document owner must approve in writing:

- Per-document classification, including passports and other sensitive identity material.
- Subject Consent, guardian scope, purpose and revocation behavior.
- Private object provider, encryption, key ownership/rotation, malware scanning/CDR and quarantine purge.
- Retention duration, legal hold, deletion/purge operator, restore retention and audit retention.
- Download/link expiry, access logging and incident response.
- Whether seven-day synthetic fixture retention has any relation to a real policy. Current evidence says it does not.

No clinical file, patient report, insurance claim or clinical communication contract is supplied by P0. “No medical fields in the DTO” is a boundary assertion, not a completed patient-level authorization test. Health requires a separate reviewed patient Consent/RLS/storage interface.

P1 review found that P0's legacy development snapshot/subject checks use the
primary domain, while Canonical permits secondary HEALTH domains. P1 now denies
such mixed-domain projects at its customer summary/detail/command/download seam
through candidate0039 and tests that denial. P0's unchanged legacy development
and staff paths still require independent mixed-domain/patient-scope review
before activation. Do not treat the new P1 guard as approval of every P0 channel.

## 5. Real employee and customer authorization mapping

Required mapping evidence is missing and cannot be substituted by synthetic aliases or local browser success:

- Trusted issuer, audience, JWKS/verification transport, cookie/session lifecycle and configuration ACL.
- D1 customer account to Canonical principal mapping, including one-to-one/merge rules, family membership, subject relationship, purpose and revocation.
- Named staff/adviser/manager principals, assignment source, employment status, scope and removal workflow.
- Customer consent/guardian evidence and effective/expiry timestamps.
- Audit ownership and review process for mapping changes.
- Private staging configuration with two approved real test accounts of different service scopes.

The correct failure behavior while these inputs are absent is closed access or a clearly marked unavailable/empty state. A synthetic client-a or advisor-a result is valid only as synthetic evidence and must never be described as real customer or employee acceptance.

## 6. Recovery and formal RPO/RTO gap

The candidate has useful local recovery evidence:

- Disposable PG16/PG17 fresh/repeat/drift/atomicity and logical fresh-cluster restore checks.
- Non-empty synthetic CRM/service/document/application/audit fixture restore and table/ledger/policy/object fingerprints.
- Backup LOGIN is isolated, temporary and not a normal reader.
- Failure drills cover API 503, DB disconnect, audit failure, stale revision and selected session/context cleanup.

The formal recovery gate remains open:

- No approved WAL/PITR configuration or restore destination.
- No Founder-approved RPO/RTO, backup schedule, retention, encryption/signing, operator, escalation or change-window record.
- No real non-empty production/staging restore.
- Measured disposable-cluster restore time is not an approved RTO.
- The unsigned manifest proves only local integrity consistency; it is not an independent signature or tamper-proof backup authenticity.
- Agent/HARMONY task recovery, clinical-file recovery and real customer/service restoration are not implemented.

Evidence references:

- docs/database/service-project-workbench-v1/ROLLBACK.md.
- docs/database/family-center-v2-20261105/drills/FAMILY_CENTER_FAILURE_DRILL_MATRIX.md (R02/R04/R05/R08/R09/R10/R11/R13/R14 remain HOLD or NOT RUN).
- docs/database/family-center-v2-20261105/drills/FAMILY_CENTER_FINAL_RELEASE_GATE.md (FULL ROLLBACK READY = HOLD).

## 7. Independent responsibility matrix

This packet assigns review work; it does not name or appoint reviewers.

| Review area | Minimum responsible role | Evidence required |
|---|---|---|
| 0038 SQL, FK/RLS, role grants, SECURITY DEFINER/search path | Independent Canonical/PostgreSQL security reviewer | Exact SHA review, policy/grant query output, unresolved findings and approval |
| Customer/staff identity mapping | Identity/security owner | Provider contract, mapping/revocation design, private config and two-account staging evidence |
| Project/task/event semantics | Service-operations owner | Approved lifecycle, assignment, event and compensation rules |
| Commercial references | Finance/Operations source owner | Signed/payment/opening event schema, source principal, version/signature and reversal evidence |
| Files/Consent/retention | Privacy/data/document owner | Classification, Consent, private storage, malware, retention/legal hold/purge policy |
| Health isolation | Clinical/privacy/security owner | Patient-level Consent/RLS/storage contract and negative tests |
| Recovery | SRE/DBA owner | WAL/PITR, RPO/RTO, backup authenticity, restore operator and drill evidence |
| Product/business scope | Founder or delegated product owner | Scope acceptance, no second masters, no real-data activation, exact candidate SHA |

## 8. Founder acceptance checklist

Founder must receive and explicitly record:

- [ ] Exact PR #55/#57/#58/#59 HEADs and dependency/base relationship rechecked.
- [ ] 0038 candidate SHA and migration-manifest status acknowledged.
- [ ] Real customer/staff identity provider and mapping are either approved for private staging or explicitly kept HOLD.
- [ ] Project lifecycle, task completion, stage/outcome semantics and compensation rules approved.
- [ ] Commercial source owner confirms signing/payment/opening references; no CRM/entitlement inference accepted.
- [ ] Document classification, Consent, private storage, malware, retention/legal hold/purge and withdrawal rules approved.
- [ ] Health remains metadata-only until a separate patient-level contract passes.
- [ ] RPO/RTO, WAL/PITR, backup authenticity and restore responsibility approved.
- [ ] Independent review signatures are attached to the exact candidate SHA; Codex/local synthetic tests are not signatures.
- [ ] P1 can proceed only with a separate Draft PR and no merge/deploy/production migration/real data import until all gates pass.

Current conclusion: P0 provides a bounded development/synthetic workbench with meaningful authorization and recovery controls, but it does not prove real customer identity bridging, production document policy, commercial-source authority, clinical access or formal disaster-recovery readiness. These are explicit HOLD items for P1 integration and independent review.
