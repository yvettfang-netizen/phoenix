BEGIN;

-- P1 forward candidate only. Depends on 0038_service_project_workbench.sql.
-- This is a read-only, customer-facing projection over the existing Service
-- Project authority. It does not create a customer, family, contract, payment,
-- task, milestone or project master.

CREATE FUNCTION service.workbench_summary(
  p_limit integer DEFAULT 20,
  p_cursor_at timestamptz DEFAULT NULL,
  p_cursor_project uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,service,audit,pg_temp AS $fn$
DECLARE
  v_as_of timestamptz := clock_timestamp();
  v_expires_at timestamptz;
  v_rows jsonb;
  v_has_more boolean := false;
  v_last_at timestamptz;
  v_last_project uuid;
BEGIN
  -- Keep the page bounded at the database boundary. Invalid values are
  -- rejected instead of silently truncating the caller's requested page.
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50
    OR (p_cursor_at IS NULL AND p_cursor_project IS NOT NULL)
    OR (p_cursor_at IS NOT NULL AND p_cursor_project IS NULL)
  THEN
    RETURN jsonb_build_object('status','INVALID');
  END IF;

  v_expires_at := v_as_of + interval '60 seconds';

  WITH authorized AS (
    SELECT
      p.service_project_id,
      p.project_name,
      p.primary_domain,
      p.project_status,
      p.updated_at,
      w.current_stage,
      row_number() OVER (
        PARTITION BY p.service_project_id
        ORDER BY
          CASE a.assignment_role
            WHEN 'PROJECT_OWNER' THEN 1
            WHEN 'PROJECT_MANAGER' THEN 2
            WHEN 'SPECIALIST' THEN 3
            WHEN 'COORDINATOR' THEN 4
            ELSE 5
          END,
          a.valid_from DESC,
          a.project_assignment_id DESC
      ) AS adviser_rank,
      n.display_name AS adviser_name
    FROM service.projects p
    JOIN service.workbench_settings w USING (service_project_id)
    LEFT JOIN service.project_assignments a
      ON a.service_project_id=p.service_project_id
     AND a.status='ACTIVE'
     AND a.valid_from<=v_as_of
     AND (a.valid_until IS NULL OR a.valid_until>v_as_of)
     AND EXISTS (SELECT FROM auth.principals live WHERE live.principal_id=a.principal_id
       AND live.status='ACTIVE' AND live.principal_kind='ADVISOR')
    LEFT JOIN auth.principals q
      ON q.principal_id=a.principal_id
     AND q.status='ACTIVE'
     AND q.principal_kind='ADVISOR'
    LEFT JOIN core.people n ON n.person_id=q.person_id
    WHERE service.workbench_can_read(p.service_project_id)
      AND (service.workbench_staff(p.service_project_id) OR service.workbench_opened(p.service_project_id))
      AND (p_cursor_at IS NULL OR (p.updated_at,p.service_project_id)<(p_cursor_at,p_cursor_project))
  ), projected AS (
    SELECT
      a.*,
      CASE WHEN a.primary_domain='HEALTH' THEN NULL ELSE coalesce((
        SELECT jsonb_build_object(
          'id',m.project_milestone_id,
          'title',m.milestone_title,
          'target_at',m.target_at
        )
        FROM service.project_milestones m
        WHERE m.service_project_id=a.service_project_id
          AND m.status='PENDING'
        ORDER BY m.target_at NULLS LAST,m.project_milestone_id
        LIMIT 1
      ), 'null'::jsonb) END AS next_milestone,
      CASE WHEN a.primary_domain='HEALTH' THEN 0 ELSE (
        SELECT count(*)::integer
        FROM service.tasks t
        JOIN service.workbench_task_scope s USING (task_id)
        WHERE t.service_project_id=a.service_project_id
          AND s.audience='CLIENT'
          AND t.task_status NOT IN ('COMPLETED','CANCELLED')
          AND service.workbench_subject(a.service_project_id,s.subject_person_id)
      ) END AS customer_todo_count,
      CASE WHEN a.primary_domain='HEALTH' THEN 0 ELSE (
        SELECT count(*)::integer
        FROM service.tasks t
        JOIN service.workbench_task_scope s USING (task_id)
        WHERE t.service_project_id=a.service_project_id
          AND s.audience='CLIENT'
          AND t.task_status NOT IN ('COMPLETED','CANCELLED')
          AND t.due_at IS NOT NULL
          AND t.due_at<v_as_of
          AND service.workbench_subject(a.service_project_id,s.subject_person_id)
      ) END AS overdue_count,
      CASE WHEN a.primary_domain='HEALTH' THEN NULL ELSE (
        SELECT concat_ws(
          ' ',
          e.command_kind,
          nullif(e.result->>'toStatus',''),
          nullif(e.result->>'outcome',''),
          nullif(e.result->>'action','')
        )
        FROM service.workbench_events e
        WHERE e.service_project_id=a.service_project_id
          AND e.audience='CLIENT'
          AND (e.subject_person_id IS NULL OR service.workbench_subject(a.service_project_id,e.subject_person_id))
        ORDER BY e.occurred_at DESC,e.event_id DESC
        LIMIT 1
      ) END AS latest_progress
    FROM authorized a
    WHERE a.adviser_rank=1
    ORDER BY a.updated_at DESC,a.service_project_id DESC
    LIMIT p_limit+1
  ), bounded AS (
    SELECT * FROM projected ORDER BY updated_at DESC,service_project_id DESC
  ), marked AS (
    SELECT b.*, count(*) OVER () > p_limit AS has_more,
      row_number() OVER (ORDER BY b.updated_at DESC,b.service_project_id DESC) AS page_row
    FROM bounded b
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'service_project_id',m.service_project_id,
      'name',m.project_name,
      'compass',m.primary_domain,
      'status',m.project_status,
      'current_stage',m.current_stage,
      'adviser',m.adviser_name,
      'next_milestone',m.next_milestone,
      'customer_todo_count',m.customer_todo_count,
      'overdue_count',m.overdue_count,
      'latest_progress',nullif(m.latest_progress,''),
      'detail_href','/en/my-services/'||m.service_project_id::text
    ) ORDER BY m.updated_at DESC,m.service_project_id DESC)
      FILTER (WHERE m.page_row<=p_limit),'[]'::jsonb),
    coalesce(bool_or(m.has_more),false),
    max(m.updated_at) FILTER (WHERE m.page_row=p_limit),
    (array_agg(m.service_project_id ORDER BY m.page_row)
      FILTER (WHERE m.page_row=p_limit))[1]
  )
  INTO v_rows,v_has_more,v_last_at,v_last_project
  FROM marked m;

  PERFORM audit.record_access_event(
    'READ','SERVICE_PROJECT_SUMMARY',NULL,'ALLOW','AUTHORIZED_PROJECT_SUMMARY'
  );

  RETURN jsonb_build_object(
    'status','ALLOW',
    'data',jsonb_build_object(
      'schemaVersion','service-project-summary.v1',
      'projects',v_rows,
      'as_of',v_as_of,
      'expires_at',v_expires_at,
      'next_cursor',CASE WHEN v_has_more AND v_last_at IS NOT NULL
        THEN jsonb_build_object('at',v_last_at,'project',v_last_project)::text
        ELSE NULL END
    )
  );
END
$fn$;

REVOKE ALL ON FUNCTION service.workbench_summary(integer,timestamptz,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION service.workbench_summary(integer,timestamptz,uuid)
  TO phoenix_canonical_service_workbench;

COMMIT;
