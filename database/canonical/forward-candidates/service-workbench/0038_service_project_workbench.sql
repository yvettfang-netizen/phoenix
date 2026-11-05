BEGIN;
-- Forward candidate only. Applied solely to owned synthetic clusters by verification.
-- No Person, Family, Client, Contract, Payment or Service Project master is added.
CREATE ROLE phoenix_canonical_service_workbench NOLOGIN NOINHERIT NOSUPERUSER
 NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA auth,service TO phoenix_canonical_service_workbench;
DO $grant$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO phoenix_canonical_service_workbench',current_database()); END $grant$;
GRANT EXECUTE ON FUNCTION auth.redeem_context_ticket(uuid,uuid),auth.clear_context()
 TO phoenix_canonical_service_workbench;

CREATE TABLE service.workbench_settings (
 service_project_id uuid PRIMARY KEY REFERENCES service.projects,
 template_kind text NOT NULL CHECK(template_kind IN('HK_MASTERS','GENERAL')),
 service_scope text NOT NULL CHECK(length(btrim(service_scope)) BETWEEN 1 AND 2000),
 current_stage text NOT NULL CHECK(current_stage IN('DISCOVERY','SCHOOL_SELECTION','MATERIALS','SUBMISSION','INTERVIEW','DECISION','DEPOSIT','CLOSED')),
 document_retention_until timestamptz NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0)
);
CREATE TABLE service.workbench_events (
 event_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(event_id)),
 service_project_id uuid NOT NULL REFERENCES service.projects,
 subject_person_id uuid REFERENCES core.people,
 actor_principal_id uuid NOT NULL REFERENCES auth.principals,
 command_kind text NOT NULL CHECK(command_kind ~ '^[A-Z_]{3,40}$'),
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 16 AND 100),
 payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[0-9a-f]{64}$'),
 audience text NOT NULL CHECK(audience IN('CLIENT','STAFF')),
 result jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_principal_id,idempotency_key)
);
CREATE INDEX workbench_events_project_time ON service.workbench_events(service_project_id,occurred_at,event_id);
CREATE TABLE service.workbench_commercial_events (
 event_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(event_id)),
 service_project_id uuid NOT NULL REFERENCES service.projects,
 source_system text NOT NULL CHECK(source_system='phoenix_operations'),
 source_event_id text NOT NULL CHECK(length(source_event_id) BETWEEN 1 AND 200),
 event_kind text NOT NULL CHECK(event_kind IN('CONTRACT_SIGNED','CONTRACT_CANCELLED','PAYMENT_CONFIRMED','PAYMENT_WAIVED','PAYMENT_REVERSED','OPENING_APPROVED','OPENING_REVOKED')),
 external_reference text NOT NULL CHECK(length(btrim(external_reference)) BETWEEN 1 AND 300),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[0-9a-f]{64}$'),
 source_version bigint NOT NULL CHECK(source_version>0),
 occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 UNIQUE(source_system,source_event_id), UNIQUE(service_project_id,source_version)
);
CREATE TABLE service.workbench_applications (
 application_id uuid PRIMARY KEY REFERENCES education.applications,
 service_project_id uuid NOT NULL REFERENCES service.projects,
 intake_year integer NOT NULL CHECK(intake_year BETWEEN 2000 AND 2200),
 application_round text NOT NULL CHECK(length(btrim(application_round)) BETWEEN 1 AND 100),
 deadline_at timestamptz, submitted_at timestamptz,
 application_reference text CHECK(length(application_reference) BETWEEN 1 AND 200),
 interview_required boolean NOT NULL DEFAULT false,
 additional_requirements text NOT NULL DEFAULT '' CHECK(length(additional_requirements)<=2000),
 outcome text NOT NULL DEFAULT 'PENDING' CHECK(outcome IN('PENDING','OFFER','REJECTED','WAITLISTED','WITHDRAWN')),
 offer_version_id uuid REFERENCES docs.document_versions,
 deposit_due_at timestamptz, deposit_reference text CHECK(length(deposit_reference)<=200),
 UNIQUE(application_id,service_project_id)
);
CREATE TABLE service.workbench_materials (
 version_id uuid PRIMARY KEY REFERENCES docs.document_versions,
 service_project_id uuid NOT NULL REFERENCES service.projects,
 review_status text NOT NULL DEFAULT 'SUBMITTED' CHECK(review_status IN('SUBMITTED','APPROVED','CHANGES_REQUESTED')),
 submitted_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 mime_type text NOT NULL CHECK(mime_type IN('text/plain','application/pdf')),
 reviewed_by_principal_id uuid REFERENCES auth.principals,
 review_note text NOT NULL DEFAULT '' CHECK(length(review_note)<=2000),
 reviewed_at timestamptz,
 CHECK((review_status='SUBMITTED' AND reviewed_by_principal_id IS NULL AND reviewed_at IS NULL)
 OR (review_status<>'SUBMITTED' AND reviewed_by_principal_id IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE TABLE service.workbench_task_scope (
 task_id uuid PRIMARY KEY REFERENCES service.tasks,
 subject_person_id uuid NOT NULL REFERENCES core.people,
 audience text NOT NULL CHECK(audience IN('CLIENT','STAFF'))
);
CREATE TABLE service.workbench_messages (
 message_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(message_id)),
 service_project_id uuid NOT NULL REFERENCES service.projects,
 subject_person_id uuid NOT NULL REFERENCES core.people,
 author_principal_id uuid NOT NULL REFERENCES auth.principals,
 audience text NOT NULL CHECK(audience IN('CLIENT','STAFF')),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE FUNCTION service.workbench_staff(p_project uuid,p_manage boolean DEFAULT false) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,service,core,casework,pg_temp AS $fn$
 SELECT coalesce(auth.write_context_is_live()
 AND EXISTS(SELECT FROM auth.principals n WHERE n.principal_id=auth.current_principal_id() AND n.status='ACTIVE'
   AND n.person_id=auth.current_actor_person_id() AND n.principal_kind='ADVISOR')
 AND auth.current_channel()='ADVISOR'
 AND EXISTS(SELECT FROM casework.cases c JOIN casework.advisor_assignments a USING(case_id)
   WHERE c.family_id=auth.current_family_id() AND c.status IN('OPEN','PAUSED')
    AND a.advisor_person_id=auth.current_actor_person_id() AND a.lifecycle_status='ACTIVE' AND a.revoked_at IS NULL
    AND a.valid_from<=clock_timestamp() AND a.valid_until>clock_timestamp())
 AND EXISTS(SELECT FROM service.projects p JOIN service.project_assignments a USING(service_project_id)
   WHERE p.service_project_id=p_project AND p.family_id=auth.current_family_id()
    AND a.principal_id=auth.current_principal_id() AND a.valid_from<=clock_timestamp()
    AND ((a.status='ACTIVE' AND (a.valid_until IS NULL OR a.valid_until>clock_timestamp()))
      OR (p.project_status IN('COMPLETED','CANCELLED') AND a.status='ENDED' AND a.valid_until=p.completed_at
          AND a.ended_by_principal_id=p.updated_by_principal_id))
    AND (NOT p_manage OR a.assignment_role IN('PROJECT_OWNER','PROJECT_MANAGER'))),false)
$fn$;
CREATE FUNCTION service.workbench_subject(p_project uuid,p_subject uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,service,core,consent,pg_temp AS $fn$
 SELECT coalesce(auth.write_context_is_live() AND EXISTS(
 SELECT FROM service.projects p JOIN service.project_subjects s USING(service_project_id)
 WHERE p.service_project_id=p_project AND p.family_id=auth.current_family_id() AND s.subject_person_id=p_subject
 AND ((s.status='ACTIVE' AND s.valid_from<=clock_timestamp() AND (s.valid_until IS NULL OR s.valid_until>clock_timestamp()))
   OR (p.project_status IN('COMPLETED','CANCELLED') AND s.status='ENDED' AND s.valid_until=p.completed_at
       AND s.ended_by_principal_id=p.updated_by_principal_id))
 AND EXISTS(SELECT FROM core.family_memberships m WHERE m.family_id=p.family_id AND m.person_id=p_subject
   AND m.valid_from<=clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp()))
 AND (service.workbench_staff(p_project) AND
       (p.primary_domain<>'EDUCATION' OR consent.has_active_consent(p_subject,'EDUCATION_CASE','EDUCATION'))
   OR auth.current_channel()='FAMILY' AND EXISTS(
      SELECT FROM auth.principals n JOIN core.family_memberships m ON m.person_id=n.person_id
      WHERE n.principal_id=auth.current_principal_id() AND n.status='ACTIVE' AND n.principal_kind='FAMILY'
       AND n.person_id=auth.current_actor_person_id() AND m.family_id=p.family_id
       AND m.valid_from<=clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp()))
    AND (p_subject=auth.current_actor_person_id() OR
      core.current_civil_capacity(p_subject)='MINOR_VERIFIED' AND EXISTS(
        SELECT FROM core.guardian_authorities g WHERE g.family_id=p.family_id AND g.subject_person_id=p_subject AND g.evidence_level='VERIFIED'
        AND g.guardian_person_id=auth.current_actor_person_id() AND g.lifecycle_status='ACTIVE' AND g.revoked_at IS NULL
        AND g.valid_from<=clock_timestamp() AND g.valid_until>clock_timestamp()
        AND (g.scope=p.primary_domain OR g.scope='GENERAL' AND p.primary_domain='EDUCATION'))))
 AND (p.primary_domain<>'HEALTH' OR EXISTS(
   SELECT FROM service.project_subject_authorizations h WHERE h.project_subject_authorization_id=s.authorization_id
    AND h.status='ACTIVE' AND h.valid_from<=clock_timestamp() AND h.valid_until>clock_timestamp() AND h.revoked_at IS NULL
    AND (service.workbench_staff(p_project) OR h.authorizer_person_id=auth.current_actor_person_id())))
 ),false)
$fn$;
CREATE FUNCTION service.workbench_can_read(p_project uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,service,pg_temp AS $fn$
 SELECT EXISTS(SELECT FROM service.project_subjects s WHERE s.service_project_id=p_project
   AND service.workbench_subject(p_project,s.subject_person_id))
$fn$;
CREATE FUNCTION service.workbench_opened(p_project uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,service,pg_temp AS $fn$
 SELECT coalesce(
 (SELECT event_kind='CONTRACT_SIGNED' FROM service.workbench_commercial_events WHERE service_project_id=p_project AND event_kind LIKE 'CONTRACT_%' ORDER BY source_version DESC LIMIT 1)
 AND (SELECT event_kind IN('PAYMENT_CONFIRMED','PAYMENT_WAIVED') FROM service.workbench_commercial_events WHERE service_project_id=p_project AND event_kind LIKE 'PAYMENT_%' ORDER BY source_version DESC LIMIT 1)
 AND (SELECT event_kind='OPENING_APPROVED' FROM service.workbench_commercial_events WHERE service_project_id=p_project AND event_kind LIKE 'OPENING_%' ORDER BY source_version DESC LIMIT 1)
 AND (SELECT max(source_version) FROM service.workbench_commercial_events WHERE service_project_id=p_project AND event_kind LIKE 'OPENING_%')>
 (SELECT max(source_version) FROM service.workbench_commercial_events WHERE service_project_id=p_project AND (event_kind LIKE 'CONTRACT_%' OR event_kind LIKE 'PAYMENT_%')),false)
$fn$;

-- Source reference ingestion only: no browser contract/payment write authority.
CREATE FUNCTION service.record_workbench_commercial_event(p_id uuid,p_project uuid,p_source_event text,p_kind text,p_ref text,p_sha text,p_version bigint,p_at timestamptz) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,core,service,operations_ref,audit,pg_temp AS $fn$
BEGIN
 IF (operations_ref.is_operations_service() AND core.is_uuid_v7(p_id)
   AND EXISTS(SELECT FROM service.projects WHERE service_project_id=p_project AND family_id=auth.current_family_id())
   AND p_at<=clock_timestamp() AND p_version>0) IS NOT TRUE THEN
   RETURN audit.record_write_decision('RECORD','SERVICE_COMMERCIAL_REFERENCE',p_project,false,'SOURCE_AUTHORITY_REQUIRED');
 END IF;
 PERFORM 1 FROM service.projects WHERE service_project_id=p_project FOR UPDATE;
 IF EXISTS(SELECT FROM service.workbench_commercial_events WHERE source_event_id=p_source_event) THEN
  RETURN EXISTS(SELECT FROM service.workbench_commercial_events WHERE source_event_id=p_source_event AND service_project_id=p_project
    AND event_kind=p_kind AND external_reference=p_ref AND evidence_sha256=p_sha AND source_version=p_version AND occurred_at=p_at);
 END IF;
 IF EXISTS(SELECT FROM service.workbench_commercial_events WHERE service_project_id=p_project AND source_version>=p_version)
   OR p_kind='OPENING_APPROVED' AND (
    (SELECT event_kind FROM service.workbench_commercial_events WHERE service_project_id=p_project AND event_kind LIKE 'CONTRACT_%' ORDER BY source_version DESC LIMIT 1) IS DISTINCT FROM 'CONTRACT_SIGNED'
    OR coalesce((SELECT event_kind IN('PAYMENT_CONFIRMED','PAYMENT_WAIVED') FROM service.workbench_commercial_events WHERE service_project_id=p_project AND event_kind LIKE 'PAYMENT_%' ORDER BY source_version DESC LIMIT 1),false)=false)
 THEN RETURN audit.record_write_decision('RECORD','SERVICE_COMMERCIAL_REFERENCE',p_project,false,'SOURCE_VERSION_OR_OPENING_PRECONDITION_DENIED'); END IF;
 INSERT INTO service.workbench_commercial_events VALUES(p_id,p_project,'phoenix_operations',p_source_event,p_kind,p_ref,p_sha,p_version,p_at,clock_timestamp(),auth.current_principal_id());
 RETURN audit.record_write_decision('RECORD','SERVICE_COMMERCIAL_REFERENCE',p_project,true,'SOURCE_REFERENCE_RECORDED');
END $fn$;

CREATE FUNCTION service.workbench_snapshot(p_project uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,core,service,education,docs,audit,pg_temp AS $fn$
DECLARE v jsonb; is_staff boolean; manage boolean; commercial boolean;
BEGIN
 IF NOT service.workbench_can_read(p_project) OR (NOT service.workbench_staff(p_project) AND NOT service.workbench_opened(p_project)) THEN
  PERFORM audit.record_access_event('READ','SERVICE_WORKBENCH',p_project,'DENY','PROJECT_SCOPE_DENIED');
  RETURN jsonb_build_object('status','DENY');
 END IF;
 is_staff:=service.workbench_staff(p_project);manage:=service.workbench_staff(p_project,true);
 commercial:=is_staff OR EXISTS(SELECT FROM service.project_parties a WHERE a.service_project_id=p_project AND a.person_id=auth.current_actor_person_id()
   AND a.party_role IN('PAYER','CONTRACTING_PARTY') AND a.status='ACTIVE' AND a.valid_from<=clock_timestamp() AND (a.valid_until IS NULL OR a.valid_until>clock_timestamp()));
 SELECT jsonb_build_object('schemaVersion','service-workbench.v1','project',jsonb_build_object(
  'id',p.service_project_id,'code',p.project_code,'title',p.project_name,'domain',p.primary_domain,'status',p.project_status,
  'stage',w.current_stage,'scope',w.service_scope,'template',w.template_kind,'revision',w.revision,
  'opened',service.workbench_opened(p_project),'staff',is_staff,'write',service.workbench_writer(p_project),'manage',manage,'clinicalEnabled',false,'viewerPrincipalId',auth.current_principal_id()),
 'subjects',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.subject_person_id,'name',n.display_name,'documentsAllowed',(p.primary_domain='EDUCATION' AND docs.can_read_document(s.subject_person_id,CASE WHEN p.primary_domain='EDUCATION' THEN 'EDUCATION' ELSE 'GENERAL' END)),'principalId',(SELECT q.principal_id FROM auth.principals q WHERE q.person_id=n.person_id AND q.principal_kind='FAMILY' AND q.status='ACTIVE')) ORDER BY n.display_name),'[]'::jsonb)
   FROM service.project_subjects s JOIN core.people n ON n.person_id=s.subject_person_id WHERE s.service_project_id=p_project AND service.workbench_subject(p_project,s.subject_person_id)),
 'team',(SELECT coalesce(jsonb_agg(jsonb_build_object('principalId',a.principal_id,'name',n.display_name,'role',a.assignment_role)),'[]'::jsonb)
   FROM service.project_assignments a JOIN auth.principals q ON q.principal_id=a.principal_id JOIN core.people n ON n.person_id=q.person_id
   WHERE a.service_project_id=p_project AND a.status='ACTIVE' AND a.valid_from<=clock_timestamp() AND (a.valid_until IS NULL OR a.valid_until>clock_timestamp()) AND q.status='ACTIVE'),
 'milestones',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.project_milestone_id,'title',m.milestone_title,'status',m.status,'targetAt',m.target_at) ORDER BY m.target_at NULLS LAST),'[]'::jsonb) FROM service.project_milestones m WHERE m.service_project_id=p_project),
 'tasks',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.task_id,'title',t.task_title,'status',t.task_status,'priority',t.priority,'dueAt',t.due_at,'assignee',t.assigned_principal_id,'subjectId',x.subject_person_id,'audience',x.audience) ORDER BY t.due_at NULLS LAST),'[]'::jsonb)
   FROM service.tasks t JOIN service.workbench_task_scope x USING(task_id) WHERE t.service_project_id=p_project AND service.workbench_subject(p_project,x.subject_person_id) AND (is_staff OR x.audience='CLIENT')),
 'applications',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.application_id,'subjectId',a.student_person_id,'institutionId',a.institution_id,'programId',a.program_id,
    'institution',i.name,'program',g.name,'status',a.status,'year',x.intake_year,'round',x.application_round,'deadlineAt',x.deadline_at,'submittedAt',x.submitted_at,
    'reference',x.application_reference,'interviewRequired',x.interview_required,'requirements',x.additional_requirements,'outcome',x.outcome,'offerVersionId',CASE WHEN EXISTS(SELECT FROM docs.document_versions ov JOIN docs.documents od USING(document_id) WHERE ov.version_id=x.offer_version_id AND docs.can_read_document(od.subject_person_id,od.data_class)) THEN x.offer_version_id END,
    'depositDueAt',x.deposit_due_at,'depositReference',x.deposit_reference) ORDER BY x.deadline_at NULLS LAST),'[]'::jsonb)
   FROM service.workbench_applications x JOIN education.applications a USING(application_id) JOIN education.institution i USING(institution_id) JOIN education.program g USING(program_id)
   WHERE x.service_project_id=p_project AND service.workbench_subject(p_project,a.student_person_id)),
 'materials',(SELECT coalesce(jsonb_agg(jsonb_build_object('documentId',d.document_id,'versionId',v.version_id,'version',v.version_no,'kind',d.document_kind,
    'subjectId',d.subject_person_id,'status',m.review_status,'reviewNote',m.review_note,'submittedBy',m.submitted_by_principal_id,'mime',m.mime_type,'createdAt',v.created_at) ORDER BY v.created_at DESC),'[]'::jsonb)
   FROM service.workbench_materials m JOIN docs.document_versions v USING(version_id) JOIN docs.documents d USING(document_id)
   WHERE p.primary_domain<>'HEALTH' AND m.service_project_id=p_project AND d.withdrawn_at IS NULL AND d.retention_until>clock_timestamp() AND service.workbench_subject(p_project,d.subject_person_id) AND docs.can_read_document(d.subject_person_id,d.data_class)),
 'deliverables',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.deliverable_id,'kind',d.deliverable_kind,'status',d.status,'versionId',d.document_version_id,
   'round',d.submission_round,'dueAt',d.due_at,'createdBy',d.created_by_principal_id,'updatedBy',d.updated_by_principal_id,'reviewedBy',d.reviewed_by_principal_id)),'[]'::jsonb)
   FROM service.deliverables d JOIN docs.documents x ON x.document_id=d.document_id WHERE p.primary_domain<>'HEALTH' AND d.service_project_id=p_project AND service.workbench_subject(p_project,x.subject_person_id) AND docs.can_read_document(x.subject_person_id,x.data_class) AND x.withdrawn_at IS NULL AND x.retention_until>clock_timestamp()),
 'messages',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.message_id,'body',m.body,'audience',m.audience,'subjectId',m.subject_person_id,'at',m.created_at,'author',n.display_name) ORDER BY m.created_at),'[]'::jsonb)
   FROM service.workbench_messages m JOIN auth.principals q ON q.principal_id=m.author_principal_id JOIN core.people n ON n.person_id=q.person_id
   WHERE p.primary_domain<>'HEALTH' AND m.service_project_id=p_project AND service.workbench_subject(p_project,m.subject_person_id) AND (is_staff OR m.audience='CLIENT')),
 'events',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.event_id,'kind',e.command_kind,'at',e.occurred_at,
   'fromStatus',e.result->>'fromStatus','toStatus',e.result->>'toStatus','outcome',e.result->>'outcome','actor',n.display_name,'compensatesEventId',e.result->>'compensatesEventId') ORDER BY e.occurred_at),'[]'::jsonb)
   FROM service.workbench_events e JOIN auth.principals q ON q.principal_id=e.actor_principal_id LEFT JOIN core.people n ON n.person_id=q.person_id
   WHERE e.service_project_id=p_project AND (e.subject_person_id IS NULL OR service.workbench_subject(p_project,e.subject_person_id)) AND (is_staff OR e.audience='CLIENT')),
 'commercial',CASE WHEN commercial THEN jsonb_build_object('availability','SOURCE_REFERENCES_ONLY','events',
   (SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.event_kind,'reference',c.external_reference,'source',c.source_system,'at',c.occurred_at) ORDER BY c.source_version),'[]'::jsonb)
    FROM service.workbench_commercial_events c WHERE c.service_project_id=p_project))
   ELSE jsonb_build_object('availability','NOT_AUTHORIZED') END
 ) INTO v FROM service.projects p JOIN service.workbench_settings w USING(service_project_id) WHERE p.service_project_id=p_project;
 IF v IS NULL THEN RETURN jsonb_build_object('status','UNAVAILABLE'); END IF;
 PERFORM audit.record_access_event('READ','SERVICE_WORKBENCH',p_project,'ALLOW','PROJECT_PROJECTION');
 RETURN jsonb_build_object('status','ALLOW','data',v);
