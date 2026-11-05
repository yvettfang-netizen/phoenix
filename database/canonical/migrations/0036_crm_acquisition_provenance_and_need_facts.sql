BEGIN;

-- Candidate only. No source contracts or identities are seeded by this Migration.
-- A contract is a reviewed publication/permission reference, never another CMS,
-- Person, Family, Student, Lead or Service Project authority.
CREATE TABLE crm.acquisition_contract_revisions (
  contract_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(contract_id)),
  lead_source_id uuid NOT NULL REFERENCES crm.lead_sources,
  source_system text NOT NULL,
  contract_version text NOT NULL CHECK (contract_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$'),
  entry_ref text NOT NULL CHECK (length(btrim(entry_ref)) BETWEEN 1 AND 500),
  entry_revision text NOT NULL CHECK (length(btrim(entry_revision)) BETWEEN 1 AND 128),
  manifest_ref text NOT NULL CHECK (length(btrim(manifest_ref)) BETWEEN 1 AND 500),
  manifest_sha256 text NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  approval_ref text NOT NULL CHECK (length(btrim(approval_ref)) BETWEEN 1 AND 500),
  approval_sha256 text NOT NULL CHECK (approval_sha256 ~ '^[0-9a-f]{64}$'),
  retention_policy_ref text NOT NULL CHECK (length(btrim(retention_policy_ref)) BETWEEN 1 AND 500),
  retention_policy_sha256 text NOT NULL CHECK (retention_policy_sha256 ~ '^[0-9a-f]{64}$'),
  responsible_role text NOT NULL DEFAULT 'FOUNDER' CHECK (responsible_role='FOUNDER'),
  allowed_app_login name NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL CHECK (valid_until>valid_from),
  advisor_resource_kind text CHECK (advisor_resource_kind IN ('EDUCATION_APPLICATION','IDENTITY_CASE')),
  geo_source_system text,
  geo_ref text,
  geo_revision text,
  geo_sha256 text,
  registered_payload_sha256 text NOT NULL CHECK (registered_payload_sha256 ~ '^[0-9a-f]{64}$'),
  registered_by_login name NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revoked_by_login name,
  revocation_ref text,
  revocation_sha256 text,
  UNIQUE(lead_source_id,entry_ref,contract_version),
  CHECK ((geo_source_system IS NULL AND geo_ref IS NULL AND geo_revision IS NULL AND geo_sha256 IS NULL)
    OR (length(btrim(geo_source_system)) BETWEEN 1 AND 100 AND length(btrim(geo_ref)) BETWEEN 1 AND 500
      AND length(btrim(geo_revision)) BETWEEN 1 AND 128 AND geo_sha256 ~ '^[0-9a-f]{64}$'
      AND geo_source_system IS NOT NULL AND geo_ref IS NOT NULL AND geo_revision IS NOT NULL AND geo_sha256 IS NOT NULL)),
  CHECK ((revoked_at IS NULL AND revoked_by_login IS NULL AND revocation_ref IS NULL AND revocation_sha256 IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by_login IS NOT NULL AND length(btrim(revocation_ref)) BETWEEN 1 AND 500
      AND revocation_ref IS NOT NULL AND revocation_sha256 IS NOT NULL AND revocation_sha256 ~ '^[0-9a-f]{64}$'))
);
ALTER TABLE crm.acquisition_contract_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.acquisition_contract_revisions FORCE ROW LEVEL SECURITY;
-- No runtime table policy: this registry is deliberately default-deny.
REVOKE ALL ON crm.acquisition_contract_revisions FROM PUBLIC,phoenix_canonical_app,
  phoenix_canonical_reader,phoenix_canonical_context_binder,phoenix_canonical_migrator;
GRANT SELECT ON crm.acquisition_contract_revisions TO phoenix_canonical_backup_runtime;

CREATE FUNCTION crm.protect_acquisition_contract() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACQUISITION_CONTRACT_HISTORY_IMMUTABLE'; END IF;
  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL
    OR (to_jsonb(NEW)-ARRAY['revoked_at','revoked_by_login','revocation_ref','revocation_sha256'])
      IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['revoked_at','revoked_by_login','revocation_ref','revocation_sha256']) THEN
    RAISE EXCEPTION 'ACQUISITION_CONTRACT_TERMINAL_OR_HISTORY_DENIED';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER acquisition_contract_history BEFORE UPDATE OR DELETE ON crm.acquisition_contract_revisions
FOR EACH ROW EXECUTE FUNCTION crm.protect_acquisition_contract();

CREATE FUNCTION crm.register_acquisition_contract(
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
      AND pg_has_role(p_app_login,'phoenix_canonical_app','USAGE')) IS NOT TRUE THEN
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

