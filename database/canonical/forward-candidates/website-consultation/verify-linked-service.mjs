import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// This verifier runs only inside verify-local's fresh synthetic CRM database.
// Operations events here are fixture references, not evidence of a contract or a payment.
export async function verifyLinkedService({ db, Client, Pool, connection, fixtureId, lineage, family, otherFamily }) {
  assert.equal(connection.host, "127.0.0.1");
  assert.equal(connection.database, "phoenix_website_intake_fixture");

  for (const file of ["0038_service_project_workbench.sql", "0039_service_project_summary.sql"]) {
    await db.query(await readFile(new URL("../service-workbench/" + file, import.meta.url), "utf8"));
  }
  await db.query(`
    CREATE ROLE linked_fixture_service LOGIN NOINHERIT;
    CREATE ROLE linked_fixture_operations LOGIN NOINHERIT;
    CREATE ROLE linked_fixture_workbench LOGIN NOINHERIT;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO
      linked_fixture_service, linked_fixture_operations, linked_fixture_workbench;
    GRANT phoenix_canonical_app TO linked_fixture_service, linked_fixture_operations WITH INHERIT FALSE, SET TRUE;
    GRANT phoenix_canonical_service_workbench TO linked_fixture_workbench WITH INHERIT FALSE, SET TRUE;
  `);

  const project = fixtureId(300);
  const service = fixtureId(301);
  const operations = fixtureId(302);
  const [customerPerson, managerPerson, outsiderPerson] = [303, 304, 305].map(fixtureId);
  const [customer, manager, outsider] = [306, 307, 308].map(fixtureId);
  const task = fixtureId(320);
  const milestone = fixtureId(321);
  await db.query(`
    INSERT INTO core.people(person_id,display_name)
    VALUES($1,'Synthetic service recipient'),($2,'Synthetic project manager'),($3,'Synthetic outside family')
  `, [customerPerson, managerPerson, outsiderPerson]);
  await db.query(`
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label)
    VALUES($1,NULL,'SERVICE','ACTIVE','canonical_service_v2'),
      ($2,NULL,'SERVICE','ACTIVE','operations_entitlement_service'),
      ($3,$4,'FAMILY','ACTIVE',NULL),($5,$6,'ADVISOR','ACTIVE',NULL),($7,$8,'FAMILY','ACTIVE',NULL)
  `, [service, operations, customer, customerPerson, manager, managerPerson, outsider, outsiderPerson]);
  await db.query(`
    INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
    VALUES($1,$2,$3,'MEMBER',clock_timestamp()),($4,$5,$6,'MEMBER',clock_timestamp())
  `, [fixtureId(309), family, customerPerson, fixtureId(310), otherFamily, outsiderPerson]);
  await db.query(`
    INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,created_by_principal_id)
    VALUES($1,$2,$3,'Synthetic service delivery','OPEN',$4)
  `, [fixtureId(311), family, customerPerson, service]);
  await db.query(`
    INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until,assigned_by_principal_id)
    VALUES($1,$2,$3,clock_timestamp(),clock_timestamp()+interval '1 hour',$4)
  `, [fixtureId(312), fixtureId(311), managerPerson, service]);
  await db.query(`
    INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
      purpose,data_class,status,granted_at,expires_at)
    VALUES($1,$2,$3,$4,$3,'EDUCATION_CASE','EDUCATION','ACTIVE',clock_timestamp(),clock_timestamp()+interval '1 hour')
  `, [fixtureId(313), family, customerPerson, managerPerson]);

  async function scoped(login, role, principal, person, scope, channel, run) {
    const client = new Client({ ...connection, user: login });
    await client.connect();
    try {
      const { rows: [issued] } = await db.query(`
        SELECT auth.issue_context_ticket($1,$2,$3,$4,clock_timestamp()+interval '30 seconds',$5,$1) AS ticket
      `, [principal, person, scope, channel, randomUUID()]);
      await client.query("SET ROLE " + role);
      await client.query("SELECT auth.redeem_context_ticket($1,$2)", [issued.ticket, principal]);
      return await run(client);
    } finally {
      try { await client.query("SELECT auth.clear_context()"); } finally { await client.end(); }
    }
  }
  const workbench = (principal, person, scope, channel, run) =>
    scoped("linked_fixture_workbench", "phoenix_canonical_service_workbench", principal, person, scope, channel, run);
  const asCustomer = run => workbench(customer, customerPerson, family, "FAMILY", run);
  const asManager = run => workbench(manager, managerPerson, family, "ADVISOR", run);
  const asOperations = run => scoped("linked_fixture_operations", "phoenix_canonical_app", operations, null, family, "INTERNAL", run);
  const value = async (client, sql, args = []) => (await client.query(sql, args)).rows[0].value;
  const snapshot = client => value(client, "SELECT service.workbench_customer_snapshot($1) AS value", [project]);
  const summary = client => value(client, "SELECT service.workbench_summary(20,NULL,NULL) AS value");
  const command = (client, kind, body, event) => value(client,
    "SELECT service.workbench_command($1,$2,$3,$4,$5) AS value", [project, kind, body, "linked-service-" + event, fixtureId(event)]);

  await scoped("linked_fixture_service", "phoenix_canonical_app", service, null, family, "INTERNAL", async client => {
    const args = [project, lineage.client_id, family, lineage.deal_id, fixtureId(314)];
    const create = "SELECT service.create_project($1,$2,$3,$4,'SYN_CRM_LINK','Synthetic linked education service','EDUCATION',NULL,NULL,$5) AS value";
    assert.equal(await value(client, create, args), true);
    assert.equal(await value(client, create, args), false);
    assert.equal(await value(client,
      "SELECT service.add_project_subject_authorized($1,$2,$3,'EDUCATION',NULL,$4) AS value",
      [fixtureId(315), project, customerPerson, fixtureId(316)]), true);
    assert.equal(await value(client, "SELECT service.assign_project($1,$2,$3,'PROJECT_MANAGER',$4) AS value",
      [fixtureId(317), project, manager, fixtureId(318)]), true);
    assert.equal(await value(client, "SELECT service.transition_project($1,'PLANNED',$2) AS value",
      [project, fixtureId(319)]), true);
    assert.equal(await value(client,
      "SELECT service.register_milestone_template($1,'SYN_FIRST_DELIVERY',1,'EDUCATION','Synthetic first delivery milestone') AS value",
      [fixtureId(328)]), true);
    assert.equal(await value(client,
      "SELECT service.create_milestone_from_template($1,$2,$3,'SYN_START',NULL,$4) AS value",
      [milestone, project, fixtureId(328), fixtureId(322)]), true);
  });
  await db.query(`
    INSERT INTO service.workbench_settings(service_project_id,template_kind,service_scope,current_stage,document_retention_until)
    VALUES($1,'GENERAL','Synthetic service scope','DISCOVERY',clock_timestamp()+interval '1 day')
  `, [project]);

  assert.deepEqual(await asCustomer(snapshot), { status: "DENY" });
  const activation = { revision: 1, status: "ACTIVE", reason: "SYNTHETIC_DELIVERY_APPROVED" };
  assert.equal((await asManager(client => command(client, "PROJECT_STATUS", activation, 323))).status, "CONFLICT");
  const occurredAt = new Date(Date.now() - 1000).toISOString();
  const contractRef = "SYNTHETIC-CONTRACT-FOR-LINKED-DEAL";
  const record = (client, index, kind, reference) => value(client,
    "SELECT service.record_workbench_commercial_event($1,$2,$3,$4,$5,$6,$7,$8) AS value",
    [fixtureId(330 + index), project, "SYNTHETIC-LINKED-" + index, kind, reference, "c".repeat(64), index, occurredAt]);
  await asOperations(async client => {
    assert.equal(await record(client, 3, "OPENING_APPROVED", "SYNTHETIC-OPENING"), false);
    assert.equal(await record(client, 1, "CONTRACT_SIGNED", contractRef), true);
    assert.equal(await record(client, 2, "PAYMENT_CONFIRMED", "SYNTHETIC-SETTLEMENT"), true);
  });
  assert.deepEqual(await asCustomer(snapshot), { status: "DENY" });
  await asOperations(async client => {
    assert.equal(await record(client, 3, "OPENING_APPROVED", "SYNTHETIC-OPENING"), true);
    assert.equal(await record(client, 3, "OPENING_APPROVED", "SYNTHETIC-OPENING"), true);
    assert.equal(await record(client, 3, "OPENING_APPROVED", "ALTERED-OPENING"), false);
  });
  assert.equal((await asCustomer(snapshot)).data.project.status, "PLANNED");

  const dueAt = new Date(Date.now()+3600000).toISOString();
  await asManager(async client => {
    const opened = await command(client, "PROJECT_STATUS", activation, 323);
    assert.equal(opened.status, "ALLOW");
    assert.equal((await command(client, "TASK_CREATE", {
      revision: opened.result.revision, id: task, subjectId: customerPerson,
      title: "Confirm the first delivery milestone", priority: "MEDIUM", assignee: customer, dueAt, audience: "CLIENT",
    }, 324)).status, "ALLOW");
  });
  const familyEvidence = await asCustomer(async client => {
    const before = await summary(client);
    const item = before.data.projects.find(row => row.service_project_id === project);
    assert.equal(item.status, "ACTIVE");
    assert.equal(item.adviser, "Synthetic project manager");
    assert.equal(item.next_milestone.id, milestone);
    assert.equal(item.customer_todo_count, 1);
    const detail = await snapshot(client);
    assert.equal(detail.data.tasks.find(row => row.id === task)?.status, "PENDING");
    const start = await command(client, "TASK_STATUS", {
      revision: detail.data.project.revision, id: task, status: "IN_PROGRESS", reason: "SYNTHETIC_BEGIN",
    }, 325);
    assert.equal(start.status, "ALLOW");
    const complete = await command(client, "TASK_STATUS", {
      revision: start.result.revision, id: task, status: "COMPLETED", reason: "SYNTHETIC_CONFIRMED",
    }, 326);
    assert.equal(complete.status, "ALLOW");
    const feedback = await command(client, "MESSAGE", {
      revision: complete.result.revision, subjectId: customerPerson,
      body: "Synthetic feedback on the first delivery milestone", audience: "CLIENT",
    }, 327);
    assert.equal(feedback.status, "ALLOW");
    const fresh = await summary(client);
    assert.equal(fresh.data.projects.find(row => row.service_project_id === project).customer_todo_count, 0);
    return { read_at: fresh.data.as_of, task_event: complete.result.eventId, feedback_event: feedback.result.eventId };
  });
  const backend = process.env.CRM_FIXTURE_FAMILY_API_MODULE;
  if (backend) {
    const { verifyLinkedFamilyApi } = await import("./verify-linked-family-api.mjs");
    await verifyLinkedFamilyApi({
      db, Pool, connection, backend, project, expectedFeedback: familyEvidence.feedback_event,
      identity: { principalId: customer, actorPersonId: customerPerson, familyId: family },
    });
  } else {
    console.log("NOT RUN linked Family HTTP API: CRM_FIXTURE_FAMILY_API_MODULE is unset");
  }
  await workbench(outsider, outsiderPerson, otherFamily, "FAMILY", async client => {
    assert.deepEqual(await snapshot(client), { status: "DENY" });
    assert.deepEqual((await summary(client)).data.projects, []);
  });
  await asOperations(async client => {
    assert.equal(await record(client, 4, "PAYMENT_REVERSED", "SYNTHETIC-REVERSAL"), true);
  });
  assert.deepEqual(await asCustomer(snapshot), { status: "DENY" });

  const { rows } = await db.query(`
    SELECT p.service_project_id, p.updated_at, p.project_status, t.task_status,
      (SELECT count(*)::int FROM service.workbench_commercial_events WHERE service_project_id=p.service_project_id) AS source_events,
      (SELECT event_id FROM audit.access_events WHERE resource_id=p.service_project_id AND principal_id=$3
        AND reason_code='WORKBENCH_COMMAND_COMMITTED' AND action='TASK_STATUS' ORDER BY event_id DESC LIMIT 1) AS task_audit_ref
    FROM service.projects p JOIN service.tasks t USING(service_project_id)
    WHERE p.deal_id=$1 AND p.client_id=$2
  `, [lineage.deal_id, lineage.client_id, customer]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].service_project_id, project);
  assert.equal(rows[0].project_status, "ACTIVE");
  assert.equal(rows[0].task_status, "COMPLETED");
  assert.equal(rows[0].source_events, 4);
  assert.ok(rows[0].task_audit_ref);
  assert.ok(Date.parse(familyEvidence.read_at) >= rows[0].updated_at.getTime());
  console.log("PASS same synthetic consultation → deal → authorized commercial references → service project → family delivery",
    JSON.stringify({ ...lineage, synthetic_contract_reference: contractRef, ...rows[0], ...familyEvidence }));
}
