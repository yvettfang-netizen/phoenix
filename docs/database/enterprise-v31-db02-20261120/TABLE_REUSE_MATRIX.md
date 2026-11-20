# Canonical V3.1 Table Reuse Matrix — DB-02 candidate

Generated from the actual PostgreSQL catalog of a disposable synthetic PG16 cluster.
It contains formal 0001–0037 plus isolated 0042 and 0043; it is **not** a live,
nonproduction, or production deployment inventory. PG17 catalog is verified separately.
Status “Reuse” means DB-02 does not alter that table, not that every future flow is approved.

Candidate SHA-256: `6e043ffdeeb228dac59c605ba763e95f052bdedcdae37b652cba9b6666d18a3a`.
Measured: 102 tables, 315 functions, 92 policies, 68 FORCE RLS tables.

| Table | PK | Columns | FK | UNIQUE | Indexes | RLS | Policies | Existing → action |
|---|---|---:|---:|---:|---:|---|---:|---|
| `audit.access_events` | `access_events_pkey` | 13 | 0 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `auth.context_exchange_tickets` | `context_exchange_tickets_pkey` | 9 | 4 | 0 | 1 | OFF | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `auth.external_identities` | `external_identities_pkey` | 9 | 3 | 0 | 2 | ON | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `auth.principals` | `principals_pkey` | 8 | 3 | 1 | 2 | OFF | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `auth.session_contexts` | `session_contexts_pkey` | 9 | 3 | 0 | 2 | OFF | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `auth.workspace_context_tickets` | `workspace_context_tickets_pkey` | 8 | 4 | 0 | 2 | FORCE | 1 | New: 0042 dependency candidate |
| `auth.workspace_role_bindings` | `workspace_role_bindings_pkey` | 14 | 5 | 0 | 4 | FORCE | 1 | New: 0042 dependency candidate |
| `auth.workspace_session_contexts` | `workspace_session_contexts_pkey` | 15 | 6 | 0 | 2 | FORCE | 1 | New: 0042 dependency candidate |
| `auth.workspace_sessions` | `workspace_sessions_pkey` | 12 | 2 | 1 | 4 | FORCE | 1 | New: 0042 dependency candidate |
| `casework.advisor_assignments` | `advisor_assignments_pkey` | 9 | 4 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `casework.cases` | `cases_pkey` | 11 | 4 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `consent.grants` | `grants_pkey` | 11 | 4 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.civil_capacity_history` | `civil_capacity_history_pkey` | 6 | 2 | 0 | 2 | ON | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.families` | `families_pkey` | 3 | 0 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.family_memberships` | `family_memberships_pkey` | 6 | 2 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.guardian_authorities` | `guardian_authorities_pkey` | 13 | 5 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.organization_events` | `organization_events_pkey` | 9 | 2 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.organization_identifiers` | `organization_identifiers_pkey` | 13 | 3 | 0 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.organization_memberships` | `organization_memberships_pkey` | 16 | 4 | 0 | 3 | FORCE | 1 | New: 0042 dependency candidate |
| `core.organization_name_history` | `organization_name_history_pkey` | 8 | 2 | 0 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.organization_relationships` | `organization_relationships_pkey` | 10 | 4 | 0 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.organization_workspace_profiles` | `organization_workspace_profiles_pkey` | 5 | 2 | 1 | 2 | FORCE | 1 | New: 0042 dependency candidate |
| `core.organizations` | `organizations_pkey` | 11 | 2 | 0 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.people` | `people_pkey` | 3 | 0 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `core.student_profiles` | `student_profiles_pkey` | 2 | 1 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.acquisition_contract_revisions` | `acquisition_contract_revisions_pkey` | 28 | 1 | 1 | 2 | FORCE | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.campaigns` | `campaigns_pkey` | 10 | 2 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.client_parties` | `client_parties_pkey` | 13 | 5 | 0 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.client_relationship_events` | `client_relationship_events_pkey` | 9 | 3 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.client_relationships` | `client_relationships_pkey` | 10 | 4 | 0 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.clients` | `clients_pkey` | 10 | 3 | 2 | 6 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.consultation_events` | `consultation_events_pkey` | 10 | 4 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.consultations` | `consultations_pkey` | 18 | 5 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.deal_events` | `deal_events_pkey` | 13 | 4 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.deal_items` | `deal_items_pkey` | 11 | 2 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.deal_project_candidates` | `deal_project_candidates_pkey` | 8 | 2 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.deals` | `deals_pkey` | 17 | 6 | 1 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.follow_ups` | `follow_ups_pkey` | 13 | 5 | 0 | 1 | FORCE | 1 | Reuse; DB-03 lifecycle extension under review |
| `crm.lead_attributions` | `lead_attributions_pkey` | 22 | 6 | 1 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.lead_duplicate_candidates` | `lead_duplicate_candidates_pkey` | 9 | 4 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.lead_events` | `lead_events_pkey` | 20 | 7 | 0 | 5 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.lead_identity_links` | `lead_identity_links_pkey` | 14 | 7 | 0 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.lead_merge_decisions` | `lead_merge_decisions_pkey` | 10 | 5 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.lead_sources` | `lead_sources_pkey` | 8 | 3 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.leads` | `leads_pkey` | 14 | 9 | 0 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.partner_relationship_events` | `partner_relationship_events_pkey` | 8 | 2 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.partner_relationships` | `partner_relationships_pkey` | 12 | 5 | 0 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.referral_events` | `referral_events_pkey` | 8 | 2 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.referrals` | `referrals_pkey` | 11 | 7 | 0 | 1 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `crm.sales_assignments` | `sales_assignments_pkey` | 11 | 4 | 0 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `docs.document_versions` | `document_versions_pkey` | 7 | 1 | 3 | 4 | ON | 1 | Reuse; DB-04 cross-project rules under review |
| `docs.documents` | `documents_pkey` | 9 | 2 | 0 | 1 | ON | 1 | Reuse; DB-04 cross-project rules under review |
| `docs.submission_items` | `submission_items_pkey` | 4 | 2 | 1 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `docs.submission_manifests` | `submission_manifests_pkey` | 13 | 6 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.academic_record` | `academic_record_pkey` | 9 | 4 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.application_status_events` | `application_status_events_pkey` | 7 | 3 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.applications` | `applications_pkey` | 11 | 4 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.external_facts` | `external_facts_pkey` | 6 | 1 | 1 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.institution` | `institution_pkey` | 7 | 1 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.language_test` | `language_test_pkey` | 9 | 4 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.plan` | `plan_pkey` | 8 | 3 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.plan_target` | `plan_target_pkey` | 6 | 4 | 1 | 3 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.program` | `program_pkey` | 8 | 2 | 0 | 3 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `education.score_record` | `score_record_pkey` | 9 | 3 | 0 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `identity.case_status_events` | `case_status_events_pkey` | 7 | 3 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `identity.cases` | `cases_pkey` | 7 | 2 | 0 | 1 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `identity.external_facts` | `external_facts_pkey` | 6 | 1 | 1 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `integration.channel_grants` | `channel_grants_pkey` | 10 | 5 | 1 | 2 | ON | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `integration.legacy_id_mappings` | `legacy_id_mappings_pkey` | 26 | 5 | 0 | 3 | OFF | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `integration.public_ids` | `public_ids_pkey` | 4 | 0 | 1 | 2 | OFF | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.after_class_card` | `after_class_card_pkey` | 11 | 3 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.attendance_correction` | `attendance_correction_pkey` | 6 | 2 | 0 | 1 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.attendance_record` | `attendance_record_pkey` | 9 | 3 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.class` | `class_pkey` | 9 | 2 | 2 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.course` | `course_pkey` | 6 | 1 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.course_version` | `course_version_pkey` | 8 | 2 | 2 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.enrollment` | `enrollment_pkey` | 7 | 4 | 2 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.enrollment_class` | `enrollment_class_pkey` | 8 | 2 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.enrollment_status_event` | `enrollment_status_event_pkey` | 7 | 2 | 0 | 1 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.publication` | `publication_pkey` | 8 | 4 | 0 | 1 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.schedule_slot` | `schedule_slot_pkey` | 9 | 3 | 1 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.stage_report` | `stage_report_pkey` | 10 | 2 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.teacher` | `teacher_pkey` | 4 | 2 | 0 | 1 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `learning.teacher_assignment` | `teacher_assignment_pkey` | 10 | 3 | 1 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `operations_ref.entitlement_event` | `entitlement_event_pkey` | 8 | 2 | 1 | 3 | FORCE | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `operations_ref.entitlement_ref` | `entitlement_ref_pkey` | 18 | 4 | 2 | 6 | FORCE | 0 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.deliverables` | `deliverables_pkey` | 19 | 8 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.delivery_events` | `delivery_events_pkey` | 10 | 3 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.milestone_templates` | `milestone_templates_pkey` | 10 | 2 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.project_assignment_organization_scopes` | `project_assignment_organization_scopes_pkey` | 4 | 3 | 0 | 2 | FORCE | 1 | New: 0042 dependency candidate |
| `service.project_assignments` | `project_assignments_pkey` | 10 | 4 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.project_domains` | `project_domains_pkey` | 5 | 2 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.project_events` | `project_events_pkey` | 8 | 2 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.project_milestones` | `project_milestones_pkey` | 11 | 3 | 1 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.project_parties` | `project_parties_pkey` | 11 | 5 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.project_subject_authorizations` | `project_subject_authorizations_pkey` | 15 | 6 | 1 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.project_subjects` | `project_subjects_pkey` | 14 | 6 | 1 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.projects` | `projects_pkey` | 15 | 4 | 1 | 4 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.task_events` | `task_events_pkey` | 10 | 4 | 0 | 2 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |
| `service.task_handoff_events` | `task_handoff_events_pkey` | 6 | 2 | 0 | 2 | FORCE | 1 | New: 0043 isolation candidate |
| `service.task_handoff_requests` | `task_handoff_requests_pkey` | 18 | 7 | 2 | 5 | FORCE | 1 | New: 0043 isolation candidate |
| `service.tasks` | `tasks_pkey` | 13 | 4 | 0 | 3 | FORCE | 1 | Reuse unchanged in DB-02; broader business fit not asserted |

No existing table is marked Deprecated. Retirement requires a separate proven replacement.
Proposed DB-03 `education.study_enrollments` and lifecycle occurrence storage, DB-04
document reuse and AI review, and DB-05 learning evidence are not installed by 0043.
