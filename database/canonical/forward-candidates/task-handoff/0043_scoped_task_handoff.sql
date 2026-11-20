BEGIN;

-- DB-02a, dependent on isolated 0042. An accepted handoff changes only the
-- assignee of an existing task. Both people must already hold a live project
-- assignment in the same organization; no project or document grant is made.

CREATE TABLE service.task_handoff_requests (
  handoff_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(handoff_id)),
  task_id uuid NOT NULL REFERENCES service.tasks,
  service_project_id uuid NOT NULL REFERENCES service.projects,
  organization_id uuid NOT NULL REFERENCES core.organizations,
  from_principal_id uuid NOT NULL REFERENCES auth.principals,
  to_principal_id uuid NOT NULL REFERENCES auth.principals,
  to_project_assignment_id uuid NOT NULL REFERENCES service.project_assignments,
  scope_code text NOT NULL DEFAULT 'TASK_RESPONSIBILITY_ONLY'
    CHECK (scope_code='TASK_RESPONSIBILITY_ONLY'),
  status text NOT NULL CHECK (status IN
    ('PROPOSED','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
  reason_code text NOT NULL CHECK (reason_code ~ '^[A-Z0-9_]{2,80}$'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 2),
  proposed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  decided_at timestamptz,
  decided_by_principal_id uuid REFERENCES auth.principals,
  decision_event_id uuid UNIQUE,
  task_transfer_event_id uuid UNIQUE,
  request_nonce uuid NOT NULL,
  CHECK (from_principal_id<>to_principal_id),
  CHECK (expires_at>proposed_at AND expires_at<=proposed_at+interval '7 days'),
  CHECK (
    (status='PROPOSED' AND revision=1 AND decided_at IS NULL
      AND decided_by_principal_id IS NULL AND decision_event_id IS NULL
      AND task_transfer_event_id IS NULL)
    OR (status<>'PROPOSED' AND revision=2 AND decided_at IS NOT NULL
      AND decided_by_principal_id IS NOT NULL AND decision_event_id IS NOT NULL
      AND ((status='ACCEPTED')=(task_transfer_event_id IS NOT NULL)))
  )
);
CREATE UNIQUE INDEX task_handoff_one_open_per_task
  ON service.task_handoff_requests(task_id) WHERE status='PROPOSED';
CREATE INDEX task_handoff_recipient_idx
  ON service.task_handoff_requests(to_principal_id,status,expires_at);

CREATE TABLE service.task_handoff_events (
  handoff_event_id uuid PRIMARY KEY,
  handoff_id uuid NOT NULL REFERENCES service.task_handoff_requests,
  event_kind text NOT NULL CHECK (event_kind IN
    ('PROPOSED','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
  actor_principal_id uuid NOT NULL REFERENCES auth.principals,
  reason_code text NOT NULL CHECK (reason_code ~ '^[A-Z0-9_]{2,80}$'),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX task_handoff_events_request_idx
  ON service.task_handoff_events(handoff_id,occurred_at,handoff_event_id);

CREATE FUNCTION service.protect_task_handoff_request() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'TASK_HANDOFF_DELETE_FORBIDDEN'; END IF;
  IF OLD.status<>'PROPOSED' OR NEW.status NOT IN
      ('ACCEPTED','REJECTED','CANCELLED','EXPIRED')
     OR NEW.revision<>2 OR NEW.decided_at IS NULL
     OR NEW.decided_by_principal_id IS NULL OR NEW.decision_event_id IS NULL
     OR ROW(NEW.handoff_id,NEW.task_id,NEW.service_project_id,
       NEW.organization_id,NEW.from_principal_id,NEW.to_principal_id,
       NEW.to_project_assignment_id,NEW.scope_code,NEW.reason_code,
       NEW.proposed_at,NEW.expires_at,NEW.request_nonce)
       IS DISTINCT FROM
       ROW(OLD.handoff_id,OLD.task_id,OLD.service_project_id,
       OLD.organization_id,OLD.from_principal_id,OLD.to_principal_id,
       OLD.to_project_assignment_id,OLD.scope_code,OLD.reason_code,
       OLD.proposed_at,OLD.expires_at,OLD.request_nonce) THEN
    RAISE EXCEPTION 'TASK_HANDOFF_TRANSITION_INVALID';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER task_handoff_request_protected BEFORE UPDATE OR DELETE
  ON service.task_handoff_requests FOR EACH ROW
  EXECUTE FUNCTION service.protect_task_handoff_request();

CREATE FUNCTION service.reject_task_handoff_event_change() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
  RAISE EXCEPTION 'TASK_HANDOFF_EVENT_IMMUTABLE';
END
$fn$;
CREATE TRIGGER task_handoff_event_immutable BEFORE UPDATE OR DELETE
  ON service.task_handoff_events FOR EACH ROW
  EXECUTE FUNCTION service.reject_task_handoff_event_change();

CREATE FUNCTION service.task_handoff_actor_ready() RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth
RETURN coalesce(
  auth.workspace_context_is_live()
  AND auth.current_workspace_kind()='STAFF'
  AND auth.current_workspace_role() IN
    ('STAFF_ADMIN','STAFF_ADVISOR','STAFF_OPERATIONS')
  AND auth.current_workspace_principal_id() IS NOT NULL
  AND auth.current_workspace_organization_id() IS NOT NULL,false
);

CREATE FUNCTION service.task_handoff_party_is_current(
  p_project uuid,p_assignment uuid,p_principal uuid,p_organization uuid
) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,service
RETURN coalesce(EXISTS(
  SELECT 1 FROM service.project_assignments a
  JOIN service.project_assignment_organization_scopes s
    ON s.project_assignment_id=a.project_assignment_id
  JOIN auth.principals p ON p.principal_id=a.principal_id
  JOIN core.organization_memberships m
    ON m.person_id=p.person_id AND m.organization_id=s.organization_id
  JOIN auth.workspace_role_bindings b
    ON b.organization_membership_id=m.organization_membership_id
      AND b.principal_id=p.principal_id
  WHERE a.project_assignment_id=p_assignment
    AND a.service_project_id=p_project AND a.principal_id=p_principal
    AND a.status='ACTIVE' AND a.valid_from<=clock_timestamp()
    AND (a.valid_until IS NULL OR a.valid_until>clock_timestamp())
    AND a.assignment_role IN
      ('PROJECT_OWNER','PROJECT_MANAGER','SPECIALIST','COORDINATOR')
    AND s.organization_id=p_organization AND p.status='ACTIVE'
    AND m.status='ACTIVE' AND m.valid_from<=clock_timestamp()
    AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
    AND b.status='ACTIVE' AND b.workspace_kind='STAFF'
    AND b.role_code IN ('STAFF_ADMIN','STAFF_ADVISOR','STAFF_OPERATIONS')
    AND b.valid_from<=clock_timestamp()
    AND (b.valid_until IS NULL OR b.valid_until>clock_timestamp())
),false);

CREATE FUNCTION service.propose_task_handoff(
  p_handoff uuid,p_task uuid,p_to_assignment uuid,p_reason text,
  p_expires_at timestamptz,p_event uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,service
AS $fn$
DECLARE v_task service.tasks%ROWTYPE;
        v_to service.project_assignments%ROWTYPE;
        v_existing service.task_handoff_requests%ROWTYPE;
        v_actor uuid:=auth.current_workspace_principal_id();
        v_org uuid:=auth.current_workspace_organization_id();
        v_now timestamptz:=clock_timestamp();
BEGIN
  IF service.task_handoff_actor_ready() IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'PROPOSE',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_SCOPE_DENIED',
      auth.current_workspace_request_nonce());
  END IF;
  SELECT * INTO v_task FROM service.tasks WHERE task_id=p_task FOR UPDATE;
  SELECT * INTO v_existing FROM service.task_handoff_requests
    WHERE handoff_id=p_handoff;
  IF v_existing.handoff_id IS NOT NULL THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'PROPOSE',
      'TASK_HANDOFF',p_handoff,
      service.task_handoff_actor_ready()
        AND v_existing.from_principal_id=v_actor
        AND v_existing.organization_id=v_org
        AND v_existing.task_id=p_task
        AND v_existing.to_project_assignment_id=p_to_assignment
        AND v_existing.reason_code=p_reason
        AND v_existing.expires_at=p_expires_at,
      'TASK_HANDOFF_IDEMPOTENCY_CHECK',auth.current_workspace_request_nonce());
  END IF;
  SELECT * INTO v_to FROM service.project_assignments
    WHERE project_assignment_id=p_to_assignment;
  IF (service.task_handoff_actor_ready()
      AND v_task.task_id IS NOT NULL AND v_task.task_status IN
        ('PENDING','IN_PROGRESS','BLOCKED')
      AND v_task.assigned_principal_id=v_actor
      AND EXISTS(SELECT 1 FROM service.projects p
        WHERE p.service_project_id=v_task.service_project_id
          AND p.project_status IN ('PLANNED','ACTIVE','ON_HOLD'))
      AND core.is_uuid_v7(p_handoff) AND core.is_uuid_v7(p_event)
      AND p_reason ~ '^[A-Z0-9_]{2,80}$'
      AND p_expires_at>v_now AND p_expires_at<=v_now+interval '7 days'
      AND v_to.principal_id IS NOT NULL AND v_to.principal_id<>v_actor
      AND EXISTS(SELECT 1 FROM service.project_assignments a
        JOIN service.project_assignment_organization_scopes s
          ON s.project_assignment_id=a.project_assignment_id
        WHERE a.service_project_id=v_task.service_project_id
          AND a.principal_id=v_actor AND s.organization_id=v_org
          AND service.task_handoff_party_is_current(
            v_task.service_project_id,a.project_assignment_id,v_actor,v_org))
      AND service.task_handoff_party_is_current(
        v_task.service_project_id,p_to_assignment,v_to.principal_id,v_org)) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'PROPOSE',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_SCOPE_DENIED',
      auth.current_workspace_request_nonce());
  END IF;
  UPDATE service.task_handoff_requests
    SET status='EXPIRED',revision=2,decided_at=v_now,
      decided_by_principal_id=v_actor,decision_event_id=gen_random_uuid()
    WHERE task_id=p_task AND status='PROPOSED' AND expires_at<=v_now;
  INSERT INTO service.task_handoff_events(
    handoff_event_id,handoff_id,event_kind,actor_principal_id,reason_code)
    SELECT decision_event_id,handoff_id,'EXPIRED',v_actor,'HANDOFF_WINDOW_ELAPSED'
      FROM service.task_handoff_requests
      WHERE task_id=p_task AND status='EXPIRED' AND decided_at=v_now;
  IF EXISTS(SELECT 1 FROM service.task_handoff_requests
    WHERE task_id=p_task AND status='PROPOSED') THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'PROPOSE',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_ALREADY_PROPOSED',
      auth.current_workspace_request_nonce());
  END IF;
  INSERT INTO service.task_handoff_requests(
    handoff_id,task_id,service_project_id,organization_id,
    from_principal_id,to_principal_id,to_project_assignment_id,
    status,reason_code,expires_at,request_nonce)
  VALUES(p_handoff,p_task,v_task.service_project_id,v_org,
    v_actor,v_to.principal_id,p_to_assignment,'PROPOSED',p_reason,p_expires_at,
    auth.current_workspace_request_nonce());
  INSERT INTO service.task_handoff_events(
    handoff_event_id,handoff_id,event_kind,actor_principal_id,reason_code)
  VALUES(p_event,p_handoff,'PROPOSED',v_actor,p_reason);
  RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'PROPOSE',
    'TASK_HANDOFF',p_handoff,true,'TASK_HANDOFF_PROPOSED',
    auth.current_workspace_request_nonce());
