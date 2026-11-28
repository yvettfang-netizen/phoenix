-- Private import candidate. Review must attest a controlled Docs version and
-- the exact normalized dates and directions from that source.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE identity.journey_travel_attestations (
  evidence_version_id uuid PRIMARY KEY REFERENCES docs.document_versions,
  identity_case_id uuid NOT NULL REFERENCES identity.cases,
  source_kind text NOT NULL CHECK (source_kind = 'HK_IMMD_TRAVEL_STATEMENT'),
  movement_sha256 text NOT NULL CHECK (movement_sha256 ~ '^[0-9a-f]{64}$'),
  verified_by uuid NOT NULL REFERENCES auth.principals,
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (evidence_version_id, identity_case_id)
);
CREATE INDEX journey_travel_attestation_case_idx ON identity.journey_travel_attestations(identity_case_id);

CREATE TABLE identity.journey_travel_movements (
  evidence_version_id uuid NOT NULL REFERENCES identity.journey_travel_attestations,
  occurred_on date NOT NULL CHECK (isfinite(occurred_on) AND occurred_on >= DATE '1900-01-01'),
  direction text NOT NULL CHECK (direction IN ('ARRIVAL','DEPARTURE')),
  PRIMARY KEY (evidence_version_id, occurred_on, direction)
);

ALTER TABLE identity.journey_travel_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_travel_attestations FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_travel_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_travel_movements FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_travel_attestations, identity.journey_travel_movements
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;

CREATE TRIGGER journey_travel_attestation_immutable BEFORE UPDATE OR DELETE ON identity.journey_travel_attestations
  FOR EACH ROW EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();
CREATE TRIGGER journey_travel_movement_immutable BEFORE UPDATE OR DELETE ON identity.journey_travel_movements
  FOR EACH ROW EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();

-- An official residence interval must have travel evidence for this exact
-- case. Official receipt and decision facts have a different meaning.
ALTER TABLE identity.journey_residence_intervals
  ADD COLUMN travel_statement_version_id uuid GENERATED ALWAYS AS
    (CASE WHEN record_source='OFFICIAL_RECORD' THEN evidence_version_id END) STORED,
  ADD FOREIGN KEY (travel_statement_version_id,identity_case_id)
    REFERENCES identity.journey_travel_attestations(evidence_version_id,identity_case_id);

CREATE TRIGGER journey_travel_interval_immutable BEFORE UPDATE OR DELETE ON identity.journey_residence_intervals
  FOR EACH ROW WHEN (OLD.record_source = 'OFFICIAL_RECORD')
  EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();

CREATE FUNCTION identity.import_journey_travel_statement(
  p_case uuid, p_version uuid, p_dates date[], p_directions text[], p_interval_ids uuid[]
) RETURNS text
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  evidence record;
  digest text;
  today_hk date := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'ADVISOR' OR auth.write_context_is_live() IS NOT TRUE
    OR p_case IS NULL OR p_version IS NULL OR p_dates IS NULL OR p_directions IS NULL OR p_interval_ids IS NULL
    OR cardinality(p_dates) NOT BETWEEN 1 AND 512
    OR cardinality(p_dates) <> cardinality(p_directions) OR cardinality(p_dates) <> cardinality(p_interval_ids)
    OR array_ndims(p_dates) <> 1 OR array_ndims(p_directions) <> 1 OR array_ndims(p_interval_ids) <> 1
    OR EXISTS (SELECT 1 FROM unnest(p_dates,p_directions,p_interval_ids) AS entries(occurred_on,direction,interval_id)
      WHERE entries.occurred_on IS NULL OR NOT isfinite(entries.occurred_on) OR entries.occurred_on < DATE '1900-01-01'
        OR entries.occurred_on > today_hk OR entries.direction IS NULL OR entries.direction NOT IN ('ARRIVAL','DEPARTURE')
        OR core.is_uuid_v7(entries.interval_id) IS NOT TRUE)
    OR (SELECT count(DISTINCT id) FROM unnest(p_interval_ids) AS ids(id)) <> cardinality(p_interval_ids)
  THEN RETURN 'DENIED'; END IF;
  SELECT * INTO evidence FROM identity.lock_journey_residence_evidence(p_case,p_version);
  IF NOT FOUND THEN RETURN 'DENIED'; END IF;

  digest := encode(sha256(convert_to(jsonb_build_array(p_dates,p_directions)::text,'UTF8')),'hex');
  PERFORM 1 FROM identity.journey_travel_attestations a
    JOIN docs.document_versions v ON v.version_id=a.evidence_version_id
    JOIN docs.documents d ON d.document_id=v.document_id
    WHERE a.evidence_version_id=p_version AND a.identity_case_id=p_case AND a.movement_sha256=digest
      AND a.verified_by=auth.current_principal_id() AND a.verified_at >= v.created_at AND a.verified_at <= clock_timestamp()
      AND d.document_id=evidence.document_id AND d.document_kind='HK_IMMD_TRAVEL_STATEMENT'
    FOR SHARE OF a;
  IF NOT FOUND OR evidence.valid_until <= clock_timestamp() OR auth.write_context_is_live() IS NOT TRUE
  THEN RETURN 'DENIED'; END IF;
  IF EXISTS (SELECT 1 FROM identity.journey_travel_movements WHERE evidence_version_id=p_version)
    THEN RETURN 'ALREADY_RECORDED'; END IF;

  INSERT INTO identity.journey_travel_movements(evidence_version_id,occurred_on,direction)
    SELECT DISTINCT p_version,occurred_on,direction FROM unnest(p_dates,p_directions) AS entries(occurred_on,direction);

  -- Only whole days strictly between consecutive unambiguous opposite dates.
  -- A date with both directions remains visible but cannot bound an interval.
  -- No timing is inferred before the first or after the last source date.
  WITH daily AS (
    SELECT occurred_on, count(DISTINCT direction)=1 AS single_direction, min(direction) AS direction,
      min(ordinal) AS first_ordinal
    FROM unnest(p_dates,p_directions) WITH ORDINALITY AS entries(occurred_on,direction,ordinal)
    GROUP BY occurred_on
  ), paired AS (
    SELECT *, lead(occurred_on) OVER dates AS until_before,
      lead(single_direction) OVER dates AS next_single, lead(direction) OVER dates AS next_direction
    FROM daily WINDOW dates AS (ORDER BY occurred_on)
  )
  INSERT INTO identity.journey_residence_intervals(interval_id,identity_case_id,from_on,until_before,location_class,
    document_id,evidence_version_id,record_source,recorded_by)
    SELECT ids.interval_id,p_case,paired.occurred_on+1,paired.until_before,
      CASE WHEN paired.direction='ARRIVAL' THEN 'HK' ELSE 'AWAY' END,
      evidence.document_id,p_version,'OFFICIAL_RECORD',auth.current_principal_id()
    FROM paired JOIN unnest(p_interval_ids) WITH ORDINALITY AS ids(interval_id,ordinal)
      ON ids.ordinal=paired.first_ordinal
    WHERE paired.single_direction AND paired.next_single AND paired.direction <> paired.next_direction
      AND paired.occurred_on+1 < paired.until_before;

  IF evidence.valid_until <= clock_timestamp() OR auth.write_context_is_live() IS NOT TRUE
    THEN RAISE EXCEPTION USING ERRCODE = 'PJT01'; END IF;
  PERFORM audit.record_write_decision('IMPORT','IDENTITY_JOURNEY_TRAVEL',p_version,true,'OFFICIAL_TRAVEL_STATEMENT_IMPORTED');
  RETURN 'RECORDED';
