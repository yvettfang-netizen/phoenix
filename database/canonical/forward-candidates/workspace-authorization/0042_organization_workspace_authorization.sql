BEGIN;

-- Enterprise V3 / P1 forward candidate. 0001-0037 remain immutable. The
-- reserved 0038-0041 candidate numbers are deliberately not reused.
-- Person, Family, Organization, Principal and Service Project remain the
-- existing Canonical authorities.

DO $roles$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
     WHERE rolname='phoenix_canonical_workspace_reader'
  ) THEN
    CREATE ROLE phoenix_canonical_workspace_reader NOLOGIN NOINHERIT NOSUPERUSER
      NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$roles$;

DO $database_grants$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO phoenix_canonical_workspace_reader',
    current_database()
  );
END
$database_grants$;

GRANT USAGE ON SCHEMA auth,service TO phoenix_canonical_workspace_reader;

CREATE TABLE core.organization_workspace_profiles (
  organization_id uuid PRIMARY KEY REFERENCES core.organizations,
  workspace_organization_kind text NOT NULL CHECK (workspace_organization_kind IN (
    'HEADQUARTERS','REGIONAL_PARTNER','FRANCHISEE','CHANNEL_AGENT','SUB_PARTNER'
  )),
  organization_code text NOT NULL UNIQUE CHECK (
    organization_code ~ '^[A-Z0-9][A-Z0-9_-]{3,31}$'
  ),
  created_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE TABLE core.organization_memberships (
  organization_membership_id uuid PRIMARY KEY
    CHECK (core.is_uuid_v7(organization_membership_id)),
  organization_id uuid NOT NULL REFERENCES core.organizations,
  person_id uuid NOT NULL REFERENCES core.people,
  status text NOT NULL CHECK (status IN ('INVITED','ACTIVE','DISABLED','REVOKED')),
  invited_at timestamptz NOT NULL,
  invitation_expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  disabled_at timestamptz,
  revoked_at timestamptz,
  authorization_version bigint NOT NULL DEFAULT 1 CHECK (authorization_version > 0),
  invited_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  changed_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CHECK (invitation_expires_at > invited_at),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
  CHECK (
    (status='INVITED' AND accepted_at IS NULL AND valid_from IS NULL
      AND valid_until IS NULL AND disabled_at IS NULL AND revoked_at IS NULL)
    OR (status='ACTIVE' AND accepted_at IS NOT NULL AND valid_from IS NOT NULL
      AND valid_until IS NULL AND disabled_at IS NULL AND revoked_at IS NULL)
    OR (status='DISABLED' AND accepted_at IS NOT NULL AND valid_from IS NOT NULL
      AND valid_until IS NOT NULL AND disabled_at IS NOT NULL AND revoked_at IS NULL)
    OR (status='REVOKED' AND valid_until IS NOT NULL AND revoked_at IS NOT NULL
      AND disabled_at IS NULL)
  )
);
CREATE UNIQUE INDEX organization_memberships_open_uq
  ON core.organization_memberships(organization_id,person_id)
  WHERE status IN ('INVITED','ACTIVE','DISABLED');
CREATE INDEX organization_memberships_person_status_idx
  ON core.organization_memberships(person_id,status,organization_id);

CREATE TABLE auth.workspace_role_bindings (
  workspace_binding_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(workspace_binding_id)),
  principal_id uuid NOT NULL REFERENCES auth.principals,
  organization_membership_id uuid REFERENCES core.organization_memberships,
  family_membership_id uuid REFERENCES core.family_memberships,
  workspace_kind text NOT NULL CHECK (workspace_kind IN (
    'FOUNDER','STAFF','PARTNER','FAMILY'
  )),
  role_code text NOT NULL CHECK (role_code IN (
    'FOUNDER','STAFF_ADMIN','STAFF_ADVISOR','STAFF_OPERATIONS','STAFF_VIEWER',
    'PARTNER_ADMIN','PARTNER_MEMBER','FAMILY_PRIMARY','FAMILY_MEMBER'
  )),
  status text NOT NULL CHECK (status IN ('ACTIVE','REVOKED')),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  revoked_at timestamptz,
  authorization_version bigint NOT NULL DEFAULT 1 CHECK (authorization_version > 0),
  created_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  revoked_by_principal_id uuid REFERENCES auth.principals,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CHECK ((organization_membership_id IS NOT NULL)<>(family_membership_id IS NOT NULL)),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK (
    (status='ACTIVE' AND valid_until IS NULL
      AND revoked_at IS NULL AND revoked_by_principal_id IS NULL)
    OR (status='REVOKED' AND valid_until=revoked_at AND revoked_at IS NOT NULL
      AND revoked_by_principal_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX workspace_role_bindings_active_org_uq
  ON auth.workspace_role_bindings(
    principal_id,organization_membership_id,workspace_kind,role_code
  ) WHERE status='ACTIVE' AND organization_membership_id IS NOT NULL;
CREATE UNIQUE INDEX workspace_role_bindings_active_family_uq
  ON auth.workspace_role_bindings(
    principal_id,family_membership_id,workspace_kind,role_code
  ) WHERE status='ACTIVE' AND family_membership_id IS NOT NULL;
CREATE INDEX workspace_role_bindings_principal_status_idx
  ON auth.workspace_role_bindings(principal_id,status,workspace_kind);

CREATE TABLE auth.workspace_sessions (
  workspace_session_id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES auth.principals,
  workspace_binding_id uuid NOT NULL REFERENCES auth.workspace_role_bindings,
  owner_session_digest char(64) NOT NULL CHECK (owner_session_digest ~ '^[0-9a-f]{64}$'),
  context_token_digest char(64) NOT NULL UNIQUE CHECK (context_token_digest ~ '^[0-9a-f]{64}$'),
  binding_authorization_version bigint NOT NULL CHECK (binding_authorization_version > 0),
  membership_authorization_version bigint NOT NULL CHECK (membership_authorization_version > 0),
  status text NOT NULL CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  request_nonce uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK ((status='ACTIVE')=(revoked_at IS NULL))
);
CREATE UNIQUE INDEX workspace_sessions_one_current_uq
  ON auth.workspace_sessions(principal_id,owner_session_digest)
  WHERE status='ACTIVE';
CREATE INDEX workspace_sessions_binding_status_idx
  ON auth.workspace_sessions(workspace_binding_id,status,expires_at);

CREATE TABLE auth.workspace_context_tickets (
  ticket_id uuid PRIMARY KEY,
  workspace_session_id uuid NOT NULL REFERENCES auth.workspace_sessions ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES auth.principals,
  workspace_binding_id uuid NOT NULL REFERENCES auth.workspace_role_bindings,
  intended_principal_id uuid NOT NULL REFERENCES auth.principals,
  request_nonce uuid NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > issued_at AND expires_at <= issued_at + interval '60 seconds')
);
CREATE INDEX workspace_context_tickets_expiry_idx
  ON auth.workspace_context_tickets(expires_at);

CREATE TABLE auth.workspace_session_contexts (
  backend_pid integer PRIMARY KEY,
  backend_start timestamptz NOT NULL,
  workspace_session_id uuid NOT NULL REFERENCES auth.workspace_sessions ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES auth.principals,
  actor_person_id uuid NOT NULL REFERENCES core.people,
  workspace_binding_id uuid NOT NULL REFERENCES auth.workspace_role_bindings,
  workspace_kind text NOT NULL CHECK (workspace_kind IN (
    'FOUNDER','STAFF','PARTNER','FAMILY'
  )),
  role_code text NOT NULL,
  organization_id uuid REFERENCES core.organizations,
  family_id uuid REFERENCES core.families,
  binding_authorization_version bigint NOT NULL,
  membership_authorization_version bigint NOT NULL,
  request_nonce uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((organization_id IS NOT NULL)<>(family_id IS NOT NULL)),
  CHECK ((workspace_kind='FAMILY')=(family_id IS NOT NULL))
);
CREATE INDEX workspace_session_contexts_backend_identity_idx
  ON auth.workspace_session_contexts(backend_pid,backend_start);

CREATE TABLE service.project_assignment_organization_scopes (
  project_assignment_id uuid PRIMARY KEY REFERENCES service.project_assignments,
  organization_id uuid NOT NULL REFERENCES core.organizations,
  created_by_principal_id uuid NOT NULL REFERENCES auth.principals,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);
CREATE INDEX project_assignment_organization_scopes_org_idx
  ON service.project_assignment_organization_scopes(organization_id,project_assignment_id);

CREATE FUNCTION core.protect_organization_membership() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,core
AS $fn$
BEGIN
  IF ROW(NEW.organization_membership_id,NEW.organization_id,NEW.person_id,
      NEW.invited_at,NEW.invitation_expires_at,NEW.invited_by_principal_id,NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.organization_membership_id,OLD.organization_id,OLD.person_id,
      OLD.invited_at,OLD.invitation_expires_at,OLD.invited_by_principal_id,OLD.created_at) THEN
    RAISE EXCEPTION 'ORGANIZATION_MEMBERSHIP_IDENTITY_IMMUTABLE';
  END IF;
  IF NOT (
    (OLD.status='INVITED' AND NEW.status IN ('ACTIVE','REVOKED'))
    OR (OLD.status='ACTIVE' AND NEW.status IN ('DISABLED','REVOKED'))
    OR (OLD.status='DISABLED' AND NEW.status='REVOKED')
  ) OR NEW.authorization_version<>OLD.authorization_version+1 THEN
    RAISE EXCEPTION 'ORGANIZATION_MEMBERSHIP_TRANSITION_INVALID';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER protect_organization_membership
BEFORE UPDATE ON core.organization_memberships
FOR EACH ROW EXECUTE FUNCTION core.protect_organization_membership();

CREATE FUNCTION auth.protect_workspace_role_binding() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,core
AS $fn$
DECLARE
  v_person uuid;
  v_kind text;
  v_membership_role text;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.workspace_binding_id,NEW.principal_id,NEW.organization_membership_id,
        NEW.family_membership_id,NEW.workspace_kind,NEW.role_code,NEW.valid_from,
        NEW.created_by_principal_id,NEW.created_at)
       IS DISTINCT FROM
       ROW(OLD.workspace_binding_id,OLD.principal_id,OLD.organization_membership_id,
        OLD.family_membership_id,OLD.workspace_kind,OLD.role_code,OLD.valid_from,
        OLD.created_by_principal_id,OLD.created_at)
       OR OLD.status<>'ACTIVE' OR NEW.status<>'REVOKED'
       OR NEW.authorization_version<>OLD.authorization_version+1 THEN
      RAISE EXCEPTION 'WORKSPACE_ROLE_TRANSITION_INVALID';
    END IF;
    RETURN NEW;
  END IF;

  SELECT person_id INTO v_person FROM auth.principals
   WHERE principal_id=NEW.principal_id AND status='ACTIVE' AND person_id IS NOT NULL;
  IF v_person IS NULL THEN RAISE EXCEPTION 'WORKSPACE_PRINCIPAL_INVALID'; END IF;

  IF NEW.organization_membership_id IS NOT NULL THEN
    SELECT m.person_id,p.workspace_organization_kind INTO v_person,v_kind
      FROM core.organization_memberships m
      JOIN core.organization_workspace_profiles p USING(organization_id)
      JOIN core.organizations o USING(organization_id)
     WHERE m.organization_membership_id=NEW.organization_membership_id
       AND m.person_id=(SELECT person_id FROM auth.principals
         WHERE principal_id=NEW.principal_id)
       AND m.status='ACTIVE' AND m.valid_from<=clock_timestamp()
       AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
       AND o.status='ACTIVE';
    IF NOT FOUND OR NEW.workspace_kind='FAMILY' THEN
      RAISE EXCEPTION 'WORKSPACE_ORGANIZATION_MEMBERSHIP_INVALID';
    END IF;
    IF (NEW.workspace_kind='FOUNDER' AND (NEW.role_code<>'FOUNDER' OR v_kind<>'HEADQUARTERS'))
       OR (NEW.workspace_kind='STAFF' AND NEW.role_code NOT IN (
         'STAFF_ADMIN','STAFF_ADVISOR','STAFF_OPERATIONS','STAFF_VIEWER'))
       OR (NEW.workspace_kind='PARTNER' AND (
         NEW.role_code NOT IN ('PARTNER_ADMIN','PARTNER_MEMBER')
         OR v_kind='HEADQUARTERS')) THEN
      RAISE EXCEPTION 'WORKSPACE_ROLE_OR_ORGANIZATION_KIND_INVALID';
    END IF;
  ELSE
    SELECT m.person_id,m.membership_role INTO v_person,v_membership_role
      FROM core.family_memberships m
     WHERE m.membership_id=NEW.family_membership_id
       AND m.person_id=(SELECT person_id FROM auth.principals
         WHERE principal_id=NEW.principal_id)
       AND m.valid_from<=clock_timestamp()
       AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp());
    IF NOT FOUND OR NEW.workspace_kind<>'FAMILY'
       OR (v_membership_role='PRIMARY' AND NEW.role_code<>'FAMILY_PRIMARY')
       OR (v_membership_role='MEMBER' AND NEW.role_code<>'FAMILY_MEMBER') THEN
      RAISE EXCEPTION 'WORKSPACE_FAMILY_MEMBERSHIP_INVALID';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER protect_workspace_role_binding
