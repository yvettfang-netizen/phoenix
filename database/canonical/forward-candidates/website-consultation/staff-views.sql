BEGIN;
-- Unnumbered candidate. Reuse the existing staff grants; introduce no new role,
-- identity, organization mapping, family authorization or business record store.
CREATE FUNCTION crm.website_consultation_staff_actor(p_issuer text,p_subject text)
RETURNS uuid LANGUAGE sql VOLATILE SET search_path=pg_catalog
RETURN (SELECT p.principal_id FROM auth.principals p
  WHERE pg_has_role(session_user,'phoenix_website_consultation_staff_gateway','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_website_intake','MEMBER')
    AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
    AND length(p_issuer) BETWEEN 1 AND 500 AND length(p_subject) BETWEEN 1 AND 500
    AND p.principal_id=auth.resolve_external_identity(p_issuer,p_subject)
    AND p.principal_kind='ADVISOR' AND p.person_id IS NOT NULL AND p.status='ACTIVE');
REVOKE ALL ON FUNCTION crm.website_consultation_staff_actor(text,text) FROM PUBLIC;

CREATE FUNCTION crm.list_website_consultation_staff_views(p_issuer text,p_subject text)
RETURNS TABLE(view_kind text) LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $views$
  SELECT DISTINCT g.grant_kind FROM crm.website_consultation_staff_grants g
  JOIN core.organizations o ON o.organization_id=g.organization_id AND o.status='ACTIVE'
  WHERE g.principal_id=crm.website_consultation_staff_actor(p_issuer,p_subject)
    AND g.revoked_at IS NULL AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
  ORDER BY g.grant_kind
$views$;
REVOKE ALL ON FUNCTION crm.list_website_consultation_staff_views(text,text) FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.list_website_consultation_staff_views(text,text)
  TO phoenix_website_consultation_staff_gateway;

CREATE FUNCTION crm.website_consultation_view_scope(p_actor uuid,p_lead uuid,p_view text)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog
RETURN p_view IN ('DISPATCHER','ADVISER') AND EXISTS (
  SELECT 1 FROM crm.leads l JOIN crm.website_consultation_intake i USING(lead_id)
  JOIN crm.website_consultation_staff_grants g ON g.service_domain=i.service_domain
  WHERE l.lead_id=p_lead AND l.lead_status<>'MERGED' AND g.principal_id=p_actor
    AND g.grant_kind=p_view AND g.revoked_at IS NULL
    AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
    AND crm.website_consultation_org_allows(l.lead_id,g.organization_id)
    AND (p_view='DISPATCHER' OR l.assigned_principal_id=p_actor OR EXISTS (
      SELECT 1 FROM crm.follow_ups f WHERE f.lead_id=l.lead_id
        AND f.assigned_principal_id=p_actor AND f.status='PENDING'
    ))
);
REVOKE ALL ON FUNCTION crm.website_consultation_view_scope(uuid,uuid,text) FROM PUBLIC;

