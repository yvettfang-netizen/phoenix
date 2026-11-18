-- Forward candidate for review. The numbered database migration ledger is separate.
-- Only the isolated compatibility runner enables the candidate.
BEGIN;
DO $candidate$
BEGIN
  IF current_setting('phoenix.education_compass_candidate',true) IS DISTINCT FROM 'isolated' THEN
    RAISE EXCEPTION 'education candidate requires isolation';
  END IF;
END
$candidate$;

CREATE ROLE phoenix_education_compass_owner NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE phoenix_education_compass_app NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE phoenix_education_compass_publisher NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE phoenix_education_compass_settlement NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE SCHEMA education_compass AUTHORIZATION phoenix_education_compass_owner;
REVOKE ALL ON SCHEMA education_compass FROM PUBLIC;

GRANT USAGE ON SCHEMA auth,core,audit,operations_ref TO phoenix_education_compass_owner;
GRANT REFERENCES (principal_id) ON auth.principals TO phoenix_education_compass_owner;
GRANT SELECT (principal_id,person_id,principal_kind,status,service_label) ON auth.principals
  TO phoenix_education_compass_owner;
GRANT REFERENCES (family_id) ON core.families TO phoenix_education_compass_owner;
GRANT REFERENCES (person_id) ON core.people,core.student_profiles TO phoenix_education_compass_owner;
GRANT SELECT (person_id) ON core.student_profiles TO phoenix_education_compass_owner;
CREATE POLICY compass_student_lookup_in_bound_family ON core.student_profiles
  FOR SELECT TO phoenix_education_compass_owner USING (core.person_in_current_family(person_id));
GRANT REFERENCES (authority_id) ON core.guardian_authorities TO phoenix_education_compass_owner;
GRANT SELECT (authority_id,family_id,guardian_person_id,subject_person_id,evidence_level,
  scope,lifecycle_status,valid_from,valid_until,revoked_at)
  ON core.guardian_authorities TO phoenix_education_compass_owner;
CREATE POLICY compass_guardian_evidence_in_bound_family ON core.guardian_authorities
  FOR SELECT TO phoenix_education_compass_owner USING (family_id=auth.current_family_id());
GRANT EXECUTE ON FUNCTION auth.write_context_is_live(),auth.current_channel(),auth.current_family_id(),
  auth.current_principal_id(),auth.current_actor_person_id(),auth.is_internal_service(),
  core.is_uuid_v7(uuid),core.actor_can_manage_subject(uuid,text),core.current_actor_is_family_member(),
  core.person_in_current_family(uuid),core.current_civil_capacity(uuid),
  operations_ref.is_operations_service(),audit.record_access_event(text,text,uuid,text,text)
  TO phoenix_education_compass_owner;

SET LOCAL ROLE phoenix_education_compass_owner;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE FUNCTION education_compass.is_current_family_actor() RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN coalesce(auth.write_context_is_live() AND auth.current_channel()='FAMILY'
  AND core.current_actor_is_family_member()
  AND EXISTS (SELECT 1 FROM auth.principals p WHERE p.principal_id=auth.current_principal_id()
    AND p.person_id=auth.current_actor_person_id() AND p.principal_kind='FAMILY' AND p.status='ACTIVE'),false);

CREATE FUNCTION education_compass.is_report_publisher() RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN coalesce(auth.is_internal_service()
  AND EXISTS (SELECT 1 FROM auth.principals p WHERE p.principal_id=auth.current_principal_id()
    AND p.service_label='education_compass_report_service'),false);

CREATE TABLE education_compass.questionnaire_bank (
  level text NOT NULL CHECK (level IN ('LEVEL_1','LEVEL_2')),
  education_system text,
  questionnaire_version text NOT NULL,
  schema_digest text PRIMARY KEY CHECK (schema_digest ~ '^[0-9a-f]{64}$'),
  required_ids text[] NOT NULL CHECK (cardinality(required_ids)>0),
  system_result_marker text,
  UNIQUE NULLS NOT DISTINCT (level,education_system)
);