BEFORE INSERT OR UPDATE ON auth.workspace_role_bindings
FOR EACH ROW EXECUTE FUNCTION auth.protect_workspace_role_binding();

CREATE FUNCTION auth.is_workspace_admin_service() RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN coalesce(
  auth.is_internal_service()
  AND auth.current_family_id() IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.principals p
     WHERE p.principal_id=auth.current_principal_id()
       AND p.principal_kind='SERVICE' AND p.person_id IS NULL
       AND p.status='ACTIVE' AND p.service_label='canonical_workspace_admin_v1'
  ),false
);

CREATE FUNCTION auth.record_workspace_decision(
  p_principal_id uuid,p_actor_person_id uuid,p_family_id uuid,
  p_action text,p_resource_kind text,p_resource_id uuid,
  p_allowed boolean,p_reason_code text,p_request_nonce uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,audit
AS $fn$
DECLARE v_attempt uuid:=gen_random_uuid(); v_at timestamptz:=clock_timestamp();
BEGIN
  RAISE LOG 'PHOENIX_AUDIT attempt_id=% action=% resource_kind=% resource_id=% decision=% reason=% principal_id=% backend_pid=% occurred_at=% request_nonce=%',
    v_attempt,p_action,p_resource_kind,coalesce(p_resource_id::text,'NULL'),
    CASE WHEN p_allowed THEN 'ALLOW' ELSE 'DENY' END,p_reason_code,
    coalesce(p_principal_id::text,'NULL'),pg_backend_pid(),v_at,
    coalesce(p_request_nonce::text,'NULL');
  INSERT INTO audit.access_events(
    attempt_id,occurred_at,backend_pid,principal_id,actor_person_id,family_id,
    action,resource_kind,resource_id,decision,reason_code,request_nonce
  ) VALUES(
    v_attempt,v_at,pg_backend_pid(),p_principal_id,p_actor_person_id,p_family_id,
    p_action,p_resource_kind,p_resource_id,
    CASE WHEN p_allowed THEN 'ALLOW' ELSE 'DENY' END,p_reason_code,p_request_nonce
  );
  RETURN p_allowed;
END
$fn$;

CREATE FUNCTION auth.workspace_binding_snapshot(
  p_principal_id uuid,p_workspace_binding_id uuid
) RETURNS TABLE(
  workspace_binding_id uuid,principal_id uuid,actor_person_id uuid,
  workspace_kind text,role_code text,organization_id uuid,family_id uuid,
  binding_authorization_version bigint,membership_authorization_version bigint,
  display_name text,public_ref text,organization_code text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration
AS $fn$
  SELECT b.workspace_binding_id,b.principal_id,p.person_id,b.workspace_kind,b.role_code,
    m.organization_id,NULL::uuid,b.authorization_version,m.authorization_version,
    o.display_name,i.public_id,wp.organization_code
  FROM auth.workspace_role_bindings b
  JOIN auth.principals p ON p.principal_id=b.principal_id
  JOIN core.organization_memberships m
    ON m.organization_membership_id=b.organization_membership_id
  JOIN core.organizations o ON o.organization_id=m.organization_id
  JOIN core.organization_workspace_profiles wp ON wp.organization_id=o.organization_id
  LEFT JOIN integration.public_ids i ON i.entity_kind='ORGANIZATION'
    AND i.canonical_id=o.organization_id
  WHERE b.workspace_binding_id=p_workspace_binding_id
    AND b.principal_id=p_principal_id AND p.status='ACTIVE'
    AND p.person_id=m.person_id AND b.status='ACTIVE'
    AND b.valid_from<=clock_timestamp()
    AND (b.valid_until IS NULL OR b.valid_until>clock_timestamp())
    AND m.status='ACTIVE' AND m.valid_from<=clock_timestamp()
    AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
    AND o.status='ACTIVE'
  UNION ALL
  SELECT b.workspace_binding_id,b.principal_id,p.person_id,b.workspace_kind,b.role_code,
    NULL::uuid,m.family_id,b.authorization_version,1::bigint,
    f.display_name,i.public_id,NULL::text
  FROM auth.workspace_role_bindings b
  JOIN auth.principals p ON p.principal_id=b.principal_id
  JOIN core.family_memberships m ON m.membership_id=b.family_membership_id
  JOIN core.families f ON f.family_id=m.family_id
  LEFT JOIN integration.public_ids i ON i.entity_kind='FAMILY'
    AND i.canonical_id=f.family_id
  WHERE b.workspace_binding_id=p_workspace_binding_id
    AND b.principal_id=p_principal_id AND p.status='ACTIVE'
    AND p.person_id=m.person_id AND b.status='ACTIVE'
    AND b.valid_from<=clock_timestamp()
    AND (b.valid_until IS NULL OR b.valid_until>clock_timestamp())
    AND m.valid_from<=clock_timestamp()
    AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp());
$fn$;

CREATE FUNCTION core.register_workspace_organization_profile(
  p_organization_id uuid,p_kind text,p_organization_code text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,audit
AS $fn$
BEGIN
  IF (auth.is_workspace_admin_service()
      AND p_kind IN ('HEADQUARTERS','REGIONAL_PARTNER','FRANCHISEE',
        'CHANNEL_AGENT','SUB_PARTNER')
      AND p_organization_code ~ '^[A-Z0-9][A-Z0-9_-]{3,31}$'
      AND EXISTS(SELECT 1 FROM core.organizations
        WHERE organization_id=p_organization_id AND status='ACTIVE')) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'CREATE','ORGANIZATION_WORKSPACE_PROFILE',
      p_organization_id,false,'WORKSPACE_ADMIN_OR_INPUT_DENIED',auth.current_request_nonce()
    );
  END IF;
  IF EXISTS(SELECT 1 FROM core.organization_workspace_profiles
      WHERE organization_id=p_organization_id OR organization_code=p_organization_code) THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'CREATE','ORGANIZATION_WORKSPACE_PROFILE',
      p_organization_id,false,'WORKSPACE_ORGANIZATION_PROFILE_EXISTS',auth.current_request_nonce()
    );
  END IF;
  INSERT INTO core.organization_workspace_profiles(
    organization_id,workspace_organization_kind,organization_code,
    created_by_principal_id
  ) VALUES(
    p_organization_id,p_kind,p_organization_code,auth.current_principal_id()
  );
  RETURN auth.record_workspace_decision(
    auth.current_principal_id(),NULL,NULL,'CREATE','ORGANIZATION_WORKSPACE_PROFILE',
    p_organization_id,true,'WORKSPACE_ORGANIZATION_PROFILE_CREATED',auth.current_request_nonce()
  );
