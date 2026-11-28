import assert from "node:assert/strict";
import { handleIdentityMemberResidence } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-member-residence.ts";
import { handleIdentityProfile } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile.ts";
import { identityMemberResidencePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-residence-contract.ts";
import { identityProfilePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile-contract.ts";

/*
 * Member residence is a deliberately narrow read adapter.  The profile grant
 * and the residence-purpose grant are separate fixture rows; a live profile,
 * family membership or Canonical guardian row alone must never authorize this
 * endpoint.  All subjects, cases and interval IDs below remain in the
 * disposable CI database and are not returned to the browser.
 */
export async function verifyIdentityMemberResidence({
  query,
  recipient,
  authConfig,
  member,
  withFamilyContext,
  profileLock,
  profilePost,
  profileEnv,
  browser,
}) {
  assert.ok(member?.ref && member.subject && member.guardian && member.cases?.length);
  const id = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const actor = id(2);
  const interval = id(670);
  const parentInterval = id(671);
  const residenceMemberRef = member.ref;
  const subject = member.subject;
  const guardian = member.guardian;
  const caseOne = member.cases[0];
  const caseTwo = member.cases[1] ?? member.cases[0];

  const signature = "identity.read_journey_member_residence_with_travel(uuid,uuid,uuid[],date,date)";
  assert.equal(query("SELECT to_regprocedure(:'signature') IS NOT NULL;", { signature }), "t");
  for (const role of ["phoenix_canonical_app", "phoenix_canonical_reader", "phoenix_canonical_service_workbench"]) {
    assert.equal(query("SELECT has_function_privilege(:'role', :'signature', 'EXECUTE');", { role, signature }), "f");
  }

  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const childFrom = addDays(today, -120);
  const childUntil = addDays(today, -110);
  const childReturn = addDays(today, -100);
  const parentFrom = addDays(today, -90);
  const parentUntil = addDays(today, -80);
  const windowFrom = addDays(today, -365 * 6);

  // A separate row is required even when the member profile is live.  The
  // parent interval is intentionally in the same family but a different case;
  // the member projection must not mix it into the child's result.
  query(`
    CREATE TABLE identity_journey_test.member_residence_authority (
      member_ref text PRIMARY KEY CHECK (member_ref ~ '^member_[A-Za-z0-9_-]{24,96}$'),
      customer_id text NOT NULL,
      session_hash text NOT NULL,
      family_id uuid NOT NULL REFERENCES core.families,
      subject_person_id uuid NOT NULL REFERENCES core.people,
      guardian_authority_id uuid NOT NULL REFERENCES core.guardian_authorities,
      recipient_principal_id uuid NOT NULL REFERENCES auth.principals,
      case_one uuid NOT NULL REFERENCES identity.cases,
      case_two uuid NOT NULL REFERENCES identity.cases,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      CHECK (case_one <> case_two)
    );
    INSERT INTO identity.journey_residence_intervals(
      interval_id,identity_case_id,from_on,until_before,location_class,
      absence_reason_class,expected_return_on,record_source,recorded_by)
    VALUES
      (:'interval'::uuid,:'caseTwo'::uuid,:'childFrom'::date,:'childUntil'::date,
       'AWAY','STUDY',:'childReturn'::date,'SELF_REPORTED',:'principalId'::uuid),
      (:'parentInterval'::uuid,:'parentCase'::uuid,:'parentFrom'::date,:'parentUntil'::date,
       'HK',NULL,NULL,'SELF_REPORTED',:'principalId'::uuid);`, {
    ...recipient,
    interval,
    parentInterval,
    parentCase: recipient.caseId,
    caseTwo,
    childFrom,
    childUntil,
    childReturn,
    parentFrom,
    parentUntil,
  });

  const origin = authConfig.origin;
  const valuesFor = session => ({
    ...recipient,
    actor,
    memberRef: residenceMemberRef,
    customerId: session.customerId,
    sessionHash: session.sessionHash,
    subject,
    guardian,
    caseOne,
    caseTwo,
  });
  function inContext(statement, values = {}) {
    try {
      return withFamilyContext(statement, values);
    } catch (error) {
      if (error?.stderr) console.error(error.stderr.toString().trim());
      throw error;
    }
  }
  const grantWhere = `member_ref = :'memberRef'
    AND customer_id = :'customerId' AND session_hash = :'sessionHash'
    AND family_id = :'familyId'::uuid AND subject_person_id = :'subject'::uuid
    AND guardian_authority_id = :'guardian'::uuid
    AND recipient_principal_id = :'principal'::uuid
    AND case_one = :'caseOne'::uuid AND case_two = :'caseTwo'::uuid
    AND revoked_at IS NULL AND expires_at > clock_timestamp()`;
  const provider = {
    async resolveMember(session, memberRef) {
      if (session.customerId !== "ci-only-account" || memberRef !== residenceMemberRef) return null;
      const values = valuesFor(session);
      const current = () => inContext(`
        WITH profile_grant AS MATERIALIZED (
          SELECT 1 FROM identity_journey_test.member_profile_authority
          WHERE member_ref = :'memberRef' AND customer_id = :'customerId' AND session_hash = :'sessionHash'
            AND family_id = :'familyId'::uuid AND subject_person_id = :'subject'::uuid
            AND guardian_authority_id = :'guardian'::uuid AND recipient_principal_id = :'principal'::uuid
            AND access = 'GUARDIAN' AND revoked_at IS NULL AND expires_at > clock_timestamp()
          FOR SHARE
        ), residence_grant AS MATERIALIZED (
          SELECT 1 FROM identity_journey_test.member_residence_authority
          WHERE ${grantWhere} FOR SHARE
        )
        SELECT CASE WHEN EXISTS (SELECT 1 FROM profile_grant)
          AND EXISTS (SELECT 1 FROM residence_grant)
          THEN identity.lock_journey_profile_access(:'subject'::uuid, :'guardian'::uuid,
            ARRAY[:'caseOne'::uuid, :'caseTwo'::uuid])
          ELSE false END;`, values) === "t";
      return {
        async assertCurrent() {
          return current();
        },
        async listAuthorized(from, untilBefore) {
          const raw = inContext(`
            WITH profile_grant AS MATERIALIZED (
              SELECT 1 FROM identity_journey_test.member_profile_authority
              WHERE member_ref = :'memberRef' AND customer_id = :'customerId' AND session_hash = :'sessionHash'
                AND family_id = :'familyId'::uuid AND subject_person_id = :'subject'::uuid
                AND guardian_authority_id = :'guardian'::uuid AND recipient_principal_id = :'principal'::uuid
                AND access = 'GUARDIAN' AND revoked_at IS NULL AND expires_at > clock_timestamp()
              FOR SHARE
            ), residence_grant AS MATERIALIZED (
              SELECT 1 FROM identity_journey_test.member_residence_authority
              WHERE ${grantWhere} FOR SHARE
            ), profile_scope AS MATERIALIZED (
              SELECT identity.lock_journey_profile_access(:'subject'::uuid, :'guardian'::uuid,
                ARRAY[:'caseOne'::uuid, :'caseTwo'::uuid]) AS live
              FROM profile_grant, residence_grant
            )
            SELECT COALESCE((
              SELECT identity.read_journey_member_residence_with_travel(:'subject'::uuid, :'guardian'::uuid,
                ARRAY[:'caseOne'::uuid, :'caseTwo'::uuid], :'from'::date, :'untilBefore'::date)
              FROM profile_scope WHERE live
            ), 'null'::jsonb);`, { ...values, from, untilBefore });
          return raw === "" || raw === "null" ? null : JSON.parse(raw);
        },
      };
    },
  };
  const env = {
    FAMILY_IDENTITY_PROFILE_ENABLED: "true",
    FAMILY_IDENTITY_MEMBER_RESIDENCE_ENABLED: "true",
    FAMILY_IDENTITY_MEMBER_RESIDENCE_PROVIDER: provider,
  };
  const post = (body, headers = {}, selectedEnv = env, selectedConfig = authConfig) =>
    handleIdentityMemberResidence(new Request(origin + identityMemberResidencePath, {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }), selectedEnv, selectedConfig);
  const method = (name, headers = {}) => handleIdentityMemberResidence(
    new Request(origin + identityMemberResidencePath, { method: name, headers }), env, authConfig);

  // Both gates are required and the route is intentionally POST-only.
  assert.equal((await post({ memberRef: residenceMemberRef }, {}, {
    ...env, FAMILY_IDENTITY_PROFILE_ENABLED: "false",
  })).status, 404);
  assert.equal((await post({ memberRef: residenceMemberRef }, {}, {
    ...env, FAMILY_IDENTITY_MEMBER_RESIDENCE_ENABLED: "false",
  })).status, 404);
  assert.equal((await method("GET")).status, 405);
  assert.equal((await method("PUT")).status, 405);
  assert.equal((await method("DELETE")).status, 405);
  assert.equal((await post({ memberRef: residenceMemberRef }, {}, env, {
    ...authConfig, verifySession: async () => null,
  })).status, 401);
  assert.equal((await post({ memberRef: residenceMemberRef }, { origin: "https://cross-origin.invalid" })).status, 403);
  assert.equal((await post({ memberRef: residenceMemberRef }, { "x-family-id": recipient.familyId })).status, 403);
  assert.equal((await post({ memberRef: "member_unknown_0000000000000000000000" })).status, 403);
  assert.equal((await post({ memberRef: "member_too_short" })).status, 400);
  assert.equal((await post({ memberRef: residenceMemberRef, extra: true })).status, 400);

  // A live roster/profile is not enough: there is deliberately no residence
  // grant yet.  The profile endpoint remains available for the same member.
  assert.equal(profileLock(member, { customerId: "ci-only-account", sessionHash: "ci-only-session" }), "t");
  assert.equal((await profilePost({ memberRef: residenceMemberRef })).status, 200);
  assert.equal((await post({ memberRef: residenceMemberRef })).status, 403);

  // Activate only the child residence-purpose grant.  The selected child
  // interval is returned, but the same-family parent interval is not.
  query(`INSERT INTO identity_journey_test.member_residence_authority(
      member_ref,customer_id,session_hash,family_id,subject_person_id,guardian_authority_id,
      recipient_principal_id,case_one,case_two,expires_at)
    VALUES(:'memberRef',:'customerId',:'sessionHash',:'familyId'::uuid,:'subject'::uuid,
      :'guardian'::uuid,:'principalId'::uuid,:'caseOne'::uuid,:'caseTwo'::uuid,
      clock_timestamp()+interval '1 day');`, valuesFor({ customerId: "ci-only-account", sessionHash: "ci-only-session" }));
  const active = await post({ memberRef: residenceMemberRef });
  assert.equal(active.status, 200);
  assert.equal(active.headers.get("cache-control"), "private, no-store");
  const overview = await active.json();
  assert.equal(overview.canReport, false);
  assert.equal(overview.rightOfAbode, "HUMAN_REVIEW_REQUIRED");
  assert.equal(overview.passportEligibility, "HUMAN_REVIEW_REQUIRED");
  assert.equal(overview.records.length, 1);
  assert.deepEqual(overview.records[0], {
    id: interval,
    from: childFrom,
    untilBefore: childUntil,
    place: "AWAY",
    source: "SELF_REPORTED",
    absenceReason: "STUDY",
    expectedReturnOn: childReturn,
  });
  assert.equal(JSON.stringify(overview).includes(parentInterval), false);
  assert.equal(JSON.stringify(overview).includes(recipient.caseId), false);
  assert.equal(JSON.stringify(overview).includes(subject), false);
  assert.equal(JSON.stringify(overview).includes(guardian), false);

  const wrongSessionConfig = {
    ...authConfig,
    verifySession: async () => ({
      ...(await authConfig.verifySession()),
      token_hash: "wrong-session-bound-to-no-residence-grant",
    }),
  };
  assert.equal((await post({ memberRef: residenceMemberRef }, {}, env, wrongSessionConfig)).status, 403);

  // The SQL function must fail closed even if a trusted adapter supplies a
  // case or subject outside the selected member's profile scope.
  const directRead = (readSubject, readCase) => inContext(`
    SELECT COALESCE(identity.read_journey_member_residence_with_travel(:'readSubject'::uuid, :'guardian'::uuid,
      ARRAY[:'readCase'::uuid], :'from'::date, :'untilBefore'::date), 'null'::jsonb);`, {
    ...valuesFor({ customerId: "ci-only-account", sessionHash: "ci-only-session" }),
    readSubject,
    readCase,
    from: windowFrom,
    untilBefore: today,
  });
  assert.equal(directRead(subject, recipient.caseId), "null");
  assert.equal(directRead(actor, caseOne), "null");

  // The residence row must also hold the live session-bound profile reference
  // in the same transaction.  Revoking only that reference denies residence
  // while the residence-purpose row remains active; restoring it reopens the
  // isolated read without changing the Canonical guardian.
  query(`UPDATE identity_journey_test.member_profile_authority
    SET revoked_at = clock_timestamp() WHERE member_ref = :'memberRef';`, { memberRef: residenceMemberRef });
  assert.equal((await post({ memberRef: residenceMemberRef })).status, 403);
  assert.equal((await profilePost({ memberRef: residenceMemberRef })).status, 403);
  query(`UPDATE identity_journey_test.member_profile_authority
    SET revoked_at = NULL WHERE member_ref = :'memberRef';`, { memberRef: residenceMemberRef });
  assert.equal((await post({ memberRef: residenceMemberRef })).status, 200);

  // Residence authorization is purpose-specific.  Revoking it must not
  // remove the identity profile grant or the profile projection.
  query(`UPDATE identity_journey_test.member_residence_authority
    SET revoked_at = clock_timestamp() WHERE member_ref = :'memberRef';`, { memberRef: residenceMemberRef });
  assert.equal((await post({ memberRef: residenceMemberRef })).status, 403);
  assert.equal((await profilePost({ memberRef: residenceMemberRef })).status, 200);
  query(`UPDATE identity_journey_test.member_residence_authority
    SET revoked_at = NULL WHERE member_ref = :'memberRef';`, { memberRef: residenceMemberRef });
  assert.equal((await post({ memberRef: residenceMemberRef })).status, 200);

  const revokeResidence = () => query(`UPDATE identity_journey_test.member_residence_authority
    SET revoked_at = clock_timestamp() WHERE member_ref = :'memberRef';`, { memberRef: residenceMemberRef });
  const restoreResidence = () => query(`UPDATE identity_journey_test.member_residence_authority
    SET revoked_at = NULL WHERE member_ref = :'memberRef';`, { memberRef: residenceMemberRef });
  if (browser) {
    try {
      await browser({
        profilePath: identityProfilePath,
        handleProfile(request, browserOrigin, hasSession) {
          return handleIdentityProfile(request, profileEnv, {
            ...authConfig,
            origin: browserOrigin,
            verifySession: async () => hasSession ? authConfig.verifySession() : null,
          });
        },
        residencePath: identityMemberResidencePath,
        handleResidence(request, browserOrigin, hasSession) {
          return handleIdentityMemberResidence(request, env, {
            ...authConfig,
            origin: browserOrigin,
            verifySession: async () => hasSession ? authConfig.verifySession() : null,
          });
        },
        guardianLabel: member.label,
        selfLabel: "本人",
        childFrom,
        revokeResidence,
        restoreResidence,
      });
    } finally {
      restoreResidence();
    }
  }
  assert.equal((await post({ memberRef: residenceMemberRef })).status, 200);
  console.log("PASS identity member residence POST-only HTTP/Canonical scope, independent profile and residence grants, child isolation, session spoof denial, profile-preserving residence revocation and guardian revocation");
  return { post, memberRef: residenceMemberRef, restoreResidence };
}