CREATE FUNCTION crm.revoke_acquisition_contract(p_id uuid,p_ref text,p_sha256 text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm AS $fn$
BEGIN
  IF (length(btrim(p_ref)) BETWEEN 1 AND 500 AND p_sha256 ~ '^[0-9a-f]{64}$') IS NOT TRUE THEN
    RAISE EXCEPTION 'ACQUISITION_REVOCATION_EVIDENCE_REQUIRED';
  END IF;
  UPDATE crm.acquisition_contract_revisions SET revoked_at=clock_timestamp(),revoked_by_login=session_user,
    revocation_ref=p_ref,revocation_sha256=p_sha256 WHERE contract_id=p_id AND revoked_at IS NULL;
  RETURN FOUND;
END
$fn$;

CREATE FUNCTION crm.acquisition_contract_usable(p_id uuid,p_retract boolean DEFAULT false) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm AS $fn$
  SELECT EXISTS(SELECT 1 FROM crm.acquisition_contract_revisions c JOIN crm.lead_sources s
      ON s.lead_source_id=c.lead_source_id AND s.source_system=c.source_system
    JOIN pg_roles r ON r.rolname=c.allowed_app_login
    WHERE c.contract_id=p_id AND c.allowed_app_login=session_user AND r.rolcanlogin
      AND NOT(r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
      AND c.valid_from<=clock_timestamp()
      AND (p_retract OR (c.revoked_at IS NULL
        AND c.valid_until>clock_timestamp() AND s.status='ACTIVE')));
$fn$;

ALTER TABLE crm.lead_attributions ALTER COLUMN compass_kind DROP NOT NULL;
ALTER TABLE crm.lead_attributions
  ADD COLUMN acquisition_contract_id uuid REFERENCES crm.acquisition_contract_revisions,
  ADD COLUMN entry_ref text, ADD COLUMN entry_revision text, ADD COLUMN entry_manifest_sha256 text,
  ADD COLUMN content_source_system text, ADD COLUMN content_ref text,
  ADD COLUMN content_revision text, ADD COLUMN content_sha256 text,
  ADD COLUMN source_event_ref text, ADD COLUMN source_payload_sha256 text, ADD COLUMN recorded_by_login name,
  ADD CONSTRAINT attribution_v2_complete CHECK (
    (acquisition_contract_id IS NULL AND entry_ref IS NULL AND entry_revision IS NULL AND entry_manifest_sha256 IS NULL
      AND content_source_system IS NULL AND content_ref IS NULL AND content_revision IS NULL AND content_sha256 IS NULL
      AND source_event_ref IS NULL AND source_payload_sha256 IS NULL AND recorded_by_login IS NULL AND compass_kind IS NOT NULL)
    OR (acquisition_contract_id IS NOT NULL AND entry_ref IS NOT NULL AND entry_revision IS NOT NULL
      AND entry_manifest_sha256 IS NOT NULL AND source_event_ref IS NOT NULL AND source_payload_sha256 IS NOT NULL
      AND recorded_by_login IS NOT NULL AND length(btrim(entry_ref)) BETWEEN 1 AND 500
      AND length(btrim(entry_revision)) BETWEEN 1 AND 128 AND entry_manifest_sha256 ~ '^[0-9a-f]{64}$'
      AND length(btrim(source_event_ref)) BETWEEN 1 AND 200 AND source_payload_sha256 ~ '^[0-9a-f]{64}$')),
  ADD CONSTRAINT attribution_content_tuple CHECK (
    (content_source_system IS NULL AND content_ref IS NULL AND content_revision IS NULL AND content_sha256 IS NULL)
    OR (content_source_system IS NOT NULL AND content_ref IS NOT NULL AND content_revision IS NOT NULL
      AND content_sha256 IS NOT NULL AND length(btrim(content_source_system)) BETWEEN 1 AND 100
      AND length(btrim(content_ref)) BETWEEN 1 AND 500 AND length(btrim(content_revision)) BETWEEN 1 AND 128
      AND content_sha256 ~ '^[0-9a-f]{64}$'));
CREATE UNIQUE INDEX attribution_source_event_unique ON crm.lead_attributions(source_system,attribution_kind,source_event_ref)
WHERE source_event_ref IS NOT NULL;

CREATE FUNCTION crm.validate_acquisition_attribution() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,crm,auth AS $fn$
DECLARE c crm.acquisition_contract_revisions%ROWTYPE; l crm.leads%ROWTYPE;
BEGIN
  IF NEW.acquisition_contract_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO c FROM crm.acquisition_contract_revisions WHERE contract_id=NEW.acquisition_contract_id;
  SELECT * INTO l FROM crm.leads WHERE lead_id=NEW.lead_id;
  IF (c.contract_id IS NOT NULL AND l.lead_id IS NOT NULL
    AND crm.is_crm_service() AND crm.acquisition_contract_usable(c.contract_id)
    AND NEW.lead_source_id=c.lead_source_id AND NEW.source_system=c.source_system
    AND NEW.entry_ref=c.entry_ref AND NEW.entry_revision=c.entry_revision AND NEW.entry_manifest_sha256=c.manifest_sha256
    AND NEW.content_source_system IS NOT DISTINCT FROM c.geo_source_system
    AND NEW.content_ref IS NOT DISTINCT FROM c.geo_ref AND NEW.content_revision IS NOT DISTINCT FROM c.geo_revision
    AND NEW.content_sha256 IS NOT DISTINCT FROM c.geo_sha256 AND NEW.recorded_by_login=session_user
    AND NEW.created_by_principal_id=auth.current_principal_id()) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('ATTRIBUTION','CRM_LEAD',NEW.lead_id,false,'ACQUISITION_ATTRIBUTION_CONTRACT_OR_RECORDER_DENIED');
    RAISE EXCEPTION 'ACQUISITION_ATTRIBUTION_CONTRACT_OR_RECORDER_DENIED';
  END IF;
  -- Last write-boundary check: guards also cover waits on a Lead/unique/FK lock.
  -- Historical conversion does not require its old contact still be a member;
  -- creation of a new Lead does require current contact membership/assignee.
  IF (((l.family_id IS NULL AND auth.current_family_id() IS NULL) OR l.family_id=auth.current_family_id())
    AND (NEW.attribution_kind<>'FIRST_TOUCH' OR (l.lead_source_id=c.lead_source_id
      AND (l.contact_person_id IS NULL OR EXISTS(SELECT 1 FROM core.family_memberships m
        WHERE m.person_id=l.contact_person_id AND m.family_id=l.family_id AND m.valid_from<=clock_timestamp()
          AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())))
      AND (l.assigned_principal_id IS NULL OR EXISTS(SELECT 1 FROM auth.principals p
        WHERE p.principal_id=l.assigned_principal_id AND p.status='ACTIVE'))))
    AND (NEW.partner_relationship_id IS NULL OR EXISTS(SELECT 1 FROM crm.partner_relationships p
      WHERE p.partner_relationship_id=NEW.partner_relationship_id AND p.lead_source_id=c.lead_source_id
        AND p.status='ACTIVE' AND p.valid_from<=clock_timestamp()
        AND (p.valid_until IS NULL OR p.valid_until>clock_timestamp())))) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('ATTRIBUTION','CRM_LEAD',NEW.lead_id,false,'ACQUISITION_SCOPE_CHANGED_AT_WRITE');
    RAISE EXCEPTION 'ACQUISITION_SCOPE_CHANGED_AT_WRITE';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER acquisition_attribution_validate BEFORE INSERT ON crm.lead_attributions
FOR EACH ROW EXECUTE FUNCTION crm.validate_acquisition_attribution();

CREATE FUNCTION crm.create_lead_v2(
  p_id uuid,p_contract uuid,p_contact uuid,p_family uuid,p_assignee uuid,p_legacy_compass text,
  p_event uuid,p_attribution uuid,p_source_event_ref text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,core,auth,audit AS $fn$
DECLARE c crm.acquisition_contract_revisions%ROWTYPE; s crm.lead_sources%ROWTYPE;
  previous crm.lead_attributions%ROWTYPE; h text;
BEGIN
  SELECT * INTO c FROM crm.acquisition_contract_revisions WHERE contract_id=p_contract FOR SHARE;
  SELECT * INTO s FROM crm.lead_sources WHERE lead_source_id=c.lead_source_id;
  IF (crm.is_crm_service() AND crm.acquisition_contract_usable(p_contract) AND core.is_uuid_v7(p_id)
    AND core.is_uuid_v7(p_event) AND core.is_uuid_v7(p_attribution)
    AND length(btrim(p_source_event_ref)) BETWEEN 1 AND 200
    AND (p_legacy_compass IS NULL OR p_legacy_compass IN ('CHILD_COMPASS','EDUCATION_COMPASS','FAMILY_COMPASS','HEALTH_COMPASS'))
    AND ((p_family IS NULL AND auth.current_family_id() IS NULL) OR (p_family=auth.current_family_id()
      AND EXISTS(SELECT 1 FROM core.families WHERE family_id=p_family)))
    AND (p_contact IS NULL OR (p_family IS NOT NULL AND EXISTS(SELECT 1 FROM core.family_memberships m
      WHERE m.person_id=p_contact AND m.family_id=p_family AND m.valid_from<=clock_timestamp()
        AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp()))))
    AND (p_assignee IS NULL OR EXISTS(SELECT 1 FROM auth.principals WHERE principal_id=p_assignee AND status='ACTIVE'))) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('CREATE','CRM_LEAD',p_id,false,'ACQUISITION_CONTEXT_CONTRACT_OR_SCOPE_DENIED'); RETURN NULL;
  END IF;
  h:=encode(sha256(convert_to(jsonb_build_array(p_id,p_contract,p_contact,p_family,p_assignee,p_legacy_compass)::text,'UTF8')),'hex');
  PERFORM pg_advisory_xact_lock(3636,hashtext(c.source_system||':FIRST_TOUCH:'||p_source_event_ref));
  -- Eligibility may expire while the idempotency lock is held elsewhere.
  IF (crm.is_crm_service() AND crm.acquisition_contract_usable(p_contract)
    AND ((p_family IS NULL AND auth.current_family_id() IS NULL) OR p_family=auth.current_family_id())
    AND (p_contact IS NULL OR EXISTS(SELECT 1 FROM core.family_memberships m
      WHERE m.person_id=p_contact AND m.family_id=p_family AND m.valid_from<=clock_timestamp()
        AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())))
    AND (p_assignee IS NULL OR EXISTS(SELECT 1 FROM auth.principals p
      WHERE p.principal_id=p_assignee AND p.status='ACTIVE'))) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('CREATE','CRM_LEAD',p_id,false,'ACQUISITION_SCOPE_CHANGED_WHILE_WAITING'); RETURN NULL;
  END IF;
  SELECT * INTO previous FROM crm.lead_attributions WHERE source_system=c.source_system
    AND attribution_kind='FIRST_TOUCH' AND source_event_ref=p_source_event_ref;
  IF FOUND THEN
    IF previous.source_payload_sha256=h THEN RETURN previous.lead_id; END IF;
    PERFORM audit.record_write_decision('CREATE','CRM_LEAD',p_id,false,'ACQUISITION_IDEMPOTENCY_CONFLICT'); RETURN NULL;
  END IF;
  IF EXISTS(SELECT 1 FROM crm.leads WHERE lead_id=p_id) THEN
    PERFORM audit.record_write_decision('CREATE','CRM_LEAD',p_id,false,'LEAD_ID_ALREADY_EXISTS'); RETURN NULL;
  END IF;
  INSERT INTO crm.leads(lead_id,lead_source_id,campaign_id,partner_organization_id,contact_person_id,family_id,
    lead_status,qualification_status,assigned_principal_id,created_by_principal_id,updated_by_principal_id)
  VALUES(p_id,c.lead_source_id,s.campaign_id,s.partner_organization_id,p_contact,p_family,'NEW','UNVERIFIED',p_assignee,
    auth.current_principal_id(),auth.current_principal_id());
  INSERT INTO crm.lead_attributions(lead_attribution_id,lead_id,attribution_kind,lead_source_id,campaign_id,
    compass_kind,source_system,attribution_model_version,created_by_principal_id,acquisition_contract_id,
    entry_ref,entry_revision,entry_manifest_sha256,content_source_system,content_ref,content_revision,content_sha256,
    source_event_ref,source_payload_sha256,recorded_by_login)
  VALUES(p_attribution,p_id,'FIRST_TOUCH',c.lead_source_id,s.campaign_id,p_legacy_compass,c.source_system,c.contract_version,
    auth.current_principal_id(),c.contract_id,c.entry_ref,c.entry_revision,c.manifest_sha256,
    c.geo_source_system,c.geo_ref,c.geo_revision,c.geo_sha256,p_source_event_ref,h,session_user);
  PERFORM crm.record_lead_event(p_event,p_id,'CREATED',NULL,'NEW','VERSIONED_ENTRY_LEAD_CREATED');
  PERFORM audit.record_write_decision('CREATE','CRM_LEAD',p_id,true,'VERSIONED_ENTRY_LEAD_CREATED'); RETURN p_id;