END
$fn$;

CREATE FUNCTION core.invite_organization_member(
  p_membership_id uuid,p_organization_id uuid,p_person_id uuid,
  p_invitation_expires_at timestamptz
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,audit
AS $fn$
BEGIN
  IF (auth.is_workspace_admin_service() AND core.is_uuid_v7(p_membership_id)
      AND p_invitation_expires_at>clock_timestamp()
      AND p_invitation_expires_at<=clock_timestamp()+interval '30 days'
      AND EXISTS(SELECT 1 FROM core.organization_workspace_profiles wp
        JOIN core.organizations o USING(organization_id)
        WHERE wp.organization_id=p_organization_id AND o.status='ACTIVE')
      AND EXISTS(SELECT 1 FROM core.people WHERE person_id=p_person_id)) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'INVITE','ORGANIZATION_MEMBERSHIP',
      p_membership_id,false,'WORKSPACE_ADMIN_OR_INVITATION_INPUT_DENIED',auth.current_request_nonce()
    );
  END IF;
  IF EXISTS(SELECT 1 FROM core.organization_memberships
      WHERE organization_membership_id=p_membership_id
         OR (organization_id=p_organization_id AND person_id=p_person_id
           AND status IN ('INVITED','ACTIVE','DISABLED'))) THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'INVITE','ORGANIZATION_MEMBERSHIP',
      p_membership_id,false,'ORGANIZATION_MEMBERSHIP_ALREADY_OPEN',auth.current_request_nonce()
    );
  END IF;
  INSERT INTO core.organization_memberships(
    organization_membership_id,organization_id,person_id,status,invited_at,
    invitation_expires_at,invited_by_principal_id,changed_by_principal_id
  ) VALUES(
    p_membership_id,p_organization_id,p_person_id,'INVITED',clock_timestamp(),
    p_invitation_expires_at,auth.current_principal_id(),auth.current_principal_id()
  );
  RETURN auth.record_workspace_decision(
    auth.current_principal_id(),NULL,NULL,'INVITE','ORGANIZATION_MEMBERSHIP',
    p_membership_id,true,'ORGANIZATION_MEMBER_INVITED',auth.current_request_nonce()
  );
