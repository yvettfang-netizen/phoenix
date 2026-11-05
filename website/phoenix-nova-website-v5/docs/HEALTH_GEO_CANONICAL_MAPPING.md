# Health Global/GBA platform｜Canonical mapping and API gate

Date: 2026-11-02 Asia/Shanghai. Design-only; no database connection, migration, patient data, upload, payment or operational handoff was executed.

## Evidence and authority levels

| Evidence | Actual state |
|---|---|
| Main website | `main@259753248ff54b07fd9c52f270e45ae1c877bc09` |
| Existing Health candidate | PR #33, Draft/open/unmerged, `5771c910f8d1bb507eabf0cc6a529f6f28774217` |
| Canonical default | `codex/canonical-postgresql-phase1@48bb6c3ae18906f870ea9e8a717c03ebb2da34bd`, migrations 0001–0025 |
| Canonical Health design | PR #1 Draft/open/unmerged, `dc825d7799242f63bfcfbfbbc94bb475f76046b0`, documents only, no Health migration |
| M0–M5 implementation candidates | Separate Draft PRs #2–#7, contain actual candidate DDL 0026–0035; not merged into the default authority |
| V7 running database | EVIDENCE_MISSING: no approved runtime manifest, deployed migration ledger, production catalogue or Jimson runtime attestation supplied |

Do not confuse a default-branch schema, a candidate DDL chain, a successful synthetic PostgreSQL test and a deployed database. No branch named V7 was found in the current repository branch listing; this does not prove that an externally managed V7 deployment does not exist.

M0–M5 HEADs: M0 `666118be95ae8e2c946498d6511c29f27b2ec949`; M1 `16bbb5ca404562510c7a3f48875f773318b53a53`; M2 `b81500c82502e378391c24269192d5a07d150676`; M3 `c966d2c0ff5817db213fd5c2b866f56a616a3669`; M4 `54f3888da3bd35f5c844821767a34b1e95d2801d`; M5 `ac59e09edf4f1f642283fab1378c48b976c44c6b`.

## Physical field map

Paths below are in `yvettfang-netizen/phoenix-canonical-db/canonical-db/migrations/canonical/`.

| Logical use | Existing physical evidence | Type / constraint | Health runtime decision |
|---|---|---|---|
| Patient identity reference | Default 0003 `core.people.person_id` | UUID PK, UUIDv7 validation | Reuse Person direction; never create a second Patient identity |
| Family | Default 0003 `core.families.family_id` | UUID PK | Existing ID only; browser cannot generate authority |
| Family relation | Default 0003 `core.family_memberships.membership_id`, `family_id`, `person_id` | Existing memberships | Membership is not access to every patient's records |
| Student | Default 0003 `core.student_profiles.person_id` | PK/FK Person | Not a separate arbitrary student or member identifier |
| Principal | Default 0003 `auth.principals.principal_id`, `person_id` | Existing principal identity | Trusted session resolution, not browser role claims |
| Consent | Default 0003 `consent.grants.consent_id`, family and subject refs | Existing purposes/data classes cover general/education/identity scopes | HEALTH purpose/class binding remains HOLD |
| Guardian | Default 0003 `core.guardian_authorities` | Existing GENERAL/EDUCATION/IDENTITY scopes | Do not infer Health authority or legal capacity from family role |
| Documents | Default 0005 `docs.documents.document_id`, `subject_person_id`; `docs.document_versions` hash/storage key | Existing metadata and retention model | No approval for medical files follows from table existence |
| Client | Candidate 0026 `crm.clients.client_id`, `family_id`; 0031 `crm.client_parties` | UUID; Person/Organization party references | Candidate, unmerged; do not create a competing Client |
| Partner | Candidate 0031 `crm.partner_relationships.partner_relationship_id` | UUID; person or organization partner | Do not pretend `partner_id` is a proven equivalent physical field |
| Lead/source | Candidate 0027 `crm.leads.lead_id`; 0032 `crm.lead_attributions.partner_relationship_id`, `compass_kind` | UUID refs; HEALTH_COMPASS candidate support | Source validation and ownership only on trusted server |
| Consultation | Candidate 0027 `crm.consultations.consultation_id`, `lead_id`, `client_id`, `family_id`, `subject_person_id` | UUID refs; HEALTH domain | HOLD until accepted and deployed API/DDL map exists |
| Deal | Candidate 0027 `crm.deals.deal_id`, `client_id`, `family_id`, `primary_lead_id` | UUID; `estimated_amount numeric(18,2)` and currency | Estimate is not payment, receivable or accounting revenue |
| Service project | Candidate 0028 `service.projects.service_project_id`, `client_id`, `family_id`, `deal_id` | UUID; HEALTH domain | Candidate only; `casework.cases.case_id` is never its substitute |
| Project patient subject | Candidate 0028 `service.project_subjects.project_subject_id`, `subject_person_id`, `data_scope` | Person FK; REFERENCE_ONLY access | Referenced subject alone does not grant medical-record access |
| Project subject authorization | Candidate 0034 `service.project_subject_authorizations.project_subject_authorization_id` | UUID; PATIENT_SELF/LEGAL_GUARDIAN, HEALTH scope, evidence SHA, status/validity | Digest-only candidate evidence is not a complete patient consent system |
| Coordination task | Candidate 0028 `service.tasks.task_id`, `service_project_id`, `assigned_principal_id` | UUID refs | Do not create a second task/project system |
| Delivery | Candidate 0035 `service.delivery_events.delivery_event_id`, `deliverable_id`, `document_version_id` | Existing Docs-reference direction | No raw content/payload/blob in general delivery events |
| Payment / contract / invoice / refund / commission | No accepted mapped authority established by this audit | Missing/approval pending | Finance writes and settlement OFF |
| Hospital / appointment / medical case / claim administration | Health design PR #1 logical candidates only | No approved physical Health binding established | HOLD; no guessed table or FK |

