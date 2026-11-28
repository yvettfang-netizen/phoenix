-- Review candidate for isolated PostgreSQL only.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

-- Formal external facts do not carry a stay expiry. The reviewed source must
-- bind a date to the exact decision and document version in a private workflow.
CREATE TABLE identity.journey_renewal_attestations (
  decision_id uuid PRIMARY KEY REFERENCES identity.external_facts,
  prior_revision_id uuid NOT NULL REFERENCES identity.journey_date_revisions,
  document_version_id uuid NOT NULL REFERENCES docs.document_versions,
  verified_target_on date NOT NULL CHECK (isfinite(verified_target_on)),
  verified_by uuid NOT NULL REFERENCES auth.principals,
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE identity.journey_renewal_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_renewal_attestations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_renewal_attestations FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader;

CREATE FUNCTION identity.reject_journey_evidence_rewrite() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  RAISE EXCEPTION 'IDENTITY_JOURNEY_EVIDENCE_IMMUTABLE';
END
$fn$;
REVOKE ALL ON FUNCTION identity.reject_journey_evidence_rewrite() FROM PUBLIC;
CREATE TRIGGER journey_renewal_attestation_immutable BEFORE UPDATE OR DELETE ON identity.journey_renewal_attestations
FOR EACH ROW EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();
CREATE TRIGGER journey_verified_date_immutable BEFORE UPDATE OR DELETE ON identity.journey_date_revisions
FOR EACH ROW WHEN (OLD.verification = 'VERIFIED') EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();
CREATE UNIQUE INDEX journey_decision_stay_expiry_once
  ON identity.journey_date_revisions(official_fact_id)
  WHERE date_kind = 'STAY_EXPIRY' AND official_fact_id IS NOT NULL;

-- Invoker rights. A reviewed server adapter must first authorize the decision
-- write and, for nonempty plans, lock a separate notice-purpose authorization.
-- This function checks current Canonical case authority as a second boundary.
CREATE FUNCTION identity.apply_journey_renewal(
  p_decision uuid, p_revision uuid, p_recipient uuid, p_offsets smallint[], p_reminder_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  evidence identity.journey_renewal_attestations%ROWTYPE;
  previous identity.journey_date_revisions%ROWTYPE;
  target_case identity.cases%ROWTYPE;
  reviewed_document uuid;
  document_retention timestamptz;
  assignment_until timestamptz;
  existing_revision uuid;
  plan_day date;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'ADVISOR' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_revision) IS NOT TRUE OR p_offsets IS NULL OR p_reminder_ids IS NULL
    OR coalesce(array_ndims(p_offsets), 1) <> 1 OR coalesce(array_ndims(p_reminder_ids), 1) <> 1
    OR cardinality(p_offsets) <> cardinality(p_reminder_ids) OR cardinality(p_offsets) > 8
    OR (p_recipient IS NULL) <> (cardinality(p_offsets) = 0)
    OR EXISTS (SELECT 1 FROM unnest(p_offsets) AS offsets(value) WHERE
      offsets.value IS NULL OR offsets.value NOT IN (365,180,90,60,30,14,7,1))
    OR EXISTS (SELECT 1 FROM unnest(p_reminder_ids) AS ids(value) WHERE core.is_uuid_v7(ids.value) IS NOT TRUE)
    OR (SELECT count(DISTINCT value) FROM unnest(p_offsets) AS offsets(value)) <> cardinality(p_offsets)
    OR (SELECT count(DISTINCT value) FROM unnest(p_reminder_ids) AS ids(value)) <> cardinality(p_reminder_ids)
  THEN RETURN NULL; END IF;

  SELECT * INTO evidence FROM identity.journey_renewal_attestations WHERE decision_id = p_decision FOR SHARE;
  IF NOT FOUND OR evidence.verified_by IS DISTINCT FROM auth.current_principal_id()
    OR evidence.verified_at > clock_timestamp() THEN RETURN NULL; END IF;
  SELECT * INTO previous FROM identity.journey_date_revisions WHERE date_revision_id = evidence.prior_revision_id;
  IF previous.date_kind IS DISTINCT FROM 'STAY_EXPIRY' OR previous.date_basis IS DISTINCT FROM 'CASE_APPROVAL'
    OR previous.verification IS DISTINCT FROM 'VERIFIED' OR evidence.verified_target_on <= previous.target_on
  THEN RETURN NULL; END IF;

  SELECT * INTO target_case FROM identity.cases WHERE identity_case_id = previous.identity_case_id
    AND family_id = auth.current_family_id() FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM 1 FROM auth.principals p WHERE p.principal_id = evidence.verified_by AND p.principal_kind = 'ADVISOR'
    AND p.status = 'ACTIVE' AND p.person_id = auth.current_actor_person_id() FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT a.valid_until INTO assignment_until FROM casework.cases c JOIN casework.advisor_assignments a USING (case_id)
    WHERE c.resource_kind = 'IDENTITY_CASE' AND c.resource_id = target_case.identity_case_id
      AND c.family_id = target_case.family_id AND c.subject_person_id = target_case.subject_person_id
      AND c.status = 'OPEN' AND a.lifecycle_status = 'ACTIVE' AND a.revoked_at IS NULL
      AND a.advisor_person_id = auth.current_actor_person_id()
      AND a.valid_from <= clock_timestamp() AND a.valid_until > clock_timestamp()
    ORDER BY a.valid_until DESC LIMIT 1 FOR SHARE OF c, a;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM 1 FROM consent.grants g WHERE g.family_id = target_case.family_id AND g.subject_person_id = target_case.subject_person_id
    AND g.grantee_person_id = auth.current_actor_person_id() AND g.purpose = 'IDENTITY_CASE'
    AND g.data_class = 'IDENTITY_SENSITIVE' AND g.status = 'ACTIVE' AND g.withdrawn_at IS NULL
    AND g.granted_at <= clock_timestamp() AND g.expires_at > clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT d.document_id, d.retention_until INTO reviewed_document, document_retention
    FROM identity.external_facts f, docs.document_versions v
    JOIN docs.documents d USING (document_id)
    WHERE f.fact_id = evidence.decision_id AND f.identity_case_id = target_case.identity_case_id
      AND f.fact_kind = 'DECISION' AND f.observed_at <= evidence.verified_at
      AND v.version_id = evidence.document_version_id AND v.created_at <= evidence.verified_at
      AND d.family_id = target_case.family_id AND d.subject_person_id = target_case.subject_person_id
      AND d.data_class = 'IDENTITY_SENSITIVE' AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
    FOR SHARE OF d, v;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Serialize renewals within an episode. A competing delivery uses SKIP
  -- LOCKED on the prior revision and cannot publish from an old lease.
  PERFORM 1 FROM identity.journey_episodes WHERE episode_id = previous.episode_id AND ended_before IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM 1 FROM identity.journey_date_revisions WHERE date_revision_id = previous.date_revision_id FOR UPDATE;
  IF NOT FOUND OR assignment_until <= clock_timestamp() OR document_retention <= clock_timestamp()
    OR identity.can_record_official_fact(target_case.identity_case_id, target_case.subject_person_id) IS NOT TRUE
    OR NOT EXISTS (SELECT 1 FROM consent.grants g WHERE g.family_id = target_case.family_id
      AND g.subject_person_id = target_case.subject_person_id AND g.grantee_person_id = auth.current_actor_person_id()
      AND g.purpose = 'IDENTITY_CASE' AND g.data_class = 'IDENTITY_SENSITIVE' AND g.status = 'ACTIVE'
      AND g.withdrawn_at IS NULL AND g.granted_at <= clock_timestamp() AND g.expires_at > clock_timestamp())
  THEN RETURN NULL; END IF;
  SELECT date_revision_id INTO existing_revision FROM identity.journey_date_revisions
    WHERE official_fact_id = p_decision AND date_kind = 'STAY_EXPIRY'
      AND supersedes_id = previous.date_revision_id AND document_id = reviewed_document
      AND verification = 'VERIFIED' AND target_on = evidence.verified_target_on;
  IF FOUND THEN RETURN existing_revision; END IF;
  IF EXISTS (SELECT 1 FROM identity.journey_date_revisions
    WHERE supersedes_id = previous.date_revision_id OR (official_fact_id = p_decision AND date_kind = 'STAY_EXPIRY'))
    OR EXISTS (SELECT 1 FROM identity.journey_date_revisions head
      WHERE head.identity_case_id = previous.identity_case_id AND head.episode_id = previous.episode_id
        AND head.date_kind = 'STAY_EXPIRY' AND head.verification = 'VERIFIED' AND head.date_revision_id <> previous.date_revision_id
        AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions successor WHERE successor.supersedes_id = head.date_revision_id))
  THEN RETURN NULL; END IF;
  IF p_recipient IS NOT NULL THEN
    PERFORM 1 FROM auth.principals p JOIN core.family_memberships m ON m.person_id = p.person_id
      WHERE p.principal_id = p_recipient AND p.person_id = target_case.subject_person_id
        AND p.principal_kind = 'FAMILY' AND p.status = 'ACTIVE' AND m.family_id = target_case.family_id
        AND m.valid_from <= clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until > clock_timestamp())
      FOR SHARE OF p, m;
    IF NOT FOUND THEN RETURN NULL; END IF;
  END IF;
  plan_day := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;

  INSERT INTO identity.journey_date_revisions(date_revision_id, identity_case_id, episode_id, date_kind, date_basis,
    target_on, verification, official_fact_id, document_id, verified_by, supersedes_id, recorded_by)
  VALUES (p_revision, target_case.identity_case_id, previous.episode_id, 'STAY_EXPIRY', 'CASE_APPROVAL',
    evidence.verified_target_on, 'VERIFIED', p_decision, reviewed_document, evidence.verified_by,
    previous.date_revision_id, auth.current_principal_id());
  UPDATE identity.journey_station_reminders SET state = 'CANCELED', retry_not_before = NULL
    WHERE date_revision_id = previous.date_revision_id AND state IN ('PENDING','RETRY');
  INSERT INTO identity.journey_station_reminders(reminder_id, identity_case_id, episode_id, date_revision_id,
    date_kind, target_on, offset_days, recipient_principal_id, state)
  SELECT plan.reminder_id, target_case.identity_case_id, previous.episode_id, p_revision, 'STAY_EXPIRY',
    evidence.verified_target_on, plan.offset_days, p_recipient, 'PENDING'
  FROM unnest(p_offsets, p_reminder_ids) AS plan(offset_days, reminder_id)
  WHERE evidence.verified_target_on - plan.offset_days::integer >= plan_day;
  PERFORM audit.record_write_decision('VERIFY','IDENTITY_JOURNEY_RENEWAL',p_revision,true,'RENEWAL_REVISION_APPLIED');
  RETURN p_revision;
END
$fn$;
REVOKE ALL ON FUNCTION identity.apply_journey_renewal(uuid,uuid,uuid,smallint[],uuid[])
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader;
COMMIT;