END
$fn$;

CREATE FUNCTION core.accept_organization_membership(
  p_membership_id uuid,p_person_id uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,audit
AS $fn$
DECLARE v_item core.organization_memberships%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM core.organization_memberships
   WHERE organization_membership_id=p_membership_id FOR UPDATE;
  IF (FOUND AND auth.is_workspace_admin_service() AND v_item.person_id=p_person_id
      AND v_item.status='INVITED'
      AND v_item.invitation_expires_at>clock_timestamp()) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'ACCEPT','ORGANIZATION_MEMBERSHIP',
      p_membership_id,false,'INVITATION_NOT_CURRENT_OR_PERSON_MISMATCH',auth.current_request_nonce()
    );
  END IF;
  UPDATE core.organization_memberships
     SET status='ACTIVE',accepted_at=clock_timestamp(),valid_from=clock_timestamp(),
         authorization_version=authorization_version+1,
         changed_by_principal_id=auth.current_principal_id(),updated_at=clock_timestamp()
   WHERE organization_membership_id=p_membership_id;
  RETURN auth.record_workspace_decision(
    auth.current_principal_id(),p_person_id,NULL,'ACCEPT','ORGANIZATION_MEMBERSHIP',
    p_membership_id,true,'ORGANIZATION_MEMBERSHIP_ACCEPTED',auth.current_request_nonce()
  );
END
$fn$;

CREATE FUNCTION core.transition_organization_membership(
  p_membership_id uuid,p_next_status text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,audit
AS $fn$
DECLARE v_item core.organization_memberships%ROWTYPE; v_now timestamptz:=clock_timestamp();
BEGIN
  SELECT * INTO v_item FROM core.organization_memberships
   WHERE organization_membership_id=p_membership_id FOR UPDATE;
  IF (FOUND AND auth.is_workspace_admin_service()
      AND ((v_item.status='INVITED' AND p_next_status='REVOKED')
        OR (v_item.status='ACTIVE' AND p_next_status IN ('DISABLED','REVOKED'))
        OR (v_item.status='DISABLED' AND p_next_status='REVOKED'))) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'TRANSITION','ORGANIZATION_MEMBERSHIP',
      p_membership_id,false,'MEMBERSHIP_STATE_OR_WORKSPACE_ADMIN_DENIED',auth.current_request_nonce()
    );
  END IF;
  UPDATE core.organization_memberships
     SET status=p_next_status,valid_until=v_now,
         disabled_at=CASE WHEN p_next_status='DISABLED' THEN v_now ELSE NULL END,
         revoked_at=CASE WHEN p_next_status='REVOKED' THEN v_now ELSE NULL END,
         authorization_version=authorization_version+1,
         changed_by_principal_id=auth.current_principal_id(),updated_at=v_now
   WHERE organization_membership_id=p_membership_id;
  UPDATE auth.workspace_sessions s SET status='REVOKED',revoked_at=v_now
   WHERE s.status='ACTIVE' AND EXISTS(
     SELECT 1 FROM auth.workspace_role_bindings b
      WHERE b.workspace_binding_id=s.workspace_binding_id
        AND b.organization_membership_id=p_membership_id
   );
  DELETE FROM auth.workspace_session_contexts c WHERE EXISTS(
    SELECT 1 FROM auth.workspace_sessions s
     WHERE s.workspace_session_id=c.workspace_session_id AND s.status<>'ACTIVE'
  );
  IF p_next_status='REVOKED' THEN
    UPDATE auth.workspace_role_bindings
       SET status='REVOKED',valid_until=v_now,revoked_at=v_now,
           revoked_by_principal_id=auth.current_principal_id(),
           authorization_version=authorization_version+1
     WHERE organization_membership_id=p_membership_id AND status='ACTIVE';
  END IF;
  RETURN auth.record_workspace_decision(
    auth.current_principal_id(),v_item.person_id,NULL,'TRANSITION','ORGANIZATION_MEMBERSHIP',
    p_membership_id,true,'ORGANIZATION_MEMBERSHIP_'||p_next_status,auth.current_request_nonce()
  );
END
$fn$;