END $fn$;

CREATE FUNCTION service.workbench_list() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,service,audit,pg_temp AS $fn$
DECLARE v jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.service_project_id,'title',p.project_name,'domain',p.primary_domain,'status',p.project_status,
  'stage',w.current_stage,'opened',service.workbench_opened(p.service_project_id),'template',w.template_kind) ORDER BY p.updated_at DESC),'[]'::jsonb) INTO v
 FROM service.projects p JOIN service.workbench_settings w USING(service_project_id)
 WHERE service.workbench_can_read(p.service_project_id) AND (service.workbench_staff(p.service_project_id) OR service.workbench_opened(p.service_project_id));
 PERFORM audit.record_access_event('READ','SERVICE_WORKBENCH_LIST',NULL,'ALLOW','AUTHORIZED_PROJECT_LIST');
 RETURN jsonb_build_object('status','ALLOW','data',jsonb_build_object('schemaVersion','service-project-list.v1','items',v));
END $fn$;
CREATE FUNCTION service.workbench_writer(p_project uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,service,pg_temp AS $fn$
 SELECT service.workbench_staff(p_project) AND EXISTS(SELECT FROM service.project_assignments a
 WHERE a.service_project_id=p_project AND a.principal_id=auth.current_principal_id() AND a.status='ACTIVE'
 AND a.assignment_role IN('PROJECT_OWNER','PROJECT_MANAGER','SPECIALIST','COORDINATOR')
 AND (a.valid_until IS NULL OR a.valid_until>clock_timestamp()))
$fn$;
CREATE FUNCTION service.workbench_command(p_project uuid,p_kind text,p_body jsonb,p_key text,p_event uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,service,education,docs,audit,pg_temp AS $fn$
DECLARE p service.projects%ROWTYPE; w service.workbench_settings%ROWTYPE;
 old service.workbench_events%ROWTYPE; t service.tasks%ROWTYPE; a education.applications%ROWTYPE;
 x service.workbench_applications%ROWTYPE; d docs.documents%ROWTYPE; dv docs.document_versions%ROWTYPE;
 delivery service.deliverables%ROWTYPE; v_id uuid; doc_id uuid; subject uuid; assignee uuid;
 is_staff boolean; manage boolean; n text; previous text; audience text:='CLIENT'; reason text;
 payload_hash text; result jsonb:='{}'::jsonb; fields text[]; error_code text;
BEGIN
 IF p_kind IS NULL OR p_kind !~ '^[A-Z_]{3,40}$' OR jsonb_typeof(p_body) IS DISTINCT FROM 'object' OR p_key IS NULL OR length(p_key) NOT BETWEEN 16 AND 100
   OR NOT core.is_uuid_v7(p_event) THEN RETURN jsonb_build_object('status','INVALID'); END IF;
 IF NOT service.workbench_can_read(p_project) OR (NOT service.workbench_staff(p_project) AND NOT service.workbench_opened(p_project)) THEN
  PERFORM audit.record_access_event('WRITE','SERVICE_WORKBENCH',p_project,'DENY','PROJECT_SCOPE_DENIED');
  RETURN jsonb_build_object('status','DENY');
 END IF;
 -- Lock the key independently of project; the same key cannot target two projects.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.current_principal_id()::text||':'||p_key,0));
 payload_hash:=encode(sha256(convert_to(jsonb_build_array(p_project,p_kind,p_body-ARRAY['eventId','versionId','newDocumentId','storageKey'])::text,'UTF8')),'hex');
 SELECT * INTO old FROM service.workbench_events WHERE actor_principal_id=auth.current_principal_id() AND idempotency_key=p_key;
 IF FOUND THEN
  IF old.subject_person_id IS NOT NULL AND service.workbench_subject(p_project,old.subject_person_id) IS NOT TRUE THEN
   PERFORM audit.record_write_decision(p_kind,'SERVICE_WORKBENCH',p_project,false,'REPLAY_SUBJECT_AUTHORITY_REVOKED');RETURN jsonb_build_object('status','DENY');
  END IF;
  IF p_kind LIKE 'MATERIAL_%' OR p_kind LIKE 'DELIVERABLE_%' THEN
   SELECT z.* INTO d FROM docs.documents z WHERE z.document_id=(old.result->>'documentId')::uuid
    OR EXISTS(SELECT FROM docs.document_versions v WHERE v.document_id=z.document_id AND v.version_id=(old.result->>'versionId')::uuid)
    OR EXISTS(SELECT FROM service.deliverables q WHERE q.document_id=z.document_id AND q.deliverable_id=(old.result->>'deliverableId')::uuid);
   IF d.document_id IS NULL OR d.withdrawn_at IS NOT NULL OR d.retention_until<=clock_timestamp() OR docs.can_read_document(d.subject_person_id,d.data_class) IS NOT TRUE THEN
    PERFORM audit.record_write_decision(p_kind,'SERVICE_WORKBENCH',p_project,false,'REPLAY_DOCUMENT_AUTHORITY_REVOKED');RETURN jsonb_build_object('status','DENY');
   END IF;
  END IF;
  IF old.service_project_id=p_project AND old.payload_sha256=payload_hash THEN
   RETURN jsonb_build_object('status','ALLOW','result',old.result,'replayed',true);
  END IF;
  RETURN jsonb_build_object('status','CONFLICT');
 END IF;
 SELECT * INTO p FROM service.projects WHERE service_project_id=p_project FOR UPDATE;
 SELECT * INTO w FROM service.workbench_settings WHERE service_project_id=p_project FOR UPDATE;
 is_staff:=service.workbench_writer(p_project);manage:=service.workbench_staff(p_project,true);
 BEGIN
  IF (p_body->>'revision')::integer IS DISTINCT FROM w.revision THEN RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001'; END IF;
  IF p.project_status IN('COMPLETED','CANCELLED') THEN RAISE EXCEPTION 'PROJECT_TERMINAL' USING ERRCODE='40001'; END IF;
  IF p_kind<>'PROJECT_STATUS' AND (p.project_status<>'ACTIVE' OR NOT service.workbench_opened(p_project)) THEN
   RAISE EXCEPTION 'PROJECT_NOT_OPEN' USING ERRCODE='42501';
  END IF;
  IF p_kind NOT IN('PROJECT_STATUS','STAGE','MILESTONE_STATUS')
    AND p.primary_domain='HEALTH' THEN RAISE EXCEPTION 'CLINICAL_PATH_CLOSED' USING ERRCODE='42501'; END IF;
  fields:=CASE p_kind
   WHEN 'MESSAGE' THEN ARRAY['revision','subjectId','body','audience']
   WHEN 'STAGE' THEN ARRAY['revision','stage']
   WHEN 'TASK_CREATE' THEN ARRAY['revision','id','subjectId','title','priority','assignee','dueAt','audience']
   WHEN 'TASK_STATUS' THEN ARRAY['revision','id','status','reason']
   WHEN 'MILESTONE_STATUS' THEN ARRAY['revision','id','status']
   WHEN 'APPLICATION_CREATE' THEN ARRAY['revision','id','subjectId','institutionId','programId','year','round','deadlineAt']
   WHEN 'APPLICATION_UPDATE' THEN ARRAY['revision','id','action','reference','source','submittedAt','outcome','offerVersionId','interviewRequired','requirements','depositDueAt','depositReference','deadlineAt']
   WHEN 'MATERIAL_UPLOAD' THEN ARRAY['revision','subjectId','documentId','newDocumentId','versionId','sha256','storageKey','size','kind','mime']
   WHEN 'MATERIAL_REVIEW' THEN ARRAY['revision','id','status','note']
   WHEN 'DELIVERABLE_CREATE' THEN ARRAY['revision','id','versionId','kind','dueAt']
   WHEN 'DELIVERABLE_SUBMIT' THEN ARRAY['revision','id']
   WHEN 'DELIVERABLE_REVIEW' THEN ARRAY['revision','id','decision','reason']
   WHEN 'DELIVERABLE_ACCEPT' THEN ARRAY['revision','id']
   WHEN 'PROJECT_STATUS' THEN ARRAY['revision','status','reason']
   ELSE NULL END;
  IF p_kind IN('STAGE','TASK_CREATE','PROJECT_STATUS') THEN fields:=fields||ARRAY['compensatesEventId','compensationReason']; END IF;
  IF p_body?'compensatesEventId' AND (NOT manage OR nullif(p_body->>'compensationReason','') IS NULL OR (p_body->>'compensationReason') !~ '^[A-Z0-9_]{2,80}$' OR NOT EXISTS(SELECT FROM service.workbench_events e WHERE e.event_id=(p_body->>'compensatesEventId')::uuid AND e.service_project_id=p_project)) THEN RAISE EXCEPTION 'COMPENSATION_AUTHORITY_REQUIRED' USING ERRCODE='42501'; END IF;
  IF fields IS NULL OR EXISTS(SELECT FROM jsonb_object_keys(p_body) k WHERE NOT k=ANY(fields)) THEN
   RAISE EXCEPTION 'UNKNOWN_COMMAND_FIELDS' USING ERRCODE='22023'; END IF;
  IF p_kind IN('MESSAGE','TASK_CREATE','APPLICATION_CREATE','MATERIAL_UPLOAD') THEN
   subject:=(p_body->>'subjectId')::uuid;
   IF service.workbench_subject(p_project,subject) IS NOT TRUE THEN RAISE EXCEPTION 'SUBJECT_DENIED' USING ERRCODE='42501'; END IF;
  END IF;
  CASE p_kind
  WHEN 'MESSAGE' THEN
   audience:=coalesce(p_body->>'audience','CLIENT');
   IF audience NOT IN('CLIENT','STAFF') OR audience='STAFF' AND NOT is_staff THEN RAISE EXCEPTION 'AUDIENCE_DENIED' USING ERRCODE='42501'; END IF;
   INSERT INTO service.workbench_messages VALUES(p_event,p_project,subject,auth.current_principal_id(),audience,btrim(p_body->>'body'),clock_timestamp());
   result:=jsonb_build_object('messageId',p_event);
  WHEN 'STAGE' THEN
   IF NOT is_staff THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
   UPDATE service.workbench_settings SET current_stage=p_body->>'stage' WHERE service_project_id=p_project;
  WHEN 'TASK_CREATE' THEN
   IF NOT is_staff THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
   v_id:=(p_body->>'id')::uuid;assignee:=(p_body->>'assignee')::uuid;audience:=coalesce(p_body->>'audience','CLIENT');
   IF audience NOT IN('CLIENT','STAFF') OR NOT EXISTS(SELECT FROM auth.principals n WHERE n.principal_id=assignee AND n.status='ACTIVE'
    AND (EXISTS(SELECT FROM service.project_assignments z WHERE z.service_project_id=p_project AND z.principal_id=n.principal_id AND z.status='ACTIVE' AND z.valid_from<=clock_timestamp() AND (z.valid_until IS NULL OR z.valid_until>clock_timestamp()))
      OR n.principal_kind='FAMILY' AND n.person_id=subject)) THEN RAISE EXCEPTION 'ASSIGNEE_DENIED' USING ERRCODE='42501'; END IF;
   INSERT INTO service.tasks(task_id,service_project_id,task_type,task_title,task_status,priority,assigned_principal_id,due_at,created_by_principal_id,updated_by_principal_id)
    VALUES(v_id,p_project,'WORKBENCH_ACTION',btrim(p_body->>'title'),'PENDING',p_body->>'priority',assignee,(p_body->>'dueAt')::timestamptz,auth.current_principal_id(),auth.current_principal_id());
   INSERT INTO service.workbench_task_scope VALUES(v_id,subject,audience);
   INSERT INTO service.task_events(task_event_id,task_id,event_kind,to_status,reason_code,actor_principal_id)
    VALUES(p_event,v_id,'CREATED','PENDING','WORKBENCH_TASK_CREATED',auth.current_principal_id());
   result:=jsonb_build_object('taskId',v_id);
  WHEN 'TASK_STATUS' THEN
   SELECT * INTO t FROM service.tasks WHERE task_id=(p_body->>'id')::uuid AND service_project_id=p_project FOR UPDATE;
   SELECT s.subject_person_id,s.audience INTO subject,audience FROM service.workbench_task_scope s WHERE s.task_id=t.task_id;
   n:=p_body->>'status';
   IF t.task_id IS NULL OR service.workbench_subject(p_project,subject) IS NOT TRUE
     OR NOT is_staff AND (t.assigned_principal_id IS DISTINCT FROM auth.current_principal_id() OR audience<>'CLIENT' OR n='CANCELLED')
     THEN RAISE EXCEPTION 'TASK_DENIED' USING ERRCODE='42501'; END IF;
   IF NOT ((t.task_status='PENDING' AND n IN('IN_PROGRESS','BLOCKED','CANCELLED'))
    OR(t.task_status='IN_PROGRESS' AND n IN('BLOCKED','COMPLETED','CANCELLED'))
    OR(t.task_status='BLOCKED' AND n IN('IN_PROGRESS','CANCELLED'))) THEN RAISE EXCEPTION 'TASK_TRANSITION' USING ERRCODE='40001'; END IF;
   reason:=p_body->>'reason';
   IF reason IS NULL OR reason !~ '^[A-Z0-9_]{2,80}$' THEN RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE='22023'; END IF;
   UPDATE service.tasks SET task_status=n,completed_at=CASE WHEN n='COMPLETED' THEN clock_timestamp() END,updated_at=clock_timestamp(),updated_by_principal_id=auth.current_principal_id() WHERE task_id=t.task_id;
   INSERT INTO service.task_events(task_event_id,task_id,event_kind,from_status,to_status,reason_code,actor_principal_id)
    VALUES(p_event,t.task_id,'STATUS_CHANGED',t.task_status,n,reason,auth.current_principal_id());
  WHEN 'MILESTONE_STATUS' THEN
   IF NOT is_staff THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
   n:=p_body->>'status';
   UPDATE service.project_milestones SET status=n,achieved_at=CASE WHEN n='ACHIEVED' THEN clock_timestamp() END,updated_at=clock_timestamp()
    WHERE project_milestone_id=(p_body->>'id')::uuid AND service_project_id=p_project AND status='PENDING' AND n IN('ACHIEVED','CANCELLED');
   IF NOT FOUND THEN RAISE EXCEPTION 'MILESTONE_TRANSITION' USING ERRCODE='40001'; END IF;
  WHEN 'APPLICATION_CREATE' THEN
   IF NOT is_staff OR w.template_kind<>'HK_MASTERS' OR p.primary_domain<>'EDUCATION' THEN RAISE EXCEPTION 'TEMPLATE_DENIED' USING ERRCODE='42501'; END IF;
   v_id:=(p_body->>'id')::uuid;
   IF EXISTS(SELECT FROM service.workbench_applications z JOIN education.applications y USING(application_id)
    WHERE z.service_project_id=p_project AND y.student_person_id=subject AND y.program_id=(p_body->>'programId')::uuid
    AND z.intake_year=(p_body->>'year')::integer AND lower(z.application_round)=lower(p_body->>'round')) THEN
    RAISE EXCEPTION 'APPLICATION_ROUND_ALREADY_EXISTS' USING ERRCODE='40001'; END IF;
   IF NOT EXISTS(SELECT FROM education.program g JOIN education.institution i USING(institution_id)
     WHERE g.program_id=(p_body->>'programId')::uuid AND i.institution_id=(p_body->>'institutionId')::uuid
       AND g.status='ACTIVE' AND i.status='ACTIVE' AND i.country_code='HK' AND upper(btrim(g.level))='MASTER') THEN RAISE EXCEPTION 'CATALOGUE_MISMATCH' USING ERRCODE='22023'; END IF;
   INSERT INTO education.applications(application_id,family_id,student_person_id,institution_id,program_id,institution_label,program_label,cycle_label,status)
    SELECT v_id,p.family_id,subject,i.institution_id,g.program_id,i.name,g.name,(p_body->>'year')||' / '||(p_body->>'round'),'DRAFT'
    FROM education.program g JOIN education.institution i USING(institution_id) WHERE g.program_id=(p_body->>'programId')::uuid;
   INSERT INTO service.workbench_applications(application_id,service_project_id,intake_year,application_round,deadline_at)
    VALUES(v_id,p_project,(p_body->>'year')::integer,p_body->>'round',(p_body->>'deadlineAt')::timestamptz);
   result:=jsonb_build_object('applicationId',v_id);
  WHEN 'APPLICATION_UPDATE' THEN
   SELECT * INTO x FROM service.workbench_applications WHERE application_id=(p_body->>'id')::uuid AND service_project_id=p_project FOR UPDATE;
   SELECT * INTO a FROM education.applications WHERE application_id=x.application_id FOR UPDATE;
   subject:=a.student_person_id;
   IF NOT is_staff OR x.application_id IS NULL OR service.workbench_subject(p_project,subject) IS NOT TRUE OR a.status='WITHDRAWN'
    THEN RAISE EXCEPTION 'APPLICATION_DENIED' USING ERRCODE='42501'; END IF;
   n:=p_body->>'action';
   CASE n
    WHEN 'READY' THEN
     IF a.status<>'DRAFT' THEN RAISE EXCEPTION 'APPLICATION_TRANSITION' USING ERRCODE='40001'; END IF;
     UPDATE education.applications SET status='READY' WHERE application_id=a.application_id;
    WHEN 'SUBMIT' THEN
     IF a.status<>'READY' OR nullif(btrim(p_body->>'reference'),'') IS NULL OR nullif(btrim(p_body->>'source'),'') IS NULL
      OR (p_body->>'submittedAt')::timestamptz>clock_timestamp() OR p_body->>'submittedAt' IS NULL
      THEN RAISE EXCEPTION 'RECEIPT_REQUIRED' USING ERRCODE='22023'; END IF;
     INSERT INTO education.external_facts VALUES(p_event,a.application_id,'OFFICIAL_RECEIPT',p_body->>'source',p_body->>'reference',(p_body->>'submittedAt')::timestamptz);
     UPDATE education.applications SET status='SUBMITTED' WHERE application_id=a.application_id;
     UPDATE service.workbench_applications SET submitted_at=(p_body->>'submittedAt')::timestamptz,application_reference=p_body->>'reference' WHERE application_id=a.application_id;
    WHEN 'OUTCOME' THEN
     previous:=p_body->>'outcome';
     IF a.status NOT IN('SUBMITTED','DECIDED') OR previous NOT IN('OFFER','REJECTED','WAITLISTED','WITHDRAWN')
      OR x.outcome NOT IN('PENDING','WAITLISTED') OR previous=x.outcome
      OR nullif(btrim(p_body->>'reference'),'') IS NULL OR nullif(btrim(p_body->>'source'),'') IS NULL
      THEN RAISE EXCEPTION 'DECISION_REQUIRED' USING ERRCODE='22023'; END IF;
     IF previous='OFFER' AND NOT EXISTS(SELECT FROM docs.document_versions v JOIN docs.documents z USING(document_id)
        JOIN service.workbench_materials m USING(version_id) WHERE v.version_id=(p_body->>'offerVersionId')::uuid
        AND m.service_project_id=p_project AND m.review_status='APPROVED' AND z.subject_person_id=subject AND z.family_id=p.family_id
        AND z.withdrawn_at IS NULL AND z.retention_until>clock_timestamp() AND docs.can_read_document(z.subject_person_id,z.data_class)) THEN RAISE EXCEPTION 'OFFER_VERSION_REQUIRED' USING ERRCODE='22023'; END IF;
     INSERT INTO education.external_facts VALUES(p_event,a.application_id,'DECISION',p_body->>'source',p_body->>'reference',clock_timestamp());
     UPDATE education.applications SET status=CASE WHEN previous='WITHDRAWN' THEN 'WITHDRAWN' ELSE 'DECIDED' END WHERE application_id=a.application_id;
     UPDATE service.workbench_applications SET outcome=previous,offer_version_id=CASE WHEN previous='OFFER' THEN (p_body->>'offerVersionId')::uuid END WHERE application_id=a.application_id;
    WHEN 'REQUIREMENTS' THEN
     UPDATE service.workbench_applications SET interview_required=(p_body->>'interviewRequired')::boolean,
      additional_requirements=coalesce(p_body->>'requirements',''),deadline_at=CASE WHEN p_body?'deadlineAt' THEN (p_body->>'deadlineAt')::timestamptz ELSE deadline_at END,deposit_due_at=(p_body->>'depositDueAt')::timestamptz,deposit_reference=p_body->>'depositReference' WHERE application_id=a.application_id;
    WHEN 'WITHDRAW' THEN
     IF a.status NOT IN('DRAFT','READY','SUBMITTED') THEN RAISE EXCEPTION 'WITHDRAWAL_TRANSITION' USING ERRCODE='40001'; END IF;
     UPDATE education.applications SET status='WITHDRAWN' WHERE application_id=a.application_id;
     UPDATE service.workbench_applications SET outcome='WITHDRAWN' WHERE application_id=a.application_id;
    ELSE RAISE EXCEPTION 'APPLICATION_ACTION_INVALID' USING ERRCODE='22023';
   END CASE;
  WHEN 'MATERIAL_UPLOAD' THEN
   IF w.document_retention_until<=clock_timestamp() OR p.primary_domain<>'EDUCATION' THEN RAISE EXCEPTION 'RETENTION_OR_DOMAIN_DENIED' USING ERRCODE='42501'; END IF;
   IF docs.can_read_document(subject,CASE WHEN p.primary_domain='EDUCATION' THEN 'EDUCATION' ELSE 'GENERAL' END) IS NOT TRUE THEN RAISE EXCEPTION 'DOCUMENT_CONSENT_REQUIRED' USING ERRCODE='42501'; END IF;
   doc_id:=coalesce((p_body->>'documentId')::uuid,(p_body->>'newDocumentId')::uuid);v_id:=(p_body->>'versionId')::uuid;
   SELECT * INTO d FROM docs.documents WHERE document_id=doc_id FOR UPDATE;
   IF FOUND THEN
    IF d.family_id<>p.family_id OR d.subject_person_id<>subject OR d.withdrawn_at IS NOT NULL OR d.retention_until<=clock_timestamp()
     OR NOT EXISTS(SELECT FROM service.workbench_materials m JOIN docs.document_versions v USING(version_id) WHERE v.document_id=doc_id AND m.service_project_id=p_project)
     THEN RAISE EXCEPTION 'DOCUMENT_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
   ELSE
    INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
     VALUES(doc_id,p.family_id,subject,CASE WHEN p.primary_domain='EDUCATION' THEN 'EDUCATION' ELSE 'GENERAL' END,p_body->>'kind',w.document_retention_until);
   END IF;
   IF p_body->>'storageKey' !~ '^mock/workbench/[a-zA-Z0-9/_-]+$' OR (p_body->>'size')::bigint NOT BETWEEN 1 AND 524288 THEN
    RAISE EXCEPTION 'LOCAL_OBJECT_INVALID' USING ERRCODE='22023'; END IF;
   INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
    SELECT v_id,doc_id,coalesce(max(version_no),0)+1,p_body->>'sha256',p_body->>'storageKey',(p_body->>'size')::bigint FROM docs.document_versions WHERE document_id=doc_id;
   INSERT INTO service.workbench_materials(version_id,service_project_id,submitted_by_principal_id,mime_type) VALUES(v_id,p_project,auth.current_principal_id(),p_body->>'mime');
   result:=jsonb_build_object('documentId',doc_id,'versionId',v_id);
  WHEN 'MATERIAL_REVIEW' THEN
   IF NOT is_staff THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
   SELECT v.* INTO dv FROM docs.document_versions v JOIN service.workbench_materials m USING(version_id) WHERE v.version_id=(p_body->>'id')::uuid AND m.service_project_id=p_project;
   SELECT * INTO d FROM docs.documents WHERE document_id=dv.document_id;
   subject:=d.subject_person_id;n:=p_body->>'status';
   IF service.workbench_subject(p_project,subject) IS NOT TRUE OR docs.can_read_document(subject,d.data_class) IS NOT TRUE OR n NOT IN('APPROVED','CHANGES_REQUESTED')
     OR n='CHANGES_REQUESTED' AND nullif(btrim(p_body->>'note'),'') IS NULL THEN RAISE EXCEPTION 'REVIEW_SCOPE_OR_REASON' USING ERRCODE='42501'; END IF;
   UPDATE service.workbench_materials SET review_status=n,review_note=coalesce(p_body->>'note',''),reviewed_by_principal_id=auth.current_principal_id(),reviewed_at=clock_timestamp()
    WHERE version_id=dv.version_id AND review_status='SUBMITTED' AND submitted_by_principal_id<>auth.current_principal_id();
   IF NOT FOUND THEN RAISE EXCEPTION 'REVIEW_SEPARATION_OR_TERMINAL' USING ERRCODE='40001'; END IF;
  WHEN 'DELIVERABLE_CREATE' THEN
   IF NOT is_staff THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
   SELECT v.* INTO dv FROM docs.document_versions v JOIN service.workbench_materials m USING(version_id)
    WHERE v.version_id=(p_body->>'versionId')::uuid AND m.service_project_id=p_project AND m.review_status='APPROVED';
   SELECT * INTO d FROM docs.documents WHERE document_id=dv.document_id;subject:=d.subject_person_id;
   IF service.workbench_subject(p_project,subject) IS NOT TRUE OR docs.can_read_document(subject,d.data_class) IS NOT TRUE THEN RAISE EXCEPTION 'DELIVERY_DOCUMENT_DENIED' USING ERRCODE='42501'; END IF;
   v_id:=(p_body->>'id')::uuid;
   INSERT INTO service.deliverables(deliverable_id,service_project_id,project_subject_id,document_id,document_version_id,deliverable_kind,status,due_at,created_by_principal_id,updated_by_principal_id)
    SELECT v_id,p_project,s.project_subject_id,d.document_id,dv.version_id,p_body->>'kind','DRAFT',(p_body->>'dueAt')::timestamptz,auth.current_principal_id(),auth.current_principal_id()
     FROM service.project_subjects s WHERE s.service_project_id=p_project AND s.subject_person_id=subject AND s.status='ACTIVE' LIMIT 1;
   IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_SUBJECT_REQUIRED' USING ERRCODE='42501'; END IF;
   INSERT INTO service.delivery_events(delivery_event_id,deliverable_id,event_kind,to_status,submission_round,reason_code,document_version_id,actor_principal_id)
    VALUES(p_event,v_id,'CREATED','DRAFT',0,'WORKBENCH_DELIVERY_CREATED',dv.version_id,auth.current_principal_id());
   result:=jsonb_build_object('deliverableId',v_id);
  WHEN 'DELIVERABLE_SUBMIT','DELIVERABLE_REVIEW','DELIVERABLE_ACCEPT' THEN
   IF NOT is_staff THEN RAISE EXCEPTION 'STAFF_REQUIRED' USING ERRCODE='42501'; END IF;
   SELECT * INTO delivery FROM service.deliverables WHERE deliverable_id=(p_body->>'id')::uuid AND service_project_id=p_project FOR UPDATE;
   SELECT * INTO d FROM docs.documents WHERE document_id=delivery.document_id;subject:=d.subject_person_id;
   IF delivery.deliverable_id IS NULL OR service.workbench_subject(p_project,subject) IS NOT TRUE OR docs.can_read_document(subject,d.data_class) IS NOT TRUE OR d.withdrawn_at IS NOT NULL OR d.retention_until<=clock_timestamp()
    THEN RAISE EXCEPTION 'DELIVERY_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
   IF p_kind='DELIVERABLE_SUBMIT' THEN
    IF delivery.status NOT IN('DRAFT','CHANGES_REQUESTED') THEN RAISE EXCEPTION 'DELIVERY_TRANSITION' USING ERRCODE='40001'; END IF;
    UPDATE service.deliverables SET status='UNDER_REVIEW',submission_round=submission_round+1,reviewed_by_principal_id=NULL,reviewed_at=NULL,
      updated_by_principal_id=auth.current_principal_id(),updated_at=clock_timestamp() WHERE deliverable_id=delivery.deliverable_id;
    n:='UNDER_REVIEW';reason:='SUBMITTED';
   ELSIF p_kind='DELIVERABLE_REVIEW' THEN
    IF delivery.status<>'UNDER_REVIEW' OR delivery.updated_by_principal_id=auth.current_principal_id() THEN RAISE EXCEPTION 'REVIEW_SEPARATION' USING ERRCODE='42501'; END IF;
    n:=CASE p_body->>'decision' WHEN 'APPROVE' THEN 'REVIEW_APPROVED' WHEN 'REQUEST_CHANGES' THEN 'CHANGES_REQUESTED' END;
    IF n IS NULL OR (p_body->>'reason') !~ '^[A-Z0-9_]{2,80}$' THEN RAISE EXCEPTION 'REVIEW_DECISION_REQUIRED' USING ERRCODE='22023'; END IF;
    UPDATE service.deliverables SET status=n,reviewed_by_principal_id=auth.current_principal_id(),reviewed_at=clock_timestamp(),updated_by_principal_id=auth.current_principal_id(),updated_at=clock_timestamp() WHERE deliverable_id=delivery.deliverable_id;
    reason:=CASE WHEN n='REVIEW_APPROVED' THEN 'REVIEW_APPROVED' ELSE 'CHANGES_REQUESTED' END;
   ELSE
    IF delivery.status<>'REVIEW_APPROVED' OR delivery.reviewed_by_principal_id=auth.current_principal_id() OR delivery.created_by_principal_id=auth.current_principal_id()
     THEN RAISE EXCEPTION 'ACCEPTANCE_SEPARATION' USING ERRCODE='42501'; END IF;
    n:='ACCEPTED';reason:='ACCEPTED';
    UPDATE service.deliverables SET status=n,accepted_by_principal_id=auth.current_principal_id(),accepted_at=clock_timestamp(),delivered_at=clock_timestamp(),
     updated_by_principal_id=auth.current_principal_id(),updated_at=clock_timestamp() WHERE deliverable_id=delivery.deliverable_id;
   END IF;
   INSERT INTO service.delivery_events(delivery_event_id,deliverable_id,event_kind,from_status,to_status,submission_round,reason_code,document_version_id,actor_principal_id)
    SELECT p_event,deliverable_id,reason,delivery.status,n,submission_round,'WORKBENCH_DELIVERY_REVIEW',document_version_id,auth.current_principal_id()
     FROM service.deliverables WHERE deliverable_id=delivery.deliverable_id;
  WHEN 'PROJECT_STATUS' THEN
   IF NOT manage THEN RAISE EXCEPTION 'MANAGER_REQUIRED' USING ERRCODE='42501'; END IF;
   n:=p_body->>'status';reason:=p_body->>'reason';
   IF reason IS NULL OR reason !~ '^[A-Z0-9_]{2,80}$' OR NOT (
    p.project_status='DRAFT' AND n IN('PLANNED','CANCELLED') OR p.project_status='PLANNED' AND n IN('ACTIVE','CANCELLED')
    OR p.project_status='ACTIVE' AND n IN('ON_HOLD','COMPLETED','CANCELLED') OR p.project_status='ON_HOLD' AND n IN('ACTIVE','CANCELLED'))
    OR n='ACTIVE' AND NOT service.workbench_opened(p_project) THEN RAISE EXCEPTION 'PROJECT_TRANSITION_OR_OPENING' USING ERRCODE='40001'; END IF;
   IF n='COMPLETED' AND (EXISTS(SELECT FROM service.tasks WHERE service_project_id=p_project AND task_status NOT IN('COMPLETED','CANCELLED'))
      OR EXISTS(SELECT FROM service.project_milestones WHERE service_project_id=p_project AND status='PENDING')
      OR EXISTS(SELECT FROM service.workbench_applications WHERE service_project_id=p_project AND outcome IN('PENDING','WAITLISTED'))
      OR EXISTS(SELECT FROM service.deliverables WHERE service_project_id=p_project AND status NOT IN('ACCEPTED','WITHDRAWN'))) THEN RAISE EXCEPTION 'UNFINISHED_ACTIONS' USING ERRCODE='40001'; END IF;
   -- Match0034 terminal cleanup; archived projections never grant operational writes.
   IF n IN('COMPLETED','CANCELLED') THEN
    p.completed_at:=clock_timestamp();
    UPDATE service.project_subject_authorizations SET status='REVOKED',revoked_at=p.completed_at,revoked_by_principal_id=auth.current_principal_id() WHERE service_project_id=p_project AND status='ACTIVE';
    UPDATE service.project_parties SET status='ENDED',valid_until=p.completed_at,ended_by_principal_id=auth.current_principal_id() WHERE service_project_id=p_project AND status='ACTIVE';
    UPDATE service.project_subjects SET status='ENDED',valid_until=p.completed_at,ended_by_principal_id=auth.current_principal_id() WHERE service_project_id=p_project AND status='ACTIVE';
    UPDATE service.project_assignments SET status='ENDED',valid_until=p.completed_at,ended_by_principal_id=auth.current_principal_id() WHERE service_project_id=p_project AND status='ACTIVE';
    UPDATE service.workbench_settings SET current_stage='CLOSED' WHERE service_project_id=p_project;
   END IF;
   UPDATE service.projects SET project_status=n,completed_at=CASE WHEN n IN('COMPLETED','CANCELLED') THEN p.completed_at END,
    updated_at=clock_timestamp(),updated_by_principal_id=auth.current_principal_id() WHERE service_project_id=p_project;
   INSERT INTO service.project_events(project_event_id,service_project_id,event_kind,from_status,to_status,reason_code,actor_principal_id)
    VALUES(p_event,p_project,'STATUS_CHANGED',p.project_status,n,reason,auth.current_principal_id());
  ELSE RAISE EXCEPTION 'UNKNOWN_COMMAND' USING ERRCODE='22023';
  END CASE;
  IF p_kind='STAGE' THEN result:=result||jsonb_build_object('fromStatus',w.current_stage,'toStatus',p_body->>'stage');
  ELSIF p_kind='TASK_STATUS' THEN result:=result||jsonb_build_object('fromStatus',t.task_status,'toStatus',p_body->>'status');
  ELSIF p_kind='PROJECT_STATUS' THEN result:=result||jsonb_build_object('fromStatus',p.project_status,'toStatus',p_body->>'status');
  ELSIF p_kind='MILESTONE_STATUS' THEN result:=result||jsonb_build_object('fromStatus','PENDING','toStatus',p_body->>'status');
  ELSIF p_kind='APPLICATION_UPDATE' THEN
   SELECT result||jsonb_build_object('applicationId',a.application_id,'action',p_body->>'action','fromStatus',a.status,'toStatus',b.status,'previousOutcome',x.outcome,'outcome',z.outcome) INTO result
    FROM education.applications b JOIN service.workbench_applications z USING(application_id) WHERE b.application_id=a.application_id;
  ELSIF p_kind='MATERIAL_REVIEW' THEN result:=result||jsonb_build_object('versionId',dv.version_id,'fromStatus','SUBMITTED','toStatus',p_body->>'status');
  END IF;
  IF p_kind IN('DELIVERABLE_SUBMIT','DELIVERABLE_REVIEW','DELIVERABLE_ACCEPT') THEN result:=result||jsonb_build_object('deliverableId',delivery.deliverable_id,'fromStatus',delivery.status,'toStatus',n); END IF;
  IF p_body?'compensatesEventId' THEN result:=result||jsonb_build_object('compensatesEventId',p_body->>'compensatesEventId','compensationReason',p_body->>'compensationReason'); END IF;
  UPDATE service.workbench_settings SET revision=revision+1 WHERE service_project_id=p_project RETURNING revision INTO w.revision;
  result:=result||jsonb_build_object('revision',w.revision,'eventId',p_event);
  INSERT INTO service.workbench_events VALUES(p_event,p_project,subject,auth.current_principal_id(),p_kind,p_key,payload_hash,audience,result,clock_timestamp());
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS error_code=RETURNED_SQLSTATE;
  RAISE LOG 'PHOENIX_WORKBENCH_REJECT sqlstate=% command=%',error_code,p_kind;
  PERFORM audit.record_write_decision(p_kind,'SERVICE_WORKBENCH',p_project,false,
   CASE WHEN error_code='42501' THEN 'WORKBENCH_SCOPE_DENIED' ELSE 'WORKBENCH_STATE_OR_INPUT_DENIED' END);
  RETURN jsonb_build_object('status',CASE WHEN error_code='42501' THEN 'DENY' WHEN error_code IN('40001','23505') THEN 'CONFLICT' ELSE 'INVALID' END);
 END;
 PERFORM audit.record_write_decision(p_kind,'SERVICE_WORKBENCH',p_project,true,'WORKBENCH_COMMAND_COMMITTED');
 RETURN jsonb_build_object('status','ALLOW','result',result,'replayed',false);
