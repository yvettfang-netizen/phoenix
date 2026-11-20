# DB-04 readiness audit — document reuse and AI pending facts

**Status: DESIGN / HOLD.** This package is an independent draft design review stacked after DB-03 [PR #79](https://github.com/yvettfang-netizen/phoenix/pull/79). It makes no SQL, object-store, AI-provider, upload, production or real-data change. It does not claim that DB-03 is installed.

## Actual source inventory

| Existing object | Verified fields / rule | Reuse or gap |
|---|---|---|
| `docs.documents` | Canonical document/family/subject IDs, data class, kind, retention, withdrawal and legal hold | Reuse one logical file identity. No project-specific use record. |
| `docs.document_versions` | Immutable version ID, document ID, ordinal, SHA-256, private storage key and byte size; unique `(document_id, version_no)` and storage key | Reuse one immutable source version; never copy blobs for each project. |
| `docs.submission_manifests/items` | Explicit target, family/subject, exact version and pinned SHA-256 | Reuse for formal submissions, not as an all-purpose project material table. |
| `docs.can_read_document` / `docs.authorize_document_read` | Existing subject/data-class/consent and audit boundary | Must re-evaluate at every new read; project assignment cannot bypass it. |
| `service.workbench_materials` in **candidate 0038** | `version_id` is the primary key and each row has one `service_project_id` and review status | Cannot represent the same version in two projects. Candidate 0038 is not a formal 0038 migration in checked main; do not rewrite it. |
| `service.deliverables` / delivery events | Delivery metadata references versioned docs | Delivery acceptance is separate from permission to read original material. |

These facts were read from `0005_documents_submissions.sql`, `0006_access_decision_api.sql`, `0035_m5_service_delivery_governance.sql` and the existing `forward-candidates/service-workbench/0038_service_project_workbench.sql`. The DB-02 isolated catalogs contain four `docs` tables and no extraction-job/fact-review table. None of these observations proves current shared-environment deployment.

## Minimal forward design, pending approval

1. A separate project-document-use association should reference an existing `docs.document_versions.version_id` and a specific `service.projects.service_project_id`, with its own subject, review status, reviewer, revision and event history. A second project may reference the *same immutable version*, but starts its own review. It must not inherit the old project's approval.
2. Before creating a reference or issuing a read, verify document subject/family, current project subject authorization, purpose-specific consent/guardian capacity, version/retention/withdrawal/legal hold and the caller's current project assignment. Hash equality alone cannot prove authorization or reveal whether another family's file exists.
3. AI processing requires a job row tied to a specific source version, authorized subject/purpose, parser/model/prompt/schema version and expiry. Candidate facts remain `PENDING_REVIEW`; only a qualified person can approve a fact through the existing domain write API. Model output never overwrites verified facts and never becomes a database authorization source.
4. Queued jobs and later reads must be cancelled or refused after withdrawal. Logs must omit raw document text, private object keys and signed download URLs. A worker is a separately scoped service principal, not a database superuser.

## Required decisions and receipts

- Exact cross-project reuse purpose, allowed data classes and consent/guardian/assent text; adult-student handover.
- Which project roles may submit, review, download or share a version; separate partner and AI processor scope.
- Object-store malware/size/MIME inspection, short-lived delivery or authenticated stream revocation, retention and physical deletion policy.
- AI provider/data-processing contract, permitted extraction fields, prompt-injection isolation, reviewer identity, model-version and deletion evidence.
- Whether candidate 0038 is eventually installed and how its one-project PK is forward-extended without changing its bytes; current migration ledger/numbering reconciliation.

**No DB-04 migration or PG16/17 write test is reported PASS.** The next runnable package should have its own numbered forward SQL, restricted LOGIN tests for same-file/two-project and cross-family denial, withdrawal-after-queue, immutable versions, reviewer control, atomic rollback and fresh-cluster restore.
