-- Phoenix Academic Studio V2.1 — P0.1 Package A: identity, context and capabilities.
-- Unnumbered forward candidate. Never copy into the formal migration directory without a separate Founder gate.
BEGIN;

DO $candidate_guard$
DECLARE v_ledger_count integer; v_last text;
BEGIN
  IF current_database() <> 'phoenix_canonical_dev'
     OR current_setting('phoenix.academic_studio_candidate',true) IS DISTINCT FROM 'isolated' THEN
    RAISE EXCEPTION 'ACADEMIC_STUDIO_CANDIDATE_REQUIRES_DISPOSABLE_PG_CLUSTER';
  END IF;
  IF to_regclass('canonical_migrations.applied') IS NULL THEN
    RAISE EXCEPTION 'CANONICAL_MIGRATION_LEDGER_MISSING';
  END IF;
  SELECT count(*),max(migration_name) INTO v_ledger_count,v_last
    FROM canonical_migrations.applied;
  IF v_ledger_count<>37 OR v_last<>'0037_scoped_public_id_projection_read_audit.sql' THEN
    RAISE EXCEPTION 'ACADEMIC_STUDIO_REQUIRES_EXACT_0001_0037_BASELINE';
  END IF;
  IF to_regclass('learning.academy_staff_grants') IS NOT NULL THEN
    RAISE EXCEPTION 'ACADEMY_STAFF_GRANTS_ALREADY_PRESENT';
  END IF;
  -- PR #89 (0045) and PR #91 (A0) modify the very same Learning-read
  -- authority. Refuse a second install even if the formal ledger stayed 37.
  IF md5(pg_catalog.pg_get_functiondef(
       'learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure
     )) <> '4b65b734551738529b6cbc3935217bab' THEN
    RAISE EXCEPTION 'ACADEMIC_STUDIO_S1_OVERLAP_OR_DRIFT_REFUSED';
  END IF;
END
$candidate_guard$;

-- Reuse the existing one-use ticket and backend-bound context. Add only the two
-- missing human contexts: STUDENT self-only and global STAFF.
ALTER TABLE auth.session_contexts DROP CONSTRAINT IF EXISTS session_contexts_channel_check;
ALTER TABLE auth.session_contexts ADD CONSTRAINT session_contexts_channel_check
  CHECK (channel IN ('FAMILY','ADVISOR','PARTNER','INTERNAL','STAFF','STUDENT'));
ALTER TABLE auth.context_exchange_tickets DROP CONSTRAINT IF EXISTS context_exchange_tickets_channel_check;
ALTER TABLE auth.context_exchange_tickets ADD CONSTRAINT context_exchange_tickets_channel_check
  CHECK (channel IN ('FAMILY','ADVISOR','PARTNER','INTERNAL','STAFF','STUDENT'));

ALTER TABLE auth.session_contexts DROP CONSTRAINT IF EXISTS session_family_channel_match;
ALTER TABLE auth.session_contexts ADD CONSTRAINT session_family_channel_match
  CHECK (
    channel='INTERNAL'
    OR channel='STAFF'
    OR (channel='STUDENT' AND family_id IS NULL)
    OR (channel IN ('FAMILY','ADVISOR','PARTNER') AND family_id IS NOT NULL)
  );
ALTER TABLE auth.context_exchange_tickets DROP CONSTRAINT IF EXISTS ticket_family_channel_match;
ALTER TABLE auth.context_exchange_tickets ADD CONSTRAINT ticket_family_channel_match
  CHECK (
    channel='INTERNAL'
    OR channel='STAFF'
    OR (channel='STUDENT' AND family_id IS NULL)
    OR (channel IN ('FAMILY','ADVISOR','PARTNER') AND family_id IS NOT NULL)
  );