-- Approved V1.1 pins. The compatibility runner compares every pin to the registry.
INSERT INTO education_compass.questionnaire_bank VALUES
  ('LEVEL_1',NULL,'free_parent_compass_v1.1.0',
    '6c92bd8c8f47f57a0827a5a7c2d8dde745ebe571b366a3a73a0ef8b8950921b3',
    ARRAY['FP01','FP02','FP03','FP04','FP05','FP06','FP07','FP08'],NULL),
  ('LEVEL_2','GAOKAO','education_growth_discovery_v1.1.0',
    '5e5511458d5e5e96b2a464144b096a96437c8f3b6f057cd3c210dc3b22ee8504',
    ARRAY['EGD01','EGD02','EGD03','EGD04','EGD05','EGD06','EGD07','EGD08','EGD09','EGD10','EGD11','EGD12','EGD13','EGD14','EGD15','EGD16','EGD17','EGD18','GK01','GK02'],'FULL_SYSTEM_BANK'),
  ('LEVEL_2','DSE','education_growth_discovery_v1.1.0',
    'a5a80b0a188e9ab781dbb30a4e418df6f8256049ad2e81748ae139e21fdc138b',
    ARRAY['EGD01','EGD02','EGD03','EGD04','EGD05','EGD06','EGD07','EGD08','EGD09','EGD10','EGD11','EGD12','EGD13','EGD14','EGD15','EGD16','EGD17','EGD18','DSE01'],'FULL_SYSTEM_BANK'),
  ('LEVEL_2','IGCSE','education_growth_discovery_v1.1.0',
    'f90f667d51d61f3731fc37f145b0b91607aeea0b50e5fac8102bd861875712c5',
    ARRAY['EGD01','EGD02','EGD03','EGD04','EGD05','EGD06','EGD07','EGD08','EGD09','EGD10','EGD11','EGD12','EGD13','EGD14','EGD15','EGD16','EGD17','EGD18','IG01','IG03'],'FULL_SYSTEM_BANK'),
  ('LEVEL_2','A_LEVEL','education_growth_discovery_v1.1.0',
    '19967a131ad3be69b303a319476c4d0fdf08b002471a5f611d5900033b0a34e1',
    ARRAY['EGD01','EGD02','EGD03','EGD04','EGD05','EGD06','EGD07','EGD08','EGD09','EGD10','EGD11','EGD12','EGD13','EGD14','EGD15','EGD16','EGD17','EGD18','AL01','AL02','AL03'],'FULL_SYSTEM_BANK'),
  ('LEVEL_2','AP_US','education_growth_discovery_v1.1.0',
    '5d7af2bbf79d50011339562420241adb7a19738eaefd96967b47f741fcbd7d70',
    ARRAY['EGD01','EGD02','EGD03','EGD04','EGD05','EGD06','EGD07','EGD08','EGD09','EGD10','EGD11','EGD12','EGD13','EGD14','EGD15','EGD16','EGD17','EGD18','AP02','AP03'],'FULL_SYSTEM_BANK'),
  ('LEVEL_2','IB','education_growth_discovery_v1.1.0',
    '5371c11018f0500138568ec3a1bcd5debf6df0c796be5092f9c0513f79ca5b69',
    ARRAY['EGD01','EGD02','EGD03','EGD04','EGD05','EGD06','EGD07','EGD08','EGD09','EGD10','EGD11','EGD12','EGD13','EGD14','EGD15','EGD16','EGD17','EGD18'],'SYSTEM_BANK_PENDING'),
  ('LEVEL_2','OTHER','education_growth_discovery_v1.1.0',
    'a8b248bd88534e6f4f1e5b8ac99d7a322a9c26c20525f930233e31e474e5e864',
    ARRAY['EGD01','EGD02','EGD03','EGD04','EGD05','EGD06','EGD07','EGD08','EGD09','EGD10','EGD11','EGD12','EGD13','EGD14','EGD15','EGD16','EGD17','EGD18'],'SYSTEM_BANK_PENDING');

CREATE TABLE education_compass.purpose_evidence (
  evidence_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(evidence_id)),
  family_id uuid NOT NULL REFERENCES core.families,
  student_id uuid NOT NULL REFERENCES core.student_profiles(person_id),
  signer_id uuid NOT NULL REFERENCES core.people,
  signer_principal_id uuid NOT NULL REFERENCES auth.principals,
  guardian_authority_id uuid REFERENCES core.guardian_authorities,
  evidence_receipt_id uuid UNIQUE NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  purpose text NOT NULL,
  copy_version text NOT NULL,
  copy_sha256 text NOT NULL CHECK (copy_sha256 ~ '^[0-9a-f]{64}$'),
  valid_until timestamptz NOT NULL CHECK (valid_until>recorded_at),
  withdrawn_at timestamptz,
  CHECK ((purpose='CORE_ASSESSMENT')=(guardian_authority_id IS NOT NULL)),
  CHECK ((purpose='CORE_ASSESSMENT' AND copy_version='guardian_core_assessment_v1.0.0-rc1')
      OR (purpose='STUDENT_ASSESSMENT_ASSENT' AND copy_version='student_assent_growth_discovery_v1.0.0-rc1'
          AND signer_id=student_id))
);

