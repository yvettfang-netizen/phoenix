BEGIN;
-- Internal gateway only. The gateway must authenticate the employee with the
-- existing IdP before using the verified issuer/subject. No browser SQL access.
CREATE ROLE phoenix_website_consultation_staff_gateway NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA crm TO phoenix_website_consultation_staff_gateway;

-- Domain grants reference existing Canonical principals, never independent accounts.
CREATE TABLE crm.website_consultation_staff_grants (
  principal_id uuid NOT NULL REFERENCES auth.principals(principal_id),
  organization_id uuid NOT NULL REFERENCES core.organizations,
  service_domain text NOT NULL CHECK (service_domain IN ('EDUCATION','IDENTITY','WEALTH','HEALTH')),
  grant_kind text NOT NULL CHECK (grant_kind IN ('DISPATCHER','ADVISER')),
  valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),
  valid_until timestamptz NOT NULL CHECK (valid_until > valid_from),
  revoked_at timestamptz,
  PRIMARY KEY (principal_id,organization_id,service_domain,grant_kind)
);
ALTER TABLE crm.website_consultation_staff_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.website_consultation_staff_grants FORCE ROW LEVEL SECURITY;
REVOKE ALL ON crm.website_consultation_staff_grants FROM PUBLIC,phoenix_canonical_app,
  phoenix_canonical_reader,phoenix_website_consultation_staff_gateway;
DO $policy$
BEGIN
  EXECUTE format(
    'CREATE POLICY website_staff_grant_owner ON crm.website_consultation_staff_grants TO %I USING (true) WITH CHECK (true)',
    current_user
  );
END
$policy$;

-- The operator binds each approved intake contract revision to its service organization.
-- An unmapped contract has no staff-visible leads.
CREATE TABLE crm.website_consultation_contract_organizations (
  contract_id uuid PRIMARY KEY REFERENCES crm.acquisition_contract_revisions,
  organization_id uuid NOT NULL REFERENCES core.organizations
);
ALTER TABLE crm.website_consultation_contract_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.website_consultation_contract_organizations FORCE ROW LEVEL SECURITY;
DO $policy$
BEGIN
  EXECUTE format(
    'CREATE POLICY website_contract_org_owner ON crm.website_consultation_contract_organizations TO %I USING (true) WITH CHECK (true)',
    current_user
  );
END
$policy$;
REVOKE ALL ON crm.website_consultation_contract_organizations FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_consultation_staff_gateway;

CREATE FUNCTION crm.website_consultation_org_allows(p_lead uuid,p_org uuid)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog
RETURN EXISTS (
  SELECT 1 FROM crm.website_consultation_intake i
  JOIN crm.website_consultation_contract_organizations binding
    ON binding.contract_id=i.acquisition_contract_id
  JOIN core.organizations org ON org.organization_id=binding.organization_id
  JOIN crm.leads lead ON lead.lead_id=i.lead_id
  WHERE i.lead_id=p_lead AND org.organization_id=p_org AND org.status='ACTIVE'
    AND lead.family_id IS NULL AND lead.contact_person_id IS NULL
);
REVOKE ALL ON FUNCTION crm.website_consultation_org_allows(uuid,uuid) FROM PUBLIC;

-- Internal predicate. A caller must authenticate the actor and hold both lead
-- locks while using the result for a duplicate lifecycle transition.
CREATE FUNCTION crm.website_consultation_duplicate_scope_allows(
  p_actor uuid,p_first uuid,p_second uuid,p_grant_kind text
) RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog
RETURN EXISTS (
  SELECT 1
    FROM crm.website_consultation_intake a
    JOIN crm.website_consultation_intake b ON b.service_domain=a.service_domain
    JOIN crm.website_consultation_staff_grants g ON g.service_domain=a.service_domain
    JOIN auth.principals actor ON actor.principal_id=g.principal_id
   WHERE a.lead_id=p_first AND b.lead_id=p_second AND p_first<>p_second
     AND actor.principal_id=p_actor AND actor.principal_kind='ADVISOR'
     AND actor.person_id IS NOT NULL AND actor.status='ACTIVE'
     AND g.grant_kind=p_grant_kind AND g.revoked_at IS NULL
     AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
     AND crm.website_consultation_org_allows(p_first,g.organization_id)
     AND crm.website_consultation_org_allows(p_second,g.organization_id)
);
REVOKE ALL ON FUNCTION crm.website_consultation_duplicate_scope_allows(uuid,uuid,uuid,text)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,
  phoenix_website_intake,phoenix_website_consultation_staff_gateway;