CREATE FUNCTION auth.assign_workspace_role(
  p_workspace_binding_id uuid,p_principal_id uuid,
  p_organization_membership_id uuid,p_family_membership_id uuid,
  p_workspace_kind text,p_role_code text,p_valid_until timestamptz
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,audit
AS $fn$
BEGIN
  IF (auth.is_workspace_admin_service() AND core.is_uuid_v7(p_workspace_binding_id)
      AND ((p_organization_membership_id IS NOT NULL)
        <> (p_family_membership_id IS NOT NULL))
      AND p_valid_until IS NULL) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'ASSIGN','WORKSPACE_ROLE',
      p_workspace_binding_id,false,'WORKSPACE_ADMIN_OR_ROLE_INPUT_DENIED',auth.current_request_nonce()
    );
  END IF;
  IF EXISTS(SELECT 1 FROM auth.workspace_role_bindings
      WHERE workspace_binding_id=p_workspace_binding_id) THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'ASSIGN','WORKSPACE_ROLE',
      p_workspace_binding_id,false,'WORKSPACE_ROLE_ALREADY_EXISTS',auth.current_request_nonce()
    );
  END IF;
  BEGIN
    INSERT INTO auth.workspace_role_bindings(
      workspace_binding_id,principal_id,organization_membership_id,
      family_membership_id,workspace_kind,role_code,status,valid_from,valid_until,
      created_by_principal_id
    ) VALUES(
      p_workspace_binding_id,p_principal_id,p_organization_membership_id,
      p_family_membership_id,p_workspace_kind,p_role_code,'ACTIVE',clock_timestamp(),
      p_valid_until,auth.current_principal_id()
    );
  EXCEPTION WHEN unique_violation OR check_violation OR foreign_key_violation THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'ASSIGN','WORKSPACE_ROLE',
      p_workspace_binding_id,false,'WORKSPACE_ROLE_SCOPE_OR_DUPLICATE_DENIED',auth.current_request_nonce()
    );
  END;
  RETURN auth.record_workspace_decision(
    auth.current_principal_id(),NULL,NULL,'ASSIGN','WORKSPACE_ROLE',
    p_workspace_binding_id,true,'WORKSPACE_ROLE_ASSIGNED',auth.current_request_nonce()
  );
END
$fn$;

CREATE FUNCTION auth.revoke_workspace_role(p_workspace_binding_id uuid) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,audit
AS $fn$
DECLARE v_item auth.workspace_role_bindings%ROWTYPE; v_now timestamptz:=clock_timestamp();
BEGIN
  SELECT * INTO v_item FROM auth.workspace_role_bindings
   WHERE workspace_binding_id=p_workspace_binding_id FOR UPDATE;
  IF (FOUND AND auth.is_workspace_admin_service() AND v_item.status='ACTIVE') IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'REVOKE','WORKSPACE_ROLE',
      p_workspace_binding_id,false,'WORKSPACE_ROLE_STATE_OR_ADMIN_DENIED',auth.current_request_nonce()
    );
  END IF;
  UPDATE auth.workspace_role_bindings
     SET status='REVOKED',valid_until=v_now,revoked_at=v_now,
         revoked_by_principal_id=auth.current_principal_id(),
         authorization_version=authorization_version+1
   WHERE workspace_binding_id=p_workspace_binding_id;
  UPDATE auth.workspace_sessions SET status='REVOKED',revoked_at=v_now
   WHERE workspace_binding_id=p_workspace_binding_id AND status='ACTIVE';
  DELETE FROM auth.workspace_session_contexts
   WHERE workspace_binding_id=p_workspace_binding_id;
  RETURN auth.record_workspace_decision(
    auth.current_principal_id(),v_item.principal_id,NULL,'REVOKE','WORKSPACE_ROLE',
    p_workspace_binding_id,true,'WORKSPACE_ROLE_REVOKED',auth.current_request_nonce()
  );
END
$fn$;

CREATE FUNCTION service.scope_project_assignment_to_organization(
  p_project_assignment_id uuid,p_organization_id uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,service,audit
AS $fn$
BEGIN
  IF (auth.is_workspace_admin_service()
      AND EXISTS(SELECT 1 FROM service.project_assignments
        WHERE project_assignment_id=p_project_assignment_id AND status='ACTIVE')
      AND EXISTS(SELECT 1 FROM core.organization_workspace_profiles wp
        JOIN core.organizations o USING(organization_id)
        WHERE wp.organization_id=p_organization_id AND o.status='ACTIVE')) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'SCOPE','PROJECT_ASSIGNMENT_ORGANIZATION',
      p_project_assignment_id,false,'PROJECT_ASSIGNMENT_ORGANIZATION_SCOPE_DENIED',
      auth.current_request_nonce()
    );
  END IF;
  IF EXISTS(SELECT 1 FROM service.project_assignment_organization_scopes
      WHERE project_assignment_id=p_project_assignment_id) THEN
    RETURN auth.record_workspace_decision(
      auth.current_principal_id(),NULL,NULL,'SCOPE','PROJECT_ASSIGNMENT_ORGANIZATION',
      p_project_assignment_id,false,'PROJECT_ASSIGNMENT_SCOPE_EXISTS',auth.current_request_nonce()
    );
  END IF;
  INSERT INTO service.project_assignment_organization_scopes(
    project_assignment_id,organization_id,created_by_principal_id
  ) VALUES(p_project_assignment_id,p_organization_id,auth.current_principal_id());
  RETURN auth.record_workspace_decision(
    auth.current_principal_id(),NULL,NULL,'SCOPE','PROJECT_ASSIGNMENT_ORGANIZATION',
    p_project_assignment_id,true,'PROJECT_ASSIGNMENT_ORGANIZATION_SCOPED',
    auth.current_request_nonce()
  );
END
$fn$;

CREATE FUNCTION auth.cleanup_workspace_ephemeral_state() RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
AS $fn$
DECLARE v_removed integer:=0; v_rows integer;
BEGIN
  UPDATE auth.workspace_sessions SET status='EXPIRED',revoked_at=clock_timestamp()
   WHERE status='ACTIVE' AND expires_at<=clock_timestamp();
  DELETE FROM auth.workspace_context_tickets WHERE expires_at<=clock_timestamp();
  GET DIAGNOSTICS v_rows=ROW_COUNT; v_removed:=v_removed+v_rows;
  DELETE FROM auth.workspace_session_contexts c
   WHERE c.expires_at<=clock_timestamp()
      OR NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_stat_activity a
         WHERE a.pid=c.backend_pid AND a.backend_start=c.backend_start
      )
      OR NOT EXISTS(
        SELECT 1 FROM auth.workspace_sessions s
         WHERE s.workspace_session_id=c.workspace_session_id
           AND s.status='ACTIVE' AND s.expires_at>clock_timestamp()
      );
  GET DIAGNOSTICS v_rows=ROW_COUNT; v_removed:=v_removed+v_rows;
  RETURN v_removed;
END
$fn$;