CREATE TABLE education_compass.assessment (
  assessment_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(assessment_id)),
  family_id uuid NOT NULL REFERENCES core.families,
  student_id uuid NOT NULL REFERENCES core.student_profiles(person_id),
  respondent_id uuid NOT NULL REFERENCES core.people,
  level text NOT NULL CHECK (level IN ('LEVEL_1','LEVEL_2')),
  guardian_evidence_id uuid NOT NULL REFERENCES education_compass.purpose_evidence,
  assent_evidence_id uuid REFERENCES education_compass.purpose_evidence,
  source_assessment_id uuid,
  education_system text,
  questionnaire_version text NOT NULL,
  schema_digest text NOT NULL REFERENCES education_compass.questionnaire_bank(schema_digest),
  required_ids text[] NOT NULL CHECK (cardinality(required_ids)>0),
  system_result_marker text,
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  answers jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(answers)='object'),
  submitted_at timestamptz,
  submission_key uuid UNIQUE,
  submission_sha256 text CHECK (submission_sha256 ~ '^[0-9a-f]{64}$'),
  UNIQUE (assessment_id,family_id,student_id),
  FOREIGN KEY (source_assessment_id,family_id,student_id)
    REFERENCES education_compass.assessment(assessment_id,family_id,student_id),
  CHECK ((level='LEVEL_1' AND source_assessment_id IS NULL AND assent_evidence_id IS NULL
          AND system_result_marker IS NULL)
      OR (level='LEVEL_2' AND source_assessment_id IS NOT NULL AND assent_evidence_id IS NOT NULL
          AND respondent_id=student_id AND system_result_marker IS NOT NULL
          AND system_result_marker IN ('FULL_SYSTEM_BANK','SYSTEM_BANK_PENDING'))),
  CHECK ((submitted_at IS NULL)=(submission_key IS NULL)),
  CHECK ((submitted_at IS NULL)=(submission_sha256 IS NULL))
);

CREATE TABLE education_compass.report_artifact (
  report_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(report_id)),
  assessment_id uuid UNIQUE NOT NULL REFERENCES education_compass.assessment,
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object')
);

-- Opaque order references and their verified access state. Amount and currency are
-- checked at the verified-event boundary and are absent from these reference tables.
CREATE TABLE education_compass.order_reference (
  order_id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES education_compass.assessment,
  state text NOT NULL CHECK (state IN ('PAID','REFUNDING','REFUNDED')),
  valid_until timestamptz NOT NULL
);
CREATE UNIQUE INDEX one_open_order_reference
  ON education_compass.order_reference(assessment_id) WHERE state IN ('PAID','REFUNDING');