-- Only Academy Admin/Founder are explicit grants. Student, Parent and Teacher
-- capabilities continue to derive from the existing Canonical subject records.
CREATE TABLE learning.academy_staff_grants (
  grant_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(grant_id)),
  principal_id uuid NOT NULL REFERENCES auth.principals,
  capability_code text NOT NULL CHECK (capability_code IN ('ACADEMY_ADMIN','ACADEMY_FOUNDER')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  authorization_version bigint NOT NULL DEFAULT 1 CHECK (authorization_version>0),
  valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),
  valid_until timestamptz,
  granted_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  revoked_by_principal_id uuid REFERENCES auth.principals,
  revoked_at timestamptz,
  revoked_reason_code text CHECK (revoked_reason_code IS NULL OR length(btrim(revoked_reason_code)) BETWEEN 1 AND 200),
  reason_code text NOT NULL CHECK (length(btrim(reason_code)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (valid_until IS NULL OR valid_until>valid_from),
  CHECK ((status='REVOKED')=(revoked_at IS NOT NULL AND revoked_by_principal_id IS NOT NULL)),
  CHECK (status<>'EXPIRED' OR (revoked_at IS NULL AND revoked_by_principal_id IS NULL))
);
CREATE UNIQUE INDEX academy_staff_grants_one_active
  ON learning.academy_staff_grants(principal_id,capability_code) WHERE status='ACTIVE';
ALTER TABLE learning.academy_staff_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.academy_staff_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY academy_staff_grants_no_direct_access
  ON learning.academy_staff_grants FOR ALL
  TO phoenix_canonical_app,phoenix_canonical_reader
  USING (false) WITH CHECK (false);
REVOKE ALL ON learning.academy_staff_grants FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader;

CREATE FUNCTION learning.protect_academy_staff_grant() RETURNS trigger
LANGUAGE plpgsql
SET search_path=pg_catalog,learning
AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACADEMY_STAFF_GRANT_DELETE_DENIED'; END IF;
  IF ROW(NEW.grant_id,NEW.principal_id,NEW.capability_code,NEW.valid_from,NEW.valid_until,
         NEW.granted_by_principal_id,NEW.reason_code,NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.grant_id,OLD.principal_id,OLD.capability_code,OLD.valid_from,OLD.valid_until,
         OLD.granted_by_principal_id,OLD.reason_code,OLD.created_at) THEN
    RAISE EXCEPTION 'ACADEMY_STAFF_GRANT_IDENTITY_IMMUTABLE';
  END IF;
  IF OLD.status<>'ACTIVE' OR NEW.status NOT IN ('REVOKED','EXPIRED')
     OR NEW.authorization_version<>OLD.authorization_version+1 THEN
    RAISE EXCEPTION 'ACADEMY_STAFF_GRANT_TRANSITION_INVALID';
  END IF;
  IF NEW.status='REVOKED' AND (NEW.revoked_at IS NULL OR NEW.revoked_by_principal_id IS NULL
      OR length(btrim(NEW.revoked_reason_code)) NOT BETWEEN 1 AND 200) THEN
    RAISE EXCEPTION 'ACADEMY_STAFF_GRANT_REVOCATION_EVIDENCE_REQUIRED';
  END IF;
  IF NEW.status='EXPIRED' AND (NEW.revoked_at IS NOT NULL OR NEW.revoked_by_principal_id IS NOT NULL
      OR NEW.revoked_reason_code IS NOT NULL) THEN
    RAISE EXCEPTION 'ACADEMY_STAFF_GRANT_EXPIRY_EVIDENCE_INVALID';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER academy_staff_grant_protect_update
  BEFORE UPDATE ON learning.academy_staff_grants
  FOR EACH ROW EXECUTE FUNCTION learning.protect_academy_staff_grant();
CREATE TRIGGER academy_staff_grant_delete_denied
  BEFORE DELETE ON learning.academy_staff_grants
  FOR EACH ROW EXECUTE FUNCTION learning.reject_history_change();

-- Only the dedicated internal bootstrap SERVICE can create or revoke Founder grants.
CREATE FUNCTION learning.is_academy_bootstrap_service() RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN coalesce(
  auth.is_internal_service()
  AND auth.current_family_id() IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.principals p
    WHERE p.principal_id=auth.current_principal_id()
      AND p.principal_kind='SERVICE' AND p.person_id IS NULL
      AND p.status='ACTIVE' AND p.service_label='academy_founder_bootstrap_v1'
  ),false);

CREATE FUNCTION learning.has_academy_capability(p_capability_code text) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning
RETURN coalesce(
  p_capability_code IN ('ACADEMY_ADMIN','ACADEMY_FOUNDER')
  AND auth.write_context_is_live()
  AND auth.current_channel()='STAFF'
  AND EXISTS (
    SELECT 1 FROM auth.principals p
    WHERE p.principal_id=auth.current_principal_id()
      AND p.person_id=auth.current_actor_person_id()
      AND p.person_id IS NOT NULL AND p.status='ACTIVE'
  )
  AND EXISTS (
    SELECT 1 FROM learning.academy_staff_grants g
    WHERE g.principal_id=auth.current_principal_id()
      AND g.capability_code=p_capability_code
      AND g.status='ACTIVE'
      AND g.valid_from<=clock_timestamp()
      AND (g.valid_until IS NULL OR g.valid_until>clock_timestamp())
  ),false);

CREATE FUNCTION learning.grant_academy_staff_capability(
  p_grant_id uuid,p_target_principal_id uuid,p_capability_code text,
  p_valid_until timestamptz,p_reason_code text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v_target_person uuid;
BEGIN
  IF (core.is_uuid_v7(p_grant_id)
      AND p_capability_code IN ('ACADEMY_ADMIN','ACADEMY_FOUNDER')
      AND length(btrim(p_reason_code)) BETWEEN 1 AND 200
      AND (p_valid_until IS NULL OR p_valid_until>clock_timestamp())
      AND EXISTS (SELECT 1 FROM auth.principals p
        WHERE p.principal_id=p_target_principal_id AND p.person_id IS NOT NULL AND p.status='ACTIVE')) IS NOT TRUE THEN
    RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,false,'TARGET_OR_INPUT_DENIED');
  END IF;

  SELECT person_id INTO v_target_person FROM auth.principals
   WHERE principal_id=p_target_principal_id AND person_id IS NOT NULL AND status='ACTIVE';

  IF p_capability_code='ACADEMY_FOUNDER' THEN
    IF learning.is_academy_bootstrap_service() IS NOT TRUE
       OR EXISTS (SELECT 1 FROM learning.academy_staff_grants
         WHERE capability_code='ACADEMY_FOUNDER' AND status='ACTIVE'
           AND valid_from<=clock_timestamp() AND (valid_until IS NULL OR valid_until>clock_timestamp())) THEN
      RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,false,'FOUNDER_BOOTSTRAP_INTERNAL_ONLY');
    END IF;
  ELSE
    IF learning.has_academy_capability('ACADEMY_FOUNDER') IS NOT TRUE
       OR p_target_principal_id=auth.current_principal_id() THEN
      RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,false,'FOUNDER_AUTHORITY_REQUIRED');
    END IF;
  END IF;

  UPDATE learning.academy_staff_grants
     SET status='EXPIRED',authorization_version=authorization_version+1
   WHERE principal_id=p_target_principal_id
     AND capability_code=p_capability_code
     AND status='ACTIVE'
     AND valid_until IS NOT NULL
     AND valid_until<=clock_timestamp();

  IF EXISTS (SELECT 1 FROM learning.academy_staff_grants
      WHERE principal_id=p_target_principal_id AND capability_code=p_capability_code AND status='ACTIVE') THEN
    RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,false,'ACTIVE_GRANT_ALREADY_EXISTS');
  END IF;

  INSERT INTO learning.academy_staff_grants(
    grant_id,principal_id,capability_code,status,valid_from,valid_until,
    granted_by_principal_id,reason_code
  ) VALUES (
    p_grant_id,p_target_principal_id,p_capability_code,'ACTIVE',clock_timestamp(),p_valid_until,
    auth.current_principal_id(),btrim(p_reason_code)
  );
  RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,true,'GRANTED');
