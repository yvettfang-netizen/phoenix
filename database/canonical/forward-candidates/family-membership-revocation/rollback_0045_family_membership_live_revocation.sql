BEGIN;
-- Operational rollback for candidate 0045 only; preserves existing owner and ACL.
DO $precondition$
DECLARE v_source text; v_language text; v_volatility "char"; v_security_definer boolean; v_config text[];
BEGIN
  SELECT p.prosrc,l.lanname,p.provolatile,p.prosecdef,p.proconfig
    INTO v_source,v_language,v_volatility,v_security_definer,v_config
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid=p.prolang
   WHERE p.oid=pg_catalog.to_regprocedure('learning.can_read_sensitive(uuid,uuid,uuid)')
     AND n.nspname='learning';
  IF NOT FOUND THEN RAISE EXCEPTION 'S1_FUNCTION_MISSING'; END IF;
  IF v_language<>'sql' OR v_volatility<>'v' OR v_security_definer IS NOT TRUE
     OR NOT (COALESCE(array_to_string(v_config,','),'') LIKE '%search_path=pg_catalog,auth,core,learning%') THEN
    RAISE EXCEPTION 'S1_FUNCTION_ATTRIBUTES_DRIFT_REFUSED';
  END IF;
  v_source := regexp_replace(v_source,E'^[[:space:]]+|[[:space:]]+$','','g');
  IF md5(v_source) NOT IN ('cd414150847fad2d1f8f6318f2e21ebf','e8a483fadc17d2768c7398f0cd40ae3c') THEN
    RAISE EXCEPTION 'S1_FUNCTION_SOURCE_DRIFT_REFUSED';
  END IF;
END
$precondition$;
CREATE OR REPLACE FUNCTION learning.can_read_sensitive(
  p_family_id uuid,p_subject_id uuid,p_class_id uuid
) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning
RETURN coalesce(auth.write_context_is_live() AND auth.current_family_id()=p_family_id AND (
  auth.current_channel()='FAMILY' AND (
    auth.current_actor_person_id()=p_subject_id
    OR core.has_verified_guardian_authority(p_subject_id,'LEARNING') AND learning.has_learning_consent(p_subject_id))
  OR auth.current_channel()='STAFF' AND (
    learning.current_staff_kind()='SUPERVISOR' AND learning.has_learning_consent(p_subject_id)
    OR learning.teacher_has_class_access(p_class_id,p_subject_id))),false);
COMMIT;
