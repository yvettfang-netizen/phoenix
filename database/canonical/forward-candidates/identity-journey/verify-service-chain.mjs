import assert from "node:assert/strict";
import { identityRenewalServiceActions } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-service-plan.ts";

export async function verifyServiceChain({ query, recipient, crmFixture }) {
  const id = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const vars = { ...recipient, ...crmFixture, consultation: id(70), deal: id(75), project: id(80),
    advisorPerson: id(40), advisorPrincipal: id(41) };
  // Existing authorities receive distinct Canonical principals and one-use
  // contexts. Consultation dates and financial references below are synthetic.
  query(`INSERT INTO core.people(person_id,display_name) VALUES(:'advisorPerson'::uuid,'Synthetic renewal adviser');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label) VALUES
      (:'advisorPrincipal'::uuid,:'advisorPerson'::uuid,'ADVISOR','ACTIVE',NULL),
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
  function invoke(name, command, fields = {}) {
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
      COMMIT;`, { ...vars, ...ctx, ...fields, ticket }, ctx.login);
  }

  assert.equal(invoke("crm", `SELECT crm.create_consultation(:'consultation'::uuid, :'lead'::uuid, :'client'::uuid,
    :'familyId'::uuid, :'actor'::uuid, 'IDENTITY', 'DISCOVERY', NULL, :'advisorPrincipal'::uuid,
    clock_timestamp()+interval '1 hour', '${id(71)}');`), "t");
  assert.equal(invoke("crm", `SELECT crm.create_managed_deal(:'deal'::uuid, '${id(76)}', :'client'::uuid,
    :'familyId'::uuid, :'lead'::uuid, :'consultation'::uuid, 'Synthetic identity renewal opportunity',
    'IDENTITY', 0, 'HKD', NULL, :'advisorPrincipal'::uuid, NULL, '${id(77)}');`), "t");
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
    JOIN crm.consultations c ON c.lead_id=need.lead_id AND c.business_domain='IDENTITY'
    JOIN crm.deals d ON d.primary_lead_id=need.lead_id AND d.client_id=c.client_id AND d.family_id=c.family_id
    JOIN service.projects p ON p.deal_id=d.deal_id AND p.client_id=d.client_id AND p.family_id=d.family_id
    WHERE need.lead_event_id=:'event'::uuid AND c.consultation_id=:'consultation'::uuid
      AND d.deal_id=:'deal'::uuid AND p.service_project_id=:'project'::uuid AND p.primary_domain='IDENTITY';`, vars), "1");
  assert.equal(query(`SELECT count(*) FROM service.workbench_commercial_events WHERE service_project_id=:'project'::uuid;`, vars), "5");
  assert.equal(query("SELECT count(*) FROM identity.external_facts WHERE fact_kind='DECISION';"), "0");
  console.log("PASS same identity need, scheduled consultation, existing Client/Deal, synthetic commercial gate, adviser tasks and Family Workbench");

  return function recordRenewalReview() {
    const verifiedRevision = id(50);
    assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions r
      JOIN identity.journey_renewal_attestations attestation ON attestation.decision_id=r.official_fact_id
      JOIN identity.cases identity_case ON identity_case.identity_case_id=r.identity_case_id
      JOIN docs.documents document ON document.document_id=r.document_id AND document.withdrawn_at IS NULL
        AND document.retention_until > clock_timestamp()
      JOIN service.project_subjects subject ON subject.family_id=identity_case.family_id
        AND subject.subject_person_id=identity_case.subject_person_id AND subject.data_scope='IDENTITY'
      WHERE r.date_revision_id=:'verifiedRevision'::uuid AND r.verification='VERIFIED'
        AND r.verified_by=:'advisorPrincipal'::uuid AND r.identity_case_id=:'caseId'::uuid
        AND subject.service_project_id=:'project'::uuid AND subject.status='ACTIVE';`, { ...vars, verifiedRevision }), "1");
    const index = identityRenewalServiceActions.findIndex(action => action.key === "RESULT_REVIEW");
    const task = id(110 + index);
    const revision = snapshot("advisor").data.project.revision;
    for (const [step, status] of ["IN_PROGRESS", "COMPLETED"].entries()) {
      const body = JSON.stringify({ revision: revision + step, id: task, status, reason: "SYNTHETIC_VERIFIED_RENEWAL" });
      assert.equal(JSON.parse(invoke("advisor", `SELECT service.workbench_command(
        :'project'::uuid,'TASK_STATUS',:'body'::jsonb,:'key',:'eventId'::uuid);`,
      { body, key: `synthetic-renewal-result-review-${step}`, eventId: id(150 + step) })).status, "ALLOW");
    }
    const after = snapshot("advisor").data;
    assert.equal(after.tasks.find(entry => entry.id === task)?.status, "COMPLETED");
    assert.equal(after.project.status, "ACTIVE", "Completing the result review does not close the whole service");
    console.log("PASS verified renewal updates the same Identity Workbench review task without closing unrelated workflows");
  };
}
