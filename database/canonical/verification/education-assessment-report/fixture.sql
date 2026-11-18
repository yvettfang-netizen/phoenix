-- Contract fixture. The runner applies this after 0037 to a label-owned disposable cluster.
BEGIN;
DO $fixture$
BEGIN
  IF current_setting('phoenix.education_contract_fixture',true) IS DISTINCT FROM 'isolated' THEN
    RAISE EXCEPTION 'SYNTHETIC_FIXTURE_ONLY';
  END IF;
END
$fixture$;

CREATE SCHEMA synthetic_edu_contract;
REVOKE ALL ON SCHEMA synthetic_edu_contract FROM PUBLIC;

-- Inputs represent already-verified decisions in the fixture. Canonical consent.grants
-- needs a separately approved way to record these two purposes and their evidence.
CREATE TABLE synthetic_edu_contract.purpose_evidence (
  evidence_id uuid PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES core.families,
  student_id uuid NOT NULL REFERENCES core.student_profiles(person_id),
  signer_id uuid NOT NULL REFERENCES core.people,
  purpose text NOT NULL,
  copy_version text NOT NULL,
  copy_sha256 text NOT NULL CHECK (copy_sha256 ~ '^[0-9a-f]{64}$'),
  valid_until timestamptz NOT NULL,
  withdrawn_at timestamptz,
  CHECK ((purpose='CORE_ASSESSMENT' AND copy_version='guardian_core_assessment_v1.0.0-rc1')
      OR (purpose='STUDENT_ASSESSMENT_ASSENT' AND copy_version='student_assent_growth_discovery_v1.0.0-rc1'
          AND signer_id=student_id))
);

CREATE TABLE synthetic_edu_contract.assessment (
  assessment_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(assessment_id)),
  family_id uuid NOT NULL REFERENCES core.families,
  student_id uuid NOT NULL REFERENCES core.student_profiles(person_id),
  respondent_id uuid NOT NULL REFERENCES core.people,
  level text NOT NULL CHECK (level IN ('LEVEL_1','LEVEL_2')),
  guardian_evidence_id uuid NOT NULL REFERENCES synthetic_edu_contract.purpose_evidence,
  assent_evidence_id uuid REFERENCES synthetic_edu_contract.purpose_evidence,
  source_assessment_id uuid,
  questionnaire_version text NOT NULL,
  schema_digest text NOT NULL,
  required_ids text[] NOT NULL CHECK (cardinality(required_ids)>0),
  system_result_marker text,
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  answers jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(answers)='object'),
  submitted_at timestamptz,
  submission_key uuid UNIQUE,
  UNIQUE (assessment_id,family_id,student_id),
  FOREIGN KEY (source_assessment_id,family_id,student_id)
    REFERENCES synthetic_edu_contract.assessment(assessment_id,family_id,student_id),
  CHECK ((level='LEVEL_1' AND source_assessment_id IS NULL AND assent_evidence_id IS NULL
          AND system_result_marker IS NULL)
      OR (level='LEVEL_2' AND source_assessment_id IS NOT NULL AND assent_evidence_id IS NOT NULL
          AND respondent_id=student_id AND system_result_marker IS NOT NULL
          AND system_result_marker IN ('FULL_SYSTEM_BANK','SYSTEM_BANK_PENDING'))),
  CHECK ((submitted_at IS NULL)=(submission_key IS NULL))
);

CREATE TABLE synthetic_edu_contract.report_artifact (
  report_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(report_id)),
  assessment_id uuid UNIQUE NOT NULL REFERENCES synthetic_edu_contract.assessment,
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object')
);

-- Opaque order references and their verified access state. Amount and currency are
-- verified by the fixture source call and are absent from these reference tables.
CREATE TABLE synthetic_edu_contract.order_reference (
  order_id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES synthetic_edu_contract.assessment,
  state text NOT NULL CHECK (state IN ('PAID','REFUNDING','REFUNDED'))
);
CREATE UNIQUE INDEX one_open_order_reference
  ON synthetic_edu_contract.order_reference(assessment_id) WHERE state IN ('PAID','REFUNDING');
CREATE TABLE synthetic_edu_contract.source_event (
  event_id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES synthetic_edu_contract.order_reference,
  state text NOT NULL CHECK (state IN ('PAID','REFUNDING','REFUNDED'))
);

