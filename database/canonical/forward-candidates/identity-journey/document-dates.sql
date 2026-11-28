-- Review candidate for document-backed identity milestones in an isolated database.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE identity.journey_document_date_attestations (
  attestation_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(attestation_id)),
  identity_case_id uuid NOT NULL,
  episode_id uuid NOT NULL,
  document_version_id uuid NOT NULL REFERENCES docs.document_versions,
  date_kind text NOT NULL CHECK (date_kind IN (
    'VISA_ISSUED','FIRST_ENTRY_DEADLINE','FIRST_ENTRY_ACTUAL','PASSPORT_EXPIRY','TRAVEL_DOCUMENT_EXPIRY'
  )),
  target_on date NOT NULL CHECK (target_on BETWEEN DATE '1900-01-01' AND DATE '9999-12-31'),
  prior_revision_id uuid,
  verified_by uuid NOT NULL REFERENCES auth.principals,
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (episode_id,identity_case_id) REFERENCES identity.journey_episodes(episode_id,identity_case_id),
  FOREIGN KEY (prior_revision_id,identity_case_id,episode_id,date_kind)
    REFERENCES identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind),
  UNIQUE (episode_id,date_kind,document_version_id,target_on),
  UNIQUE (attestation_id,identity_case_id,episode_id,date_kind,target_on)
);
ALTER TABLE identity.journey_document_date_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_document_date_attestations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_document_date_attestations
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
CREATE TRIGGER journey_document_date_attestation_immutable BEFORE UPDATE OR DELETE
  ON identity.journey_document_date_attestations FOR EACH ROW
  EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();

ALTER TABLE identity.journey_date_revisions
  ADD COLUMN document_date_attestation_id uuid UNIQUE,
  ADD CHECK (document_date_attestation_id IS NULL OR (
    verification='VERIFIED' AND date_basis='CASE_APPROVAL' AND document_id IS NOT NULL AND official_fact_id IS NULL
  )),
  ADD FOREIGN KEY (document_date_attestation_id,identity_case_id,episode_id,date_kind,target_on)
    REFERENCES identity.journey_document_date_attestations(attestation_id,identity_case_id,episode_id,date_kind,target_on);

