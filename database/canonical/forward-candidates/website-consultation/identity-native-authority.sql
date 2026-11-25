BEGIN;

CREATE ROLE phoenix_identity_assessment_writer NOLOGIN NOINHERIT NOBYPASSRLS;
-- Use the formal identity schema, existing Person/Family/Principal and a separate
-- immutable submission receipt. No answers, report, client or case are created here.
CREATE TABLE identity.compass_assessments (
  assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  family_id uuid NOT NULL REFERENCES core.families,
  applicant_id uuid NOT NULL REFERENCES core.people,
  submitted_by uuid NOT NULL REFERENCES auth.principals,
  questionnaire_revision text NOT NULL CHECK (questionnaire_revision ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
  submission_sha256 text NOT NULL CHECK (submission_sha256 ~ '^[0-9a-f]{64}$'),
  submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (family_id,submitted_by,submission_id)
);
ALTER TABLE identity.compass_assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON identity.compass_assessments FROM PUBLIC;

-- A trusted Identity backend seals its validated submission before calling this function.
-- The applicant, Family, actor and submission time are derived from the existing context.
CREATE FUNCTION identity.submit_compass_assessment(p_submission uuid,p_revision text,p_sha256 text)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $submit$
DECLARE result uuid;
BEGIN
  IF NOT pg_has_role(session_user,'phoenix_identity_assessment_writer','USAGE')
    OR NOT consent.compass_reference_actor_is_live()
    OR p_submission IS NULL OR (p_revision ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'
      AND p_sha256 ~ '^[0-9a-f]{64}$') IS NOT TRUE THEN RETURN NULL; END IF;
  INSERT INTO identity.compass_assessments(submission_id,family_id,applicant_id,submitted_by,
    questionnaire_revision,submission_sha256)
  VALUES(p_submission,auth.current_family_id(),auth.current_actor_person_id(),auth.current_principal_id(),
    p_revision,p_sha256)
  ON CONFLICT (family_id,submitted_by,submission_id) DO NOTHING RETURNING assessment_id INTO result;
  IF FOUND THEN
    PERFORM audit.record_write_decision('RECORD','IDENTITY_COMPASS_SUBMISSION',result,true,'ASSESSMENT_SUBMITTED');
    RETURN result;
  END IF;
  RETURN (SELECT assessment_id FROM identity.compass_assessments
    WHERE family_id=auth.current_family_id() AND submitted_by=auth.current_principal_id()
      AND applicant_id=auth.current_actor_person_id() AND submission_id=p_submission
      AND questionnaire_revision=p_revision AND submission_sha256=p_sha256);
END
$submit$;

CREATE OR REPLACE FUNCTION crm.identity_native_subject(uuid)
RETURNS uuid LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp
RETURN (SELECT a.applicant_id FROM identity.compass_assessments a WHERE a.assessment_id=$1
  AND consent.compass_reference_actor_is_live() AND a.family_id=auth.current_family_id()
  AND a.applicant_id=auth.current_actor_person_id() AND a.submitted_by=auth.current_principal_id());

CREATE FUNCTION crm.publish_identity_compass_completion(p_event uuid,p_lead uuid,p_contract uuid,p_assessment uuid)
RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN crm.record_compass_event(p_event,p_lead,crm.identity_native_subject(p_assessment),p_contract,'IDENTITY',p_assessment);

REVOKE ALL ON FUNCTION identity.submit_compass_assessment(uuid,text,text),
  crm.publish_identity_compass_completion(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA identity,auth TO phoenix_identity_assessment_writer;
GRANT EXECUTE ON FUNCTION identity.submit_compass_assessment(uuid,text,text),auth.clear_context(),
  auth.redeem_context_ticket(uuid,uuid),auth.current_request_nonce(),auth.current_principal_id() TO phoenix_identity_assessment_writer;
GRANT EXECUTE ON FUNCTION crm.publish_identity_compass_completion(uuid,uuid,uuid,uuid)
  TO phoenix_identity_crm_reference_publisher;

COMMIT;