CREATE FUNCTION synthetic_edu_contract.has_purpose_evidence(a synthetic_edu_contract.assessment) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE guardian_evidence synthetic_edu_contract.purpose_evidence%ROWTYPE;
BEGIN
  SELECT * INTO guardian_evidence FROM synthetic_edu_contract.purpose_evidence
  WHERE evidence_id=a.guardian_evidence_id AND purpose='CORE_ASSESSMENT'
    AND copy_sha256='334a1e8e455dfef386fcaf491acea3dac23b13c4ece010cfad66d1087f6a84a5'
    AND family_id=a.family_id AND student_id=a.student_id
    AND withdrawn_at IS NULL AND valid_until>clock_timestamp()
  FOR SHARE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM core.guardian_authorities g WHERE g.family_id=a.family_id
      AND g.guardian_person_id=guardian_evidence.signer_id AND g.subject_person_id=a.student_id
      AND g.scope='EDUCATION' AND g.evidence_level='VERIFIED' AND g.lifecycle_status='ACTIVE'
      AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
  ) THEN RETURN false; END IF;
  IF a.level='LEVEL_1' THEN
    RETURN guardian_evidence.signer_id=a.respondent_id;
  END IF;

  PERFORM 1 FROM synthetic_edu_contract.purpose_evidence
  WHERE evidence_id=a.assent_evidence_id AND purpose='STUDENT_ASSESSMENT_ASSENT'
    AND copy_sha256='0ab8f89835cfe500f97944324ab58a3cf2cce27913fc5af5d02461227b2a821d'
    AND family_id=a.family_id AND student_id=a.student_id AND signer_id=a.respondent_id
    AND withdrawn_at IS NULL AND valid_until>clock_timestamp()
  FOR SHARE;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM synthetic_edu_contract.assessment parent
    JOIN synthetic_edu_contract.report_artifact r USING (assessment_id)
    WHERE parent.assessment_id=a.source_assessment_id AND parent.level='LEVEL_1'
      AND parent.submitted_at IS NOT NULL AND parent.guardian_evidence_id=a.guardian_evidence_id
      AND r.result->>'next_step_status'='AVAILABLE'
  );
END
$fn$;

CREATE FUNCTION synthetic_edu_contract.can_respond(a synthetic_edu_contract.assessment) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN coalesce(auth.write_context_is_live() AND auth.current_channel()='FAMILY'
  AND auth.current_family_id()=a.family_id AND auth.current_actor_person_id()=a.respondent_id
  AND core.actor_can_manage_subject(a.student_id,'EDUCATION')
  AND synthetic_edu_contract.has_purpose_evidence(a),false);

