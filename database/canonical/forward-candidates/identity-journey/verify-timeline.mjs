import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleIdentityTimeline, identityTimelinePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-timeline.ts";

export async function verifyTimeline({ query, recipient, authConfig, browser, onRenewal }) {
  query(readFileSync(new URL("./verify-renewal.sql", import.meta.url), "utf8"));
  console.log("PASS same-family verified renewal, rollback, old receipt, next-cycle queue and canonical audit");
  await onRenewal();
  assert.equal(query(`SELECT has_function_privilege('phoenix_canonical_app',
    'identity.list_journey_stay_timeline(uuid,uuid,uuid,integer)', 'EXECUTE');`), "f");
  const oldId = "01910000-0000-7000-8100-000000000049";
  const newId = "01910000-0000-7000-8100-000000000050";
  const newDoc = "01910000-0000-7000-8100-000000000045";
  query(`CREATE TABLE identity_journey_test.timeline_authority (
    case_id uuid PRIMARY KEY, family_id uuid NOT NULL, principal_id uuid NOT NULL,
    purpose text NOT NULL CHECK (purpose = 'IDENTITY_READ'), valid_until timestamptz NOT NULL,
    revoked_at timestamptz
  );
  INSERT INTO identity_journey_test.timeline_authority VALUES (:'caseId'::uuid, :'familyId'::uuid,
    :'principalId'::uuid, 'IDENTITY_READ', clock_timestamp() + interval '1 day', NULL);`, recipient);

  const authCondition = `case_id = :'caseId'::uuid AND family_id = :'familyId'::uuid
    AND principal_id = :'principalId'::uuid AND purpose = 'IDENTITY_READ' AND revoked_at IS NULL
    AND valid_until > clock_timestamp()`;
  const queryScope = ":'familyId'::uuid, :'caseId'::uuid, :'principalId'::uuid";
  const supported = (source = query) => ({
    FAMILY_IDENTITY_TIMELINE_ENABLED: "true",
    FAMILY_IDENTITY_TIMELINE_PROVIDER: {
      async resolve(session) {
        if (session.customerId !== "ci-only-account" || session.sessionHash !== "ci-only-session") return null;
        return {
          async assertCurrent() {
          return source(`SELECT count(*) FROM identity_journey_test.timeline_authority WHERE ${authCondition};`, recipient) === "1";
          },
          async listAuthorized() {
          const result = source(`BEGIN;
              WITH locked_grant AS MATERIALIZED (
                SELECT family_id, case_id, principal_id FROM identity_journey_test.timeline_authority
                WHERE ${authCondition} FOR SHARE
              )
              SELECT (SELECT coalesce(jsonb_agg(jsonb_build_object('id', n.record_id, 'validUntil', n.valid_until,
                'recordedAt', n.recorded_at, 'current', n.is_current, 'privateEvidence', 'synthetic-opaque-evidence')
                ORDER BY n.is_current DESC, n.recorded_at DESC, n.record_id DESC), '[]')
                FROM identity.list_journey_stay_timeline(g.family_id, g.case_id, g.principal_id, 50) n)
              FROM locked_grant g;
              COMMIT;`, recipient);
            return result ? JSON.parse(result) : null;
          },
        };
      },
    },
  });
  const get = (headers = {}, suffix = "", source = query) =>
    handleIdentityTimeline(new Request(authConfig.origin + identityTimelinePath + suffix, { headers }), supported(source), authConfig);
  const response = await get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const dates = (await response.json()).dates;
  assert.equal(dates.length, 2);
  assert.deepEqual(dates.map(entry => [entry.id, entry.current]), [[newId, true], [oldId, false]]);
  assert.deepEqual(Object.keys(dates[0]).sort(), ["current", "id", "recordedAt", "validUntil"]);
  assert.equal(query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date + 7, 'YYYY-MM-DD');"), dates[0].validUntil);
  assert.equal((await get({ "x-family-id": recipient.familyId })).status, 403);
  assert.equal((await get({}, "?familyId=anything")).status, 403);
  assert.equal(query(`SELECT count(*) FROM identity.list_journey_stay_timeline(${queryScope}, 50);`,
    { ...recipient, familyId: recipient.caseId }), "0");
  assert.equal(query(`SELECT count(*) FROM identity.list_journey_stay_timeline(${queryScope}, 50);`,
    { ...recipient, principalId: recipient.caseId }), "0");

  const revoke = () => query("UPDATE identity_journey_test.timeline_authority SET revoked_at = clock_timestamp();");
  if (browser) {
    await browser({
      apiPath: identityTimelinePath,
      expectedDate: dates[0].validUntil,
      handle(request, origin, hasSession) {
        return handleIdentityTimeline(request, supported(), {
          ...authConfig,
          origin,
          verifySession: async () => hasSession ? authConfig.verifySession() : null,
        });
      },
      revoke,
    });
    query("UPDATE identity_journey_test.timeline_authority SET revoked_at = NULL;");
  }
  const noScope = await handleIdentityTimeline(new Request(authConfig.origin + identityTimelinePath), supported(), {
    ...authConfig, verifySession: async () => null,
  });
  assert.equal(noScope.status, 401);
  async function assertRevoked(source) {
    const revoked = await get({}, "", source);
    assert.equal(revoked.status, 403);
    assert.equal(Object.hasOwn(await revoked.json(), "dates"), false);
  }
  return {
    newDoc,
    async verifyWithdrawal(withdrawDocument) {
      withdrawDocument();
      const withheldDoc = await get();
      assert.equal(withheldDoc.status, 200);
      assert.deepEqual((await withheldDoc.json()).dates.map(entry => [entry.id, entry.current]), [[oldId, false]]);
      revoke();
      await assertRevoked(query);
      console.log("PASS authorized stay timeline over HTTP and PostgreSQL, withdrawn source does not revive prior date");
    },
    assertRevoked,
  };
}
