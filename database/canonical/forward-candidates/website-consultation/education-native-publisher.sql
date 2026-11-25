BEGIN;

-- Optional #74 bridge. The source owner returns only the subject of a sealed,
-- currently readable assessment; native evidence withdrawal is checked on every use.
SET LOCAL ROLE phoenix_education_compass_owner;
CREATE FUNCTION education_compass.crm_shareable_subject(p_assessment uuid)
RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN (
  SELECT a.student_id FROM education_compass.assessment a
  WHERE a.assessment_id=p_assessment AND a.submitted_at IS NOT NULL AND a.submission_sha256 IS NOT NULL
    AND education_compass.can_read_assessment(a)
);
REVOKE ALL ON FUNCTION education_compass.crm_shareable_subject(uuid) FROM PUBLIC;
RESET ROLE;

GRANT USAGE ON SCHEMA education_compass TO CURRENT_USER;
GRANT EXECUTE ON FUNCTION education_compass.crm_shareable_subject(uuid) TO CURRENT_USER;

CREATE OR REPLACE FUNCTION crm.education_native_subject(uuid)
RETURNS uuid LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp
RETURN education_compass.crm_shareable_subject($1);

CREATE FUNCTION crm.publish_education_compass_completion(p_event uuid,p_lead uuid,p_contract uuid,p_assessment uuid)
RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN crm.record_compass_event(p_event,p_lead,crm.education_native_subject(p_assessment),p_contract,'EDUCATION',p_assessment);

REVOKE ALL ON FUNCTION crm.publish_education_compass_completion(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.publish_education_compass_completion(uuid,uuid,uuid,uuid)
  TO phoenix_education_crm_reference_publisher;

COMMIT;
