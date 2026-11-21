-- Phoenix Academic Studio C0, UNNUMBERED ISOLATED candidate.
-- Six instrument-specific result systems, one student-owned assessment ledger.
-- No old database import, package billing, raw answer copying or cross-scale scores.
-- Not approved to install, merge or deploy.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'phoenix_canonical_dev'
   OR current_setting('phoenix.academic_assessment_candidate',true) IS DISTINCT FROM 'isolated'
 THEN RAISE EXCEPTION 'ACADEMY_C0_DISPOSABLE_CLUSTER_REQUIRED'; END IF;
 IF (SELECT count(*) FROM canonical_migrations.applied)<>37
  OR (SELECT max(migration_name) FROM canonical_migrations.applied)<>'0037_scoped_public_id_projection_read_audit.sql'
 THEN RAISE EXCEPTION 'ACADEMY_C0_FORMAL_BASELINE_REQUIRED'; END IF;
 IF to_regclass('education.assessment_attempt') IS NOT NULL
  OR to_regclass('education.assessment_result') IS NOT NULL
  OR to_regclass('education.assessment_attempt_event') IS NOT NULL
 THEN RAISE EXCEPTION 'ACADEMY_C0_ALREADY_PRESENT'; END IF;
END $guard$;

-- The Student is the owner: do not pin an assessment to one of a Student's
-- possibly several family relationships.
CREATE TABLE education.assessment_attempt (
 attempt_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(attempt_id)),
 student_person_id uuid NOT NULL REFERENCES core.student_profiles(person_id),
 instrument_code text NOT NULL CHECK(instrument_code IN
  ('CAT4','DSE','A_LEVEL','IELTS','JLPT','CANTONESE')),
 instrument_version text NOT NULL CHECK(length(btrim(instrument_version)) BETWEEN 1 AND 80),
 awarding_body text CHECK(awarding_body IS NULL OR length(btrim(awarding_body)) BETWEEN 1 AND 120),
 sitting_date date NOT NULL,
 source_kind text NOT NULL CHECK(source_kind IN
  ('OFFICIAL_RESULT','TEACHER_ASSESSMENT','SELF_REPORTED','AI_PROPOSAL')),
 evidence_document_id uuid REFERENCES docs.documents,
 supersedes_attempt_id uuid REFERENCES education.assessment_attempt,
 recorded_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(supersedes_attempt_id IS NULL OR supersedes_attempt_id<>attempt_id)
);
CREATE INDEX assessment_attempt_student_date_idx
 ON education.assessment_attempt(student_person_id,sitting_date DESC);

-- Each result always carries its original instrument dimension and scale.
-- There is deliberately NO normalized_score, cross-exam ability average, or
-- product-specific raw questionnaire/report payload column.
CREATE TABLE education.assessment_result (
 result_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(result_id)),
 attempt_id uuid NOT NULL REFERENCES education.assessment_attempt,
 dimension_code text NOT NULL CHECK(dimension_code~'^[A-Z][A-Z0-9_]{1,79}$'),
 score_scale_code text NOT NULL CHECK(score_scale_code IN
  ('CAT4_SAS','CAT4_STANINE','CAT4_PERCENTILE','DSE_GRADE',
   'A_LEVEL_GRADE','IELTS_BAND','JLPT_LEVEL','JLPT_SECTION_SCORE',
   'CANTONESE_RUBRIC_LEVEL')),
 numeric_value numeric(12,4),
 text_value text CHECK(text_value IS NULL OR length(btrim(text_value)) BETWEEN 1 AND 80),
 recorded_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((numeric_value IS NULL)<>(text_value IS NULL)),
 CHECK (score_scale_code<>'IELTS_BAND'
  OR (numeric_value BETWEEN 0 AND 9 AND numeric_value*2=trunc(numeric_value*2))),
 UNIQUE(attempt_id,dimension_code,score_scale_code)
);
CREATE INDEX assessment_result_attempt_idx ON education.assessment_result(attempt_id);

-- Proposed lifecycle EVIDENCE only. No app role can insert events or publish
-- assessments in C0. Qualified verifier/consent/licensing approval is a later
-- explicit gate; AI_PROPOSAL must not silently become an official result.
CREATE TABLE education.assessment_attempt_event (
 event_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(event_id)),
 attempt_id uuid NOT NULL REFERENCES education.assessment_attempt,
 event_kind text NOT NULL CHECK(event_kind IN
  ('SUBMITTED','VERIFIED','REVIEWED','PUBLISHED','REJECTED',
   'RETRACTED','SUPERSEDED')),
 reason_code text NOT NULL CHECK(length(btrim(reason_code)) BETWEEN 1 AND 120),
 actor_principal_id uuid NOT NULL REFERENCES auth.principals,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX assessment_attempt_event_history_idx
 ON education.assessment_attempt_event(attempt_id,occurred_at,event_id);