END
$fn$;

CREATE FUNCTION learning.revoke_academy_staff_capability(
  p_grant_id uuid,p_reason_code text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning,audit
AS $fn$
DECLARE v learning.academy_staff_grants%ROWTYPE;
BEGIN
  SELECT * INTO v FROM learning.academy_staff_grants WHERE grant_id=p_grant_id FOR UPDATE;
  IF NOT FOUND OR v.status<>'ACTIVE' OR length(btrim(p_reason_code)) NOT BETWEEN 1 AND 200 THEN
    RETURN audit.record_write_decision('REVOKE','ACADEMY_STAFF_CAPABILITY',p_grant_id,false,'GRANT_OR_INPUT_DENIED');
  END IF;
  IF v.capability_code='ACADEMY_FOUNDER' THEN
    IF learning.is_academy_bootstrap_service() IS NOT TRUE THEN
      RETURN audit.record_write_decision('REVOKE','ACADEMY_STAFF_CAPABILITY',p_grant_id,false,'FOUNDER_REVOCATION_INTERNAL_ONLY');
    END IF;
  ELSIF learning.has_academy_capability('ACADEMY_FOUNDER') IS NOT TRUE THEN
    RETURN audit.record_write_decision('REVOKE','ACADEMY_STAFF_CAPABILITY',p_grant_id,false,'FOUNDER_AUTHORITY_REQUIRED');
  END IF;
  UPDATE learning.academy_staff_grants
     SET status='REVOKED',authorization_version=authorization_version+1,revoked_at=clock_timestamp(),
         revoked_by_principal_id=auth.current_principal_id(),
         revoked_reason_code=btrim(p_reason_code)
   WHERE grant_id=p_grant_id;
  RETURN audit.record_write_decision('REVOKE','ACADEMY_STAFF_CAPABILITY',p_grant_id,true,'REVOKED');
END
$fn$;

-- The same person reuses the existing Principal. A mismatched second Principal is denied.
CREATE OR REPLACE FUNCTION learning.register_staff_principal(
  p_principal_id uuid,p_person_id uuid,p_kind text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v_existing auth.principals%ROWTYPE;
BEGIN
  IF (auth.is_internal_service() AND core.is_uuid_v7(p_principal_id)
      AND p_person_id IS NOT NULL AND p_kind IN ('TEACHER','SUPERVISOR')
      AND EXISTS (SELECT 1 FROM core.people WHERE person_id=p_person_id)) IS NOT TRUE THEN
    RETURN audit.record_write_decision('REGISTER','LEARNING_STAFF_PRINCIPAL',p_principal_id,false,'SERVICE_OR_INPUT_DENIED');
  END IF;

  SELECT * INTO v_existing FROM auth.principals WHERE person_id=p_person_id;
  IF FOUND THEN
    IF v_existing.principal_id<>p_principal_id OR v_existing.status<>'ACTIVE' THEN
      RETURN audit.record_write_decision('REGISTER','LEARNING_STAFF_PRINCIPAL',p_principal_id,false,'EXISTING_PRINCIPAL_MISMATCH_OR_DISABLED');
    END IF;
    RETURN audit.record_write_decision('REGISTER','LEARNING_STAFF_PRINCIPAL',p_principal_id,true,'EXISTING_PRINCIPAL_REUSED');
  END IF;

  IF p_kind='TEACHER' AND NOT EXISTS (
      SELECT 1 FROM learning.teacher WHERE teacher_person_id=p_person_id AND status='ACTIVE') THEN
    RETURN audit.record_write_decision('REGISTER','LEARNING_STAFF_PRINCIPAL',p_principal_id,false,'ACTIVE_TEACHER_REQUIRED');
  END IF;

  INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
  VALUES(p_principal_id,p_person_id,p_kind,'ACTIVE')
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN audit.record_write_decision('REGISTER','LEARNING_STAFF_PRINCIPAL',p_principal_id,false,'PRINCIPAL_CONFLICT');
  END IF;
  RETURN audit.record_write_decision('REGISTER','LEARNING_STAFF_PRINCIPAL',p_principal_id,true,'REGISTERED');
END
$fn$;

-- Context validation derives Student, Parent and Teacher capability from Canonical
-- facts. principal_kind remains a legacy identity classification, not the permission.
CREATE OR REPLACE FUNCTION auth.validate_context_request(
  p_principal_id uuid,p_actor_person_id uuid,p_family_id uuid,p_channel text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,casework,learning
AS $fn$
DECLARE v_principal auth.principals%ROWTYPE;
BEGIN
  IF p_channel NOT IN ('FAMILY','ADVISOR','PARTNER','INTERNAL','STAFF','STUDENT') OR p_channel IS NULL THEN
    RAISE EXCEPTION 'CONTEXT_CHANNEL_INVALID';
  END IF;
  SELECT * INTO v_principal FROM auth.principals
   WHERE principal_id=p_principal_id AND status='ACTIVE';
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTEXT_PRINCIPAL_INVALID'; END IF;

  IF p_channel='INTERNAL' THEN
    IF p_actor_person_id IS NOT NULL OR v_principal.person_id IS NOT NULL
       OR v_principal.principal_kind<>'SERVICE' THEN
      RAISE EXCEPTION 'CONTEXT_SERVICE_ACTOR_MUST_BE_NULL';
    END IF;
    IF p_family_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM core.families WHERE family_id=p_family_id) THEN
      RAISE EXCEPTION 'CONTEXT_FAMILY_INVALID';
    END IF;
    RETURN;
  END IF;

  IF p_actor_person_id IS NULL OR v_principal.person_id IS DISTINCT FROM p_actor_person_id THEN
    RAISE EXCEPTION 'CONTEXT_ACTOR_OR_PRINCIPAL_INVALID';
  END IF;

  IF p_channel='FAMILY' THEN
    IF p_family_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM core.family_memberships m
      WHERE m.family_id=p_family_id AND m.person_id=p_actor_person_id
        AND m.valid_from<=clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
    ) THEN
      RAISE EXCEPTION 'CONTEXT_FAMILY_MEMBERSHIP_INVALID';
    END IF;
    -- The FAMILY context is also used by existing self/family APIs, not only
    -- by the new Parent view. Preserve generic membership semantics here.
    -- Parent-view routing must independently call auth.can_open_parent_view();
    -- every child read still rechecks exact Guardian Authority and Consent.
    RETURN;
  END IF;

  IF p_channel='STUDENT' THEN
    IF p_family_id IS NOT NULL OR NOT EXISTS (
      SELECT 1 FROM core.student_profiles s WHERE s.person_id=p_actor_person_id
    ) THEN
      RAISE EXCEPTION 'CONTEXT_STUDENT_SELF_REQUIRED';
    END IF;
    RETURN;
  END IF;

  IF p_channel='ADVISOR' THEN
    IF v_principal.principal_kind<>'ADVISOR' OR p_family_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM casework.cases c JOIN casework.advisor_assignments a ON a.case_id=c.case_id
      WHERE c.family_id=p_family_id AND a.advisor_person_id=p_actor_person_id
        AND c.status IN ('OPEN','PAUSED')
        AND a.valid_from<=clock_timestamp() AND a.valid_until>clock_timestamp()
        AND a.revoked_at IS NULL AND a.lifecycle_status='ACTIVE'
    ) THEN
      RAISE EXCEPTION 'CONTEXT_ADVISOR_ASSIGNMENT_INVALID';
    END IF;
    RETURN;
  END IF;

  IF p_channel='PARTNER' THEN
    IF v_principal.principal_kind<>'CHANNEL' OR p_family_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM integration.channel_grants
      WHERE principal_id=p_principal_id AND family_id=p_family_id
        AND valid_from<=clock_timestamp() AND valid_until>clock_timestamp() AND revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CONTEXT_CHANNEL_GRANT_INVALID';
    END IF;
    RETURN;
  END IF;

  IF p_channel='STAFF' THEN
    IF p_family_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM core.families WHERE family_id=p_family_id) THEN
      RAISE EXCEPTION 'CONTEXT_FAMILY_INVALID';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM learning.teacher t
      WHERE t.teacher_person_id=p_actor_person_id AND t.status='ACTIVE'
    ) AND NOT EXISTS (
      SELECT 1 FROM learning.academy_staff_grants g
      WHERE g.principal_id=p_principal_id AND g.status='ACTIVE'
        AND g.valid_from<=clock_timestamp() AND (g.valid_until IS NULL OR g.valid_until>clock_timestamp())
    ) THEN
      RAISE EXCEPTION 'CONTEXT_STAFF_CAPABILITY_REQUIRED';
    END IF;
    RETURN;
  END IF;
