BEGIN;

-- Candidate event metadata only. Assessments remain owned by their source system.
ALTER TABLE crm.lead_events
  ADD COLUMN compass_contract_id uuid REFERENCES crm.acquisition_contract_revisions,
  ADD COLUMN compass_domain text,
  ADD COLUMN compass_subject_id uuid REFERENCES core.people,
  ADD COLUMN compass_assessment_id uuid,
  ADD CONSTRAINT compass_event_metadata CHECK (
    (compass_contract_id IS NULL AND compass_domain IS NULL AND compass_subject_id IS NULL AND compass_assessment_id IS NULL
      AND reason_code NOT IN ('COMPASS_VISIT','COMPASS_ASSESSMENT'))
    OR (event_kind='ATTRIBUTION_RECORDED' AND compass_contract_id IS NOT NULL AND compass_subject_id IS NOT NULL
      AND compass_domain IS NOT NULL AND compass_domain IN ('EDUCATION','IDENTITY','HEALTH','WEALTH')
      AND ((reason_code='COMPASS_VISIT' AND compass_assessment_id IS NULL)
        OR (reason_code='COMPASS_ASSESSMENT' AND compass_assessment_id IS NOT NULL)))
  );
CREATE UNIQUE INDEX lead_compass_assessment_reference_uq
  ON crm.lead_events(compass_domain,compass_assessment_id) WHERE compass_assessment_id IS NOT NULL;

CREATE FUNCTION crm.can_access_compass_event(p_lead uuid,p_subject uuid,p_domain text,p_assessment uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,auth,core,consent
RETURN coalesce(auth.write_context_is_live() AND auth.current_channel()='FAMILY'
  AND p_subject=auth.current_actor_person_id()
  AND EXISTS (SELECT 1 FROM auth.principals p WHERE p.principal_id=auth.current_principal_id()
      AND p.status='ACTIVE' AND p.principal_kind='FAMILY' AND p.person_id=p_subject)
  AND EXISTS (
    SELECT 1 FROM crm.leads l JOIN crm.lead_identity_links link ON link.lead_id=l.lead_id
      JOIN crm.clients client ON client.client_id=link.client_id AND client.family_id=l.family_id
    WHERE l.lead_id=p_lead AND l.family_id=auth.current_family_id() AND l.lead_status<>'MERGED'
      AND link.target_kind='CLIENT' AND link.status='VERIFIED'
      AND link.verified_at<=clock_timestamp() AND link.verified_by_principal_id<>link.linked_by_principal_id
      AND client.lifecycle_status='ACTIVE')
  AND EXISTS (
    SELECT 1 FROM core.family_memberships m WHERE m.family_id=auth.current_family_id()
      AND m.person_id=auth.current_actor_person_id() AND m.valid_from<=clock_timestamp()
      AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp()))
  AND (p_assessment IS NULL OR
    EXISTS (
      SELECT 1 FROM consent.grants g
      WHERE p_assessment IS NOT NULL AND g.family_id=auth.current_family_id()
        AND g.grantee_person_id=p_subject AND g.subject_person_id=p_subject AND g.grantor_person_id=p_subject
        AND g.status='ACTIVE' AND g.withdrawn_at IS NULL
        AND g.granted_at<=clock_timestamp() AND g.expires_at>clock_timestamp()
        AND ((p_domain='EDUCATION' AND g.purpose='EDUCATION_CASE' AND g.data_class='EDUCATION')
          OR (p_domain='IDENTITY' AND g.purpose='IDENTITY_CASE' AND g.data_class='IDENTITY_SENSITIVE'))))
  ,false);
REVOKE ALL ON FUNCTION crm.can_access_compass_event(uuid,uuid,text,uuid) FROM PUBLIC;

