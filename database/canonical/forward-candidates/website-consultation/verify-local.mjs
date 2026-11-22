// Disposable loopback cluster only. Expects an isolated bootstrap role and a fresh database.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { request as httpRequest } from "node:http";
import { readStaffConsultationEmail } from "./staff-contact.mjs";
import { createWebsiteConsultationGateway } from "./gateway.mjs";
import { listenConsultationLoopback } from "./loopback-http.mjs";
import { verifyBrowserConsultation } from "./verify-browser-form.mjs";
import { handleWebsiteConsultation } from "../../../../website/phoenix-nova-website-v5/lib/website-consultation-intake.ts";

if (process.argv[2] !== "--synthetic-loopback" || !process.argv[3]) throw new Error("A disposable runtime directory is required");
const loadRuntime = createRequire(resolve(process.argv[3], "harness.cjs"));
const { Client, Pool } = loadRuntime("pg");
const port = 55487;
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
  await db.query(await readFile(new URL("./staff-queue.sql", import.meta.url), "utf8"));
  await db.query(`
    CREATE ROLE website_fixture_binder LOGIN;
    CREATE ROLE website_fixture_writer LOGIN;
    CREATE ROLE website_fixture_outside LOGIN;
    CREATE ROLE website_fixture_crm_service LOGIN;
    CREATE ROLE website_fixture_staff_gateway LOGIN;
    CREATE ROLE website_fixture_contact_retention LOGIN;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO website_fixture_contact_retention;
    GRANT phoenix_website_contact_retention TO website_fixture_contact_retention WITH INHERIT FALSE, SET TRUE;
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
    acquisitionContractId: contractId, intakePrincipalId: principal, binderPool, writerPool, staffPool: gatewayPool,
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
    WEBSITE_PRIVACY_VERSION: "website-consultation.v1",
    WEBSITE_PRIVACY_POLICY_ZH: "合成验收政策，非正式文案。",
    WEBSITE_PRIVACY_POLICY_EN: "Synthetic test policy, not approved publication copy.",
    WEBSITE_CONSULTATION_RECEIVER_URL: receiverOrigin + "/v1/website-consultations",
    WEBSITE_CONSULTATION_RECEIVER_TOKEN: token,
  };
  const submit = (service, requestId = "028347ec-7740-4000-a000-000000000001", email = "visitor@example.test") => handleWebsiteConsultation(new Request(origin + "/api/website-consultations", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ requestId,
      locale: "en", service, email, consent: true }),
  }), websiteConfig, (url, init) => receiver(new Request(url, init)));
  assert.equal((await submit("education", undefined, "no-policy@example.test")).status, 503);
  assert.equal((await db.query("SELECT crm.configure_website_contact_retention($1,30,$2) AS allowed",
    [contractId, "f".repeat(64)])).rows[0].allowed, false);
  assert.equal((await db.query("SELECT crm.configure_website_contact_retention($1,30,$2) AS allowed",
    [contractId, hash])).rows[0].allowed, true);
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
  await db.query(`
    INSERT INTO crm.website_consultation_staff_grants(principal_id,service_domain,grant_kind,valid_until)
    VALUES($1,'HEALTH','DISPATCHER',clock_timestamp()+interval '1 hour'),
          ($1,'EDUCATION','ADVISER',clock_timestamp()+interval '1 hour')
  `, [employee]);
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
    INSERT INTO crm.website_consultation_staff_grants(principal_id,service_domain,grant_kind,valid_until)
      VALUES($1,'EDUCATION','DISPATCHER',clock_timestamp()+interval '1 hour')
  `, [dispatcher]);
  const secondRequest = "028347ec-7740-4000-a000-000000000002";
  assert.equal((await submit("education", secondRequest)).status, 202);
  const newLead = (await db.query("SELECT lead_id FROM crm.website_consultation_intake WHERE request_id=$1", [secondRequest])).rows[0].lead_id;
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
  assert.equal((await post("assign", "synthetic-staff", { assigneeId: employee })).status, 404);
  const assigned = await post("assign", "synthetic-dispatcher", { assigneeId: employee });
  assert.equal(assigned.status, 200);
  const assignedBody = await assigned.json();
  assert.deepEqual(await assignees("synthetic-dispatcher"), { items: [] });
  assert.deepEqual(await (await post("assign", "synthetic-dispatcher", { assigneeId: employee })).json(), assignedBody);
  assert.equal((await post("complete", "synthetic-dispatcher")).status, 404);
  assert.equal((await post("contact", "synthetic-staff")).status, 200);
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
  const rateRequest = "028347ec-7740-4000-a000-000000000009";
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
    const { chromium } = loadRuntime("playwright-core");
    const browser = await chromium.launch({ executablePath: process.argv[4], headless: true });
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
    try {
      const dispatch = await open("synthetic-dispatcher", 1440);
      await dispatch.item.getByRole("button", { name: "加载可分配顾问" }).click();
      await dispatch.item.getByRole("combobox", { name: "顾问", exact: true }).selectOption({ label: "Synthetic adviser" });
      await dispatch.item.getByRole("button", { name: "分配", exact: true }).click();
      await dispatch.page.getByRole("status").filter({ hasText: "已分配跟进" }).waitFor();
      await dispatch.context.close();

      const adviser = await open("synthetic-staff", 390);
      assert.equal(await adviser.page.getByText("visitor@example.test").count(), 0);
      await adviser.item.getByRole("button", { name: "查看邮箱", exact: true }).click();
      await adviser.item.getByText("visitor@example.test", { exact: true }).waitFor();
      assert.ok(await adviser.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await adviser.item.getByRole("button", { name: "完成首次跟进" }).click();
      await adviser.page.getByRole("status").filter({ hasText: "已记录首次跟进" }).waitFor();
      assert.equal(await adviser.page.getByText("visitor@example.test").count(), 0);
      await adviser.item.getByText(/已联系/).waitFor();
      await adviser.context.close();
      console.log("PASS Chromium staff workbench: 1440px assignment and 390px contact and follow-up");
      await verifyBrowserConsultation({ browser, config: websiteConfig, receiver });
      const pages = await db.query("SELECT locale FROM crm.website_consultation_intake WHERE service_domain='WEALTH' ORDER BY locale");
      assert.deepEqual(pages.rows, [{ locale: "en" }, { locale: "zh" }]);
      console.log("PASS Chromium website form: 320px Chinese, 390px English, retry and PostgreSQL receipts");
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
      contact_erased_at IS NOT NULL AS recorded FROM crm.website_consultation_intake WHERE lead_id=$1
  `, [newLead])).rows, [{ no_contact: true, no_mac: true, recorded: true }]);
  console.log("PASS approved retention configuration, expiry denial and scoped contact erasure");

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
