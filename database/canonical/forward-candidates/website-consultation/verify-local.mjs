// Disposable loopback cluster only. Expects an isolated bootstrap role and a fresh database.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { request as httpRequest } from "node:http";
import { readStaffConsultationEmail } from "./staff-contact.mjs";
import { createWebsiteConsultationGateway } from "./gateway.mjs";
import { listenConsultationLoopback } from "./loopback-http.mjs";
import { verifyBrowserConsultation } from "./verify-browser-form.mjs";
import { verifyNativeCompass } from "./verify-native-compass.mjs";
import { verifyLinkedService } from "./verify-linked-service.mjs";
import { verifyStaffViews } from "./verify-staff-views.mjs";
import { handleWebsiteConsultation } from "../../../../website/phoenix-nova-website-v5/lib/website-consultation-intake.ts";

if (process.argv[2] !== "--synthetic-loopback" || !process.argv[3]) throw new Error("A disposable runtime directory is required");
const loadRuntime = createRequire(resolve(process.argv[3], "harness.cjs"));
const { Client, Pool } = loadRuntime("pg");
const port = Number(process.env.CRM_FIXTURE_POSTGRES_PORT ?? 55487);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid disposable fixture port");
const database = "phoenix_website_intake_fixture";
const host = "127.0.0.1";
const bootstrap = "phoenix_bootstrap";
const root = new Client({ host, port, user: bootstrap, database: "postgres" });
await root.connect();
try {
  await root.query("CREATE DATABASE phoenix_website_intake_fixture");
} finally {
  await root.end();
}
const db = new Client({ host, port, user: bootstrap, database });
await db.connect();
const binderPool = new Pool({ host, port, user: "website_fixture_binder", database });
const writerPool = new Pool({ host, port, user: "website_fixture_writer", database });
const outside = new Client({ host, port, user: "website_fixture_outside", database });
const crmService = new Client({ host, port, user: "website_fixture_crm_service", database });
const staff = new Client({ host, port, user: "website_fixture_staff_gateway", database });
const retention = new Client({ host, port, user: "website_fixture_contact_retention", database });
const gatewayPool = new Pool({ host, port, user: "website_fixture_staff_gateway", database });
const principal = "019347ec-7740-7000-a000-000000000001";
const sourceId = "019347ec-7740-7000-a000-000000000002";
const contractId = "019347ec-7740-7000-a000-000000000003";
try {
  const migrations = new URL("../../migrations/", import.meta.url);
  const files = (await readdir(migrations)).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort();
  for (const file of files) await db.query(await readFile(new URL(file, migrations), "utf8"));
  console.log("Applied numbered SQL files:", files.length);
  await db.query(await readFile(new URL("./intake.sql", import.meta.url), "utf8"));
  await db.query(await readFile(new URL("./compass-events.sql", import.meta.url), "utf8"));
  await db.query(await readFile(new URL("./staff-queue.sql", import.meta.url), "utf8"));
  await db.query(await readFile(new URL("./staff-views.sql", import.meta.url), "utf8"));
  await db.query(`
    CREATE ROLE website_fixture_binder LOGIN;
    CREATE ROLE website_fixture_writer LOGIN;
    CREATE ROLE website_fixture_outside LOGIN;
    CREATE ROLE website_fixture_crm_service LOGIN;
    CREATE ROLE website_fixture_staff_gateway LOGIN;
    CREATE ROLE website_fixture_contact_retention LOGIN;
    CREATE ROLE website_fixture_deletion_replay LOGIN;
    CREATE ROLE website_fixture_revocation_replay LOGIN;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO website_fixture_contact_retention;
    GRANT phoenix_website_contact_retention TO website_fixture_contact_retention WITH INHERIT FALSE, SET TRUE;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO website_fixture_deletion_replay;
    GRANT phoenix_website_deletion_replay TO website_fixture_deletion_replay WITH INHERIT FALSE, SET TRUE;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO website_fixture_revocation_replay;
    GRANT phoenix_website_staff_revocation_replay TO website_fixture_revocation_replay WITH INHERIT FALSE, SET TRUE;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO website_fixture_staff_gateway;
    GRANT phoenix_website_consultation_staff_gateway TO website_fixture_staff_gateway WITH INHERIT FALSE, SET TRUE;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO website_fixture_binder, website_fixture_writer, website_fixture_outside, website_fixture_crm_service;
    GRANT phoenix_website_intake TO website_fixture_writer WITH INHERIT FALSE, SET TRUE;
    GRANT phoenix_website_intake_binder TO website_fixture_binder WITH INHERIT FALSE, SET TRUE;
    GRANT phoenix_canonical_reader TO website_fixture_outside WITH INHERIT TRUE, SET FALSE;
    GRANT phoenix_canonical_app TO website_fixture_crm_service WITH INHERIT TRUE, SET FALSE;
  `);
  await db.query(
    "INSERT INTO auth.principals(principal_id,principal_kind,status,service_label) VALUES($1,'SERVICE','ACTIVE','canonical_crm_v2')",
    [principal],
  );
  await db.query(
    "INSERT INTO crm.lead_sources(lead_source_id,source_system,source_channel,status,created_by_principal_id) VALUES($1,'phoenix-nova-website','WEBSITE','ACTIVE',$2)",
    [sourceId, principal],
  );
  const hash = "2".repeat(64);
  const register = (source = sourceId) => db.query(`
    SELECT crm.register_acquisition_contract($1,$2,'fixture-1',$3,'synthetic approval',$4,
      'synthetic retention',$4,'website_fixture_writer',clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour')
  `, [contractId, source, { entry_ref: "/en/consultation", entry_revision: "fixture-1",
    manifest_ref: "synthetic manifest", manifest_sha256: hash }, hash]);
  const otherSource = "019347ec-7740-7000-a000-000000000004";
  await db.query(
    "INSERT INTO crm.lead_sources(lead_source_id,source_system,source_channel,status,created_by_principal_id) VALUES($1,'synthetic-other','WEBSITE','ACTIVE',$2)",
    [otherSource, principal],
  );
  await assert.rejects(register(otherSource), /ACQUISITION_CONTRACT_EVIDENCE_OR_LOGIN_DENIED/);
  await register();
  const compassContractIds = {};
  for (const [offset, domain] of ["education", "identity", "health", "wealth"].entries()) {
    const source = "phoenix-nova-compass-" + domain;
    const id = suffix => "019347ec-7740-7000-a000-" + String(suffix).padStart(12, "0");
    const sourceIdForDomain = id(100 + offset);
    const contractIdForDomain = id(110 + offset);
    await db.query("INSERT INTO crm.lead_sources(lead_source_id,source_system,source_channel,status,created_by_principal_id) VALUES($1,$2,'WEBSITE','ACTIVE',$3)", [sourceIdForDomain, source, principal]);
    const registerEntry = entry => db.query("SELECT crm.register_acquisition_contract($1,$2,'fixture-1',$3,'synthetic approval',$4,'synthetic retention',$4,'website_fixture_writer',clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour')",
      [contractIdForDomain, sourceIdForDomain, { entry_ref: entry, entry_revision: "fixture-1", manifest_ref: "synthetic manifest", manifest_sha256: hash }, hash]);
    await assert.rejects(registerEntry("/unexpected"), /ACQUISITION_CONTRACT_EVIDENCE_OR_LOGIN_DENIED/);
    await registerEntry("/" + domain);
    assert.equal((await db.query("SELECT crm.configure_website_contact_retention($1,180,$2) AS allowed", [contractIdForDomain, hash])).rows[0].allowed, true);
    compassContractIds[source] = contractIdForDomain;
  }
  const writer = await writerPool.connect();
  try {
    await writer.query("SET ROLE phoenix_website_intake");
    const { rows } = await writer.query(`
      SELECT pg_has_role(session_user,'phoenix_canonical_app','MEMBER') AS app_member,
        has_function_privilege(current_user,'crm.create_lead_v2(uuid,uuid,uuid,uuid,uuid,text,uuid,uuid,text)','EXECUTE') AS broad_writer,
        has_table_privilege(current_user,'crm.website_consultation_intake','SELECT') AS direct_read
    `);
    assert.deepEqual(rows, [{ app_member: false, broad_writer: false, direct_read: false }]);
    await writer.query("DISCARD ALL");
  } finally {
    writer.release(true);
  }
  console.log("PASS dedicated writer contract and no general app membership, lead command or table read");
  await outside.connect();
  await assert.rejects(outside.query("SELECT * FROM crm.website_consultation_intake"), /permission denied/);
  const token = "synthetic".repeat(4);
  const origin = "https://preview.example";
  const receiverOrigin = "https://receiver.example";
  const staffOrigin = "https://private-staff.example";
  const issuer = "https://staff.synthetic.example";
  const subject = "synthetic-adviser";
  const contactKey = Buffer.alloc(32, 5);
  const fixtureSessions = new Map([
    ["Bearer synthetic-staff", subject],
    ["Bearer synthetic-dispatcher", "synthetic-dispatcher"],
  ]);
  const gateway = createWebsiteConsultationGateway({
    receiverOrigin, staffOrigin, receiverToken: token, contactKey, macKey: Buffer.alloc(32, 6),
    acquisitionContractId: contractId, compassContractIds, intakePrincipalId: principal, binderPool, writerPool, staffPool: gatewayPool,
    readStaffSession: async request => {
      const sub = fixtureSessions.get(request.headers.get("authorization"));
      return sub ? {
        profile: "STAFF", issuer, subject: sub, brokerAssertion: "synthetic-assertion:" + sub,
        expiresAt: Date.now() + 30000, assertCurrent: async () => true,
      } : null;
    },
    brokerVerifier: { async verify(assertion) {
      if (!assertion.startsWith("synthetic-assertion:")) throw new Error("Unknown synthetic assertion");
      return { iss: issuer, sub: assertion.slice("synthetic-assertion:".length), aud: "phoenix-canonical-postgresql",
        exp: Math.floor(Date.now() / 1000) + 30 };
    } },
  });
  const receiver = gateway.intake;
  const staffHttp = gateway.staff;
  assert.equal((await receiver(new Request(staffOrigin + "/v1/website-consultations", { method: "POST" }))).status, 404);
  assert.equal((await staffHttp(new Request(receiverOrigin + "/internal/website-consultations"))).status, 404);
  assert.equal((await receiver(new Request(receiverOrigin + "/v1/website-consultations?source=website", { method: "POST" }))).status, 404);
  console.log("PASS service composition separates visitor intake and staff origins");
  const websiteConfig = {
    WEBSITE_CONSULTATION_ENABLED: "true",
    WEBSITE_CONSULTATION_PUBLIC_ORIGIN: origin,
    WEBSITE_CONSULTATION_PRIVACY_ZH_URL: origin + "/zh/privacy",
    WEBSITE_CONSULTATION_PRIVACY_EN_URL: origin + "/en/privacy",
    WEBSITE_PRIVACY_APPROVED: "true",
    WEBSITE_PRIVACY_LAUNCH_DATE: "2025-01-01",
    WEBSITE_PRIVACY_VERSION: "website-consultation.v1",
    WEBSITE_PRIVACY_POLICY_ZH: "合成验收政策，非正式文案。",
    WEBSITE_PRIVACY_POLICY_EN: "Synthetic test policy, not approved publication copy.",
    WEBSITE_CONSULTATION_RECEIVER_URL: receiverOrigin + "/v1/website-consultations",
    WEBSITE_CONSULTATION_RECEIVER_TOKEN: token,
  };
  const submit = (service, requestId = "028347ec-7740-4000-a000-000000000001", email = "visitor@example.test", entry) => handleWebsiteConsultation(new Request(origin + "/api/website-consultations" + (entry ? "/" + entry : ""), {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ requestId,
      locale: "en", service, email, consent: true }),
  }), websiteConfig, (url, init) => receiver(new Request(url, init)));
  assert.equal((await submit("education", undefined, "no-policy@example.test")).status, 503);
  assert.equal((await db.query("SELECT crm.configure_website_contact_retention($1,180,$2) AS allowed",
    [contractId, "f".repeat(64)])).rows[0].allowed, false);
  assert.equal((await db.query("SELECT crm.configure_website_contact_retention($1,180,$2) AS allowed",
    [contractId, hash])).rows[0].allowed, true);
  assert.equal((await db.query("SELECT crm.configure_website_contact_retention($1,30,$2) AS allowed",
    [contractId, hash])).rows[0].allowed, false);
  assert.equal((await submit("education")).status, 202);
  assert.equal((await submit("education")).status, 202);
  assert.equal((await submit("health")).status, 409);
  const { rows } = await db.query(`
    SELECT i.service_domain,l.lead_status, l.contact_person_id IS NULL AS unlinked,
      octet_length(i.contact_envelope)>30 AS encrypted
    FROM crm.website_consultation_intake i JOIN crm.leads l USING(lead_id)
  `);
  assert.deepEqual(rows, [{ service_domain: "EDUCATION", lead_status: "NEW", unlinked: true, encrypted: true }]);
  console.log("PASS website to PostgreSQL commit, one lead on retry, conflict and unauthorized read");

  // Prove the existing Canonical follow-up commands can use a website lead.
  // This is a synthetic internal CRM service session, independent of the intake role.
  const employee = "019347ec-7740-7000-a000-000000000011";
  const person = "019347ec-7740-7000-a000-000000000012";
  const task = "019347ec-7740-7000-a000-000000000013";
  const event = "019347ec-7740-7000-a000-000000000014";
  await db.query("INSERT INTO core.people(person_id,display_name) VALUES($1,'Synthetic adviser')", [person]);
  await db.query(
    "INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES($1,$2,'ADVISOR','ACTIVE')",
    [employee, person],
  );
  const lead = (await db.query("SELECT lead_id FROM crm.website_consultation_intake")).rows[0].lead_id;
  const lifetime = (await db.query(`SELECT extract(epoch FROM (contact_expires_at-recorded_at))::float8 AS seconds
    FROM crm.website_consultation_intake WHERE lead_id=$1`, [lead])).rows[0].seconds;
  assert.ok(Math.abs(lifetime - 180 * 86400) < 2);
  await db.query(`
    INSERT INTO auth.external_identities(external_identity_id,issuer,subject,principal_id,status)
    VALUES('019347ec-7740-7000-a000-000000000015',$1,$2,$3,'ACTIVE')
  `, [issuer, subject, employee]);
  await staff.connect();
  await staff.query("SET ROLE phoenix_website_consultation_staff_gateway");
  await assert.rejects(staff.query("SELECT contact_envelope FROM crm.website_consultation_intake"), /permission denied/);
  await assert.rejects(outside.query("SELECT * FROM crm.list_website_consultation_staff_queue($1,$2)", [issuer, subject]), /permission denied/);
  const queue = (who = subject) => staff.query("SELECT * FROM crm.list_website_consultation_staff_queue($1,$2)", [issuer, who]);
  const readEmail = (who = subject) => readStaffConsultationEmail(staff, { issuer, subject: who }, lead, contactKey);
  assert.equal((await queue()).rowCount, 0);
  assert.equal(await readEmail(), null);
  const serviceOrg = "019347ec-7740-7000-a000-000000000030";
  const otherOrg = "019347ec-7740-7000-a000-000000000031";
  await db.query(`
    INSERT INTO core.organizations
      (organization_id,legal_name,display_name,organization_type,country_code,created_by_principal_id,updated_by_principal_id)
    VALUES ($1,'Synthetic service organization','Synthetic service organization','ENTERPRISE','CN',$3,$3),
           ($2,'Synthetic external organization','Synthetic external organization','ENTERPRISE','CN',$3,$3)
  `, [serviceOrg, otherOrg, principal]);
  await db.query("INSERT INTO crm.website_consultation_contract_organizations VALUES ($1,$2)", [contractId, serviceOrg]);
  await db.query(`
    INSERT INTO crm.website_consultation_staff_grants(principal_id,organization_id,service_domain,grant_kind,valid_until)
    VALUES($1,$2,'HEALTH','DISPATCHER',clock_timestamp()+interval '1 hour'),
          ($1,$2,'EDUCATION','ADVISER',clock_timestamp()+interval '1 hour'),
          ($1,$3,'EDUCATION','DISPATCHER',clock_timestamp()+interval '1 hour')
  `, [employee, serviceOrg, otherOrg]);
  assert.equal((await queue()).rowCount, 0);
  assert.equal(await readEmail(), null);
  const ticket = (await db.query(`
    SELECT auth.issue_context_ticket($1,NULL,NULL,'INTERNAL',clock_timestamp()+interval '30 seconds',gen_random_uuid(),$1) AS ticket
  `, [principal])).rows[0].ticket;
  await crmService.connect();
  await crmService.query("SELECT auth.redeem_context_ticket($1,$2)", [ticket, principal]);
  const scheduled = await crmService.query(`
    SELECT crm.schedule_follow_up($1,'LEAD',$2,NULL,NULL,'Synthetic first contact',$3,
      clock_timestamp()+interval '1 day') AS ok
  `, [task, lead, employee]);
  assert.equal(scheduled.rows[0].ok, true);
  const queued = await queue();
  assert.equal(queued.rowCount, 1);
  assert.equal(queued.rows[0].lead_id, lead);
  assert.equal(queued.rows[0].service_domain, "EDUCATION");
  assert.equal(Object.hasOwn(queued.rows[0], "contact_envelope"), false);
  await db.query(`UPDATE crm.website_consultation_staff_grants SET organization_id=$2
    WHERE principal_id=$1 AND grant_kind='ADVISER'`, [employee, otherOrg]);
  assert.equal((await queue()).rowCount, 0);
  assert.equal(await readEmail(), null);
  await db.query(`UPDATE crm.website_consultation_staff_grants SET organization_id=$2
    WHERE principal_id=$1 AND grant_kind='ADVISER'`, [employee, serviceOrg]);
  assert.equal((await queue("unknown")).rowCount, 0);
  assert.equal(await readEmail("unknown"), null);
  const queueUrl = staffOrigin + "/internal/website-consultations";
  const contactUrl = queueUrl + "/" + lead + "/contact";
  const staffHeaders = { authorization: "Bearer synthetic-staff", origin: staffOrigin };
  const workbenchUrl = queueUrl + "/workbench";
  assert.equal((await staffHttp(new Request(workbenchUrl))).status, 401);
  const workbench = await staffHttp(new Request(workbenchUrl, { headers: staffHeaders }));
  assert.equal(workbench.status, 200);
  const html = await workbench.text();
  assert.match(html, /<h1>官网咨询工作台<\/h1>/);
  assert.doesNotMatch(html, /visitor@example\.test/);
  const script = html.match(/<script nonce="([^"]+)">([\s\S]*)<\/script>/);
  assert.ok(script);
  assert.ok(workbench.headers.get("content-security-policy").includes("script-src 'nonce-" + script[1] + "'"));
  assert.doesNotThrow(() => new Script(script[2]));
  console.log("PASS staff workbench authentication, private HTML, and nonce-restricted script");
  assert.equal((await staffHttp(new Request(queueUrl, { headers: { "x-principal-id": employee } }))).status, 401);
  assert.equal((await staffHttp(new Request(contactUrl, { method: "POST", headers: { ...staffHeaders, origin } }))).status, 403);
  const listed = await staffHttp(new Request(queueUrl, { headers: staffHeaders }));
  assert.equal(listed.status, 200);
  assert.equal((await listed.json()).items[0].leadId, lead);
  const displayed = await staffHttp(new Request(contactUrl, { method: "POST", headers: staffHeaders }));
  assert.equal(displayed.status, 200);
  assert.equal(displayed.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await displayed.json(), { email: "visitor@example.test" });
  const reads = await db.query("SELECT actor_principal_id,lead_id FROM crm.website_consultation_contact_reads");
  assert.deepEqual(reads.rows, [{ actor_principal_id: employee, lead_id: lead }]);
  await db.query("UPDATE crm.website_consultation_staff_grants SET revoked_at=clock_timestamp() WHERE principal_id=$1", [employee]);
  assert.equal((await queue()).rowCount, 0);
  assert.equal(await readEmail(), null);
  assert.equal((await staffHttp(new Request(contactUrl, { method: "POST", headers: staffHeaders }))).status, 404);
  console.log("PASS private staff HTTP queue and contact, with no-store and authentication checks");
  console.log("PASS assigned adviser decrypts contact after audited access, with denial before assignment and after revocation");
  console.log("PASS existing staff identity, assignment scope, domain restriction and live grant revocation");
  assert.equal((await crmService.query("SELECT crm.transition_lead($1,'CONTACTED',$2) AS ok", [lead, event])).rows[0].ok, true);
  assert.equal((await crmService.query("SELECT crm.transition_follow_up($1,'COMPLETED') AS ok", [task])).rows[0].ok, true);
  await crmService.query("SELECT auth.clear_context()");
  const followUp = await db.query(`
    SELECT f.assigned_principal_id, f.status, l.lead_status
    FROM crm.follow_ups f JOIN crm.leads l USING(lead_id)
    WHERE f.follow_up_id=$1
  `, [task]);
  assert.deepEqual(followUp.rows, [{ assigned_principal_id: employee, status: "COMPLETED", lead_status: "CONTACTED" }]);
  console.log("PASS internal CRM session schedules, assigns and completes a website lead follow-up");

  const dispatcher = "019347ec-7740-7000-a000-000000000021";
  const dispatcherPerson = "019347ec-7740-7000-a000-000000000022";
  await db.query("INSERT INTO core.people(person_id,display_name) VALUES($1,'Synthetic dispatcher')", [dispatcherPerson]);
  await db.query("INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES($1,$2,'ADVISOR','ACTIVE')", [dispatcher, dispatcherPerson]);
  await db.query(`
    INSERT INTO auth.external_identities(external_identity_id,issuer,subject,principal_id,status)
      VALUES('019347ec-7740-7000-a000-000000000023',$1,'synthetic-dispatcher',$2,'ACTIVE')
  `, [issuer, dispatcher]);
  await db.query(`
    UPDATE crm.website_consultation_staff_grants SET revoked_at=NULL
      WHERE principal_id=$1 AND service_domain='EDUCATION' AND grant_kind='ADVISER'
  `, [employee]);
  await db.query(`
    INSERT INTO crm.website_consultation_staff_grants(principal_id,organization_id,service_domain,grant_kind,valid_until)
      VALUES($1,$2,'EDUCATION','DISPATCHER',clock_timestamp()+interval '1 hour')
  `, [dispatcher, serviceOrg]);
  const secondRequest = "028347ec-7740-4000-a000-000000000002";
  assert.equal((await submit("education", secondRequest)).status, 202);
  const newLead = (await db.query("SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [secondRequest])).rows[0].lead_id;
  assert.notEqual(newLead, lead, "same contact with a fresh request ID must preserve a separate lead");
  const matchPair = await db.query(`
    SELECT count(DISTINCT duplicate_match_mac)::int AS match_count,
           count(DISTINCT payload_mac)::int AS request_count
    FROM crm.website_consultation_intake WHERE lead_id IN ($1,$2)
  `, [lead, newLead]);
  assert.deepEqual(matchPair.rows, [{ match_count: 1, request_count: 2 }]);
  await assert.rejects(staff.query("SELECT duplicate_match_mac FROM crm.website_consultation_intake"), /permission denied/);
  assert.equal((await submit("education", secondRequest)).status, 202);
  assert.equal((await db.query("SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [secondRequest])).rows[0].lead_id, newLead);
  assert.equal((await db.query("SELECT count(*)::int AS count FROM crm.leads WHERE lead_id IN ($1,$2) AND lead_status<>'MERGED'", [lead, newLead])).rows[0].count, 2);
  const assignees = async token => (await staffHttp(new Request(queueUrl + "/" + newLead + "/assignees", {
    headers: { authorization: "Bearer " + token },
  }))).json();
  assert.deepEqual(await assignees("synthetic-staff"), { items: [] });
  assert.deepEqual(await assignees("synthetic-dispatcher"), { items: [{ id: employee, name: "Synthetic adviser" }] });
  const post = (operation, token, body) => staffHttp(new Request(queueUrl + "/" + newLead + "/" + operation, {
    method: "POST",
    headers: { authorization: "Bearer " + token, origin: staffOrigin, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
  const otherFamily = "019347ec-7740-7000-a000-000000000039";
  await db.query("INSERT INTO core.families(family_id,display_name) VALUES($1,'Synthetic unrelated family')", [otherFamily]);
  const setLeadFamily = family => db.query("UPDATE crm.leads SET family_id=$2 WHERE lead_id=$1", [newLead, family]);
  const pairScopeSql = "SELECT crm.website_consultation_duplicate_scope_allows($1,$2,$3,'DISPATCHER') AS allowed";
  const duplicateScope = async (first, second) =>
    (await db.query(pairScopeSql, [dispatcher, first, second])).rows[0].allowed;
  assert.equal(await duplicateScope(lead, newLead), true);
  assert.equal(await duplicateScope(newLead, lead), true);
  const lockPairSql = "SELECT crm.lock_website_consultation_duplicate_pair($1,$2,$3,'DISPATCHER') AS allowed";
  assert.equal((await db.query(lockPairSql, [dispatcher, newLead, lead])).rows[0].allowed, true);
  await assert.rejects(staff.query(lockPairSql, [dispatcher, lead, newLead]), /permission denied/);
  const duplicatePost = (operation, token, body) => staffHttp(new Request(queueUrl + "/duplicates/" + operation, {
    method: "POST",
    headers: { authorization: "Bearer " + token, origin: staffOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  assert.equal((await duplicatePost("propose", "synthetic-staff", { firstLeadId: lead, secondLeadId: newLead })).status, 404);
  assert.equal((await duplicatePost("propose", "synthetic-dispatcher", { firstLeadId: lead, secondLeadId: newLead, actor: employee })).status, 400);
  const suggestionsFor = async token => (await (await staffHttp(new Request(queueUrl + "/duplicates", {
    headers: { authorization: "Bearer " + token },
  }))).json()).suggestions;
  const [firstLeadId, secondLeadId] = [lead, newLead].sort();
  assert.deepEqual(await suggestionsFor("synthetic-dispatcher"), [{ firstLeadId, secondLeadId }]);
  assert.deepEqual(await suggestionsFor("synthetic-staff"), []);
  const setDispatcherRevoked = revoked => db.query(`
    UPDATE crm.website_consultation_staff_grants
    SET revoked_at=CASE WHEN $2::boolean THEN clock_timestamp() ELSE NULL END
    WHERE principal_id=$1 AND grant_kind='DISPATCHER'
  `, [dispatcher, revoked]);
  await setDispatcherRevoked(true);
  assert.deepEqual(await suggestionsFor("synthetic-dispatcher"), []);
  await setDispatcherRevoked(false);
  const expiry = (await db.query("SELECT contact_expires_at::text AS expiry FROM crm.website_consultation_intake WHERE lead_id=$1",
    [newLead])).rows[0].expiry;
  await db.query("UPDATE crm.website_consultation_intake SET contact_expires_at=clock_timestamp()-interval '1 second' WHERE lead_id=$1",
    [newLead]);
  assert.deepEqual(await suggestionsFor("synthetic-dispatcher"), []);
  await db.query("UPDATE crm.website_consultation_intake SET contact_expires_at=$2 WHERE lead_id=$1", [newLead, expiry]);
  assert.deepEqual(await suggestionsFor("synthetic-dispatcher"), [{ firstLeadId, secondLeadId }]);
  const proposals = await Promise.all([
    duplicatePost("propose", "synthetic-dispatcher", { firstLeadId: lead, secondLeadId: newLead }),
    duplicatePost("propose", "synthetic-dispatcher", { firstLeadId: newLead, secondLeadId: lead }),
  ]);
  for (const response of proposals) assert.equal(response.status, 200);
  const [{ candidateId }, reversedProposal] = await Promise.all(proposals.map(response => response.json()));
  assert.ok(candidateId);
  assert.deepEqual(reversedProposal, { candidateId });
  assert.deepEqual(await suggestionsFor("synthetic-dispatcher"), []);
  const proposalEvent = "019347ec-7740-7000-a000-000000000092";
  const propose = async (who, first, second) => (await staff.query(
    "SELECT crm.propose_website_consultation_duplicate($1,$2,$3,$4,$5,$6,$7) AS candidate",
    [issuer, who, first, second, candidateId, proposalEvent, "a".repeat(64)],
  )).rows[0].candidate;
  assert.equal(await propose(subject, lead, newLead), null);
  assert.equal(await propose("synthetic-dispatcher", lead, newLead), null, "different evidence must not reuse this pending proposal");
  const duplicateItems = async token => {
    const response = await staffHttp(new Request(queueUrl + "/duplicates", {
      headers: { authorization: "Bearer " + token },
    }));
    assert.equal(response.status, 200);
    return (await response.json()).items;
  };
  assert.deepEqual(await duplicateItems("synthetic-staff"), []);
  assert.equal((await duplicateItems("synthetic-dispatcher")).find(item => item.candidateId === candidateId)?.canReview, false);
  const reviewEvent = "019347ec-7740-7000-a000-000000000093";
  const review = async who => (await staff.query(
    "SELECT crm.review_website_consultation_duplicate($1,$2,$3,'CONFIRMED',$4) AS accepted",
    [issuer, who, candidateId, reviewEvent],
  )).rows[0].accepted;
  assert.equal(await review("synthetic-dispatcher"), false);
  assert.equal(await review(subject), false);
  await db.query(`INSERT INTO crm.website_consultation_staff_grants
    (principal_id,organization_id,service_domain,grant_kind,valid_until)
    VALUES($1,$2,'EDUCATION','DISPATCHER',clock_timestamp()+interval '1 hour')`, [employee, serviceOrg]);
  assert.deepEqual((await db.query(
    "SELECT actor_principal_id,event_kind FROM crm.lead_events WHERE lead_id=$1 AND event_kind='DEDUP_CANDIDATE'",
    [[lead, newLead].sort()[0]],
  )).rows, [{ actor_principal_id: dispatcher, event_kind: "DEDUP_CANDIDATE" }]);
  assert.equal(await duplicateScope(lead, lead), false);
  await assert.rejects(staff.query(pairScopeSql, [dispatcher, lead, newLead]), /permission denied/);
  await setLeadFamily(otherFamily);
  assert.deepEqual(await duplicateItems("synthetic-dispatcher"), []);
  assert.equal(await review(subject), false);
  assert.equal(await propose("synthetic-dispatcher", lead, newLead), null);
  assert.equal(await duplicateScope(lead, newLead), false);
  assert.equal(await duplicateScope(newLead, lead), false);
  assert.equal((await db.query(lockPairSql, [dispatcher, newLead, lead])).rows[0].allowed, false);
  assert.deepEqual(await assignees("synthetic-dispatcher"), { items: [] });
  assert.equal((await post("assign", "synthetic-dispatcher", { assigneeId: employee })).status, 404);
  await setLeadFamily(null);
  assert.equal((await duplicatePost("review", "synthetic-staff", { candidateId, decision: "CONFIRMED" })).status, 200);
  assert.equal(await review(subject), false);
  assert.deepEqual((await db.query(
    "SELECT actor_principal_id,event_kind,to_status FROM crm.lead_events WHERE lead_id=$1 AND event_kind='DEDUP_REVIEWED'", [[lead, newLead].sort()[0]],
  )).rows, [{ actor_principal_id: employee, event_kind: "DEDUP_REVIEWED", to_status: "CONFIRMED" }]);
  await db.query(`UPDATE crm.website_consultation_staff_grants SET revoked_at=clock_timestamp()
    WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind='DISPATCHER'`,
    [employee, serviceOrg]);
  assert.equal((await post("assign", "synthetic-staff", { assigneeId: employee })).status, 404);
  await db.query("UPDATE crm.website_consultation_staff_grants SET organization_id=$2 WHERE principal_id=$1", [dispatcher, otherOrg]);
  assert.equal(await duplicateScope(lead, newLead), false);
  assert.deepEqual(await assignees("synthetic-dispatcher"), { items: [] });
  assert.equal((await post("assign", "synthetic-dispatcher", { assigneeId: employee })).status, 404);
  await db.query("UPDATE crm.website_consultation_staff_grants SET organization_id=$2 WHERE principal_id=$1", [dispatcher, serviceOrg]);
  const assigned = await post("assign", "synthetic-dispatcher", { assigneeId: employee });
  assert.equal(assigned.status, 200);
  const assignedBody = await assigned.json();
  await db.query(`INSERT INTO crm.website_consultation_staff_grants
    (principal_id,organization_id,service_domain,grant_kind,valid_until)
    VALUES ($1,$2,'EDUCATION','ADVISER',clock_timestamp()+interval '1 hour')`, [dispatcher, serviceOrg]);
  assert.deepEqual((await assignees("synthetic-dispatcher")).items.map(item => item.id), [dispatcher]);
  assert.deepEqual(await assignees("synthetic-staff"), { items: [] });
  assert.equal((await post("reassign", "synthetic-staff", { assigneeId: dispatcher })).status, 404);
  assert.deepEqual(await (await post("reassign", "synthetic-dispatcher", { assigneeId: dispatcher })).json(), assignedBody);
  assert.equal((await post("contact", "synthetic-staff")).status, 404);
  assert.equal((await post("complete", "synthetic-staff")).status, 404);
  assert.deepEqual(await (await post("reassign", "synthetic-dispatcher", { assigneeId: employee })).json(), assignedBody);
  await db.query(`UPDATE crm.website_consultation_staff_grants SET revoked_at=clock_timestamp()
    WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind='ADVISER'`,
  [dispatcher, serviceOrg]);
  assert.equal((await db.query("SELECT count(*)::int AS count FROM crm.follow_ups WHERE lead_id=$1", [newLead])).rows[0].count, 1);
  const pending = await db.query(`
    SELECT f.due_at, f.status, f.assigned_principal_id
      FROM crm.follow_ups f
     WHERE f.lead_id=$1 AND f.follow_up_id=$2
  `, [newLead, assignedBody.taskId]);
  const mergeId = "019347ec-7740-7000-a000-000000000094";
  const mergeEvent = "019347ec-7740-7000-a000-000000000095";
  const merge = async who => (await staff.query(
    "SELECT crm.merge_website_consultation_duplicate($1,$2,$3,$4,$5,$6,$7) AS accepted",
    [issuer, who, candidateId, newLead, lead, mergeId, mergeEvent],
  )).rows[0].accepted;
  assert.equal(await merge("synthetic-dispatcher"), false, "pending source task must remain actionable");
  assert.equal(pending.rowCount, 1);
  assert.equal(pending.rows[0].status, "PENDING");
  assert.equal(pending.rows[0].assigned_principal_id, employee);
  await verifyStaffViews({ db, staff, outside, staffHttp, issuer, staffOrigin, employee, dispatcher,
    serviceOrg, otherOrg, contractId, newLead, otherFamily });
  const remainingHours = (new Date(pending.rows[0].due_at).getTime() - Date.now()) / 3600000;
  assert(remainingHours > 23 && remainingHours <= 24.1, "internal first-contact due window");
  const assignedQueue = await staffHttp(new Request(queueUrl, {
    headers: { authorization: "Bearer synthetic-staff" },
  }));
  const dueItem = (await assignedQueue.json()).items.find(item => item.leadId === newLead);
  assert.equal(new Date(dueItem.nextDueAt).getTime(), new Date(pending.rows[0].due_at).getTime());
  console.log("PASS first-contact task due time and authorized private-queue due projection");
  assert.deepEqual(await assignees("synthetic-dispatcher"), { items: [] });
  assert.deepEqual(await (await post("assign", "synthetic-dispatcher", { assigneeId: employee })).json(), assignedBody);
  assert.equal((await post("complete", "synthetic-dispatcher")).status, 404);
  assert.equal((await post("contact", "synthetic-staff")).status, 200);
  for (const [deny, restore] of [
    ["organization_id=$2", "organization_id=$3"],
    ["revoked_at=clock_timestamp()", "revoked_at=NULL"],
    ["valid_from=clock_timestamp()-interval '2 hours', valid_until=clock_timestamp()-interval '1 hour'",
      "valid_from=clock_timestamp()-interval '1 minute', valid_until=clock_timestamp()+interval '1 hour'"],
  ]) {
    const setGrant = async (change, organization) => db.query(
      `UPDATE crm.website_consultation_staff_grants SET ${change.replace("$3", "$2")}
       WHERE principal_id=$1 AND grant_kind='ADVISER'`,
      organization ? [employee, organization] : [employee],
    );
    await setGrant(deny, deny.includes("organization_id") ? otherOrg : undefined);
    assert.equal((await post("contact", "synthetic-staff")).status, 404);
    assert.equal((await post("complete", "synthetic-staff")).status, 404);
    assert.equal((await db.query("SELECT status FROM crm.follow_ups WHERE follow_up_id=$1", [assignedBody.taskId])).rows[0].status, "PENDING");
    await setGrant(restore, restore.includes("organization_id") ? serviceOrg : undefined);
  }
  console.log("PASS cross-organization assignment and same-session action denial after grant change, revocation or expiry");
  await db.query("UPDATE auth.principals SET status='DISABLED' WHERE principal_id=$1", [employee]);
  assert.equal((await queue()).rowCount, 0);
  assert.equal((await post("contact", "synthetic-staff")).status, 404);
  assert.equal((await post("complete", "synthetic-staff")).status, 404);
  assert.equal((await db.query("SELECT status FROM crm.follow_ups WHERE follow_up_id=$1", [assignedBody.taskId])).rows[0].status, "PENDING");
  await db.query("UPDATE auth.principals SET status='ACTIVE' WHERE principal_id=$1", [employee]);
  console.log("PASS disabled employee loses queue, contact and completion access with the original credential");
  await setLeadFamily(otherFamily);
  assert.equal((await queue()).rows.some(item => item.lead_id === newLead), false);
  assert.equal((await post("contact", "synthetic-staff")).status, 404);
  assert.equal((await post("complete", "synthetic-staff")).status, 404);
  assert.equal((await db.query("SELECT status FROM crm.follow_ups WHERE follow_up_id=$1", [assignedBody.taskId])).rows[0].status, "PENDING");
  await setLeadFamily(null);
  console.log("PASS family-linked lead is excluded from intake queue, assignment, contact and completion");
  assert.deepEqual(await (await post("complete", "synthetic-staff")).json(), assignedBody);
  assert.deepEqual(await (await post("complete", "synthetic-staff")).json(), assignedBody);
  const history = await db.query(`
    SELECT event_kind,actor_principal_id FROM crm.lead_events
    WHERE lead_id=$1 AND reason_code IN ('WEBSITE_CONSULTATION_ASSIGNED','WEBSITE_CONSULTATION_CONTACTED')
    ORDER BY event_kind
  `, [newLead]);
  assert.deepEqual(history.rows, [
    { event_kind: "ASSIGNED", actor_principal_id: dispatcher },
    { event_kind: "STATUS_CHANGED", actor_principal_id: employee },
  ]);
  console.log("PASS staff HTTP assign, reveal and complete with separate actors and idempotent retries");
  assert.equal(await merge(subject), false);
  await setLeadFamily(otherFamily);
  assert.equal(await merge("synthetic-dispatcher"), false);
  await setLeadFamily(null);
  assert.equal((await duplicatePost("merge", "synthetic-dispatcher", { candidateId, sourceLeadId: newLead, targetLeadId: lead })).status, 200);
  assert.equal(await merge("synthetic-dispatcher"), false);
  assert.deepEqual((await db.query(
    "SELECT lead_status,merged_into_lead_id FROM crm.leads WHERE lead_id=$1", [newLead],
  )).rows, [{ lead_status: "MERGED", merged_into_lead_id: lead }]);
  assert.deepEqual((await db.query(
    "SELECT actor_principal_id,event_kind FROM crm.lead_events WHERE lead_id=$1 AND event_kind='MERGED'", [newLead],
  )).rows, [{ actor_principal_id: dispatcher, event_kind: "MERGED" }]);
  assert.equal((await queue()).rows.some(item => item.lead_id === newLead), false);
  const rateRequest = "028347ec-7740-4000-a000-000000000009";
  const cancelRequest = "028347ec-7740-4000-a000-000000000042";
  assert.equal((await submit("education", cancelRequest, "synthetic-cancel@example.test")).status, 202);
  const cancelLead = (await db.query("SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [cancelRequest])).rows[0].lead_id;
  const staffLeadPost = (leadId, operation, token, body = {}) => staffHttp(new Request(queueUrl + "/" + leadId + "/" + operation, {
    method: "POST", headers: { authorization: "Bearer " + token, origin: staffOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  const cancelPost = (operation, token, body) => staffLeadPost(cancelLead, operation, token, body);
  assert.equal((await cancelPost("assign", "synthetic-dispatcher", { assigneeId: employee })).status, 200);
  assert.equal((await cancelPost("cancel", "synthetic-staff")).status, 404);
  const cancellations = await Promise.all([
    cancelPost("cancel", "synthetic-dispatcher"), cancelPost("cancel", "synthetic-dispatcher"),
  ]);
  for (const response of cancellations) assert.equal(response.status, 200);
  assert.deepEqual(await cancellations[0].json(), await cancellations[1].json());
  assert.equal((await cancelPost("complete", "synthetic-staff")).status, 404);
  assert.equal((await db.query("SELECT status FROM crm.follow_ups WHERE lead_id=$1", [cancelLead])).rows[0].status, "CANCELLED");
  assert.deepEqual((await db.query(`SELECT actor_principal_id FROM crm.lead_events
    WHERE lead_id=$1 AND reason_code='WEBSITE_CONSULTATION_FOLLOW_UP_CANCELLED'`, [cancelLead])).rows,
    [{ actor_principal_id: dispatcher }]);
  const rateResults = await Promise.all(Array.from({ length: 9 }, () =>
    submit("identity", rateRequest, "synthetic-rate@example.test")));
  assert.deepEqual(rateResults.map(response => response.status).sort(), [202, 202, 202, 202, 202, 202, 202, 202, 429]);
  const rateRows = await db.query("SELECT count(*)::int AS count FROM crm.website_consultation_intake WHERE request_id=$1", [rateRequest]);
  assert.equal(rateRows.rows[0].count, 1);
  await assert.rejects(outside.query("SELECT * FROM crm.website_intake_rate_limits"), /permission denied/);
  console.log("PASS shared PostgreSQL limiter under concurrent retries without duplicate leads");
  if (process.argv[4]) {
    const thirdRequest = "028347ec-7740-4000-a000-000000000003";
    assert.equal((await submit("education", thirdRequest)).status, 202);
    const browserLead = (await db.query("SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [thirdRequest])).rows[0].lead_id;
    const { chromium } = process.env.PLAYWRIGHT_MODULE
      ? loadRuntime(process.env.PLAYWRIGHT_MODULE) : loadRuntime("playwright-core");
    const browser = await chromium.launch({
      ...(process.argv[4] === "--bundled-chromium" ? {} : { executablePath: process.argv[4] }),
      headless: true,
    });
    const open = async (token, width) => {
      const context = await browser.newContext({ viewport: { width, height: 850 } });
      await context.route(staffOrigin + "/**", async route => {
        const request = route.request();
        const headers = new Headers(await request.allHeaders());
        headers.set("authorization", "Bearer " + token);
        const body = request.postDataBuffer();
        const response = await staffHttp(new Request(request.url(), {
          method: request.method(), headers, ...(body ? { body } : {}),
        }));
        await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers),
          body: Buffer.from(await response.arrayBuffer()) });
      });
      const page = await context.newPage();
      assert.equal((await page.goto(workbenchUrl)).status(), 200);
      const item = page.locator("article").filter({ hasText: browserLead });
      return { page, item, context };
    };
    const capture = async (page, name) => {
      const directory = process.env.CRM_FIXTURE_PREVIEW_DIR;
      if (directory) {
        await mkdir(directory, { recursive: true });
        await page.screenshot({ path: resolve(directory, name + ".png"), fullPage: true });
      }
    };
    try {
      const dispatch = await open("synthetic-dispatcher", 1440);
      await dispatch.page.getByRole("heading", { name: "Dispatcher · 业务调度" }).waitFor();
      assert.equal(await dispatch.page.getByRole("button", { name: "查看邮箱", exact: true }).count(), 0);
      assert.equal(await dispatch.page.getByRole("button", { name: "完成首次跟进", exact: true }).count(), 0);
      await dispatch.item.waitFor();
      await capture(dispatch.page, "dispatcher-1440");
      await dispatch.item.getByRole("button", { name: "加载可分配顾问" }).click();
      await dispatch.item.getByRole("combobox", { name: "顾问", exact: true }).selectOption({ label: "Synthetic adviser" });
      await dispatch.item.getByRole("button", { name: "分配", exact: true }).click();
      await dispatch.page.getByRole("status").filter({ hasText: "已分配跟进" }).waitFor();
      await dispatch.context.close();

      const overdueTask = await db.query(`
        UPDATE crm.follow_ups SET due_at=clock_timestamp()-interval '1 hour'
        WHERE lead_id=$1 AND status='PENDING'
        RETURNING follow_up_id
      `, [browserLead]);
      assert.equal(overdueTask.rowCount, 1);
      const adviser = await open("synthetic-staff", 320);
      await adviser.item.getByText(/待办已逾期/).waitFor();
      assert.equal(await adviser.page.getByRole("button", { name: "加载接手顾问" }).count(), 0);
      assert.equal(await adviser.page.getByRole("button", { name: "取消首次跟进" }).count(), 0);
      assert.equal(await adviser.page.getByRole("button", { name: "提议重复线索" }).count(), 0);
      await capture(adviser.page, "adviser-320");
      assert.equal(await adviser.page.getByText("visitor@example.test").count(), 0);
      const readCount = async () => (await db.query("SELECT count(*)::int AS n FROM crm.website_consultation_contact_reads WHERE lead_id=$1", [browserLead])).rows[0].n;
      const beforeReveal = await readCount();
      await adviser.item.getByRole("button", { name: "查看邮箱", exact: true }).click();
      await adviser.item.getByText("visitor@example.test", { exact: true }).waitFor();
      assert.equal(await readCount(), beforeReveal + 1);
      assert.ok(await adviser.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      for (const width of [320, 390, 1440]) {
        for (const [token, role] of [["synthetic-dispatcher", "dispatcher"], ["synthetic-staff", "adviser"]]) {
          const preview = await open(token, width);
          await preview.item.waitFor();
          assert.ok(await preview.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          if (width === 390) {
            await db.query("UPDATE crm.leads SET family_id=$2 WHERE lead_id=$1", [browserLead, otherFamily]);
            try {
              const refreshed = preview.page.waitForResponse(response => response.url().endsWith("/views/" + role.toUpperCase()));
              await preview.page.getByRole("button", { name: "刷新队列" }).click();
              const payload = await (await refreshed).json();
              assert.equal(payload.items.some(item => item.leadId === browserLead), false);
              await preview.page.getByRole("status").filter({ hasText: "已载入获授权" }).waitFor();
              assert.equal(await preview.item.count(), 0);
            } finally { await db.query("UPDATE crm.leads SET family_id=NULL WHERE lead_id=$1", [browserLead]); }
            await preview.page.getByRole("button", { name: "刷新队列" }).click();
            await preview.item.waitFor();
          }
          if (width === 1440) {
            await db.query("UPDATE crm.website_consultation_contract_organizations SET organization_id=$2 WHERE contract_id=$1", [contractId, otherOrg]);
            try {
              await preview.page.getByRole("button", { name: "刷新队列" }).click();
              await preview.page.getByRole("status").filter({ hasText: "暂无获授权" }).waitFor();
              assert.equal(await preview.page.locator("#lead-list article").count(), 0);
              assert.equal(await preview.page.locator("#summary strong").first().textContent(), "0");
            } finally {
              await db.query("UPDATE crm.website_consultation_contract_organizations SET organization_id=$2 WHERE contract_id=$1", [contractId, serviceOrg]);
            }
            await preview.page.getByRole("button", { name: "刷新队列" }).click();
            await preview.item.waitFor();
          }
          await capture(preview.page, role + "-" + width);
          await preview.page.getByRole("button", { name: "Founder · 设计预览" }).click();
          await preview.page.getByRole("heading", { name: "Founder · 经营概览" }).waitFor();
          await preview.page.getByText("经营授权 · HOLD", { exact: true }).waitFor();
          assert.equal(await preview.page.locator("#lead-list article").count(), 0);
          assert.equal(await preview.page.getByText("visitor@example.test").count(), 0);
          assert.ok(await preview.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          const founder = await preview.page.evaluate(async () => {
            const response = await fetch("/internal/website-consultations/views/FOUNDER");
            return { status: response.status, body: await response.json() };
          });
          assert.deepEqual(founder, { status: 403, body: { code: "FOUNDER_SCOPE_UNCONFIRMED" } });
          if (role === "dispatcher") await capture(preview.page, "founder-hold-" + width);
          await preview.context.close();
        }
      }
      // Revoke with the original browser credential and clear rendered contacts
      // on the very next refresh; restoring scope does not create a new session.
      await db.query(`UPDATE crm.website_consultation_staff_grants SET revoked_at=clock_timestamp()
        WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind='ADVISER'`, [employee, serviceOrg]);
      await adviser.page.getByRole("button", { name: "刷新队列" }).click();
      await adviser.page.getByRole("status").filter({ hasText: "没有有效的工作台角色授权" }).waitFor();
      assert.equal(await adviser.page.getByText("visitor@example.test").count(), 0);
      assert.equal(await adviser.page.locator("#lead-list article").count(), 0);
      await db.query(`UPDATE crm.website_consultation_staff_grants SET revoked_at=NULL
        WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind='ADVISER'`, [employee, serviceOrg]);
      await adviser.page.getByRole("button", { name: "刷新队列" }).click();
      await adviser.item.getByRole("button", { name: "完成首次跟进" }).click();
      await adviser.page.getByRole("status").filter({ hasText: "已记录首次跟进" }).waitFor();
      assert.equal(await adviser.page.getByText("visitor@example.test").count(), 0);
      await adviser.item.getByText(/已联系/).waitFor();
      fixtureSessions.delete("Bearer synthetic-staff");
      await adviser.page.getByRole("button", { name: "刷新队列" }).click();
      await adviser.page.getByRole("status").filter({ hasText: "员工会话已失效" }).waitFor();
      assert.equal(await adviser.page.locator("#lead-list article").count(), 0);
      fixtureSessions.set("Bearer synthetic-staff", subject);
      await adviser.context.close();
      const proposer = await open("synthetic-dispatcher", 1440);
      const suggestedPair = proposer.page.getByRole("list", { name: "待处理重复候选" }).locator("li")
        .filter({ hasText: browserLead }).filter({ hasText: lead });
      await suggestedPair.getByText("可能重复 · 待人工判断").waitFor();
      await suggestedPair.getByRole("button", { name: "提交此候选" }).click();
      await proposer.page.getByRole("status").filter({ hasText: "等待另一名员工审核" }).waitFor();
      assert.equal(await suggestedPair.getByRole("button", { name: "提交此候选" }).count(), 0);
      assert.equal(await proposer.page.getByRole("button", { name: "确认重复" }).count(), 0);
      await proposer.context.close();
      await db.query(`UPDATE crm.website_consultation_staff_grants SET revoked_at=NULL
        WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind='DISPATCHER'`,
        [employee, serviceOrg]);
      const reviewer = await open("synthetic-staff", 390);
      const pair = reviewer.page.getByRole("list", { name: "待处理重复候选" }).locator("li").filter({ hasText: browserLead });
      await pair.getByRole("button", { name: "确认重复" }).click();
      await pair.getByText("已确认重复").waitFor();
      reviewer.page.once("dialog", dialog => dialog.accept());
      await pair.getByRole("button", { name: [browserLead, lead].sort()[0] === lead ? "保留第一条" : "保留第二条" }).click();
      await reviewer.page.getByRole("status").filter({ hasText: "已记录合并" }).waitFor();
      assert.equal(await pair.count(), 0);
      await reviewer.context.close();
      console.log("PASS Chromium staff workbench: 1440px assignment and 320px overdue, contact and follow-up");
      console.log("PASS Chromium role views at 320/390/1440px, Founder HOLD API, contact read audit and original-session grant revocation");
      if (process.argv[5] !== "--staff-browser-only") {
        await verifyBrowserConsultation({ browser, config: websiteConfig, receiver });
        const pages = await db.query("SELECT locale FROM crm.website_consultation_intake WHERE service_domain='WEALTH' AND acquisition_contract_id=$1 ORDER BY locale", [contractId]);
        assert.deepEqual(pages.rows, [{ locale: "en" }, { locale: "zh" }]);
        assert.deepEqual((await db.query(`
          SELECT source_system FROM crm.lead_attributions WHERE source_system LIKE 'phoenix-nova-compass-%' ORDER BY source_system
        `)).rows.map(row => row.source_system), ["education", "health", "identity", "wealth"].map(domain => "phoenix-nova-compass-" + domain));
        console.log("PASS Chromium website form: 320px Chinese, 390px English, retry and PostgreSQL receipts");
      } else console.log("NOT RUN public website Worker browser tests: explicit staff-only local run");
    } finally {
      await browser.close();
    }
  }
  await db.query("UPDATE crm.website_consultation_intake SET contact_expires_at=clock_timestamp()-interval '1 second' WHERE lead_id=$1", [newLead]);
  assert.equal((await post("contact", "synthetic-staff")).status, 404);
  assert.equal((await submit("education", secondRequest)).status, 503);
  await assert.rejects(staff.query("SELECT crm.erase_expired_website_contacts()"), /permission denied/);
  await retention.connect();
  await retention.query("SET ROLE phoenix_website_contact_retention");
  assert.equal((await retention.query("SELECT crm.erase_expired_website_contacts() AS erased")).rows[0].erased, 1);
  assert.equal((await retention.query("SELECT crm.erase_expired_website_contacts() AS erased")).rows[0].erased, 0);
  assert.deepEqual((await db.query(`
    SELECT contact_envelope IS NULL AS no_contact, payload_mac IS NULL AS no_mac,
      duplicate_match_mac IS NULL AS no_duplicate_match,
      contact_erased_at IS NOT NULL AS recorded FROM crm.website_consultation_intake WHERE lead_id=$1
  `, [newLead])).rows, [{ no_contact: true, no_mac: true, no_duplicate_match: true, recorded: true }]);
  console.log("PASS approved retention configuration, expiry denial and scoped contact erasure");
  const conversionRequest = "028347ec-7740-4000-a000-000000000043";
  const conversionReceipt = await submit("education", conversionRequest, "synthetic-conversion@example.test");
  assert.equal(conversionReceipt.status, 202);
  assert.deepEqual(await conversionReceipt.json(), { status: "received", requestId: conversionRequest });
  const { rows: receivedLeads } = await db.query(
    "SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [conversionRequest],
  );
  assert.equal(receivedLeads.length, 1);
  const conversionLead = receivedLeads[0].lead_id;
  const conversionPost = (operation, token, body) => staffLeadPost(conversionLead, operation, token, body);
  assert.equal((await conversionPost("contact", "synthetic-staff")).status, 404);
  const conversionAssignment = await conversionPost("assign", "synthetic-dispatcher", { assigneeId: employee });
  assert.equal(conversionAssignment.status, 200);
  const { taskId: conversionFollowUp } = await conversionAssignment.json();
  assert.ok(conversionFollowUp);
  assert.equal((await conversionPost("contact", "synthetic-staff")).status, 200);
  assert.equal((await conversionPost("complete", "synthetic-staff")).status, 200);
  assert.deepEqual((await db.query(`
    SELECT f.status, f.assigned_principal_id, l.lead_status
    FROM crm.follow_ups f JOIN crm.leads l USING(lead_id)
    WHERE f.follow_up_id=$1 AND f.lead_id=$2`, [conversionFollowUp, conversionLead])).rows, [
    { status: "COMPLETED", assigned_principal_id: employee, lead_status: "CONTACTED" },
  ]);
  const clientId = "019347ec-7740-7000-a000-000000000061";
  const reviewerPrincipal = "019347ec-7740-7000-a000-000000000062";
  const clientLink = "019347ec-7740-7000-a000-000000000063";
  const conversionEvent = "019347ec-7740-7000-a000-000000000064";
  await db.query(`
    INSERT INTO auth.principals(principal_id,principal_kind,status,service_label)
      VALUES($1,'SERVICE','ACTIVE','canonical_crm_v2')
  `, [reviewerPrincipal]);
  await db.query(`
    INSERT INTO crm.clients(client_id,family_id,client_code,relationship_started_at,created_by_principal_id,updated_by_principal_id)
      VALUES($1,$2,'SYNTHETIC-CONVERSION',clock_timestamp(),$3,$3)
  `, [clientId, otherFamily, principal]);
  const bindConversionContext = async (actor, family) => {
    await crmService.query("SELECT auth.clear_context()");
    const { rows } = await db.query(`
      SELECT auth.issue_context_ticket($1,NULL,$2,'INTERNAL',clock_timestamp()+interval '30 seconds',
        gen_random_uuid(),$1) AS ticket
    `, [actor, family]);
    await crmService.query("SELECT auth.redeem_context_ticket($1,$2)", [rows[0].ticket, actor]);
  };
  await bindConversionContext(principal, null);
  const qualification = await crmService.query("SELECT crm.transition_lead($1,'QUALIFIED',$2) AS ok",
    [conversionLead, "019347ec-7740-7000-a000-000000000066"]);
  assert.equal(qualification.rows[0].ok, true);
  const convert = () => crmService.query("SELECT crm.transition_lead($1,'CONVERTED',$2) AS ok", [conversionLead, conversionEvent]);
  const denied = async () => assert.equal((await convert()).rows[0].ok, false);
  await denied();
  await assert.rejects(crmService.query("UPDATE crm.leads SET lead_status='CONVERTED' WHERE lead_id=$1", [conversionLead]),
    { code: "42501" });

  const fixtureId = suffix => "019347ec-7740-7000-a000-" + String(suffix).padStart(12, "0");
  const linkIdentity = async (id, kind, target, eventId) => (await crmService.query(
    "SELECT crm.link_lead_identity($1,$2,$3,$4,$5,$6) AS ok", [id, conversionLead, kind, target, hash, eventId],
  )).rows[0].ok;
  const verifyLink = async (link = clientLink, eventId = fixtureId(68)) => (await crmService.query(
    "SELECT crm.verify_lead_identity($1,$2) AS ok", [link, eventId],
  )).rows[0].ok;
  assert.equal(await linkIdentity(fixtureId(69), "PERSON", person, fixtureId(70)), true);
  await bindConversionContext(reviewerPrincipal, null);
  assert.equal(await verifyLink(fixtureId(69), fixtureId(71)), true);
  await denied();
  await bindConversionContext(principal, otherFamily);
  assert.equal(await linkIdentity(fixtureId(72), "FAMILY", otherFamily, fixtureId(73)), true);
  await bindConversionContext(reviewerPrincipal, otherFamily);
  assert.equal(await verifyLink(fixtureId(72), fixtureId(74)), true);
  await denied();
  await bindConversionContext(principal, otherFamily);
  assert.equal(await linkIdentity(fixtureId(75), "CLIENT", fixtureId(76), fixtureId(77)), false);
  await denied();
  const revokedLink = fixtureId(78);
  assert.equal(await linkIdentity(revokedLink, "CLIENT", clientId, fixtureId(79)), true);
  await denied();
  assert.equal(await verifyLink(revokedLink, fixtureId(80)), false);
  await bindConversionContext(reviewerPrincipal, otherFamily);
  assert.equal(await verifyLink(revokedLink, fixtureId(80)), true);
  const revokeLink = async (link, key) => (await crmService.query(
    "SELECT crm.revoke_lead_identity($1,$2) AS ok", [link, key],
  )).rows[0].ok;
  assert.equal(await revokeLink(revokedLink, fixtureId(81)), true);
  assert.equal(await verifyLink(revokedLink, fixtureId(82)), false);
  await denied();
  await bindConversionContext(principal, otherFamily);
  assert.equal(await linkIdentity(clientLink, "CLIENT", clientId, fixtureId(67)), true);
  await denied();
  assert.equal(await verifyLink(), false);
  await bindConversionContext(reviewerPrincipal, otherFamily);
  assert.equal(await verifyLink(), true);
  assert.deepEqual((await db.query(`
    SELECT status, verified_by_principal_id, verified_at IS NOT NULL AS stamped
    FROM crm.lead_identity_links WHERE lead_identity_link_id=$1
  `, [clientLink])).rows, [{ status: "VERIFIED", verified_by_principal_id: reviewerPrincipal, stamped: true }]);
  const mismatchFamily = fixtureId(83);
  await db.query("INSERT INTO core.families(family_id,display_name) VALUES($1,'Synthetic conversion mismatch')", [mismatchFamily]);
  await db.query("UPDATE crm.leads SET family_id=$2 WHERE lead_id=$1", [conversionLead, mismatchFamily]);
  await bindConversionContext(principal, mismatchFamily);
  await denied();
  await db.query("UPDATE crm.leads SET family_id=$2 WHERE lead_id=$1", [conversionLead, otherFamily]);
  await bindConversionContext(principal, null);
  await denied();
  await bindConversionContext(principal, otherFamily);
  await db.query("BEGIN");
  try {
    await db.query("SELECT 1 FROM crm.lead_identity_links WHERE lead_identity_link_id=$1 FOR UPDATE", [clientLink]);
    await assert.rejects(convert(), { code: "55P03" });
  } finally {
    await db.query("ROLLBACK");
  }
  await crmService.query("BEGIN");
  try {
    assert.equal((await convert()).rows[0].ok, true);
  } finally {
    await crmService.query("ROLLBACK");
  }
  assert.deepEqual((await db.query(`
    SELECT l.lead_status, i.contact_envelope IS NOT NULL AS retained
    FROM crm.leads l JOIN crm.website_consultation_intake i USING(lead_id) WHERE l.lead_id=$1
  `, [conversionLead])).rows, [{ lead_status: "QUALIFIED", retained: true }]);
  assert.equal((await convert()).rows[0].ok, true);
  await denied();
  await db.query("UPDATE auth.principals SET status='DISABLED' WHERE principal_id=$1", [principal]);
  assert.equal(await revokeLink(clientLink, fixtureId(84)), false);
  await db.query("UPDATE auth.principals SET status='ACTIVE' WHERE principal_id=$1", [principal]);
  await crmService.query("SELECT auth.clear_context()");
  assert.equal((await conversionPost("contact", "synthetic-staff")).status, 404);
  assert.equal((await retention.query("SELECT crm.erase_expired_website_contacts() AS erased")).rows[0].erased, 0);
  assert.deepEqual((await db.query(`
    SELECT contact_envelope IS NULL AND payload_mac IS NULL AND duplicate_match_mac IS NULL AS cleared
    FROM crm.website_consultation_intake WHERE lead_id=$1
  `, [conversionLead])).rows, [{ cleared: true }]);
  assert.deepEqual((await db.query(`
    SELECT l.lead_status, l.family_id, a.source_system FROM crm.leads l
    JOIN crm.lead_attributions a ON a.lead_id=l.lead_id AND a.attribution_kind='FIRST_TOUCH'
    WHERE l.lead_id=$1
  `, [conversionLead])).rows, [{ lead_status: "CONVERTED", family_id: otherFamily, source_system: "phoenix-nova-website" }]);
  assert.equal((await db.query(`
    SELECT 1 FROM audit.access_events WHERE resource_id=$1 AND action='WEBSITE_CONTACT_ERASE_ON_CONVERSION'
      AND decision='ALLOW' AND principal_id=$2
  `, [conversionRequest, principal])).rowCount, 1);
  assert.equal((await db.query(`
    SELECT 1 FROM audit.access_events WHERE resource_id=$1 AND principal_id=$2
      AND action='CONVERT' AND decision='ALLOW' AND reason_code='VERIFIED_CLIENT_LINK_USED'
  `, [clientLink, principal])).rowCount, 1);
  assert.ok((await db.query(`
    SELECT 1 FROM audit.access_events WHERE resource_id=$1 AND principal_id=$2 AND decision='DENY'
      AND reason_code='CRM_CONVERSION_VERIFIED_CLIENT_REQUIRED'
  `, [conversionLead, principal])).rowCount >= 3);
  assert.equal((await db.query(`
    SELECT 1 FROM crm.lead_events WHERE lead_id=$1 AND to_status='CONVERTED' AND actor_principal_id=$2
  `, [conversionLead, principal])).rowCount, 1);
  assert.equal((await db.query(`
    SELECT 1 FROM audit.access_events transition
    JOIN audit.access_events binding ON binding.request_nonce=transition.request_nonce
    WHERE transition.resource_id=$1 AND transition.action='TRANSITION' AND transition.decision='ALLOW'
      AND binding.resource_id=$2 AND binding.reason_code='VERIFIED_CLIENT_LINK_USED'
      AND transition.principal_id=binding.principal_id
  `, [conversionLead, clientLink])).rowCount, 1);
  console.log("PASS CRM conversion rejects absent, person-only, family-only, pending, revoked, missing-client and mismatched-family identities; distinct verified client converts once with audit and atomic contact cleanup");

  // Carry the converted consultation into a managed deal using the existing CRM authority.
  const dealId = fixtureId(280);
  const dealEventId = fixtureId(282);
  const openDeal = async primaryLead => (await crmService.query(`
    SELECT crm.create_managed_deal($1,$2,$3,$4,$5,NULL,
      'Synthetic education service proposal','EDUCATION',0,'HKD',NULL,$6,NULL,$7) AS created
  `, [dealId, fixtureId(281), clientId, otherFamily, primaryLead, employee, dealEventId])).rows[0].created;
  await bindConversionContext(principal, otherFamily);
  assert.equal(await openDeal(lead), false, "a lead without a verified client link cannot open this deal");
  assert.equal(await openDeal(conversionLead), true);
  assert.equal(await openDeal(conversionLead), false, "replaying the proposal must not create a duplicate deal");
  await crmService.query("SELECT auth.clear_context()");
  const { rows: lineage } = await db.query(`
    SELECT i.request_id, l.lead_id, f.follow_up_id, ct.read_id AS contact_audit_ref,
      c.client_id, d.deal_id, i.service_domain, t.source_system, t.entry_ref, i.consent_version,
      i.recorded_at, e.deal_event_id, a.event_id AS deal_audit_ref
    FROM crm.website_consultation_intake i
    JOIN crm.leads l ON l.lead_id=i.lead_id AND l.lead_status='CONVERTED'
    JOIN crm.lead_attributions t ON t.lead_id=l.lead_id AND t.attribution_kind='FIRST_TOUCH'
    JOIN crm.follow_ups f ON f.lead_id=l.lead_id AND f.follow_up_id=$2 AND f.status='COMPLETED'
    JOIN crm.website_consultation_contact_reads ct ON ct.lead_id=l.lead_id
      AND ct.actor_principal_id=f.assigned_principal_id
    JOIN crm.lead_identity_links k ON k.lead_id=l.lead_id AND k.target_kind='CLIENT' AND k.status='VERIFIED'
    JOIN crm.clients c ON c.client_id=k.client_id AND c.family_id=l.family_id
    JOIN crm.deals d ON d.client_id=c.client_id AND d.primary_lead_id=l.lead_id AND d.family_id=c.family_id
    JOIN crm.deal_events e ON e.deal_id=d.deal_id AND e.event_kind='CREATED'
    JOIN audit.access_events a ON a.resource_id=d.deal_id AND a.action='CREATE'
      AND a.decision='ALLOW' AND a.reason_code='MANAGED_DEAL_CREATED'
    WHERE i.request_id=$1
  `, [conversionRequest, conversionFollowUp]);
  assert.equal(lineage.length, 1);
  assert.deepEqual(
    [lineage[0].lead_id, lineage[0].client_id, lineage[0].deal_id, lineage[0].service_domain, lineage[0].deal_event_id],
    [conversionLead, clientId, dealId, "EDUCATION", dealEventId],
  );
  assert.ok(lineage[0].recorded_at && lineage[0].contact_audit_ref && lineage[0].deal_audit_ref);
  assert.equal(lineage[0].source_system, "phoenix-nova-website");
  assert.equal(lineage[0].consent_version, websiteConfig.WEBSITE_PRIVACY_VERSION);
  console.log("PASS same synthetic request → lead → audited contact and follow-up → verified client → managed deal",
    JSON.stringify(lineage[0]));

  const nonWebsiteLead = fixtureId(85);
  await db.query(`
    INSERT INTO crm.leads(lead_id,lead_source_id,family_id,lead_status,qualification_status,created_by_principal_id,updated_by_principal_id)
    VALUES($1,$2,$3,'QUALIFIED','QUALIFIED',$4,$4)
  `, [nonWebsiteLead, otherSource, otherFamily, principal]);
  await bindConversionContext(principal, otherFamily);
  assert.equal((await crmService.query("SELECT crm.transition_lead($1,'CONVERTED',$2) AS ok",
    [nonWebsiteLead, fixtureId(86)])).rows[0].ok, false);
  await crmService.query("SELECT auth.clear_context()");
  console.log("PASS verified-client gate also protects non-website CRM leads");

  const deletionRequest = "028347ec-7740-4000-a000-000000000020";
  assert.equal((await submit("education", deletionRequest, "synthetic-deletion@example.test")).status, 202);
  const deletionLead = (await db.query(
    "SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [deletionRequest],
  )).rows[0].lead_id;
  const deletionPost = (operation, token, body) => staffHttp(new Request(queueUrl + "/" + deletionLead + "/" + operation, {
    method: "POST",
    headers: { authorization: "Bearer " + token, origin: staffOrigin, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
  assert.equal((await deletionPost("assign", "synthetic-dispatcher", { assigneeId: employee })).status, 200);
  const allowedContact = await deletionPost("contact", "synthetic-staff");
  assert.equal(allowedContact.status, 200);
  assert.equal(allowedContact.headers.get("cache-control"), "private, no-store");
  const retainedRequest = "028347ec-7740-4000-a000-000000000021";
  assert.equal((await submit("education", retainedRequest, "synthetic-retained@example.test")).status, 202);
  const retainedLead = (await db.query(
    "SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [retainedRequest],
  )).rows[0].lead_id;
  const staffRetainedRequest = (operation, token, body) => staffHttp(new Request(queueUrl + "/" + retainedLead + "/" + operation, {
    method: "POST",
    headers: { authorization: "Bearer " + token, origin: staffOrigin, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
  assert.equal((await staffRetainedRequest("assign", "synthetic-dispatcher", { assigneeId: employee })).status, 200);
  assert.equal((await staffRetainedRequest("contact", "synthetic-staff")).status, 200);
  const contactState = async connection => (await connection.query(`
    SELECT recorded_at::text, contact_expires_at > clock_timestamp() AS unexpired,
      contact_envelope IS NULL AND payload_mac IS NULL AND duplicate_match_mac IS NULL
        AND contact_erased_at IS NOT NULL AS erased
    FROM crm.website_consultation_intake WHERE request_id=$1
  `, [deletionRequest])).rows[0];
  const before = await contactState(db);
  assert.equal(before.unexpired, true);
  assert.equal(before.erased, false);
  const receipt = [deletionRequest, before.recorded_at];
  const replaySql = "SELECT crm.replay_website_contact_deletion($1,$2) AS outcome";
  const fixtureContainer = process.env.CRM_FIXTURE_POSTGRES_CONTAINER;
  const dockerPostgres = (args, input) => execFileSync("docker", args, {
    input, timeout: 60_000, maxBuffer: 32 * 1024 * 1024,
  });
  const dump = fixtureContainer && dockerPostgres([
    "exec", fixtureContainer, "pg_dump", "--no-password", "--format=custom", "-U", bootstrap, database,
  ]);
  const revocationSql = "SELECT crm.replay_website_staff_revocation($1,$2,$3,$4,$5,$6) AS outcome";
  const grant = (await db.query(`
    SELECT valid_from::text AS start,clock_timestamp()::text AS revoked
    FROM crm.website_consultation_staff_grants
    WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind='ADVISER'
  `, [employee, serviceOrg])).rows[0];
  const revokedGrant = [employee, serviceOrg, "EDUCATION", "ADVISER", grant.start, grant.revoked];
  await assert.rejects(staff.query(revocationSql, revokedGrant), { code: "42501" });
  const verifyRevocation = async (targetDatabase, observer) => {
    const operator = new Client({ host, port, user: "website_fixture_revocation_replay", database: targetDatabase });
    await operator.connect();
    try {
      await operator.query("SET ROLE phoenix_website_staff_revocation_replay");
      await assert.rejects(operator.query("SELECT * FROM crm.website_consultation_staff_grants"), { code: "42501" });
      await assert.rejects(operator.query(replaySql, receipt), { code: "42501" });
      const [actor, org, domain, kind, start] = revokedGrant;
      await assert.rejects(operator.query(revocationSql, [actor, org, domain, kind, start, "infinity"]), { code: "22023" });
      assert.equal((await operator.query(revocationSql, [actor, otherOrg, domain, kind, start, grant.revoked])).rows[0].outcome, "not_matched");
      assert.equal((await operator.query(revocationSql, revokedGrant)).rows[0].outcome, "revoked");
      assert.equal((await operator.query(revocationSql, revokedGrant)).rows[0].outcome, "already_revoked");
      assert.equal((await observer.query(`
        SELECT 1 FROM audit.access_events
        WHERE resource_id=$1 AND reason_code='WEBSITE_STAFF_REVOCATION_REPLAYED' AND decision='ALLOW'
      `, [employee])).rowCount, 1);
    } finally {
      await operator.end();
    }
  };
  assert.equal((await retention.query("SELECT crm.erase_expired_website_contacts() AS erased")).rows[0].erased, 0);
  await assert.rejects(retention.query(replaySql, receipt), /permission denied/);
  await assert.rejects(staff.query(replaySql, receipt), /permission denied/);
  const verifyReplay = async (targetDatabase, observer) => {
    const operator = new Client({ host, port, user: "website_fixture_deletion_replay", database: targetDatabase });
    await operator.connect();
    try {
      await operator.query("SET ROLE phoenix_website_deletion_replay");
      await assert.rejects(operator.query("SELECT * FROM crm.website_consultation_intake"), /permission denied/);
      await assert.rejects(operator.query("SELECT crm.erase_expired_website_contacts()"), /permission denied/);
      assert.equal((await operator.query(replaySql, [deletionRequest, "2000-01-01T00:00:00Z"])).rows[0].outcome, "not_matched");
      assert.deepEqual(await contactState(observer), before);
      assert.equal((await operator.query(replaySql, receipt)).rows[0].outcome, "erased");
      assert.deepEqual(await contactState(observer), { ...before, erased: true });
      assert.equal((await operator.query(replaySql, receipt)).rows[0].outcome, "already_erased");
      const event = await observer.query(`
        SELECT decision, reason_code FROM audit.access_events
        WHERE resource_id=$1 AND action='WEBSITE_CONTACT_DELETION_REPLAY'
      `, [deletionRequest]);
      assert.deepEqual(event.rows, [{ decision: "ALLOW", reason_code: "VERIFIED_DELETION_REPLAY" }]);
    } finally {
      await operator.end();
    }
  };
  await verifyReplay(database, db);
  assert.equal((await deletionPost("contact", "synthetic-staff")).status, 404);
  assert.equal((await submit("education", deletionRequest, "synthetic-deletion@example.test")).status, 503);
  console.log("PASS verified deletion replay: isolated role, exact recorded timestamp, erasure and idempotency");
  await verifyRevocation(database, db);
  assert.equal((await staffRetainedRequest("contact", "synthetic-staff")).status, 404);
  if (dump) {
    const restoredDatabase = "phoenix_website_intake_restore_fixture";
    await db.query("CREATE DATABASE phoenix_website_intake_restore_fixture");
    dockerPostgres([
      "exec", "-i", fixtureContainer, "pg_restore", "--no-password", "--exit-on-error", "-U", bootstrap, "-d", restoredDatabase,
    ], dump);
    const restored = new Client({ host, port, user: bootstrap, database: restoredDatabase });
    const restoredStaff = new Client({ host, port, user: "website_fixture_staff_gateway", database: restoredDatabase });
    try {
      await restored.connect();
      await restoredStaff.connect();
      await restoredStaff.query("SET ROLE phoenix_website_consultation_staff_gateway");
      assert.deepEqual(await contactState(restored), before);
      const restoredContact = leadId => restoredStaff.query(
        "SELECT request_id FROM crm.read_website_consultation_contact($1,$2,$3,gen_random_uuid())",
        [issuer, subject, leadId],
      );
      await verifyReplay(restoredDatabase, restored);
      assert.equal((await restoredContact(deletionLead)).rowCount, 0);
      assert.equal((await restoredContact(retainedLead)).rowCount, 1);
      await verifyRevocation(restoredDatabase, restored);
      assert.equal((await restoredContact(retainedLead)).rowCount, 0);
      assert.equal((await restored.query(`
        SELECT 1 FROM crm.website_consultation_intake WHERE request_id=$1 AND contact_envelope IS NOT NULL
      `, [retainedRequest])).rowCount, 1, "revocation should deny access even when the contact remains stored");
    } finally {
      await Promise.all([restoredStaff.end(), restored.end()]);
    }
    console.log("PASS pre-deletion PostgreSQL backup restored to a fresh fixture database and reconciled before access");
    console.log("PASS restored grant revocation replays once and denies the same credential for a retained contact");
  } else {
    console.log("NOT RUN PostgreSQL dump and restore: CRM_FIXTURE_POSTGRES_CONTAINER is unset");
  }

  let educationLead;
  for (const [i, entry] of ["education", "identity", "health", "wealth"].entries()) {
    const request = "028347ec-7740-4000-a000-00000000010" + i;
    const email = "synthetic-" + entry + "-source@example.test";
    assert.equal((await submit(entry, request, email, entry)).status, 202);
    assert.equal((await submit(entry, request, email, entry)).status, 202);
    const otherEntry = entry === "education" ? "identity" : "education";
    assert.equal((await submit(entry, request, email, otherEntry)).status, 409);
    const { rows } = await db.query("SELECT a.source_system,a.entry_ref,l.family_id FROM crm.website_consultation_intake i JOIN crm.lead_attributions a USING(lead_id) JOIN crm.leads l USING(lead_id) WHERE i.request_id=$1 AND a.attribution_kind='FIRST_TOUCH'", [request]);
    assert.deepEqual(rows, [{ source_system: "phoenix-nova-compass-" + entry, entry_ref: "/" + entry, family_id: null }]);
    if (entry === "education") {
      educationLead = (await db.query("SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [request])).rows[0].lead_id;
    }
    console.log("PASS Compass " + entry + " first touch, idempotency and cross-source conflict");
  }
  assert.equal((await submit("education", undefined, "synthetic-invalid@example.test", "spoofed")).status, 400);
  const actor = fixtureId(140), familyPrincipal = fixtureId(141);
  await db.query("INSERT INTO core.people(person_id,display_name) VALUES($1,'Synthetic Compass actor')", [actor]);
  await db.query("INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES($1,$2,'FAMILY','ACTIVE')", [familyPrincipal, actor]);
  await db.query("INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES($1,$2,$3,'PRIMARY',clock_timestamp()),($4,$5,$3,'MEMBER',clock_timestamp())",
    [fixtureId(142), otherFamily, actor, fixtureId(143), mismatchFamily]);
  const publisherContracts = {};
  for (const [i, domain] of ["education", "identity", "health", "wealth"].entries()) {
    const registered = await db.query(`
      SELECT crm.register_acquisition_contract($1,lead_source_id,'fixture-publisher',$2,'synthetic approval',$3,
        'synthetic retention',$3,'website_fixture_crm_service',clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour')
      FROM crm.lead_sources WHERE source_system=$4
    `, [fixtureId(170 + i), { entry_ref: "/" + domain, entry_revision: "fixture-publisher",
      manifest_ref: "synthetic publisher manifest", manifest_sha256: hash }, hash, "phoenix-nova-compass-" + domain]);
    publisherContracts[domain] = Object.values(registered.rows[0])[0];
  }
  const bindFamily = async family => {
    await crmService.query("SELECT auth.clear_context()");
    const { rows } = await db.query(`SELECT auth.issue_context_ticket($1,$2,$3,'FAMILY',
      clock_timestamp()+interval '30 seconds',gen_random_uuid(),$1) AS ticket`, [familyPrincipal, actor, family]);
    await crmService.query("SELECT auth.redeem_context_ticket($1,$2)", [rows[0].ticket, familyPrincipal]);
  };
  const visit = fixtureId(146), assessed = fixtureId(147), assessment = fixtureId(148);
  const recordCompass = (id, ref = null, subject = actor, domain = "IDENTITY") => crmService.query(
    "SELECT crm.record_compass_event($1,$2,$3,$4,$5,$6) AS event",
    [id, educationLead, subject, publisherContracts.identity, domain, ref]);
  const readCompass = id => crmService.query("SELECT * FROM crm.read_compass_event($1)", [id]);
  await bindFamily(otherFamily);
  assert.equal((await recordCompass(visit)).rows[0].event, null, "unverified lead must not link by email or family claim");
  await bindConversionContext(principal, otherFamily);
  assert.equal((await crmService.query("SELECT crm.link_lead_identity($1,$2,'CLIENT',$3,$4,$5) AS ok",
    [fixtureId(149), educationLead, clientId, hash, fixtureId(150)])).rows[0].ok, true);
  await bindConversionContext(reviewerPrincipal, otherFamily);
  assert.equal(await verifyLink(fixtureId(149), fixtureId(151)), true);
  await bindFamily(otherFamily);
  assert.equal((await recordCompass(visit)).rows[0].event, visit);
  assert.equal((await recordCompass(visit)).rows[0].event, visit);
  assert.equal((await recordCompass(visit, null, person)).rows[0].event, null);
  assert.equal((await recordCompass(fixtureId(152), null, actor, "WEALTH")).rows[0].event, null);
  assert.deepEqual((await readCompass(visit)).rows, [{ lead_id: educationLead, service_domain: "IDENTITY",
    assessment_id: null, source_system: "phoenix-nova-compass-identity" }]);
  assert.equal((await recordCompass(assessed, assessment)).rows[0].event, null);
  await db.query(`INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
    purpose,data_class,status,granted_at,expires_at)
    VALUES($1,$2,$3,$3,$3,'IDENTITY_CASE','IDENTITY_SENSITIVE','ACTIVE',clock_timestamp(),clock_timestamp()+interval '1 hour')`,
    [fixtureId(153), otherFamily, actor]);
  assert.equal((await recordCompass(assessed, assessment)).rows[0].event, null);
  assert.equal((await readCompass(assessed)).rowCount, 0);
  console.log("PASS Identity reference denied despite case consent when no trusted native completion exists");
  for (const [offset, domain] of ["health", "wealth"].entries()) {
    const refused = await crmService.query("SELECT crm.record_compass_event($1,$2,$3,$4,$5,$6) AS event",
      [fixtureId(174 + offset), educationLead, actor, publisherContracts[domain], domain.toUpperCase(), assessment]);
    assert.equal(refused.rows[0].event, null);
  }
  console.log("PASS Health and Wealth native references denied even with the correct publisher source registration");
  for (const [i, domain] of ["education", "identity"].entries()) {
    const id = fixtureId(155 + i);
    const params = [id, educationLead, publisherContracts[domain], domain.toUpperCase(), "fixture-compass-need-" + domain, hash];
    const result = await crmService.query("SELECT crm.assert_lead_need($1,$2,$3,$4,'USER_SELECTED','ASSERT',NULL,NULL,$5,$6) AS event", params);
    assert.equal(result.rows[0].event, id);
  }
  await bindFamily(mismatchFamily);
  assert.equal((await readCompass(visit)).rowCount, 0);
  assert.equal((await recordCompass(fixtureId(157))).rows[0].event, null);
  await crmService.query("SELECT auth.clear_context()");
  assert.deepEqual((await db.query("SELECT source_system FROM crm.lead_attributions WHERE lead_id=$1 AND attribution_kind='FIRST_TOUCH'",
    [educationLead])).rows, [{ source_system: "phoenix-nova-compass-education" }]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM crm.lead_events WHERE lead_id=$1 AND need_domain IN ('EDUCATION','IDENTITY')",
    [educationLead])).rows[0].n, 2);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM crm.clients WHERE family_id=$1", [otherFamily])).rows[0].n, 1);
  console.log("PASS Education to Identity touch leaves first source intact; verified family and distinct needs");
  await verifyNativeCompass({
    db, crmService, staff, Pool, connection: { host, port, database },
    sourceFile: process.env.CRM_FIXTURE_EDUCATION_CANDIDATE,
    bindFamily, actor, familyPrincipal, otherFamily, mismatchFamily, principal,
    reviewerPrincipal, educationLead, cancelLead: conversionLead, publisherContracts, fixtureId, hash,
  });
  await verifyLinkedService({
    db, Client, Pool, connection: { host, port, database }, fixtureId, lineage: lineage[0],
    family: otherFamily, otherFamily: mismatchFamily,
  });
  const listeners = [];
  function requestLocal(listener, hostHeader, path, method = "GET", body, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = httpRequest({
        host, port: listener.port, path, method, headers: { host: hostHeader, ...headers },
      }, res => {
        const chunks = [];
        res.on("data", chunk => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.end(body);
    });
  }
  try {
    const intakeListener = await listenConsultationLoopback({ publicOrigin: receiverOrigin, handler: receiver });
    listeners.push(intakeListener);
    const staffListener = await listenConsultationLoopback({ publicOrigin: staffOrigin, handler: staffHttp });
    listeners.push(staffListener);
    const staffHost = new URL(staffOrigin).host;
    const intakeHost = new URL(receiverOrigin).host;
    assert.equal((await requestLocal(staffListener, intakeHost, "/internal/website-consultations/workbench")).status, 404);
    assert.equal((await requestLocal(staffListener, staffHost, "/internal/website-consultations/workbench", "GET", undefined,
      { "x-forwarded-host": staffHost, "x-principal-id": employee })).status, 401);
    const dash = await requestLocal(staffListener, staffHost, "/internal/website-consultations/workbench", "GET", undefined,
      { authorization: "Bearer synthetic-staff" });
    assert.equal(dash.status, 200);
    assert.match(dash.body, /官网咨询工作台/);
    const id = "028347ec-7740-4000-a000-000000000019";
    const payload = JSON.stringify({ schemaVersion: "website-consultation.v1", consentVersion: "website-consultation.v1",
      source: "phoenix-nova-website", locale: "en", service: "health", requestId: id, email: "transport@example.test" });
    const receipt = await requestLocal(intakeListener, intakeHost, "/v1/website-consultations", "POST", payload, {
      "content-length": Buffer.byteLength(payload), "content-type": "application/json", authorization: "Bearer " + token,
      "idempotency-key": id,
    });
    assert.equal(receipt.status, 202);
    assert.deepEqual(JSON.parse(receipt.body), { status: "persisted", requestId: id });
    assert.equal((await db.query("SELECT 1 FROM crm.website_consultation_intake WHERE request_id=$1", [id])).rowCount, 1);
    console.log("PASS actual loopback HTTP transport, pinned hosts and persisted receipt");
  } finally {
    await Promise.all(listeners.map(listener => listener.close()));
  }
} finally {
  await Promise.allSettled([outside.end(), staff.end(), retention.end(), crmService.end(), binderPool.end(), writerPool.end(), gatewayPool.end(), db.end()]);
}