CREATE TABLE education_compass.source_event (
  event_id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES education_compass.order_reference,
  state text NOT NULL CHECK (state IN ('PAID','REFUNDING','REFUNDED')),
  valid_until timestamptz NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE FUNCTION education_compass.record_purpose(
  p_evidence uuid,p_student uuid,p_purpose text,p_copy_version text,p_copy_sha256 text,
  p_evidence_receipt uuid,p_valid_until timestamptz
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  actor uuid := auth.current_actor_person_id();
  family uuid := auth.current_family_id();
  principal uuid := auth.current_principal_id();
  guardianship uuid;
  expires_at timestamptz := p_valid_until;
  prior education_compass.purpose_evidence%ROWTYPE;
BEGIN
  IF (education_compass.is_current_family_actor() AND core.is_uuid_v7(p_evidence)
      AND p_evidence_receipt IS NOT NULL AND EXISTS (SELECT 1 FROM core.student_profiles s WHERE s.person_id=p_student)
      AND isfinite(p_valid_until) AND p_valid_until>clock_timestamp()) IS NOT TRUE THEN RETURN 'DENIED'; END IF;

  IF (p_purpose='CORE_ASSESSMENT' AND p_copy_version='guardian_core_assessment_v1.0.0-rc1'
      AND p_copy_sha256='334a1e8e455dfef386fcaf491acea3dac23b13c4ece010cfad66d1087f6a84a5') IS TRUE THEN
    SELECT g.authority_id,least(p_valid_until,g.valid_until) INTO guardianship,expires_at
    FROM core.guardian_authorities g
    WHERE g.family_id=family AND g.subject_person_id=p_student AND g.guardian_person_id=actor
      AND g.scope='EDUCATION' AND g.evidence_level='VERIFIED' AND g.lifecycle_status='ACTIVE'
      AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
    ORDER BY g.valid_until DESC,g.authority_id LIMIT 1;
    IF NOT FOUND THEN RETURN 'DENIED'; END IF;
  ELSIF (p_purpose='STUDENT_ASSESSMENT_ASSENT' AND actor=p_student
      AND p_copy_version='student_assent_growth_discovery_v1.0.0-rc1'
      AND p_copy_sha256='0ab8f89835cfe500f97944324ab58a3cf2cce27913fc5af5d02461227b2a821d') IS NOT TRUE THEN
    RETURN 'DENIED';
  END IF;

  INSERT INTO education_compass.purpose_evidence(
    evidence_id,family_id,student_id,signer_id,signer_principal_id,guardian_authority_id,
    evidence_receipt_id,purpose,copy_version,copy_sha256,valid_until
  ) VALUES(p_evidence,family,p_student,actor,principal,guardianship,p_evidence_receipt,
    p_purpose,p_copy_version,p_copy_sha256,expires_at)
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    PERFORM audit.record_access_event('REGISTER','EDUCATION_COMPASS_PURPOSE',p_evidence,'ALLOW',p_purpose);
    RETURN 'RECORDED';
  END IF;

  SELECT * INTO prior FROM education_compass.purpose_evidence WHERE evidence_id=p_evidence;
  IF FOUND AND (prior.family_id,prior.student_id,prior.signer_principal_id,prior.purpose,
      prior.copy_version,prior.copy_sha256,prior.evidence_receipt_id,prior.valid_until)
      IS NOT DISTINCT FROM (family,p_student,principal,p_purpose,p_copy_version,p_copy_sha256,
        p_evidence_receipt,expires_at) THEN RETURN 'REPLAY'; END IF;
  RETURN 'CONFLICT';
END
$fn$;

CREATE FUNCTION education_compass.withdraw_purpose(p_evidence uuid) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE ev education_compass.purpose_evidence%ROWTYPE;
BEGIN
  IF NOT education_compass.is_current_family_actor() THEN RETURN 'DENIED'; END IF;
  SELECT * INTO ev FROM education_compass.purpose_evidence WHERE evidence_id=p_evidence
    AND family_id=auth.current_family_id() AND signer_principal_id=auth.current_principal_id() FOR UPDATE;
  IF NOT FOUND THEN RETURN 'DENIED'; END IF;
  IF ev.withdrawn_at IS NOT NULL THEN RETURN 'REPLAY'; END IF;
  UPDATE education_compass.purpose_evidence SET withdrawn_at=clock_timestamp() WHERE evidence_id=p_evidence;
  PERFORM audit.record_access_event('WITHDRAW','EDUCATION_COMPASS_PURPOSE',p_evidence,'ALLOW',ev.purpose);
  RETURN 'WITHDRAWN';
END
$fn$;


CREATE FUNCTION education_compass.has_purpose_evidence(a education_compass.assessment) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE guardian_evidence education_compass.purpose_evidence%ROWTYPE;
BEGIN
  SELECT * INTO guardian_evidence FROM education_compass.purpose_evidence
  WHERE evidence_id=a.guardian_evidence_id AND purpose='CORE_ASSESSMENT'
    AND copy_sha256='334a1e8e455dfef386fcaf491acea3dac23b13c4ece010cfad66d1087f6a84a5'
    AND family_id=a.family_id AND student_id=a.student_id
    AND withdrawn_at IS NULL AND valid_until>clock_timestamp()
  FOR SHARE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM core.guardian_authorities g WHERE g.authority_id=guardian_evidence.guardian_authority_id
      AND g.family_id=a.family_id
      AND g.guardian_person_id=guardian_evidence.signer_id AND g.subject_person_id=a.student_id
      AND g.scope='EDUCATION' AND g.evidence_level='VERIFIED' AND g.lifecycle_status='ACTIVE'
      AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
  ) THEN RETURN false; END IF;
  IF a.level='LEVEL_1' THEN
    RETURN guardian_evidence.signer_id=a.respondent_id;
  END IF;

  PERFORM 1 FROM education_compass.purpose_evidence
  WHERE evidence_id=a.assent_evidence_id AND purpose='STUDENT_ASSESSMENT_ASSENT'
    AND copy_sha256='0ab8f89835cfe500f97944324ab58a3cf2cce27913fc5af5d02461227b2a821d'
    AND family_id=a.family_id AND student_id=a.student_id AND signer_id=a.respondent_id
    AND withdrawn_at IS NULL AND valid_until>clock_timestamp()
  FOR SHARE;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM education_compass.assessment parent
    JOIN education_compass.report_artifact r USING (assessment_id)
    WHERE parent.assessment_id=a.source_assessment_id AND parent.level='LEVEL_1'
      AND parent.submitted_at IS NOT NULL AND parent.guardian_evidence_id=a.guardian_evidence_id
      AND r.result->>'next_step_status'='AVAILABLE'
  );
