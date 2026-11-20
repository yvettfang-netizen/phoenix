BEGIN;

-- DB-03 isolated candidate. This stores review material only. It grants no
-- runtime read/write, contact, notification, task, or project authority.
-- The authoritative student remains core.student_profiles(person_id).

CREATE TABLE education.study_enrollments (
  study_enrollment_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(study_enrollment_id)),
  family_id uuid NOT NULL REFERENCES core.families,
  student_person_id uuid NOT NULL REFERENCES core.student_profiles(person_id),
  institution_id uuid REFERENCES education.institution,
  program_id uuid REFERENCES education.program,
  actual_entry_date date,
  expected_graduation_date date,
  source_system text NOT NULL
    CHECK (source_system ~ '^[a-z][a-z0-9_-]{1,39}$'),
  source_review_ref text NOT NULL
    CHECK (length(btrim(source_review_ref)) BETWEEN 1 AND 200
      AND source_review_ref=btrim(source_review_ref)),
  source_version text NOT NULL
    CHECK (length(btrim(source_version)) BETWEEN 1 AND 100
      AND source_version=btrim(source_version)),
  source_payload_sha256 text NOT NULL
    CHECK (source_payload_sha256 ~ '^[0-9a-f]{64}$'),
  review_state text NOT NULL DEFAULT 'SOURCE_REVIEW_REQUIRED'
    CHECK (review_state = 'SOURCE_REVIEW_REQUIRED'),
  recorded_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT study_enrollments_source_identity_unique
    UNIQUE (source_system,source_review_ref),
  CHECK ((institution_id IS NULL) = (program_id IS NULL)),
  CHECK (expected_graduation_date IS NULL OR actual_entry_date IS NULL
    OR expected_graduation_date > actual_entry_date)
);
CREATE INDEX study_enrollments_student_idx
  ON education.study_enrollments(student_person_id,family_id,recorded_at);

-- Internal-only ingestion contract. It is deliberately not granted to any
-- runtime role. Identical source replay returns the existing row; a changed
-- version or payload for the same source identity is surfaced as a conflict.
CREATE FUNCTION education.record_study_enrollment_review(
  p_study_enrollment_id uuid,p_family_id uuid,p_student_person_id uuid,
  p_institution_id uuid,p_program_id uuid,p_actual_entry_date date,
  p_expected_graduation_date date,p_source_system text,p_source_review_ref text,
  p_source_version text,p_source_payload_sha256 text
) RETURNS TABLE(outcome text,resolved_study_enrollment_id uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog,auth,core,education,audit
AS $fn$
DECLARE v_existing education.study_enrollments%ROWTYPE; v_rows integer;
BEGIN
  IF (auth.is_internal_service() AND auth.current_principal_id() IS NOT NULL
      AND core.is_uuid_v7(p_study_enrollment_id)
      AND p_source_system ~ '^[a-z][a-z0-9_-]{1,39}$'
      AND length(btrim(p_source_review_ref)) BETWEEN 1 AND 200
      AND p_source_review_ref=btrim(p_source_review_ref)
      AND length(btrim(p_source_version)) BETWEEN 1 AND 100
      AND p_source_version=btrim(p_source_version)
      AND p_source_payload_sha256 ~ '^[0-9a-f]{64}$'
      AND ((p_institution_id IS NULL)=(p_program_id IS NULL))
      AND (p_expected_graduation_date IS NULL OR p_actual_entry_date IS NULL
        OR p_expected_graduation_date>p_actual_entry_date)) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('CREATE','STUDY_ENROLLMENT_REVIEW',
      p_study_enrollment_id,false,'SOURCE_REVIEW_INPUT_DENIED');
    RETURN QUERY SELECT 'DENIED'::text,NULL::uuid; RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.family_memberships m
    WHERE m.family_id=p_family_id AND m.person_id=p_student_person_id
      AND m.valid_from<=clock_timestamp()
      AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
  ) THEN
    PERFORM audit.record_write_decision('CREATE','STUDY_ENROLLMENT_REVIEW',
      p_study_enrollment_id,false,'STUDY_MEMBER_NOT_CURRENT');
    RETURN QUERY SELECT 'DENIED'::text,NULL::uuid; RETURN;
  END IF;

  IF p_program_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM education.program p
    WHERE p.program_id=p_program_id AND p.institution_id=p_institution_id
  ) THEN
    PERFORM audit.record_write_decision('CREATE','STUDY_ENROLLMENT_REVIEW',
      p_study_enrollment_id,false,'STUDY_PROGRAM_MISMATCH');
    RETURN QUERY SELECT 'DENIED'::text,NULL::uuid; RETURN;
  END IF;

  INSERT INTO education.study_enrollments(
    study_enrollment_id,family_id,student_person_id,institution_id,program_id,
    actual_entry_date,expected_graduation_date,source_system,source_review_ref,
    source_version,source_payload_sha256,recorded_by_principal_id
  ) VALUES (
    p_study_enrollment_id,p_family_id,p_student_person_id,p_institution_id,p_program_id,
    p_actual_entry_date,p_expected_graduation_date,p_source_system,p_source_review_ref,
    p_source_version,p_source_payload_sha256,auth.current_principal_id()
  )
  ON CONFLICT ON CONSTRAINT study_enrollments_source_identity_unique DO NOTHING;
  GET DIAGNOSTICS v_rows=ROW_COUNT;

  IF v_rows=1 THEN
    PERFORM audit.record_write_decision('CREATE','STUDY_ENROLLMENT_REVIEW',
      p_study_enrollment_id,true,'SOURCE_REVIEW_CREATED');
    RETURN QUERY SELECT 'CREATED'::text,p_study_enrollment_id; RETURN;
  END IF;

  SELECT * INTO v_existing FROM education.study_enrollments
   WHERE source_system=p_source_system AND source_review_ref=p_source_review_ref
   FOR SHARE;
  IF NOT FOUND THEN
    PERFORM audit.record_write_decision('DEDUP','STUDY_ENROLLMENT_REVIEW',
      p_study_enrollment_id,false,'SOURCE_RETRY_REQUIRED');
    RETURN QUERY SELECT 'RETRY_REQUIRED'::text,NULL::uuid; RETURN;
  END IF;

  IF ROW(v_existing.family_id,v_existing.student_person_id,
      v_existing.institution_id,v_existing.program_id,v_existing.actual_entry_date,
      v_existing.expected_graduation_date,v_existing.source_version,
      v_existing.source_payload_sha256)
    IS NOT DISTINCT FROM ROW(p_family_id,p_student_person_id,
      p_institution_id,p_program_id,p_actual_entry_date,
      p_expected_graduation_date,p_source_version,p_source_payload_sha256) THEN
    PERFORM audit.record_write_decision('DEDUP','STUDY_ENROLLMENT_REVIEW',
      v_existing.study_enrollment_id,true,'SOURCE_REPLAY_IDENTICAL');
    RETURN QUERY SELECT 'ALREADY_RECORDED'::text,v_existing.study_enrollment_id; RETURN;
  END IF;

  PERFORM audit.record_write_decision('DEDUP','STUDY_ENROLLMENT_REVIEW',
    v_existing.study_enrollment_id,false,'SOURCE_CONTENT_CONFLICT');
  RETURN QUERY SELECT 'SOURCE_CONFLICT_REVIEW_REQUIRED'::text,
    v_existing.study_enrollment_id;