-- Called only by the source backend named in the approved 0036 contract.
-- The grant expresses sharing of the opaque reference, never the underlying answers.
CREATE FUNCTION crm.record_compass_event(
  p_event uuid,p_lead uuid,p_subject uuid,p_contract uuid,p_domain text,p_assessment uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,auth,core,audit
AS $event$
DECLARE prior crm.lead_events%ROWTYPE;
BEGIN
  IF (core.is_uuid_v7(p_event) AND crm.acquisition_contract_usable(p_contract)
    AND EXISTS(SELECT 1 FROM crm.acquisition_contract_revisions c WHERE c.contract_id=p_contract
      AND c.source_system='phoenix-nova-compass-'||lower(p_domain)
      AND crm.website_consultation_source_matches(c.source_system,c.entry_ref))
    AND crm.can_access_compass_event(p_lead,p_subject,p_domain,p_assessment)) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('RECORD','CRM_COMPASS_EVENT',p_event,false,'COMPASS_SCOPE_OR_SOURCE_DENIED');
    RETURN NULL;
  END IF;
  INSERT INTO crm.lead_events(lead_event_id,lead_id,event_kind,reason_code,actor_principal_id,
    compass_contract_id,compass_domain,compass_subject_id,compass_assessment_id)
  VALUES(p_event,p_lead,'ATTRIBUTION_RECORDED',
    CASE WHEN p_assessment IS NULL THEN 'COMPASS_VISIT' ELSE 'COMPASS_ASSESSMENT' END,
    auth.current_principal_id(),p_contract,p_domain,p_subject,p_assessment)
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    PERFORM audit.record_write_decision('RECORD','CRM_COMPASS_EVENT',p_event,true,'COMPASS_EVENT_RECORDED');
    RETURN p_event;
  END IF;
  SELECT * INTO prior FROM crm.lead_events WHERE lead_event_id=p_event;
  IF NOT FOUND AND p_assessment IS NOT NULL THEN
    SELECT * INTO prior FROM crm.lead_events WHERE compass_domain=p_domain AND compass_assessment_id=p_assessment;
  END IF;
  IF prior.lead_id=p_lead AND prior.compass_contract_id=p_contract AND prior.compass_domain=p_domain
     AND prior.compass_subject_id=p_subject AND prior.actor_principal_id=auth.current_principal_id()
     AND prior.compass_assessment_id IS NOT DISTINCT FROM p_assessment THEN RETURN prior.lead_event_id; END IF;
  PERFORM audit.record_write_decision('RECORD','CRM_COMPASS_EVENT',p_event,false,'COMPASS_EVENT_IDEMPOTENCY_CONFLICT');
  RETURN NULL;
END
$event$;

CREATE FUNCTION crm.read_compass_event(p_event uuid)
RETURNS TABLE(lead_id uuid,service_domain text,assessment_id uuid,source_system text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,audit
AS $event$
DECLARE v crm.lead_events%ROWTYPE;
BEGIN
  SELECT * INTO v FROM crm.lead_events e WHERE e.lead_event_id=p_event AND e.compass_contract_id IS NOT NULL;
  IF NOT FOUND OR NOT crm.can_access_compass_event(v.lead_id,v.compass_subject_id,v.compass_domain,v.compass_assessment_id) THEN
    PERFORM audit.record_write_decision('READ','CRM_COMPASS_EVENT',p_event,false,'COMPASS_SCOPE_OR_CONSENT_DENIED');
    RETURN;
  END IF;
  PERFORM audit.record_write_decision('READ','CRM_COMPASS_EVENT',p_event,true,'COMPASS_EVENT_READ');
  RETURN QUERY SELECT v.lead_id,v.compass_domain,v.compass_assessment_id,c.source_system
    FROM crm.acquisition_contract_revisions c WHERE c.contract_id=v.compass_contract_id;
END
$event$;
REVOKE ALL ON FUNCTION crm.record_compass_event(uuid,uuid,uuid,uuid,text,uuid),crm.read_compass_event(uuid)
  FROM PUBLIC,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.record_compass_event(uuid,uuid,uuid,uuid,text,uuid),crm.read_compass_event(uuid)
  TO phoenix_canonical_app;

COMMIT;
