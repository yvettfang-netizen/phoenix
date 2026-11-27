BEGIN;
-- EDC V2 narrow REQUEST-ONLY API; requires UNNUMBERED_education_data_contract_v2.sql.
-- DRAFT only: never install in shared or production. No download/read/publish API.
-- Current formal FAMILY/ADVISOR contexts only. No dependency on PR #92 or #89.

CREATE FUNCTION service.edc_request_private_document_use(
  p_use_id uuid, p_project_id uuid, p_version_id uuid, p_purpose text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,consent,docs,casework,service,audit,pg_temp
AS $edc$
DECLARE
 v_family uuid;
 v_subject uuid;
 v_principal uuid := auth.current_principal_id();
 v_actor uuid := auth.current_actor_person_id();
 v_channel text := auth.current_channel();
 v_existing uuid;
 v_can_request boolean := false;
BEGIN
 -- All invalid/not-found cases are indistinguishable to the caller.
 IF core.is_uuid_v7(p_use_id) IS NOT TRUE
    OR p_purpose IS DISTINCT FROM 'EDUCATION_APPLICATION'
    OR auth.write_context_is_live() IS NOT TRUE
    OR v_channel NOT IN ('FAMILY','ADVISOR')
    OR v_principal IS NULL OR v_actor IS NULL THEN
   PERFORM audit.record_write_decision('REQUEST','EDC_PROJECT_DOCUMENT_USE',p_project_id,false,'EDC_SCOPE_DENIED');
   RETURN jsonb_build_object('status','DENY');
 END IF;

 -- No file path, object key, digest, or existence data is returned.
 -- The stable context, project, person, document and purpose must all match.
 -- Locking the document/project rows coordinates with concurrent withdrawals.
 SELECT d.family_id,d.subject_person_id INTO v_family,v_subject
 FROM docs.document_versions v
 JOIN docs.documents d ON d.document_id=v.document_id
 JOIN service.projects p ON p.service_project_id=p_project_id
 WHERE v.version_id=p_version_id
   AND p.family_id=d.family_id
   AND p.primary_domain='EDUCATION'
   AND p.project_status IN ('PLANNED','ACTIVE','ON_HOLD')
   AND d.data_class='EDUCATION'
   AND d.withdrawn_at IS NULL
   AND d.retention_until>clock_timestamp()
   AND EXISTS(
     SELECT 1 FROM service.project_subjects s
      WHERE s.service_project_id=p.service_project_id
        AND s.family_id=d.family_id
        AND s.subject_person_id=d.subject_person_id
        AND s.data_scope='EDUCATION'
        AND s.status='ACTIVE'
        AND s.valid_from<=clock_timestamp()
        AND (s.valid_until IS NULL OR s.valid_until>clock_timestamp())
   )
 FOR SHARE OF d,p;

 IF FOUND AND v_family=auth.current_family_id()
    AND EXISTS(SELECT 1 FROM auth.principals n WHERE
       n.principal_id=v_principal AND n.person_id=v_actor AND n.status='ACTIVE'
       AND (v_channel='FAMILY' AND n.principal_kind='FAMILY'
            OR v_channel='ADVISOR' AND n.principal_kind='ADVISOR'))
    AND consent.has_active_consent(v_subject,'DOCUMENT_READ','EDUCATION')
    AND consent.has_active_consent(v_subject,'EDUCATION_CASE','EDUCATION')
    AND docs.can_read_document(v_subject,'EDUCATION') THEN

   v_can_request := CASE v_channel
    WHEN 'FAMILY' THEN
      core.current_actor_is_family_member()
      AND (v_actor=v_subject OR core.has_verified_guardian_authority(v_subject,'EDUCATION'))
    WHEN 'ADVISOR' THEN EXISTS(
      SELECT 1 FROM service.project_assignments a
      WHERE a.service_project_id=p_project_id
        AND a.principal_id=v_principal
        AND a.assignment_role IN ('PROJECT_OWNER','PROJECT_MANAGER','SPECIALIST')
        AND a.status='ACTIVE'
        AND a.valid_from<=clock_timestamp()
        AND (a.valid_until IS NULL OR a.valid_until>clock_timestamp())
     ) AND EXISTS(
      SELECT 1 FROM casework.cases c
      JOIN casework.advisor_assignments a ON a.case_id=c.case_id
      WHERE c.family_id=v_family AND c.subject_person_id=v_subject
        AND c.status IN ('OPEN','PAUSED')
        AND a.advisor_person_id=v_actor
        AND a.lifecycle_status='ACTIVE'
        AND a.revoked_at IS NULL
        AND a.valid_from<=clock_timestamp() AND a.valid_until>clock_timestamp()
     )
    ELSE false
   END;
 END IF;

 IF v_can_request IS NOT TRUE THEN
   PERFORM audit.record_write_decision('REQUEST','EDC_PROJECT_DOCUMENT_USE',p_project_id,false,'EDC_SCOPE_DENIED');
   RETURN jsonb_build_object('status','DENY');
 END IF;

 -- Pending-only, per-project use. Repeated authorized calls return one stable
 -- reference but *never* reuse approval of another project.
 BEGIN
   INSERT INTO service.education_document_uses(
     use_id,service_project_id,version_id,family_id,subject_person_id,
     purpose_code,requested_by_principal_id
   ) VALUES(p_use_id,p_project_id,p_version_id,v_family,v_subject,p_purpose,v_principal)
   ON CONFLICT (service_project_id,version_id,purpose_code) DO NOTHING
   RETURNING use_id INTO v_existing;
 EXCEPTION WHEN unique_violation THEN
   -- A reused request UUID for a different project must not leak the other row
   -- through raw unique-constraint details.
   PERFORM audit.record_write_decision('REQUEST','EDC_PROJECT_DOCUMENT_USE',p_project_id,false,'EDC_SCOPE_DENIED');
   RETURN jsonb_build_object('status','DENY');
 END;

 IF v_existing IS NULL THEN
   SELECT use_id INTO v_existing
     FROM service.education_document_uses
     WHERE service_project_id=p_project_id
       AND version_id=p_version_id AND purpose_code=p_purpose;
 END IF;
 IF v_existing IS NULL THEN
   RAISE EXCEPTION 'EDC_PENDING_USE_NOT_FOUND_AFTER_INSERT';
 END IF;
 PERFORM audit.record_write_decision('REQUEST','EDC_PROJECT_DOCUMENT_USE',p_project_id,true,'PENDING_REVIEW_ONLY');
 RETURN jsonb_build_object('status','PENDING_REVIEW','useId',v_existing);
END
$edc$;

REVOKE ALL ON FUNCTION service.edc_request_private_document_use(uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION service.edc_request_private_document_use(uuid,uuid,uuid,text) TO phoenix_canonical_app;
COMMIT;