END
$fn$;

CREATE FUNCTION education_compass.can_respond(a education_compass.assessment) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN coalesce(education_compass.is_current_family_actor()
  AND auth.current_family_id()=a.family_id AND auth.current_actor_person_id()=a.respondent_id
  AND core.actor_can_manage_subject(a.student_id,'EDUCATION')
  AND education_compass.has_purpose_evidence(a),false);

CREATE FUNCTION education_compass.can_read_assessment(a education_compass.assessment) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN coalesce(education_compass.is_current_family_actor() AND auth.current_family_id()=a.family_id
  AND core.actor_can_manage_subject(a.student_id,'EDUCATION') AND (
    auth.current_actor_person_id()=a.respondent_id
    OR (a.level='LEVEL_2' AND EXISTS (SELECT 1 FROM education_compass.purpose_evidence ev
      WHERE ev.evidence_id=a.guardian_evidence_id AND ev.signer_principal_id=auth.current_principal_id()))
  ) AND education_compass.has_purpose_evidence(a),false);

CREATE FUNCTION education_compass.open_draft(p_assessment uuid,p_student uuid,p_level text,p_system text,
  p_source uuid,p_guardian_evidence uuid,p_assent_evidence uuid
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  pin education_compass.questionnaire_bank%ROWTYPE;
  a education_compass.assessment%ROWTYPE;
  prior education_compass.assessment%ROWTYPE;
BEGIN
  SELECT * INTO pin FROM education_compass.questionnaire_bank
    WHERE level=p_level AND education_system IS NOT DISTINCT FROM p_system;
  IF NOT FOUND OR NOT education_compass.is_current_family_actor() OR core.is_uuid_v7(p_assessment) IS NOT TRUE THEN
    RETURN 'DENIED';
  END IF;
  IF (p_level='LEVEL_1' AND p_source IS NULL AND p_assent_evidence IS NULL
      OR p_level='LEVEL_2' AND p_source IS NOT NULL AND p_assent_evidence IS NOT NULL
        AND p_student=auth.current_actor_person_id()) IS NOT TRUE THEN RETURN 'DENIED'; END IF;
  IF p_level='LEVEL_2' AND core.current_civil_capacity(p_student)='ADULT_VERIFIED' THEN RETURN 'CAPACITY_HOLD'; END IF;

  a.assessment_id := p_assessment;
  a.family_id := auth.current_family_id();
  a.student_id := p_student;
  a.respondent_id := auth.current_actor_person_id();
  a.level := p_level;
  a.guardian_evidence_id := p_guardian_evidence;
  a.assent_evidence_id := p_assent_evidence;
  a.source_assessment_id := p_source;
  a.education_system := pin.education_system;
  a.questionnaire_version := pin.questionnaire_version;
  a.schema_digest := pin.schema_digest;
  a.required_ids := pin.required_ids;
  a.system_result_marker := pin.system_result_marker;
  IF NOT education_compass.can_respond(a) THEN RETURN 'DENIED'; END IF;
  INSERT INTO education_compass.assessment(assessment_id,family_id,student_id,respondent_id,level,
    guardian_evidence_id,assent_evidence_id,source_assessment_id,education_system,questionnaire_version,
    schema_digest,required_ids,system_result_marker)
  VALUES(a.assessment_id,a.family_id,a.student_id,a.respondent_id,a.level,a.guardian_evidence_id,
    a.assent_evidence_id,a.source_assessment_id,a.education_system,a.questionnaire_version,
    a.schema_digest,a.required_ids,a.system_result_marker)
  ON CONFLICT (assessment_id) DO NOTHING;
  IF FOUND THEN RETURN 'OPENED'; END IF;
  SELECT * INTO prior FROM education_compass.assessment WHERE assessment_id=p_assessment;
  IF (prior.family_id,prior.student_id,prior.respondent_id,prior.level,prior.guardian_evidence_id,
      prior.assent_evidence_id,prior.source_assessment_id,prior.schema_digest)
    IS NOT DISTINCT FROM (a.family_id,a.student_id,a.respondent_id,a.level,a.guardian_evidence_id,
          a.assent_evidence_id,a.source_assessment_id,a.schema_digest) THEN RETURN 'REPLAY'; END IF;
  RETURN 'CONFLICT';
END
$fn$;


CREATE FUNCTION education_compass.read_draft(p_assessment uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a education_compass.assessment%ROWTYPE;
BEGIN
  SELECT * INTO a FROM education_compass.assessment WHERE assessment_id=p_assessment FOR SHARE;
  IF NOT FOUND OR a.submitted_at IS NOT NULL OR NOT education_compass.can_respond(a) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('revision',a.revision,'answers',a.answers,
    'questionnaire_version',a.questionnaire_version,'schema_digest',a.schema_digest);
END
$fn$;

CREATE FUNCTION education_compass.save_draft(p_assessment uuid,p_revision integer,p_answers jsonb) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a education_compass.assessment%ROWTYPE;
BEGIN
  SELECT * INTO a FROM education_compass.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR NOT education_compass.can_respond(a) THEN RETURN 'DENIED'; END IF;
  IF a.submitted_at IS NOT NULL THEN RETURN 'SEALED'; END IF;
  IF a.revision IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN RETURN 'INVALID'; END IF;
  UPDATE education_compass.assessment SET answers=p_answers,revision=revision+1
    WHERE assessment_id=p_assessment;
  RETURN 'SAVED';
END
$fn$;

CREATE FUNCTION education_compass.submit(p_assessment uuid,p_revision integer,p_key uuid) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a education_compass.assessment%ROWTYPE;
BEGIN
  SELECT * INTO a FROM education_compass.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR NOT education_compass.can_respond(a) THEN RETURN 'DENIED'; END IF;
  IF a.revision IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
  IF a.submitted_at IS NOT NULL THEN
    RETURN CASE WHEN a.submission_key=p_key THEN 'REPLAY' ELSE 'SEALED' END;
  END IF;
  IF p_key IS NULL OR NOT (a.answers ?& a.required_ids)
      OR (a.level='LEVEL_2' AND a.answers->>'EGD01' IS DISTINCT FROM 'CONFIRM_STUDENT_SELF') THEN
    RETURN 'INCOMPLETE_OR_EXIT';
  END IF;
  UPDATE education_compass.assessment SET submitted_at=clock_timestamp(),submission_key=p_key,
    submission_sha256=encode(sha256(convert_to(jsonb_build_object('assessment_id',a.assessment_id,
      'revision',a.revision,'schema_digest',a.schema_digest,'answers',a.answers)::text,'UTF8')),'hex')
    WHERE assessment_id=p_assessment;
  RETURN 'SUBMITTED';
END
$fn$;

CREATE FUNCTION education_compass.read_submission_for_publication(p_assessment uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a education_compass.assessment%ROWTYPE;
BEGIN
  SELECT * INTO a FROM education_compass.assessment WHERE assessment_id=p_assessment FOR SHARE;
  IF NOT FOUND OR (education_compass.is_report_publisher() AND auth.current_family_id()=a.family_id) IS NOT TRUE
      OR a.submitted_at IS NULL OR NOT education_compass.has_purpose_evidence(a) THEN RETURN NULL; END IF;
  IF a.level='LEVEL_2' AND NOT EXISTS (SELECT 1 FROM education_compass.order_reference
      WHERE assessment_id=p_assessment AND state='PAID' AND valid_until>clock_timestamp()) THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('assessment_id',a.assessment_id,'family_id',a.family_id,'student_id',a.student_id,
    'schema_digest',a.schema_digest,'submission_sha256',a.submission_sha256,'answers',a.answers,
    'education_system',a.education_system,'questionnaire_version',a.questionnaire_version);
END
$fn$;


CREATE FUNCTION education_compass.publish_report(p_assessment uuid,p_report uuid,p_artifact jsonb,p_qa_passed boolean) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  a education_compass.assessment%ROWTYPE;
  existing education_compass.report_artifact%ROWTYPE;
  body jsonb := p_artifact->'result';
BEGIN
  SELECT * INTO a FROM education_compass.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR (education_compass.is_report_publisher() AND auth.current_family_id()=a.family_id) IS NOT TRUE
      OR a.submitted_at IS NULL OR NOT education_compass.has_purpose_evidence(a) THEN RETURN 'DENIED'; END IF;
  IF a.level='LEVEL_2' AND NOT EXISTS (SELECT 1 FROM education_compass.order_reference
    WHERE assessment_id=p_assessment AND state='PAID' AND valid_until>clock_timestamp()) THEN RETURN 'LOCKED'; END IF;
  IF (p_qa_passed AND jsonb_typeof(body)='object' AND p_artifact->>'assessment_id'=a.assessment_id::text
      AND p_artifact->>'family_id'=a.family_id::text AND p_artifact->>'student_id'=a.student_id::text
      AND p_artifact->>'schema_digest'=a.schema_digest
      AND p_artifact->>'submission_sha256'=a.submission_sha256
      AND CASE a.level WHEN 'LEVEL_1' THEN body->>'result_kind'='FAMILY_EDUCATION_SNAPSHOT'
        AND body->>'result_version'='family_education_snapshot_v1.0.0'
        AND body->>'assessment_id'=a.assessment_id::text AND body->>'family_id'=a.family_id::text
        AND body->>'student_id'=a.student_id::text
        ELSE body->>'result_kind'='STUDENT_GROWTH_DISCOVERY'
        AND body->>'result_version'='student_growth_discovery_report_v1.0.0'
        AND body->>'system_result_marker'=a.system_result_marker END) IS NOT TRUE THEN RETURN 'QA_OR_SCOPE_DENIED'; END IF;
  SELECT * INTO existing FROM education_compass.report_artifact WHERE assessment_id=p_assessment;
  IF FOUND THEN
    RETURN CASE WHEN existing.report_id=p_report AND existing.result=body THEN 'REPLAY' ELSE 'CONFLICT' END;
  END IF;
  INSERT INTO education_compass.report_artifact VALUES(p_report,p_assessment,body);
  RETURN 'READY';
END
$fn$;

CREATE FUNCTION education_compass.apply_verified_reference(
  p_assessment uuid,p_order uuid,p_event uuid,p_state text,p_product text,p_amount integer,p_currency text,
  p_valid_until timestamptz
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  a education_compass.assessment%ROWTYPE;
  prior education_compass.source_event%ROWTYPE;
  reference education_compass.order_reference%ROWTYPE;
BEGIN
  SELECT * INTO a FROM education_compass.assessment WHERE assessment_id=p_assessment FOR UPDATE;
  IF NOT FOUND OR (operations_ref.is_operations_service() AND auth.current_family_id()=a.family_id) IS NOT TRUE THEN
    RETURN 'DENIED';
  END IF;
  IF (a.level='LEVEL_2' AND a.submitted_at IS NOT NULL AND p_order IS NOT NULL AND p_event IS NOT NULL
      AND p_product='EDUCATION_GROWTH_DISCOVERY_SINGLE_V1' AND p_amount=3990 AND p_currency='CNY'
      AND p_valid_until IS NOT NULL AND isfinite(p_valid_until)
      AND p_state IN ('PAID','REFUNDING','REFUNDED')) IS NOT TRUE THEN RETURN 'STATE_OR_PRODUCT_DENIED'; END IF;
  SELECT * INTO reference FROM education_compass.order_reference WHERE order_id=p_order FOR UPDATE;
  IF FOUND AND reference.assessment_id<>p_assessment THEN RETURN 'SCOPE_DENIED'; END IF;
  SELECT * INTO prior FROM education_compass.source_event WHERE event_id=p_event;
  IF FOUND THEN
    RETURN CASE WHEN prior.order_id=p_order AND prior.state=p_state AND prior.valid_until=p_valid_until THEN 'REPLAY' ELSE 'CONFLICT' END;
  END IF;
  IF p_state='PAID' THEN
    IF reference.order_id IS NOT NULL THEN RETURN 'STALE'; END IF;
    IF p_valid_until<=clock_timestamp() THEN RETURN 'EXPIRED'; END IF;
    IF NOT education_compass.has_purpose_evidence(a) THEN RETURN 'CONSENT_REQUIRED'; END IF;
    IF EXISTS (SELECT 1 FROM education_compass.order_reference
      WHERE assessment_id=p_assessment AND state IN ('PAID','REFUNDING')) THEN RETURN 'ACTIVE_EXISTS'; END IF;
    IF (SELECT count(*) FROM education_compass.order_reference
      WHERE assessment_id=p_assessment AND state='REFUNDED')>=2 THEN RETURN 'REPURCHASE_LIMIT'; END IF;
    INSERT INTO education_compass.order_reference VALUES(p_order,p_assessment,'PAID',p_valid_until);
  ELSE
    IF reference.order_id IS NULL THEN RETURN 'REFERENCE_REQUIRED'; END IF;
    IF reference.valid_until IS DISTINCT FROM p_valid_until THEN RETURN 'CONFLICT'; END IF;
    IF reference.state='REFUNDED' OR reference.state=p_state THEN RETURN 'STALE'; END IF;
    UPDATE education_compass.order_reference SET state=p_state WHERE order_id=p_order;
  END IF;
  INSERT INTO education_compass.source_event(event_id,order_id,state,valid_until)
    VALUES(p_event,p_order,p_state,p_valid_until);
  RETURN p_state;
END
$fn$;

CREATE FUNCTION education_compass.read_report(p_assessment uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE
  a education_compass.assessment%ROWTYPE;
  r education_compass.report_artifact%ROWTYPE;
BEGIN
  SELECT * INTO a FROM education_compass.assessment WHERE assessment_id=p_assessment FOR SHARE;
  IF NOT FOUND OR a.submitted_at IS NULL OR NOT education_compass.can_read_assessment(a) THEN
    PERFORM audit.record_access_event('READ','EDUCATION_COMPASS_REPORT',NULL,'DENY','SCOPE_OR_CONSENT');
    RETURN NULL;
  END IF;
  IF a.level='LEVEL_2' AND NOT EXISTS (SELECT 1 FROM education_compass.order_reference
    WHERE assessment_id=p_assessment AND state='PAID' AND valid_until>clock_timestamp()) THEN
    PERFORM audit.record_access_event('READ','EDUCATION_COMPASS_REPORT',NULL,'DENY','REPORT_LOCKED');
    RETURN jsonb_build_object('assessment_id',a.assessment_id,'result_state','LOCKED',
      'product_code','EDUCATION_GROWTH_DISCOVERY_SINGLE_V1','amount_fen',3990,'currency','CNY',
      'next_action','PURCHASE_TO_UNLOCK_REPORT','system_result_marker',a.system_result_marker);
  END IF;
  SELECT * INTO r FROM education_compass.report_artifact WHERE assessment_id=p_assessment;
  IF NOT FOUND THEN RETURN jsonb_build_object('assessment_id',a.assessment_id,'result_state','PENDING'); END IF;
  PERFORM audit.record_access_event('READ','EDUCATION_COMPASS_REPORT',r.report_id,'ALLOW','SCOPED_ARTIFACT');
  RETURN jsonb_build_object('report_id',r.report_id,'result_state','READY','result',r.result);
END
$fn$;

REVOKE ALL ON ALL TABLES IN SCHEMA education_compass FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA education_compass FROM PUBLIC;
GRANT USAGE ON SCHEMA education_compass TO
  phoenix_education_compass_app,phoenix_education_compass_publisher,phoenix_education_compass_settlement;
GRANT EXECUTE ON FUNCTION education_compass.record_purpose(uuid,uuid,text,text,text,uuid,timestamptz),
  education_compass.withdraw_purpose(uuid),
  education_compass.open_draft(uuid,uuid,text,text,uuid,uuid,uuid),education_compass.read_draft(uuid),
  education_compass.save_draft(uuid,integer,jsonb),education_compass.submit(uuid,integer,uuid),
  education_compass.read_report(uuid) TO phoenix_education_compass_app;
GRANT EXECUTE ON FUNCTION education_compass.read_submission_for_publication(uuid),
  education_compass.publish_report(uuid,uuid,jsonb,boolean)
  TO phoenix_education_compass_publisher;
GRANT EXECUTE ON FUNCTION education_compass.apply_verified_reference(uuid,uuid,uuid,text,text,integer,text,timestamptz)
  TO phoenix_education_compass_settlement;
RESET ROLE;

GRANT USAGE ON SCHEMA auth TO
  phoenix_education_compass_app,phoenix_education_compass_publisher,phoenix_education_compass_settlement;
GRANT EXECUTE ON FUNCTION auth.redeem_context_ticket(uuid,uuid),auth.clear_context() TO
  phoenix_education_compass_app,phoenix_education_compass_publisher,phoenix_education_compass_settlement;
COMMIT;