END
$fn$;

CREATE FUNCTION crm.record_conversion_attribution_v2(
  p_id uuid,p_lead uuid,p_contract uuid,p_partner uuid,p_legacy_compass text,p_event uuid,p_source_event_ref text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,core,auth,audit AS $fn$
DECLARE c crm.acquisition_contract_revisions%ROWTYPE; l crm.leads%ROWTYPE; s crm.lead_sources%ROWTYPE;
  previous crm.lead_attributions%ROWTYPE; h text;
BEGIN
  SELECT * INTO c FROM crm.acquisition_contract_revisions WHERE contract_id=p_contract FOR SHARE;
  SELECT * INTO l FROM crm.leads WHERE lead_id=p_lead FOR UPDATE;
  SELECT * INTO s FROM crm.lead_sources WHERE lead_source_id=c.lead_source_id;
  IF (crm.is_crm_service() AND crm.acquisition_contract_usable(p_contract) AND l.lead_id IS NOT NULL
    AND core.is_uuid_v7(p_id) AND core.is_uuid_v7(p_event) AND length(btrim(p_source_event_ref)) BETWEEN 1 AND 200
    AND ((l.family_id IS NULL AND auth.current_family_id() IS NULL) OR l.family_id=auth.current_family_id())
    AND (p_legacy_compass IS NULL OR p_legacy_compass IN ('CHILD_COMPASS','EDUCATION_COMPASS','FAMILY_COMPASS','HEALTH_COMPASS'))
    AND (p_partner IS NULL OR EXISTS(SELECT 1 FROM crm.partner_relationships r WHERE r.partner_relationship_id=p_partner
      AND r.lead_source_id=c.lead_source_id AND r.status='ACTIVE' AND r.valid_from<=clock_timestamp()
      AND (r.valid_until IS NULL OR r.valid_until>clock_timestamp())))) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('ATTRIBUTION','CRM_LEAD',p_lead,false,'ACQUISITION_CONVERSION_CONTEXT_OR_SCOPE_DENIED'); RETURN NULL;
  END IF;
  h:=encode(sha256(convert_to(jsonb_build_array(p_id,p_lead,p_contract,p_partner,p_legacy_compass)::text,'UTF8')),'hex');
  PERFORM pg_advisory_xact_lock(3636,hashtext(c.source_system||':CONVERSION_TOUCH:'||p_source_event_ref));
  IF (crm.is_crm_service() AND crm.acquisition_contract_usable(p_contract)
    AND ((l.family_id IS NULL AND auth.current_family_id() IS NULL) OR l.family_id=auth.current_family_id())
    AND (p_partner IS NULL OR EXISTS(SELECT 1 FROM crm.partner_relationships p
      WHERE p.partner_relationship_id=p_partner AND p.lead_source_id=c.lead_source_id
        AND p.status='ACTIVE' AND p.valid_from<=clock_timestamp()
        AND (p.valid_until IS NULL OR p.valid_until>clock_timestamp())))) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('ATTRIBUTION','CRM_LEAD',p_lead,false,'ACQUISITION_CONVERSION_CHANGED_WHILE_WAITING'); RETURN NULL;
  END IF;
  SELECT * INTO previous FROM crm.lead_attributions WHERE source_system=c.source_system
    AND attribution_kind='CONVERSION_TOUCH' AND source_event_ref=p_source_event_ref;
  IF FOUND THEN
    IF previous.source_payload_sha256=h THEN RETURN previous.lead_attribution_id; END IF;
    PERFORM audit.record_write_decision('ATTRIBUTION','CRM_LEAD',p_lead,false,'ACQUISITION_IDEMPOTENCY_CONFLICT'); RETURN NULL;
  END IF;
  IF l.lead_status NOT IN ('QUALIFIED','CONVERTED') OR EXISTS(SELECT 1 FROM crm.lead_attributions
    WHERE lead_id=p_lead AND attribution_kind='CONVERSION_TOUCH') THEN
    PERFORM audit.record_write_decision('ATTRIBUTION','CRM_LEAD',p_lead,false,'CONVERSION_STATE_OR_EXISTING_TOUCH_DENIED'); RETURN NULL;
  END IF;
  INSERT INTO crm.lead_attributions(lead_attribution_id,lead_id,attribution_kind,lead_source_id,partner_relationship_id,campaign_id,
    compass_kind,source_system,attribution_model_version,created_by_principal_id,acquisition_contract_id,
    entry_ref,entry_revision,entry_manifest_sha256,content_source_system,content_ref,content_revision,content_sha256,
    source_event_ref,source_payload_sha256,recorded_by_login)
  VALUES(p_id,p_lead,'CONVERSION_TOUCH',c.lead_source_id,p_partner,s.campaign_id,p_legacy_compass,c.source_system,c.contract_version,
    auth.current_principal_id(),c.contract_id,c.entry_ref,c.entry_revision,c.manifest_sha256,
    c.geo_source_system,c.geo_ref,c.geo_revision,c.geo_sha256,p_source_event_ref,h,session_user);
  PERFORM crm.record_lead_event(p_event,p_lead,'ATTRIBUTION_RECORDED',NULL,'CONVERSION_TOUCH','VERSIONED_CONVERSION_RECORDED');
  PERFORM audit.record_write_decision('ATTRIBUTION','CRM_LEAD',p_lead,true,'VERSIONED_CONVERSION_RECORDED'); RETURN p_id;
END
$fn$;

ALTER TABLE crm.lead_events DROP CONSTRAINT lead_events_event_kind_check;
ALTER TABLE crm.lead_events ADD CONSTRAINT lead_events_event_kind_check CHECK (event_kind IN (
  'CREATED','STATUS_CHANGED','IDENTITY_LINKED','IDENTITY_VERIFIED','IDENTITY_REVOKED','MERGED','MERGE_REVERSED',
  'ASSIGNED','CONSULTATION','DEAL_CREATED','ATTRIBUTION_RECORDED','REFERRAL_RECORDED','REFERRAL_CONFIRMED',
  'REFERRAL_REVOKED','DEDUP_CANDIDATE','DEDUP_REVIEWED','NEED_ASSERTED','NEED_SUPERSEDED','NEED_RETRACTED'));
ALTER TABLE crm.lead_events
  ADD COLUMN need_domain text CHECK (need_domain IN ('EDUCATION','IDENTITY','WEALTH','HEALTH')),
  ADD COLUMN need_assertion_kind text CHECK (need_assertion_kind IN ('USER_SELECTED','ADVISOR_CONFIRMED')),
  ADD COLUMN asserted_by_principal_id uuid REFERENCES auth.principals,
  ADD COLUMN need_subject_person_id uuid REFERENCES core.people,
  ADD COLUMN need_case_id uuid REFERENCES casework.cases,
  ADD COLUMN need_supersedes_event_id uuid REFERENCES crm.lead_events,
  ADD COLUMN acquisition_contract_id uuid REFERENCES crm.acquisition_contract_revisions,
  ADD COLUMN source_system text, ADD COLUMN source_event_ref text,
  ADD COLUMN source_payload_sha256 text, ADD COLUMN evidence_sha256 text, ADD COLUMN recorded_by_login name,
  ADD CONSTRAINT lead_need_complete CHECK (
    (event_kind NOT IN ('NEED_ASSERTED','NEED_SUPERSEDED','NEED_RETRACTED') AND need_domain IS NULL
      AND need_assertion_kind IS NULL AND asserted_by_principal_id IS NULL AND need_subject_person_id IS NULL
      AND need_case_id IS NULL AND need_supersedes_event_id IS NULL AND acquisition_contract_id IS NULL
      AND source_system IS NULL AND source_event_ref IS NULL AND source_payload_sha256 IS NULL
      AND evidence_sha256 IS NULL AND recorded_by_login IS NULL)
    OR (event_kind IN ('NEED_ASSERTED','NEED_SUPERSEDED','NEED_RETRACTED') AND need_domain IS NOT NULL
      AND need_assertion_kind IS NOT NULL AND asserted_by_principal_id IS NOT NULL AND need_subject_person_id IS NOT NULL
      AND acquisition_contract_id IS NOT NULL AND source_system IS NOT NULL AND source_event_ref IS NOT NULL
      AND source_payload_sha256 IS NOT NULL AND evidence_sha256 IS NOT NULL AND recorded_by_login IS NOT NULL
      AND from_status IS NULL AND to_status IS NULL AND length(btrim(source_event_ref)) BETWEEN 1 AND 200
      AND source_payload_sha256 ~ '^[0-9a-f]{64}$' AND evidence_sha256 ~ '^[0-9a-f]{64}$'
      AND ((need_assertion_kind='USER_SELECTED' AND need_case_id IS NULL)
        OR (need_assertion_kind='ADVISOR_CONFIRMED' AND need_case_id IS NOT NULL))
      AND ((event_kind='NEED_ASSERTED' AND need_supersedes_event_id IS NULL)
        OR (event_kind IN ('NEED_SUPERSEDED','NEED_RETRACTED') AND need_supersedes_event_id IS NOT NULL))));
CREATE UNIQUE INDEX lead_need_source_event_unique ON crm.lead_events(source_system,source_event_ref)
WHERE need_domain IS NOT NULL;
CREATE UNIQUE INDEX lead_need_successor_unique ON crm.lead_events(need_supersedes_event_id)
WHERE need_supersedes_event_id IS NOT NULL;
CREATE INDEX lead_need_family_projection_idx ON crm.lead_events(lead_id,need_domain,occurred_at) WHERE need_domain IS NOT NULL;

CREATE FUNCTION crm.can_assert_lead_need(p_lead uuid,p_contract uuid,p_kind text,p_domain text,p_case uuid,p_retract boolean)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,crm,auth,core,casework,consent AS $fn$
DECLARE l crm.leads%ROWTYPE; c crm.acquisition_contract_revisions%ROWTYPE; k casework.cases%ROWTYPE;
BEGIN
  SELECT * INTO l FROM crm.leads WHERE lead_id=p_lead;
  SELECT * INTO c FROM crm.acquisition_contract_revisions WHERE contract_id=p_contract;
  IF (l.family_id IS NOT NULL AND l.family_id=auth.current_family_id()
    AND (p_retract OR l.lead_status<>'MERGED') AND crm.acquisition_contract_usable(p_contract,p_retract)) IS NOT TRUE THEN RETURN false; END IF;
  IF p_kind='USER_SELECTED' AND auth.current_channel()='FAMILY' AND p_case IS NULL
    AND EXISTS(SELECT 1 FROM auth.principals WHERE principal_id=auth.current_principal_id()
      AND principal_kind='FAMILY' AND status='ACTIVE' AND person_id=auth.current_actor_person_id()) THEN
    RETURN EXISTS(SELECT 1 FROM core.family_memberships m WHERE m.family_id=l.family_id
      AND m.person_id=auth.current_actor_person_id() AND m.valid_from<=clock_timestamp()
      AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp()));
  END IF;
  IF p_kind<>'ADVISOR_CONFIRMED' OR auth.current_channel()<>'ADVISOR' OR p_case IS NULL THEN RETURN false; END IF;
  SELECT * INTO k FROM casework.cases WHERE case_id=p_case AND family_id=l.family_id;
  IF (FOUND AND EXISTS(SELECT 1 FROM auth.principals WHERE principal_id=auth.current_principal_id()
      AND principal_kind='ADVISOR' AND status='ACTIVE' AND person_id=auth.current_actor_person_id())
    AND ((p_domain='EDUCATION' AND c.advisor_resource_kind='EDUCATION_APPLICATION' AND k.resource_kind='EDUCATION_APPLICATION')
      OR (p_domain='IDENTITY' AND c.advisor_resource_kind='IDENTITY_CASE' AND k.resource_kind='IDENTITY_CASE'))) IS NOT TRUE THEN RETURN false; END IF;
  IF p_retract THEN RETURN true; END IF; -- only the same author can retract; enforced by the chain guard below.
  RETURN coalesce(k.status IN ('OPEN','PAUSED') AND EXISTS(SELECT 1 FROM casework.advisor_assignments a
    WHERE a.case_id=k.case_id AND a.advisor_person_id=auth.current_actor_person_id()
      AND a.valid_from<=clock_timestamp() AND a.valid_until>clock_timestamp() AND a.revoked_at IS NULL
      AND a.lifecycle_status='ACTIVE')
    AND EXISTS(SELECT 1 FROM consent.grants g WHERE g.family_id=l.family_id AND g.subject_person_id=k.subject_person_id
      AND g.grantee_person_id=auth.current_actor_person_id() AND g.status='ACTIVE' AND g.withdrawn_at IS NULL
      AND g.granted_at<=clock_timestamp() AND g.expires_at>clock_timestamp()
      AND ((p_domain='EDUCATION' AND g.purpose='EDUCATION_CASE' AND g.data_class='EDUCATION')
        OR (p_domain='IDENTITY' AND g.purpose='IDENTITY_CASE' AND g.data_class='IDENTITY_SENSITIVE'))),false);
