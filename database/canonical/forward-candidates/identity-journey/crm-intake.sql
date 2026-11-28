-- Isolated consultation-intake candidate. Existing CRM entities remain authoritative.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE consent.identity_journey_crm_intents (
  consent_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(consent_id)),
  notice_id uuid NOT NULL REFERENCES identity.journey_station_notices,
  recipient_id uuid NOT NULL REFERENCES auth.principals,
  lead_id uuid NOT NULL REFERENCES crm.leads,
  verified_link_id uuid NOT NULL REFERENCES crm.lead_identity_links,
  source_contract_id uuid NOT NULL REFERENCES crm.acquisition_contract_revisions,
  accepted_topic text NOT NULL CHECK (accepted_topic IN ('RENEWAL','DOCUMENT','STATUS_REVIEW')),
  consent_revision text NOT NULL CHECK (consent_revision = 'IDENTITY_CONSULTATION_V1'),
  authorized_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (isfinite(expires_at) AND expires_at > authorized_at),
  withdrawn_at timestamptz CHECK (withdrawn_at >= authorized_at),
  UNIQUE (notice_id, recipient_id, accepted_topic, consent_revision)
);
CREATE TABLE identity.journey_crm_handoffs (
  consent_id uuid PRIMARY KEY REFERENCES consent.identity_journey_crm_intents,
  lead_event_id uuid NOT NULL UNIQUE REFERENCES crm.lead_events,
  topic text NOT NULL CHECK (topic IN ('RENEWAL','DOCUMENT','STATUS_REVIEW')),
  horizon text NOT NULL CHECK (horizon IN ('WITHIN_90_DAYS','WITHIN_180_DAYS','LATER','TO_REVIEW'))
);
ALTER TABLE consent.identity_journey_crm_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent.identity_journey_crm_intents FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_crm_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_crm_handoffs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON consent.identity_journey_crm_intents, identity.journey_crm_handoffs
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;

CREATE FUNCTION consent.protect_journey_crm_intent() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.withdrawn_at IS NULL AND NEW.withdrawn_at IS NOT NULL
    AND ROW(OLD.consent_id, OLD.notice_id, OLD.recipient_id, OLD.lead_id, OLD.verified_link_id,
      OLD.source_contract_id, OLD.accepted_topic, OLD.consent_revision, OLD.authorized_at, OLD.expires_at)
    IS NOT DISTINCT FROM ROW(NEW.consent_id, NEW.notice_id, NEW.recipient_id, NEW.lead_id, NEW.verified_link_id,
      NEW.source_contract_id, NEW.accepted_topic, NEW.consent_revision, NEW.authorized_at, NEW.expires_at)
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'IDENTITY_JOURNEY_CRM_INTENT_IMMUTABLE';
END
$fn$;
CREATE FUNCTION identity.protect_journey_crm_handoff() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  RAISE EXCEPTION 'IDENTITY_JOURNEY_CRM_HANDOFF_IMMUTABLE';
END
$fn$;
CREATE TRIGGER journey_crm_intent_immutable BEFORE UPDATE OR DELETE ON consent.identity_journey_crm_intents
FOR EACH ROW EXECUTE FUNCTION consent.protect_journey_crm_intent();
CREATE TRIGGER journey_crm_handoff_immutable BEFORE UPDATE OR DELETE ON identity.journey_crm_handoffs
FOR EACH ROW EXECUTE FUNCTION identity.protect_journey_crm_handoff();

-- The authenticated FAMILY session supplies the owner. Hold the exact live
-- station grant before locking a consultation intent. No staff or delegates.
CREATE FUNCTION identity.lock_journey_crm_notice(p_notice uuid)
RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  owner uuid := auth.current_principal_id();
  family uuid := auth.current_family_id();
  source record;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  SELECT c.identity_case_id, r.date_revision_id INTO source
    FROM identity.journey_station_notices n JOIN identity.journey_station_reminders r USING (reminder_id)
    JOIN identity.cases c USING (identity_case_id)
    WHERE n.reminder_id = p_notice AND r.state = 'DELIVERED' AND r.recipient_principal_id = owner
      AND c.family_id = family AND c.subject_person_id = auth.current_actor_person_id();
  IF NOT FOUND OR identity.lock_journey_station_authorization(family, source.identity_case_id, owner) IS NULL
    OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  RETURN source.date_revision_id;