END
$fn$;

CREATE FUNCTION auth.can_open_parent_view(p_family_id uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core
RETURN coalesce(
  auth.write_context_is_live()
  AND auth.current_channel()='FAMILY'
  AND auth.current_family_id()=p_family_id
  AND auth.current_actor_person_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.principals p
    WHERE p.principal_id=auth.current_principal_id()
      AND p.person_id=auth.current_actor_person_id()
      AND p.status='ACTIVE'
  )
  AND EXISTS (
    SELECT 1 FROM core.family_memberships m
    WHERE m.family_id=p_family_id AND m.person_id=auth.current_actor_person_id()
      AND m.valid_from<=clock_timestamp()
      AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
  )
  AND EXISTS (
    SELECT 1 FROM core.guardian_authorities g
    WHERE g.family_id=p_family_id AND g.guardian_person_id=auth.current_actor_person_id()
      AND g.evidence_level='VERIFIED' AND g.lifecycle_status='ACTIVE'
      AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp()
      AND g.valid_until>clock_timestamp()
      AND EXISTS (
        SELECT 1 FROM core.family_memberships sm
        WHERE sm.family_id=g.family_id AND sm.person_id=g.subject_person_id
          AND sm.valid_from<=clock_timestamp()
          AND (sm.valid_until IS NULL OR sm.valid_until>clock_timestamp())
      )
  ),false);