END $fn$;

CREATE FUNCTION service.workbench_download(p_project uuid,p_version uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,service,docs,audit,pg_temp AS $fn$
DECLARE v jsonb;
BEGIN
 IF service.workbench_can_read(p_project) AND service.workbench_opened(p_project) THEN
 SELECT jsonb_build_object('key',d.storage_key,'sha256',d.content_sha256,'size',d.size_bytes,'mime',m.mime_type)
 INTO v FROM service.workbench_materials m JOIN docs.document_versions d USING(version_id) JOIN docs.documents x USING(document_id)
 WHERE m.service_project_id=p_project AND m.version_id=p_version AND service.workbench_subject(p_project,x.subject_person_id)
  AND x.withdrawn_at IS NULL AND x.retention_until>clock_timestamp() AND docs.can_read_document(x.subject_person_id,x.data_class)
  AND EXISTS(SELECT FROM service.projects p WHERE p.service_project_id=p_project AND p.primary_domain<>'HEALTH');
 END IF;
 PERFORM audit.record_access_event('DOWNLOAD','SERVICE_MATERIAL_VERSION',p_version,CASE WHEN v IS NULL THEN 'DENY' ELSE 'ALLOW' END,'WORKBENCH_VERSION_ACCESS');
 RETURN jsonb_build_object('status',CASE WHEN v IS NULL THEN 'DENY' ELSE 'ALLOW' END,'data',v);
END $fn$;
CREATE FUNCTION service.workbench_catalogue() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,education,audit,pg_temp AS $fn$
DECLARE v jsonb;
BEGIN
 IF NOT auth.write_context_is_live() THEN RETURN jsonb_build_object('status','DENY'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('institutionId',i.institution_id,'institution',i.name,'programId',g.program_id,'program',g.name) ORDER BY i.name,g.name),'[]'::jsonb)
 INTO v FROM education.program g JOIN education.institution i USING(institution_id) WHERE g.status='ACTIVE' AND i.status='ACTIVE' AND i.country_code='HK' AND upper(btrim(g.level))='MASTER';
 PERFORM audit.record_access_event('READ','SERVICE_APPLICATION_CATALOGUE',NULL,'ALLOW','PUBLISHED_CATALOGUE');
 RETURN jsonb_build_object('status','ALLOW','data',jsonb_build_object('items',v));
