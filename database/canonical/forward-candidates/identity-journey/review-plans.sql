-- Isolated candidate installed after member-profile.sql. Applicants agree a
-- planning date independently of policy, residence totals and case status.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

ALTER TABLE identity.journey_date_revisions
  ADD CHECK (date_kind NOT IN ('INVESTMENT_REVIEW','PERMANENT_RESIDENCE_PREPARATION') OR (
    date_basis='INTERNAL' AND verification='REPORTED' AND official_fact_id IS NULL AND document_id IS NULL
  ));
CREATE TRIGGER journey_review_plan_update_immutable BEFORE UPDATE ON identity.journey_date_revisions
  FOR EACH ROW WHEN (
    OLD.date_kind IN ('INVESTMENT_REVIEW','PERMANENT_RESIDENCE_PREPARATION')
    OR NEW.date_kind IN ('INVESTMENT_REVIEW','PERMANENT_RESIDENCE_PREPARATION')
  ) EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();
CREATE TRIGGER journey_review_plan_delete_immutable BEFORE DELETE ON identity.journey_date_revisions
  FOR EACH ROW WHEN (OLD.date_kind IN ('INVESTMENT_REVIEW','PERMANENT_RESIDENCE_PREPARATION'))
  EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();

-- The trusted adapter must bind a live session and hold a case-bound
-- reminder-purpose grant through commit. There is no granted runtime
-- role until the Canonical consent contract is approved.
CREATE FUNCTION identity.save_journey_review_plan(
  p_case uuid,p_episode uuid,p_revision uuid,p_prior uuid,p_kind text,p_target date,
  p_offsets smallint[],p_job_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  family uuid := auth.current_family_id();
  recipient uuid := auth.current_principal_id();
  prior identity.journey_date_revisions%ROWTYPE;
  current_head uuid;
  head_count integer;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_revision) IS NOT TRUE OR p_kind IS NULL
    OR p_kind NOT IN ('INVESTMENT_REVIEW','PERMANENT_RESIDENCE_PREPARATION')
    OR p_target IS NULL OR p_target NOT BETWEEN DATE '1900-01-01' AND DATE '9999-12-31'
    OR p_offsets IS NULL OR p_job_ids IS NULL
    OR coalesce(array_ndims(p_offsets),1) <> 1 OR coalesce(array_ndims(p_job_ids),1) <> 1
    OR cardinality(p_offsets) <> cardinality(p_job_ids) OR cardinality(p_offsets) > 8
    OR EXISTS (SELECT 1 FROM unnest(p_offsets) AS requested(days)
      WHERE days IS NULL OR days NOT IN (365,180,90,60,30,14,7,1))
    OR EXISTS (SELECT 1 FROM unnest(p_job_ids) AS jobs(id) WHERE core.is_uuid_v7(id) IS NOT TRUE)
    OR (SELECT count(DISTINCT days) FROM unnest(p_offsets) AS requested(days)) <> cardinality(p_offsets)
    OR (SELECT count(DISTINCT id) FROM unnest(p_job_ids) AS jobs(id)) <> cardinality(p_job_ids)
    OR identity.lock_journey_station_self_scope(family,p_case,recipient) IS NOT TRUE
  THEN RETURN NULL; END IF;

  PERFORM 1 FROM identity.journey_episodes e JOIN identity.cases c USING (identity_case_id)
    WHERE e.episode_id=p_episode AND c.identity_case_id=p_case AND c.family_id=family
      AND c.subject_person_id=auth.current_actor_person_id() AND c.status <> 'CLOSED'
      AND e.ended_before IS NULL AND e.started_on <= (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date
      AND (p_kind <> 'INVESTMENT_REVIEW' OR c.case_kind IN ('NEW_CIES','LEGACY_CIES'))
    FOR UPDATE OF e;
  IF NOT FOUND OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;

  SELECT * INTO prior FROM identity.journey_date_revisions WHERE date_revision_id=p_revision;
  IF FOUND THEN
    IF prior.identity_case_id=p_case AND prior.episode_id=p_episode AND prior.date_kind=p_kind
      AND prior.target_on=p_target AND prior.supersedes_id IS NOT DISTINCT FROM p_prior AND prior.recorded_by=recipient
    THEN RETURN p_revision; END IF;
    RETURN NULL;
  END IF;
  IF p_target <= (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date THEN RETURN NULL; END IF;

  SELECT count(*),(array_agg(r.date_revision_id))[1] INTO head_count,current_head
    FROM identity.journey_date_revisions r WHERE r.identity_case_id=p_case AND r.episode_id=p_episode
      AND r.date_kind=p_kind
      AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions successor WHERE successor.supersedes_id=r.date_revision_id);
  IF head_count > 1 OR current_head IS DISTINCT FROM p_prior THEN RETURN NULL; END IF;
  IF p_prior IS NOT NULL THEN
    PERFORM 1 FROM identity.journey_date_revisions WHERE date_revision_id=p_prior FOR UPDATE;
  END IF;

  INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
    target_on,verification,supersedes_id,recorded_by)
  VALUES (p_revision,p_case,p_episode,p_kind,'INTERNAL',p_target,'REPORTED',p_prior,recipient);
  UPDATE identity.journey_station_reminders SET state='CANCELED',retry_not_before=NULL
    WHERE date_revision_id=p_prior AND state IN ('PENDING','RETRY');
  IF cardinality(p_offsets) > 0 THEN
    PERFORM identity.schedule_current_journey_revision(p_revision,recipient,p_offsets,p_job_ids);
  END IF;
  IF auth.write_context_is_live() IS NOT TRUE THEN RAISE EXCEPTION USING ERRCODE='PJP01'; END IF;
  PERFORM audit.record_write_decision('PLAN','IDENTITY_JOURNEY_REVIEW',p_revision,true,'REVIEW_PLAN_RECORDED');
  RETURN p_revision;
EXCEPTION WHEN SQLSTATE 'PJP01' THEN RETURN NULL;
END
$fn$;

REVOKE ALL ON FUNCTION identity.save_journey_review_plan(uuid,uuid,uuid,uuid,text,date,smallint[],uuid[]),
  identity.schedule_current_journey_revision(uuid,uuid,smallint[],uuid[])
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
