# Health Compass V6 data-contract and Canonical PostgreSQL handoff

Status: **CANDIDATE / BACKEND HOLD / NO MIGRATION**  
Reviewed against local worktree branch `codex/health-v6-apec-postevent-20261105`, based on `main` at `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc` (the merged PR #50 commit). This document records an engineering handoff; it is not a database approval, privacy approval, Founder approval, deployment authorization, or evidence that a production database exists.

## Authority and evidence

The public repository contains a byte-for-byte candidate copy of 35 Canonical PostgreSQL migrations. `database/canonical/README.md` states that the private source remains authoritative until a Founder-approved integration and authority transfer are recorded. It also states that no production connection, real data, legacy import, or Tencent upgrade is part of this candidate. The source manifest binds the copy to private source commit `3af6ba19a96a458dc20cb0f4493bed10aee7028a`; see `docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md`.

The migrations have engineering smoke and PostgreSQL test evidence in `docs/database/premerge-0035/PG16_PG17_INTEGRATION_TEST_REPORT.md`, but that report does not prove a deployed production database, application connectivity, or Founder acceptance. The six milestone acceptance files remain pending according to the source manifest. No migration was run in this worktree and no database was contacted.

Health's current frontend boundary is deliberately side-effect free. `lib/health-integration-contract.ts:1-9,73-96,192-235` says the candidate does not create identities, grant permissions, persist consultations, publish events, upload documents, charge money, or call a network service. Every result has `authorized:false`, `canPersist:false`, `canUpload:false`, and `canPay:false`; consultation, projections, patient scopes, outbox and finance remain off or hold. Browser claims such as a role or partner ID are explicitly rejected as authority.

## Confirmed Canonical entities and access controls

The following are proven by the public candidate SQL, with the cited migration path as the source of truth for this handoff:

| Requested capability | Existing Canonical object | Evidence and boundary |
| --- | --- | --- |
| Person / Family identity | `core.people`, `core.families`, `core.family_memberships` | `database/canonical/migrations/0003_core_consent_access.sql:26-45`; IDs are UUID v7 and family membership is temporal. |
| Authentication context | `auth.principals`, `auth.session_contexts`, `auth.bind_context` | `0003_core_consent_access.sql:65-80,150-220`; a backend-bound, expiring context is required. The browser cannot bind itself. |
| Guardian and patient-level scope | `core.guardian_authorities`, `core.has_verified_guardian_authority`, `core.person_in_current_family` | `0003_core_consent_access.sql:50-63,222-252`; only verified authority and current family context can establish scope. |
| Consent | `consent.grants`, `consent.has_active_consent` | `0003_core_consent_access.sql:83-98,253-289`; current purposes are `DOCUMENT_READ`, `EDUCATION_CASE`, and `IDENTITY_CASE`. Health consent is not present in the candidate migration set. A new purpose requires a separately reviewed forward migration. |
| Audit | `audit.access_events`, `audit.record_access_event` | `0003_core_consent_access.sql:136-148,264-272`; access decisions are recorded with actor, family, resource and reason. |
| CRM lead / client / consultation | `crm.leads`, `crm.clients`, `crm.consultations`, `crm.consultation_events` | `0027_crm_lead_deal_foundation.sql:33-136` and `0033_m3_consultation_deal_management.sql:114-220`; `business_domain='HEALTH'` and `compass_kind='HEALTH_COMPASS'` are allowed, but creation requires the internal CRM service and validated canonical scope. |
| Referral / channel | `crm.lead_sources`, `crm.referrals`, `crm.lead_identity_links`, `crm.client_relationships` | `0027_crm_lead_deal_foundation.sql:19-31,74-110,138-162,209-222`; a source or URL partner value is not proof of a verified partner or commission authority. |
| Service project | `service.projects`, `service.project_domains`, `service.project_parties`, `service.project_assignments` | `0028_service_project_task_delivery.sql:11-104`; project status is explicit and project identity is tied to an existing CRM client/family/deal. |
| Patient/service subject reference | `service.project_subjects` | `0028_service_project_task_delivery.sql:56-72`; `subject_person_id` is a reference only and `access_status` is constrained to `REFERENCE_ONLY`. It is not a medical-record store. |
| Patient-level project authorization | `service.project_subject_authorizations` | `0034_m4_service_project_governance.sql:20-62,165-180`; only `PATIENT_SELF` or `LEGAL_GUARDIAN`, `data_scope='HEALTH'`, evidence hash, validity and revocation are accepted. This is project-scoped authorization, not a general consent replacement. |
| Tasks and status history | `service.tasks`, `service.task_events`, `service.project_milestones`, `service.project_events`, `service.deliverables`, `service.delivery_events` | `0028_service_project_task_delivery.sql:106-185` and `0035_m5_service_delivery_governance.sql:6-90`; transitions and event history are server-controlled and append-only where specified. |
| Document references | `docs.documents`, `docs.document_versions`, `docs.submission_manifests`, `docs.submission_items` | `0005_documents_submissions.sql:3-160`; records are consent-gated and RLS-protected. This does not authorize Health uploads from the public page. |

RLS is enabled on core identity, consent, channel grants, audit, casework and document objects (`0003_core_consent_access.sql:291-326`, `0004_casework_education_identity.sql:228-282`, `0005_documents_submissions.sql:149-160`). Service authorization also has forced RLS and an explicit current-family, active-project policy (`0034_m4_service_project_governance.sql:370-393`). These are database controls; they have not been connected to this website candidate.

## Mapping requested Health V6 concepts

The following map is intentionally conservative. “Candidate mapping” means an existing object could carry a reference after Jimson confirms the contract; it does not authorize writes or prove that the object is suitable for production Health data.

| V6 logical concept | Candidate mapping | Current decision |
| --- | --- | --- |
| Health consultation request | `crm.leads` and, only after server-side identity/scope/consent, `crm.consultations` with `business_domain='HEALTH'`, optionally `compass_kind='HEALTH_COMPASS'` | **HOLD.** `HEALTH_RUNTIME_STATUS.consultationEndpoint='OFF'`; `consultationSourcePersisted`, `endpointEnabled` and `outboxEnabled` are required trusted flags and are not implemented by this website. |
| Service application / case | `service.projects` with a `HEALTH` domain, plus `service.project_subjects` and `service.project_subject_authorizations` | **HOLD.** A service project requires an existing canonical client/family/deal and an internal service principal. No Health case table or public route exists. |
| Six-step cross-border workflow | `service.tasks`, `service.task_events`, `service.project_milestones`, and `service.project_events` | **HOLD.** The public page may show a local/demo checklist only. It cannot create assignments, appointments, task status, quotations, claims, or completion events. |
| Four-specialty catalogue | Static, source-bound public content only; no Canonical medical catalogue is present | **HOLD.** No `Hospital`, `Department`, `Doctor`, specialty, procedure, stay-length, room, or clinical capability table was found in migrations 0001–0035. Each provider/doctor/technique claim needs official source, date, human review and any required permission before publication. |
| Hospital/provider resource | No proven Health provider master in this candidate; an organization reference would require a verified `core.organizations` record and separately approved public scope | **HOLD.** A public listing cannot be converted into a partnership, referral, acceptance, language, room, price or insurance claim. |
| Insurance company/plan check | No insurance or policy table is present in migrations 0001–0035 | **HOLD.** The V6 selector must remain a local `UNVERIFIED` demo. Brand names do not inherit plan coverage, network, pre-authorization, direct-billing or claim outcomes. |
| Medical documents / reports / insurance files | `docs.*` is a controlled reference system, not a public upload API | **DENY from public Health.** `medical.document.upload` is always denied by the frontend contract. Any future upload needs separate service design, patient/guardian authorization, controlled storage, RLS, retention, audit and negative tests. |
| Family OS projection | Minimum summary fields are declared in `FAMILY_PROJECTION_FIELDS` | **HOLD.** The fields are design-time references only; raw records and Compass answers are excluded. `family.projection.read` remains `HOLD` even when trusted flags are true because the projection is not connected. |
| Founder OS operational projection | Minimum operational references are declared in `FOUNDER_PROJECTION_FIELDS` | **HOLD.** No Founder role, endpoint, event outbox or production projection is wired. |
| Partner workbench / referral attribution | `crm.lead_sources`, `crm.referrals`, `crm.client_relationships`, `service.project_parties` may be relevant after verification | **HOLD.** `partner.source.validation` is candidate-only and cannot derive commission, partner access or attribution from a URL or frontend role. |
| Payment / settlement | No Health payment write path; finance is outside this website | **DENY.** `finance.write` is off and requires Canonical finance authority and approval. |

## Requested workflow labels and proven status primitives

The V6 brief names application, assignment, document submission, appointment, quotation, in-progress work, supplementation, claims, completion and cancellation. The Canonical candidate does not contain a Health-specific workflow or appointment/quotation/claims tables. The following is the narrowest possible mapping to existing primitives; labels in the last column are proposed task-type values only and must not be treated as existing enum members until Jimson approves them.

| Requested UI/workflow label | Existing object and exact status/event primitive | Evidence boundary |
| --- | --- | --- |
| Application / service request | `crm.leads.lead_status`: `NEW`, `CONTACTED`, `QUALIFYING`, `QUALIFIED`, `DISQUALIFIED`, `CONVERTED`, `MERGED`; a later `crm.consultations.status` may be `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, or `NO_SHOW` | `0027_crm_lead_deal_foundation.sql:33-54,114-135`; `0033_m3_consultation_deal_management.sql:167-220`. No public endpoint or Health write is enabled. |
| Assigned / owner transfer | `service.project_assignments.status`: `ACTIVE` or `ENDED`; `service.task_events.event_kind='ASSIGNED'` or `TRANSFERRED` (the latter is added by M5) | `0028_service_project_task_delivery.sql:85-104,127-137`; `0035_m5_service_delivery_governance.sql:38-90,153-185`. Assignment requires a verified service principal and project scope. |
| Document preparation / submission | `docs.submission_manifests.status`: `PREPARING` or `SUBMITTED`; `docs.submission_items` pins immutable document versions by SHA-256 | `0005_documents_submissions.sql:25-49,78-131`. The current target kinds are only `EDUCATION_APPLICATION` and `IDENTITY_CASE`; Health documents are not an approved target. Public Health upload remains denied. |
| Appointment coordination | No appointment table or appointment status enum exists in migrations 0001–0035. A future appointment coordination step could be represented as a `service.tasks` row plus immutable `service.task_events` after a separate contract approval | `0028_service_project_task_delivery.sql:106-137`; `task_type` is a validated text code, not a pre-approved Health appointment enum. No appointment is created by this candidate. |
| Quotation / cost confirmation | No quotation or estimate table exists in migrations 0001–0035. A coordination task or deliverable can record a reference only after an approved contract; it cannot store an unreviewed medical quote in CRM | `service.tasks` / `service.deliverables` in `0028_service_project_task_delivery.sql:106-170`; no price or quotation authority is established. |
| In progress | `service.tasks.task_status='IN_PROGRESS'`; a project can be `ACTIVE` | `0028_service_project_task_delivery.sql:11-34,106-123`. These are generic service statuses and do not mean a medical procedure has started. |
| Supplement / additional information | No dedicated supplement status exists. Use an explicitly approved task type with `task_status='BLOCKED'` or `PENDING` only if the service contract defines why; do not invent a new status | `0028_service_project_task_delivery.sql:106-123` enumerates the only task statuses. |
| Claims assistance | No insurance claim table or claims status enum exists. At most, an approved administrative task/deliverable reference could be tracked; insurer coverage and claim decisions remain external | `lib/health-integration-contract.ts:231-234` keeps finance off; no claims schema is present in migrations 0001–0035. |
| Completed | `service.tasks.task_status='COMPLETED'` with `completed_at` required; `service.projects.project_status='COMPLETED'` with `completed_at` required; deliverables may be `ACCEPTED` | `0028_service_project_task_delivery.sql:18-34,106-123,154-170`; `0035_m5_service_delivery_governance.sql:60-90`. Completion is a service workflow state, not a clinical outcome. |
| Cancelled | `service.projects.project_status='CANCELLED'` with `completed_at` required; `service.tasks.task_status='CANCELLED'`; consultations may be `CANCELLED` | `0028_service_project_task_delivery.sql:18-34,106-123`; `0027_crm_lead_deal_foundation.sql:114-135`. Cancellation must be performed through approved server transitions and audited events. |

The candidate therefore cannot promise the requested end-to-end statuses, hospital appointment state, quote confirmation, document state, or claims progress. Any implementation must keep the UI in local/demo mode, use only the exact existing status values above, and keep every backend write behind the Canonical service, consent, patient-scope, RLS and audit gates.

## Why authenticated backend writes are not safe to enable now

The public website currently has no server route that binds a Canonical session context, resolves a canonical Person/Family/Client, records independent consent, checks a patient scope, creates a CRM lead or service project, emits an audited event, or writes through the approved service functions. The frontend contract intentionally keeps all of these disabled. A local rendered page, a successful TypeScript build, or a synthetic database test cannot establish that a production write is safe.

Before any write path can leave HOLD, Jimson must provide and approve, against the authoritative Canonical source:

1. The exact schema/migration version and authority transfer record.
2. The authenticated service-to-database connection method, role, context binding and secret handling.
3. The canonical mapping for Person, Family, Client, Lead, Consultation, Service Project, Subject and patient authorization.
4. A Health-specific consent purpose/data class or a documented approved reuse of an existing purpose. The current consent enum does not include Health.
5. The endpoint contract with validation, idempotency, event/outbox behavior, error handling and audit reason codes.
6. RLS tests proving cross-family denial, wrong-patient denial, expired/revoked consent denial, guardian-scope denial, partner-scope denial and no raw medical data in CRM/Family projections.
7. Retention, deletion, export and incident handling for medical and insurance documents, reviewed by privacy/legal owners.

Until these artifacts exist, the only safe public behavior is local preparation with no submission, no upload, no network write and no claim of CRM, Family OS, Founder OS, hospital, insurer or appointment connectivity.

## Required negative tests before an integration PR

The current contract tests in `website/phoenix-nova-website-v5/tests/health-integration-contract.test.mjs` cover denial of frontend authority, missing contact consent, missing patient scope, missing canonical family references, projection HOLD, medical-upload DENY, and exclusion of raw medical records from projection fields. They do not prove an actual PostgreSQL connection or RLS behavior.

An integration PR must add exact-head, disposable PostgreSQL tests for at least:

- no session context / expired context;
- family A reading or writing family B;
- patient P1 accessed by an actor authorized only for P2;
- revoked or expired `service.project_subject_authorizations`;
- guardian without verified `GENERAL` or `HEALTH` authority;
- partner/channel grant missing, expired or revoked;
- CRM lead/consultation created from browser role or URL partner ID;
- medical documents appearing in CRM notes or Family OS projection;
- duplicate retry cannot create duplicate consultation/project/event;
- audit rows record both allow and deny decisions;
- no public endpoint accepts files, raw medical records, insurance policies or identity documents.

No such backend integration test was run in this worktree. The existing local contract tests remain frontend-only evidence.

## Handoff to Jimson and release state

Jimson owns the database and data-contract decision. This handoff requests a schema read and a written mapping/approval packet; it does not request a migration. The current branch contains no database migration, no production configuration change and no external write.

Engineering state: **INTEGRATION_READY_REVIEW for static/demo UI only; BACKEND HOLD for all writes, patient data, insurance verification, provider operations and production release.** Founder, privacy/medical boundary, independent code review, provider/image evidence and exact-head CI gates remain separate requirements. Staging and Sites remain noindex and HOLD until those approvals are recorded.
