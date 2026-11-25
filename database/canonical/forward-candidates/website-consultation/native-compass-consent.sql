BEGIN;

CREATE ROLE phoenix_education_crm_reference_publisher NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE phoenix_identity_crm_reference_publisher NOLOGIN NOINHERIT NOBYPASSRLS;

-- Operator-managed approved text revisions. No notice is activated by this candidate.
CREATE TABLE consent.compass_reference_notices (
  domain text NOT NULL CHECK (domain IN ('EDUCATION','IDENTITY','HEALTH','WEALTH')),
  revision text NOT NULL CHECK (length(revision) BETWEEN 1 AND 100),
  text_sha256 text NOT NULL CHECK (text_sha256 ~ '^[0-9a-f]{64}$'),
  approval_ref text NOT NULL CHECK (length(btrim(approval_ref)) BETWEEN 1 AND 500),
  max_lifetime interval NOT NULL CHECK (max_lifetime > interval '0'),
  accepts_new boolean NOT NULL DEFAULT false,
  PRIMARY KEY (domain,revision)
);

-- Canonical Consent evidence for a single assessment and the CRM reference audience.
-- Case/assessment processing grants in consent.grants carry no sharing authority here.
CREATE TABLE consent.compass_reference_grants (
  evidence_id uuid PRIMARY KEY,
  domain text NOT NULL,
  purpose text NOT NULL CHECK (purpose=domain || '_COMPASS_CRM_REFERENCE'),
  data_class text NOT NULL CHECK (data_class=CASE domain
    WHEN 'EDUCATION' THEN 'EDUCATION' WHEN 'IDENTITY' THEN 'IDENTITY_SENSITIVE'
    WHEN 'HEALTH' THEN 'HEALTH_SENSITIVE' WHEN 'WEALTH' THEN 'WEALTH_SENSITIVE' END),
  audience text NOT NULL DEFAULT 'CANONICAL_CRM_REFERENCE' CHECK (audience='CANONICAL_CRM_REFERENCE'),
  assessment_id uuid NOT NULL,
  family_id uuid NOT NULL REFERENCES core.families,
  subject_id uuid NOT NULL REFERENCES core.people,
  signer_principal_id uuid NOT NULL REFERENCES auth.principals,
  signer_person_id uuid NOT NULL REFERENCES core.people,
  notice_revision text NOT NULL,
  granted_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK(expires_at>granted_at),
  withdrawn_at timestamptz CHECK (withdrawn_at>=granted_at),
  FOREIGN KEY(domain,notice_revision) REFERENCES consent.compass_reference_notices,
  -- One overlapping grant per signer and assessment. Expired and withdrawn
  -- receipts remain as evidence and do not prevent a new affirmative grant.
  EXCLUDE USING gist (domain WITH =, assessment_id WITH =, family_id WITH =, subject_id WITH =,
    signer_principal_id WITH =, tstzrange(granted_at,least(expires_at,withdrawn_at),'[)') WITH &&)
);
CREATE INDEX compass_reference_scope_idx ON consent.compass_reference_grants
  (domain,assessment_id,family_id,subject_id,signer_principal_id) WHERE withdrawn_at IS NULL;
ALTER TABLE consent.compass_reference_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent.compass_reference_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON consent.compass_reference_notices,consent.compass_reference_grants FROM PUBLIC;

CREATE FUNCTION consent.protect_compass_reference_notice()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $protect$
BEGIN
  IF (to_jsonb(NEW)-'accepts_new') IS DISTINCT FROM (to_jsonb(OLD)-'accepts_new') THEN
    RAISE EXCEPTION 'COMPASS_REFERENCE_NOTICE_REVISION_IMMUTABLE';
  END IF;
  RETURN NEW;
END
$protect$;
REVOKE ALL ON FUNCTION consent.protect_compass_reference_notice() FROM PUBLIC;
CREATE TRIGGER compass_notice_revision_before_update BEFORE UPDATE ON consent.compass_reference_notices
  FOR EACH ROW EXECUTE FUNCTION consent.protect_compass_reference_notice();

CREATE FUNCTION consent.compass_reference_actor_is_live()
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN coalesce(auth.write_context_is_live() AND auth.current_channel()='FAMILY'
  AND EXISTS (SELECT 1 FROM auth.principals p WHERE p.principal_id=auth.current_principal_id()
    AND p.person_id=auth.current_actor_person_id() AND p.principal_kind='FAMILY' AND p.status='ACTIVE')
  AND EXISTS (SELECT 1 FROM core.family_memberships m WHERE m.family_id=auth.current_family_id()
    AND m.person_id=auth.current_actor_person_id() AND m.valid_from<=clock_timestamp()
    AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())),false);