END
$fn$;

CREATE FUNCTION service.accept_task_handoff(
  p_handoff uuid,p_expected_revision integer,p_task_event uuid,p_handoff_event uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,service
AS $fn$
DECLARE v_task service.tasks%ROWTYPE;
        v_handoff service.task_handoff_requests%ROWTYPE;
        v_actor uuid:=auth.current_workspace_principal_id();
        v_org uuid:=auth.current_workspace_organization_id();
        v_now timestamptz:=clock_timestamp();
BEGIN
  IF service.task_handoff_actor_ready() IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'ACCEPT',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_RECIPIENT_DENIED',
      auth.current_workspace_request_nonce());
  END IF;
  SELECT task_id INTO v_handoff.task_id FROM service.task_handoff_requests
    WHERE handoff_id=p_handoff;
  SELECT * INTO v_task FROM service.tasks WHERE task_id=v_handoff.task_id FOR UPDATE;
  SELECT * INTO v_handoff FROM service.task_handoff_requests
    WHERE handoff_id=p_handoff FOR UPDATE;
  IF (service.task_handoff_actor_ready() AND v_handoff.to_principal_id=v_actor
      AND v_handoff.organization_id=v_org) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'ACCEPT',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_RECIPIENT_DENIED',
      auth.current_workspace_request_nonce());
  END IF;
  IF v_handoff.status='ACCEPTED'
     AND v_handoff.task_transfer_event_id=p_task_event
     AND v_handoff.decision_event_id=p_handoff_event THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'ACCEPT',
      'TASK_HANDOFF',p_handoff,true,'TASK_HANDOFF_IDEMPOTENT_REPLAY',
      auth.current_workspace_request_nonce());
  END IF;
  IF (v_handoff.status='PROPOSED' AND p_expected_revision=1
      AND v_handoff.expires_at>v_now
      AND core.is_uuid_v7(p_task_event) AND core.is_uuid_v7(p_handoff_event)
      AND v_task.task_id=v_handoff.task_id
      AND v_task.service_project_id=v_handoff.service_project_id
      AND v_task.task_status IN ('PENDING','IN_PROGRESS','BLOCKED')
      AND v_task.assigned_principal_id=v_handoff.from_principal_id
      AND EXISTS(SELECT 1 FROM service.projects p
        WHERE p.service_project_id=v_handoff.service_project_id
          AND p.project_status IN ('PLANNED','ACTIVE','ON_HOLD'))
      AND EXISTS(SELECT 1 FROM service.project_assignments a
        JOIN service.project_assignment_organization_scopes s
          ON s.project_assignment_id=a.project_assignment_id
        WHERE a.service_project_id=v_handoff.service_project_id
          AND a.principal_id=v_handoff.from_principal_id
          AND s.organization_id=v_org
          AND service.task_handoff_party_is_current(
            v_handoff.service_project_id,a.project_assignment_id,
            v_handoff.from_principal_id,v_org))
      AND service.task_handoff_party_is_current(
        v_handoff.service_project_id,v_handoff.to_project_assignment_id,
        v_actor,v_org)) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'ACCEPT',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_STALE_OR_SCOPE_DENIED',
      auth.current_workspace_request_nonce());
  END IF;
  UPDATE service.tasks SET assigned_principal_id=v_actor,
      updated_by_principal_id=v_actor,updated_at=v_now
    WHERE task_id=v_task.task_id;
  INSERT INTO service.task_events(
    task_event_id,task_id,event_kind,from_assignee_principal_id,
    to_assignee_principal_id,reason_code,actor_principal_id)
  VALUES(p_task_event,v_task.task_id,'TRANSFERRED',
    v_handoff.from_principal_id,v_actor,v_handoff.reason_code,v_actor);
  UPDATE service.task_handoff_requests
    SET status='ACCEPTED',revision=2,decided_at=v_now,
      decided_by_principal_id=v_actor,decision_event_id=p_handoff_event,
      task_transfer_event_id=p_task_event
    WHERE handoff_id=p_handoff;
  INSERT INTO service.task_handoff_events(
    handoff_event_id,handoff_id,event_kind,actor_principal_id,reason_code)
  VALUES(p_handoff_event,p_handoff,'ACCEPTED',v_actor,v_handoff.reason_code);
  RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'ACCEPT',
    'TASK_HANDOFF',p_handoff,true,'TASK_HANDOFF_ACCEPTED',
    auth.current_workspace_request_nonce());
