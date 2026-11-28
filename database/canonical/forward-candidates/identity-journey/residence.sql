-- Isolated review candidate. The serving adapter must lock an independent
-- residence-purpose grant for each case in the same transaction.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

ALTER TABLE identity.journey_residence_intervals
  ADD COLUMN record_source text NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN expected_return_on date,
  ADD COLUMN evidence_version_id uuid REFERENCES docs.document_versions,
  ADD COLUMN confirmed_report_id uuid REFERENCES identity.journey_residence_intervals,
  ADD COLUMN official_fact_id uuid REFERENCES identity.external_facts,
  ADD CONSTRAINT journey_residence_source_check CHECK (
    (record_source = 'UNSPECIFIED' AND evidence_version_id IS NULL AND confirmed_report_id IS NULL AND official_fact_id IS NULL)
    OR (record_source = 'SELF_REPORTED' AND document_id IS NULL AND evidence_version_id IS NULL AND confirmed_report_id IS NULL
      AND official_fact_id IS NULL AND location_class IN ('HK','AWAY'))
    OR (record_source = 'ADVISER_VERIFIED' AND document_id IS NOT NULL AND evidence_version_id IS NOT NULL
      AND confirmed_report_id IS NOT NULL AND official_fact_id IS NULL AND location_class IN ('HK','AWAY'))
    OR (record_source = 'OFFICIAL_RECORD' AND document_id IS NOT NULL AND evidence_version_id IS NOT NULL AND official_fact_id IS NOT NULL)
  ),
  ADD CONSTRAINT journey_residence_planned_return_check CHECK (
    expected_return_on IS NULL OR (location_class = 'AWAY' AND isfinite(expected_return_on) AND expected_return_on >= until_before)
  ),
  ADD CONSTRAINT journey_residence_finite_check CHECK (isfinite(from_on) AND isfinite(until_before));

CREATE UNIQUE INDEX journey_residence_self_report_key ON identity.journey_residence_intervals
  (identity_case_id, from_on, until_before, location_class, absence_reason_class, expected_return_on)
  NULLS NOT DISTINCT WHERE record_source = 'SELF_REPORTED';
CREATE UNIQUE INDEX journey_residence_review_key ON identity.journey_residence_intervals
  (confirmed_report_id,evidence_version_id) WHERE record_source = 'ADVISER_VERIFIED';

CREATE FUNCTION identity.list_journey_residence(p_cases uuid[], p_from date, p_until date) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  case_id uuid;
  result jsonb;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE
    OR cardinality(p_cases) NOT BETWEEN 1 AND 32 OR p_cases IS NULL OR array_ndims(p_cases) <> 1
    OR array_position(p_cases,NULL) IS NOT NULL OR p_from IS NULL OR p_until IS NULL
    OR p_from < DATE '1900-01-01' OR p_from > p_until OR p_until > (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date
  THEN RETURN NULL; END IF;
  FOREACH case_id IN ARRAY p_cases LOOP
    IF identity.lock_journey_station_self_scope(auth.current_family_id(),case_id,auth.current_principal_id()) IS NOT TRUE
      THEN RETURN NULL; END IF;
  END LOOP;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r."from" DESC, r.id), '[]') INTO result
  FROM (
    SELECT i.interval_id AS id, i.from_on AS "from", i.until_before AS "untilBefore", i.location_class AS place,
      i.record_source AS source, i.absence_reason_class AS "absenceReason", i.expected_return_on AS "expectedReturnOn"
    FROM identity.journey_residence_intervals i
    JOIN identity.cases c USING (identity_case_id)
    WHERE i.identity_case_id = ANY(p_cases)
      AND i.from_on < p_until AND i.until_before > p_from AND i.until_before <= p_until
      AND (i.document_id IS NULL OR EXISTS (
        SELECT 1 FROM docs.documents d WHERE d.document_id = i.document_id AND d.family_id = c.family_id
          AND d.subject_person_id = c.subject_person_id AND d.data_class = 'IDENTITY_SENSITIVE'
          AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
        FOR SHARE OF d))
      AND (i.official_fact_id IS NULL OR EXISTS (
        SELECT 1 FROM identity.external_facts f WHERE f.fact_id = i.official_fact_id AND f.identity_case_id = i.identity_case_id))
      AND (i.evidence_version_id IS NULL OR EXISTS (
        SELECT 1 FROM docs.document_versions v WHERE v.version_id = i.evidence_version_id AND v.document_id = i.document_id
        FOR SHARE OF v))
    ORDER BY i.from_on DESC, i.interval_id
    LIMIT 513
  ) r;
  IF auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  RETURN result;
