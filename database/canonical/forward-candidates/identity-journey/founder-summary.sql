-- Isolated review candidate only. Consumers must use the existing Founder
-- management projection and obtain an approved Identity purpose and cohort policy.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

-- All scope lists originate from the server-side organization grant, never an
-- HTTP caller. The consultation list additionally requires current CRM consent;
-- the project list requires independently authorized renewal service reporting.
CREATE FUNCTION identity.founder_renewal_metrics(
  p_organization uuid, p_cases uuid[], p_consultations jsonb, p_projects jsonb, p_min_households integer
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  as_of date := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
  metrics jsonb;
  has_cases boolean;
BEGIN
  IF p_min_households IS NULL OR p_min_households < 2
    OR p_cases IS NULL OR array_position(p_cases,NULL) IS NOT NULL
    OR jsonb_typeof(p_consultations) IS DISTINCT FROM 'array' OR jsonb_typeof(p_projects) IS DISTINCT FROM 'array'
  THEN RETURN NULL; END IF;
  PERFORM 1 FROM core.organizations o WHERE o.organization_id = p_organization AND o.status = 'ACTIVE' FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  WITH scoped AS MATERIALIZED (
    SELECT c.identity_case_id, c.family_id, c.subject_person_id
    FROM identity.cases c WHERE c.identity_case_id = ANY(p_cases)
  ), current_dates AS MATERIALIZED (
    SELECT s.family_id, r.date_revision_id, r.target_on, r.date_kind, r.date_basis, r.verification, r.document_id
    FROM scoped s JOIN identity.journey_date_revisions r USING (identity_case_id)
    JOIN identity.journey_episodes episode USING (episode_id, identity_case_id)
    WHERE episode.ended_before IS NULL
      AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions later WHERE later.supersedes_id = r.date_revision_id)
  ), deadlines AS (
    SELECT current_date_row.* FROM current_dates current_date_row
    JOIN docs.documents d ON d.document_id = current_date_row.document_id
    WHERE current_date_row.date_kind = 'STAY_EXPIRY' AND current_date_row.date_basis = 'CASE_APPROVAL'
      AND current_date_row.verification = 'VERIFIED' AND current_date_row.target_on BETWEEN as_of AND as_of + 180
      AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
  ), consultation_rows AS MATERIALIZED (
    SELECT DISTINCT s.family_id, need.lead_event_id, lead.lead_id, lead.assigned_principal_id
    FROM jsonb_to_recordset(p_consultations) AS allowed(case_id uuid, lead_event_id uuid)
    JOIN scoped s ON s.identity_case_id = allowed.case_id
    JOIN crm.lead_events need ON need.lead_event_id = allowed.lead_event_id
      AND need.need_subject_person_id = s.subject_person_id AND need.need_domain = 'IDENTITY'
      AND need.need_assertion_kind = 'USER_SELECTED' AND need.event_kind IN ('NEED_ASSERTED','NEED_SUPERSEDED')
    JOIN crm.leads lead ON lead.lead_id = need.lead_id AND lead.family_id = s.family_id AND lead.lead_status <> 'MERGED'
    WHERE NOT EXISTS (SELECT 1 FROM crm.lead_events newer WHERE newer.need_supersedes_event_id = need.lead_event_id)
  ), project_rows AS MATERIALIZED (
    SELECT DISTINCT s.family_id, project.service_project_id, project.project_status
    FROM jsonb_to_recordset(p_projects) AS allowed(case_id uuid, project_id uuid)
    JOIN scoped s ON s.identity_case_id = allowed.case_id
    JOIN service.projects project ON project.service_project_id = allowed.project_id
      AND project.family_id = s.family_id AND project.primary_domain = 'IDENTITY'
    WHERE EXISTS (SELECT 1 FROM service.project_subjects subject WHERE subject.service_project_id = project.service_project_id
      AND subject.family_id = s.family_id AND subject.subject_person_id = s.subject_person_id AND subject.data_scope = 'IDENTITY'
      AND ((subject.status = 'ACTIVE' AND subject.valid_from <= clock_timestamp()
        AND (subject.valid_until IS NULL OR subject.valid_until > clock_timestamp()))
        OR (project.project_status = 'COMPLETED' AND subject.status = 'ENDED' AND subject.valid_until = project.completed_at)))
  ), metric_rows AS (
    SELECT CASE WHEN target_on <= as_of + 90 THEN 'dueWithin90Days' ELSE 'dueIn91To180Days' END AS metric,
      family_id, date_revision_id AS record_id FROM deadlines
    UNION ALL SELECT 'datesToVerify', family_id, date_revision_id FROM current_dates
      WHERE verification = 'REPORTED' AND date_basis <> 'INTERNAL'
    UNION ALL SELECT 'authorizedRenewalConsultations', family_id, lead_event_id FROM consultation_rows
    UNION ALL SELECT 'unassignedIdentityLeads', family_id, lead_id FROM consultation_rows WHERE assigned_principal_id IS NULL
    UNION ALL SELECT 'renewalServicesInProgress', family_id, service_project_id FROM project_rows
      WHERE project_status = 'ACTIVE' AND service.workbench_opened(service_project_id)
    UNION ALL SELECT 'renewalServicesCompleted', family_id, service_project_id FROM project_rows WHERE project_status = 'COMPLETED'
    UNION ALL SELECT 'verifiedRenewalDates', s.family_id, r.date_revision_id FROM scoped s
      JOIN identity.journey_date_revisions r USING (identity_case_id)
      JOIN identity.journey_renewal_attestations a ON a.decision_id = r.official_fact_id
      JOIN docs.documents d ON d.document_id = r.document_id
      WHERE r.verification = 'VERIFIED' AND r.date_kind = 'STAY_EXPIRY'
        AND r.target_on = a.verified_target_on AND r.supersedes_id = a.prior_revision_id
        AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
    UNION ALL SELECT 'reminderFailures', s.family_id, reminder.reminder_id FROM scoped s
      JOIN identity.journey_station_reminders reminder USING (identity_case_id)
      WHERE reminder.state = 'RETRY' AND reminder.attempt_count > 0
        AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions later WHERE later.supersedes_id = reminder.date_revision_id)
    UNION ALL SELECT 'serviceExceptions', p.family_id, p.service_project_id FROM project_rows p
      WHERE p.project_status = 'ON_HOLD' OR (p.project_status = 'ACTIVE' AND EXISTS (
        SELECT 1 FROM service.tasks task WHERE task.service_project_id = p.service_project_id AND task.task_status = 'BLOCKED'))
  ), metric_keys AS (
    SELECT unnest(ARRAY['dueWithin90Days','dueIn91To180Days','datesToVerify','authorizedRenewalConsultations',
      'unassignedIdentityLeads','renewalServicesInProgress','renewalServicesCompleted','verifiedRenewalDates',
      'reminderFailures','serviceExceptions']) AS metric
  ), protected AS (
    SELECT key.metric, CASE WHEN count(DISTINCT value.family_id) >= p_min_households
      THEN count(DISTINCT value.record_id) END AS result
    FROM metric_keys key LEFT JOIN metric_rows value USING (metric) GROUP BY key.metric
  )
  SELECT EXISTS (SELECT 1 FROM scoped), jsonb_object_agg(metric, result) INTO has_cases, metrics FROM protected;
  IF NOT has_cases THEN RETURN jsonb_build_object('status','NO_DATA'); END IF;
  RETURN jsonb_build_object('status','READY','asOfDate',as_of,'metrics',metrics);
END
$fn$;
REVOKE ALL ON FUNCTION identity.founder_renewal_metrics(uuid,uuid[],jsonb,jsonb,integer)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
