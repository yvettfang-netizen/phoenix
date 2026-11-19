# Database Reuse & Gap Matrix

Source audit date: 2026-11-20 Asia/Shanghai. Main: `9db147ac3a5d135d50b90bfea5a7316ce747d90b`.

This appendix inventories current source and proposed extensions. It does not establish live database state. All 0001–0037 remain unchanged in this candidate. See [README](README.md) for decisions, source links and runtime evidence limits.

## 3. Existing → Reuse → Extend → New → Deprecate matrix

Table names are exact. `Extend` describes proposed work, not installed capability. No current master table is proposed for deletion.

| Existing tables | Reuse | Extend / real gap | New authority when needed | Deprecate |
|---|---|---|---|---|
| `core.people`, `core.student_profiles` (0003) | Sole natural-person/student key | API identity mapping and reviewed dedupe | None | Independent duplicated student identities only after verified mapping/cutover |
| `core.families`, `core.family_memberships` (0003,0026) | Family and membership scope | Member-specific projections; do not give adult child data to payer/parent automatically | None | None |
| `core.guardian_authorities`, `core.civil_capacity_history` (0003,0011) | Verified guardian authority and capacity | Recheck expiry/capacity at reads and task handoffs | None | None |
| `core.organizations` (0026) | Canonical institution/company/partner identity | Public login code and workspace activation profile; don't rename types for UI products | A 1:1 organization-workspace profile only if necessary | None |
| `core.organization_identifiers` (0030) | Official identifier digests and validity | No login-code misuse | None | None |
| `core.organization_relationships` (0030) | Time-bounded commercial links | Explicit hierarchy semantics, cycle checks and delegated administration independent of data access | Avoid parallel org-tree authority | None |
| `core.organization_name_history`, `core.organization_events` (0030) | Immutable organization history | Record new extension actions with compatible event versions | None | None |
| `auth.principals` (0003,0012,0022) | One natural-person principal, separate SERVICE principals | Multi-role capability bindings independent of singular legacy kind | Role bindings linked to existing principal | None; preserve principal IDs and legacy semantics |
| `auth.external_identities` (0017) | Issuer+subject mapping to principal, disable and binder-only lookup | Scoped provisioning for new role model and staff types | Prefer reuse of the external identity provider | None |
| `auth.session_contexts`, `auth.context_exchange_tickets` (0003,0007 onward) | One-use broker tickets, short-lived backend-bound contexts | Company org/role context v2 and cross-family projections without relaxing old functions; re-evaluate membership/revocation on each request | Versioned extension, not a second identity database | None |
| `consent.grants` (0003 onward) | Purpose/data class/subject/grantee validity and withdrawal | Distinct future-contact permission and processor/AI purpose, not implied by DOCUMENT_READ | Contact preference/purpose extension if current grant model cannot express it | None |
| `integration.public_ids`, `integration.legacy_id_mappings` (0003,0030,0037) | Opaque public IDs, reviewed legacy mapping and audit | Mappings for retired sources with conflict review; no automatic people merge by name/email | None | Old source writes only after checked cutover |
| `integration.channel_grants` (0003 onward) | Principal+family+subject+channel expiry/revocation | Reuse subject-scoped boundary in new organization membership context | Explicit org delegation grants only if domain policy requires | None |
| `audit.access_events` (0003 onward) | ALLOW/DENY, request_nonce, actor, resource, rollback-resistant logging | Context-v2 selected role/org, AI extraction and dispatch provenance | Append-only event extension as needed | None |
| `casework.cases`, `casework.advisor_assignments` (0004 onward) | Existing case ownership and valid adviser scope | UI handoff/acceptance with old assignment ended and new scope validated | Avoid duplicate case/task authority | None |
| `education.applications`, `education.application_status_events`, `education.external_facts` (0004,0011,0019) | One institution/program application, official receipt/decision facts | Link to project using workbench extension; broader undergraduate/PhD catalog policy | None | None |
| `education.institution`, `education.program` (0019) | Versioned education masters | Verified catalog updates, application pathway eligibility | None | None |
| `education.academic_record`, `education.score_record`, `education.language_test` (0019) | Evidence-backed academic facts | Human-confirmed AI candidates append via existing write APIs | `education.study_enrollments` for current university study, not a second student profile | None |
| `education.plan`, `education.plan_target` (0019) | Education plan and institution/program targets | Link successor pathway to same student and evidence | None | None |
| `identity.cases`, `identity.case_status_events`, `identity.external_facts` (0004 onward) | Identity domain authority and official facts | Domain-specific UI only; do not treat education workbench as all-purpose sensitive-data access | None | None |
| `docs.documents`, `docs.document_versions` (0005 onward) | One logical doc, immutable versions, digest, object ref, retention and withdrawal | Controlled server fetch, per-use authorization, malware/OCR handling | AI extraction-job/fact-review metadata referencing version IDs | None |
| `docs.submission_manifests`, `docs.submission_items` (0005 onward) | Pinned exact versions, confirmation, receipt linkage | Reuse same authorized versions across submissions | None | None |
| `operations_ref.entitlement_ref`, `operations_ref.entitlement_event` (0021) | References to commercial authority and revocation | Use real source refs when granting courses/services | None | None; do not turn these into a payment ledger |
| `learning.course`, `learning.course_version`, `learning.teacher`, `learning.class` (0022) | Course/teacher/class identity | Expose through Academy staff adapter and existing permissions | None | None |
| `learning.enrollment`, `learning.enrollment_status_event`, `learning.teacher_assignment`, `learning.enrollment_class` (0022) | Course signup, status, teacher/class assignment | Integrate task eligibility and revocation; do not overload with university degree enrollment | ASKWISE task/session/evidence link only if no approved existing authority | None |
| `learning.schedule_slot`, `learning.attendance_record`, `learning.attendance_correction` (0022) | Class sessions and correction history | Academy operational API and authorized summaries | None | None |
| `learning.after_class_card`, `learning.publication`, `learning.stage_report` (0022) | Reviewed/published family-visible learning outputs | ASKWISE verified summary mapping; Aoyu displays confirmed events | Idempotent source-event mapping if necessary | None |
| `crm.clients` (0026) | Commercial client/family relationship | Role-scoped Company projections | None | None |
| `crm.campaigns`, `crm.lead_sources` (0027) | Campaign/source attribution | Partner invitation source linkage | None | None |
| `crm.leads`, `crm.lead_events`, `crm.lead_identity_links` (0027,0036) | Acquisition, human-asserted needs, identity linking | AI suggestions must remain pending review before confirmed need/fact | None | None |
| `crm.consultations`, `crm.consultation_events`, `crm.client_relationships` (0027,0033) | Consultation and client relationship | Staff handoff projection and acceptance | None | None |
| `crm.deals`, `crm.deal_items`, `crm.deal_events`, `crm.deal_project_candidates` (0027,0033) | Sales lifecycle and delivery-opening candidate | New master's deal/project tied to same person | None | None |
| `crm.sales_assignments` (0033) | Sales ownership | Integrate handoff acceptance, due/overdue and live organization membership | None | None |
| `crm.referrals`, `crm.referral_events`, `crm.lead_attributions` (0027,0032,0036) | Historical referral, first/conversion touch | Commission reporting from contract/system authority; no access grant by attribution | None | None |
| `crm.follow_ups` (0027) | Presale follow-up task and assignee | Link immutable study journey/rule occurrence, date revision, suppression/retry and HQ dispatch | Lifecycle rule/occurrence metadata, not a duplicate general task table | None |
| `crm.client_parties`, `crm.client_relationship_events` (0031) | Payer/contact/representative relations | Keep data-read consent independent | None | None |
| `crm.partner_relationships`, `crm.partner_relationship_events` (0031) | Partner type/source/validity | Org member invitations and delegation; no transitive student access | Org membership + role assignment, anchored to core organizations | None |
| `crm.lead_duplicate_candidates`, `crm.lead_merge_decisions` (0032) | Propose/review/reverse lead merge | Identity collision review; never merge people automatically | None | None |
| `crm.acquisition_contract_revisions` (0036) | Versioned source provenance and needs contract | Partner invitation/entry provenance | None | None |
| `service.projects`, `service.project_domains`, `service.project_events` (0028 onward) | Signed service project and state history | Family/Company projection, follow-on project link | None | None |
| `service.project_parties`, `service.project_subjects`, `service.project_subject_authorizations` (0028,0034) | Parties, subjects, sensitive authorization | Respect REFERENCE_ONLY; party/payer status ≠ permission to read documents | None | None |
| `service.project_assignments` (0028,0034) | Project team with validity | Handoff acceptance, partner-limited responsibility and revocation | Only handoff event metadata if needed | None |
| `service.tasks`, `service.task_events` (0028,0035) | Post-sale tasks and transfer history | Idempotent lifecycle linkage after successor project exists | No parallel task authority | None |
| `service.project_milestones`, `service.milestone_templates` (0028,0035) | Delivery timeline/template version | Reuse for education/identity delivery stages | None | None |
| `service.deliverables`, `service.delivery_events` (0028,0035) | Version-pinned deliverables, review/acceptance separation | Approved family presentation and source evidence | None | None |
| `service.workbench_settings`, `workbench_events`, `workbench_commercial_events` (candidate 0038) | Existing candidate stage/revision/idempotency/source-reference pattern | Validate activation rather than assume install; no new financial authority | None | None |
| `service.workbench_applications`, `workbench_materials`, `workbench_task_scope`, `workbench_messages` (candidate 0038) | Existing candidate workbench integration | Multi-project authorized material linkage; explicit partner summaries; current HK master catalogue needs extension for other pathways | Add minimal project-document use link where reviewed | No premature replacement of 0038 |