CREATE OR REPLACE FUNCTION core.can_read_subject_basics(p_person_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,casework,integration
RETURN CASE auth.current_channel()
  WHEN 'FAMILY' THEN core.current_actor_is_family_member() AND core.person_in_current_family(p_person_id)
  WHEN 'STUDENT' THEN auth.current_actor_person_id()=p_person_id
    AND EXISTS (
      SELECT 1 FROM core.student_profiles s
      JOIN auth.principals p ON p.person_id=s.person_id
      WHERE s.person_id=p_person_id
        AND p.principal_id=auth.current_principal_id()
        AND p.status='ACTIVE'
    )
  WHEN 'ADVISOR' THEN EXISTS (
    SELECT 1 FROM casework.cases c JOIN casework.advisor_assignments a ON a.case_id=c.case_id
    WHERE c.family_id=auth.current_family_id() AND c.subject_person_id=p_person_id
      AND a.advisor_person_id=auth.current_actor_person_id()
      AND a.valid_from<=clock_timestamp() AND a.valid_until>clock_timestamp()
      AND a.revoked_at IS NULL AND a.lifecycle_status='ACTIVE'
  )
  WHEN 'PARTNER' THEN integration.has_active_channel_grant(p_person_id)
  ELSE false
END;

DROP POLICY IF EXISTS people_read ON core.people;
CREATE POLICY people_read ON core.people
  FOR SELECT TO phoenix_canonical_app,phoenix_canonical_reader
  USING (
    (core.person_in_current_family(person_id) AND core.can_read_subject_basics(person_id))
    OR (auth.current_channel()='STUDENT'
        AND auth.current_actor_person_id()=person_id
        AND core.can_read_subject_basics(person_id))
  );

-- Public client projection uses registered opaque Student refs, never raw Person UUIDs.
-- Reuse the exact 0037 audited Family projection. Only the Principal-kind
-- requirement is broadened; FAMILY context, actor match, live family membership,
-- exact guardian/consent checks, and audited projection are preserved.
CREATE OR REPLACE FUNCTION core.read_projection_summary(p_operation text,p_public_id text) RETURNS jsonb
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
      AND p.principal_kind<>'SERVICE' AND p.status='ACTIVE'
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

CREATE FUNCTION core.read_student_self_summary()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit
AS $fn$
DECLARE v_allowed boolean; v_ref text; v_name text;
BEGIN
  v_allowed := auth.write_context_is_live()
    AND auth.current_channel()='STUDENT'
    AND auth.current_family_id() IS NULL
    AND auth.current_actor_person_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM auth.principals p
      JOIN core.student_profiles s ON s.person_id=p.person_id
      WHERE p.principal_id=auth.current_principal_id()
        AND p.person_id=auth.current_actor_person_id()
        AND p.status='ACTIVE'
    );
  IF v_allowed THEN
    v_ref := integration.lookup_projection_public_id('STUDENT_PROFILE',auth.current_actor_person_id());
    SELECT display_name INTO v_name FROM core.people
      WHERE person_id=auth.current_actor_person_id();
    v_allowed := v_ref IS NOT NULL AND v_name IS NOT NULL;
  END IF;
  PERFORM audit.record_access_event('READ','STUDENT_SELF_SUMMARY',
    auth.current_actor_person_id(),
    CASE WHEN v_allowed THEN 'ALLOW' ELSE 'DENY' END,
    CASE WHEN v_allowed THEN 'STUDENT_SELF_ONLY' ELSE 'STUDENT_CONTEXT_MAPPING_OR_SUBJECT_DENIED' END);
  IF v_allowed THEN
    RETURN jsonb_build_object('schemaVersion','student-summary.v2','item',
      jsonb_build_object('studentRef',v_ref,'displayName',v_name));
  END IF;
  RETURN NULL;
END
$fn$;