END
$fn$;

CREATE FUNCTION service.decline_task_handoff(
  p_handoff uuid,p_action text,p_expected_revision integer,p_event uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,service
AS $fn$
DECLARE v service.task_handoff_requests%ROWTYPE;
        v_actor uuid:=auth.current_workspace_principal_id();
        v_org uuid:=auth.current_workspace_organization_id();
BEGIN
  IF service.task_handoff_actor_ready() IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'DECLINE',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_DECISION_DENIED',
      auth.current_workspace_request_nonce());
  END IF;
  SELECT * INTO v FROM service.task_handoff_requests
    WHERE handoff_id=p_handoff FOR UPDATE;
  IF v.handoff_id IS NOT NULL AND v.status=p_action
      AND v.decision_event_id=p_event
      AND v.organization_id=v_org
      AND ((p_action='REJECTED' AND v.to_principal_id=v_actor)
        OR (p_action='CANCELLED' AND v.from_principal_id=v_actor)) THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'DECLINE',
      'TASK_HANDOFF',p_handoff,true,'TASK_HANDOFF_IDEMPOTENT_REPLAY',
      auth.current_workspace_request_nonce());
  END IF;
  IF (service.task_handoff_actor_ready()
      AND v.handoff_id IS NOT NULL AND v.organization_id=v_org
      AND v.status='PROPOSED' AND v.expires_at>clock_timestamp()
      AND p_expected_revision=1 AND core.is_uuid_v7(p_event)
      AND ((p_action='REJECTED' AND v.to_principal_id=v_actor)
        OR (p_action='CANCELLED' AND v.from_principal_id=v_actor))) IS NOT TRUE THEN
    RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'DECLINE',
      'TASK_HANDOFF',p_handoff,false,'TASK_HANDOFF_DECISION_DENIED',
      auth.current_workspace_request_nonce());
  END IF;
  UPDATE service.task_handoff_requests SET status=p_action,revision=2,
    decided_at=clock_timestamp(),decided_by_principal_id=v_actor,
    decision_event_id=p_event WHERE handoff_id=p_handoff;
  INSERT INTO service.task_handoff_events(
    handoff_event_id,handoff_id,event_kind,actor_principal_id,reason_code)
  VALUES(p_event,p_handoff,p_action,v_actor,v.reason_code);
  RETURN auth.record_workspace_decision(v_actor,NULL,NULL,'DECLINE',
    'TASK_HANDOFF',p_handoff,true,'TASK_HANDOFF_'||p_action,
    auth.current_workspace_request_nonce());