END
$fn$;

CREATE FUNCTION identity.record_journey_residence_report(
  p_case uuid, p_interval uuid, p_from date, p_until date,
  p_place text, p_reason text, p_expected_return date
) RETURNS text
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  today_hk date := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_interval) IS NOT TRUE OR p_from IS NULL OR p_until IS NULL
    OR p_from < DATE '1900-01-01' OR p_from >= p_until OR p_until > today_hk
    OR p_place IS NULL OR p_place NOT IN ('HK','AWAY')
    OR (p_reason IS NOT NULL AND (p_place <> 'AWAY' OR p_reason NOT IN ('WORK','STUDY','FAMILY','OTHER','WITHHELD')))
    OR (p_expected_return IS NOT NULL AND (p_place <> 'AWAY' OR NOT isfinite(p_expected_return) OR p_expected_return < p_until))
    OR identity.lock_journey_station_self_scope(auth.current_family_id(),p_case,auth.current_principal_id()) IS NOT TRUE
    OR NOT EXISTS (SELECT 1 FROM identity.cases WHERE identity_case_id = p_case AND status <> 'CLOSED')
  THEN
    PERFORM audit.record_write_decision('CREATE','IDENTITY_JOURNEY_RESIDENCE',p_interval,false,'REPORT_SCOPE_OR_INPUT_DENIED');
    RETURN 'DENIED';
  END IF;

  -- Hold the case-level report lock through the insert and its audit entry.
  PERFORM pg_advisory_xact_lock(hashtextextended('journey-residence:' || p_case::text,0));
  IF auth.write_context_is_live() IS NOT TRUE THEN RETURN 'DENIED'; END IF;
  IF EXISTS (SELECT 1 FROM identity.journey_residence_intervals
    WHERE identity_case_id = p_case AND record_source = 'SELF_REPORTED'
      AND from_on = p_from AND until_before = p_until AND location_class = p_place
      AND absence_reason_class IS NOT DISTINCT FROM p_reason AND expected_return_on IS NOT DISTINCT FROM p_expected_return)
  THEN RETURN 'ALREADY_RECORDED'; END IF;
  IF (SELECT count(*) FROM identity.journey_residence_intervals
    WHERE identity_case_id = p_case AND record_source = 'SELF_REPORTED'
      AND until_before >= make_date(extract(year FROM today_hk)::integer-6,1,1)) >= 512
  THEN RETURN 'LIMIT_REACHED'; END IF;
  INSERT INTO identity.journey_residence_intervals(interval_id,identity_case_id,from_on,until_before,location_class,
    absence_reason_class,expected_return_on,record_source,recorded_by)
    VALUES (p_interval,p_case,p_from,p_until,p_place,p_reason,p_expected_return,'SELF_REPORTED',auth.current_principal_id());
  PERFORM audit.record_write_decision('CREATE','IDENTITY_JOURNEY_RESIDENCE',p_interval,true,'SELF_REPORTED');
  RETURN 'RECORDED';
END
$fn$;

