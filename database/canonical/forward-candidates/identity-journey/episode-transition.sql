-- Isolated candidate for applying a reviewed, already-effective decision.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE identity.journey_transition_attestations (
  decision_id uuid PRIMARY KEY REFERENCES identity.external_facts,
  prior_episode_id uuid NOT NULL REFERENCES identity.journey_episodes,
  target_case_id uuid NOT NULL REFERENCES identity.cases,
  document_version_id uuid NOT NULL REFERENCES docs.document_versions,
  effective_on date NOT NULL CHECK (effective_on BETWEEN DATE '1900-01-01' AND DATE '9999-12-31'),
  verified_target_on date NOT NULL CHECK (verified_target_on <= DATE '9999-12-31'),
  verified_by uuid NOT NULL REFERENCES auth.principals,
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (verified_target_on > effective_on)
);
ALTER TABLE identity.journey_transition_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_transition_attestations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_transition_attestations
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
CREATE TRIGGER journey_transition_attestation_immutable BEFORE UPDATE OR DELETE
  ON identity.journey_transition_attestations FOR EACH ROW
  EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();

ALTER TABLE identity.journey_episodes ADD COLUMN transition_decision_id uuid UNIQUE
  REFERENCES identity.journey_transition_attestations;
CREATE FUNCTION identity.protect_applied_journey_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  IF OLD.transition_decision_id IS DISTINCT FROM NEW.transition_decision_id
    OR (OLD.transition_decision_id IS NOT NULL AND
      ROW(OLD.identity_case_id,OLD.started_on) IS DISTINCT FROM ROW(NEW.identity_case_id,NEW.started_on))
    OR (OLD.ended_before IS NOT NULL AND
      ROW(OLD.identity_case_id,OLD.started_on,OLD.ended_before)
        IS DISTINCT FROM ROW(NEW.identity_case_id,NEW.started_on,NEW.ended_before)
      AND EXISTS (
        SELECT 1 FROM identity.journey_transition_attestations a
        JOIN identity.journey_episodes next_stage ON next_stage.transition_decision_id=a.decision_id
        WHERE a.prior_episode_id=OLD.episode_id
      ))
  THEN RAISE EXCEPTION 'IDENTITY_JOURNEY_EVIDENCE_IMMUTABLE'; END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER journey_applied_transition_immutable
  BEFORE UPDATE OF transition_decision_id,identity_case_id,started_on,ended_before ON identity.journey_episodes
  FOR EACH ROW EXECUTE FUNCTION identity.protect_applied_journey_transition();

-- Both member projections already check live Docs retention and case scope.
CREATE FUNCTION identity.has_journey_transition_stay_source(
  p_decision uuid,p_episode uuid,p_case uuid,p_target date,p_document uuid,p_verified_by uuid
) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM identity.journey_transition_attestations a
    JOIN identity.journey_episodes e ON e.transition_decision_id=a.decision_id
    JOIN docs.document_versions v ON v.version_id=a.document_version_id
    JOIN identity.external_facts f ON f.fact_id=a.decision_id
    WHERE a.decision_id=p_decision AND a.target_case_id=p_case
      AND f.identity_case_id=p_case AND f.fact_kind='DECISION'
      AND e.episode_id=p_episode AND e.identity_case_id=p_case AND e.started_on=a.effective_on
      AND a.verified_target_on=p_target AND a.verified_by=p_verified_by AND v.document_id=p_document
  );
$fn$;