CREATE OR REPLACE FUNCTION consent.has_active_consent_for_subject(
  p_family_id uuid,p_subject_person_id uuid,p_purpose text,p_data_class text
) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,consent
RETURN coalesce(
  auth.write_context_is_live()
  AND auth.current_channel()='STAFF'
  AND (auth.current_family_id() IS NULL OR auth.current_family_id()=p_family_id)
  AND auth.current_actor_person_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.principals p
    WHERE p.principal_id=auth.current_principal_id()
      AND p.person_id=auth.current_actor_person_id()
      AND p.status='ACTIVE'
  )
  AND EXISTS (
    SELECT 1
    FROM consent.grants g
    JOIN core.family_memberships sm
      ON sm.family_id=g.family_id AND sm.person_id=g.subject_person_id
    JOIN core.family_memberships gm
      ON gm.family_id=g.family_id AND gm.person_id=g.grantor_person_id
    WHERE g.family_id=p_family_id
      AND g.grantee_person_id=auth.current_actor_person_id()
      AND g.subject_person_id=p_subject_person_id
      AND g.purpose=p_purpose AND g.data_class=p_data_class
      AND g.status='ACTIVE' AND g.expires_at>clock_timestamp()
      AND sm.valid_from<=clock_timestamp() AND (sm.valid_until IS NULL OR sm.valid_until>clock_timestamp())
      AND gm.valid_from<=clock_timestamp() AND (gm.valid_until IS NULL OR gm.valid_until>clock_timestamp())
      AND (
        (g.grantor_person_id=g.subject_person_id
          AND core.current_civil_capacity(g.subject_person_id)='ADULT_VERIFIED')
        OR EXISTS (
          SELECT 1 FROM core.guardian_authorities ga
          WHERE ga.family_id=g.family_id
            AND ga.guardian_person_id=g.grantor_person_id
            AND ga.subject_person_id=g.subject_person_id
            AND ga.evidence_level='VERIFIED'
            AND ga.scope IN ('GENERAL',CASE g.data_class
              WHEN 'EDUCATION' THEN 'EDUCATION'
              WHEN 'IDENTITY_SENSITIVE' THEN 'IDENTITY'
              WHEN 'LEARNING' THEN 'LEARNING'
              ELSE 'GENERAL' END)
            AND ga.lifecycle_status='ACTIVE' AND ga.revoked_at IS NULL
            AND ga.valid_from<=clock_timestamp() AND ga.valid_until>clock_timestamp()
        )
      )
  ),false);

CREATE OR REPLACE FUNCTION learning.has_learning_consent_for_subject(
  p_family_id uuid,p_subject_person_id uuid
) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,consent,learning
RETURN consent.has_active_consent_for_subject(
  p_family_id,p_subject_person_id,'LEARNING_RECORD','LEARNING'
);

CREATE OR REPLACE FUNCTION learning.current_staff_kind() RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning
RETURN CASE
  WHEN learning.has_academy_capability('ACADEMY_FOUNDER') THEN 'ACADEMY_FOUNDER'
  WHEN learning.has_academy_capability('ACADEMY_ADMIN') THEN 'ACADEMY_ADMIN'
  WHEN auth.current_channel()='STAFF'
    AND EXISTS (SELECT 1 FROM auth.principals p
      WHERE p.principal_id=auth.current_principal_id()
        AND p.person_id=auth.current_actor_person_id()
        AND p.status='ACTIVE')
    AND EXISTS (SELECT 1 FROM learning.teacher t
      WHERE t.teacher_person_id=auth.current_actor_person_id() AND t.status='ACTIVE') THEN 'TEACHER'
  ELSE NULL
END;

CREATE OR REPLACE FUNCTION learning.teacher_has_class_access(
  p_class_id uuid,p_subject_id uuid
) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning
RETURN coalesce(
  auth.current_channel()='STAFF'
  AND EXISTS (
    SELECT 1
    FROM learning.teacher t
    JOIN learning.teacher_assignment a ON a.teacher_person_id=t.teacher_person_id
    JOIN learning.class c ON c.class_id=a.class_id
    JOIN learning.enrollment_class ec ON ec.class_id=c.class_id
    JOIN learning.enrollment e ON e.enrollment_id=ec.enrollment_id
      AND e.family_id=ec.family_id AND e.student_person_id=ec.student_person_id
    WHERE t.teacher_person_id=auth.current_actor_person_id()
      AND t.status='ACTIVE'
      AND a.class_id=p_class_id AND a.status='ACTIVE' AND a.revoked_at IS NULL
      AND a.valid_from<=clock_timestamp() AND a.valid_until>clock_timestamp()
      AND c.status IN ('OPEN','RUNNING')
      AND ec.student_person_id=p_subject_id AND ec.status='ACTIVE'
      AND e.status='ACTIVE'
      AND learning.has_learning_consent_for_subject(ec.family_id,p_subject_id)
  ),false);

CREATE OR REPLACE FUNCTION learning.can_manage_learning() RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning
RETURN coalesce(
  auth.is_internal_service()
  OR learning.has_academy_capability('ACADEMY_ADMIN')
  OR learning.has_academy_capability('ACADEMY_FOUNDER'),false);

