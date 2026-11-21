BEGIN;
-- Operational rollback for unnumbered Academic Studio A0 candidate; preserves existing owner and ACL.
DO $precondition$
DECLARE v_definition text; v_language text; v_volatility "char"; v_security_definer boolean; v_config text[];
BEGIN
  SELECT pg_catalog.pg_get_functiondef(p.oid),l.lanname,p.provolatile,p.prosecdef,p.proconfig
    INTO v_definition,v_language,v_volatility,v_security_definer,v_config
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid=p.prolang
   WHERE p.oid=pg_catalog.to_regprocedure('learning.can_read_sensitive(uuid,uuid,uuid)')
     AND n.nspname='learning';
  IF NOT FOUND THEN RAISE EXCEPTION 'S1_FUNCTION_MISSING'; END IF;
  IF v_language<>'sql' OR v_volatility<>'v' OR v_security_definer IS NOT TRUE
     OR NOT (regexp_replace(COALESCE(array_to_string(v_config,','),''),'[[:space:]]','','g') LIKE '%search_path=pg_catalog,auth,core,learning%') THEN
    RAISE EXCEPTION 'S1_FUNCTION_ATTRIBUTES_DRIFT_REFUSED';
  END IF;
  IF md5(v_definition) NOT IN (
    '4b65b734551738529b6cbc3935217bab',
    '8c9c51f1e022af796318c90abddffca2'
  ) THEN
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