EXCEPTION WHEN SQLSTATE 'PJT01' THEN RETURN 'DENIED';
END
$fn$;

-- Only call after the protected residence reader has locked the subject and
-- case scope. The projection never includes the statement or internal IDs.
CREATE FUNCTION identity.collect_journey_travel_movements(p_subject uuid,p_cases uuid[],p_from date,p_until date)
RETURNS jsonb
LANGUAGE sql SET search_path = pg_catalog
AS $fn$
  SELECT coalesce(jsonb_agg(to_jsonb(result) ORDER BY result."on" DESC,result.direction),'[]')
  FROM (
    SELECT DISTINCT m.occurred_on AS "on",m.direction
    FROM identity.journey_travel_movements m JOIN identity.journey_travel_attestations a USING (evidence_version_id)
    JOIN identity.cases c USING (identity_case_id)
    WHERE c.identity_case_id=ANY(p_cases) AND c.family_id=auth.current_family_id() AND c.subject_person_id=p_subject
      AND m.occurred_on BETWEEN p_from AND p_until AND EXISTS (
        SELECT 1 FROM docs.document_versions v JOIN docs.documents d USING (document_id)
        WHERE v.version_id=a.evidence_version_id AND d.family_id=c.family_id AND d.subject_person_id=c.subject_person_id
          AND d.document_kind='HK_IMMD_TRAVEL_STATEMENT' AND d.data_class='IDENTITY_SENSITIVE'
          AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
        FOR SHARE OF d,v)
    ORDER BY m.occurred_on DESC,m.direction LIMIT 513
  ) result;
$fn$;

CREATE FUNCTION identity.list_journey_residence_with_travel(p_cases uuid[],p_from date,p_until date)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  records jsonb;
  movements jsonb;
BEGIN
  records := identity.list_journey_residence(p_cases,p_from,p_until);
  IF records IS NULL THEN RETURN NULL; END IF;
  movements := identity.collect_journey_travel_movements(auth.current_actor_person_id(),p_cases,p_from,p_until);
  IF auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('records',records,'movements',movements);
END
$fn$;

CREATE FUNCTION identity.read_journey_member_residence_with_travel(
  p_subject uuid,p_guardian uuid,p_cases uuid[],p_from date,p_until date
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  records jsonb;
  movements jsonb;
BEGIN
  records := identity.read_journey_member_residence(p_subject,p_guardian,p_cases,p_from,p_until);
  IF records IS NULL THEN RETURN NULL; END IF;
  movements := identity.collect_journey_travel_movements(p_subject,p_cases,p_from,p_until);
  IF identity.lock_journey_profile_access(p_subject,p_guardian,p_cases) IS NOT TRUE THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('records',records,'movements',movements);
END
$fn$;

REVOKE ALL ON FUNCTION identity.import_journey_travel_statement(uuid,uuid,date[],text[],uuid[]),
  identity.collect_journey_travel_movements(uuid,uuid[],date,date),
  identity.list_journey_residence_with_travel(uuid[],date,date),
  identity.read_journey_member_residence_with_travel(uuid,uuid,uuid[],date,date)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
