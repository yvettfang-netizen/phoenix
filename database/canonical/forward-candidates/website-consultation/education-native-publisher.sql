BEGIN;

CREATE ROLE phoenix_education_crm_reference_publisher NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA crm TO phoenix_education_crm_reference_publisher;

-- Optional bridge to the separately reviewed #74 assessment authority.
-- The CRM owner receives no access to raw assessment tables.
ALTER TABLE consent.grants DROP CONSTRAINT grants_purpose_check;
ALTER TABLE consent.grants ADD CONSTRAINT grants_purpose_check CHECK (
  purpose IN ('DOCUMENT_READ','EDUCATION_CASE','IDENTITY_CASE','LEARNING_RECORD','EDUCATION_COMPASS_CRM_REFERENCE')
);
ALTER TABLE consent.grants ADD CONSTRAINT education_compass_crm_reference_class CHECK (
  purpose IS DISTINCT FROM 'EDUCATION_COMPASS_CRM_REFERENCE' OR data_class='EDUCATION'
);

GRANT USAGE ON SCHEMA consent TO phoenix_education_compass_owner;
GRANT SELECT (family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,
  status,granted_at,expires_at,withdrawn_at) ON consent.grants TO phoenix_education_compass_owner;
CREATE POLICY education_compass_crm_reference_lookup ON consent.grants
  FOR SELECT TO phoenix_education_compass_owner USING (
    purpose='EDUCATION_COMPASS_CRM_REFERENCE' AND family_id=auth.current_family_id()
    AND grantee_person_id=auth.current_actor_person_id()
  );

SET LOCAL ROLE phoenix_education_compass_owner;
CREATE FUNCTION education_compass.crm_shareable_subject(p_assessment uuid)
RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN (
  SELECT a.student_id FROM education_compass.assessment a
  WHERE a.assessment_id=p_assessment AND a.submitted_at IS NOT NULL AND a.submission_sha256 IS NOT NULL
    AND education_compass.can_read_assessment(a)
    AND EXISTS (
      SELECT 1 FROM consent.grants g WHERE g.family_id=a.family_id AND g.subject_person_id=a.student_id
        AND g.grantor_person_id=auth.current_actor_person_id() AND g.grantee_person_id=auth.current_actor_person_id()
        AND g.purpose='EDUCATION_COMPASS_CRM_REFERENCE' AND g.data_class='EDUCATION'
        AND g.status='ACTIVE' AND g.withdrawn_at IS NULL
        AND g.granted_at<=clock_timestamp() AND g.expires_at>clock_timestamp()
    )
);
REVOKE ALL ON FUNCTION education_compass.crm_shareable_subject(uuid) FROM PUBLIC;
RESET ROLE;

GRANT USAGE ON SCHEMA education_compass TO CURRENT_USER;
GRANT EXECUTE ON FUNCTION education_compass.crm_shareable_subject(uuid) TO CURRENT_USER;

CREATE OR REPLACE FUNCTION crm.native_compass_assessment_is_shareable(p_domain text,p_assessment uuid,p_subject uuid)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog
RETURN CASE WHEN p_domain='EDUCATION' THEN coalesce(education_compass.crm_shareable_subject(p_assessment)=p_subject,false)
  ELSE false END;
CREATE OR REPLACE FUNCTION crm.native_compass_assessment_writer_allowed(p_domain text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog
RETURN p_domain='EDUCATION' AND pg_has_role(session_user,'phoenix_education_crm_reference_publisher','MEMBER');

-- Internal publisher call. Resolve the subject from the sealed native record.
CREATE FUNCTION crm.publish_education_compass_completion(p_event uuid,p_lead uuid,p_contract uuid,p_assessment uuid)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $publisher$
DECLARE subject_id uuid;
BEGIN
  IF crm.native_compass_assessment_writer_allowed('EDUCATION') IS NOT TRUE
    OR crm.acquisition_contract_usable(p_contract) IS NOT TRUE THEN RETURN NULL; END IF;
  subject_id := education_compass.crm_shareable_subject(p_assessment);
  IF subject_id IS NULL THEN RETURN NULL; END IF;
  RETURN crm.record_compass_event(p_event,p_lead,subject_id,p_contract,'EDUCATION',p_assessment);
END
$publisher$;
REVOKE ALL ON FUNCTION crm.publish_education_compass_completion(uuid,uuid,uuid,uuid)
  FROM PUBLIC,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.publish_education_compass_completion(uuid,uuid,uuid,uuid)
  TO phoenix_education_crm_reference_publisher;

COMMIT;