-- Private invoker function. The serving adapter must authenticate the evidence
-- review and hold the separate station-reminder grant for a nonempty plan.
CREATE FUNCTION identity.apply_journey_document_date(
  p_attestation uuid,p_revision uuid,p_recipient uuid,p_offsets smallint[],p_reminder_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  reviewed identity.journey_document_date_attestations%ROWTYPE;
  evidence record;
  expected_document_kind text;
  existing_revision uuid;
  head_count integer;
  valid_heads integer;
  today_hk date;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'ADVISOR' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_revision) IS NOT TRUE OR p_offsets IS NULL OR p_reminder_ids IS NULL
    OR coalesce(array_ndims(p_offsets),1) <> 1 OR coalesce(array_ndims(p_reminder_ids),1) <> 1
    OR cardinality(p_offsets) <> cardinality(p_reminder_ids) OR cardinality(p_offsets) > 8
    OR (p_recipient IS NULL) <> (cardinality(p_offsets)=0)
    OR EXISTS (SELECT 1 FROM unnest(p_offsets) AS offsets(days)
      WHERE days IS NULL OR days NOT IN (365,180,90,60,30,14,7,1))
    OR EXISTS (SELECT 1 FROM unnest(p_reminder_ids) AS ids(id) WHERE core.is_uuid_v7(id) IS NOT TRUE)
    OR (SELECT count(DISTINCT days) FROM unnest(p_offsets) AS offsets(days)) <> cardinality(p_offsets)
    OR (SELECT count(DISTINCT id) FROM unnest(p_reminder_ids) AS ids(id)) <> cardinality(p_reminder_ids)
  THEN RETURN NULL; END IF;

  SELECT * INTO reviewed FROM identity.journey_document_date_attestations
    WHERE attestation_id=p_attestation FOR SHARE;
  IF NOT FOUND OR reviewed.verified_by IS DISTINCT FROM auth.current_principal_id()
    OR reviewed.verified_at > clock_timestamp() THEN RETURN NULL; END IF;
  today_hk := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
  IF (reviewed.date_kind IN ('VISA_ISSUED','FIRST_ENTRY_ACTUAL') AND reviewed.target_on > today_hk)
    OR (p_recipient IS NOT NULL AND reviewed.date_kind NOT IN ('FIRST_ENTRY_DEADLINE','PASSPORT_EXPIRY','TRAVEL_DOCUMENT_EXPIRY'))
  THEN RETURN NULL; END IF;
  expected_document_kind := CASE reviewed.date_kind
    WHEN 'VISA_ISSUED' THEN 'HK_ENTRY_PERMIT'
    WHEN 'FIRST_ENTRY_DEADLINE' THEN 'HK_ENTRY_PERMIT'
    WHEN 'FIRST_ENTRY_ACTUAL' THEN 'HK_FIRST_ENTRY_RECORD'
    WHEN 'PASSPORT_EXPIRY' THEN 'PASSPORT'
    WHEN 'TRAVEL_DOCUMENT_EXPIRY' THEN 'TRAVEL_DOCUMENT'
  END;

  SELECT * INTO evidence FROM identity.lock_journey_residence_evidence(reviewed.identity_case_id,reviewed.document_version_id);
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM 1 FROM docs.documents d JOIN docs.document_versions v USING (document_id)
    WHERE d.document_id=evidence.document_id AND v.version_id=reviewed.document_version_id
      AND d.document_kind=expected_document_kind AND v.created_at <= reviewed.verified_at;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Serialize milestone updates and fence a worker holding an old lease.
  PERFORM 1 FROM identity.journey_episodes e
    WHERE e.episode_id=reviewed.episode_id AND e.identity_case_id=reviewed.identity_case_id
      AND (e.ended_before IS NULL OR NOT identity.journey_reminder_needs_open_episode(reviewed.date_kind))
    FOR UPDATE OF e;
  IF NOT FOUND OR evidence.valid_until <= clock_timestamp() OR auth.write_context_is_live() IS NOT TRUE
    THEN RETURN NULL; END IF;
  IF p_recipient IS NOT NULL THEN
    PERFORM 1 FROM identity.cases c
      JOIN auth.principals p ON p.person_id=c.subject_person_id
      JOIN core.family_memberships m ON m.family_id=c.family_id AND m.person_id=c.subject_person_id
      WHERE c.identity_case_id=reviewed.identity_case_id AND p.principal_id=p_recipient
        AND p.principal_kind='FAMILY' AND p.status='ACTIVE'
        AND m.valid_from <= clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until > clock_timestamp())
      FOR SHARE OF p,m;
    IF NOT FOUND THEN RETURN NULL; END IF;
  END IF;

  SELECT date_revision_id INTO existing_revision FROM identity.journey_date_revisions
    WHERE document_date_attestation_id=p_attestation;
  IF FOUND THEN RETURN existing_revision; END IF;

  SELECT count(*),count(*) FILTER (WHERE r.date_revision_id=reviewed.prior_revision_id)
    INTO head_count,valid_heads
    FROM identity.journey_date_revisions r
    WHERE r.episode_id=reviewed.episode_id AND r.identity_case_id=reviewed.identity_case_id
      AND r.date_kind=reviewed.date_kind
      AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions successor WHERE successor.supersedes_id=r.date_revision_id);
  IF (reviewed.prior_revision_id IS NULL AND head_count <> 0)
    OR (reviewed.prior_revision_id IS NOT NULL AND (head_count <> 1 OR valid_heads <> 1)) THEN RETURN NULL; END IF;
  IF reviewed.prior_revision_id IS NOT NULL THEN
    PERFORM 1 FROM identity.journey_date_revisions WHERE date_revision_id=reviewed.prior_revision_id FOR UPDATE;
  END IF;

  INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
    target_on,verification,document_id,verified_by,supersedes_id,recorded_by,document_date_attestation_id)
  VALUES (p_revision,reviewed.identity_case_id,reviewed.episode_id,reviewed.date_kind,'CASE_APPROVAL',
    reviewed.target_on,'VERIFIED',evidence.document_id,reviewed.verified_by,reviewed.prior_revision_id,reviewed.verified_by,p_attestation);

  UPDATE identity.journey_station_reminders r SET state='CANCELED',retry_not_before=NULL
    WHERE r.episode_id=reviewed.episode_id AND r.state IN ('PENDING','RETRY')
      AND (r.date_revision_id=reviewed.prior_revision_id
        OR (reviewed.date_kind='FIRST_ENTRY_ACTUAL' AND r.date_kind='FIRST_ENTRY_DEADLINE'));

  IF p_recipient IS NOT NULL AND (
    reviewed.date_kind <> 'FIRST_ENTRY_DEADLINE' OR NOT EXISTS (
      SELECT 1 FROM identity.journey_date_revisions r
      WHERE r.episode_id=reviewed.episode_id AND r.date_kind='FIRST_ENTRY_ACTUAL' AND r.verification='VERIFIED'
    )
  ) THEN
    today_hk := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
    INSERT INTO identity.journey_station_reminders AS r(reminder_id,identity_case_id,episode_id,date_revision_id,
      date_kind,target_on,offset_days,recipient_principal_id,state)
    SELECT plan.job_id,reviewed.identity_case_id,reviewed.episode_id,p_revision,
      reviewed.date_kind,reviewed.target_on,plan.offset_days,p_recipient,'PENDING'
    FROM unnest(p_offsets,p_reminder_ids) AS plan(offset_days,job_id)
    WHERE reviewed.target_on - plan.offset_days::integer >= today_hk
    ON CONFLICT (identity_case_id,episode_id,date_kind,target_on,offset_days,recipient_principal_id)
    DO UPDATE SET date_revision_id=EXCLUDED.date_revision_id,state='PENDING',attempt_count=0,retry_not_before=NULL
    WHERE r.state <> 'DELIVERED';
  END IF;

  IF evidence.valid_until <= clock_timestamp() OR auth.write_context_is_live() IS NOT TRUE
    THEN RAISE EXCEPTION USING ERRCODE='PJD01'; END IF;
  PERFORM audit.record_write_decision('VERIFY','IDENTITY_JOURNEY_DOCUMENT_DATE',p_revision,true,'DOCUMENT_DATE_REVISION_APPLIED');
  RETURN p_revision;
EXCEPTION WHEN SQLSTATE 'PJD01' THEN RETURN NULL;
END
$fn$;

REVOKE ALL ON FUNCTION identity.apply_journey_document_date(uuid,uuid,uuid,smallint[],uuid[])
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