Audit anchors: 0003 blob `910b2f658ffc9e6d01f2064dd836c38bc91d7e73`; M4 0034 blob `4dbae2ae4df4c1b8c8458bb04ecf6f475cac1847`; M5 0035 blob `62c0956d747b0ed002f3ba55092dce7b53f53abf`. M4/M5 acceptance files report PENDING; their synthetic PG16/PG17 tests do not establish production execution.

## Trusted consultation contract (not an implemented endpoint)

Future operation `health.consultation.request` may accept an explicit service intent, locale, source channel, referral locator, current region, destination, coordination requirements and a separate contact-consent reference. It must not accept a browser's assertion of customer ownership, patient authorization, partner commission, canonical role or created identity.

The trusted server must resolve the principal/session, existing canonical relationships, source/partner locator and consent purpose. Anonymous enquiries, if later approved, must use an approved Lead intake contract rather than creating Family/Person/Client in the browser. Contact permission, assessment-summary handoff and patient-record access are separate authorizations. Contact details belong only in the approved intake—not URL parameters, public GEO content or ordinary analytics.

Medical documents use a separate patient-authorized upload flow with short-lived upload authorization, content/size limits, malware checks, object access isolation, retention, server authorization, RLS and audit. Neither ordinary CRM nor a Family Timeline receives raw records, reports, insurance policies or sensitive Compass answers.

Idempotency and events: the source transaction and approved outbox must be atomic; deduplicate by trusted source/aggregate/operation/key, reject same-key/different-payload retries, and deduplicate consumers by event ID. The browser cannot publish consultation, project or financial fact events. Existing `HEALTH_V31_API_CONTRACT.md` and pure `health-integration-contract.ts` remain candidate-only; authorized/persist/upload/pay stay false.

## Projection contracts

**Family OS:** authorized planning state, confirmed appointment reference, coordination-task status, service-project status and reminders. Resolve patient-level scope for each subject, including within one family. Withdrawal must invalidate projections and caches. No raw medical files, full insurance documents or original sensitive answers in a general timeline.

**Founder OS:** authorized acquisition/source counts, partner attribution, consultation conversion, service projects and aggregate delivery status. Contract/payment/cost/commission/profit views remain dependent on accepted Finance authority. Medical access is not implied by Founder/management status; patient material is excluded from the ordinary operating dashboard.

**Partner workspace:** only authenticated, assigned, purpose-bound client/project summaries and their own tasks. No other partner's clients, raw records or finance execution. Current public entry remains controlled preview; no usable sign-in or client-query API is simulated.

## Permission and test matrix

| Actor | Public knowledge | Enquiry draft | Patient documents | Family service summary | Company finance / other partner data |
|---|---|---|---|---|---|
| Anonymous visitor | Yes, candidate noindex | Local only; no submission | DENY | DENY | DENY |
| Family member | Same public access | Local only | DENY without separate patient authority | Future subject-specific grant only; current Health link HOLD | DENY |
| Patient | Same public access | Local only | Future own verified patient flow; current upload OFF | Future authorized projection; current HOLD | DENY |
| Guardian | Same public access | Local only | Future verified legal authority, scope and capacity; current HOLD | No blanket family grant | DENY |
| Assigned partner | Same public access | No URL-derived attribution | DENY by default | Only assigned minimal service scope in future | Other partner data DENY; settlement OFF |
| CRM advisor | Same public access | Future accepted Lead/consultation API | Raw medical records DENY | Purpose-bound minimum handoff only | Finance write DENY |
| Founder/manager | Same public access | Future operating summary | No bypass of patient authorization | Minimum operating projection | Role/entity/project-scoped Finance authority required; current writes OFF |
| AI agent | Same public access | No autonomous clinical or identity write | DENY by default | Explicit audited tool scope only | No payment, commission or role escalation |

Tests reuse synthetic roles, forged URL partner IDs, missing independent consent, missing patient scope and canonical references in `tests/health-integration-contract.test.mjs`. They verify the candidate fail-closed contract, not deployed RLS or real tenant isolation. No real medical data is used.

## Evidence required from Jimson / Founder before binding

Approved V7 environment/catalogue and migration manifest; accepted authority branch/SHAs; PK/FK and Person/member semantics; HEALTH consent and capacity model; M0–M5 acceptance/deployment evidence; trusted intake/write DTOs; RLS and revocation tests; controlled object-storage configuration and retention; outbox authority; Finance/payment/contract mapping; synthetic E2E, audit and recovery evidence. Until then, implementation binding remains HOLD.