-- Serialize duplicate operations against family linking and lead state changes.
-- Both argument orders acquire the same row locks in the same order.
CREATE FUNCTION crm.lock_website_consultation_duplicate_pair(
  p_actor uuid,p_first uuid,p_second uuid,p_grant_kind text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog
AS $duplicate$
DECLARE locked_count integer;
BEGIN
  IF NOT crm.website_consultation_duplicate_scope_allows(
    p_actor,p_first,p_second,p_grant_kind
  ) THEN RETURN false; END IF;

  PERFORM 1 FROM crm.leads
    WHERE lead_id IN (p_first,p_second) AND lead_status<>'MERGED'
    ORDER BY lead_id FOR UPDATE;
  GET DIAGNOSTICS locked_count = ROW_COUNT;
  RETURN locked_count=2 AND crm.website_consultation_duplicate_scope_allows(
    p_actor,p_first,p_second,p_grant_kind
  );
END
$duplicate$;
REVOKE ALL ON FUNCTION crm.lock_website_consultation_duplicate_pair(uuid,uuid,uuid,text)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,
  phoenix_website_intake,phoenix_website_consultation_staff_gateway;

-- Queue metadata only. Dispatchers can see leads in their authorised domains.
-- Advisers only see leads or follow-ups specifically assigned to them.
CREATE FUNCTION crm.list_website_consultation_staff_queue(p_issuer text,p_subject text)
RETURNS TABLE(lead_id uuid,service_domain text,locale text,received_at timestamptz,lead_status text,assignee_id uuid,next_due_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,crm,auth
AS $queue$
DECLARE employee uuid;
BEGIN
  IF NOT pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    OR pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    OR pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    OR NOT coalesce(length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500,false) THEN
    RETURN;
  END IF;
  employee := auth.resolve_external_identity(p_issuer,p_subject);
  IF employee IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.principals p WHERE p.principal_id=employee AND p.person_id IS NOT NULL
      AND p.principal_kind='ADVISOR' AND p.status='ACTIVE'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT l.lead_id,i.service_domain,i.locale,i.recorded_at,l.lead_status,l.assigned_principal_id,
    (SELECT min(f.due_at) FROM crm.follow_ups f WHERE f.lead_id=l.lead_id
      AND f.assigned_principal_id=l.assigned_principal_id AND f.status='PENDING') AS next_due_at
    FROM crm.website_consultation_intake i JOIN crm.leads l ON l.lead_id=i.lead_id
    WHERE l.lead_status<>'MERGED' AND EXISTS (
      SELECT 1 FROM crm.website_consultation_staff_grants g
      WHERE g.principal_id=employee AND g.service_domain=i.service_domain AND crm.website_consultation_org_allows(i.lead_id,g.organization_id)
        AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp() AND g.revoked_at IS NULL
        AND (g.grant_kind='DISPATCHER' OR l.assigned_principal_id=employee OR EXISTS (
          SELECT 1 FROM crm.follow_ups f WHERE f.lead_id=l.lead_id
            AND f.assigned_principal_id=employee AND f.status='PENDING'
        ))
    )
    ORDER BY i.recorded_at DESC,l.lead_id DESC LIMIT 100;
END
$queue$;
REVOKE ALL ON FUNCTION crm.list_website_consultation_staff_queue(text,text) FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.list_website_consultation_staff_queue(text,text)
  TO phoenix_website_consultation_staff_gateway;

CREATE TABLE crm.website_consultation_contact_reads (
  read_id uuid PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES crm.leads(lead_id),
  actor_principal_id uuid NOT NULL REFERENCES auth.principals(principal_id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE crm.website_consultation_contact_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.website_consultation_contact_reads FORCE ROW LEVEL SECURITY;
REVOKE ALL ON crm.website_consultation_contact_reads FROM PUBLIC,phoenix_canonical_app,
  phoenix_canonical_reader,phoenix_website_consultation_staff_gateway;
DO $policy$
BEGIN
  EXECUTE format(
    'CREATE POLICY website_contact_read_owner ON crm.website_consultation_contact_reads FOR INSERT TO %I WITH CHECK (true)',
    current_user
  );
END
$policy$;

-- Query in a dedicated transaction and commit before forwarding the contact
-- to an employee. The gateway owns authentication and decrypts server-side.
CREATE FUNCTION crm.read_website_consultation_contact(p_issuer text,p_subject text,p_lead uuid,p_read uuid)
RETURNS TABLE(request_id uuid,contract_id uuid,service_domain text,locale text,consent_version text,contact_envelope bytea)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,crm,auth
AS $contact$
DECLARE employee uuid; item crm.website_consultation_intake%ROWTYPE;
BEGIN
  IF p_read IS NULL
    OR NOT pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    OR pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    OR pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    OR NOT coalesce(length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500,false) THEN
    RETURN;
  END IF;
  employee := auth.resolve_external_identity(p_issuer,p_subject);
  IF employee IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.principals p WHERE p.principal_id=employee AND p.person_id IS NOT NULL
      AND p.principal_kind='ADVISOR' AND p.status='ACTIVE'
  ) THEN RETURN; END IF;

  SELECT i.* INTO item
  FROM crm.website_consultation_intake i JOIN crm.leads l ON l.lead_id=i.lead_id
  JOIN crm.website_consultation_staff_grants g
    ON g.principal_id=employee AND g.service_domain=i.service_domain AND crm.website_consultation_org_allows(i.lead_id,g.organization_id) AND g.grant_kind='ADVISER'
  WHERE l.lead_id=p_lead AND l.lead_status NOT IN ('MERGED','DISQUALIFIED','LOST')
    AND i.contact_envelope IS NOT NULL AND i.contact_expires_at>clock_timestamp()
    AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp() AND g.revoked_at IS NULL
    AND (l.assigned_principal_id=employee OR EXISTS (
      SELECT 1 FROM crm.follow_ups f WHERE f.lead_id=l.lead_id
        AND f.assigned_principal_id=employee AND f.status='PENDING'
    ))
  FOR SHARE OF i,l,g;
  IF NOT FOUND THEN RETURN; END IF;
  -- Recheck after acquiring any contended locks.
  IF item.contact_expires_at<=clock_timestamp()
    OR auth.resolve_external_identity(p_issuer,p_subject) IS DISTINCT FROM employee
    OR NOT EXISTS (
      SELECT 1 FROM crm.website_consultation_staff_grants g
      WHERE g.principal_id=employee AND g.service_domain=item.service_domain AND crm.website_consultation_org_allows(p_lead,g.organization_id)
        AND g.grant_kind='ADVISER' AND g.valid_from<=clock_timestamp()
        AND g.valid_until>clock_timestamp() AND g.revoked_at IS NULL
    )
    OR NOT EXISTS (
      SELECT 1 FROM crm.leads l WHERE l.lead_id=p_lead AND (l.assigned_principal_id=employee OR EXISTS (
        SELECT 1 FROM crm.follow_ups f WHERE f.lead_id=l.lead_id
          AND f.assigned_principal_id=employee AND f.status='PENDING'
      ))
    ) THEN RETURN; END IF;
  INSERT INTO crm.website_consultation_contact_reads(read_id,lead_id,actor_principal_id)
    VALUES(p_read,p_lead,employee);
  RETURN QUERY SELECT item.request_id,item.acquisition_contract_id,item.service_domain,item.locale,
    item.consent_version,item.contact_envelope;
END
$contact$;
REVOKE ALL ON FUNCTION crm.read_website_consultation_contact(text,text,uuid,uuid) FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.read_website_consultation_contact(text,text,uuid,uuid)
  TO phoenix_website_consultation_staff_gateway;

CREATE FUNCTION crm.act_on_website_consultation(
  p_issuer text,p_subject text,p_lead uuid,p_action text,p_assignee uuid,p_event uuid
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,crm,auth,core
AS $action$
DECLARE employee uuid; lead crm.leads%ROWTYPE; domain text; task uuid;
BEGIN
  IF (pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500
    AND core.is_uuid_v7(p_event) AND p_action IN ('ASSIGN','REASSIGN','CANCEL','COMPLETE')) IS NOT TRUE THEN RETURN NULL; END IF;
  employee := auth.resolve_external_identity(p_issuer,p_subject);
  IF NOT EXISTS (
    SELECT 1 FROM auth.principals WHERE principal_id=employee AND principal_kind='ADVISOR'
      AND person_id IS NOT NULL AND status='ACTIVE'
  ) THEN RETURN NULL; END IF;
  SELECT l.* INTO lead FROM crm.leads l JOIN crm.website_consultation_intake i USING(lead_id)
  WHERE l.lead_id=p_lead AND l.family_id IS NULL AND l.contact_person_id IS NULL
    AND l.lead_status IN ('NEW','CONTACTED') FOR UPDATE OF l;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT i.service_domain INTO STRICT domain FROM crm.website_consultation_intake i WHERE i.lead_id=p_lead;
  PERFORM 1 FROM crm.website_consultation_staff_grants g
    WHERE g.principal_id=employee AND g.service_domain=domain AND crm.website_consultation_org_allows(p_lead,g.organization_id)
      AND g.grant_kind=CASE p_action WHEN 'COMPLETE' THEN 'ADVISER' ELSE 'DISPATCHER' END
      AND g.revoked_at IS NULL FOR SHARE;
  IF NOT FOUND OR auth.resolve_external_identity(p_issuer,p_subject) IS DISTINCT FROM employee OR NOT EXISTS (
    SELECT 1 FROM crm.website_consultation_staff_grants g WHERE g.principal_id=employee AND g.service_domain=domain AND crm.website_consultation_org_allows(p_lead,g.organization_id)
      AND g.grant_kind=CASE p_action WHEN 'COMPLETE' THEN 'ADVISER' ELSE 'DISPATCHER' END
      AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
  ) THEN RETURN NULL; END IF;

  IF p_action IN ('ASSIGN','REASSIGN') THEN
    IF NOT EXISTS (
      SELECT 1 FROM crm.website_consultation_intake i WHERE i.lead_id=p_lead
        AND i.contact_envelope IS NOT NULL AND i.contact_expires_at>clock_timestamp()
    ) THEN RETURN NULL; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM crm.website_consultation_staff_grants g JOIN auth.principals p USING(principal_id)
      WHERE g.principal_id=p_assignee AND p.principal_kind='ADVISOR' AND p.person_id IS NOT NULL
        AND p.status='ACTIVE' AND g.service_domain=domain AND crm.website_consultation_org_allows(p_lead,g.organization_id) AND g.grant_kind='ADVISER'
        AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
    ) THEN RETURN NULL; END IF;
    IF p_action='REASSIGN' THEN
      SELECT f.follow_up_id INTO task
      FROM crm.follow_ups f JOIN crm.lead_events e ON e.lead_event_id=f.follow_up_id
      WHERE f.lead_id=p_lead AND f.assigned_principal_id=lead.assigned_principal_id
        AND f.status='PENDING' AND e.lead_id=p_lead
        AND e.reason_code='WEBSITE_CONSULTATION_ASSIGNED'
      FOR UPDATE OF f;
      IF NOT FOUND THEN RETURN NULL; END IF;
      IF lead.assigned_principal_id=p_assignee THEN RETURN task; END IF;
      UPDATE crm.follow_ups SET assigned_principal_id=p_assignee,updated_at=clock_timestamp() WHERE follow_up_id=task;
      UPDATE crm.leads SET assigned_principal_id=p_assignee,updated_by_principal_id=employee,
        updated_at=clock_timestamp() WHERE lead_id=p_lead;
      INSERT INTO crm.lead_events(lead_event_id,lead_id,event_kind,reason_code,actor_principal_id)
        VALUES(p_event,p_lead,'ASSIGNED','WEBSITE_CONSULTATION_REASSIGNED',employee);
      RETURN task;
    END IF;
    IF lead.assigned_principal_id IS NOT NULL THEN
      IF lead.assigned_principal_id IS DISTINCT FROM p_assignee THEN RETURN NULL; END IF;
      SELECT f.follow_up_id INTO task FROM crm.follow_ups f JOIN crm.lead_events e ON e.lead_event_id=f.follow_up_id
      WHERE f.lead_id=p_lead AND f.assigned_principal_id=p_assignee AND e.lead_id=p_lead
        AND e.reason_code='WEBSITE_CONSULTATION_ASSIGNED';
      RETURN task;
    END IF;
    UPDATE crm.leads SET assigned_principal_id=p_assignee,updated_by_principal_id=employee,
      updated_at=clock_timestamp() WHERE lead_id=p_lead;
    -- Internal first-response target for workbench overdue highlighting, not a customer SLA.
    INSERT INTO crm.follow_ups(follow_up_id,target_kind,lead_id,title,status,assigned_principal_id,created_by_principal_id,due_at)
      VALUES(p_event,'LEAD',p_lead,'Website consultation: first contact','PENDING',p_assignee,employee,
        clock_timestamp()+interval '24 hours');
    INSERT INTO crm.lead_events(lead_event_id,lead_id,event_kind,reason_code,actor_principal_id)
      VALUES(p_event,p_lead,'ASSIGNED','WEBSITE_CONSULTATION_ASSIGNED',employee);
    RETURN p_event;
  END IF;

  IF p_action='CANCEL' THEN
    IF p_assignee IS NOT NULL THEN RETURN NULL; END IF;
    SELECT f.follow_up_id INTO task FROM crm.follow_ups f
      JOIN crm.lead_events e ON e.lead_event_id=f.follow_up_id
      WHERE f.lead_id=p_lead AND f.assigned_principal_id=lead.assigned_principal_id
        AND f.status IN ('PENDING','CANCELLED') AND e.lead_id=p_lead
        AND e.reason_code='WEBSITE_CONSULTATION_ASSIGNED'
      FOR UPDATE OF f;
    IF NOT FOUND THEN RETURN NULL; END IF;
    UPDATE crm.follow_ups SET status='CANCELLED',updated_at=clock_timestamp()
      WHERE follow_up_id=task AND status='PENDING';
    IF FOUND THEN
      INSERT INTO crm.lead_events(lead_event_id,lead_id,event_kind,from_status,to_status,reason_code,actor_principal_id)
        VALUES(p_event,p_lead,'STATUS_CHANGED','PENDING','CANCELLED','WEBSITE_CONSULTATION_FOLLOW_UP_CANCELLED',employee);
    END IF;
    RETURN task;
  END IF;
  IF p_assignee IS NOT NULL OR lead.assigned_principal_id IS DISTINCT FROM employee THEN RETURN NULL; END IF;
  SELECT f.follow_up_id INTO task FROM crm.follow_ups f JOIN crm.lead_events e ON e.lead_event_id=f.follow_up_id
  WHERE f.lead_id=p_lead AND f.assigned_principal_id=employee AND e.lead_id=p_lead
    AND e.reason_code='WEBSITE_CONSULTATION_ASSIGNED' AND f.status IN ('PENDING','COMPLETED') FOR UPDATE OF f;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE crm.follow_ups SET status='COMPLETED',completed_at=clock_timestamp(),updated_at=clock_timestamp()
    WHERE follow_up_id=task AND status='PENDING';
  IF FOUND AND lead.lead_status='NEW' THEN
    UPDATE crm.leads SET lead_status='CONTACTED',updated_by_principal_id=employee,updated_at=clock_timestamp()
      WHERE lead_id=p_lead;
    INSERT INTO crm.lead_events(lead_event_id,lead_id,event_kind,from_status,to_status,reason_code,actor_principal_id)
      VALUES(p_event,p_lead,'STATUS_CHANGED','NEW','CONTACTED','WEBSITE_CONSULTATION_CONTACTED',employee);
  END IF;
  RETURN task;
END
$action$;
REVOKE ALL ON FUNCTION crm.act_on_website_consultation(text,text,uuid,text,uuid,uuid) FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.act_on_website_consultation(text,text,uuid,text,uuid,uuid)
  TO phoenix_website_consultation_staff_gateway;

CREATE FUNCTION crm.list_website_consultation_assignees(p_issuer text,p_subject text,p_lead uuid)
RETURNS TABLE(principal_id uuid,display_name text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,crm,auth,core
AS $assignees$
DECLARE employee uuid;
BEGIN
  IF (pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500) IS NOT TRUE THEN RETURN; END IF;
  employee := auth.resolve_external_identity(p_issuer,p_subject);
  RETURN QUERY SELECT target.principal_id,person.display_name
    FROM crm.website_consultation_intake intake
    JOIN crm.leads lead USING(lead_id)
    JOIN crm.website_consultation_staff_grants dispatched
      ON dispatched.principal_id=employee AND dispatched.service_domain=intake.service_domain
        AND dispatched.grant_kind='DISPATCHER' AND crm.website_consultation_org_allows(p_lead,dispatched.organization_id)
    JOIN auth.principals actor ON actor.principal_id=employee AND actor.principal_kind='ADVISOR'
      AND actor.person_id IS NOT NULL AND actor.status='ACTIVE'
    JOIN crm.website_consultation_staff_grants eligible
      ON eligible.service_domain=intake.service_domain AND eligible.grant_kind='ADVISER' AND eligible.organization_id=dispatched.organization_id
    JOIN auth.principals target ON target.principal_id=eligible.principal_id
      AND target.principal_kind='ADVISOR' AND target.status='ACTIVE'
    JOIN core.people person ON person.person_id=target.person_id
    WHERE lead.lead_id=p_lead AND lead.lead_status='NEW'
      AND target.principal_id IS DISTINCT FROM lead.assigned_principal_id
      AND (lead.assigned_principal_id IS NULL OR EXISTS (
        SELECT 1 FROM crm.follow_ups f JOIN crm.lead_events e ON e.lead_event_id=f.follow_up_id
        WHERE f.lead_id=p_lead AND f.assigned_principal_id=lead.assigned_principal_id
          AND f.status='PENDING' AND e.lead_id=p_lead
          AND e.reason_code='WEBSITE_CONSULTATION_ASSIGNED'
      ))
      AND intake.contact_envelope IS NOT NULL AND intake.contact_expires_at>clock_timestamp()
      AND lead.contact_person_id IS NULL AND lead.family_id IS NULL
      AND dispatched.revoked_at IS NULL AND eligible.revoked_at IS NULL
      AND dispatched.valid_from<=clock_timestamp() AND dispatched.valid_until>clock_timestamp()
      AND eligible.valid_from<=clock_timestamp() AND eligible.valid_until>clock_timestamp()
    ORDER BY person.display_name,target.principal_id LIMIT 100;
END
$assignees$;
REVOKE ALL ON FUNCTION crm.list_website_consultation_assignees(text,text,uuid) FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.list_website_consultation_assignees(text,text,uuid)
  TO phoenix_website_consultation_staff_gateway;
CREATE FUNCTION crm.propose_website_consultation_duplicate(
  p_issuer text,p_subject text,p_first uuid,p_second uuid,
  p_candidate uuid,p_event uuid,p_evidence_sha256 text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog
AS $proposal$
DECLARE employee uuid;
        candidate_id uuid;
BEGIN
  IF (pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500
    AND core.is_uuid_v7(p_candidate) AND core.is_uuid_v7(p_event)
    AND p_evidence_sha256 ~ '^[0-9a-f]{64}$') IS NOT TRUE THEN RETURN NULL; END IF;
  employee := auth.resolve_external_identity(p_issuer,p_subject);
  IF crm.lock_website_consultation_duplicate_pair(employee,p_first,p_second,'DISPATCHER') IS NOT TRUE
    OR auth.resolve_external_identity(p_issuer,p_subject) IS DISTINCT FROM employee
  THEN RETURN NULL; END IF;

  INSERT INTO crm.lead_duplicate_candidates(
    lead_duplicate_candidate_id,lead_a_id,lead_b_id,evidence_sha256,status,proposed_by_principal_id
  ) VALUES(p_candidate,least(p_first,p_second),greatest(p_first,p_second),p_evidence_sha256,'PENDING',employee)
  ON CONFLICT (lead_a_id,lead_b_id) WHERE status='PENDING' DO NOTHING
  RETURNING lead_duplicate_candidate_id INTO candidate_id;
  IF FOUND THEN
    INSERT INTO crm.lead_events(lead_event_id,lead_id,event_kind,to_status,reason_code,actor_principal_id)
    VALUES(p_event,least(p_first,p_second),'DEDUP_CANDIDATE','PENDING','MANUAL_DUPLICATE_CANDIDATE',employee);
    RETURN candidate_id;
  END IF;
  SELECT c.lead_duplicate_candidate_id INTO candidate_id
  FROM crm.lead_duplicate_candidates c
  WHERE c.lead_a_id=least(p_first,p_second) AND c.lead_b_id=greatest(p_first,p_second)
    AND c.status='PENDING' AND c.evidence_sha256=p_evidence_sha256;
  RETURN candidate_id;
END
$proposal$;
REVOKE ALL ON FUNCTION crm.propose_website_consultation_duplicate(text,text,uuid,uuid,uuid,uuid,text)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.propose_website_consultation_duplicate(text,text,uuid,uuid,uuid,uuid,text)
  TO phoenix_website_consultation_staff_gateway;

CREATE FUNCTION crm.review_website_consultation_duplicate(
  p_issuer text,p_subject text,p_candidate uuid,p_decision text,p_event uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog
AS $review$
DECLARE employee uuid;
        candidate crm.lead_duplicate_candidates%ROWTYPE;
BEGIN
  IF (pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500
    AND core.is_uuid_v7(p_event) AND p_decision IN ('CONFIRMED','DISMISSED'))
    IS NOT TRUE THEN RETURN false; END IF;
  employee := auth.resolve_external_identity(p_issuer,p_subject);
  SELECT * INTO candidate FROM crm.lead_duplicate_candidates
    WHERE lead_duplicate_candidate_id=p_candidate;
  IF NOT FOUND OR candidate.status<>'PENDING'
    OR employee IS NOT DISTINCT FROM candidate.proposed_by_principal_id
    OR crm.lock_website_consultation_duplicate_pair(
      employee,candidate.lead_a_id,candidate.lead_b_id,'DISPATCHER'
    ) IS NOT TRUE
    OR auth.resolve_external_identity(p_issuer,p_subject) IS DISTINCT FROM employee
  THEN RETURN false; END IF;

  UPDATE crm.lead_duplicate_candidates
    SET status=p_decision,reviewed_by_principal_id=employee,reviewed_at=clock_timestamp()
    WHERE lead_duplicate_candidate_id=p_candidate AND status='PENDING';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO crm.lead_events(
    lead_event_id,lead_id,event_kind,from_status,to_status,reason_code,actor_principal_id
  ) VALUES(p_event,candidate.lead_a_id,'DEDUP_REVIEWED','PENDING',p_decision,
    'MANUAL_DUPLICATE_REVIEWED',employee);
  RETURN true;
END
$review$;
REVOKE ALL ON FUNCTION crm.review_website_consultation_duplicate(text,text,uuid,text,uuid)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.review_website_consultation_duplicate(text,text,uuid,text,uuid)
  TO phoenix_website_consultation_staff_gateway;

CREATE FUNCTION crm.merge_website_consultation_duplicate(
  p_issuer text,p_subject text,p_candidate uuid,p_source uuid,p_target uuid,
  p_merge uuid,p_event uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $merge$
DECLARE employee uuid;
        previous_status text;
BEGIN
  IF (pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500
    AND core.is_uuid_v7(p_merge) AND core.is_uuid_v7(p_event)) IS NOT TRUE
  THEN RETURN false; END IF;
  employee := auth.resolve_external_identity(p_issuer,p_subject);
  IF crm.lock_website_consultation_duplicate_pair(employee,p_source,p_target,'DISPATCHER') IS NOT TRUE
    OR auth.resolve_external_identity(p_issuer,p_subject) IS DISTINCT FROM employee
  THEN RETURN false; END IF;
  PERFORM 1 FROM crm.lead_duplicate_candidates
    WHERE lead_duplicate_candidate_id=p_candidate AND status='CONFIRMED'
      AND lead_a_id=least(p_source,p_target) AND lead_b_id=greatest(p_source,p_target)
    FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT lead_status INTO previous_status FROM crm.leads WHERE lead_id=p_source;
  IF previous_status NOT IN ('NEW','CONTACTED')
    OR NOT EXISTS (SELECT 1 FROM crm.leads WHERE lead_id=p_target AND lead_status IN ('NEW','CONTACTED'))
    OR EXISTS (SELECT 1 FROM crm.follow_ups WHERE lead_id=p_source AND status='PENDING')
    OR EXISTS (SELECT 1 FROM crm.lead_merge_decisions WHERE target_lead_id=p_source AND status='ACTIVE')
  THEN RETURN false; END IF;
  INSERT INTO crm.lead_merge_decisions(
    lead_merge_decision_id,duplicate_candidate_id,source_lead_id,target_lead_id,
    source_previous_status,status,merged_by_principal_id
  ) VALUES(p_merge,p_candidate,p_source,p_target,previous_status,'ACTIVE',employee);
  UPDATE crm.leads SET lead_status='MERGED',merged_into_lead_id=p_target,
    updated_by_principal_id=employee,updated_at=clock_timestamp() WHERE lead_id=p_source;
  INSERT INTO crm.lead_events(
    lead_event_id,lead_id,event_kind,from_status,to_status,reason_code,actor_principal_id
  ) VALUES(p_event,p_source,'MERGED',previous_status,'MERGED','MANUAL_AUDITED_LEAD_MERGE',employee);
  RETURN true;
END
$merge$;
REVOKE ALL ON FUNCTION crm.merge_website_consultation_duplicate(text,text,uuid,uuid,uuid,uuid,uuid)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.merge_website_consultation_duplicate(text,text,uuid,uuid,uuid,uuid,uuid)
  TO phoenix_website_consultation_staff_gateway;

CREATE FUNCTION crm.list_website_consultation_duplicates(p_issuer text,p_subject text)
RETURNS TABLE(candidate_id uuid,first_lead_id uuid,second_lead_id uuid,status text,can_review boolean)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $list$
  SELECT c.lead_duplicate_candidate_id,c.lead_a_id,c.lead_b_id,c.status,
    c.status='PENDING' AND c.proposed_by_principal_id<>employee.id
  FROM crm.lead_duplicate_candidates c
  CROSS JOIN LATERAL (SELECT auth.resolve_external_identity(p_issuer,p_subject) AS id) employee
  JOIN crm.leads a ON a.lead_id=c.lead_a_id
  JOIN crm.leads b ON b.lead_id=c.lead_b_id
  WHERE pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500
    AND c.status IN ('PENDING','CONFIRMED')
    AND a.lead_status<>'MERGED' AND b.lead_status<>'MERGED'
    AND crm.website_consultation_duplicate_scope_allows(employee.id,c.lead_a_id,c.lead_b_id,'DISPATCHER')
  ORDER BY c.proposed_at DESC,c.lead_duplicate_candidate_id LIMIT 100
$list$;
REVOKE ALL ON FUNCTION crm.list_website_consultation_duplicates(text,text)
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.list_website_consultation_duplicates(text,text)
  TO phoenix_website_consultation_staff_gateway;
COMMIT;