END
$fn$;

CREATE FUNCTION service.read_task_handoff_inbox() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,service
AS $fn$
DECLARE v_actor uuid:=auth.current_workspace_principal_id();
        v_org uuid:=auth.current_workspace_organization_id();
        v_items jsonb; v_count integer;
BEGIN
  IF service.task_handoff_actor_ready() IS NOT TRUE THEN
    PERFORM auth.record_workspace_decision(v_actor,NULL,NULL,'READ',
      'TASK_HANDOFF_INBOX',NULL,false,'TASK_HANDOFF_SCOPE_DENIED',
      auth.current_workspace_request_nonce());
    RETURN jsonb_build_object('status','DENY','data',NULL);
  END IF;
  SELECT count(*),coalesce(jsonb_agg(jsonb_build_object(
    'handoffId',q.handoff_id,'taskId',q.task_id,
    'serviceProjectId',q.service_project_id,
    'direction',q.direction,'expiresAt',q.expires_at,
    'revision',q.revision) ORDER BY q.proposed_at DESC,q.handoff_id),'[]'::jsonb)
    INTO v_count,v_items
  FROM (
    SELECT h.handoff_id,h.task_id,h.service_project_id,h.expires_at,
      h.revision,h.proposed_at,
      CASE WHEN h.to_principal_id=v_actor THEN 'INCOMING'
        ELSE 'OUTGOING' END AS direction
    FROM service.task_handoff_requests h
    WHERE h.organization_id=v_org AND h.status='PROPOSED'
      AND h.expires_at>clock_timestamp()
      AND EXISTS(SELECT 1 FROM service.projects p
        WHERE p.service_project_id=h.service_project_id
          AND p.project_status IN ('PLANNED','ACTIVE','ON_HOLD'))
      AND ((h.to_principal_id=v_actor
          AND service.task_handoff_party_is_current(
            h.service_project_id,h.to_project_assignment_id,v_actor,v_org))
        OR (h.from_principal_id=v_actor AND EXISTS(
          SELECT 1 FROM service.project_assignments a
          WHERE a.service_project_id=h.service_project_id
            AND a.principal_id=v_actor
            AND service.task_handoff_party_is_current(
              h.service_project_id,a.project_assignment_id,v_actor,v_org))))
    ORDER BY h.proposed_at DESC,h.handoff_id LIMIT 101
  ) q;
  IF v_count>100 THEN
    PERFORM auth.record_workspace_decision(v_actor,NULL,NULL,'READ',
      'TASK_HANDOFF_INBOX',NULL,false,'TASK_HANDOFF_RESULT_LIMIT_EXCEEDED',
      auth.current_workspace_request_nonce());
    RETURN jsonb_build_object('status','UNAVAILABLE','data',NULL);
  END IF;
  PERFORM auth.record_workspace_decision(v_actor,NULL,NULL,'READ',
    'TASK_HANDOFF_INBOX',NULL,true,'TASK_HANDOFF_INBOX_AUTHORIZED',
    auth.current_workspace_request_nonce());
  RETURN jsonb_build_object('status','ALLOW','data',jsonb_build_object(
    'contractVersion','task-handoff-inbox.v1','asOf',clock_timestamp(),
    'items',v_items));
