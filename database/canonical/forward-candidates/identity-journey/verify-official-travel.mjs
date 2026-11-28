import assert from "node:assert/strict";
import { handleIdentityResidence } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-residence.ts";
import { identityResidencePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-residence-contract.ts";

/*
 * Official travel is deliberately verified as a private, adviser-bound import
 * over a controlled Docs version.  The verifier uses only disposable fixture
 * rows.  In particular, it does not call an app/reader role or expose the
 * statement/version/attestation identifiers through the HTTP projection.
 */
export async function verifyOfficialTravel({ query, recipient, authConfig, browser }) {
  const id = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const actor = id(2);
  const advisorPerson = id(40);
  const advisorPrincipal = id(41);
  const otherFamily = id(920);
  const otherPerson = id(921);
  const otherCase = id(922);
  const document = id(900);
  const documentVersion = id(901);
  const documentConsent = id(188);
  const intervalIds = [id(904), id(905), id(906), id(907), id(908), id(909), id(916)];

  const importSignature = "identity.import_journey_travel_statement(uuid,uuid,date[],text[],uuid[])";
  const listSignature = "identity.list_journey_residence_with_travel(uuid[],date,date)";
  const memberListSignature = "identity.read_journey_member_residence_with_travel(uuid,uuid,uuid[],date,date)";
  const collectSignature = "identity.collect_journey_travel_movements(uuid,uuid[],date,date)";

  // The travel statement and its projections are private candidate APIs.
  // No ordinary app, reader, or workbench login may execute them directly.
  for (const role of ["phoenix_canonical_app", "phoenix_canonical_reader", "phoenix_canonical_service_workbench"]) {
    assert.equal(query("SELECT has_function_privilege(:'role', :'signature', 'EXECUTE');",
      { role, signature: importSignature }), "f", `${role} can import official travel`);
    assert.equal(query("SELECT has_function_privilege(:'role', :'signature', 'EXECUTE');",
      { role, signature: listSignature }), "f", `${role} can list official travel directly`);
    assert.equal(query("SELECT has_function_privilege(:'role', :'signature', 'EXECUTE');",
      { role, signature: memberListSignature }), "f", `${role} can list member travel directly`);
    assert.equal(query("SELECT has_function_privilege(:'role', :'signature', 'EXECUTE');",
      { role, signature: collectSignature }), "f", `${role} can collect official travel directly`);
  }

  // The adviser uses the real assignment and separate Canonical write/read
  // grants established by the preceding service and residence fixture.
  query(`INSERT INTO core.families(family_id,display_name)
      VALUES(:'otherFamily'::uuid,'Synthetic unrelated travel family');
    INSERT INTO core.people(person_id,display_name)
      VALUES(:'otherPerson'::uuid,'Synthetic unrelated travel subject');
    INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'otherCase'::uuid,:'otherFamily'::uuid,:'otherPerson'::uuid,
        'SYNTHETIC_OTHER_TRAVEL_CASE','UNDER_REVIEW');
    INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
      VALUES(:'document'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE',
        'HK_IMMD_TRAVEL_STATEMENT',clock_timestamp()+interval '1 day');
    INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
      VALUES(:'documentVersion'::uuid,:'document'::uuid,1,repeat('d',64),
        'synthetic/hk-immd-travel-statement-v1',1);`,
  { ...recipient, actor, otherFamily, otherPerson, otherCase, document, documentVersion });

  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };

  // Two unambiguous pairs generate exact interior whole-day intervals.  The
  // same-day ARRIVAL/DEPARTURE pair remains visible as source movement data,
  // but cannot create a residence interval or add a day.
  const dates = [
    addDays(today, -75), addDays(today, -70),
    addDays(today, -65), addDays(today, -60),
    addDays(today, -50), addDays(today, -50), addDays(today, -75),
  ];
  const dateArray = "ARRAY[:'d1'::date,:'d2'::date,:'d3'::date,:'d4'::date,:'d5'::date,:'d6'::date,:'d1'::date]";
  const directionArray = "ARRAY['ARRIVAL','DEPARTURE','ARRIVAL','DEPARTURE','ARRIVAL','DEPARTURE','ARRIVAL']::text[]";
  const intervalArray = `ARRAY['${intervalIds.join("','")}']::uuid[]`;
  const fields = {
    ...recipient, actor, advisorPerson, advisorPrincipal, document, documentVersion,
    otherFamily, otherPerson, otherCase, d1: dates[0], d2: dates[1], d3: dates[2],
    d4: dates[3], d5: dates[4], d6: dates[5],
  };

  const origin = authConfig.origin;
  const advisorContext = { principal: advisorPrincipal, person: advisorPerson, channel: "ADVISOR" };
  const familyContext = { principal: recipient.principalId, person: actor, channel: "FAMILY" };
  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";

  // Context tickets are intentionally redeemed inside the same transaction as
  // the candidate function call, matching the existing residence verifier.
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
  const importExpression = (datesSql = dateArray, directionsSql = directionArray,
    intervalsSql = intervalArray, caseValue = ":'caseId'::uuid", versionValue = ":'documentVersion'::uuid") =>
    `identity.import_journey_travel_statement(${caseValue},${versionValue},${datesSql},${directionsSql},${intervalsSql})`;

  // Both grants are active, but the controlled source still needs its own
  // immutable attestation.
  assert.equal(inAdvisor(`SELECT ${importExpression()};`, fields), "DENIED",
    "unattested travel statement must be denied");

  // Attestation digest is the exact canonical JSONB representation of the
  // normalized date and direction arrays; the source remains immutable.
  query(`INSERT INTO identity.journey_travel_attestations
      (evidence_version_id,identity_case_id,source_kind,movement_sha256,verified_by)
    VALUES(:'documentVersion'::uuid,:'caseId'::uuid,'HK_IMMD_TRAVEL_STATEMENT',
      encode(sha256(convert_to(jsonb_build_array(${dateArray},${directionArray})::text,'UTF8')),'hex'),
      :'advisorPrincipal'::uuid);`, fields);
  assert.equal(query(`SELECT count(*) FROM identity.journey_travel_attestations
    WHERE evidence_version_id=:'documentVersion'::uuid AND identity_case_id=:'caseId'::uuid
      AND source_kind='HK_IMMD_TRAVEL_STATEMENT' AND verified_by=:'advisorPrincipal'::uuid;`, fields), "1");

  assert.equal(inAdvisor(`SELECT ${importExpression()};`, fields), "RECORDED");
  assert.equal(query(`SELECT count(*) FROM identity.journey_travel_movements
    WHERE evidence_version_id=:'documentVersion'::uuid;`, fields), "6");
  assert.equal(query(`SELECT count(*) FROM identity.journey_residence_intervals
    WHERE identity_case_id=:'caseId'::uuid AND record_source='OFFICIAL_RECORD'
      AND evidence_version_id=:'documentVersion'::uuid AND document_id=:'document'::uuid
      AND confirmed_report_id IS NULL AND official_fact_id IS NULL;`, fields), "2");
  assert.equal(query(`SELECT count(*) FROM identity.journey_residence_intervals
    WHERE identity_case_id=:'caseId'::uuid AND record_source='OFFICIAL_RECORD'
      AND evidence_version_id=:'documentVersion'::uuid
      AND from_on=:'firstFrom'::date AND until_before=:'firstUntil'::date;`, {
    ...fields, firstFrom: addDays(today, -74), firstUntil: addDays(today, -70),
  }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_residence_intervals
    WHERE identity_case_id=:'caseId'::uuid AND record_source='OFFICIAL_RECORD'
      AND evidence_version_id=:'documentVersion'::uuid
      AND from_on=:'secondFrom'::date AND until_before=:'secondUntil'::date;`, {
    ...fields, secondFrom: addDays(today, -64), secondUntil: addDays(today, -60),
  }), "1");

  // Replay is idempotent.  A changed normalized payload cannot reuse the
  // attestation digest, and therefore cannot append a second source.
  assert.equal(inAdvisor(`SELECT ${importExpression()};`, fields), "ALREADY_RECORDED");
  const changedDirections = "ARRAY['ARRIVAL','DEPARTURE','ARRIVAL','ARRIVAL','ARRIVAL','DEPARTURE','ARRIVAL']::text[]";
  assert.equal(inAdvisor(`SELECT ${importExpression(dateArray, changedDirections, intervalArray)};`, fields), "DENIED");
  assert.equal(query(`SELECT count(*) FROM identity.journey_residence_intervals
    WHERE identity_case_id=:'caseId'::uuid AND record_source='OFFICIAL_RECORD'
      AND evidence_version_id=:'documentVersion'::uuid;`, fields), "2");

  // Typed malformed/future input is rejected before any source row can be
  // created.  UUID-array shape and duplicate interval IDs are also bounded.
  const malformed = [
    [`ARRAY[:'future'::date]`, `ARRAY['ARRIVAL']::text[]`, `ARRAY['${id(910)}']::uuid[]`, { future: addDays(today, 1) }],
    [`ARRAY[DATE '1899-12-31']`, `ARRAY['ARRIVAL']::text[]`, `ARRAY['${id(911)}']::uuid[]`, {}],
    [`ARRAY[:'d1'::date]`, `ARRAY['SIDEWAYS']::text[]`, `ARRAY['${id(912)}']::uuid[]`, {}],
    [`ARRAY[:'d1'::date,:'d2'::date]`, `ARRAY['ARRIVAL']::text[]`, `ARRAY['${id(913)}','${id(914)}']::uuid[]`, {}],
    [`ARRAY[:'d1'::date,:'d2'::date]`, `ARRAY['ARRIVAL','DEPARTURE']::text[]`, `ARRAY['${id(915)}','${id(915)}']::uuid[]`, {}],
  ];
  for (const [badDates, badDirections, badIntervals, values] of malformed) {
    assert.equal(inAdvisor(`SELECT ${importExpression(badDates, badDirections, badIntervals)};`, { ...fields, ...values }), "DENIED");
  }
  assert.equal(query(`SELECT count(*) FROM identity.journey_travel_movements
    WHERE evidence_version_id=:'documentVersion'::uuid;`, fields), "6");

  // A different family/case and a revoked assignment cannot import even when
  // the source is otherwise well formed.  Revoke inside a bound adviser
  // transaction so the ticket itself remains valid for the negative check.
  assert.equal(inAdvisor(`SELECT ${importExpression(dateArray, directionArray, intervalArray, ":'otherCase'::uuid")};`, fields), "DENIED");
  assert.equal(inAdvisor(`UPDATE casework.advisor_assignments
      SET revoked_at=clock_timestamp() WHERE case_id='${id(43)}'::uuid;
    SELECT ${importExpression()};`, fields), "DENIED");
  query(`UPDATE casework.advisor_assignments SET revoked_at=NULL WHERE case_id='${id(43)}'::uuid;`);

  // The protected FAMILY projection contains only date/direction movement
  // DTOs.  It must not leak document, version, attestation or case identifiers.
  const authorityCondition = `identity_case_id = :'caseId'::uuid
    AND family_id = :'familyId'::uuid AND subject_person_id = :'actor'::uuid
    AND recipient_principal_id = :'principalId'::uuid AND purpose = 'READ'
    AND revoked_at IS NULL AND expires_at > clock_timestamp()`;
  // Keep exact read-scope locking consistent with the existing residence
  // provider.  The CTE is part of the same transaction as the Canonical call.
  const listAuthorizedWithGrant = (from, untilBefore) => {
    const result = inFamily(`WITH locked_grant AS MATERIALIZED (
        SELECT 1 FROM identity_journey_test.residence_authority
        WHERE ${authorityCondition} FOR SHARE
      )
      SELECT COALESCE((SELECT identity.list_journey_residence_with_travel(
        ARRAY[:'caseId'::uuid], :'from'::date, :'untilBefore'::date)), 'null'::jsonb)
      FROM locked_grant;`, { ...fields, from, untilBefore });
    if (!result || result === "null") return null;
    return JSON.parse(result);
  };
  const windowFrom = `${Number(today.slice(0, 4)) - 6}-01-01`;
  const projected = listAuthorizedWithGrant(windowFrom, today);
  assert.ok(projected && Array.isArray(projected.records) && Array.isArray(projected.movements));
  assert.equal(projected.movements.length, 6);
  assert.ok(projected.movements.some(row => row.on === dates[0] && row.direction === "ARRIVAL"));
  assert.ok(projected.movements.some(row => row.on === dates[5] && row.direction === "DEPARTURE"));
  assert.equal(projected.movements.some(row => Object.keys(row).some(key =>
    /id|source|document|version|case|attestation/i.test(key))), false);
  const projectedText = JSON.stringify(projected);
  assert.equal(projectedText.includes(document), false);
  assert.equal(projectedText.includes(documentVersion), false);
  assert.equal(projectedText.includes(recipient.caseId), false);

  // Run the real HTTP adapter over that provider and check the same DTO
  // boundary after its civil-date and duplicate projection.
  const provider = {
    async resolveRead(session) {
      assert.deepEqual(session, { customerId: "ci-only-account", sessionHash: "ci-only-session" });
      return {
        async assertCurrent() {
          return query(`SELECT count(*) FROM identity_journey_test.residence_authority
            WHERE ${authorityCondition};`, fields) === "1";
        },
        async listAuthorized(from, untilBefore) {
          const value = listAuthorizedWithGrant(from, untilBefore);
          return value ? { ...value, canReport: false } : null;
        },
      };
    },
  };
  const env = {
    FAMILY_IDENTITY_RESIDENCE_ENABLED: "true",
    FAMILY_IDENTITY_RESIDENCE_REPORT_ENABLED: "false",
    FAMILY_IDENTITY_RESIDENCE_PROVIDER: provider,
  };
  const get = (headers = {}) => handleIdentityResidence(
    new Request(origin + identityResidencePath, { headers }), env, authConfig);
  const httpResponse = await get();
  assert.equal(httpResponse.status, 200);
  const httpView = await httpResponse.json();
  assert.ok(Array.isArray(httpView.movements));
  assert.equal(httpView.movements.length, 6);
  assert.equal(httpView.movements.some(row => Object.keys(row).some(key =>
    /id|source|document|version|case|attestation/i.test(key))), false);
  assert.equal(JSON.stringify(httpView).includes(document), false);
  assert.equal(JSON.stringify(httpView).includes(documentVersion), false);

  if (browser) {
    await browser({
      apiPath: identityResidencePath,
      arrivalDate: dates[0],
      departureDate: dates[1],
      handle(request, browserOrigin, hasSession) {
        return handleIdentityResidence(request, env, {
          ...authConfig,
          origin: browserOrigin,
          verifySession: async () => hasSession ? authConfig.verifySession() : null,
        });
      },
    });
  }

  // Withdrawal is one-way and removes both the official interval and its
  // movement projection.  The attestation remains an immutable audit source,
  // but is no longer a visible family fact.
  assert.equal(inFamily("SELECT consent.withdraw_grant(:'documentConsent'::uuid);", { ...fields, documentConsent }), "t");
  assert.equal(inAdvisor(`SELECT ${importExpression()};`, fields), "DENIED",
    "a still-valid identity case grant cannot substitute for withdrawn document access");
  assert.equal(inFamily(`SELECT docs.withdraw_document(:'document'::uuid);`, fields), "t");
  const withdrawnView = listAuthorizedWithGrant(windowFrom, today);
  assert.ok(withdrawnView);
  assert.equal(withdrawnView.movements.length, 0);
  assert.equal(withdrawnView.records.some(row => row.source === "OFFICIAL_RECORD"), false);
  assert.equal(query(`SELECT count(*) FROM identity.journey_travel_attestations
    WHERE evidence_version_id=:'documentVersion'::uuid;`, fields), "1");

  console.log("PASS official travel attestation scope, digest/idempotency, exact interior-day pairing, typed input rejection, FAMILY DTO minimization and withdrawal filtering");
}
