BEGIN;

-- P0.1 / Package A1: minimum explicit Academy capability grants.
-- Unnumbered candidate; formal 0001-0037 remain unchanged.
-- This candidate does NOT change Principal kind, context channels, or lesson-hour rules.
CREATE TABLE learning.academy_staff_grants (
  grant_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(grant_id)),
  principal_id uuid NOT NULL REFERENCES auth.principals,
  capability_code text NOT NULL CHECK (capability_code IN ('ACADEMY_ADMIN','ACADEMY_FOUNDER')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),
  valid_until timestamptz,
  granted_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  revoked_by_principal_id uuid REFERENCES auth.principals,
  revoked_at timestamptz,
  authorization_version bigint NOT NULL DEFAULT 1 CHECK (authorization_version >= 1),
  reason_code text NOT NULL CHECK (length(btrim(reason_code)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK (
    (status='ACTIVE' AND revoked_at IS NULL AND revoked_by_principal_id IS NULL)
    OR (status='REVOKED' AND revoked_at IS NOT NULL AND revoked_by_principal_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX academy_staff_grants_one_active_uq
  ON learning.academy_staff_grants(principal_id,capability_code)
  WHERE status='ACTIVE';
CREATE INDEX academy_staff_grants_current_idx
  ON learning.academy_staff_grants(principal_id,status,valid_until);

-- The identity fields and event history cannot be rewritten after grant creation.
CREATE FUNCTION learning.protect_academy_staff_grant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,learning
AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'ACADEMY_GRANT_DELETE_DENIED';
  END IF;
  IF OLD.status<>'ACTIVE' OR NEW.status<>'REVOKED'
     OR NEW.authorization_version<>OLD.authorization_version+1
     OR ROW(NEW.grant_id,NEW.principal_id,NEW.capability_code,
       NEW.valid_from,NEW.valid_until,NEW.granted_by_principal_id,
       NEW.reason_code,NEW.created_at)
        IS DISTINCT FROM
        ROW(OLD.grant_id,OLD.principal_id,OLD.capability_code,
          OLD.valid_from,OLD.valid_until,OLD.granted_by_principal_id,
          OLD.reason_code,OLD.created_at)
     OR NEW.revoked_at IS NULL OR NEW.revoked_by_principal_id IS NULL THEN
    RAISE EXCEPTION 'ACADEMY_GRANT_TRANSITION_DENIED';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER protect_academy_staff_grant
BEFORE UPDATE OR DELETE ON learning.academy_staff_grants
FOR EACH ROW EXECUTE FUNCTION learning.protect_academy_staff_grant();

-- The only initial bootstrap authority is a dedicated existing SERVICE principal.
-- Its identity and credential lifecycle are managed outside this candidate.
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
  ),false
);

-- Private boolean capability predicate, intended only inside audited wrappers.
-- This becomes effective for a human once the approved STAFF context extension is installed.
CREATE FUNCTION learning.has_academy_staff_grant(p_capability text) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning
RETURN coalesce(
  p_capability IN ('ACADEMY_ADMIN','ACADEMY_FOUNDER')
  AND auth.write_context_is_live()
  AND auth.current_channel()='STAFF'
  AND EXISTS (
    SELECT 1
    FROM learning.academy_staff_grants g
    JOIN auth.principals p ON p.principal_id=g.principal_id
    WHERE g.principal_id=auth.current_principal_id()
      AND p.person_id=auth.current_actor_person_id()
      AND p.status='ACTIVE'
      AND g.capability_code=p_capability
      AND g.status='ACTIVE'
      AND g.valid_from<=clock_timestamp()
      AND (g.valid_until IS NULL OR g.valid_until>clock_timestamp())
      AND g.revoked_at IS NULL
  ),false
);

CREATE FUNCTION learning.grant_academy_staff_capability(
  p_grant_id uuid,p_target_principal_id uuid,p_capability text,
  p_valid_until timestamptz,p_reason text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE
  v_bootstrap boolean:=learning.is_academy_bootstrap_service();
  v_founder boolean:=learning.has_academy_staff_grant('ACADEMY_FOUNDER');
BEGIN
  IF (
    (p_capability='ACADEMY_FOUNDER' AND v_bootstrap)
    OR (p_capability='ACADEMY_ADMIN' AND (v_bootstrap OR v_founder))
  ) IS NOT TRUE
     OR core.is_uuid_v7(p_grant_id) IS NOT TRUE
     OR length(btrim(p_reason)) NOT BETWEEN 1 AND 100
     OR (p_valid_until IS NOT NULL AND p_valid_until<=clock_timestamp())
     OR NOT EXISTS (
       SELECT 1 FROM auth.principals p
       WHERE p.principal_id=p_target_principal_id
         AND p.person_id IS NOT NULL AND p.principal_kind<>'SERVICE'
         AND p.status='ACTIVE'
     ) THEN
    RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,
      false,'BOOTSTRAP_FOUNDER_SCOPE_OR_INPUT_DENIED');
  END IF;

  INSERT INTO learning.academy_staff_grants(
    grant_id,principal_id,capability_code,status,valid_from,valid_until,
    granted_by_principal_id,reason_code
  ) VALUES (
    p_grant_id,p_target_principal_id,p_capability,'ACTIVE',
    clock_timestamp(),p_valid_until,auth.current_principal_id(),btrim(p_reason)
  ) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,
      false,'ACTIVE_GRANT_ALREADY_EXISTS');
  END IF;
  RETURN audit.record_write_decision('GRANT','ACADEMY_STAFF_CAPABILITY',p_grant_id,
    true,'ACADEMY_CAPABILITY_GRANTED');
END
$fn$;

CREATE FUNCTION learning.revoke_academy_staff_capability(
  p_grant_id uuid,p_reason text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning,audit
AS $fn$
DECLARE
  v_grant learning.academy_staff_grants%ROWTYPE;
  v_bootstrap boolean:=learning.is_academy_bootstrap_service();
  v_founder boolean:=learning.has_academy_staff_grant('ACADEMY_FOUNDER');
BEGIN
  SELECT * INTO v_grant FROM learning.academy_staff_grants
   WHERE grant_id=p_grant_id FOR UPDATE;
  IF (
    FOUND AND v_grant.status='ACTIVE'
    AND length(btrim(p_reason)) BETWEEN 1 AND 100
    AND (
      v_bootstrap
      OR (v_grant.capability_code='ACADEMY_ADMIN'
          AND v_founder
          AND v_grant.principal_id<>auth.current_principal_id())
    )
  ) IS NOT TRUE THEN
    RETURN audit.record_write_decision('REVOKE','ACADEMY_STAFF_CAPABILITY',p_grant_id,
      false,'BOOTSTRAP_FOUNDER_SCOPE_OR_STATE_DENIED');
  END IF;
  UPDATE learning.academy_staff_grants
    SET status='REVOKED',revoked_at=clock_timestamp(),
      revoked_by_principal_id=auth.current_principal_id(),
      authorization_version=authorization_version+1
    WHERE grant_id=p_grant_id;
  RETURN audit.record_write_decision('REVOKE','ACADEMY_STAFF_CAPABILITY',p_grant_id,
    true,'ACADEMY_CAPABILITY_REVOKED');
END
$fn$;

-- Forced RLS, no direct application reads or writes.
ALTER TABLE learning.academy_staff_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.academy_staff_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY academy_staff_grants_no_direct_read
  ON learning.academy_staff_grants FOR SELECT
  TO phoenix_canonical_app,phoenix_canonical_reader USING (false);

REVOKE ALL ON learning.academy_staff_grants FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_context_binder;
REVOKE EXECUTE ON FUNCTION learning.protect_academy_staff_grant(),
  learning.is_academy_bootstrap_service(),learning.has_academy_staff_grant(text),
  learning.grant_academy_staff_capability(uuid,uuid,text,timestamptz,text),
  learning.revoke_academy_staff_capability(uuid,text)
  FROM PUBLIC,phoenix_canonical_reader,phoenix_canonical_context_binder;
GRANT EXECUTE ON FUNCTION
  learning.grant_academy_staff_capability(uuid,uuid,text,timestamptz,text),
  learning.revoke_academy_staff_capability(uuid,text)
TO phoenix_canonical_app;

COMMIT;
