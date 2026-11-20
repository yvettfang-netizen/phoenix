# Phoenix Education data contract — DB-04 / DB-05 joint review

**State: PROPOSED / HOLD implementation.** This review joins the document and learning-evidence boundaries. It adds no SQL, runtime grant, route or data. Draft [PR #80](https://github.com/yvettfang-netizen/phoenix/pull/80) and [PR #81](https://github.com/yvettfang-netizen/phoenix/pull/81) remain separate historical design candidates; neither is treated as an installed migration.

## Fixed source and measured authority

The checked `phoenix/main` is `9db147ac3a5d135d50b90bfea5a7316ce747d90b`, with formal migrations 0001–0037. Source reviews are [DB-04 at `ddd50ac`](https://github.com/yvettfang-netizen/phoenix/blob/ddd50acd2337d87eafb7d2fcceb4f06b607b338a/docs/database/enterprise-v31-db04-20261120/READINESS_AUDIT.md) and [DB-05 at `a9407cc`](https://github.com/yvettfang-netizen/phoenix/blob/a9407cc99f4c807360e75cea1a345f33e7301bad/docs/database/enterprise-v31-db05-20261120/READINESS_AUDIT.md). This is a repository source review, not a shared-environment catalog inspection.

| Authority | Source checked | Rule for the joint contract |
|---|---|---|
| Person / Student / Family / Principal | Formal `core` and `auth`; `learning.enrollment` in [0022](https://github.com/yvettfang-netizen/phoenix/blob/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations/0022_learning_core.sql) | Canonical IDs only. Source name, email and local ASKWISE student IDs cannot create or merge master identities. `learning.enrollment` denotes Academy course participation; it is not university study enrollment. |
| Document and immutable version | [0005](https://github.com/yvettfang-netizen/phoenix/blob/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations/0005_documents_submissions.sql), [0006](https://github.com/yvettfang-netizen/phoenix/blob/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations/0006_access_decision_api.sql), subsequent [0007](https://github.com/yvettfang-netizen/phoenix/blob/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations/0007_security_boundary_fixes.sql) and [0015](https://github.com/yvettfang-netizen/phoenix/blob/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations/0015_contract_gap_controls.sql) hardening | One `docs.document_versions.version_id` may be referred to more than once only through independently authorized use records. Every read rechecks document, subject, family, data class, consent, guardianship, retention and current project scope. |
| Submission | Formal `docs.submission_manifests/items` | Use only for a specific Education application or Identity case. Pin version ID and digest; do not use as a generic task attachment list. |
| Delivery | Formal [0035](https://github.com/yvettfang-netizen/phoenix/blob/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/migrations/0035_m5_service_delivery_governance.sql) | Delivery metadata is separate from permission to read the underlying version. |
| Project material | Isolated candidate [0038](https://github.com/yvettfang-netizen/phoenix/blob/9db147ac3a5d135d50b90bfea5a7316ce747d90b/database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql) | Its `service.workbench_materials.version_id` primary key permits one project link only. A future approved forward migration must add a separate use association if the same version serves two projects; do not edit 0038. |
| Academy evidence | Formal `learning.after_class_card`, `learning.publication`, `learning.stage_report` in 0022 | Teacher review and publication remain explicit. ASKWISE attempt output cannot silently replace a published report or publish itself. |
| ASKWISE pilot | Source inventory in DB-05 | The source code uses `better-sqlite3` and an in-memory mock adapter. No SQLite data, real identity map or current runtime ledger was inspected in this review. |

Measured SHA-256 for the referenced formal files: 0005 `7bd581d16bb8c21278bd5bc013496779fe08f509d84bf74b652e5ce3b21cdbec`; 0006 `2a3d6cd19febd62b7128c9ad4a2d7c94abdb9a4e11d499f36f4050eb2c2ed9d8`; 0022 `4df4b55cc9b2830c357d676906a77a9fa7ac981bbe4673c156285aa40fba2f5f`; 0035 `c25d5efb3ddecdd11b1fa45793061b992e8bcaee278e3e1e359f7ca6b510c631`. Candidate 0038 is `4b82dc15b86b5936258a3d32a1b91ccbaf756e8ca76cd11a609bb6373c934ecf` and is not formal.

## Proposed contract

| Flow | Input and key | Authorization and immutable result | Publication boundary |
|---|---|---|---|
| Academy assignment | Canonical student/family/enrollment ID, source assignment/event ID, approved task scope and expiry | Verify current enrollment, source authority, service entitlement and student/guardian/assent capability before issuing a short-lived assignment. Idempotent source event replay; changed payload requires review. | An assignment permits a bounded learning task, never general family or project access. |
| Document project use | Existing `version_id`, project ID, subject ID, purpose, independent review ID | Check same subject/family and current project assignment plus document read authorization. Each project has its own review state and events; no inherited approval. A withdrawal prevents new use and later reads. | A document version remains in `docs`; private object storage stays separate. |
| AI extraction | Authorized source version, purpose, source digest, parser/model/prompt/schema versions, job ID and expiry | Worker principal receives minimum purpose-specific scope. Candidate facts append as `PENDING_REVIEW`; reviewer identity and source version are logged. Queue and read recheck withdrawal and expiry. | No model output creates verified education facts, project authority or public report without human domain review. |
| ASKWISE evidence | Approved mapping to Canonical student, source system/event ID/version, task/session reference, digest and revision | Same `(source_system,source_event_id,source_version)` plus same digest is replay; a changed digest is conflict. Later revisions append. Raw answers/diagnoses stay in their approved processing boundary. | Qualified teacher reviews a minimized summary. Accepted content may enter existing `learning.after_class_card` or `learning.stage_report`; `learning.publication` controls family visibility. |
| Family growth projection | Published/retracted event and current student/family/enrollment | Recheck actor/session, guardianship, consent, current enrollment and publication status on read. | Show only currently published and authorized summary. Keep CAT4, DSE, A-Level, IELTS, JLPT and Cantonese score systems distinct even when timeline entries share a student. |

### Permission matrix for a future implementation

| Actor | Project document use | ASKWISE / Academy evidence | Published family projection |
|---|---|---|---|
| Student or authorized guardian | Purpose- and subject-scoped upload/read, after active consent/assent and capacity checks | Assigned tasks and own authorized result | Own currently authorized student only |
| Assigned teacher | No blanket project document right | Only assigned class/student, current teacher assignment, review capability | Approved teaching scope only |
| Assigned advisor or staff reviewer | Project- and purpose-scoped review | Explicit education review assignment only | Explicit service scope only |
| Partner/channel | Default deny | Default deny | Default deny |
| Extraction worker | One job/source version/purpose, time-limited | No general student or family projection | Deny |
| Database application login | No direct table writes | No direct table writes | Through approved, audited APIs only |

Every column above is **proposed**, not an existing grant. Withdrawal, role removal, family transfer, adult-student handover and session expiration must invalidate subsequent work/read. Audit records must identify the trusted principal, operation, source version, purpose and decision without raw document text, private storage keys or answers.

## Required negative and recovery acceptance before implementation

1. Two projects may refer to the same immutable version; review and approval in one does not authorize the other. Other-family project or subject mismatch is denied without revealing file existence.
2. Consent/assent withdrawal after queueing cancels or refuses extraction and new reads. Retention expiry and legal hold behave according to an approved deletion contract; no physical delete is inferred from this draft.
3. Partner, unassigned teacher, expired guardian, revoked staff and pooled connection after context clear cannot read or publish.
4. Same ASKWISE event/digest is processed once; same key with changed digest is a conflict; newer revision does not overwrite reviewed history.
5. AI output remains pending until a currently authorized human approves it. Retraction removes Family OS visibility without erasing audit history.
6. PG16/17 fresh and upgrade, RLS/ACL, repeat/drift/atomicity, separated LOGIN and fresh-cluster restore must run against the eventual exact forward SQL. None is reported PASS for this design document.
7. Before legacy SQLite retirement, inspect source locations read-only, approve row-level identity mapping, reconcile counts and digests, restore a backup, compare authorized reads and document rollback. No deletion before these receipts.

## HOLD and next engineering order

| Gate | State | Missing decision or evidence |
|---|---|---|
| Cross-project document purposes, data classes and reviewer roles | HOLD | Approved consent/guardian/assent text and exact project-role matrix |
| Object storage and extraction | HOLD | Malware/MIME/size rules, short-lived delivery, processor contract, permitted fields, retention/deletion and revocation receipts |
| ASKWISE assignment/evidence | HOLD | Authoritative runtime/source, reviewed student mapping, entitlement event authority, teacher reviewer authority, immutable revision contract |
| Migration numbering | HOLD | Reconcile reserved 0038/0039 and all forward candidates; assign a fresh number only after contract approval. No historical SQL edit. |
| Shared non-production baseline | HOLD | Jimson's **only supplementary task** is [PR #85 `P0_1_JIMSON_NONPROD_TICKET.md`](https://github.com/yvettfang-netizen/phoenix/blob/162c2ae4ca50827f250f5b0d4a256174c6fb8834/docs/architecture/academic-studio-v21-p0-20261120/P0_1_JIMSON_NONPROD_TICKET.md): named `canonical-nonprod`, separate read-only LOGIN, actual DB/PG version, formal ledger/hash, effective role privileges, Learning RLS/FORCE, UTC and sanitized raw output. Missing receipt never authorizes candidate installation. No repeat local PG16/17 or architecture audit is assigned to Jimson. |
| This joint review | PASS for source inventory; PROPOSED for contract; NOT RUN for runtime/PG tests | No SQL or real data changed |

Next implementation order, after the listed decisions: (1) reconcile active migration numbering and source authority; (2) propose a minimal forward association and evidence-ingestion contract with default-deny grants; (3) run PG16/17 synthetic separated-LOGIN tests and restore; (4) stage a default-off API; (5) seek independent review. PR #80/#81 stay Draft and no merge, deployment, production database access, real data import or SQLite retirement is authorized here.