END
$fn$;

ALTER TABLE service.task_handoff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service.task_handoff_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE service.task_handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE service.task_handoff_events FORCE ROW LEVEL SECURITY;
CREATE POLICY task_handoff_requests_migrator ON service.task_handoff_requests
  FOR ALL TO phoenix_canonical_migrator USING (true) WITH CHECK (true);
CREATE POLICY task_handoff_events_migrator ON service.task_handoff_events
  FOR ALL TO phoenix_canonical_migrator USING (true) WITH CHECK (true);

REVOKE ALL ON service.task_handoff_requests,service.task_handoff_events
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,
    phoenix_canonical_context_binder,phoenix_canonical_workspace_reader;
REVOKE ALL ON FUNCTION
  service.protect_task_handoff_request(),
  service.reject_task_handoff_event_change(),
  service.task_handoff_actor_ready(),
  service.task_handoff_party_is_current(uuid,uuid,uuid,uuid),
  service.propose_task_handoff(uuid,uuid,uuid,text,timestamptz,uuid),
  service.accept_task_handoff(uuid,integer,uuid,uuid),
  service.decline_task_handoff(uuid,text,integer,uuid),
  service.read_task_handoff_inbox()
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  service.propose_task_handoff(uuid,uuid,uuid,text,timestamptz,uuid),
  service.accept_task_handoff(uuid,integer,uuid,uuid),
  service.decline_task_handoff(uuid,text,integer,uuid),
  service.read_task_handoff_inbox()
TO phoenix_canonical_workspace_reader;

COMMIT;
