BEGIN;

-- Independent forward candidate after reserved/unmerged 0036. No master-data changes.
CREATE ROLE phoenix_canonical_projection_reader NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
DO $grant_connect$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO phoenix_canonical_projection_reader',current_database());
END $grant_connect$;
GRANT USAGE ON SCHEMA core,auth TO phoenix_canonical_projection_reader;
GRANT EXECUTE ON FUNCTION auth.redeem_context_ticket(uuid,uuid),auth.clear_context(),
  auth.current_request_nonce(),auth.current_family_id(),auth.current_principal_id()
  TO phoenix_canonical_projection_reader;

CREATE FUNCTION integration.lookup_projection_public_id(p_kind text,p_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit,pg_temp
AS $fn$
  SELECT i.public_id FROM integration.public_ids i
  WHERE i.entity_kind=p_kind AND i.canonical_id=p_id AND core.is_uuid_v7(p_id)
    AND ((p_kind='FAMILY' AND i.public_id='fam_'||replace(p_id::text,'-','')
          AND EXISTS(SELECT 1 FROM core.families f WHERE f.family_id=p_id))
      OR (p_kind='STUDENT_PROFILE' AND i.public_id='stu_'||replace(p_id::text,'-','')
          AND EXISTS(SELECT 1 FROM core.student_profiles s JOIN core.people p ON p.person_id=s.person_id WHERE s.person_id=p_id)));
$fn$;

-- Private implementation. Public wrappers fix operation; callers cannot choose audit fields.
CREATE FUNCTION core.read_projection_summary(p_operation text,p_public_id text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit,pg_temp
AS $fn$
DECLARE
  v_context auth.session_contexts%ROWTYPE;
  v_item record;
  v_items jsonb := '[]'::jsonb;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  v_public text;
  v_data jsonb;
  v_resource text;
  v_reason text := 'NO_TRUSTED_CONTEXT';
  v_status text := 'DENY';
  v_allowed boolean := false;
BEGIN
  v_resource := CASE p_operation WHEN 'family' THEN 'FAMILY_SUMMARY'
    WHEN 'student' THEN 'STUDENT_SUMMARY' ELSE 'STUDENT_SUMMARY_LIST' END;
  SELECT c.* INTO v_context FROM auth.session_contexts c
    JOIN pg_catalog.pg_stat_activity a ON a.pid=c.backend_pid AND a.backend_start=c.backend_start
    JOIN auth.principals p ON p.principal_id=c.principal_id AND p.person_id=c.actor_person_id
      AND p.principal_kind='FAMILY' AND p.status='ACTIVE'
    WHERE c.backend_pid=pg_backend_pid() AND c.channel='FAMILY'
      AND c.expires_at>clock_timestamp() AND c.request_nonce IS NOT NULL
      AND EXISTS(SELECT 1 FROM core.family_memberships m
        WHERE m.family_id=c.family_id AND m.person_id=c.actor_person_id
          AND m.valid_from<=clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp()));
  IF FOUND AND p_operation IN ('family','students','student') THEN
    IF p_operation='family' THEN
      v_id := v_context.family_id;
      v_public := integration.lookup_projection_public_id('FAMILY',v_id);
      IF v_public IS NULL THEN
        v_status := 'UNAVAILABLE'; v_reason := 'ID_MAPPING_UNAVAILABLE';
      ELSE
        SELECT jsonb_build_object('schemaVersion','family-summary.v2','family',
          jsonb_build_object('familyRef',v_public,'displayName',f.display_name)) INTO v_data
          FROM core.families f WHERE f.family_id=v_id;
        v_allowed := v_data IS NOT NULL;
        v_status := CASE WHEN v_allowed THEN 'ALLOW' ELSE 'UNAVAILABLE' END;
        v_reason := CASE WHEN v_allowed THEN 'AUTHORIZED' ELSE 'ID_MAPPING_UNAVAILABLE' END;
      END IF;
    ELSIF p_operation='student' AND (p_public_id IS NULL OR p_public_id !~ '^stu_[0-9a-f]{32}$') THEN
      v_reason := 'SUBJECT_UNAVAILABLE';
    ELSE
      FOR v_item IN
        SELECT s.person_id,p.display_name FROM core.student_profiles s
        JOIN core.people p ON p.person_id=s.person_id
        JOIN core.family_memberships m ON m.person_id=s.person_id AND m.family_id=v_context.family_id
        WHERE m.valid_from<=clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
          AND (s.person_id=v_context.actor_person_id OR EXISTS(
            SELECT 1 FROM core.guardian_authorities g
            WHERE g.family_id=v_context.family_id AND g.guardian_person_id=v_context.actor_person_id
              AND g.subject_person_id=s.person_id AND g.evidence_level='VERIFIED'
              AND g.scope IN ('EDUCATION','GENERAL') AND g.lifecycle_status='ACTIVE'
              AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()))
          AND (p_operation='students' OR EXISTS(
            SELECT 1 FROM integration.public_ids i WHERE i.entity_kind='STUDENT_PROFILE'
              AND i.canonical_id=s.person_id AND i.public_id=p_public_id))
        ORDER BY s.person_id LIMIT 101
      LOOP
        v_ids := array_append(v_ids,v_item.person_id);
        v_public := integration.lookup_projection_public_id('STUDENT_PROFILE',v_item.person_id);
        IF v_public IS NULL THEN
          v_status := 'UNAVAILABLE'; v_reason := 'ID_MAPPING_UNAVAILABLE'; EXIT;
        END IF;
        v_items := v_items||jsonb_build_array(jsonb_build_object('studentRef',v_public,'displayName',v_item.display_name));
      END LOOP;
      IF v_status<>'UNAVAILABLE' THEN
        IF cardinality(v_ids)>100 THEN
          v_status := 'UNAVAILABLE'; v_reason := 'RESULT_LIMIT_EXCEEDED';
        ELSIF p_operation='student' AND cardinality(v_ids)<>1 THEN
          v_status := 'NOT_FOUND'; v_reason := 'SUBJECT_UNAVAILABLE';
        ELSE
          v_allowed := true; v_status := 'ALLOW'; v_reason := 'AUTHORIZED';
          v_data := CASE WHEN p_operation='student'
            THEN jsonb_build_object('schemaVersion','student-summary.v2','item',v_items->0)
            ELSE jsonb_build_object('schemaVersion','student-summary.v2','items',v_items) END;
          IF p_operation='student' THEN v_id := v_ids[1]; END IF;
        END IF;
      END IF;
    END IF;
    IF v_context.expires_at<=clock_timestamp() THEN
      v_allowed := false; v_status := 'DENY'; v_reason := 'NO_TRUSTED_CONTEXT';
    END IF;
  END IF;
  PERFORM audit.record_write_decision('READ',v_resource,
    CASE WHEN v_allowed THEN v_id ELSE NULL END,v_allowed,v_reason);
  IF v_allowed AND p_operation='students' THEN
    FOREACH v_id IN ARRAY v_ids LOOP
      PERFORM audit.record_write_decision('READ','STUDENT_SUMMARY',v_id,true,'AUTHORIZED');
    END LOOP;
  END IF;
  RETURN jsonb_build_object('status',v_status,'data',CASE WHEN v_allowed THEN v_data ELSE NULL END);
END $fn$;

CREATE FUNCTION core.read_family_summary() RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit,pg_temp
AS $fn$ SELECT core.read_projection_summary('family',NULL); $fn$;
CREATE FUNCTION core.list_student_summaries() RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit,pg_temp
AS $fn$ SELECT core.read_projection_summary('students',NULL); $fn$;
CREATE FUNCTION core.read_student_summary(p_public_id text) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit,pg_temp
AS $fn$ SELECT core.read_projection_summary('student',p_public_id); $fn$;

REVOKE ALL ON FUNCTION integration.lookup_projection_public_id(text,uuid),
  core.read_projection_summary(text,text),core.read_family_summary(),
  core.list_student_summaries(),core.read_student_summary(text)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_context_binder;
GRANT EXECUTE ON FUNCTION core.read_family_summary(),core.list_student_summaries(),
  core.read_student_summary(text) TO phoenix_canonical_projection_reader;

COMMIT;
