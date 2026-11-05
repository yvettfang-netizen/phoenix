# Service Project Workbench V1 — development contract candidate

Status: **HOLD for real business activation**. Codex implementation under Founder development instructions; not an APPROVED/EFFECTIVE business contract. Read with [audit](AUDIT.md), [permissions](PERMISSIONS.md), [rollback](ROLLBACK.md) and [execution report](EXECUTION_REPORT.md).

## Authority and extensions

Unique migration authority remains `phoenix/database/canonical`. No second Person, Family, Student, Principal, Client, Project, Contract or Payment master is introduced. UUIDv7 primary/foreign keys reference existing objects.0038 is isolated under `forward-candidates/service-workbench`; active migration inventory remains37 on this unmerged stack,35 on inspected main.0001–0037 are unchanged.

| Extension | Existing authority | Purpose |
|---|---|---|
| service.workbench_settings | service.projects | Template, scope, stage, optimistic revision, protected retention configuration |
| service.workbench_events | Existing project/task/delivery/application event tables retained | Immutable command receipt, actor, subject/audience, request digest, idempotency, linked compensation |
| service.workbench_commercial_events | External phoenix_operations source | Immutable source/evidence **references**, separate contract/payment/opening versions; no financial master or financial command |
| service.workbench_applications | education.applications, institution, program | Project association, intake/round/deadline, receipt, independent official result/interview/deposit reference |
| service.workbench_materials | docs.documents/document_versions | Per-version review, submitter/reviewer, MIME; private object bytes remain outside PostgreSQL |
| service.workbench_task_scope | service.tasks | Subject and CLIENT/STAFF audience |
| service.workbench_messages | Existing principals/project/subject | Persistent bounded project communication; Health clinical messages unavailable |

Foreign-key and validation triggers reject mismatched project/family/subject, program/institution and offer versions. One project can have multiple independent applications. Duplicate project/subject/program/year/round is rejected. Catalogue uses canonical institution/program IDs, not page labels. Fixture universities/programmes are explicitly synthetic; real catalogue reconciliation remains HOLD.

## Trust and API

`Page → same-origin BFF → loopback trusted API → binder LOGIN ticket → separate app LOGIN → controlled SECURITY DEFINER functions → subject-scoped projection`.

The normal backend bootstrap does not instantiate this API. Website flag is default-off and production mode always refuses. The test-only server injects explicit synthetic identities. It does not map a D1 website account, browser-selected family, header role or claimed staff identity into Canonical. Provider/session/staff facts remain HOLD. Objects and credentials are private local test state, never tracked or returned to the browser.

| HTTP resource below /api/service-workbench | Method | Result |
|---|---|---|
| projects | GET | Authorized opened client projects / assigned adviser projects |
| catalogue | GET | Active HK master's canonical IDs |
| projects/{canonical_uuid} | GET | Fixed `service-workbench.v1` projection |
| projects/{id}/commands | POST | Allowlisted command, revision and Idempotency-Key |
| projects/{id}/materials | POST | Bounded synthetic PDF/UTF-8 upload through trusted object adapter |
| projects/{id}/materials/{version}/download | GET | Reauthorized/hash-checked attachment, never object key |
| dev-session | POST | Explicit loopback synthetic preview flag only; opaque HttpOnly cookie |

Writes require exact same Origin, JSON, bounded body, opaque server session and server-side authorization. No browser SQL, credentials, raw upstream errors, object paths or arbitrary endpoints. Each database operation checks role privileges, consumes one-use ticket, checks live session before/after commit and clears/discards connections. Context cleanup failure refuses a response. Direct app table access/audit fabrication/binder escalation/source payment write are denied.

## Distinct states and transitions

| State family | Rules |
|---|---|
| Project lifecycle | Existing DRAFT→PLANNED→ACTIVE; ACTIVE↔ON_HOLD; authorized terminal COMPLETED/CANCELLED. Manager-only. Activation/resume checks independently signed, payment-confirmed/waived and subsequent explicit opening references. No automatic activation. Completion requires finished/cancelled tasks, achieved/cancelled milestones, final application outcomes and accepted/cancelled deliverables. Terminal project is read-only. |
| Business stage | DISCOVERY/SCHOOL_SELECTION/MATERIALS/SUBMISSION/INTERVIEW/DECISION/DEPOSIT/CLOSED. Assigned writer records stage. No inferred percentage. CLOSED accompanies terminal lifecycle. Stage does not stand for an official admission outcome. |
| Application lifecycle | Existing DRAFT→READY→SUBMITTED→DECIDED; permitted explicit WITHDRAWN transitions. Submission requires receipt/reference/source/time. Only authorized adviser commands or future verified source events; no page inference. |
| Application outcome | PENDING/OFFER/REJECTED/WAITLISTED/WITHDRAWN remain separate. OFFER requires independently reviewed pinned file version. WAITLISTED may receive subsequent explicit official result; final facts are not silently overwritten/reopened. Event history preserves source references. |
| Material review | SUBMITTED→APPROVED or CHANGES_REQUESTED by a different authorized reviewer. Terminal review is immutable. Resubmission creates a new docs version; no byte overwrite. |
| Task | PENDING→IN_PROGRESS/BLOCKED/CANCELLED; IN_PROGRESS→BLOCKED/COMPLETED/CANCELLED; BLOCKED→IN_PROGRESS/CANCELLED. Client may advance own CLIENT task, cannot cancel. Staff assigns within project and scope. |
| Deliverable | Existing0035 DRAFT/CHANGES_REQUESTED→UNDER_REVIEW→REVIEW_APPROVED→ACCEPTED, independent submit/review/accept actors. Pinned document version; no self-approval. |
| Commercial facts | CONTRACT_SIGNED/CANCELLED, PAYMENT_CONFIRMED/WAIVED/REVERSED, OPENING_APPROVED/REVOKED are separate monotone source versions. Payment reversal invalidates opening; subsequent payment alone does not reopen. Deposit requirement/reference is not payment confirmation. |

Contract/payment source ingestion exists only as a database-side source-reference function using the existing separate Operations SERVICE principal. Web financial writes are absent. Real signature verification, source version contract, payment waivers and source-to-project reconciliation must be reviewed before use with real data.

Every accepted command locks the project and checks revision. Same principal/key/same canonical payload replays original receipt; changed payload conflicts. Receipt replay rechecks subject and document authority. Concurrent stale revision refuses. Failures roll back business changes and write a protected denial when the failure reaches the controlled database function. Malformed HTTP/unknown-route/session-before-DB failures are not claimed as durable database audits.

## Documents and Health boundary

Existing `docs.can_read_document` is unchanged: project authorization never substitutes for DOCUMENT_READ Consent/verified guardian scope. Withdrawal hides metadata and refuses new versions/download. Download checks current authority again after reading bytes. Retention/withdrawal gates remain enforced; synthetic seven-day retention is a fixture, **not a selected real policy**.

Upload is Education-only and restricted to512KiB PDF or valid UTF-8 text in this development candidate. Actual document classification (including sensitive passports), malware/CDR, private object storage provider, retention/purge/legal-hold policy and credential rotation remain HOLD before real uploads. Failed uploads may leave private unreferenced quarantine bytes; there is no runtime purge grant.

Identity/Wealth reuse the generic project base but their file/state templates are not declared complete. Health exposes authorized project metadata only with patient-specific project authorization; no medical records, patient reports, insurance claims or clinical message upload path. This is **not** proof that a future medical API has passed clinical access tests. Health must obtain a separate reviewed patient-level contract/RLS/storage interface. No medical content enters ordinary CRM or Family Timeline.