END
$fn$;

CREATE FUNCTION crm.validate_lead_need_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,crm,auth,casework AS $fn$
DECLARE old crm.lead_events%ROWTYPE; c crm.acquisition_contract_revisions%ROWTYPE; v_subject uuid;
BEGIN
  IF NEW.need_domain IS NULL AND NEW.event_kind NOT IN ('NEED_ASSERTED','NEED_SUPERSEDED','NEED_RETRACTED') THEN RETURN NEW; END IF;
  SELECT * INTO c FROM crm.acquisition_contract_revisions WHERE contract_id=NEW.acquisition_contract_id;
  v_subject:=CASE WHEN NEW.need_case_id IS NULL THEN auth.current_actor_person_id()
    ELSE (SELECT subject_person_id FROM casework.cases WHERE case_id=NEW.need_case_id) END;
  IF (crm.can_assert_lead_need(NEW.lead_id,c.contract_id,NEW.need_assertion_kind,NEW.need_domain,NEW.need_case_id,
      NEW.event_kind='NEED_RETRACTED') AND NEW.actor_principal_id=auth.current_principal_id()
    AND NEW.asserted_by_principal_id=auth.current_principal_id() AND NEW.recorded_by_login=session_user
    AND NEW.need_subject_person_id=v_subject AND NEW.source_system=c.source_system) IS NOT TRUE THEN
    RAISE EXCEPTION 'LEAD_NEED_CONTEXT_OR_ASSERTOR_DENIED';
  END IF;
  IF NEW.need_supersedes_event_id IS NOT NULL THEN
    SELECT * INTO old FROM crm.lead_events WHERE lead_event_id=NEW.need_supersedes_event_id;
    IF (FOUND AND old.need_domain=NEW.need_domain AND old.lead_id=NEW.lead_id
      AND old.need_assertion_kind=NEW.need_assertion_kind AND old.asserted_by_principal_id=NEW.asserted_by_principal_id
      AND old.need_subject_person_id=NEW.need_subject_person_id AND old.need_case_id IS NOT DISTINCT FROM NEW.need_case_id
      AND old.event_kind IN ('NEED_ASSERTED','NEED_SUPERSEDED')) IS NOT TRUE THEN RAISE EXCEPTION 'LEAD_NEED_CHAIN_DENIED'; END IF;
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER lead_need_event_validate BEFORE INSERT ON crm.lead_events
FOR EACH ROW EXECUTE FUNCTION crm.validate_lead_need_event();