END $fn$;

CREATE FUNCTION service.protect_workbench_material() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.version_id,NEW.service_project_id,NEW.submitted_by_principal_id,NEW.mime_type)
 IS DISTINCT FROM ROW(OLD.version_id,OLD.service_project_id,OLD.submitted_by_principal_id,OLD.mime_type)
 OR OLD.review_status<>'SUBMITTED' OR NEW.review_status NOT IN('APPROVED','CHANGES_REQUESTED')
 THEN RAISE EXCEPTION 'MATERIAL_REVIEW_HISTORY_IMMUTABLE'; END IF;RETURN NEW;
END $fn$;
CREATE TRIGGER workbench_material_history BEFORE UPDATE OR DELETE ON service.workbench_materials FOR EACH ROW EXECUTE FUNCTION service.protect_workbench_material();
CREATE TRIGGER workbench_event_history BEFORE UPDATE OR DELETE ON service.workbench_events FOR EACH ROW EXECUTE FUNCTION service.reject_event_change();
CREATE TRIGGER workbench_commercial_history BEFORE UPDATE OR DELETE ON service.workbench_commercial_events FOR EACH ROW EXECUTE FUNCTION service.reject_event_change();
CREATE TRIGGER workbench_message_history BEFORE UPDATE OR DELETE ON service.workbench_messages FOR EACH ROW EXECUTE FUNCTION service.reject_event_change();