-- A trusted invoker must verify the attestation issuer and lock the independent
-- reminder-purpose grant for a nonempty plan. No generic application role can
-- apply the transition. The legal effective date always comes from the case.
CREATE FUNCTION identity.apply_journey_episode_transition(
  p_decision uuid,p_episode uuid,p_revision uuid,p_recipient uuid,p_offsets smallint[],p_job_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  reviewed identity.journey_transition_attestations%ROWTYPE;
  prior identity.journey_episodes%ROWTYPE;
  first_scope record;
  second_scope record;
  scope_until timestamptz;
  existing_episode uuid;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'ADVISOR' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_episode) IS NOT TRUE OR core.is_uuid_v7(p_revision) IS NOT TRUE
    OR p_offsets IS NULL OR p_job_ids IS NULL
    OR coalesce(array_ndims(p_offsets),1) <> 1 OR coalesce(array_ndims(p_job_ids),1) <> 1
    OR cardinality(p_offsets) <> cardinality(p_job_ids) OR cardinality(p_offsets) > 8
    OR (p_recipient IS NULL) <> (cardinality(p_offsets)=0)
    OR EXISTS (SELECT 1 FROM unnest(p_offsets) AS offsets(days)
      WHERE days IS NULL OR days NOT IN (365,180,90,60,30,14,7,1))
    OR EXISTS (SELECT 1 FROM unnest(p_job_ids) AS jobs(id) WHERE core.is_uuid_v7(id) IS NOT TRUE)
    OR (SELECT count(DISTINCT days) FROM unnest(p_offsets) AS offsets(days)) <> cardinality(p_offsets)
    OR (SELECT count(DISTINCT id) FROM unnest(p_job_ids) AS jobs(id)) <> cardinality(p_job_ids)
  THEN RETURN NULL; END IF;

  SELECT * INTO reviewed FROM identity.journey_transition_attestations WHERE decision_id=p_decision FOR SHARE;
  IF NOT FOUND OR reviewed.verified_by IS DISTINCT FROM auth.current_principal_id()
    OR reviewed.verified_at > clock_timestamp()
    OR reviewed.effective_on > (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date THEN RETURN NULL; END IF;
  SELECT e.* INTO prior FROM identity.journey_episodes e
    JOIN identity.cases source ON source.identity_case_id=e.identity_case_id
    JOIN identity.cases target ON target.identity_case_id=reviewed.target_case_id
    WHERE e.episode_id=reviewed.prior_episode_id AND source.identity_case_id<>target.identity_case_id
      AND source.family_id=auth.current_family_id() AND target.family_id=source.family_id
      AND target.subject_person_id=source.subject_person_id
      AND e.started_on < reviewed.effective_on
    FOR SHARE OF source,target;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Use the same order for both case queues even when two reviewers propose
  -- opposing transitions. Each lock checks active casework and both grants.
  SELECT * INTO first_scope FROM identity.lock_journey_residence_evidence(
    least(prior.identity_case_id,reviewed.target_case_id),reviewed.document_version_id);
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO second_scope FROM identity.lock_journey_residence_evidence(
    greatest(prior.identity_case_id,reviewed.target_case_id),reviewed.document_version_id);
  IF NOT FOUND THEN RETURN NULL; END IF;
  scope_until := least(first_scope.valid_until,second_scope.valid_until);
  PERFORM 1 FROM identity.external_facts f, docs.document_versions v
    JOIN docs.documents d USING (document_id)
    WHERE f.fact_id=p_decision AND f.identity_case_id=reviewed.target_case_id AND f.fact_kind='DECISION'
      AND f.observed_at <= reviewed.verified_at
      AND v.version_id=reviewed.document_version_id AND v.created_at <= reviewed.verified_at
      AND d.document_id=first_scope.document_id AND d.document_kind='HK_IDENTITY_TRANSITION_DECISION';
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Fence concurrent result writers and publication from the previous stage.
  SELECT * INTO prior FROM identity.journey_episodes WHERE episode_id=reviewed.prior_episode_id FOR UPDATE;
  IF NOT FOUND OR prior.started_on >= reviewed.effective_on OR scope_until <= clock_timestamp()
    OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  IF p_recipient IS NOT NULL AND identity.lock_journey_station_self_scope(
    auth.current_family_id(),reviewed.target_case_id,p_recipient) IS NOT TRUE THEN RETURN NULL; END IF;

  SELECT e.episode_id INTO existing_episode FROM identity.journey_episodes e
    JOIN identity.journey_date_revisions r USING (episode_id,identity_case_id)
    WHERE e.transition_decision_id=p_decision AND e.identity_case_id=reviewed.target_case_id
      AND e.started_on=reviewed.effective_on AND prior.ended_before=reviewed.effective_on
      AND r.official_fact_id=p_decision AND r.target_on=reviewed.verified_target_on
      AND r.date_kind='STAY_EXPIRY' AND r.verification='VERIFIED' AND r.document_id=first_scope.document_id;
  IF FOUND THEN RETURN existing_episode; END IF;
  IF prior.ended_before IS NOT NULL
    OR EXISTS (SELECT 1 FROM identity.journey_episodes e
      WHERE e.identity_case_id=reviewed.target_case_id AND (e.ended_before IS NULL OR e.ended_before>reviewed.effective_on))
    OR EXISTS (SELECT 1 FROM identity.journey_date_revisions r WHERE r.official_fact_id=p_decision AND r.date_kind='STAY_EXPIRY')
  THEN RETURN NULL; END IF;

  INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by,transition_decision_id)
  VALUES (p_episode,reviewed.target_case_id,reviewed.effective_on,reviewed.verified_by,p_decision);
  INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
    target_on,verification,official_fact_id,document_id,verified_by,recorded_by)
  VALUES (p_revision,reviewed.target_case_id,p_episode,'STAY_EXPIRY','CASE_APPROVAL',reviewed.verified_target_on,
    'VERIFIED',p_decision,first_scope.document_id,reviewed.verified_by,reviewed.verified_by);
  UPDATE identity.journey_episodes SET ended_before=reviewed.effective_on WHERE episode_id=prior.episode_id;
  UPDATE identity.journey_station_reminders r SET state='CANCELED',retry_not_before=NULL
    WHERE r.episode_id=prior.episode_id AND r.state IN ('PENDING','RETRY')
      AND identity.journey_reminder_needs_open_episode(r.date_kind);
  IF p_recipient IS NOT NULL THEN
    PERFORM identity.schedule_current_journey_revision(p_revision,p_recipient,p_offsets,p_job_ids);
  END IF;
  IF scope_until <= clock_timestamp() OR auth.write_context_is_live() IS NOT TRUE
    THEN RAISE EXCEPTION USING ERRCODE='PJE01'; END IF;
  PERFORM audit.record_write_decision('VERIFY','IDENTITY_JOURNEY_TRANSITION',p_episode,true,'IDENTITY_EPISODE_TRANSITION_APPLIED');
  RETURN p_episode;
EXCEPTION WHEN SQLSTATE 'PJE01' THEN RETURN NULL;
END
$fn$;

REVOKE ALL ON FUNCTION identity.apply_journey_episode_transition(uuid,uuid,uuid,uuid,smallint[],uuid[]),
  identity.has_journey_transition_stay_source(uuid,uuid,uuid,date,uuid,uuid),
  identity.protect_applied_journey_transition()
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
