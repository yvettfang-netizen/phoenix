# EDC V2 unnumbered candidate — review and test gate

**State:** DRAFT / NO MIGRATION NUMBER / ZERO PRODUCTION GRANTS / HOLD.

This is the first narrow data-integrity candidate for PR #86, based on Canonical formal migrations 0001–0037. It is independent from PR #92 Academy Package A (identity/context/Staff Consent), PR #89 candidate 0045 (guardian revocation), and candidate 0038 (service workbench). None is silently imported, renumbered or installed.

## Scope

1. Private document: one immutable docs.document_versions version_id may have separate project-use rows in service.education_document_uses. The constraint trigger enforces same family/subject, active project subject, compatible EDUCATION scope, nonwithdrawal and unexpired retention on INSERT. Each project starts PENDING_REVIEW. Reviews, grants and reads are deliberately unavailable.
2. Shared educational resources: metadata-only teaching_resources/teaching_resource_versions and course-use references have **no family or student ID**. No object key, delivery URL or material body exists here; license evidence and content digest are metadata. All resource versions are DRAFT and course links PROPOSED, with no publication or license authorization path.
3. ASKWISE: scoped student/enrollment mapping references and append-only digest inbox. No raw attempt/diagnosis/hint/retry/transcript, no new student identity, no SQLite. Assignments remain PENDING_AUTHORIZATION; evidence remains PENDING_REVIEW. UNIQUE source event/version rejects conflicting replay; an API-level idempotent response is **not implemented**.

All six new tables enable and FORCE RLS, create no permissive policies and grant zero runtime rights to app, reader or binder. No new authenticated endpoints, service principals, SDK, AI processor, login, or payment logic.

## Test interpretation

Synthetic PG16/17 checks may validate fresh formal 0001–0037 install, candidate install, retry refusal, rollback, same version/two projects, cross-family insert denial, pending-only constraints, event uniqueness and immutable history, no direct grants and FORCE RLS. These are schema tests, **not** permission to expose data.

Still HOLD and NOT TESTED: current project-role authorization, purpose-specific consent and minor assent text, actual guardian revoke/read, live staff scopes, licensing and distributor rights, worker queue revocation, independent human review/publication/retraction, API-level idempotent ack, real ASKWISE adapter, full fresh-cluster restore, HTTP-to-DB, pool reuse and deployment.

The needed next step is a separate reviewed default-off API proposal with exact purpose/role/guardian/worker checks and negative acceptance, dependent on Founder privacy/licensing approval. No numbered migration, merge, production/shared-nonprod installation, real data, AI activation or legacy import is authorized. Jimson remains limited to the previously assigned narrow manual nonproduction read-only receipt.
