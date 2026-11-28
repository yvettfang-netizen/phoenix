import assert from "node:assert/strict";
import { identityRenewalServiceActions } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-service-plan.ts";

export async function verifyServiceChain({ query, recipient, crmFixture }) {
  const id = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const { verifyWithdrawnReceipt, ...crmValues } = crmFixture;
  const vars = { ...recipient, ...crmValues, consultation: id(70), deal: id(75), project: id(80),
    advisorPerson: id(40), advisorPrincipal: id(41) };
  // Existing authorities receive distinct Canonical principals and one-use
  // contexts. Consultation dates and financial references below are synthetic.
  query(`INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label) VALUES
      ('${id(73)}',NULL,'SERVICE','ACTIVE','canonical_service_v2'),
      ('${id(74)}',NULL,'SERVICE','ACTIVE','operations_entitlement_service');
    INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
      VALUES('${id(43)}',:'familyId'::uuid,:'actor'::uuid,'Synthetic identity review','OPEN','IDENTITY_CASE',:'caseId'::uuid);
    INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
      VALUES('${id(44)}','${id(43)}',:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');`, vars);

  const contexts = {
    crm: { principal: id(21), person: "", channel: "INTERNAL", login: "app" },
    service: { principal: id(73), person: "", channel: "INTERNAL", login: "app" },
    operations: { principal: id(74), person: "", channel: "INTERNAL", login: "app" },
    advisor: { principal: vars.advisorPrincipal, person: vars.advisorPerson, channel: "ADVISOR", login: "workbench" },
    family: { principal: recipient.principalId, person: vars.actor, channel: "FAMILY", login: "workbench" },
  };
  function invoke(name, command, fields = {}, login = contexts[name].login) {
    const ctx = contexts[name];
    const ticket = query(`SELECT auth.issue_context_ticket(:'principal'::uuid, nullif(:'person','')::uuid, :'familyId'::uuid,
      :'channel', clock_timestamp()+interval '45 seconds', gen_random_uuid(), :'principal'::uuid);`,
    { ...vars, ...ctx }, "binder");
    assert.match(ticket, /^[0-9a-f-]{36}$/);
    return query(`BEGIN;
      SET LOCAL statement_timeout = '4s';
      SELECT auth.redeem_context_ticket(:'ticket'::uuid, :'principal'::uuid);
      ${command}
      SELECT auth.clear_context();
      COMMIT;`, { ...vars, ...ctx, ...fields, ticket }, login);
  }

  // The private CRM bridge is intentionally not executable by the generic
  // app login. Bootstrap is used only by this isolated synthetic harness to
  // issue the INTERNAL canonical_crm_v2 context and hold the exact fixture
  // intent/receipt rows for the whole adapter transaction. The adapter still
  // performs its own binding checks; this lock prevents a different receipt
  // from being treated as permission.
  function withReceipt(expression, fields) {
    return invoke("crm", `WITH locked_receipt AS MATERIALIZED (
      SELECT i.expires_at FROM identity_journey_test.crm_intent i
      JOIN identity_journey_test.crm_receipt r USING (consent_id)
      WHERE i.consent_id=:'consent'::uuid AND r.lead_event_id=:'event'::uuid
        AND i.notice_id=:'noticeId'::uuid AND i.recipient_id=:'principalId'::uuid AND i.lead_id=:'lead'::uuid
        AND i.accepted_topic='RENEWAL' AND r.topic='RENEWAL' AND i.withdrawn_at IS NULL
      FOR SHARE OF i,r
    )
    SELECT ${expression} FROM locked_receipt
      WHERE expires_at > clock_timestamp() + interval '4 seconds';`, fields, "bootstrap");
  }

  assert.equal(query(`SELECT has_function_privilege(current_user,
    'identity.schedule_journey_crm_consultation(uuid,uuid,uuid,uuid,uuid,timestamptz,uuid)', 'EXECUTE');`, {}, "app"), "f");
  assert.equal(query(`SELECT has_function_privilege(current_user,
    'identity.create_journey_crm_deal(uuid,uuid,uuid,uuid,text,numeric,text,uuid)', 'EXECUTE');`, {}, "app"), "f");

  // The adapter is the only permitted bridge from the accepted identity need
  // to CRM.  All negative cases must return NULL before any consultation or
  // deal row is created; the fixture uses the education need and opaque UUIDs
  // to prove domain, consent and verified-link binding rather than merely
  // checking that the input is well formed.
  const scheduledAt = query("SELECT clock_timestamp() + interval '1 hour';");
  const schedule = `identity.schedule_journey_crm_consultation(
    :'event'::uuid, :'consent'::uuid, :'clientLink'::uuid, :'consultation'::uuid,
    :'advisorPrincipal'::uuid, :'scheduledAt'::timestamptz, :'consultationEvent'::uuid)`;
  const appointment = { scheduledAt, consultationEvent: id(72) };
  const book = (fields = {}) => withReceipt(schedule, { ...appointment, ...fields });
  assert.equal(book({ consent: id(62) }), "", "a missing receipt cannot schedule a consultation");
  assert.equal(book({ clientLink: id(63) }), "", "an unverified client link cannot schedule a consultation");
  assert.equal(invoke("crm", `SELECT ${schedule};`, { ...appointment, event: vars.educationEvent }, "bootstrap"),
    "", "the private SQL boundary also rejects an education need");
  assert.equal(book(), vars.consultation);
  assert.equal(query(`SELECT count(*) FROM identity.journey_crm_service_links
    WHERE lead_event_id=:'event'::uuid AND verified_link_id=:'clientLink'::uuid
      AND consultation_id=:'consultation'::uuid AND deal_id IS NULL;`, vars), "1");
  // Exact replay is idempotent; a different consultation ID is rejected and
  // cannot create a second provenance link for the same lead event.
  assert.equal(book(), vars.consultation);
  assert.equal(book({ consultation: id(60), consultationEvent: id(61) }), "",
    "a replay with a different consultation ID cannot duplicate the link");

  // A deal is not allowed before the consultation is completed.  This is the
  // service-chain refusal boundary, not a client-side ordering convention.
  const dealInput = { dealAssignment: id(76), dealEvent: id(77) };
  const makeDeal = (fields = {}) => withReceipt(`identity.create_journey_crm_deal(
    :'event'::uuid, :'consent'::uuid, :'deal'::uuid, :'dealAssignment'::uuid,
    'Synthetic identity renewal opportunity', 0, 'HKD', :'dealEvent'::uuid)`, { ...dealInput, ...fields });
  assert.equal(makeDeal(), "", "a deal cannot be created before consultation follow-up is complete");

  const consultationStartedEvent = id(160);
  const consultationCompletedEvent = id(161);
  assert.equal(invoke("crm", `SELECT crm.transition_consultation(
    :'consultation'::uuid, 'IN_PROGRESS', 'IDENTITY_RENEWAL_REVIEW',
    'IDENTITY_RENEWAL_SERVICE', :'consultationStartedEvent'::uuid);`, {
    consultationStartedEvent,
  }), "t");
  assert.equal(invoke("crm", `SELECT crm.transition_consultation(
    :'consultation'::uuid, 'COMPLETED', 'IDENTITY_RENEWAL_REVIEW',
    'IDENTITY_RENEWAL_SERVICE', :'consultationCompletedEvent'::uuid);`, {
    consultationCompletedEvent,
  }), "t");
  assert.equal(query(`SELECT count(*) FROM crm.consultation_events
    WHERE consultation_id=:'consultation'::uuid AND event_kind='STATUS_CHANGED'
      AND consultation_event_id IN (:'consultationStartedEvent'::uuid, :'consultationCompletedEvent'::uuid);`, {
    ...vars, consultationStartedEvent, consultationCompletedEvent,
  }), "2");

  assert.equal(makeDeal(), vars.deal);
  assert.equal(makeDeal(), vars.deal, "exact deal replay is idempotent");
  assert.equal(makeDeal({ deal: id(64), dealAssignment: id(65), dealEvent: id(66) }), "",
    "a replay with a different deal ID cannot duplicate the link");
  assert.equal(query(`SELECT count(*) FROM identity.journey_crm_service_links
    WHERE lead_event_id=:'event'::uuid AND verified_link_id=:'clientLink'::uuid
      AND consultation_id=:'consultation'::uuid AND deal_id=:'deal'::uuid;`, vars), "1");

  // The accepted handoff is withdrawn only after the natural consultation →
  // deal chain exists.  The candidate adapter must then deny both operations
  // in fresh INTERNAL transactions, while leaving the persisted provenance
  // row immutable and exact.
  await verifyWithdrawnReceipt();
  assert.equal(book(), "", "withdrawn consent denies later consultation scheduling");
  assert.equal(makeDeal(), "", "withdrawn consent denies later deal creation");
  assert.equal(query(`SELECT count(*) FROM identity.journey_crm_service_links
    WHERE lead_event_id=:'event'::uuid AND verified_link_id=:'clientLink'::uuid
      AND consultation_id=:'consultation'::uuid AND deal_id=:'deal'::uuid;`, vars), "1");
  assert.equal(invoke("service", `SELECT service.create_project(:'project'::uuid, :'client'::uuid, :'familyId'::uuid,
    :'deal'::uuid, 'SYN_IDENTITY_RENEWAL', 'Synthetic identity renewal project', 'IDENTITY', NULL, NULL, '${id(81)}');
    SELECT service.add_project_subject_authorized('${id(82)}', :'project'::uuid, :'actor'::uuid, 'IDENTITY', NULL, '${id(83)}');
    SELECT service.add_project_party('${id(84)}', :'project'::uuid, 'CONTRACTING_PARTY', :'actor'::uuid, NULL, NULL, '${id(85)}');
    SELECT service.assign_project('${id(86)}', :'project'::uuid, :'advisorPrincipal'::uuid, 'PROJECT_OWNER', '${id(87)}');`),
  "t\nt\nt\nt");
  // Workbench 0038 has no public initializer. Only this fixture seeds its
  // existing GENERAL settings; project creation and assignment use native APIs.
  query(`INSERT INTO service.workbench_settings(service_project_id,template_kind,service_scope,current_stage,document_retention_until)
    VALUES(:'project'::uuid,'GENERAL','Synthetic scope for renewal service','DISCOVERY',clock_timestamp()+interval '7 days');`, vars);

  const snapshot = name => JSON.parse(invoke(name, "SELECT service.workbench_snapshot(:'project'::uuid);"));
  const occurredAt = query("SELECT clock_timestamp();");
  const reference = (profile, n, kind, version) => invoke(profile,
    `SELECT service.record_workbench_commercial_event(:'eventId'::uuid, :'project'::uuid,
      :'source', :'kind', :'reference', repeat('c',64), :'version'::bigint, :'occurredAt'::timestamptz);`,
    { eventId: id(90 + n), source: "SYN_IDENTITY_EVENT_" + n, kind, reference: "SYN_IDENTITY_SOURCE_V" + version, version, occurredAt });
  assert.equal(snapshot("family").status, "DENY");
  assert.equal(reference("operations", 1, "OPENING_APPROVED", 1), "f");
  assert.equal(reference("crm", 2, "CONTRACT_SIGNED", 1), "f");
  assert.equal(reference("operations", 2, "CONTRACT_SIGNED", 1), "t");
  assert.equal(reference("operations", 2, "CONTRACT_SIGNED", 1), "t");
  assert.equal(snapshot("family").status, "DENY");
  assert.equal(reference("operations", 3, "PAYMENT_CONFIRMED", 2), "t");
  assert.equal(reference("operations", 4, "PAYMENT_REVERSED", 3), "t");
  assert.equal(reference("operations", 5, "OPENING_APPROVED", 4), "f");
  assert.equal(snapshot("family").status, "DENY");
  assert.equal(reference("operations", 6, "PAYMENT_CONFIRMED", 4), "t");
  assert.equal(reference("operations", 7, "OPENING_APPROVED", 5), "t");
  assert.equal(invoke("crm", `SELECT crm.transition_deal(:'deal'::uuid,'QUALIFIED','SYNTHETIC_TEST','${id(100)}');
    SELECT crm.transition_deal(:'deal'::uuid,'PROPOSAL','SYNTHETIC_TEST','${id(101)}');
    SELECT crm.transition_deal(:'deal'::uuid,'NEGOTIATION','SYNTHETIC_TEST','${id(102)}');
    SELECT crm.transition_deal(:'deal'::uuid,'WON','SYNTHETIC_TEST','${id(103)}');`), "t\nt\nt\nt");
  assert.equal(invoke("service", `SELECT service.transition_project(:'project'::uuid,'PLANNED','${id(104)}');
    SELECT service.transition_project(:'project'::uuid,'ACTIVE','${id(105)}');`), "t\nt");
  const familySnapshot = snapshot("family");
  assert.equal(familySnapshot.status, "ALLOW");
  const family = familySnapshot.data;
  assert.equal(family.project.id, vars.project);
  assert.equal(family.project.domain, "IDENTITY");
  assert.equal(family.project.opened, true);
  assert.equal(family.project.staff, false);
  const advisor = snapshot("advisor").data;
  assert.equal(advisor.project.staff, true);
  assert.equal(advisor.team.find(entry => entry.principalId === vars.advisorPrincipal)?.role, "PROJECT_OWNER");

  for (const [index, action] of identityRenewalServiceActions.entries()) {
    const body = { revision: advisor.project.revision + index, id: id(110 + index), subjectId: vars.actor,
      title: action.title.zh, priority: "MEDIUM", assignee: vars.advisorPrincipal, audience: action.audience };
    const args = { body: JSON.stringify(body), key: `synthetic-identity-service-${action.key}`, eventId: id(130 + index) };
    const command = "SELECT service.workbench_command(:'project'::uuid,'TASK_CREATE',:'body'::jsonb,:'key',:'eventId'::uuid);";
    assert.equal(JSON.parse(invoke("advisor", command, args)).status, "ALLOW", action.key);
    if (index === 0) assert.equal(JSON.parse(invoke("advisor", command, args)).replayed, true);
  }
  const ownedTasks = snapshot("advisor").data.tasks;
  const familyTasks = snapshot("family").data.tasks;
  assert.equal(ownedTasks.length, 8);
  assert.equal(familyTasks.length, identityRenewalServiceActions.filter(action => action.audience === "CLIENT").length);
  assert.ok(familyTasks.every(task => task.audience === "CLIENT"));
  assert.equal(query(`SELECT count(*) FROM identity_journey_test.crm_receipt receipt
    JOIN crm.lead_events need USING(lead_event_id)
    JOIN identity.journey_crm_service_links origin ON origin.lead_event_id=need.lead_event_id
    JOIN crm.consultations c ON c.consultation_id=origin.consultation_id AND c.lead_id=need.lead_id
      AND c.business_domain='IDENTITY' AND c.status='COMPLETED'
    JOIN crm.deals d ON d.deal_id=origin.deal_id AND d.primary_lead_id=need.lead_id
      AND d.client_id=c.client_id AND d.family_id=c.family_id
    JOIN service.projects p ON p.deal_id=d.deal_id AND p.client_id=d.client_id AND p.family_id=d.family_id
    WHERE need.lead_event_id=:'event'::uuid AND c.consultation_id=:'consultation'::uuid
      AND d.deal_id=:'deal'::uuid AND p.service_project_id=:'project'::uuid AND p.primary_domain='IDENTITY';`, vars), "1");
  assert.equal(query(`SELECT count(*) FROM service.workbench_commercial_events WHERE service_project_id=:'project'::uuid;`, vars), "5");
  assert.equal(query("SELECT count(*) FROM identity.external_facts WHERE fact_kind='DECISION';"), "0");
  console.log("PASS exact renewal receipt through consultation follow-up, deal, withdrawal denial and the same Family Workbench");

  // The result-review task is the existing STAFF task from the service plan.
  // Put it in progress before verify-renewal.sql binds the attestation.  The
  // renewal bridge is then the only operation allowed to complete this task;
  // the old post-hoc TASK_STATUS pair must not be used as proof of delivery.
  const reviewIndex = identityRenewalServiceActions.findIndex(action => action.key === "RESULT_REVIEW");
  assert.ok(reviewIndex >= 0);
  const reviewTask = id(110 + reviewIndex);
  const reviewStartEvent = id(150);
  const beforeReview = snapshot("advisor").data.project.revision;
  const started = JSON.parse(invoke("advisor", `SELECT service.workbench_command(
      :'project'::uuid,'TASK_STATUS',:'body'::jsonb,:'key',:'eventId'::uuid);`, {
    body: JSON.stringify({ revision: beforeReview, id: reviewTask, status: "IN_PROGRESS",
      reason: "SYNTHETIC_RENEWAL_REVIEW_STARTED" }),
    key: "synthetic-renewal-result-review-start",
    eventId: reviewStartEvent,
  }));
  assert.equal(started.status, "ALLOW");
  const startedSnapshot = snapshot("advisor").data;
  const startedTask = startedSnapshot.tasks.find(entry => entry.id === reviewTask);
  assert.equal(startedTask?.status, "IN_PROGRESS");
  assert.equal(startedTask?.assignee, vars.advisorPrincipal);
  assert.equal(startedTask?.audience, "STAFF");
  assert.equal(query(`SELECT count(*) FROM service.task_events
    WHERE task_event_id=:'eventId'::uuid AND task_id=:'task'::uuid
      AND event_kind='STATUS_CHANGED' AND from_status='PENDING' AND to_status='IN_PROGRESS';`,
  { eventId: reviewStartEvent, task: reviewTask }), "1");

  return function verifyRenewalReview() {
    const verifiedRevision = id(50);
    assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions r
      JOIN identity.journey_renewal_attestations attestation ON attestation.decision_id=r.official_fact_id
        AND attestation.review_task_id=:'reviewTask'::uuid
      JOIN identity.cases identity_case ON identity_case.identity_case_id=r.identity_case_id
      JOIN identity.journey_station_reminders original_notice ON original_notice.reminder_id=:'noticeId'::uuid
        AND original_notice.identity_case_id=identity_case.identity_case_id
        AND original_notice.date_revision_id=r.supersedes_id AND original_notice.state='DELIVERED'
      JOIN identity_journey_test.crm_intent consent_receipt ON consent_receipt.notice_id=original_notice.reminder_id
      JOIN identity_journey_test.crm_receipt handoff ON handoff.consent_id=consent_receipt.consent_id
        AND handoff.lead_event_id=:'event'::uuid
      JOIN identity.journey_crm_service_links origin ON origin.lead_event_id=handoff.lead_event_id
      JOIN service.projects project ON project.deal_id=origin.deal_id AND project.service_project_id=:'project'::uuid
      JOIN docs.documents document ON document.document_id=r.document_id AND document.withdrawn_at IS NULL
        AND document.retention_until > clock_timestamp()
      JOIN service.project_subjects subject ON subject.family_id=identity_case.family_id
        AND subject.subject_person_id=identity_case.subject_person_id AND subject.data_scope='IDENTITY'
      WHERE r.date_revision_id=:'verifiedRevision'::uuid AND r.verification='VERIFIED'
        AND r.verified_by=:'advisorPrincipal'::uuid AND r.identity_case_id=:'caseId'::uuid
        AND subject.service_project_id=:'project'::uuid AND subject.status='ACTIVE';`, { ...vars, verifiedRevision, reviewTask }), "1");
    const task = reviewTask;
    const after = snapshot("advisor").data;
    assert.equal(after.tasks.find(entry => entry.id === task)?.status, "COMPLETED");
    assert.equal(after.project.status, "ACTIVE", "Completing the result review does not close the whole service");
    assert.equal(query(`SELECT count(*) FROM service.task_events
      WHERE task_event_id=:'eventId'::uuid AND task_id=:'task'::uuid
        AND event_kind='STATUS_CHANGED' AND from_status='IN_PROGRESS' AND to_status='COMPLETED'
        AND reason_code='IDENTITY_RENEWAL_RESULT_VERIFIED';`,
    { eventId: id(151), task }), "1");
    // The bridge owns the completion command.  Inspect the canonical event
    // by its exact event id and task result instead of issuing another
    // post-hoc TASK_STATUS command here.
    assert.equal(query(`SELECT count(*) FROM service.workbench_events e
      WHERE e.event_id=:'eventId'::uuid AND e.service_project_id=:'project'::uuid
        AND e.command_kind='TASK_STATUS' AND e.result->>'toStatus'='COMPLETED'
        AND e.result->>'eventId'=:'eventId'::text;`,
    { eventId: id(151), project: vars.project }), "1");
    assert.equal(query(`SELECT count(*) FROM audit.access_events
      WHERE resource_kind='SERVICE_WORKBENCH' AND resource_id=:'project'::uuid
        AND action='TASK_STATUS' AND decision='ALLOW'
        AND reason_code='WORKBENCH_COMMAND_COMMITTED';`, { project: vars.project }), "2");
    console.log("PASS supersession links the original expiry notice, consultation handoff and the same Identity Workbench task atomically");
  };
}
