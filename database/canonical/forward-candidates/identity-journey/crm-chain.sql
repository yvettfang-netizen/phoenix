-- Candidate for an isolated database. CRM and identity entities retain their
-- Canonical IDs. Only the provenance link is new.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE identity.journey_crm_service_links (
  lead_event_id uuid PRIMARY KEY REFERENCES crm.lead_events,
  verified_link_id uuid NOT NULL REFERENCES crm.lead_identity_links,
  consultation_id uuid NOT NULL UNIQUE REFERENCES crm.consultations,
  deal_id uuid UNIQUE REFERENCES crm.deals
);
ALTER TABLE identity.journey_crm_service_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_crm_service_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_crm_service_links
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;

CREATE FUNCTION identity.protect_journey_crm_service_link() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.deal_id IS NULL AND NEW.deal_id IS NOT NULL
    AND (OLD.lead_event_id, OLD.verified_link_id, OLD.consultation_id)
      IS NOT DISTINCT FROM (NEW.lead_event_id, NEW.verified_link_id, NEW.consultation_id)
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'IDENTITY_JOURNEY_CRM_LINK_IMMUTABLE';
END
$fn$;
CREATE TRIGGER journey_crm_service_link_immutable BEFORE UPDATE OR DELETE ON identity.journey_crm_service_links
  FOR EACH ROW EXECUTE FUNCTION identity.protect_journey_crm_service_link();

-- Invoker rights. The adapter resolves the opaque durable CRM handoff with
-- its live consultation intent and holds both rows for this transaction.
-- A Canonical need by itself is evidence of intake, not authority to book.
CREATE FUNCTION identity.lock_journey_crm_need(
  p_need uuid, p_consent uuid, p_link uuid, p_renewal_only boolean DEFAULT true
)
RETURNS TABLE(lead uuid, client uuid, family uuid, subject uuid)
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  IF crm.is_crm_service() IS NOT TRUE OR auth.write_context_is_live() IS NOT TRUE
    OR auth.current_family_id() IS NULL OR p_need IS NULL OR p_consent IS NULL OR p_link IS NULL
  THEN RETURN; END IF;

  -- Canonical need successors also lock the lead. Recheck after acquiring
  -- that lock so retractions and replacement needs cannot race the link.
  PERFORM 1 FROM crm.lead_events e JOIN crm.leads l USING (lead_id)
    WHERE e.lead_event_id=p_need AND l.family_id=auth.current_family_id()
    FOR UPDATE OF l;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
    SELECT l.lead_id, c.client_id, l.family_id, e.need_subject_person_id
    FROM crm.lead_events e JOIN crm.leads l USING (lead_id)
    JOIN crm.lead_identity_links link ON link.lead_id=l.lead_id
    JOIN crm.clients c ON c.client_id=link.client_id AND c.family_id=l.family_id
    JOIN consent.identity_journey_crm_intents intent ON intent.consent_id=p_consent
    JOIN identity.journey_crm_handoffs handoff ON handoff.consent_id=intent.consent_id
      AND handoff.lead_event_id=e.lead_event_id
    JOIN auth.principals recipient ON recipient.principal_id=e.asserted_by_principal_id
      AND recipient.person_id=e.need_subject_person_id
    JOIN core.family_memberships m ON m.person_id=recipient.person_id AND m.family_id=l.family_id
    WHERE e.lead_event_id=p_need AND e.event_kind='NEED_ASSERTED'
      AND e.need_assertion_kind='USER_SELECTED' AND e.need_domain='IDENTITY' AND e.source_event_ref=p_consent::text
      AND intent.lead_id=l.lead_id AND intent.verified_link_id=p_link
      AND e.acquisition_contract_id=intent.source_contract_id
      AND intent.recipient_id=e.asserted_by_principal_id
      AND ((coalesce(p_renewal_only,true) AND intent.accepted_topic='RENEWAL')
        OR (NOT coalesce(p_renewal_only,true)
          AND intent.accepted_topic IN ('RENEWAL','DOCUMENT','STATUS_REVIEW')))
      AND handoff.topic=intent.accepted_topic AND intent.authorized_at<=clock_timestamp()
      AND intent.withdrawn_at IS NULL AND intent.expires_at > clock_timestamp()
      AND NOT EXISTS (SELECT 1 FROM crm.lead_events n WHERE n.need_supersedes_event_id=p_need)
      AND l.family_id=auth.current_family_id() AND l.lead_status <> 'MERGED'
      AND link.lead_identity_link_id=p_link AND link.target_kind='CLIENT'
      AND link.status='VERIFIED' AND link.revoked_at IS NULL
      AND c.lifecycle_status IN ('ACTIVE','PAUSED') AND recipient.status='ACTIVE' AND recipient.principal_kind='FAMILY'
      AND m.valid_from<=clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
      AND auth.write_context_is_live()
    FOR SHARE OF intent, handoff, link, c, recipient, m;
END
$fn$;

-- Private CRM projection.  The guarded lock is the authorization boundary;
-- only the minimum service summary crosses it, never participant identifiers,
-- dates, consent metadata, or evidence references.
CREATE FUNCTION identity.read_journey_crm_summary(p_need uuid, p_consent uuid, p_link uuid)
RETURNS TABLE(domain text, topic text, horizon text)
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  binding record;
BEGIN
  SELECT * INTO binding FROM identity.lock_journey_crm_need(p_need,p_consent,p_link,false);
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
    SELECT 'IDENTITY'::text, h.topic, h.horizon
    FROM identity.journey_crm_handoffs h
    JOIN consent.identity_journey_crm_intents i ON i.consent_id=h.consent_id
    WHERE h.consent_id=p_consent AND h.lead_event_id=p_need AND h.topic=i.accepted_topic
      AND i.withdrawn_at IS NULL AND i.expires_at>clock_timestamp() AND auth.write_context_is_live();