CREATE FUNCTION education.validate_assessment_attempt_evidence() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,education,docs AS $fn$
BEGIN
 IF NEW.evidence_document_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM docs.documents d
    WHERE d.document_id=NEW.evidence_document_id
      AND d.subject_person_id=NEW.student_person_id
      AND d.data_class='EDUCATION' AND d.withdrawn_at IS NULL
 ) THEN RAISE EXCEPTION 'ASSESSMENT_EVIDENCE_SUBJECT_OR_CLASS_MISMATCH'; END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER assessment_attempt_evidence BEFORE INSERT ON education.assessment_attempt
 FOR EACH ROW EXECUTE FUNCTION education.validate_assessment_attempt_evidence();

CREATE FUNCTION education.validate_assessment_result_scale() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,education AS $fn$
DECLARE v_instrument text;v_numeric boolean;
BEGIN
 SELECT instrument_code INTO v_instrument FROM education.assessment_attempt
  WHERE attempt_id=NEW.attempt_id;
 IF v_instrument IS NULL OR NOT (
   (v_instrument='CAT4' AND NEW.score_scale_code IN
     ('CAT4_SAS','CAT4_STANINE','CAT4_PERCENTILE'))
   OR (v_instrument='DSE' AND NEW.score_scale_code='DSE_GRADE')
   OR (v_instrument='A_LEVEL' AND NEW.score_scale_code='A_LEVEL_GRADE')
   OR (v_instrument='IELTS' AND NEW.score_scale_code='IELTS_BAND')
   OR (v_instrument='JLPT' AND NEW.score_scale_code IN
     ('JLPT_LEVEL','JLPT_SECTION_SCORE'))
   OR (v_instrument='CANTONESE'
      AND NEW.score_scale_code='CANTONESE_RUBRIC_LEVEL')
 ) THEN RAISE EXCEPTION 'ASSESSMENT_INSTRUMENT_SCALE_MISMATCH'; END IF;
 v_numeric := NEW.score_scale_code IN
  ('CAT4_SAS','CAT4_STANINE','CAT4_PERCENTILE','IELTS_BAND','JLPT_SECTION_SCORE');
 IF (v_numeric AND NEW.numeric_value IS NULL)
    OR (NOT v_numeric AND NEW.text_value IS NULL) THEN
   RAISE EXCEPTION 'ASSESSMENT_SCORE_VALUE_TYPE_MISMATCH';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER assessment_result_scale BEFORE INSERT ON education.assessment_result
 FOR EACH ROW EXECUTE FUNCTION education.validate_assessment_result_scale();

CREATE TRIGGER assessment_attempt_immutable BEFORE UPDATE OR DELETE ON education.assessment_attempt
 FOR EACH ROW EXECUTE FUNCTION education.reject_append_only_change();
CREATE TRIGGER assessment_result_immutable BEFORE UPDATE OR DELETE ON education.assessment_result
 FOR EACH ROW EXECUTE FUNCTION education.reject_append_only_change();
CREATE TRIGGER assessment_attempt_event_immutable BEFORE UPDATE OR DELETE ON education.assessment_attempt_event
 FOR EACH ROW EXECUTE FUNCTION education.reject_append_only_change();

DO $rls$
DECLARE v_tab text;
BEGIN
 FOREACH v_tab IN ARRAY ARRAY['assessment_attempt','assessment_result','assessment_attempt_event']
 LOOP
  EXECUTE format('ALTER TABLE education.%I ENABLE ROW LEVEL SECURITY',v_tab);
  EXECUTE format('ALTER TABLE education.%I FORCE ROW LEVEL SECURITY',v_tab);
  EXECUTE format('CREATE POLICY %I ON education.%I FOR ALL TO phoenix_canonical_app,phoenix_canonical_reader USING(false) WITH CHECK(false)',
    v_tab||'_no_direct_access',v_tab);
  EXECUTE format('REVOKE ALL ON education.%I FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader',v_tab);
 END LOOP;
END $rls$;
REVOKE EXECUTE ON FUNCTION
 education.validate_assessment_attempt_evidence(),
 education.validate_assessment_result_scale()
 FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader;
COMMIT;
