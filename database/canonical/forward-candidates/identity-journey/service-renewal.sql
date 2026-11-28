-- Isolated integration with the existing Service Project Workbench.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

-- The trusted attestation issuer binds the review task before verification.
-- The existing attestation immutability trigger protects that binding.
ALTER TABLE identity.journey_renewal_attestations
  ADD COLUMN review_task_id uuid UNIQUE REFERENCES service.tasks;

-- Invoker rights. The private adapter must hold the exact result-write and
-- notice-purpose grants before invoking this command on its transaction.
CREATE FUNCTION identity.apply_journey_service_renewal(
  p_decision uuid, p_revision uuid, p_recipient uuid, p_offsets smallint[],
  p_reminder_ids uuid[], p_workbench_revision integer, p_event uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  review_task uuid;
  review_project uuid;
  renewal_subject uuid;
  review_status text;
  existing_revision uuid;
  action_key text;
  action_result jsonb;
  applied_revision uuid;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'ADVISOR' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_revision) IS NOT TRUE OR core.is_uuid_v7(p_event) IS NOT TRUE
    OR p_workbench_revision IS NULL OR p_workbench_revision < 1
  THEN RETURN NULL; END IF;

  SELECT a.review_task_id, t.service_project_id, c.subject_person_id
    INTO review_task, review_project, renewal_subject
    FROM identity.journey_renewal_attestations a
    JOIN identity.journey_date_revisions r ON r.date_revision_id = a.prior_revision_id
    JOIN identity.cases c ON c.identity_case_id = r.identity_case_id
    JOIN service.tasks t ON t.task_id = a.review_task_id
    WHERE a.decision_id = p_decision AND a.verified_by = auth.current_principal_id()
      AND c.family_id = auth.current_family_id()
    FOR SHARE OF a, c;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Preserve Workbench's lock ordering and keep commercial changes out of the
  -- transaction between the explicit opening check and result review.
  action_key := 'identity-renewal-' || encode(sha256(uuid_send(p_decision)), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.current_principal_id()::text || ':' || action_key, 0));
  PERFORM 1 FROM service.projects p
    WHERE p.service_project_id = review_project AND p.family_id = auth.current_family_id()
      AND p.primary_domain = 'IDENTITY' AND p.project_status = 'ACTIVE' AND p.deal_id IS NOT NULL
    FOR UPDATE;
  IF NOT FOUND OR service.workbench_opened(review_project) IS NOT TRUE
    OR service.workbench_writer(review_project) IS NOT TRUE
  THEN RETURN NULL; END IF;
  PERFORM 1 FROM service.workbench_settings WHERE service_project_id = review_project FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  PERFORM 1 FROM service.project_subjects s JOIN core.family_memberships m
    ON m.family_id = s.family_id AND m.person_id = s.subject_person_id
    WHERE s.service_project_id = review_project AND s.family_id = auth.current_family_id()
      AND s.subject_person_id = renewal_subject AND s.data_scope = 'IDENTITY'
      AND s.status = 'ACTIVE' AND s.valid_from <= clock_timestamp()
      AND (s.valid_until IS NULL OR s.valid_until > clock_timestamp())
      AND m.valid_from <= clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until > clock_timestamp())
    FOR SHARE OF s, m;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM 1 FROM service.project_assignments a
    WHERE a.service_project_id = review_project AND a.principal_id = auth.current_principal_id()
      AND a.assignment_role IN ('PROJECT_OWNER','PROJECT_MANAGER','SPECIALIST','COORDINATOR')
      AND a.status = 'ACTIVE' AND a.valid_from <= clock_timestamp()
      AND (a.valid_until IS NULL OR a.valid_until > clock_timestamp())
    FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT t.task_status INTO review_status
    FROM service.tasks t JOIN service.workbench_task_scope s USING (task_id)
    WHERE t.task_id = review_task AND t.service_project_id = review_project
      AND t.task_type = 'WORKBENCH_ACTION' AND t.assigned_principal_id = auth.current_principal_id()
      AND s.subject_person_id = renewal_subject AND s.audience = 'STAFF'
      AND t.task_status IN ('IN_PROGRESS','COMPLETED')
    FOR UPDATE OF t FOR SHARE OF s;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT r.date_revision_id INTO existing_revision FROM identity.journey_date_revisions r
    WHERE r.official_fact_id = p_decision AND r.date_kind = 'STAY_EXPIRY';
  IF (existing_revision IS NOT NULL) IS DISTINCT FROM (review_status = 'COMPLETED')
    THEN RETURN NULL; END IF;
  IF existing_revision IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM service.workbench_events w JOIN service.task_events e ON e.task_event_id = w.event_id
    WHERE w.service_project_id = review_project AND w.subject_person_id = renewal_subject
      AND w.actor_principal_id = auth.current_principal_id() AND w.idempotency_key = action_key
      AND w.command_kind = 'TASK_STATUS' AND e.task_id = review_task
      AND e.to_status = 'COMPLETED' AND e.reason_code = 'IDENTITY_RENEWAL_RESULT_VERIFIED'
  ) THEN RETURN NULL; END IF;

  BEGIN
    action_result := service.workbench_command(review_project, 'TASK_STATUS', jsonb_build_object(
      'revision', p_workbench_revision, 'id', review_task, 'status', 'COMPLETED',
      'reason', 'IDENTITY_RENEWAL_RESULT_VERIFIED'
    ), action_key, p_event);
    IF action_result->>'status' IS DISTINCT FROM 'ALLOW' THEN RETURN NULL; END IF;
    IF (action_result->>'replayed')::boolean IS DISTINCT FROM (existing_revision IS NOT NULL)
      THEN RAISE EXCEPTION USING ERRCODE = 'PJI01'; END IF;
    applied_revision := identity.apply_journey_renewal(p_decision, p_revision, p_recipient, p_offsets, p_reminder_ids);
    IF applied_revision IS DISTINCT FROM coalesce(existing_revision, p_revision)
      THEN RAISE EXCEPTION USING ERRCODE = 'PJI01'; END IF;
    RETURN applied_revision;
  EXCEPTION WHEN SQLSTATE 'PJI01' THEN
    -- The Workbench record must roll back when the decision or scope fails.
    RETURN NULL;
  END;
END
$fn$;

REVOKE ALL ON FUNCTION identity.apply_journey_service_renewal(uuid,uuid,uuid,smallint[],uuid[],integer,uuid)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