-- An authenticated adviser confirms one report against one already controlled
-- Docs version. Official import needs its own verified source and provider.
CREATE FUNCTION identity.confirm_journey_residence_report(p_report uuid, p_revision uuid, p_document_version uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  report identity.journey_residence_intervals%ROWTYPE;
  target_case identity.cases%ROWTYPE;
  assignment_until timestamptz;
  consent_until timestamptz;
  evidence_document uuid;
  evidence_until timestamptz;
  grant_count integer;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'ADVISOR' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_revision) IS NOT TRUE THEN RETURN 'DENIED'; END IF;
  SELECT * INTO report FROM identity.journey_residence_intervals
    WHERE interval_id = p_report AND record_source = 'SELF_REPORTED' FOR SHARE;
  IF NOT FOUND THEN RETURN 'DENIED'; END IF;
  SELECT * INTO target_case FROM identity.cases
    WHERE identity_case_id = report.identity_case_id AND family_id = auth.current_family_id() AND status <> 'CLOSED' FOR SHARE;
  IF NOT FOUND THEN RETURN 'DENIED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('journey-residence:' || target_case.identity_case_id::text,0));
  PERFORM 1 FROM auth.principals p WHERE p.principal_id = auth.current_principal_id()
    AND p.principal_kind = 'ADVISOR' AND p.status = 'ACTIVE' AND p.person_id = auth.current_actor_person_id() FOR SHARE;
  IF NOT FOUND THEN RETURN 'DENIED'; END IF;
  SELECT a.valid_until INTO assignment_until FROM casework.cases c
    JOIN casework.advisor_assignments a USING (case_id)
    WHERE c.resource_kind = 'IDENTITY_CASE' AND c.resource_id = target_case.identity_case_id
      AND c.family_id = target_case.family_id AND c.subject_person_id = target_case.subject_person_id
      AND c.status = 'OPEN' AND a.lifecycle_status = 'ACTIVE' AND a.revoked_at IS NULL
      AND a.advisor_person_id = auth.current_actor_person_id()
      AND a.valid_from <= clock_timestamp() AND a.valid_until > clock_timestamp()
    ORDER BY a.valid_until DESC LIMIT 1 FOR SHARE OF c, a;
  IF NOT FOUND THEN RETURN 'DENIED'; END IF;
  SELECT min(allowed.expires_at), count(*) INTO consent_until, grant_count
    FROM (VALUES ('IDENTITY_CASE'),('DOCUMENT_READ')) required(purpose)
    CROSS JOIN LATERAL (
      SELECT g.expires_at FROM consent.grants g
      WHERE g.family_id = target_case.family_id AND g.subject_person_id = target_case.subject_person_id
        AND g.grantee_person_id = auth.current_actor_person_id() AND g.purpose = required.purpose
        AND g.data_class = 'IDENTITY_SENSITIVE' AND g.status = 'ACTIVE' AND g.withdrawn_at IS NULL
        AND g.granted_at <= clock_timestamp() AND g.expires_at > clock_timestamp()
      ORDER BY g.expires_at DESC LIMIT 1 FOR SHARE OF g
    ) allowed;
  IF grant_count <> 2 OR docs.can_read_document(target_case.subject_person_id,'IDENTITY_SENSITIVE') IS NOT TRUE THEN
    PERFORM audit.record_write_decision('VERIFY','IDENTITY_JOURNEY_RESIDENCE',p_revision,false,'ADVISER_EVIDENCE_ACCESS_DENIED');
    RETURN 'DENIED';
  END IF;
  SELECT d.document_id,d.retention_until INTO evidence_document,evidence_until
    FROM docs.document_versions v JOIN docs.documents d USING (document_id)
    WHERE v.version_id = p_document_version AND v.created_at <= clock_timestamp()
      AND d.family_id = target_case.family_id AND d.subject_person_id = target_case.subject_person_id
      AND d.data_class = 'IDENTITY_SENSITIVE' AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
    FOR SHARE OF d,v;
  IF NOT FOUND OR least(assignment_until,consent_until,evidence_until) <= clock_timestamp()
    OR auth.write_context_is_live() IS NOT TRUE THEN
    PERFORM audit.record_write_decision('VERIFY','IDENTITY_JOURNEY_RESIDENCE',p_revision,false,'EVIDENCE_OR_AUTHORITY_UNAVAILABLE');
    RETURN 'DENIED';
  END IF;
  INSERT INTO identity.journey_residence_intervals(interval_id,identity_case_id,from_on,until_before,location_class,
    document_id,evidence_version_id,confirmed_report_id,record_source,recorded_by)
    VALUES (p_revision,report.identity_case_id,report.from_on,report.until_before,report.location_class,
      evidence_document,p_document_version,p_report,'ADVISER_VERIFIED',auth.current_principal_id())
    ON CONFLICT (confirmed_report_id,evidence_version_id) WHERE record_source = 'ADVISER_VERIFIED' DO NOTHING;
  IF NOT FOUND THEN RETURN 'ALREADY_RECORDED'; END IF;
  PERFORM audit.record_write_decision('VERIFY','IDENTITY_JOURNEY_RESIDENCE',p_revision,true,'ADVISER_VERIFIED');
  RETURN 'RECORDED';
END
$fn$;

REVOKE ALL ON FUNCTION identity.list_journey_residence(uuid[],date,date),
  identity.record_journey_residence_report(uuid,uuid,date,date,text,text,date),
  identity.confirm_journey_residence_report(uuid,uuid,uuid)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