CREATE FUNCTION service.workbench_material_visible(p_version uuid,p_project uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,service,docs,pg_temp AS $fn$
 SELECT coalesce(EXISTS(SELECT FROM docs.document_versions v JOIN docs.documents d USING(document_id)
 WHERE v.version_id=p_version AND d.withdrawn_at IS NULL AND d.retention_until>clock_timestamp()
 AND service.workbench_subject(p_project,d.subject_person_id) AND docs.can_read_document(d.subject_person_id,d.data_class)),false)
$fn$;
CREATE FUNCTION service.workbench_application_visible(p_application uuid,p_project uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,service,education,pg_temp AS $fn$
 SELECT EXISTS(SELECT FROM education.applications a WHERE a.application_id=p_application AND service.workbench_subject(p_project,a.student_person_id))
$fn$;
CREATE FUNCTION service.workbench_task_visible(p_task uuid,p_subject uuid,p_audience text) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,service,pg_temp AS $fn$
 SELECT EXISTS(SELECT FROM service.tasks t WHERE t.task_id=p_task AND service.workbench_subject(t.service_project_id,p_subject)
 AND (p_audience='CLIENT' OR service.workbench_staff(t.service_project_id)))
$fn$;
REVOKE ALL ON FUNCTION service.workbench_material_visible(uuid,uuid),service.workbench_application_visible(uuid,uuid),service.workbench_task_visible(uuid,uuid,text) FROM PUBLIC;

DO $rls$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['workbench_settings','workbench_events','workbench_commercial_events','workbench_applications','workbench_materials','workbench_task_scope','workbench_messages'] LOOP
  EXECUTE format('ALTER TABLE service.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE service.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON service.%I FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_context_binder,phoenix_canonical_service_workbench',t);
 END LOOP;
END $rls$;
CREATE POLICY workbench_settings_scope ON service.workbench_settings FOR SELECT USING(service.workbench_can_read(service_project_id));
CREATE POLICY workbench_events_scope ON service.workbench_events FOR SELECT USING(service.workbench_can_read(service_project_id) AND (subject_person_id IS NULL OR service.workbench_subject(service_project_id,subject_person_id)) AND (audience='CLIENT' OR service.workbench_staff(service_project_id)));
CREATE POLICY workbench_commercial_scope ON service.workbench_commercial_events FOR SELECT USING(service.workbench_staff(service_project_id));
CREATE POLICY workbench_applications_scope ON service.workbench_applications FOR SELECT USING(service.workbench_application_visible(application_id,service_project_id));
CREATE POLICY workbench_materials_scope ON service.workbench_materials FOR SELECT USING(service.workbench_material_visible(version_id,service_project_id));
CREATE POLICY workbench_tasks_scope ON service.workbench_task_scope FOR SELECT USING(service.workbench_task_visible(task_id,subject_person_id,audience));
CREATE POLICY workbench_messages_scope ON service.workbench_messages FOR SELECT USING(service.workbench_subject(service_project_id,subject_person_id) AND (audience='CLIENT' OR service.workbench_staff(service_project_id)));
REVOKE ALL ON FUNCTION service.workbench_staff(uuid,boolean),service.workbench_subject(uuid,uuid),service.workbench_can_read(uuid),service.workbench_opened(uuid),service.workbench_writer(uuid),
 service.workbench_snapshot(uuid),service.workbench_list(),service.workbench_command(uuid,text,jsonb,text,uuid),service.workbench_download(uuid,uuid),service.workbench_catalogue(),
 service.record_workbench_commercial_event(uuid,uuid,text,text,text,text,bigint,timestamptz),service.protect_workbench_material() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION service.workbench_snapshot(uuid),service.workbench_list(),service.workbench_command(uuid,text,jsonb,text,uuid),service.workbench_download(uuid,uuid),service.workbench_catalogue()
 TO phoenix_canonical_service_workbench;
GRANT EXECUTE ON FUNCTION service.record_workbench_commercial_event(uuid,uuid,text,text,text,text,bigint,timestamptz) TO phoenix_canonical_app;

CREATE FUNCTION service.validate_workbench_link() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,service,education,docs,pg_temp AS $fn$
DECLARE v_project uuid;v_subject uuid;v_family uuid;v_domain text;
BEGIN
 IF TG_TABLE_NAME='workbench_applications' THEN
  IF TG_OP='UPDATE' AND ROW(NEW.application_id,NEW.service_project_id,NEW.intake_year,NEW.application_round)
    IS DISTINCT FROM ROW(OLD.application_id,OLD.service_project_id,OLD.intake_year,OLD.application_round)
    THEN RAISE EXCEPTION 'APPLICATION_PROJECT_IDENTITY_IMMUTABLE'; END IF;
  SELECT p.service_project_id,a.student_person_id,p.family_id,p.primary_domain INTO v_project,v_subject,v_family,v_domain
   FROM education.applications a JOIN service.projects p ON p.service_project_id=NEW.service_project_id
   JOIN education.program g ON g.program_id=a.program_id AND g.institution_id=a.institution_id
   WHERE a.application_id=NEW.application_id AND a.family_id=p.family_id;
  IF v_domain IS DISTINCT FROM 'EDUCATION' THEN RAISE EXCEPTION 'APPLICATION_PROJECT_DOMAIN_OR_CATALOGUE_MISMATCH'; END IF;
  IF NEW.offer_version_id IS NOT NULL AND NOT EXISTS(
   SELECT FROM docs.document_versions v JOIN docs.documents d USING(document_id) JOIN service.workbench_materials m USING(version_id)
   WHERE v.version_id=NEW.offer_version_id AND m.service_project_id=v_project AND d.family_id=v_family AND d.subject_person_id=v_subject)
   THEN RAISE EXCEPTION 'OFFER_PROJECT_SUBJECT_MISMATCH'; END IF;
 ELSIF TG_TABLE_NAME='workbench_materials' THEN
  SELECT p.service_project_id,d.subject_person_id,p.family_id,p.primary_domain INTO v_project,v_subject,v_family,v_domain
   FROM docs.document_versions v JOIN docs.documents d USING(document_id) JOIN service.projects p ON p.service_project_id=NEW.service_project_id
   WHERE v.version_id=NEW.version_id AND d.family_id=p.family_id;
  IF v_domain='HEALTH' THEN RAISE EXCEPTION 'CLINICAL_MATERIAL_PATH_CLOSED'; END IF;
 ELSIF TG_TABLE_NAME='workbench_task_scope' THEN
  SELECT t.service_project_id,NEW.subject_person_id,p.family_id,p.primary_domain INTO v_project,v_subject,v_family,v_domain
   FROM service.tasks t JOIN service.projects p USING(service_project_id) WHERE t.task_id=NEW.task_id;
 ELSE
  SELECT p.service_project_id,NEW.subject_person_id,p.family_id,p.primary_domain INTO v_project,v_subject,v_family,v_domain
   FROM service.projects p WHERE p.service_project_id=NEW.service_project_id;
  IF v_domain='HEALTH' THEN RAISE EXCEPTION 'CLINICAL_MESSAGE_PATH_CLOSED'; END IF;
 END IF;
 IF v_project IS NULL OR NOT EXISTS(SELECT FROM service.project_subjects s WHERE s.service_project_id=v_project AND s.family_id=v_family AND s.subject_person_id=v_subject)
 THEN RAISE EXCEPTION 'WORKBENCH_LINK_FAMILY_SUBJECT_MISMATCH'; END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER workbench_application_link BEFORE INSERT OR UPDATE ON service.workbench_applications FOR EACH ROW EXECUTE FUNCTION service.validate_workbench_link();
CREATE TRIGGER workbench_material_link BEFORE INSERT ON service.workbench_materials FOR EACH ROW EXECUTE FUNCTION service.validate_workbench_link();
CREATE TRIGGER workbench_task_link BEFORE INSERT ON service.workbench_task_scope FOR EACH ROW EXECUTE FUNCTION service.validate_workbench_link();
CREATE TRIGGER workbench_message_link BEFORE INSERT ON service.workbench_messages FOR EACH ROW EXECUTE FUNCTION service.validate_workbench_link();
CREATE TRIGGER workbench_task_identity BEFORE UPDATE OR DELETE ON service.workbench_task_scope FOR EACH ROW EXECUTE FUNCTION service.reject_event_change();
CREATE FUNCTION service.protect_workbench_settings() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.service_project_id,NEW.template_kind,NEW.service_scope,NEW.document_retention_until)
 IS DISTINCT FROM ROW(OLD.service_project_id,OLD.template_kind,OLD.service_scope,OLD.document_retention_until)
 OR NEW.revision NOT IN(OLD.revision,OLD.revision+1) THEN RAISE EXCEPTION 'WORKBENCH_SCOPE_RETENTION_OR_REVISION_IMMUTABLE'; END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER workbench_settings_identity BEFORE UPDATE OR DELETE ON service.workbench_settings FOR EACH ROW EXECUTE FUNCTION service.protect_workbench_settings();
REVOKE ALL ON FUNCTION service.validate_workbench_link(),service.protect_workbench_settings() FROM PUBLIC;

COMMIT;