CREATE OR REPLACE FUNCTION learning.can_read_sensitive(
  p_family_id uuid,p_subject_id uuid,p_class_id uuid
) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning
RETURN coalesce(
  auth.write_context_is_live()
  AND EXISTS (
    SELECT 1 FROM auth.principals p
    WHERE p.principal_id=auth.current_principal_id()
      AND p.person_id=auth.current_actor_person_id()
      AND p.status='ACTIVE'
  )
  AND (
    (
      auth.current_channel()='FAMILY'
      AND auth.current_family_id()=p_family_id
    AND core.current_actor_is_family_member()
    AND (
      auth.current_actor_person_id()=p_subject_id
      OR (
        -- S1 live revocation: old FAMILY contexts must not preserve an expired
        -- guardian membership in a later request. Keep this extra check
        -- specifically on the guardian-to-child branch, not Student self-read.
        EXISTS (
          SELECT 1 FROM core.family_memberships m
          WHERE m.family_id=p_family_id
            AND m.person_id=auth.current_actor_person_id()
            AND m.valid_from<=clock_timestamp()
            AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
        )
        AND EXISTS (
          SELECT 1 FROM core.guardian_authorities g
          WHERE g.family_id=p_family_id
            AND g.guardian_person_id=auth.current_actor_person_id()
            AND g.subject_person_id=p_subject_id
            AND g.evidence_level='VERIFIED'
            AND g.scope IN ('GENERAL','LEARNING')
            AND g.lifecycle_status='ACTIVE'
            AND g.revoked_at IS NULL
            AND g.valid_from<=clock_timestamp()
            AND g.valid_until>clock_timestamp()
        )
        -- Guardian Authority / Consent must never outlive the subject's
        -- current membership in the same Canonical family.
        AND EXISTS (
          SELECT 1 FROM core.family_memberships sm
          WHERE sm.family_id=p_family_id AND sm.person_id=p_subject_id
            AND sm.valid_from<=clock_timestamp()
            AND (sm.valid_until IS NULL OR sm.valid_until>clock_timestamp())
        )
        AND learning.has_learning_consent(p_subject_id)
      )
    )
  )
  OR (
    auth.current_channel()='STUDENT'
    AND auth.current_family_id() IS NULL
    AND auth.current_actor_person_id()=p_subject_id
    AND EXISTS (SELECT 1 FROM core.student_profiles s WHERE s.person_id=p_subject_id)
  )
  OR (
    auth.current_channel()='STAFF'
    AND (auth.current_family_id() IS NULL OR auth.current_family_id()=p_family_id)
    AND (
      (
        (learning.has_academy_capability('ACADEMY_ADMIN')
         OR learning.has_academy_capability('ACADEMY_FOUNDER'))
        AND learning.has_learning_consent_for_subject(p_family_id,p_subject_id)
      )
      OR learning.teacher_has_class_access(p_class_id,p_subject_id)
    )
  )
  ),false);

-- Administrative attendance corrections must not pretend the admin is a Teacher.
-- Preserve the old teacher reference for actual teachers, add the Principal actor.
ALTER TABLE learning.attendance_correction
  ALTER COLUMN corrected_by_teacher_person_id DROP NOT NULL,
  ADD COLUMN corrected_by_principal_id uuid REFERENCES auth.principals;
ALTER TABLE learning.attendance_correction
  ADD CONSTRAINT attendance_correction_actor_required
  CHECK (corrected_by_teacher_person_id IS NOT NULL OR corrected_by_principal_id IS NOT NULL);

