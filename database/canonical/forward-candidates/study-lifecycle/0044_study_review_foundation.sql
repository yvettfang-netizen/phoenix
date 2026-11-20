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
  source_review_ref text NOT NULL
    CHECK (source_review_ref ~ '^[A-Z0-9_:-]{3,100}$'),
  review_state text NOT NULL DEFAULT 'SOURCE_REVIEW_REQUIRED'
    CHECK (review_state = 'SOURCE_REVIEW_REQUIRED'),
  recorded_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CHECK ((institution_id IS NULL) = (program_id IS NULL)),
  CHECK (expected_graduation_date IS NULL OR actual_entry_date IS NULL
    OR expected_graduation_date > actual_entry_date)
);
CREATE INDEX study_enrollments_student_idx
  ON education.study_enrollments(student_person_id,family_id,recorded_at);

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
  education.guard_lifecycle_review_occurrence() FROM PUBLIC;

COMMIT;