END
$fn$;

CREATE FUNCTION identity.schedule_journey_crm_consultation(
  p_need uuid, p_consent uuid, p_client_link uuid, p_consultation uuid,
  p_owner uuid, p_scheduled timestamptz, p_event uuid
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  binding record;
  prior identity.journey_crm_service_links%ROWTYPE;
BEGIN
  IF p_scheduled IS NULL OR NOT isfinite(p_scheduled) THEN RETURN NULL; END IF;
  SELECT * INTO binding FROM identity.lock_journey_crm_need(p_need,p_consent,p_client_link);
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM 1 FROM auth.principals p WHERE p.principal_id=p_owner
    AND p.principal_kind='ADVISOR' AND p.status='ACTIVE' FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO prior FROM identity.journey_crm_service_links WHERE lead_event_id=p_need;
  IF FOUND THEN
    IF prior.verified_link_id=p_client_link AND prior.consultation_id=p_consultation AND EXISTS (
      SELECT 1 FROM crm.consultations c JOIN crm.consultation_events e USING (consultation_id)
      WHERE c.consultation_id=p_consultation AND c.lead_id=binding.lead AND c.client_id=binding.client
        AND c.family_id=binding.family AND c.subject_person_id=binding.subject AND c.business_domain='IDENTITY'
        AND c.owner_principal_id=p_owner AND c.scheduled_at=p_scheduled
        AND e.consultation_event_id=p_event AND e.event_kind='CREATED'
    ) THEN RETURN p_consultation; END IF;
    RETURN NULL;
  END IF;
  IF crm.create_consultation(p_consultation,binding.lead,binding.client,binding.family,binding.subject,
    'IDENTITY','DISCOVERY',NULL,p_owner,p_scheduled,p_event) IS NOT TRUE THEN RETURN NULL; END IF;
  INSERT INTO identity.journey_crm_service_links(lead_event_id,verified_link_id,consultation_id)
    VALUES (p_need,p_client_link,p_consultation);
  RETURN p_consultation;
END
$fn$;

CREATE FUNCTION identity.create_journey_crm_deal(
  p_need uuid, p_consent uuid, p_deal uuid, p_assignment uuid, p_name text,
  p_amount numeric, p_currency text, p_event uuid
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  binding record;
  prior identity.journey_crm_service_links%ROWTYPE;
  advisor uuid;
BEGIN
  SELECT * INTO prior FROM identity.journey_crm_service_links WHERE lead_event_id=p_need;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO binding FROM identity.lock_journey_crm_need(p_need,p_consent,prior.verified_link_id);
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO prior FROM identity.journey_crm_service_links WHERE lead_event_id=p_need FOR UPDATE;
  SELECT c.owner_principal_id INTO advisor FROM crm.consultations c
    JOIN auth.principals advisor_principal ON advisor_principal.principal_id=c.owner_principal_id
    WHERE c.consultation_id=prior.consultation_id AND c.lead_id=binding.lead AND c.client_id=binding.client
      AND c.family_id=binding.family AND c.subject_person_id=binding.subject AND c.business_domain='IDENTITY'
      AND c.status='COMPLETED' AND advisor_principal.principal_kind='ADVISOR' AND advisor_principal.status='ACTIVE'
    FOR SHARE OF c, advisor_principal;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF prior.deal_id IS NOT NULL THEN
    IF prior.deal_id=p_deal AND EXISTS (
      SELECT 1 FROM crm.deals d JOIN crm.deal_events e USING (deal_id)
      JOIN crm.sales_assignments a USING (deal_id)
      WHERE d.deal_id=p_deal AND d.primary_lead_id=binding.lead AND d.client_id=binding.client
        AND d.family_id=binding.family AND d.business_domain='IDENTITY'
        AND d.deal_name=btrim(p_name) AND d.estimated_amount=p_amount AND d.currency=p_currency
        AND e.deal_event_id=p_event AND e.event_kind='CREATED' AND a.sales_assignment_id=p_assignment
    ) THEN RETURN p_deal; END IF;
    RETURN NULL;
  END IF;
  IF crm.create_managed_deal(p_deal,p_assignment,binding.client,binding.family,binding.lead,prior.consultation_id,
    p_name,'IDENTITY',p_amount,p_currency,NULL,advisor,NULL,p_event) IS NOT TRUE THEN RETURN NULL; END IF;
  UPDATE identity.journey_crm_service_links SET deal_id=p_deal WHERE lead_event_id=p_need;
  RETURN p_deal;
END
$fn$;

REVOKE ALL ON FUNCTION identity.protect_journey_crm_service_link(),
  identity.lock_journey_crm_need(uuid,uuid,uuid,boolean),
  identity.read_journey_crm_summary(uuid,uuid,uuid),
  identity.schedule_journey_crm_consultation(uuid,uuid,uuid,uuid,uuid,timestamptz,uuid),
  identity.create_journey_crm_deal(uuid,uuid,uuid,uuid,text,numeric,text,uuid)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
