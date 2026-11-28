import assert from "node:assert/strict";
import { handleIdentityResidence } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-residence.ts";
import { identityResidencePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-residence-contract.ts";

/*
 * Residence is intentionally verified as a thin HTTP adapter over the
 * candidate Canonical functions.  This file is a disposable-database
 * verifier only; it does not seed production data and never returns the
 * document or person identifiers used by the fixture to the browser.
 */
export async function verifyResidence({ query, recipient, authConfig, browser }) {
  const id = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const actor = id(2);
  const advisorPerson = id(40);
  const advisorPrincipal = id(41);
  const otherFamily = id(180);
  const otherPerson = id(181);
  const otherPrincipal = id(182);
  const otherCase = id(183);
  const document = id(186);
  const documentVersion = id(187);
  const documentReadConsent = id(188);
  const selfReport = id(189);
  const adviserRevision = id(192);

  assert.equal(query(`SELECT has_function_privilege('phoenix_canonical_app',
    'identity.list_journey_residence(uuid[],date,date)', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_reader',
    'identity.list_journey_residence(uuid[],date,date)', 'EXECUTE');`), "f");
  assert.equal(query(`SELECT has_function_privilege('phoenix_canonical_app',
    'identity.record_journey_residence_report(uuid,uuid,date,date,text,text,date)', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_reader',
    'identity.record_journey_residence_report(uuid,uuid,date,date,text,text,date)', 'EXECUTE');`), "f");
  assert.equal(query(`SELECT has_function_privilege('phoenix_canonical_app',
    'identity.confirm_journey_residence_report(uuid,uuid,uuid)', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_reader',
    'identity.confirm_journey_residence_report(uuid,uuid,uuid)', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_service_workbench',
    'identity.confirm_journey_residence_report(uuid,uuid,uuid)', 'EXECUTE');`), "f");

  // Residence authorization is independent from the existing station grant;
  // do not restore or mutate that other fixture's lifecycle here.
  query(`CREATE TABLE identity_journey_test.residence_authority (
      identity_case_id uuid NOT NULL REFERENCES identity.cases,
      family_id uuid NOT NULL REFERENCES core.families,
      subject_person_id uuid NOT NULL REFERENCES core.people,
      recipient_principal_id uuid NOT NULL REFERENCES auth.principals,
      purpose text NOT NULL CHECK (purpose IN ('READ','WRITE')),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      PRIMARY KEY (identity_case_id, recipient_principal_id, purpose)
    );
    INSERT INTO identity_journey_test.residence_authority
      (identity_case_id,family_id,subject_person_id,recipient_principal_id,purpose,expires_at)
    VALUES
      (:'caseId'::uuid,:'familyId'::uuid,:'actor'::uuid,:'principalId'::uuid,'READ',clock_timestamp()+interval '1 day'),
      (:'caseId'::uuid,:'familyId'::uuid,:'actor'::uuid,:'principalId'::uuid,'WRITE',clock_timestamp()+interval '1 day');
    INSERT INTO core.families(family_id,display_name)
      VALUES(:'otherFamily'::uuid,'Synthetic unrelated residence household');
    INSERT INTO core.people(person_id,display_name)
      VALUES(:'otherPerson'::uuid,'Synthetic unrelated residence subject');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
      VALUES(:'otherPrincipal'::uuid,:'otherPerson'::uuid,'FAMILY','ACTIVE');
    INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'otherCase'::uuid,:'otherFamily'::uuid,:'otherPerson'::uuid,'SYNTHETIC_OTHER_FAMILY','UNDER_REVIEW');`,
  { ...recipient, actor, otherFamily, otherPerson, otherPrincipal, otherCase });

  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const report = {
    from: addDays(today, -40),
    untilBefore: addDays(today, -30),
    place: "HK",
    absenceReason: null,
    expectedReturnOn: null,
  };
  const absence = {
    from: addDays(today, -30),
    untilBefore: addDays(today, -20),
    place: "AWAY",
    absenceReason: "WORK",
    expectedReturnOn: addDays(today, -10),
  };

  const origin = authConfig.origin;
  const advisorContext = { principal: advisorPrincipal, person: advisorPerson, channel: "ADVISOR" };
  const familyContext = { principal: recipient.principalId, person: actor, channel: "FAMILY" };
  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";

  // All provider reads/writes lock their purpose-specific fixture grant in
  // the same PostgreSQL transaction as ticket redemption and the Canonical
  // function call. A stale/revoked grant therefore cannot race a write. The
  // candidate functions intentionally expose no app/workbench EXECUTE grant;
  // bind the same FAMILY/ADVISOR context in one disposable bootstrap
  // transaction and keep the privilege-closure assertions above.
  function inContext(context, statement, values = {}) {
    return lastLine(query(`BEGIN;
      SET LOCAL statement_timeout = '4s';
      SELECT auth.issue_context_ticket(:'principal'::uuid, :'person'::uuid,
        :'familyId'::uuid, :'channel', clock_timestamp()+interval '45 seconds',
        gen_random_uuid(), :'principal'::uuid) AS ticket \\gset
      SELECT auth.redeem_context_ticket(:'ticket'::uuid, :'principal'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { ...recipient, actor, ...context, ...values }));
  }

  const inFamily = (statement, values = {}) => inContext(familyContext, statement, values);
  const inAdvisor = (statement, values = {}) => inContext(advisorContext, statement, values);

  const authorityCondition = purpose => `identity_case_id = :'caseId'::uuid
    AND family_id = :'familyId'::uuid AND subject_person_id = :'actor'::uuid
    AND recipient_principal_id = :'principalId'::uuid AND purpose = '${purpose}'
    AND revoked_at IS NULL AND expires_at > clock_timestamp()`;
  const lockedGrant = (purpose, statement) => `
    WITH locked_grant AS MATERIALIZED (
      SELECT 1 FROM identity_journey_test.residence_authority
      WHERE ${authorityCondition(purpose)} FOR SHARE
    )
    ${statement}`;

  let nextReport = 0;
  let writeEnabled = false;
  const provider = {
    async resolveRead(session) {
      assert.deepEqual(session, { customerId: "ci-only-account", sessionHash: "ci-only-session" });
      return {
        async assertCurrent() {
          return query(`SELECT count(*) FROM identity_journey_test.residence_authority
            WHERE ${authorityCondition("READ")};`, { ...recipient, actor }) === "1";
        },
        async listAuthorized(from, untilBefore) {
          const result = inFamily(lockedGrant("READ", `
            SELECT COALESCE((SELECT identity.list_journey_residence(
              ARRAY[:'caseId'::uuid], :'from'::date, :'untilBefore'::date)), 'null'::jsonb)
            FROM locked_grant;`), { from, untilBefore });
          if (result === "" || result === "null") return null;
          return { records: JSON.parse(result), canReport: writeEnabled && query(`SELECT count(*)
            FROM identity_journey_test.residence_authority WHERE ${authorityCondition("WRITE")};`,
          { ...recipient, actor }) === "1" };
        },
      };
    },
    async resolveReport(session) {
      assert.deepEqual(session, { customerId: "ci-only-account", sessionHash: "ci-only-session" });
      return {
        async assertCurrent() {
          return query(`SELECT count(*) FROM identity_journey_test.residence_authority
            WHERE ${authorityCondition("WRITE")};`, { ...recipient, actor }) === "1";
        },
        async recordAuthorized(fields) {
          const intervalId = nextReport++ === 0 ? selfReport : id(500 + nextReport);
          return inFamily(lockedGrant("WRITE", `
            SELECT CASE WHEN EXISTS (SELECT 1 FROM locked_grant)
              THEN identity.record_journey_residence_report(
                :'caseId'::uuid, :'intervalId'::uuid, :'from'::date, :'untilBefore'::date,
                :'place', NULLIF(:'absenceReason',''), NULLIF(:'expectedReturnOn','')::date)
              ELSE 'DENIED' END;`), {
            intervalId, ...fields,
            absenceReason: fields.absenceReason ?? "",
            expectedReturnOn: fields.expectedReturnOn ?? "",
          });
        },
      };
    },
  };

  const env = {
    FAMILY_IDENTITY_RESIDENCE_ENABLED: "true",
    FAMILY_IDENTITY_RESIDENCE_REPORT_ENABLED: "false",
    FAMILY_IDENTITY_RESIDENCE_PROVIDER: provider,
  };
  const get = (headers = {}, selectedEnv = env, selectedConfig = authConfig) =>
    handleIdentityResidence(new Request(origin + identityResidencePath, { headers }), selectedEnv, selectedConfig);
  const post = (body, headers = {}, selectedEnv = env, selectedConfig = authConfig) =>
    handleIdentityResidence(new Request(origin + identityResidencePath, {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }), selectedEnv, selectedConfig);

  // Feature gate, session boundary, same-origin and anti-spoofing checks.
  assert.equal((await get({}, { ...env, FAMILY_IDENTITY_RESIDENCE_ENABLED: "false" })).status, 404);
  assert.equal((await get({}, env, { ...authConfig, verifySession: async () => null })).status, 401);
  assert.equal((await get({ origin: "https://cross-origin.invalid" })).status, 403);
  assert.equal((await get({ "x-family-id": recipient.familyId })).status, 403);

  const initial = await get();
  assert.equal(initial.status, 200);
  assert.equal(initial.headers.get("cache-control"), "private, no-store");
  const initialView = await initial.json();
  assert.equal(initialView.records.length, 0);
  assert.equal(initialView.canReport, false);

  // Write is deliberately closed while read remains available.
  assert.equal((await post(report)).status, 403);
  env.FAMILY_IDENTITY_RESIDENCE_REPORT_ENABLED = "true";
  writeEnabled = true;
  assert.equal((await post(report)).status, 201);
  const duplicate = await post(report);
  assert.equal(duplicate.status, 200);
  assert.deepEqual(await duplicate.json(), { status: "RECORDED" });
  assert.equal(query(`SELECT count(*) FROM identity.journey_residence_intervals
    WHERE identity_case_id = :'caseId'::uuid AND record_source = 'SELF_REPORTED'
      AND from_on = :'from'::date AND until_before = :'untilBefore'::date;`,
  { ...recipient, from: report.from, untilBefore: report.untilBefore }), "1");
  assert.equal(query(`SELECT count(*) FROM audit.access_events
    WHERE resource_kind = 'IDENTITY_JOURNEY_RESIDENCE' AND action = 'CREATE'
      AND resource_id = :'intervalId'::uuid AND decision = 'ALLOW';`,
  { intervalId: selfReport }), "1");

  // The adviser cannot verify until a separate, explicit DOCUMENT_READ grant
  // exists.  The identity-case grant alone is not enough.
  query(`INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
    VALUES(:'document'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE',
      'SYNTHETIC_RESIDENCE_EVIDENCE',clock_timestamp()+interval '1 day');
    INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
    VALUES(:'documentVersion'::uuid,:'document'::uuid,1,repeat('c',64),
      'synthetic/residence-evidence-v1',1);`, { ...recipient, actor, document, documentVersion });
  assert.equal(inAdvisor(`SELECT identity.confirm_journey_residence_report(
    :'reportId'::uuid, :'revisionId'::uuid, :'documentVersion'::uuid);`,
  { reportId: selfReport, revisionId: adviserRevision, documentVersion }), "DENIED");
  assert.equal(inFamily(`SELECT consent.create_grant(:'consentId'::uuid,:'familyId'::uuid,
    :'advisorPerson'::uuid,:'actor'::uuid,'DOCUMENT_READ','IDENTITY_SENSITIVE',
    clock_timestamp()+interval '1 day');`,
  { consentId: documentReadConsent, advisorPerson, actor }), "t");
  assert.equal(inAdvisor(`SELECT identity.confirm_journey_residence_report(
    :'reportId'::uuid, :'revisionId'::uuid, :'documentVersion'::uuid);`,
  { reportId: selfReport, revisionId: adviserRevision, documentVersion }), "RECORDED");

  // Keep a real, non-overlapping AWAY report in the read set so the annual
  // calculation can prove that a planned return date is metadata only.
  assert.equal((await post(absence)).status, 201);

  const withSources = await get();
  assert.equal(withSources.status, 200);
  const sourceView = await withSources.json();
  assert.equal(sourceView.records.filter(row => row.source === "SELF_REPORTED").length, 2);
  assert.equal(sourceView.records.filter(row => row.source === "ADVISER_VERIFIED").length, 1);
  assert.equal(sourceView.records.find(row => row.id === selfReport)?.source, "SELF_REPORTED");
  assert.equal(sourceView.records.find(row => row.id === adviserRevision)?.source, "ADVISER_VERIFIED");
  assert.equal(sourceView.records.some(row => Object.hasOwn(row, "documentId") ||
    Object.hasOwn(row, "document_id") || Object.hasOwn(row, "officialFactId") ||
    Object.hasOwn(row, "official_fact_id")), false);
  const serialized = JSON.stringify(sourceView);
  assert.equal(serialized.includes(recipient.familyId), false);
  assert.equal(serialized.includes(document), false);
  assert.equal(serialized.includes(documentVersion), false);
  const currentYear = sourceView.years.find(year => year.year === Number(today.slice(0, 4)));
  assert.ok(currentYear);
  // The expected return date is planning metadata; it does not add HK days.
  const dayCount = (from, until) => Math.max(0,
    Math.round((Date.parse(`${until}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000));
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const maxDate = (left, right) => left > right ? left : right;
  assert.equal(currentYear.recordedInHongKongDays,
    dayCount(maxDate(report.from, yearStart), report.untilBefore));
  assert.equal(currentYear.longestRecordedAbsenceDays,
    dayCount(maxDate(absence.from, yearStart), absence.untilBefore));
  assert.equal(sourceView.currentRecordedAbsenceDays, null, "A return plan cannot fill the unrecorded gap to today");

  // A withdrawn evidence document removes only the adviser-confirmed interval;
  // the original family report remains visible.
  query(`UPDATE docs.documents SET withdrawn_at = clock_timestamp() WHERE document_id = :'document'::uuid;`, { document });
  const withdrawnEvidence = await get();
  assert.equal(withdrawnEvidence.status, 200);
  const withdrawnView = await withdrawnEvidence.json();
  assert.equal(withdrawnView.records.some(row => row.id === adviserRevision), false);
  assert.equal(withdrawnView.records.some(row => row.id === selfReport), true);

  // Read and write authorities are independent.  Revoking write does not
  // prevent a previously authorized read, while read revocation blocks both.
  query(`UPDATE identity_journey_test.residence_authority SET revoked_at = clock_timestamp()
    WHERE identity_case_id = :'caseId'::uuid AND recipient_principal_id = :'principalId'::uuid
      AND purpose = 'WRITE';`, recipient);
  assert.equal((await get()).status, 200);
  assert.equal((await post(absence)).status, 403);
  query(`UPDATE identity_journey_test.residence_authority SET revoked_at = NULL,
      expires_at = clock_timestamp() - interval '1 second'
    WHERE identity_case_id = :'caseId'::uuid AND recipient_principal_id = :'principalId'::uuid
      AND purpose = 'READ';`, recipient);
  assert.equal((await get()).status, 403);
  query(`UPDATE identity_journey_test.residence_authority SET revoked_at = NULL,
      expires_at = clock_timestamp() + interval '1 day';`, recipient);

  // Cross-family/cross-subject access is checked by the actual Canonical SQL
  // function under a valid FAMILY context, not by a JavaScript mock.
  const crossFamily = inFamily(lockedGrant("READ", `
    SELECT COALESCE(identity.list_journey_residence(
      ARRAY[:'otherCase'::uuid], :'from'::date, :'untilBefore'::date)::text, 'NULL')
    FROM locked_grant;`), { otherCase, from: addDays(today, -60), untilBefore: today });
  assert.equal(crossFamily, "NULL");

  // Leave the database in the ordinary read/write state for an optional real
  // browser harness; the harness itself revokes READ and verifies the mobile
  // denial before this verifier restores the synthetic grant.
  if (browser) {
    await browser({
      apiPath: identityResidencePath,
      handle(request, browserOrigin, hasSession) {
        return handleIdentityResidence(request, env, {
          ...authConfig,
          origin: browserOrigin,
          verifySession: async () => hasSession ? authConfig.verifySession() : null,
        });
      },
      revokeRead() {
        query(`UPDATE identity_journey_test.residence_authority SET revoked_at = clock_timestamp()
          WHERE identity_case_id = :'caseId'::uuid AND recipient_principal_id = :'principalId'::uuid
            AND purpose = 'READ';`, recipient);
      },
      report: {
        from: addDays(today, -18), untilBefore: addDays(today, -12),
        place: "AWAY", absenceReason: "STUDY", expectedReturnOn: addDays(today, -10),
      },
    });
    query(`UPDATE identity_journey_test.residence_authority SET revoked_at = NULL,
        expires_at = clock_timestamp() + interval '1 day';`, recipient);
  }
  console.log("PASS residence HTTP/Canonical scope, independent read-write grants, self-report idempotency, adviser verification, evidence withdrawal and cross-family denial");
}