CREATE FUNCTION auth.list_available_workspaces(
  p_principal_id uuid,p_request_nonce uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit
AS $fn$
DECLARE v_items jsonb; v_person uuid; v_allowed boolean;
BEGIN
  SELECT person_id INTO v_person FROM auth.principals
   WHERE principal_id=p_principal_id AND status='ACTIVE' AND person_id IS NOT NULL;
  v_allowed:=FOUND AND p_request_nonce IS NOT NULL;
  IF NOT v_allowed THEN
    PERFORM auth.record_workspace_decision(
      p_principal_id,NULL,NULL,'LIST','WORKSPACE',NULL,false,
      'WORKSPACE_PRINCIPAL_OR_REQUEST_DENIED',p_request_nonce
    );
    RETURN jsonb_build_object('status','DENY','data',NULL);
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'workspaceBindingId',s.workspace_binding_id,
    'workspaceKind',s.workspace_kind,
    'role',s.role_code,
    'displayName',s.display_name,
    'workspaceRef',s.public_ref,
    'organizationCode',s.organization_code
  ) ORDER BY s.workspace_kind,s.public_ref,s.role_code,s.workspace_binding_id),'[]'::jsonb)
  INTO v_items
  FROM auth.workspace_role_bindings b
  CROSS JOIN LATERAL auth.workspace_binding_snapshot(
    p_principal_id,b.workspace_binding_id
  ) s
  WHERE b.principal_id=p_principal_id;
  PERFORM auth.record_workspace_decision(
    p_principal_id,v_person,NULL,'LIST','WORKSPACE',NULL,true,
    'WORKSPACES_LISTED',p_request_nonce
  );
  RETURN jsonb_build_object('status','ALLOW','data',jsonb_build_object(
    'contractVersion','workspace-list.v1','asOf',clock_timestamp(),
    'workspaces',v_items
  ));
END
$fn$;

