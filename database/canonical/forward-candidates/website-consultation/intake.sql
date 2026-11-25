BEGIN;
-- Isolated forward candidate. Keep outside the numbered migration ledger.
CREATE ROLE phoenix_website_intake NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE phoenix_website_intake_binder NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA auth,crm TO phoenix_website_intake;
GRANT USAGE ON SCHEMA auth TO phoenix_website_intake_binder;
GRANT EXECUTE ON FUNCTION auth.redeem_context_ticket(uuid,uuid),auth.clear_context(),
  auth.current_request_nonce(),auth.current_principal_id(),auth.current_family_id()
  TO phoenix_website_intake;

CREATE FUNCTION auth.issue_website_intake_ticket(p_principal uuid,p_nonce uuid)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
AS $ticket$
BEGIN
  IF p_nonce IS NULL OR NOT pg_has_role(session_user,'phoenix_website_intake_binder','MEMBER')
    OR pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    OR NOT EXISTS (
      SELECT 1 FROM auth.principals
      WHERE principal_id=p_principal AND principal_kind='SERVICE' AND person_id IS NULL
        AND status='ACTIVE' AND service_label='canonical_crm_v2'
    ) THEN
    RETURN NULL;
  END IF;
  RETURN auth.issue_context_ticket(p_principal,NULL,NULL,'INTERNAL',
    clock_timestamp() + interval '15 seconds',p_nonce,p_principal);