CREATE FUNCTION consent.compass_reference_is_active(p_domain text,p_assessment uuid,p_subject uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
RETURN consent.compass_reference_actor_is_live() AND EXISTS (
  SELECT 1 FROM consent.compass_reference_grants g WHERE g.domain=p_domain AND g.assessment_id=p_assessment
    AND g.family_id=auth.current_family_id() AND g.subject_id=p_subject
    AND g.signer_principal_id=auth.current_principal_id() AND g.signer_person_id=auth.current_actor_person_id()
    AND g.withdrawn_at IS NULL AND g.granted_at<=clock_timestamp() AND g.expires_at>clock_timestamp()
);

-- Independently replaced by the optional native authorities. Each unsupported domain stays closed.
CREATE FUNCTION crm.education_native_subject(uuid) RETURNS uuid
LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp RETURN NULL::uuid;
CREATE FUNCTION crm.identity_native_subject(uuid) RETURNS uuid
LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp RETURN NULL::uuid;

CREATE FUNCTION crm.native_compass_subject(p_domain text,p_assessment uuid)
RETURNS uuid LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp
RETURN CASE p_domain WHEN 'EDUCATION' THEN crm.education_native_subject(p_assessment)
  WHEN 'IDENTITY' THEN crm.identity_native_subject(p_assessment) ELSE NULL END;

CREATE OR REPLACE FUNCTION crm.native_compass_assessment_is_shareable(p_domain text,p_assessment uuid,p_subject uuid)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp
RETURN coalesce(crm.native_compass_subject(p_domain,p_assessment)=p_subject
  AND consent.compass_reference_is_active(p_domain,p_assessment,p_subject),false);

CREATE FUNCTION crm.native_compass_publisher_login_allowed(p_login name,p_domain text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp
RETURN EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname=p_login AND r.rolcanlogin
    AND NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
    AND NOT pg_has_role(r.oid,'phoenix_canonical_app','MEMBER')
    AND NOT pg_has_role(r.oid,'phoenix_canonical_migrator','MEMBER')
    AND NOT pg_has_role(r.oid,'phoenix_canonical_backup_runtime','MEMBER')
    AND CASE p_domain
      WHEN 'EDUCATION' THEN pg_has_role(r.oid,'phoenix_education_crm_reference_publisher','USAGE')
        AND NOT pg_has_role(r.oid,'phoenix_identity_crm_reference_publisher','MEMBER')
      WHEN 'IDENTITY' THEN pg_has_role(r.oid,'phoenix_identity_crm_reference_publisher','USAGE')
        AND NOT pg_has_role(r.oid,'phoenix_education_crm_reference_publisher','MEMBER')
      ELSE false END);

CREATE OR REPLACE FUNCTION crm.native_compass_assessment_writer_allowed(p_domain text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp
RETURN crm.native_compass_publisher_login_allowed(session_user,p_domain);

CREATE FUNCTION consent.capture_compass_reference(p_evidence uuid,p_domain text,p_assessment uuid,
  p_revision text,p_expires timestamptz)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $capture$
DECLARE
  subject_id uuid;
  notice consent.compass_reference_notices%ROWTYPE;
  captured consent.compass_reference_grants%ROWTYPE;
  captured_at timestamptz := clock_timestamp();
BEGIN
  IF NOT consent.compass_reference_actor_is_live() OR
     crm.native_compass_assessment_writer_allowed(p_domain) IS NOT TRUE OR p_evidence IS NULL THEN
    RETURN NULL;
  END IF;
  subject_id := crm.native_compass_subject(p_domain,p_assessment);
  IF subject_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO notice FROM consent.compass_reference_notices n
    WHERE n.domain=p_domain AND n.revision=p_revision AND n.accepts_new FOR SHARE;
  IF NOT FOUND OR isfinite(p_expires) IS NOT TRUE OR p_expires<=captured_at OR p_expires-captured_at>notice.max_lifetime THEN
    RETURN NULL;
  END IF;
  INSERT INTO consent.compass_reference_grants(evidence_id,domain,purpose,data_class,assessment_id,
    family_id,subject_id,signer_principal_id,signer_person_id,notice_revision,granted_at,expires_at)
  VALUES(p_evidence,p_domain,p_domain||'_COMPASS_CRM_REFERENCE',
    CASE p_domain WHEN 'EDUCATION' THEN 'EDUCATION' WHEN 'IDENTITY' THEN 'IDENTITY_SENSITIVE' END,
    p_assessment,auth.current_family_id(),subject_id,auth.current_principal_id(),
    auth.current_actor_person_id(),p_revision,captured_at,p_expires)
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    PERFORM audit.record_write_decision('RECORD','COMPASS_REFERENCE_CONSENT',p_evidence,true,'REFERENCE_CONSENT_RECORDED');
    RETURN p_evidence;
  END IF;
  SELECT * INTO captured FROM consent.compass_reference_grants WHERE evidence_id=p_evidence;
  IF captured.domain=p_domain AND captured.assessment_id=p_assessment AND captured.subject_id=subject_id
    AND captured.family_id=auth.current_family_id() AND captured.signer_principal_id=auth.current_principal_id()
    AND captured.signer_person_id=auth.current_actor_person_id() AND captured.notice_revision=p_revision
    AND captured.expires_at=p_expires AND captured.withdrawn_at IS NULL THEN RETURN p_evidence; END IF;
  RETURN NULL;
END
$capture$;

-- A signer may withdraw after losing source access. No source lookup is needed to deny further sharing.
CREATE FUNCTION consent.withdraw_compass_reference(p_domain text,p_evidence uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $withdraw$
BEGIN
  IF NOT consent.compass_reference_actor_is_live() OR
     crm.native_compass_assessment_writer_allowed(p_domain) IS NOT TRUE THEN RETURN false; END IF;
  UPDATE consent.compass_reference_grants SET withdrawn_at=clock_timestamp()
    WHERE evidence_id=p_evidence AND domain=p_domain AND family_id=auth.current_family_id()
      AND signer_principal_id=auth.current_principal_id() AND signer_person_id=auth.current_actor_person_id()
      AND withdrawn_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN audit.record_write_decision('WITHDRAW','COMPASS_REFERENCE_CONSENT',p_evidence,true,'REFERENCE_CONSENT_WITHDRAWN');
END
$withdraw$;

REVOKE ALL ON FUNCTION consent.compass_reference_actor_is_live(),
  consent.compass_reference_is_active(text,uuid,uuid), crm.education_native_subject(uuid),
  crm.identity_native_subject(uuid), crm.native_compass_subject(text,uuid),
  crm.native_compass_publisher_login_allowed(name,text),
  consent.capture_compass_reference(uuid,text,uuid,text,timestamptz),
  consent.withdraw_compass_reference(text,uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA consent,crm,auth TO phoenix_education_crm_reference_publisher,phoenix_identity_crm_reference_publisher;
GRANT EXECUTE ON FUNCTION consent.capture_compass_reference(uuid,text,uuid,text,timestamptz),
  consent.withdraw_compass_reference(text,uuid), auth.clear_context(),auth.redeem_context_ticket(uuid,uuid),
  auth.current_request_nonce(),auth.current_principal_id()
  TO phoenix_education_crm_reference_publisher,phoenix_identity_crm_reference_publisher;

-- 0036's generic registrar requires Canonical app membership. Keep dedicated
-- publishers out of that group with an operator-only registration for two exact sources.
CREATE FUNCTION crm.register_native_compass_contract(p_id uuid,p_domain text,p_revision text,p_manifest_sha256 text,
  p_approval_ref text,p_approval_sha256 text,p_retention_ref text,p_retention_sha256 text,p_login name,
  p_from timestamptz,p_until timestamptz)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp
AS $register$
DECLARE
  src crm.lead_sources%ROWTYPE;
  fingerprint text;
  previous crm.acquisition_contract_revisions%ROWTYPE;
BEGIN
  IF (core.is_uuid_v7(p_id) AND crm.native_compass_publisher_login_allowed(p_login,p_domain)
      AND isfinite(p_from) AND isfinite(p_until) AND p_until>p_from) IS NOT TRUE THEN
    RETURN NULL;
  END IF;
  SELECT * INTO src FROM crm.lead_sources WHERE source_system='phoenix-nova-compass-'||lower(p_domain)
    AND status='ACTIVE';
  IF NOT FOUND THEN RETURN NULL; END IF;
  fingerprint := encode(sha256(convert_to(jsonb_build_array(src.lead_source_id,p_domain,p_revision,
    p_manifest_sha256,p_approval_ref,p_approval_sha256,p_retention_ref,p_retention_sha256,p_login,
    extract(epoch FROM p_from),extract(epoch FROM p_until))::text,'UTF8')),'hex');
  INSERT INTO crm.acquisition_contract_revisions(contract_id,lead_source_id,source_system,contract_version,
    entry_ref,entry_revision,manifest_ref,manifest_sha256,approval_ref,approval_sha256,
    retention_policy_ref,retention_policy_sha256,allowed_app_login,valid_from,valid_until,
    registered_payload_sha256,registered_by_login)
  VALUES(p_id,src.lead_source_id,src.source_system,p_revision,'/'||lower(p_domain),p_revision,
    'native-compass-publisher/'||p_revision,p_manifest_sha256,p_approval_ref,p_approval_sha256,
    p_retention_ref,p_retention_sha256,p_login,p_from,p_until,fingerprint,session_user)
  ON CONFLICT (contract_id) DO NOTHING;
  IF FOUND THEN RETURN p_id; END IF;
  SELECT * INTO previous FROM crm.acquisition_contract_revisions WHERE contract_id=p_id;
  RETURN CASE WHEN previous.registered_payload_sha256=fingerprint AND previous.revoked_at IS NULL THEN p_id END;
END
$register$;
REVOKE ALL ON FUNCTION crm.register_native_compass_contract(uuid,text,text,text,text,text,text,text,name,timestamptz,timestamptz) FROM PUBLIC;


COMMIT;
