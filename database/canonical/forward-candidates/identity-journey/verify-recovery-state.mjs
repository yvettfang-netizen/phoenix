const IDS = Object.freeze({
  familyId: "01910000-0000-7000-8100-000000000001",
  caseId: "01910000-0000-7000-8100-000000000005",
  principalId: "01910000-0000-7000-8100-000000000003",
  originalNoticeId: "01910000-0000-7000-8100-000000000009",
  oldPending: "01910000-0000-7000-8100-000000000056",
  nextNotice: "01910000-0000-7000-8100-000000000057",
  laterReminder: "01910000-0000-7000-8100-000000000058",
  priorRevision: "01910000-0000-7000-8100-000000000049",
  updatedRevision: "01910000-0000-7000-8100-000000000050",
  documentId: "01910000-0000-7000-8100-000000000045",
  consentId: "01910000-0000-7000-8100-000000000062",
  reviewTask: "01910000-0000-7000-8100-000000000115",
  reviewEvent: "01910000-0000-7000-8100-000000000151",
});

const pick = (r, key, fallback) => r?.[key] || fallback;

/** Return the stable, synthetic recovery snapshot as an object. */
export function readRenewalRecoveryState(query, recipient = {}) {
  const v = {
    familyId: pick(recipient, "familyId", IDS.familyId),
    caseId: pick(recipient, "caseId", IDS.caseId),
    principalId: pick(recipient, "principalId", IDS.principalId),
    originalNoticeId: pick(recipient, "noticeId", IDS.originalNoticeId),
    oldPending: IDS.oldPending, nextNotice: IDS.nextNotice, laterReminder: IDS.laterReminder,
    priorRevision: IDS.priorRevision, updatedRevision: IDS.updatedRevision,
    documentId: IDS.documentId, consentId: IDS.consentId,
    reviewTask: IDS.reviewTask, reviewEvent: IDS.reviewEvent,
  };
  const raw = query(`
WITH s AS MATERIALIZED (
  SELECT identity_case_id, family_id, subject_person_id FROM identity.cases
  WHERE identity_case_id=:'caseId'::uuid AND family_id=:'familyId'::uuid
), p AS MATERIALIZED (
  SELECT p.service_project_id FROM service.projects p
  JOIN service.project_subjects ps USING(service_project_id) JOIN s ON s.family_id=p.family_id
    AND s.subject_person_id=ps.subject_person_id JOIN service.tasks t USING(service_project_id)
  WHERE t.task_id=:'reviewTask'::uuid LIMIT 1
), notices AS (
  SELECT jsonb_agg(to_jsonb(q) ORDER BY q.kind) value FROM (
    SELECT e.kind,e.id,
      to_char(n.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') published_at,
      to_char(rd.read_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') read_at,
      (n.reminder_id IS NOT NULL) "exists"
    FROM (VALUES ('original',:'originalNoticeId'::uuid),('next',:'nextNotice'::uuid)) e(kind,id)
    LEFT JOIN identity.journey_station_reminders r ON r.reminder_id=e.id
      AND r.identity_case_id=:'caseId'::uuid AND r.recipient_principal_id=:'principalId'::uuid
    LEFT JOIN identity.journey_station_notices n ON n.reminder_id=r.reminder_id
      AND r.state='DELIVERED' AND n.published_at=r.delivered_at
    LEFT JOIN identity.journey_station_notice_reads rd ON rd.reminder_id=n.reminder_id
  ) q
), revisions AS (
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]'::jsonb) value FROM (
    SELECT r.date_revision_id id,r.episode_id,r.target_on,r.verification,r.official_fact_id,
      r.document_id,r.verified_by,r.supersedes_id,
      NOT EXISTS(SELECT 1 FROM identity.journey_date_revisions n WHERE n.supersedes_id=r.date_revision_id) is_current
    FROM identity.journey_date_revisions r JOIN s USING(identity_case_id)
    WHERE r.date_revision_id IN (:'priorRevision'::uuid,:'updatedRevision'::uuid)
  ) q
), reminders AS (
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]'::jsonb) value FROM (
    SELECT r.reminder_id id,r.date_revision_id revision_id,r.target_on,r.offset_days,r.state,
      r.claim_token IS NOT NULL claimed,r.delivered_at IS NOT NULL delivered
    FROM identity.journey_station_reminders r JOIN s USING(identity_case_id)
    WHERE r.reminder_id IN (:'oldPending'::uuid,:'nextNotice'::uuid,:'laterReminder'::uuid)
  ) q
), workbench AS (
  SELECT jsonb_build_object('project_id',p.service_project_id,'project_status',pr.project_status,
    'workbench_revision',w.revision,'task_id',t.task_id,'task_status',t.task_status,
    'completion_event_id',te.task_event_id,'completion_event_count',(
      SELECT count(*) FROM service.task_events x WHERE x.task_id=t.task_id
        AND x.event_kind='STATUS_CHANGED' AND x.from_status='IN_PROGRESS'
        AND x.to_status='COMPLETED' AND x.reason_code='IDENTITY_RENEWAL_RESULT_VERIFIED'),
    'workbench_completion_event_id',we.event_id,'workbench_completion_event_count',(
      SELECT count(*) FROM service.workbench_events x WHERE x.service_project_id=pr.service_project_id
        AND x.command_kind='TASK_STATUS' AND x.result->>'toStatus'='COMPLETED'
        AND x.result->>'eventId'=:'reviewEvent'::text)) value
  FROM p JOIN service.projects pr USING(service_project_id) LEFT JOIN service.workbench_settings w USING(service_project_id)
  LEFT JOIN service.tasks t ON t.task_id=:'reviewTask'::uuid AND t.service_project_id=p.service_project_id
  LEFT JOIN service.task_events te ON te.task_event_id=:'reviewEvent'::uuid AND te.task_id=t.task_id
    AND te.event_kind='STATUS_CHANGED' AND te.to_status='COMPLETED'
  LEFT JOIN service.workbench_events we ON we.event_id=:'reviewEvent'::uuid
    AND we.service_project_id=p.service_project_id AND we.command_kind='TASK_STATUS'
), ledger AS (
  SELECT migration_name,sha256 FROM canonical_migrations.applied ORDER BY migration_name
), ledger_summary AS (
  SELECT count(*)::integer count,string_agg(migration_name||':'||sha256,',' ORDER BY migration_name) packed,
    jsonb_agg(to_jsonb(q) ORDER BY q.migration_name) entries FROM ledger q
), rls AS (
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.name),'[]'::jsonb) value FROM (
    SELECT n.nspname||'.'||c.relname name,c.relrowsecurity rls,c.relforcerowsecurity force_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN('r','p') AND n.nspname||'.'||c.relname=ANY(ARRAY[
      'identity.journey_episodes','identity.journey_date_revisions','identity.journey_residence_intervals',
      'identity.journey_renewal_attestations','identity.journey_station_reminders',
      'identity.journey_station_notices','identity.journey_station_notice_reads','identity.journey_crm_service_links',
      'consent.identity_journey_crm_intents','identity.journey_crm_handoffs',
      'service.workbench_settings','service.workbench_events','service.workbench_task_scope'])
  ) q
), grants AS (
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.name),'[]'::jsonb) value FROM (VALUES
    ('app_apply_renewal',has_function_privilege('phoenix_canonical_app','identity.apply_journey_renewal(uuid,uuid,uuid,smallint[],uuid[])','EXECUTE')),
    ('reader_apply_renewal',has_function_privilege('phoenix_canonical_reader','identity.apply_journey_renewal(uuid,uuid,uuid,smallint[],uuid[])','EXECUTE')),
    ('workbench_apply_service_renewal',has_function_privilege('phoenix_canonical_service_workbench','identity.apply_journey_service_renewal(uuid,uuid,uuid,smallint[],uuid[],integer,uuid)','EXECUTE')),
    ('app_schedule_journey_consultation',has_function_privilege('phoenix_canonical_app','identity.schedule_journey_crm_consultation(uuid,uuid,uuid,uuid,uuid,timestamptz,uuid)','EXECUTE')),
    ('app_create_journey_deal',has_function_privilege('phoenix_canonical_app','identity.create_journey_crm_deal(uuid,uuid,uuid,uuid,text,numeric,text,uuid)','EXECUTE')),
    ('app_read_crm_summary',has_function_privilege('phoenix_canonical_app','identity.read_journey_crm_summary(uuid,uuid,uuid)','EXECUTE')),
    ('app_crm_origin_access',has_table_privilege('phoenix_canonical_app','identity.journey_crm_service_links','SELECT,INSERT,UPDATE,DELETE')),
    ('app_crm_intent_access',has_table_privilege('phoenix_canonical_app','consent.identity_journey_crm_intents','SELECT,INSERT,UPDATE,DELETE')),
    ('app_crm_handoff_access',has_table_privilege('phoenix_canonical_app','identity.journey_crm_handoffs','SELECT,INSERT,UPDATE,DELETE')),
    ('app_write_renewal_attestations',has_table_privilege('phoenix_canonical_app','identity.journey_renewal_attestations','INSERT,UPDATE,DELETE')),
    ('reader_write_renewal_attestations',has_table_privilege('phoenix_canonical_reader','identity.journey_renewal_attestations','INSERT,UPDATE,DELETE')),
    ('app_write_notice_receipts',has_table_privilege('phoenix_canonical_app','identity.journey_station_notice_reads','INSERT,UPDATE,DELETE')),
    ('reader_write_notice_receipts',has_table_privilege('phoenix_canonical_reader','identity.journey_station_notice_reads','INSERT,UPDATE,DELETE'))
  ) q(name,allowed)
), consent AS (
  SELECT jsonb_build_object('id',g.consent_id,'status',g.status,
    'granted_at',to_char(g.granted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'expires_at',to_char(g.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'withdrawn_at',to_char(g.withdrawn_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) value
  FROM consent.grants g JOIN s ON s.family_id=g.family_id AND s.subject_person_id=g.subject_person_id
  WHERE g.consent_id=:'consentId'::uuid
), document AS (
  SELECT jsonb_build_object('id',d.document_id,'withdrawn_at',d.withdrawn_at) value
  FROM (SELECT 1) x LEFT JOIN docs.documents d ON d.document_id=:'documentId'::uuid
    AND d.family_id=:'familyId'::uuid AND d.subject_person_id=(SELECT subject_person_id FROM s)
), crm AS (
  SELECT jsonb_build_object('intent_exists',i.consent_id IS NOT NULL,
    'intent_active',i.consent_id IS NOT NULL AND i.withdrawn_at IS NULL AND i.expires_at > clock_timestamp(),
    'intent_withdrawn',i.withdrawn_at IS NOT NULL,'receipt_exists',r.consent_id IS NOT NULL,
    'receipt_event_id',r.lead_event_id,'consultation_id',chain.consultation_id,'deal_id',chain.deal_id) value
  FROM (SELECT 1) x LEFT JOIN consent.identity_journey_crm_intents i
    ON i.notice_id=:'originalNoticeId'::uuid AND i.recipient_id=:'principalId'::uuid AND i.accepted_topic='RENEWAL'
  LEFT JOIN identity.journey_crm_handoffs r ON r.consent_id=i.consent_id
  LEFT JOIN identity.journey_crm_service_links chain ON chain.lead_event_id=r.lead_event_id
), authz AS (
  SELECT jsonb_build_object(
    'notice',coalesce((SELECT jsonb_build_object('exists',true,'active',withdrawn_at IS NULL AND expires_at>clock_timestamp(),
      'withdrawn',withdrawn_at IS NOT NULL) FROM consent.identity_journey_station_grants
      WHERE identity_case_id=:'caseId'::uuid AND family_id=:'familyId'::uuid
        AND subject_person_id=(SELECT subject_person_id FROM s) AND recipient_principal_id=:'principalId'::uuid
      ORDER BY granted_at DESC,authorization_id DESC LIMIT 1),
      jsonb_build_object('exists',false,'active',false,'withdrawn',false)),
    'timeline',coalesce((SELECT jsonb_build_object('exists',true,'active',revoked_at IS NULL,'revoked_at',revoked_at)
      FROM identity_journey_test.timeline_authority WHERE case_id=:'caseId'::uuid AND family_id=:'familyId'::uuid
        AND principal_id=:'principalId'::uuid AND purpose='IDENTITY_READ'),
      jsonb_build_object('exists',false,'active',false,'revoked_at',NULL)),
    'crm',(SELECT value FROM crm)) value
)
SELECT jsonb_build_object('schema_version','identity-journey.recovery-state.v1',
  'scope',jsonb_build_object('family_id',:'familyId'::uuid,'case_id',:'caseId'::uuid,
    'principal_id',:'principalId'::uuid,'subject_person_id',(SELECT subject_person_id FROM s)),
  'notices',(SELECT value FROM notices),'revisions',(SELECT value FROM revisions),
  'reminders',(SELECT value FROM reminders),'service_renewal',(SELECT value FROM workbench),
  'document',(SELECT value FROM document),'canonical_consent',(SELECT value FROM consent),
  'authorization',(SELECT value FROM authz),'canonical_ledger',jsonb_build_object(
    'count',(SELECT count FROM ledger_summary),
    'fingerprint',encode(sha256(convert_to(coalesce((SELECT packed FROM ledger_summary),''),'UTF8')),'hex'),
    'entries',(SELECT entries FROM ledger_summary)),
  'candidate_security',jsonb_build_object('rls',(SELECT value FROM rls),'grants',(SELECT value FROM grants)))::text;
`, v);
  return JSON.parse(raw);
}