CREATE FUNCTION auth.rotate_workspace_session(
  p_principal_id uuid,p_workspace_binding_id uuid,
  p_owner_session_digest text,p_context_token_digest text,
  p_expires_at timestamptz,p_request_nonce uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,integration,audit
AS $fn$
DECLARE v record; v_session uuid:=gen_random_uuid();
        v_now timestamptz:=clock_timestamp();
BEGIN
  PERFORM auth.cleanup_workspace_ephemeral_state();
  SELECT * INTO v FROM auth.workspace_binding_snapshot(
    p_principal_id,p_workspace_binding_id
  );
  IF (FOUND AND p_owner_session_digest ~ '^[0-9a-f]{64}$'
      AND p_context_token_digest ~ '^[0-9a-f]{64}$'
      AND p_request_nonce IS NOT NULL
      AND p_expires_at>v_now AND p_expires_at<=v_now+interval '8 hours') IS NOT TRUE THEN
    PERFORM auth.record_workspace_decision(
      p_principal_id,NULL,NULL,'SWITCH','WORKSPACE',p_workspace_binding_id,false,
      'WORKSPACE_BINDING_OR_SESSION_INPUT_DENIED',p_request_nonce
    );
    RETURN jsonb_build_object('status','DENY','data',NULL);
  END IF;
  UPDATE auth.workspace_sessions SET status='REVOKED',revoked_at=v_now
   WHERE principal_id=p_principal_id
     AND owner_session_digest=p_owner_session_digest AND status='ACTIVE';
  DELETE FROM auth.workspace_session_contexts c WHERE EXISTS(
    SELECT 1 FROM auth.workspace_sessions s
     WHERE s.workspace_session_id=c.workspace_session_id AND s.status<>'ACTIVE'
  );
  INSERT INTO auth.workspace_sessions(
    workspace_session_id,principal_id,workspace_binding_id,owner_session_digest,
    context_token_digest,binding_authorization_version,
    membership_authorization_version,status,request_nonce,created_at,expires_at
  ) VALUES(
    v_session,p_principal_id,p_workspace_binding_id,p_owner_session_digest,
    p_context_token_digest,v.binding_authorization_version,
    v.membership_authorization_version,'ACTIVE',p_request_nonce,v_now,p_expires_at
  );
  PERFORM auth.record_workspace_decision(
    p_principal_id,v.actor_person_id,v.family_id,'SWITCH','WORKSPACE',
    p_workspace_binding_id,true,'WORKSPACE_CONTEXT_ROTATED',p_request_nonce
  );
  RETURN jsonb_build_object('status','ALLOW','data',jsonb_build_object(
    'contractVersion','workspace-context.v1',
    'workspace',jsonb_build_object(
      'workspaceBindingId',v.workspace_binding_id,
      'workspaceKind',v.workspace_kind,
      'role',v.role_code,
      'displayName',v.display_name,
      'workspaceRef',v.public_ref,
      'organizationCode',v.organization_code
    ),
    'expiresAt',p_expires_at
  ));
END
$fn$;

CREATE FUNCTION auth.issue_workspace_context_ticket(
  p_principal_id uuid,p_owner_session_digest text,p_context_token_digest text,
  p_expires_at timestamptz,p_request_nonce uuid,p_intended_principal_id uuid
) RETURNS TABLE(ticket_id uuid,principal_id uuid,expires_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core
AS $fn$
DECLARE v_session auth.workspace_sessions%ROWTYPE;
        v record;
        v_ticket uuid:=gen_random_uuid(); v_expiry timestamptz;
BEGIN
  PERFORM auth.cleanup_workspace_ephemeral_state();
  SELECT * INTO v_session FROM auth.workspace_sessions s
   WHERE s.principal_id=p_principal_id
     AND s.owner_session_digest=p_owner_session_digest
     AND s.context_token_digest=p_context_token_digest
     AND s.status='ACTIVE' AND s.expires_at>clock_timestamp()
   FOR UPDATE;
  IF NOT FOUND OR p_principal_id IS DISTINCT FROM p_intended_principal_id THEN
    RAISE EXCEPTION 'WORKSPACE_SESSION_INVALID';
  END IF;
  SELECT * INTO v FROM auth.workspace_binding_snapshot(
    v_session.principal_id,v_session.workspace_binding_id
  );
  IF NOT FOUND
     OR v.binding_authorization_version<>v_session.binding_authorization_version
     OR v.membership_authorization_version<>v_session.membership_authorization_version THEN
    UPDATE auth.workspace_sessions SET status='REVOKED',revoked_at=clock_timestamp()
     WHERE workspace_session_id=v_session.workspace_session_id;
    RAISE EXCEPTION 'WORKSPACE_AUTHORIZATION_STALE';
  END IF;
  v_expiry:=least(p_expires_at,v_session.expires_at,clock_timestamp()+interval '60 seconds');
  IF v_expiry<=clock_timestamp() OR p_request_nonce IS NULL THEN
    RAISE EXCEPTION 'WORKSPACE_TICKET_EXPIRY_INVALID';
  END IF;
  INSERT INTO auth.workspace_context_tickets(
    ticket_id,workspace_session_id,principal_id,workspace_binding_id,
    intended_principal_id,request_nonce,expires_at
  ) VALUES(
    v_ticket,v_session.workspace_session_id,v_session.principal_id,
    v_session.workspace_binding_id,p_intended_principal_id,p_request_nonce,v_expiry
  );
  RETURN QUERY SELECT v_ticket,v_session.principal_id,v_expiry;
END
$fn$;

CREATE FUNCTION auth.redeem_workspace_context_ticket(
  p_ticket_id uuid,p_expected_principal_id uuid
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core
AS $fn$
DECLARE v_ticket auth.workspace_context_tickets%ROWTYPE;
        v_session auth.workspace_sessions%ROWTYPE;
        v record;
        v_backend_start timestamptz;
BEGIN
  PERFORM auth.cleanup_workspace_ephemeral_state();
  DELETE FROM auth.workspace_context_tickets
   WHERE ticket_id=p_ticket_id
     AND intended_principal_id=p_expected_principal_id
     AND expires_at>clock_timestamp()
   RETURNING * INTO v_ticket;
  IF NOT FOUND THEN RAISE EXCEPTION 'WORKSPACE_TICKET_INVALID_OR_ALREADY_USED'; END IF;
  SELECT * INTO v_session FROM auth.workspace_sessions
   WHERE workspace_session_id=v_ticket.workspace_session_id
     AND principal_id=p_expected_principal_id
     AND status='ACTIVE' AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'WORKSPACE_SESSION_INVALID'; END IF;
  SELECT * INTO v FROM auth.workspace_binding_snapshot(
    v_session.principal_id,v_session.workspace_binding_id
  );
  IF NOT FOUND
     OR v.binding_authorization_version<>v_session.binding_authorization_version
     OR v.membership_authorization_version<>v_session.membership_authorization_version THEN
    RAISE EXCEPTION 'WORKSPACE_AUTHORIZATION_STALE';
  END IF;
  SELECT backend_start INTO v_backend_start FROM pg_catalog.pg_stat_activity
   WHERE pid=pg_backend_pid();
  IF v_backend_start IS NULL THEN RAISE EXCEPTION 'CONTEXT_BACKEND_NOT_FOUND'; END IF;
  DELETE FROM auth.session_contexts
   WHERE backend_pid=pg_backend_pid() AND backend_start=v_backend_start;
  DELETE FROM auth.workspace_session_contexts WHERE backend_pid=pg_backend_pid();
  INSERT INTO auth.workspace_session_contexts(
    backend_pid,backend_start,workspace_session_id,principal_id,actor_person_id,
    workspace_binding_id,workspace_kind,role_code,organization_id,family_id,
    binding_authorization_version,membership_authorization_version,
    request_nonce,expires_at
  ) VALUES(
    pg_backend_pid(),v_backend_start,v_session.workspace_session_id,v.principal_id,
    v.actor_person_id,v.workspace_binding_id,v.workspace_kind,v.role_code,
    v.organization_id,v.family_id,v.binding_authorization_version,
    v.membership_authorization_version,v_ticket.request_nonce,v_ticket.expires_at
  );
END
$fn$;

CREATE FUNCTION auth.workspace_context_is_live() RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core
RETURN coalesce(EXISTS(
  SELECT 1 FROM auth.workspace_session_contexts c
  JOIN pg_catalog.pg_stat_activity a
    ON a.pid=c.backend_pid AND a.backend_start=c.backend_start
  JOIN auth.workspace_sessions s
    ON s.workspace_session_id=c.workspace_session_id
  CROSS JOIN LATERAL auth.workspace_binding_snapshot(
    c.principal_id,c.workspace_binding_id
  ) b
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND c.expires_at>clock_timestamp()
    AND s.status='ACTIVE' AND s.expires_at>clock_timestamp()
    AND b.binding_authorization_version=c.binding_authorization_version
    AND b.membership_authorization_version=c.membership_authorization_version
),false);

CREATE FUNCTION auth.current_workspace_principal_id() RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN (SELECT c.principal_id FROM auth.workspace_session_contexts c
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND auth.workspace_context_is_live());
CREATE FUNCTION auth.current_workspace_binding_id() RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN (SELECT c.workspace_binding_id FROM auth.workspace_session_contexts c
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND auth.workspace_context_is_live());
CREATE FUNCTION auth.current_workspace_kind() RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN (SELECT c.workspace_kind FROM auth.workspace_session_contexts c
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND auth.workspace_context_is_live());
CREATE FUNCTION auth.current_workspace_role() RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN (SELECT c.role_code FROM auth.workspace_session_contexts c
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND auth.workspace_context_is_live());
CREATE FUNCTION auth.current_workspace_organization_id() RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN (SELECT c.organization_id FROM auth.workspace_session_contexts c
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND auth.workspace_context_is_live());
CREATE FUNCTION auth.current_workspace_family_id() RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN (SELECT c.family_id FROM auth.workspace_session_contexts c
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND auth.workspace_context_is_live());
CREATE FUNCTION auth.current_workspace_request_nonce() RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN (SELECT c.request_nonce FROM auth.workspace_session_contexts c
  WHERE c.backend_pid=pg_backend_pid()
    AND c.backend_start=auth.current_backend_start()
    AND auth.workspace_context_is_live());

CREATE FUNCTION auth.clear_workspace_context() RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
AS $fn$
DECLARE v_start timestamptz:=auth.current_backend_start();
BEGIN
  DELETE FROM auth.workspace_session_contexts
   WHERE backend_pid=pg_backend_pid() AND backend_start=v_start;
  DELETE FROM auth.session_contexts
   WHERE backend_pid=pg_backend_pid() AND backend_start=v_start;
END
$fn$;

CREATE FUNCTION auth.revoke_workspace_sessions(
  p_principal_id uuid,p_owner_session_digest text,p_request_nonce uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
AS $fn$
DECLARE v_now timestamptz:=clock_timestamp(); v_rows integer; v_actor uuid;
BEGIN
  SELECT person_id INTO v_actor FROM auth.principals
   WHERE principal_id=p_principal_id AND status='ACTIVE';
  IF NOT FOUND OR p_owner_session_digest !~ '^[0-9a-f]{64}$' THEN
    RETURN auth.record_workspace_decision(
      p_principal_id,NULL,NULL,'LOGOUT','WORKSPACE_SESSION',NULL,false,
      'WORKSPACE_LOGOUT_IDENTITY_DENIED',p_request_nonce
    );
  END IF;
  UPDATE auth.workspace_sessions SET status='REVOKED',revoked_at=v_now
   WHERE principal_id=p_principal_id
     AND owner_session_digest=p_owner_session_digest AND status='ACTIVE';
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  DELETE FROM auth.workspace_session_contexts c WHERE EXISTS(
    SELECT 1 FROM auth.workspace_sessions s
     WHERE s.workspace_session_id=c.workspace_session_id
       AND s.principal_id=p_principal_id AND s.status<>'ACTIVE'
  );
  PERFORM auth.record_workspace_decision(
    p_principal_id,v_actor,NULL,'LOGOUT','WORKSPACE_SESSION',NULL,true,
    CASE WHEN v_rows>0 THEN 'WORKSPACE_SESSIONS_REVOKED' ELSE 'WORKSPACE_SESSION_ALREADY_CLEAR' END,
    p_request_nonce
  );
  RETURN true;
END
$fn$;

CREATE FUNCTION service.read_staff_workspace_projects() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,service,audit
AS $fn$
DECLARE v_items jsonb; v_principal uuid; v_org uuid; v_request uuid;
        v_count integer;
BEGIN
  v_principal:=auth.current_workspace_principal_id();
  v_org:=auth.current_workspace_organization_id();
  v_request:=auth.current_workspace_request_nonce();
  IF (auth.workspace_context_is_live()
      AND auth.current_workspace_kind()='STAFF'
      AND v_principal IS NOT NULL AND v_org IS NOT NULL) IS NOT TRUE THEN
    PERFORM auth.record_workspace_decision(
      v_principal,NULL,NULL,'READ','STAFF_PROJECT_PROJECTION',NULL,false,
      'STAFF_WORKSPACE_REQUIRED',v_request
    );
    RETURN jsonb_build_object('status','DENY','data',NULL);
  END IF;
  SELECT count(*),coalesce(jsonb_agg(jsonb_build_object(
    'projectCode',q.project_code,
    'projectName',q.project_name,
    'status',q.project_status,
    'domain',q.primary_domain,
    'assignmentRole',q.assignment_role,
    'updatedAt',q.updated_at
  ) ORDER BY q.updated_at DESC,q.project_code),'[]'::jsonb)
  INTO v_count,v_items
  FROM (
    SELECT p.project_code,p.project_name,p.project_status,p.primary_domain,
      a.assignment_role,p.updated_at
    FROM service.project_assignments a
    JOIN service.project_assignment_organization_scopes os
      ON os.project_assignment_id=a.project_assignment_id
    JOIN service.projects p ON p.service_project_id=a.service_project_id
    WHERE a.principal_id=v_principal AND os.organization_id=v_org
      AND a.status='ACTIVE' AND a.valid_from<=clock_timestamp()
      AND (a.valid_until IS NULL OR a.valid_until>clock_timestamp())
      AND p.project_status IN ('PLANNED','ACTIVE','ON_HOLD')
    ORDER BY p.updated_at DESC,p.project_code LIMIT 101
  ) q;
  IF v_count>100 THEN
    PERFORM auth.record_workspace_decision(
      v_principal,NULL,NULL,'READ','STAFF_PROJECT_PROJECTION',NULL,false,
      'STAFF_PROJECT_RESULT_LIMIT_EXCEEDED',v_request
    );
    RETURN jsonb_build_object('status','UNAVAILABLE','data',NULL);
  END IF;
  PERFORM auth.record_workspace_decision(
    v_principal,NULL,NULL,'READ','STAFF_PROJECT_PROJECTION',NULL,true,
    'STAFF_PROJECTS_AUTHORIZED',v_request
  );
  RETURN jsonb_build_object('status','ALLOW','data',jsonb_build_object(
    'contractVersion','staff-projects.v1','asOf',clock_timestamp(),'items',v_items
  ));
END
$fn$;

ALTER TABLE core.organization_workspace_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.organization_workspace_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE core.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.organization_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_role_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_role_bindings FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_context_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_context_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_session_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.workspace_session_contexts FORCE ROW LEVEL SECURITY;
ALTER TABLE service.project_assignment_organization_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service.project_assignment_organization_scopes FORCE ROW LEVEL SECURITY;

-- The migration owner may execute SECURITY DEFINER functions under FORCE RLS.
-- Runtime roles receive no table privilege and no policy.
CREATE POLICY organization_workspace_profiles_migrator
  ON core.organization_workspace_profiles FOR ALL TO phoenix_canonical_migrator
  USING (true) WITH CHECK (true);
CREATE POLICY organization_memberships_migrator
  ON core.organization_memberships FOR ALL TO phoenix_canonical_migrator
  USING (true) WITH CHECK (true);
CREATE POLICY workspace_role_bindings_migrator
  ON auth.workspace_role_bindings FOR ALL TO phoenix_canonical_migrator
  USING (true) WITH CHECK (true);
CREATE POLICY workspace_sessions_migrator
  ON auth.workspace_sessions FOR ALL TO phoenix_canonical_migrator
  USING (true) WITH CHECK (true);
CREATE POLICY workspace_context_tickets_migrator
  ON auth.workspace_context_tickets FOR ALL TO phoenix_canonical_migrator
  USING (true) WITH CHECK (true);
CREATE POLICY workspace_session_contexts_migrator
  ON auth.workspace_session_contexts FOR ALL TO phoenix_canonical_migrator
  USING (true) WITH CHECK (true);
CREATE POLICY project_assignment_organization_scopes_migrator
  ON service.project_assignment_organization_scopes FOR ALL TO phoenix_canonical_migrator
  USING (true) WITH CHECK (true);

REVOKE ALL ON core.organization_workspace_profiles,core.organization_memberships,
  auth.workspace_role_bindings,auth.workspace_sessions,
  auth.workspace_context_tickets,auth.workspace_session_contexts,
  service.project_assignment_organization_scopes
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,
    phoenix_canonical_context_binder,phoenix_canonical_workspace_reader;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA auth FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA core FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA service FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  core.register_workspace_organization_profile(uuid,text,text),
  core.invite_organization_member(uuid,uuid,uuid,timestamptz),
  core.accept_organization_membership(uuid,uuid),
  core.transition_organization_membership(uuid,text),
  auth.assign_workspace_role(uuid,uuid,uuid,uuid,text,text,timestamptz),
  auth.revoke_workspace_role(uuid),
  service.scope_project_assignment_to_organization(uuid,uuid)
TO phoenix_canonical_app;

GRANT EXECUTE ON FUNCTION
  auth.list_available_workspaces(uuid,uuid),
  auth.rotate_workspace_session(uuid,uuid,text,text,timestamptz,uuid),
  auth.issue_workspace_context_ticket(uuid,text,text,timestamptz,uuid,uuid),
  auth.revoke_workspace_sessions(uuid,text,uuid)
TO phoenix_canonical_context_binder;

GRANT EXECUTE ON FUNCTION
  auth.redeem_workspace_context_ticket(uuid,uuid),
  auth.clear_workspace_context(),
  service.read_staff_workspace_projects()
TO phoenix_canonical_workspace_reader;

COMMIT;