CREATE FUNCTION crm.read_website_consultation_staff_view(p_issuer text,p_subject text,p_view text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $view$
DECLARE employee uuid; result jsonb;
BEGIN
  employee := crm.website_consultation_staff_actor(p_issuer,p_subject);
  IF employee IS NULL OR p_view NOT IN ('DISPATCHER','ADVISER') OR p_view IS NULL
    OR NOT EXISTS (SELECT 1 FROM crm.list_website_consultation_staff_views(p_issuer,p_subject) v
      WHERE v.view_kind=p_view) THEN RETURN NULL; END IF;

  -- Scope before aggregation, history projection and the 100-row display limit.
  -- Family-linked records stay behind the existing family/Consent/project APIs.
  WITH scoped AS MATERIALIZED (
    SELECT l.lead_id,l.lead_status,l.assigned_principal_id,i.service_domain,i.locale,i.recorded_at,
      i.contact_envelope IS NOT NULL AND i.contact_expires_at>clock_timestamp()
        AND l.lead_status NOT IN ('DISQUALIFIED','LOST','CONVERTED') AS contact_live,
      f.follow_up_id,f.status AS task_status,f.due_at
    FROM crm.leads l JOIN crm.website_consultation_intake i USING(lead_id)
    LEFT JOIN LATERAL (
      SELECT t.follow_up_id,t.status,t.due_at FROM crm.follow_ups t
      JOIN crm.lead_events e ON e.lead_event_id=t.follow_up_id
      WHERE t.lead_id=l.lead_id AND t.assigned_principal_id=l.assigned_principal_id
        AND e.lead_id=l.lead_id AND e.reason_code='WEBSITE_CONSULTATION_ASSIGNED'
      ORDER BY t.created_at DESC,t.follow_up_id LIMIT 1
    ) f ON true
    WHERE crm.website_consultation_view_scope(employee,l.lead_id,p_view)
  ), displayed AS (
    SELECT * FROM scoped ORDER BY recorded_at DESC,lead_id DESC LIMIT 100
  )
  SELECT jsonb_build_object('view',p_view,'asOf',clock_timestamp(),'timeZone','Asia/Shanghai',
    'summary',(SELECT jsonb_build_object(
      'total',count(*),'newToday',count(*) FILTER (WHERE (recorded_at AT TIME ZONE 'Asia/Shanghai')::date=(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date),
      'unassigned',count(*) FILTER (WHERE assigned_principal_id IS NULL AND lead_status='NEW'),
      'contacted',count(*) FILTER (WHERE lead_status='CONTACTED'),
      'pending',count(*) FILTER (WHERE task_status='PENDING'),
      'overdue',count(*) FILTER (WHERE task_status='PENDING' AND due_at<=clock_timestamp()),
      'dueToday',count(*) FILTER (WHERE task_status='PENDING' AND (due_at AT TIME ZONE 'Asia/Shanghai')::date=(clock_timestamp() AT TIME ZONE 'Asia/Shanghai')::date),
      'completed',count(*) FILTER (WHERE task_status='COMPLETED')) FROM scoped),
    'services',(SELECT coalesce(jsonb_agg(jsonb_build_object('service',service_domain,'count',n) ORDER BY service_domain),'[]'::jsonb)
      FROM (SELECT service_domain,count(*) AS n FROM scoped GROUP BY service_domain) domains),
    'workload',CASE WHEN p_view='DISPATCHER' THEN (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'assigneeId',assigned_principal_id,'pending',pending,'overdue',overdue) ORDER BY assigned_principal_id),'[]'::jsonb)
      FROM (SELECT assigned_principal_id,count(*) FILTER (WHERE task_status='PENDING') AS pending,
        count(*) FILTER (WHERE task_status='PENDING' AND due_at<=clock_timestamp()) AS overdue
        FROM scoped WHERE assigned_principal_id IS NOT NULL GROUP BY assigned_principal_id) people) ELSE '[]'::jsonb END,
    'items',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'leadId',s.lead_id,'service',s.service_domain,'locale',s.locale,'receivedAt',s.recorded_at,
      'status',s.lead_status,'assigneeId',s.assigned_principal_id,
      'nextDueAt',CASE WHEN s.task_status='PENDING' THEN s.due_at END,'taskStatus',s.task_status,
      'canReveal',p_view='ADVISER' AND s.contact_live,
      'canAssign',p_view='DISPATCHER' AND s.contact_live AND s.lead_status='NEW' AND s.assigned_principal_id IS NULL,
      'canReassign',p_view='DISPATCHER' AND s.contact_live AND s.lead_status='NEW' AND s.task_status='PENDING',
      'canCancel',p_view='DISPATCHER' AND s.lead_status IN ('NEW','CONTACTED') AND s.task_status='PENDING',
      'canComplete',p_view='ADVISER' AND s.assigned_principal_id=employee AND s.lead_status IN ('NEW','CONTACTED') AND s.task_status='PENDING',
      'history',(SELECT coalesce(jsonb_agg(h.entry ORDER BY h.at DESC),'[]'::jsonb) FROM (
        SELECT jsonb_build_object('kind',e.event_kind,'reason',e.reason_code,'at',e.occurred_at) AS entry,e.occurred_at AS at
        FROM crm.lead_events e WHERE e.lead_id=s.lead_id AND e.reason_code LIKE 'WEBSITE_CONSULTATION_%'
        ORDER BY e.occurred_at DESC,e.lead_event_id DESC LIMIT 5
      ) h)) ORDER BY s.recorded_at DESC,s.lead_id DESC),'[]'::jsonb) FROM displayed s),
    'limited',(SELECT count(*)>100 FROM scoped)) INTO result;
  RETURN result;
END
$view$;
REVOKE ALL ON FUNCTION crm.read_website_consultation_staff_view(text,text,text) FROM PUBLIC,
  phoenix_canonical_app,phoenix_canonical_reader,phoenix_website_intake;
GRANT EXECUTE ON FUNCTION crm.read_website_consultation_staff_view(text,text,text)
  TO phoenix_website_consultation_staff_gateway;
COMMIT;