END
$ticket$;
REVOKE ALL ON FUNCTION auth.issue_website_intake_ticket(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.issue_website_intake_ticket(uuid,uuid) TO phoenix_website_intake_binder;

-- Preserve the 0036 contract evidence checks. Only the website source can
-- register a dedicated intake writer, which cannot hold the general app role.
CREATE OR REPLACE FUNCTION crm.register_acquisition_contract(
  p_id uuid,p_source uuid,p_version text,p_manifest jsonb,p_approval_ref text,p_approval_sha256 text,
  p_retention_ref text,p_retention_sha256 text,p_app_login name,
  p_valid_from timestamptz,p_valid_until timestamptz,p_advisor_resource_kind text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,core AS $fn$
DECLARE s crm.lead_sources%ROWTYPE; v_hash text; old crm.acquisition_contract_revisions%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_manifest) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'ACQUISITION_MANIFEST_OBJECT_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(p_manifest) x WHERE jsonb_typeof(x.value)<>'string'
      OR x.key NOT IN ('entry_ref','entry_revision','manifest_ref','manifest_sha256',
        'geo_source_system','geo_ref','geo_revision','geo_sha256')) THEN
    RAISE EXCEPTION 'ACQUISITION_MANIFEST_FIELDS_DENIED';
  END IF;
  SELECT * INTO s FROM crm.lead_sources WHERE lead_source_id=p_source AND status='ACTIVE';
  IF (FOUND AND core.is_uuid_v7(p_id) AND p_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$'
      AND p_manifest ?& ARRAY['entry_ref','entry_revision','manifest_ref','manifest_sha256']
      AND length(btrim(p_approval_ref)) BETWEEN 1 AND 500 AND p_approval_sha256 ~ '^[0-9a-f]{64}$'
      AND length(btrim(p_retention_ref)) BETWEEN 1 AND 500 AND p_retention_sha256 ~ '^[0-9a-f]{64}$'
      AND p_valid_from IS NOT NULL AND isfinite(p_valid_from) AND isfinite(p_valid_until)
      AND p_valid_until>p_valid_from
      AND (p_advisor_resource_kind IS NULL OR p_advisor_resource_kind IN ('EDUCATION_APPLICATION','IDENTITY_CASE'))
      AND EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname=p_app_login AND r.rolcanlogin
        AND NOT(r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls))
      AND CASE WHEN pg_has_role(p_app_login,'phoenix_website_intake','MEMBER') THEN
        s.source_system='phoenix-nova-website' AND s.source_channel='WEBSITE'
        AND p_advisor_resource_kind IS NULL
        AND NOT pg_has_role(p_app_login,'phoenix_website_intake_binder','MEMBER')
        AND NOT pg_has_role(p_app_login,'phoenix_canonical_app','MEMBER')
      ELSE pg_has_role(p_app_login,'phoenix_canonical_app','USAGE') END) IS NOT TRUE THEN
    RAISE EXCEPTION 'ACQUISITION_CONTRACT_EVIDENCE_OR_LOGIN_DENIED';
  END IF;
  v_hash:=encode(sha256(convert_to(jsonb_build_object('source',p_source,'source_system',s.source_system,
    'version',p_version,'manifest',p_manifest,'approval_ref',p_approval_ref,'approval_sha256',p_approval_sha256,
    'retention_ref',p_retention_ref,'retention_sha256',p_retention_sha256,'login',p_app_login,
    'from',to_char(p_valid_from AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'until',to_char(p_valid_until AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'advisor_resource_kind',p_advisor_resource_kind)::text,'UTF8')),'hex');
  PERFORM pg_advisory_xact_lock(3636,hashtext(p_source::text||':'||(p_manifest->>'entry_ref')||':'||p_version));
  SELECT * INTO old FROM crm.acquisition_contract_revisions WHERE contract_id=p_id;
  IF FOUND THEN
    IF old.registered_payload_sha256=v_hash AND old.revoked_at IS NULL THEN RETURN old.contract_id; END IF;
    RAISE EXCEPTION 'ACQUISITION_CONTRACT_IDEMPOTENCY_CONFLICT';
  END IF;
  INSERT INTO crm.acquisition_contract_revisions(contract_id,lead_source_id,source_system,contract_version,
    entry_ref,entry_revision,manifest_ref,manifest_sha256,approval_ref,approval_sha256,
    retention_policy_ref,retention_policy_sha256,allowed_app_login,valid_from,valid_until,advisor_resource_kind,
    geo_source_system,geo_ref,geo_revision,geo_sha256,registered_payload_sha256,registered_by_login)
  VALUES(p_id,p_source,s.source_system,p_version,p_manifest->>'entry_ref',p_manifest->>'entry_revision',
    p_manifest->>'manifest_ref',p_manifest->>'manifest_sha256',p_approval_ref,p_approval_sha256,
    p_retention_ref,p_retention_sha256,p_app_login,p_valid_from,p_valid_until,p_advisor_resource_kind,
    p_manifest->>'geo_source_system',p_manifest->>'geo_ref',p_manifest->>'geo_revision',p_manifest->>'geo_sha256',
    v_hash,session_user);
  RETURN p_id;
END
$fn$;

-- A fixed policy belongs to the approved acquisition contract version.
CREATE TABLE crm.website_contact_retention (
  contract_id uuid PRIMARY KEY REFERENCES crm.acquisition_contract_revisions(contract_id),
  contact_days integer NOT NULL CHECK (contact_days = 180)
);
ALTER TABLE crm.website_contact_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.website_contact_retention FORCE ROW LEVEL SECURITY;
REVOKE ALL ON crm.website_contact_retention FROM PUBLIC,phoenix_website_intake,phoenix_canonical_app,phoenix_canonical_reader;
DO $policy$
BEGIN
  EXECUTE format(
    'CREATE POLICY website_contact_retention_owner ON crm.website_contact_retention TO %I USING (true) WITH CHECK (true)',
    current_user
  );
END
$policy$;
CREATE FUNCTION crm.configure_website_contact_retention(p_contract uuid,p_days integer,p_policy_sha256 text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm
AS $configure$
BEGIN
  IF (p_days = 180 AND EXISTS (
      SELECT 1 FROM crm.acquisition_contract_revisions c JOIN crm.lead_sources s USING(lead_source_id)
      WHERE c.contract_id=p_contract AND c.source_system='phoenix-nova-website' AND s.source_channel='WEBSITE'
        AND c.revoked_at IS NULL AND c.retention_policy_sha256=p_policy_sha256
  )) IS NOT TRUE THEN RETURN false; END IF;
  INSERT INTO crm.website_contact_retention(contract_id,contact_days) VALUES(p_contract,p_days)
    ON CONFLICT (contract_id) DO NOTHING;
  RETURN EXISTS (SELECT 1 FROM crm.website_contact_retention WHERE contract_id=p_contract AND contact_days=p_days);
END
$configure$;
REVOKE ALL ON FUNCTION crm.configure_website_contact_retention(uuid,integer,text) FROM PUBLIC,phoenix_canonical_app;
GRANT EXECUTE ON FUNCTION crm.configure_website_contact_retention(uuid,integer,text) TO phoenix_canonical_migrator;

-- A contact envelope belongs to an existing CRM lead, not a Person or Family.
CREATE TABLE crm.website_consultation_intake (
  request_id uuid PRIMARY KEY,
  lead_id uuid NOT NULL UNIQUE REFERENCES crm.leads(lead_id),
  acquisition_contract_id uuid NOT NULL REFERENCES crm.acquisition_contract_revisions(contract_id),
  service_domain text NOT NULL CHECK (service_domain IN ('EDUCATION','IDENTITY','WEALTH','HEALTH')),
  locale text NOT NULL CHECK (locale IN ('zh','en')),
  consent_version text NOT NULL CHECK (consent_version='website-consultation.v1'),
  -- The trusted receiver computes a keyed digest over the stable request fields.
  payload_mac bytea CHECK (octet_length(payload_mac)=32),
  duplicate_match_mac bytea CHECK (octet_length(duplicate_match_mac)=32),
  -- Encrypted by the trusted receiver. The website and database have no decrypt key.
  contact_envelope bytea CHECK (octet_length(contact_envelope) BETWEEN 32 AND 4096),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  contact_expires_at timestamptz NOT NULL,
  contact_erased_at timestamptz,
  CHECK ((contact_erased_at IS NOT NULL)=(contact_envelope IS NULL)),
  CHECK ((contact_erased_at IS NOT NULL)=(payload_mac IS NULL)),
  CHECK ((contact_erased_at IS NOT NULL)=(duplicate_match_mac IS NULL))
);
CREATE INDEX website_contact_expiration_idx ON crm.website_consultation_intake(contact_expires_at)
  WHERE contact_envelope IS NOT NULL;
ALTER TABLE crm.website_consultation_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.website_consultation_intake FORCE ROW LEVEL SECURITY;
REVOKE ALL ON crm.website_consultation_intake FROM PUBLIC,phoenix_canonical_app,
  phoenix_canonical_reader,phoenix_website_intake;

-- Only the function owner has table access. Login roles receive no direct table grant.
DO $policy$
BEGIN
  EXECUTE format(
    'CREATE POLICY website_intake_function_owner ON crm.website_consultation_intake TO %I USING (true) WITH CHECK (true)',
    current_user
  );
END
$policy$;

CREATE FUNCTION crm.record_website_consultation(
  p_request uuid, p_contract uuid, p_lead uuid, p_event uuid, p_attribution uuid,
  p_domain text, p_locale text, p_consent_version text, p_payload_mac bytea,
  p_contact_envelope bytea, p_duplicate_match_mac bytea
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,crm,core,auth,audit
AS $fn$
DECLARE
  previous crm.website_consultation_intake%ROWTYPE;
  actual_lead uuid;
  retention_days integer;
BEGIN
  IF (crm.is_crm_service() AND auth.current_family_id() IS NULL
      AND pg_has_role(session_user,'phoenix_website_intake','MEMBER')
      AND NOT pg_has_role(session_user,'phoenix_website_intake_binder','MEMBER')
      AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
      AND p_request::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND p_domain IN ('EDUCATION','IDENTITY','WEALTH','HEALTH')
      AND p_locale IN ('zh','en') AND p_consent_version='website-consultation.v1'
      AND octet_length(p_payload_mac)=32
      AND octet_length(p_duplicate_match_mac)=32
      AND octet_length(p_contact_envelope) BETWEEN 32 AND 4096) IS NOT TRUE THEN
    RETURN 'denied';
  END IF;
  PERFORM pg_advisory_xact_lock(83111,hashtext(p_request::text));
  PERFORM 1 FROM crm.acquisition_contract_revisions c
    JOIN crm.lead_sources s ON s.lead_source_id=c.lead_source_id
    WHERE c.contract_id=p_contract AND c.source_system='phoenix-nova-website'
      AND s.source_system=c.source_system AND s.source_channel='WEBSITE' AND s.status='ACTIVE'
    FOR SHARE OF c;
  IF NOT FOUND OR crm.acquisition_contract_usable(p_contract) IS NOT TRUE
    OR crm.is_crm_service() IS NOT TRUE THEN
    RETURN 'denied';
  END IF;

  SELECT * INTO previous FROM crm.website_consultation_intake WHERE request_id=p_request;
  IF FOUND THEN
    IF previous.contact_erased_at IS NOT NULL OR previous.contact_expires_at<=clock_timestamp() THEN RETURN 'denied'; END IF;
    IF previous.acquisition_contract_id=p_contract AND previous.service_domain=p_domain
      AND previous.locale=p_locale AND previous.consent_version=p_consent_version
      AND previous.payload_mac=p_payload_mac THEN
      RETURN 'persisted';
    END IF;
    RETURN 'conflict';
  END IF;
  SELECT contact_days INTO retention_days FROM crm.website_contact_retention WHERE contract_id=p_contract;
  IF NOT FOUND THEN RETURN 'denied'; END IF;
  actual_lead := crm.create_lead_v2(p_lead,p_contract,NULL,NULL,NULL,NULL,p_event,p_attribution,p_request::text);
  IF actual_lead IS NULL THEN RETURN 'denied'; END IF;
  INSERT INTO crm.website_consultation_intake(
    request_id,lead_id,acquisition_contract_id,service_domain,locale,consent_version,payload_mac,contact_envelope,duplicate_match_mac,contact_expires_at
  ) VALUES (p_request,actual_lead,p_contract,p_domain,p_locale,p_consent_version,p_payload_mac,p_contact_envelope,p_duplicate_match_mac,
    clock_timestamp()+make_interval(hours=>24*retention_days));
  RETURN 'persisted';
END
$fn$;
REVOKE ALL ON FUNCTION crm.record_website_consultation(uuid,uuid,uuid,uuid,uuid,text,text,text,bytea,bytea,bytea)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader;
GRANT EXECUTE ON FUNCTION crm.record_website_consultation(uuid,uuid,uuid,uuid,uuid,text,text,text,bytea,bytea,bytea)
  TO phoenix_website_intake;

CREATE TABLE crm.website_intake_rate_limits (
  window_start timestamptz NOT NULL,
  bucket text NOT NULL CHECK (bucket='GLOBAL' OR bucket ~ '^[0-9a-f]{64}$'),
  hits smallint NOT NULL CHECK (hits BETWEEN 1 AND 120),
  PRIMARY KEY(window_start,bucket)
);
ALTER TABLE crm.website_intake_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.website_intake_rate_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON crm.website_intake_rate_limits FROM PUBLIC,phoenix_website_intake,phoenix_canonical_app,phoenix_canonical_reader;
DO $policy$
BEGIN
  EXECUTE format(
    'CREATE POLICY website_intake_rate_owner ON crm.website_intake_rate_limits TO %I USING (true) WITH CHECK (true)',
    current_user
  );
END
$policy$;

CREATE FUNCTION crm.admit_website_consultation(p_fingerprint text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,crm,auth
AS $rate$
DECLARE instant timestamptz; minute_window timestamptz; contact_window timestamptz; admitted boolean;
BEGIN
  IF (crm.is_crm_service() AND auth.current_family_id() IS NULL
    AND pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake_binder','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND p_fingerprint ~ '^[0-9a-f]{64}$') IS NOT TRUE THEN RETURN false; END IF;
  instant := clock_timestamp();
  minute_window := date_bin('1 minute',instant,'2000-01-01 UTC'::timestamptz);
  contact_window := date_bin('10 minutes',instant,'2000-01-01 UTC'::timestamptz);
  DELETE FROM crm.website_intake_rate_limits WHERE window_start<instant-interval '20 minutes';
  -- Acquire the global bucket first. Distributed requests cannot grow
  -- the per-contact table above the global rate.
  INSERT INTO crm.website_intake_rate_limits AS limits(window_start,bucket,hits)
    VALUES(minute_window,'GLOBAL',1)
    ON CONFLICT (window_start,bucket) DO UPDATE SET hits=limits.hits+1 WHERE limits.hits<120;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO crm.website_intake_rate_limits AS limits(window_start,bucket,hits)
    VALUES(contact_window,p_fingerprint,1)
    ON CONFLICT (window_start,bucket) DO UPDATE SET hits=limits.hits+1 WHERE limits.hits<8
    RETURNING true INTO admitted;
  RETURN coalesce(admitted,false);
END
$rate$;
REVOKE ALL ON FUNCTION crm.admit_website_consultation(text) FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader;
GRANT EXECUTE ON FUNCTION crm.admit_website_consultation(text) TO phoenix_website_intake;

CREATE ROLE phoenix_website_contact_retention NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA crm TO phoenix_website_contact_retention;
CREATE FUNCTION crm.erase_expired_website_contacts()
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm
AS $erase$
DECLARE erased integer; cutoff timestamptz := clock_timestamp();
BEGIN
  IF NOT pg_has_role(session_user,'phoenix_website_contact_retention','MEMBER')
    OR pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    OR pg_has_role(session_user,'phoenix_canonical_app','MEMBER') THEN RETURN 0; END IF;
  WITH due AS (
    SELECT i.request_id FROM crm.website_consultation_intake i
      WHERE i.contact_envelope IS NOT NULL AND (i.contact_expires_at<=cutoff
        OR EXISTS (SELECT 1 FROM crm.leads l WHERE l.lead_id=i.lead_id AND l.lead_status='CONVERTED'))
      ORDER BY i.contact_expires_at,i.request_id LIMIT 500 FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE crm.website_consultation_intake i
    SET contact_envelope=NULL,payload_mac=NULL,duplicate_match_mac=NULL,contact_erased_at=cutoff FROM due WHERE i.request_id=due.request_id;
  GET DIAGNOSTICS erased = ROW_COUNT;
  RETURN erased;
END
$erase$;
REVOKE ALL ON FUNCTION crm.erase_expired_website_contacts() FROM PUBLIC,phoenix_canonical_app;
GRANT EXECUTE ON FUNCTION crm.erase_expired_website_contacts() TO phoenix_website_contact_retention;

-- Only a separately provisioned operator may replay already verified deletions.
-- The independent approval register is the caller's source of authority.
CREATE ROLE phoenix_website_deletion_replay NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA crm TO phoenix_website_deletion_replay;
CREATE FUNCTION crm.replay_website_contact_deletion(p_request_id uuid, p_recorded_at timestamptz)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm
AS $replay$
BEGIN
  IF NOT pg_has_role(session_user,'phoenix_website_deletion_replay','MEMBER')
    OR pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    OR pg_has_role(session_user,'phoenix_website_contact_retention','MEMBER')
    OR pg_has_role(session_user,'phoenix_canonical_app','MEMBER') THEN
    RAISE EXCEPTION 'WEBSITE_DELETION_REPLAY_DENIED' USING ERRCODE='42501';
  END IF;

  UPDATE crm.website_consultation_intake
    SET contact_envelope=NULL,payload_mac=NULL,duplicate_match_mac=NULL,contact_erased_at=clock_timestamp()
    WHERE request_id=p_request_id AND recorded_at=p_recorded_at AND contact_erased_at IS NULL;
  IF FOUND THEN
    PERFORM audit.record_write_decision('WEBSITE_CONTACT_DELETION_REPLAY',
      'WEBSITE_CONSULTATION',p_request_id,true,'VERIFIED_DELETION_REPLAY');
    RETURN 'erased';
  END IF;

  IF EXISTS (SELECT 1 FROM crm.website_consultation_intake
    WHERE request_id=p_request_id AND recorded_at=p_recorded_at AND contact_erased_at IS NOT NULL) THEN
    RETURN 'already_erased';
  END IF;
  RETURN 'not_matched';
END
$replay$;
REVOKE ALL ON FUNCTION crm.replay_website_contact_deletion(uuid,timestamptz) FROM PUBLIC,phoenix_canonical_app;
GRANT EXECUTE ON FUNCTION crm.replay_website_contact_deletion(uuid,timestamptz) TO phoenix_website_deletion_replay;
COMMIT;