END
$fn$;

CREATE FUNCTION identity.lock_journey_crm_binding(p_lead uuid, p_link uuid, p_contract uuid)
RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  -- Lock the existing lead before its client link, as Canonical does.
  -- This also serializes concurrent intent inserts for the same lead.
  PERFORM 1 FROM crm.leads l WHERE l.lead_id = p_lead
    AND l.family_id = auth.current_family_id() AND l.lead_status <> 'MERGED' FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- The intake contract remains bound to the exact app LOGIN.
  PERFORM 1 FROM crm.leads l JOIN crm.lead_identity_links link USING (lead_id)
    JOIN crm.clients client ON client.client_id = link.client_id AND client.family_id = l.family_id
    JOIN crm.acquisition_contract_revisions source ON source.contract_id = p_contract
    JOIN crm.lead_sources intake ON intake.lead_source_id = source.lead_source_id
    WHERE l.lead_id = p_lead AND l.family_id = auth.current_family_id() AND l.lead_status <> 'MERGED'
      AND link.lead_identity_link_id = p_link AND link.target_kind = 'CLIENT'
      AND link.status = 'VERIFIED' AND link.revoked_at IS NULL
      AND client.lifecycle_status IN ('ACTIVE','PAUSED') AND intake.source_channel = 'WEBSITE'
      AND source.entry_ref = 'family-os/identity-consultation'
      AND source.entry_revision = 'IDENTITY_CONSULTATION_V1'
      AND crm.acquisition_contract_usable(p_contract, false) IS TRUE
    FOR SHARE OF link, client, source, intake;
  RETURN FOUND;
END
$fn$;