CREATE OR REPLACE FUNCTION learning.correct_attendance(
  p_id uuid,p_attendance_id uuid,p_status text,p_reason text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v learning.attendance_record%ROWTYPE;
BEGIN
  SELECT * INTO v FROM learning.attendance_record WHERE attendance_id=p_attendance_id;
  IF (FOUND AND core.is_uuid_v7(p_id) AND p_status IN ('PRESENT','ABSENT','LATE','LEAVE')
      AND length(btrim(p_reason)) BETWEEN 1 AND 100
      AND (
        ((learning.has_academy_capability('ACADEMY_ADMIN')
          OR learning.has_academy_capability('ACADEMY_FOUNDER'))
          AND learning.has_learning_consent_for_subject(v.family_id,v.student_person_id))
        OR learning.teacher_has_class_access(v.class_id,v.student_person_id)
      )) IS NOT TRUE THEN
    RETURN audit.record_write_decision('CORRECT','LEARNING_ATTENDANCE',p_id,false,'STAFF_ASSIGNMENT_OR_CONSENT_DENIED');
  END IF;
  INSERT INTO learning.attendance_correction(
    correction_id,attendance_id,new_status,reason_code,
    corrected_by_teacher_person_id,corrected_by_principal_id
  ) VALUES (
    p_id,p_attendance_id,p_status,p_reason,
    CASE WHEN EXISTS (
      SELECT 1 FROM learning.teacher t WHERE t.teacher_person_id=auth.current_actor_person_id()
    ) THEN auth.current_actor_person_id() ELSE NULL END,
    auth.current_principal_id()
  );
  RETURN audit.record_write_decision('CORRECT','LEARNING_ATTENDANCE',p_id,true,'CORRECTION_APPENDED');
END
$fn$;

CREATE OR REPLACE FUNCTION learning.publish_after_class_card(
  p_publication_id uuid,p_card_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v learning.after_class_card%ROWTYPE;
BEGIN
  SELECT * INTO v FROM learning.after_class_card WHERE card_id=p_card_id FOR UPDATE;
  IF (FOUND AND core.is_uuid_v7(p_publication_id)
      AND (learning.has_academy_capability('ACADEMY_ADMIN')
        OR learning.has_academy_capability('ACADEMY_FOUNDER'))
      AND v.status IN ('SUBMITTED','RETRACTED')
      AND learning.has_learning_consent_for_subject(v.family_id,v.student_person_id)) IS NOT TRUE THEN
    RETURN audit.record_write_decision('PUBLISH','LEARNING_AFTER_CLASS_CARD',p_card_id,false,'ACADEMY_GRANT_CONSENT_OR_STATE_DENIED');
  END IF;
  INSERT INTO learning.publication(publication_id,card_id,family_id,event_kind,acted_by_principal_id)
  VALUES(p_publication_id,p_card_id,v.family_id,'PUBLISHED',auth.current_principal_id());
  UPDATE learning.after_class_card SET status='PUBLISHED',updated_at=clock_timestamp() WHERE card_id=p_card_id;
  RETURN audit.record_write_decision('PUBLISH','LEARNING_AFTER_CLASS_CARD',p_card_id,true,'PUBLISHED');
END
$fn$;

CREATE OR REPLACE FUNCTION learning.retract_after_class_card(
  p_publication_id uuid,p_card_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v learning.after_class_card%ROWTYPE; v_previous uuid;
BEGIN
  SELECT * INTO v FROM learning.after_class_card WHERE card_id=p_card_id FOR UPDATE;
  SELECT publication_id INTO v_previous FROM learning.publication
    WHERE card_id=p_card_id AND event_kind='PUBLISHED' ORDER BY acted_at DESC LIMIT 1;
  IF (FOUND AND core.is_uuid_v7(p_publication_id)
      AND (learning.has_academy_capability('ACADEMY_ADMIN')
        OR learning.has_academy_capability('ACADEMY_FOUNDER'))
      AND v.status='PUBLISHED'
      AND learning.has_learning_consent_for_subject(v.family_id,v.student_person_id)
      AND v_previous IS NOT NULL) IS NOT TRUE THEN
    RETURN audit.record_write_decision('RETRACT','LEARNING_AFTER_CLASS_CARD',p_card_id,false,'ACADEMY_GRANT_CONSENT_OR_STATE_DENIED');
  END IF;
  INSERT INTO learning.publication(publication_id,card_id,family_id,event_kind,supersedes_publication_id,acted_by_principal_id)
  VALUES(p_publication_id,p_card_id,v.family_id,'RETRACTED',v_previous,auth.current_principal_id());
  UPDATE learning.after_class_card SET status='RETRACTED',updated_at=clock_timestamp() WHERE card_id=p_card_id;
  RETURN audit.record_write_decision('RETRACT','LEARNING_AFTER_CLASS_CARD',p_card_id,true,'RETRACTED');
END
$fn$;

CREATE OR REPLACE FUNCTION learning.advance_stage_report(p_id uuid,p_next text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,learning,audit
AS $fn$
DECLARE v learning.stage_report%ROWTYPE; v_class uuid; v_allowed boolean;
BEGIN
  SELECT * INTO v FROM learning.stage_report WHERE report_id=p_id FOR UPDATE;
  SELECT class_id INTO v_class FROM learning.enrollment_class
    WHERE enrollment_id=v.enrollment_id AND status='ACTIVE' LIMIT 1;
  v_allowed :=
      v.status='DRAFT' AND p_next='SUBMITTED'
      AND v.author_teacher_person_id=auth.current_actor_person_id()
      AND learning.teacher_has_class_access(v_class,v.student_person_id)
    OR p_next IN ('PUBLISHED','RETRACTED')
      AND (learning.has_academy_capability('ACADEMY_ADMIN')
        OR learning.has_academy_capability('ACADEMY_FOUNDER'))
      AND learning.has_learning_consent_for_subject(v.family_id,v.student_person_id)
      AND (v.status='SUBMITTED' AND p_next='PUBLISHED'
        OR v.status='PUBLISHED' AND p_next='RETRACTED'
        OR v.status='RETRACTED' AND p_next='PUBLISHED');
  IF (FOUND AND v_allowed) IS NOT TRUE THEN
    RETURN audit.record_write_decision('ADVANCE','LEARNING_STAGE_REPORT',p_id,false,'STAFF_CONSENT_OR_STATE_DENIED');
  END IF;
  UPDATE learning.stage_report SET status=p_next,updated_at=clock_timestamp() WHERE report_id=p_id;
  RETURN audit.record_write_decision('ADVANCE','LEARNING_STAGE_REPORT',p_id,true,'STATE_ADVANCED');
END
$fn$;

-- No direct table access; only the narrow audited API is exposed.
REVOKE ALL ON learning.academy_staff_grants FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader;
-- Newly created SECURITY DEFINER functions have PostgreSQL's default PUBLIC
-- EXECUTE unless explicitly revoked; GRANT alone does not remove that right.
REVOKE EXECUTE ON FUNCTION learning.grant_academy_staff_capability(uuid,uuid,text,timestamptz,text),
  learning.revoke_academy_staff_capability(uuid,text),
  learning.protect_academy_staff_grant(),
  core.read_student_self_summary(),
  auth.can_open_parent_view(uuid)
FROM PUBLIC,phoenix_canonical_reader,phoenix_canonical_context_binder;
REVOKE EXECUTE ON FUNCTION learning.is_academy_bootstrap_service(),
  learning.has_academy_capability(text),
  learning.current_staff_kind(),learning.has_learning_consent_for_subject(uuid,uuid),
  learning.teacher_has_class_access(uuid,uuid),learning.can_manage_learning(),
  learning.can_read_sensitive(uuid,uuid,uuid),
  consent.has_active_consent_for_subject(uuid,uuid,text,text),
  auth.validate_context_request(uuid,uuid,uuid,text)
FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader;
GRANT EXECUTE ON FUNCTION learning.grant_academy_staff_capability(uuid,uuid,text,timestamptz,text),
  learning.revoke_academy_staff_capability(uuid,text)
TO phoenix_canonical_app;
-- Parent-switch capability guard is invoked by the application after a fresh
-- FAMILY binding. Do not expose it to reader/binder/PUBLIC.
GRANT EXECUTE ON FUNCTION auth.can_open_parent_view(uuid)
TO phoenix_canonical_app;
GRANT EXECUTE ON FUNCTION core.read_student_self_summary()
TO phoenix_canonical_app,phoenix_canonical_reader;

COMMIT;