CREATE FUNCTION synthetic_edu_contract.read_draft(p_assessment uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a synthetic_edu_contract.assessment%ROWTYPE;
BEGIN
  SELECT * INTO a FROM synthetic_edu_contract.assessment WHERE assessment_id=p_assessment FOR SHARE;
  IF NOT FOUND OR a.submitted_at IS NOT NULL OR NOT synthetic_edu_contract.can_respond(a) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('revision',a.revision,'answers',a.answers,
    'questionnaire_version',a.questionnaire_version,'schema_digest',a.schema_digest);
END
$fn$;

CREATE FUNCTION synthetic_edu_contract.save_draft(p_assessment uuid,p_revision integer,p_answers jsonb) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a synthetic_edu_contract.assessment%ROWTYPE;
BEGIN
  SELECT * INTO a FROM synthetic_edu_contract.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR NOT synthetic_edu_contract.can_respond(a) THEN RETURN 'DENIED'; END IF;
  IF a.submitted_at IS NOT NULL THEN RETURN 'SEALED'; END IF;
  IF a.revision IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN RETURN 'INVALID'; END IF;
  UPDATE synthetic_edu_contract.assessment SET answers=p_answers,revision=revision+1
    WHERE assessment_id=p_assessment;
  RETURN 'SAVED';
END
$fn$;

CREATE FUNCTION synthetic_edu_contract.submit(p_assessment uuid,p_revision integer,p_key uuid) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a synthetic_edu_contract.assessment%ROWTYPE;
BEGIN
  SELECT * INTO a FROM synthetic_edu_contract.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR NOT synthetic_edu_contract.can_respond(a) THEN RETURN 'DENIED'; END IF;
  IF a.revision IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
  IF a.submitted_at IS NOT NULL THEN
    RETURN CASE WHEN a.submission_key=p_key THEN 'REPLAY' ELSE 'SEALED' END;
  END IF;
  IF p_key IS NULL OR NOT (a.answers ?& a.required_ids)
      OR (a.level='LEVEL_2' AND a.answers->>'EGD01' IS DISTINCT FROM 'CONFIRM_STUDENT_SELF') THEN
    RETURN 'INCOMPLETE_OR_EXIT';
  END IF;
  UPDATE synthetic_edu_contract.assessment SET submitted_at=clock_timestamp(),submission_key=p_key
    WHERE assessment_id=p_assessment;
  RETURN 'SUBMITTED';
END
$fn$;

CREATE FUNCTION synthetic_edu_contract.publish_report(p_assessment uuid,p_report uuid,p_artifact jsonb,p_qa_passed boolean) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  a synthetic_edu_contract.assessment%ROWTYPE;
  existing synthetic_edu_contract.report_artifact%ROWTYPE;
  body jsonb := p_artifact->'result';
BEGIN
  SELECT * INTO a FROM synthetic_edu_contract.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR (auth.is_internal_service() AND auth.current_family_id()=a.family_id) IS NOT TRUE
      OR a.submitted_at IS NULL OR NOT synthetic_edu_contract.has_purpose_evidence(a) THEN RETURN 'DENIED'; END IF;
  IF a.level='LEVEL_2' AND NOT EXISTS (SELECT 1 FROM synthetic_edu_contract.order_reference
    WHERE assessment_id=p_assessment AND state='PAID') THEN RETURN 'LOCKED'; END IF;
  IF (p_qa_passed AND jsonb_typeof(body)='object' AND p_artifact->>'assessment_id'=a.assessment_id::text
      AND p_artifact->>'family_id'=a.family_id::text AND p_artifact->>'student_id'=a.student_id::text
      AND p_artifact->>'schema_digest'=a.schema_digest
      AND CASE a.level WHEN 'LEVEL_1' THEN body->>'result_kind'='FAMILY_EDUCATION_SNAPSHOT'
        AND body->>'result_version'='family_education_snapshot_v1.0.0'
        AND body->>'assessment_id'=a.assessment_id::text AND body->>'family_id'=a.family_id::text
        AND body->>'student_id'=a.student_id::text
        ELSE body->>'result_kind'='STUDENT_GROWTH_DISCOVERY'
        AND body->>'result_version'='student_growth_discovery_report_v1.0.0'
        AND body->>'system_result_marker'=a.system_result_marker END) IS NOT TRUE THEN RETURN 'QA_OR_SCOPE_DENIED'; END IF;
  SELECT * INTO existing FROM synthetic_edu_contract.report_artifact WHERE assessment_id=p_assessment;
  IF FOUND THEN
    RETURN CASE WHEN existing.report_id=p_report AND existing.result=body THEN 'REPLAY' ELSE 'CONFLICT' END;
  END IF;
  INSERT INTO synthetic_edu_contract.report_artifact VALUES(p_report,p_assessment,body);
  RETURN 'READY';
END
$fn$;

CREATE FUNCTION synthetic_edu_contract.apply_verified_reference(
  p_assessment uuid,p_order uuid,p_event uuid,p_state text,p_product text,p_amount integer,p_currency text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  a synthetic_edu_contract.assessment%ROWTYPE;
  prior synthetic_edu_contract.source_event%ROWTYPE;
  reference synthetic_edu_contract.order_reference%ROWTYPE;
BEGIN
  SELECT * INTO a FROM synthetic_edu_contract.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR (auth.is_internal_service() AND auth.current_family_id()=a.family_id) IS NOT TRUE THEN
    RETURN 'DENIED';
  END IF;
  IF (a.level='LEVEL_2' AND a.submitted_at IS NOT NULL AND p_order IS NOT NULL AND p_event IS NOT NULL
      AND p_product='EDUCATION_GROWTH_DISCOVERY_SINGLE_V1' AND p_amount=3990 AND p_currency='CNY'
      AND p_state IN ('PAID','REFUNDING','REFUNDED')) IS NOT TRUE THEN RETURN 'STATE_OR_PRODUCT_DENIED'; END IF;
  SELECT * INTO reference FROM synthetic_edu_contract.order_reference WHERE order_id=p_order FOR UPDATE;
  IF FOUND AND reference.assessment_id<>p_assessment THEN RETURN 'SCOPE_DENIED'; END IF;
  SELECT * INTO prior FROM synthetic_edu_contract.source_event WHERE event_id=p_event;
  IF FOUND THEN
    RETURN CASE WHEN prior.order_id=p_order AND prior.state=p_state THEN 'REPLAY' ELSE 'CONFLICT' END;
  END IF;
  IF p_state='PAID' THEN
    IF reference.order_id IS NOT NULL THEN RETURN 'STALE'; END IF;
    IF NOT synthetic_edu_contract.has_purpose_evidence(a) THEN RETURN 'CONSENT_REQUIRED'; END IF;
    IF EXISTS (SELECT 1 FROM synthetic_edu_contract.order_reference
      WHERE assessment_id=p_assessment AND state IN ('PAID','REFUNDING')) THEN RETURN 'ACTIVE_EXISTS'; END IF;
    IF (SELECT count(*) FROM synthetic_edu_contract.order_reference
      WHERE assessment_id=p_assessment AND state='REFUNDED')>=2 THEN RETURN 'REPURCHASE_LIMIT'; END IF;
    INSERT INTO synthetic_edu_contract.order_reference VALUES(p_order,p_assessment,'PAID');
  ELSE
    IF reference.order_id IS NULL THEN RETURN 'REFERENCE_REQUIRED'; END IF;
    IF reference.state='REFUNDED' OR reference.state=p_state THEN RETURN 'STALE'; END IF;
    UPDATE synthetic_edu_contract.order_reference SET state=p_state WHERE order_id=p_order;
  END IF;
  INSERT INTO synthetic_edu_contract.source_event VALUES(p_event,p_order,p_state);
  RETURN p_state;
END
$fn$;

CREATE FUNCTION synthetic_edu_contract.read_report(p_assessment uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  a synthetic_edu_contract.assessment%ROWTYPE;
  r synthetic_edu_contract.report_artifact%ROWTYPE;
BEGIN
  SELECT * INTO a FROM synthetic_edu_contract.assessment WHERE assessment_id=p_assessment FOR SHARE;
  IF NOT FOUND OR a.submitted_at IS NULL OR NOT synthetic_edu_contract.can_respond(a) THEN
    PERFORM audit.record_access_event('READ','SYNTHETIC_EDUCATION_REPORT',NULL,'DENY','SCOPE_OR_CONSENT');
    RETURN NULL;
  END IF;
  IF a.level='LEVEL_2' AND NOT EXISTS (SELECT 1 FROM synthetic_edu_contract.order_reference
    WHERE assessment_id=p_assessment AND state='PAID') THEN
    PERFORM audit.record_access_event('READ','SYNTHETIC_EDUCATION_REPORT',NULL,'DENY','REPORT_LOCKED');
    RETURN jsonb_build_object('assessment_id',a.assessment_id,'result_state','LOCKED',
      'product_code','EDUCATION_GROWTH_DISCOVERY_SINGLE_V1','amount_fen',3990,'currency','CNY',
      'next_action','PURCHASE_TO_UNLOCK_REPORT','system_result_marker',a.system_result_marker);
  END IF;
  SELECT * INTO r FROM synthetic_edu_contract.report_artifact WHERE assessment_id=p_assessment;
  IF NOT FOUND THEN RETURN jsonb_build_object('assessment_id',a.assessment_id,'result_state','PENDING'); END IF;
  PERFORM audit.record_access_event('READ','SYNTHETIC_EDUCATION_REPORT',r.report_id,'ALLOW','SCOPED_ARTIFACT');
  RETURN jsonb_build_object('report_id',r.report_id,'result_state','READY','result',r.result);
END
$fn$;

REVOKE ALL ON ALL TABLES IN SCHEMA synthetic_edu_contract FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA synthetic_edu_contract FROM PUBLIC;
COMMIT;