CREATE FUNCTION identity.authorize_journey_crm_consultation(
  p_consent uuid, p_notice uuid, p_lead uuid, p_link uuid, p_contract uuid,
  p_topic text, p_version text, p_expires timestamptz, p_confirmed boolean
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  owner uuid := auth.current_principal_id();
  accepted_at timestamptz;
  recorded uuid;
BEGIN
  IF p_confirmed IS NOT TRUE OR core.is_uuid_v7(p_consent) IS NOT TRUE
    OR p_topic IS NULL OR p_topic NOT IN ('RENEWAL','DOCUMENT','STATUS_REVIEW')
    OR p_version IS DISTINCT FROM 'IDENTITY_CONSULTATION_V1'
    OR p_expires IS NULL OR NOT isfinite(p_expires)
    OR identity.lock_journey_crm_notice(p_notice) IS NULL THEN RETURN NULL; END IF;
  -- Validate the verified link and acquisition contract before recording an
  -- intent. Neither the contract nor the station grant is consultation consent.
  IF identity.lock_journey_crm_binding(p_lead, p_link, p_contract) IS NOT TRUE THEN RETURN NULL; END IF;
  accepted_at := clock_timestamp();
  IF p_expires <= accepted_at OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  INSERT INTO consent.identity_journey_crm_intents(consent_id, notice_id, recipient_id, lead_id, verified_link_id,
    source_contract_id, accepted_topic, consent_revision, authorized_at, expires_at)
  VALUES(p_consent, p_notice, owner, p_lead, p_link, p_contract, p_topic, p_version, accepted_at, p_expires)
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    PERFORM audit.record_write_decision('CREATE','IDENTITY_CONSULTATION_CONSENT',p_consent,true,'IDENTITY_CONSULTATION_OPT_IN');
    RETURN p_consent;
  END IF;
  SELECT i.consent_id INTO recorded FROM consent.identity_journey_crm_intents i
    WHERE i.notice_id = p_notice AND i.recipient_id = owner AND i.accepted_topic = p_topic
      AND i.consent_revision = p_version AND i.lead_id = p_lead AND i.verified_link_id = p_link
      AND i.source_contract_id = p_contract AND i.withdrawn_at IS NULL AND i.expires_at > clock_timestamp()
    FOR SHARE;
  IF auth.write_context_is_live() IS TRUE THEN RETURN recorded; END IF;
  RETURN NULL;
END
$fn$;

-- Convert a current case-approval date to a band within identity. A date
-- revision, private evidence reference, or exact date never enters CRM.
CREATE FUNCTION identity.journey_crm_horizon(p_revision uuid, p_topic text)
RETURNS text
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  due_on date;
  days integer;
BEGIN
  PERFORM 1 FROM identity.journey_date_revisions WHERE date_revision_id = p_revision FOR UPDATE;
  IF NOT FOUND THEN RETURN 'TO_REVIEW'; END IF;
  SELECT r.target_on INTO due_on FROM identity.journey_date_revisions r
    JOIN identity.journey_episodes e ON e.episode_id = r.episode_id AND e.identity_case_id = r.identity_case_id
    JOIN docs.documents d ON d.document_id = r.document_id
    JOIN identity.cases c ON c.identity_case_id = r.identity_case_id
    WHERE r.date_revision_id = p_revision AND isfinite(r.target_on) AND r.verification = 'VERIFIED' AND r.date_basis = 'CASE_APPROVAL'
      AND d.family_id = c.family_id AND d.subject_person_id = c.subject_person_id
      AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
      AND ((p_topic = 'RENEWAL' AND r.date_kind = 'STAY_EXPIRY' AND e.ended_before IS NULL)
        OR (p_topic = 'DOCUMENT' AND r.date_kind IN ('PASSPORT_EXPIRY','TRAVEL_DOCUMENT_EXPIRY')))
      AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions n WHERE n.supersedes_id = p_revision)
    FOR SHARE OF d, e SKIP LOCKED;
  days := due_on - (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
  RETURN CASE WHEN days IS NULL OR days < 0 THEN 'TO_REVIEW'
    WHEN days <= 90 THEN 'WITHIN_90_DAYS' WHEN days <= 180 THEN 'WITHIN_180_DAYS' ELSE 'LATER' END;
END
$fn$;

CREATE FUNCTION identity.record_journey_crm_need(p_consent uuid, p_event uuid, p_expected_horizon text)
RETURNS text
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  intent consent.identity_journey_crm_intents%ROWTYPE;
  source_revision uuid;
  horizon text;
  recorded uuid;
BEGIN
  SELECT * INTO intent FROM consent.identity_journey_crm_intents i
    WHERE i.consent_id = p_consent AND i.recipient_id = auth.current_principal_id();
  IF NOT FOUND THEN RETURN 'DENIED'; END IF;
  source_revision := identity.lock_journey_crm_notice(intent.notice_id);
  IF source_revision IS NULL OR identity.lock_journey_crm_binding(intent.lead_id, intent.verified_link_id, intent.source_contract_id) IS NOT TRUE
    THEN RETURN 'DENIED'; END IF;

  SELECT * INTO intent FROM consent.identity_journey_crm_intents i
    WHERE i.consent_id = p_consent AND i.recipient_id = auth.current_principal_id()
      AND i.withdrawn_at IS NULL AND i.expires_at > clock_timestamp() FOR UPDATE;
  IF NOT FOUND OR auth.write_context_is_live() IS NOT TRUE OR intent.expires_at <= clock_timestamp()
  THEN RETURN 'DENIED'; END IF;
  IF EXISTS (SELECT 1 FROM identity.journey_crm_handoffs h WHERE h.consent_id = p_consent)
    THEN RETURN 'ALREADY_RECEIVED'; END IF;

  horizon := identity.journey_crm_horizon(source_revision, intent.accepted_topic);
  IF horizon IS DISTINCT FROM p_expected_horizon OR intent.expires_at <= clock_timestamp()
    OR auth.write_context_is_live() IS NOT TRUE THEN RETURN 'DENIED'; END IF;

  -- Roll back the need event if the transaction cannot also persist the
  -- matching receipt under the same continuing authority.
  BEGIN
    recorded := crm.assert_lead_need(p_event, intent.lead_id, intent.source_contract_id,
      'IDENTITY','USER_SELECTED','ASSERT',NULL,NULL,p_consent::text,
      encode(sha256(convert_to(jsonb_build_array('IDENTITY', intent.accepted_topic, horizon,
        intent.consent_revision)::text,'UTF8')),'hex'));
    IF recorded IS NULL OR NOT EXISTS (SELECT 1 FROM crm.leads l WHERE l.lead_id = intent.lead_id
        AND l.family_id = auth.current_family_id() AND l.lead_status <> 'MERGED')
      OR intent.expires_at <= clock_timestamp() OR auth.write_context_is_live() IS NOT TRUE
      OR identity.lock_journey_crm_notice(intent.notice_id) IS DISTINCT FROM source_revision
      OR identity.journey_crm_horizon(source_revision, intent.accepted_topic) IS DISTINCT FROM horizon
      THEN RAISE SQLSTATE 'PJC01'; END IF;
    INSERT INTO identity.journey_crm_handoffs(consent_id,lead_event_id,topic,horizon)
      VALUES(p_consent, recorded, intent.accepted_topic, horizon);
    RETURN 'RECEIVED';
  EXCEPTION WHEN SQLSTATE 'PJC01' THEN
    RETURN 'DENIED';
  END;
END
$fn$;

-- Standard serving path. A failed append never commits a newly captured intent.
CREATE FUNCTION identity.submit_journey_crm_consultation(
  p_consent uuid, p_event uuid, p_notice uuid, p_lead uuid, p_link uuid, p_contract uuid,
  p_topic text, p_version text, p_expires timestamptz, p_confirmed boolean, p_expected_horizon text
) RETURNS text
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  accepted uuid;
  result text;
BEGIN
  accepted := identity.authorize_journey_crm_consultation(
    p_consent,p_notice,p_lead,p_link,p_contract,p_topic,p_version,p_expires,p_confirmed);
  IF accepted IS NULL THEN RETURN 'DENIED'; END IF;
  result := identity.record_journey_crm_need(accepted,p_event,p_expected_horizon);
  IF result = 'DENIED' THEN RAISE SQLSTATE 'PJC02'; END IF;
  RETURN result;
EXCEPTION WHEN SQLSTATE 'PJC02' THEN
  RETURN 'DENIED';
END
$fn$;

CREATE FUNCTION identity.withdraw_journey_crm_consultation(p_consent uuid) RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  prior timestamptz;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE THEN RETURN false; END IF;
  SELECT i.withdrawn_at INTO prior FROM consent.identity_journey_crm_intents i
    JOIN identity.journey_station_reminders r ON r.reminder_id = i.notice_id
    JOIN identity.cases c USING (identity_case_id)
    WHERE i.consent_id = p_consent AND i.recipient_id = auth.current_principal_id()
      AND c.family_id = auth.current_family_id() AND c.subject_person_id = auth.current_actor_person_id()
    FOR UPDATE OF i;
  IF NOT FOUND OR auth.write_context_is_live() IS NOT TRUE THEN RETURN false; END IF;
  IF prior IS NULL THEN
    UPDATE consent.identity_journey_crm_intents SET withdrawn_at = clock_timestamp() WHERE consent_id = p_consent;
    PERFORM audit.record_write_decision('REVOKE','IDENTITY_CONSULTATION_CONSENT',p_consent,true,'IDENTITY_CONSULTATION_WITHDRAWN');
  END IF;
  RETURN true;
END
$fn$;

REVOKE ALL ON FUNCTION consent.protect_journey_crm_intent(), identity.protect_journey_crm_handoff(),
  identity.lock_journey_crm_notice(uuid), identity.lock_journey_crm_binding(uuid,uuid,uuid),
  identity.authorize_journey_crm_consultation(uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,boolean),
  identity.journey_crm_horizon(uuid,text), identity.record_journey_crm_need(uuid,uuid,text),
  identity.submit_journey_crm_consultation(uuid,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,boolean,text),
  identity.withdraw_journey_crm_consultation(uuid)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