CREATE FUNCTION crm.assert_lead_need(
  p_event uuid,p_lead uuid,p_contract uuid,p_domain text,p_kind text,p_operation text,
  p_supersedes uuid,p_case uuid,p_source_event_ref text,p_evidence_sha256 text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,auth,core,casework,audit AS $fn$
DECLARE c crm.acquisition_contract_revisions%ROWTYPE; previous crm.lead_events%ROWTYPE;
  old crm.lead_events%ROWTYPE; v_kind text; v_subject uuid; h text;
BEGIN
  SELECT * INTO c FROM crm.acquisition_contract_revisions WHERE contract_id=p_contract FOR SHARE;
  v_kind:=CASE p_operation WHEN 'ASSERT' THEN 'NEED_ASSERTED' WHEN 'SUPERSEDE' THEN 'NEED_SUPERSEDED' WHEN 'RETRACT' THEN 'NEED_RETRACTED' END;
  IF (v_kind IS NOT NULL AND p_domain IN ('EDUCATION','IDENTITY','WEALTH','HEALTH')
    AND p_kind IN ('USER_SELECTED','ADVISOR_CONFIRMED') AND core.is_uuid_v7(p_event)
    AND length(btrim(p_source_event_ref)) BETWEEN 1 AND 200 AND p_evidence_sha256 ~ '^[0-9a-f]{64}$'
    AND ((p_operation='ASSERT' AND p_supersedes IS NULL) OR (p_operation IN ('SUPERSEDE','RETRACT') AND p_supersedes IS NOT NULL))
    AND crm.can_assert_lead_need(p_lead,p_contract,p_kind,p_domain,p_case,p_operation='RETRACT')) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('ASSERT','CRM_LEAD_NEED',p_event,false,'NEED_CONTEXT_CONTRACT_OR_INPUT_DENIED'); RETURN NULL;
  END IF;
  v_subject:=CASE WHEN p_case IS NULL THEN auth.current_actor_person_id() ELSE (SELECT subject_person_id FROM casework.cases WHERE case_id=p_case) END;
  h:=encode(sha256(convert_to(jsonb_build_array(p_lead,p_contract,p_domain,p_kind,p_operation,p_supersedes,p_case,
    auth.current_principal_id(),v_subject,p_evidence_sha256)::text,'UTF8')),'hex');
  PERFORM pg_advisory_xact_lock(3636,hashtext(c.source_system||':NEED:'||p_source_event_ref));
  SELECT * INTO previous FROM crm.lead_events WHERE source_system=c.source_system AND source_event_ref=p_source_event_ref AND need_domain IS NOT NULL;
  IF FOUND THEN
    IF previous.source_payload_sha256=h THEN RETURN previous.lead_event_id; END IF;
    PERFORM audit.record_write_decision('ASSERT','CRM_LEAD_NEED',p_event,false,'NEED_IDEMPOTENCY_CONFLICT'); RETURN NULL;
  END IF;
  PERFORM 1 FROM crm.leads WHERE lead_id=p_lead FOR UPDATE;
  IF p_supersedes IS NOT NULL THEN
    SELECT * INTO old FROM crm.lead_events WHERE lead_event_id=p_supersedes;
    IF (FOUND AND old.lead_id=p_lead AND old.need_domain=p_domain AND old.need_assertion_kind=p_kind
      AND old.asserted_by_principal_id=auth.current_principal_id() AND old.need_subject_person_id=v_subject
      AND old.need_case_id IS NOT DISTINCT FROM p_case AND old.event_kind IN ('NEED_ASSERTED','NEED_SUPERSEDED')
      AND NOT EXISTS(SELECT 1 FROM crm.lead_events WHERE need_supersedes_event_id=p_supersedes)) IS NOT TRUE THEN
      PERFORM audit.record_write_decision('ASSERT','CRM_LEAD_NEED',p_event,false,'NEED_CHAIN_OR_TERMINAL_DENIED'); RETURN NULL;
    END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM crm.lead_events WHERE lead_event_id=p_event) THEN
    PERFORM audit.record_write_decision('ASSERT','CRM_LEAD_NEED',p_event,false,'NEED_EVENT_ID_ALREADY_EXISTS'); RETURN NULL;
  END IF;
  INSERT INTO crm.lead_events(lead_event_id,lead_id,event_kind,reason_code,actor_principal_id,need_domain,
    need_assertion_kind,asserted_by_principal_id,need_subject_person_id,need_case_id,need_supersedes_event_id,
    acquisition_contract_id,source_system,source_event_ref,source_payload_sha256,evidence_sha256,recorded_by_login)
  VALUES(p_event,p_lead,v_kind,v_kind,auth.current_principal_id(),p_domain,p_kind,auth.current_principal_id(),v_subject,
    p_case,p_supersedes,p_contract,c.source_system,p_source_event_ref,h,p_evidence_sha256,session_user);
  PERFORM audit.record_write_decision('ASSERT','CRM_LEAD_NEED',p_event,true,v_kind); RETURN p_event;
END
$fn$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA crm FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION crm.acquisition_contract_usable(uuid,boolean),
  crm.can_assert_lead_need(uuid,uuid,text,text,uuid,boolean),crm.protect_acquisition_contract(),
  crm.validate_acquisition_attribution(),crm.validate_lead_need_event()
  FROM phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_context_binder;
GRANT EXECUTE ON FUNCTION crm.register_acquisition_contract(uuid,uuid,text,jsonb,text,text,text,text,name,timestamptz,timestamptz,text),
  crm.revoke_acquisition_contract(uuid,text,text) TO phoenix_canonical_migrator;
GRANT EXECUTE ON FUNCTION crm.create_lead_v2(uuid,uuid,uuid,uuid,uuid,text,uuid,uuid,text),
  crm.record_conversion_attribution_v2(uuid,uuid,uuid,uuid,text,uuid,text),
  crm.assert_lead_need(uuid,uuid,uuid,text,text,text,uuid,uuid,text,text) TO phoenix_canonical_app;

COMMIT;