END
$fn$;

CREATE TABLE education.lifecycle_review_occurrences (
  lifecycle_occurrence_id uuid PRIMARY KEY
    CHECK (core.is_uuid_v7(lifecycle_occurrence_id)),
  study_enrollment_id uuid NOT NULL
    REFERENCES education.study_enrollments,
  journey_cycle_id uuid NOT NULL CHECK (core.is_uuid_v7(journey_cycle_id)),
  rule_key text NOT NULL CHECK (rule_key ~ '^[A-Z0-9_]{2,80}$'),
  proposed_due_at timestamptz,
  review_state text NOT NULL DEFAULT 'REVIEW_REQUIRED'
    CHECK (review_state = 'REVIEW_REQUIRED'),
  created_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (study_enrollment_id,journey_cycle_id,rule_key)
);
CREATE INDEX lifecycle_review_enrollment_idx
  ON education.lifecycle_review_occurrences(study_enrollment_id,created_at);

-- Internal review ingestion only. The stable enrollment/cycle/rule identity is
-- idempotent for an identical due date. A changed due date requires source
-- review rather than silently mutating or duplicating the candidate.
CREATE FUNCTION education.record_lifecycle_review_occurrence(
  p_occurrence_id uuid,p_study_enrollment_id uuid,p_journey_cycle_id uuid,
  p_rule_key text,p_proposed_due_at timestamptz
) RETURNS TABLE(outcome text,resolved_lifecycle_occurrence_id uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog,auth,core,education,audit
AS $fn$
DECLARE v_existing education.lifecycle_review_occurrences%ROWTYPE;
        v_rows integer;
BEGIN
  IF (auth.is_internal_service() AND auth.current_principal_id() IS NOT NULL
      AND core.is_uuid_v7(p_occurrence_id)
      AND core.is_uuid_v7(p_journey_cycle_id)
      AND p_rule_key ~ '^[A-Z0-9_]{2,80}$'
      AND EXISTS (
        SELECT 1 FROM education.study_enrollments s
        WHERE s.study_enrollment_id=p_study_enrollment_id
          AND s.review_state='SOURCE_REVIEW_REQUIRED'
      )) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('CREATE','LIFECYCLE_REVIEW_OCCURRENCE',
      p_occurrence_id,false,'LIFECYCLE_REVIEW_INPUT_DENIED');
    RETURN QUERY SELECT 'DENIED'::text,NULL::uuid; RETURN;
  END IF;

  INSERT INTO education.lifecycle_review_occurrences(
    lifecycle_occurrence_id,study_enrollment_id,journey_cycle_id,rule_key,
    proposed_due_at,created_by_principal_id
  ) VALUES (
    p_occurrence_id,p_study_enrollment_id,p_journey_cycle_id,p_rule_key,
    p_proposed_due_at,auth.current_principal_id()
  ) ON CONFLICT (study_enrollment_id,journey_cycle_id,rule_key) DO NOTHING;
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows=1 THEN
    PERFORM audit.record_write_decision('CREATE','LIFECYCLE_REVIEW_OCCURRENCE',
      p_occurrence_id,true,'LIFECYCLE_REVIEW_CREATED');
    RETURN QUERY SELECT 'CREATED'::text,p_occurrence_id; RETURN;
  END IF;

  SELECT * INTO v_existing FROM education.lifecycle_review_occurrences
   WHERE study_enrollment_id=p_study_enrollment_id
     AND journey_cycle_id=p_journey_cycle_id AND rule_key=p_rule_key
   FOR SHARE;
  IF NOT FOUND THEN
    PERFORM audit.record_write_decision('DEDUP','LIFECYCLE_REVIEW_OCCURRENCE',
      p_occurrence_id,false,'LIFECYCLE_REVIEW_RETRY_REQUIRED');
    RETURN QUERY SELECT 'RETRY_REQUIRED'::text,NULL::uuid; RETURN;
  END IF;
  IF v_existing.proposed_due_at IS NOT DISTINCT FROM p_proposed_due_at THEN
    PERFORM audit.record_write_decision('DEDUP','LIFECYCLE_REVIEW_OCCURRENCE',
      v_existing.lifecycle_occurrence_id,true,'LIFECYCLE_REVIEW_REPLAY_IDENTICAL');
    RETURN QUERY SELECT 'ALREADY_RECORDED'::text,
      v_existing.lifecycle_occurrence_id; RETURN;
  END IF;
  PERFORM audit.record_write_decision('DEDUP','LIFECYCLE_REVIEW_OCCURRENCE',
    v_existing.lifecycle_occurrence_id,false,'LIFECYCLE_REVIEW_DUE_DATE_CONFLICT');
  RETURN QUERY SELECT 'SOURCE_CONFLICT_REVIEW_REQUIRED'::text,
    v_existing.lifecycle_occurrence_id;
END
$fn$;

CREATE FUNCTION education.guard_study_enrollment_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog,core,education
AS $fn$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'STUDY_REVIEW_IMMUTABLE';
  END IF;
  -- 0026 replaced the old family/person UNIQUE with temporal exclusion.
  -- Lock the currently effective relationship during candidate insertion.
  PERFORM 1 FROM core.family_memberships m
    WHERE m.family_id=NEW.family_id AND m.person_id=NEW.student_person_id
      AND m.valid_from<=clock_timestamp()
      AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDY_MEMBER_NOT_CURRENT';
  END IF;
  IF NEW.program_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM education.program p
    WHERE p.program_id=NEW.program_id
      AND p.institution_id=NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'STUDY_PROGRAM_MISMATCH';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER study_enrollment_review_guard
  BEFORE INSERT OR UPDATE OR DELETE ON education.study_enrollments
  FOR EACH ROW EXECUTE FUNCTION education.guard_study_enrollment_review();

CREATE FUNCTION education.guard_lifecycle_review_occurrence() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'LIFECYCLE_REVIEW_IMMUTABLE';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER lifecycle_review_occurrence_guard
  BEFORE UPDATE OR DELETE ON education.lifecycle_review_occurrences
  FOR EACH ROW EXECUTE FUNCTION education.guard_lifecycle_review_occurrence();

ALTER TABLE education.study_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE education.study_enrollments FORCE ROW LEVEL SECURITY;
ALTER TABLE education.lifecycle_review_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE education.lifecycle_review_occurrences FORCE ROW LEVEL SECURITY;
-- Explicit restrictive deny policies keep both USING and WITH CHECK closed,
-- including if a test-only SELECT grant is made. A later approved migration
-- must intentionally replace these before a runtime API can read or write.
CREATE POLICY study_enrollments_runtime_deny
  ON education.study_enrollments AS RESTRICTIVE FOR ALL
  TO phoenix_canonical_app,phoenix_canonical_workspace_reader
  USING (false) WITH CHECK (false);
CREATE POLICY lifecycle_review_runtime_deny
  ON education.lifecycle_review_occurrences AS RESTRICTIVE FOR ALL
  TO phoenix_canonical_app,phoenix_canonical_workspace_reader
  USING (false) WITH CHECK (false);

REVOKE ALL ON education.study_enrollments,
  education.lifecycle_review_occurrences FROM PUBLIC;
REVOKE ALL ON FUNCTION education.guard_study_enrollment_review(),
  education.guard_lifecycle_review_occurrence(),
  education.record_study_enrollment_review(uuid,uuid,uuid,uuid,uuid,date,date,text,text,text,text),
  education.record_lifecycle_review_occurrence(uuid,uuid,uuid,text,timestamptz)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,
    phoenix_canonical_context_binder,phoenix_canonical_workspace_reader,
    phoenix_canonical_migrator;

COMMIT;
