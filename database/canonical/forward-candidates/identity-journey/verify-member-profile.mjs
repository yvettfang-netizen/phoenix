import assert from "node:assert/strict";
import { handleIdentityProfile } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile.ts";
import { identityProfilePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile-contract.ts";
import { verifyIdentityMemberResidence } from "./verify-member-residence.mjs";

/*
 * This verifier is intentionally a disposable-database adapter test.  The
 * browser sees only opaque member references and the small profile projection;
 * all fixture UUIDs remain inside the trusted resolver and PostgreSQL checks.
 */
export async function verifyIdentityMemberProfile({ query, recipient, authConfig, browser, memberResidenceBrowser }) {
  const id = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const actor = id(2);
  const verifierPrincipal = id(41);

  const child = id(600);
  const childCaseOne = id(601);
  const childCaseTwo = id(602);
  const childEpisodeOne = id(603);
  const childEpisodeTwo = id(604);
  const childCapacity = id(605);
  const childAuthority = id(606);
  const childDocument = id(607);

  const adultTransition = id(610);
  const adultTransitionCase = id(611);
  const adultTransitionEpisode = id(612);
  const adultTransitionMinorCapacity = id(613);
  const adultTransitionAdultCapacity = id(614);
  const adultTransitionAuthority = id(615);

  const sameFamilyAdult = id(620);
  const sameFamilyAdultCase = id(621);
  const sameFamilyAdultEpisode = id(622);
  const sameFamilyAdultCapacity = id(623);
  const sameFamilyAdultAuthority = id(626);

  const otherFamily = id(630);
  const otherPerson = id(631);
  const otherCase = id(632);
  const otherEpisode = id(633);
  const otherCapacity = id(634);
  const otherFamilyAuthority = id(637);

  const generalAuthority = id(640);

  // References are deliberately not derivable from Canonical UUIDs and meet
  // the public contract's minimum length without exposing any person ID.
  const selfRef = "member_self_000000000000000000000000";
  const childRef = "member_child_000000000000000000000000";
  const adultTransitionRef = "member_adult_0000000000000000000000";
  const sameFamilyAdultRef = "member_sameadult_00000000000000000000";
  const otherFamilyRef = "member_other_0000000000000000000000";
  const generalScopeRef = "member_general_00000000000000000000";

  for (const signature of [
    "identity.lock_journey_profile_access(uuid,uuid,uuid[])",
    "identity.read_journey_member_profile(uuid,uuid,uuid[])",
  ]) {
    assert.equal(query(`SELECT has_function_privilege('phoenix_canonical_app', :'signature', 'EXECUTE')
      OR has_function_privilege('phoenix_canonical_reader', :'signature', 'EXECUTE')
      OR has_function_privilege('phoenix_canonical_service_workbench', :'signature', 'EXECUTE');`, { signature }), "f");
  }

  // The fixture is inserted with bootstrap privileges only.  The actual
  // candidate functions below are always exercised through a FAMILY ticket.
  query(`
    INSERT INTO core.people(person_id,display_name) VALUES
      (:'child'::uuid,'Synthetic verified minor'),
      (:'adultTransition'::uuid,'Synthetic minor becoming adult'),
      (:'sameFamilyAdult'::uuid,'Synthetic same-family adult'),
      (:'otherPerson'::uuid,'Synthetic unrelated household member');
    INSERT INTO core.families(family_id,display_name)
      VALUES(:'otherFamily'::uuid,'Synthetic unrelated profile household');
    INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
      VALUES
      (:'childMembership'::uuid,:'familyId'::uuid,:'child'::uuid,'MEMBER',clock_timestamp()-interval '1 day'),
      (:'adultMembership'::uuid,:'familyId'::uuid,:'adultTransition'::uuid,'MEMBER',clock_timestamp()-interval '1 day'),
      (:'sameAdultMembership'::uuid,:'familyId'::uuid,:'sameFamilyAdult'::uuid,'MEMBER',clock_timestamp()-interval '1 day'),
      (:'otherMembership'::uuid,:'otherFamily'::uuid,:'otherPerson'::uuid,'PRIMARY',clock_timestamp()-interval '1 day');
    INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES
      (:'childCaseOne'::uuid,:'familyId'::uuid,:'child'::uuid,'STUDENT','UNDER_REVIEW'),
      (:'childCaseTwo'::uuid,:'familyId'::uuid,:'child'::uuid,'DEPENDANT','UNDER_REVIEW'),
      (:'adultTransitionCase'::uuid,:'familyId'::uuid,:'adultTransition'::uuid,'QMAS','UNDER_REVIEW'),
      (:'sameFamilyAdultCase'::uuid,:'familyId'::uuid,:'sameFamilyAdult'::uuid,'GEP','UNDER_REVIEW'),
      (:'otherCase'::uuid,:'otherFamily'::uuid,:'otherPerson'::uuid,'STUDENT','UNDER_REVIEW');
    INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,ended_before,recorded_by)
      VALUES
      (:'childEpisodeOne'::uuid,:'childCaseOne'::uuid,DATE '2023-01-10',DATE '2024-01-01',:'principalId'::uuid),
      (:'childEpisodeTwo'::uuid,:'childCaseTwo'::uuid,DATE '2025-02-01',NULL,:'principalId'::uuid),
      (:'adultTransitionEpisode'::uuid,:'adultTransitionCase'::uuid,DATE '2025-04-01',NULL,:'principalId'::uuid),
      (:'sameFamilyAdultEpisode'::uuid,:'sameFamilyAdultCase'::uuid,DATE '2024-04-01',NULL,:'principalId'::uuid),
      (:'otherEpisode'::uuid,:'otherCase'::uuid,DATE '2025-05-01',NULL,:'principalId'::uuid);
    INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)
      VALUES
      (:'childCapacity'::uuid,:'child'::uuid,'MINOR_VERIFIED','synthetic/profile-minor',:'principalId'::uuid),
      (:'adultTransitionMinorCapacity'::uuid,:'adultTransition'::uuid,'MINOR_VERIFIED','synthetic/profile-minor-transition',:'principalId'::uuid),
      (:'sameFamilyAdultCapacity'::uuid,:'sameFamilyAdult'::uuid,'ADULT_VERIFIED','synthetic/profile-adult',:'principalId'::uuid),
      (:'otherCapacity'::uuid,:'otherPerson'::uuid,'MINOR_VERIFIED','synthetic/profile-other-family',:'principalId'::uuid);
    INSERT INTO core.guardian_authorities(
      authority_id,family_id,guardian_person_id,subject_person_id,evidence_level,scope,
      valid_from,valid_until,evidence_ref,verified_by_principal_id,lifecycle_status)
      VALUES
      (:'childAuthority'::uuid,:'familyId'::uuid,:'actor'::uuid,:'child'::uuid,'VERIFIED','IDENTITY',
        clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days','synthetic/profile-identity-proof',:'verifierPrincipal'::uuid,'ACTIVE'),
      (:'adultTransitionAuthority'::uuid,:'familyId'::uuid,:'actor'::uuid,:'adultTransition'::uuid,'VERIFIED','IDENTITY',
        clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days','synthetic/profile-identity-proof-transition',:'verifierPrincipal'::uuid,'ACTIVE'),
      (:'sameFamilyAdultAuthority'::uuid,:'familyId'::uuid,:'actor'::uuid,:'sameFamilyAdult'::uuid,'VERIFIED','IDENTITY',
        clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days','synthetic/profile-identity-proof-adult',:'verifierPrincipal'::uuid,'ACTIVE'),
      (:'generalAuthority'::uuid,:'familyId'::uuid,:'actor'::uuid,:'child'::uuid,'VERIFIED','GENERAL',
        clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days','synthetic/profile-general-proof',:'verifierPrincipal'::uuid,'ACTIVE'),
      (:'otherFamilyAuthority'::uuid,:'otherFamily'::uuid,:'actor'::uuid,:'otherPerson'::uuid,'VERIFIED','IDENTITY',
        clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days','synthetic/profile-identity-proof-other',:'verifierPrincipal'::uuid,'ACTIVE');
    CREATE TABLE identity_journey_test.member_profile_authority (
      member_ref text PRIMARY KEY CHECK (member_ref ~ '^member_[A-Za-z0-9_-]{24,96}$'),
      customer_id text NOT NULL,
      session_hash text NOT NULL,
      family_id uuid NOT NULL REFERENCES core.families,
      subject_person_id uuid NOT NULL REFERENCES core.people,
      guardian_authority_id uuid REFERENCES core.guardian_authorities,
      recipient_principal_id uuid NOT NULL REFERENCES auth.principals,
      access text NOT NULL CHECK (access IN ('SELF','GUARDIAN')),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      CHECK ((access = 'SELF') = (guardian_authority_id IS NULL))
    );
    INSERT INTO identity_journey_test.member_profile_authority(
      member_ref,customer_id,session_hash,family_id,subject_person_id,guardian_authority_id,
      recipient_principal_id,access,expires_at)
      VALUES
      (:'selfRef','ci-only-account','ci-only-session',:'familyId'::uuid,:'actor'::uuid,NULL,:'principalId'::uuid,'SELF',clock_timestamp()+interval '1 day'),
      (:'childRef','ci-only-account','ci-only-session',:'familyId'::uuid,:'child'::uuid,:'childAuthority'::uuid,:'principalId'::uuid,'GUARDIAN',clock_timestamp()+interval '1 day'),
      (:'adultTransitionRef','ci-only-account','ci-only-session',:'familyId'::uuid,:'adultTransition'::uuid,:'adultTransitionAuthority'::uuid,:'principalId'::uuid,'GUARDIAN',clock_timestamp()+interval '1 day'),
      (:'sameFamilyAdultRef','ci-only-account','ci-only-session',:'familyId'::uuid,:'sameFamilyAdult'::uuid,:'sameFamilyAdultAuthority'::uuid,:'principalId'::uuid,'GUARDIAN',clock_timestamp()+interval '1 day'),
      (:'otherFamilyRef','ci-only-account','ci-only-session',:'otherFamily'::uuid,:'otherPerson'::uuid,:'otherFamilyAuthority'::uuid,:'principalId'::uuid,'GUARDIAN',clock_timestamp()+interval '1 day'),
      (:'generalScopeRef','ci-only-account','ci-only-session',:'familyId'::uuid,:'child'::uuid,:'generalAuthority'::uuid,:'principalId'::uuid,'GUARDIAN',clock_timestamp()+interval '1 day');
    INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
      VALUES(:'childDocument'::uuid,:'familyId'::uuid,:'child'::uuid,'IDENTITY_SENSITIVE',
        'SYNTHETIC_PROFILE_EVIDENCE',clock_timestamp()+interval '30 days');
    INSERT INTO identity.journey_date_revisions(
      date_revision_id,identity_case_id,episode_id,date_kind,date_basis,target_on,verification,
      document_id,verified_by,recorded_by)
      VALUES
      (:'childDateOne'::uuid,:'childCaseOne'::uuid,:'childEpisodeOne'::uuid,'FIRST_ENTRY_ACTUAL','CASE_APPROVAL',
        DATE '2023-01-12','REPORTED',NULL,NULL,:'principalId'::uuid),
      (:'childDateTwo'::uuid,:'childCaseTwo'::uuid,:'childEpisodeTwo'::uuid,'STAY_EXPIRY','CASE_APPROVAL',
        DATE '2026-02-01','VERIFIED',:'childDocument'::uuid,:'verifierPrincipal'::uuid,:'principalId'::uuid),
      (:'childDateThree'::uuid,:'childCaseTwo'::uuid,:'childEpisodeTwo'::uuid,'PASSPORT_EXPIRY','INTERNAL',
        DATE '2028-08-08','REPORTED',NULL,NULL,:'principalId'::uuid),
      (:'childDateApproval'::uuid,:'childCaseTwo'::uuid,:'childEpisodeTwo'::uuid,'APPROVAL_DATE','CASE_APPROVAL',
        DATE '2025-01-15','REPORTED',NULL,NULL,:'principalId'::uuid),
      (:'selfDateRevision'::uuid,:'caseId'::uuid,:'selfEpisode'::uuid,'PASSPORT_EXPIRY','INTERNAL',
        (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date + 365,'REPORTED',NULL,NULL,:'principalId'::uuid),
      (:'adultTransitionDate'::uuid,:'adultTransitionCase'::uuid,:'adultTransitionEpisode'::uuid,'STATUS_TRANSITION','CASE_APPROVAL',
        DATE '2027-01-01','REPORTED',NULL,NULL,:'principalId'::uuid),
      (:'sameAdultDate'::uuid,:'sameFamilyAdultCase'::uuid,:'sameFamilyAdultEpisode'::uuid,'STAY_EXPIRY','CASE_APPROVAL',
        DATE '2027-03-01','REPORTED',NULL,NULL,:'principalId'::uuid),
      (:'otherDate'::uuid,:'otherCase'::uuid,:'otherEpisode'::uuid,'STAY_EXPIRY','CASE_APPROVAL',
        DATE '2027-04-01','REPORTED',NULL,NULL,:'principalId'::uuid);`, {
    ...recipient,
    actor,
    verifierPrincipal,
    child,
    childCaseOne,
    childCaseTwo,
    childEpisodeOne,
    childEpisodeTwo,
    childCapacity,
    childAuthority,
    childDocument,
    adultTransition,
    adultTransitionCase,
    adultTransitionEpisode,
    adultTransitionMinorCapacity,
    adultTransitionAuthority,
    sameFamilyAdult,
    sameFamilyAdultCase,
    sameFamilyAdultEpisode,
    sameFamilyAdultCapacity,
    sameFamilyAdultAuthority,
    otherFamily,
    otherPerson,
    otherCase,
    otherEpisode,
    otherCapacity,
    otherFamilyAuthority,
    generalAuthority,
    childMembership: id(608),
    adultMembership: id(616),
    sameAdultMembership: id(624),
    otherMembership: id(635),
    childDateOne: id(609),
    childDateTwo: id(650),
    childDateThree: id(651),
    childDateApproval: id(653),
    selfDateRevision: id(652),
    selfEpisode: id(6),
    selfRef,
    childRef,
    adultTransitionRef,
    sameFamilyAdultRef,
    otherFamilyRef,
    generalScopeRef,
    adultTransitionDate: id(617),
    sameAdultDate: id(625),
    otherDate: id(636),
  });

  const origin = authConfig.origin;
  const familyContext = { principal: recipient.principalId, person: actor, channel: "FAMILY" };
  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";
  function inContext(statement, values = {}) {
    return lastLine(query(`BEGIN;
      SET LOCAL statement_timeout = '4s';
      SELECT auth.issue_context_ticket(:'principal'::uuid, :'person'::uuid,
        :'familyId'::uuid, :'channel', clock_timestamp()+interval '45 seconds',
        gen_random_uuid(), :'principal'::uuid) AS ticket \\gset
      SELECT auth.redeem_context_ticket(:'ticket'::uuid, :'principal'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { ...recipient, actor, ...familyContext, ...values }));
  }
  const members = [
    { ref: selfRef, label: "本人", access: "SELF", subject: actor, guardian: null, cases: [recipient.caseId] },
    { ref: childRef, label: "家庭成员（已核验）", access: "GUARDIAN", subject: child, guardian: childAuthority, cases: [childCaseOne, childCaseTwo] },
    { ref: adultTransitionRef, label: "成年转换测试成员", access: "GUARDIAN", subject: adultTransition, guardian: adultTransitionAuthority, cases: [adultTransitionCase] },
    { ref: sameFamilyAdultRef, label: "同家庭成人（应拒绝）", access: "GUARDIAN", subject: sameFamilyAdult, guardian: sameFamilyAdultAuthority, cases: [sameFamilyAdultCase] },
    { ref: otherFamilyRef, label: "其他家庭成员（应拒绝）", access: "GUARDIAN", subject: otherPerson, guardian: otherFamilyAuthority, cases: [otherCase] },
    { ref: generalScopeRef, label: "一般授权（应拒绝）", access: "GUARDIAN", subject: child, guardian: generalAuthority, cases: [childCaseOne] },
  ];
  const memberFor = ref => members.find(member => member.ref === ref) ?? null;
  const profileValues = (member, session) => ({
    customerId: session.customerId,
    sessionHash: session.sessionHash,
    memberRef: member.ref,
    subject: member.subject,
    guardian: member.guardian ?? "",
    access: member.access,
    caseOne: member.cases[0],
    caseTwo: member.cases[1] ?? member.cases[0],
  });
  const profileLock = (member, session) => inContext(`
    WITH profile_grant AS MATERIALIZED (
      SELECT 1 FROM identity_journey_test.member_profile_authority
      WHERE member_ref = :'memberRef'
        AND customer_id = :'customerId'
        AND session_hash = :'sessionHash'
        AND family_id = :'familyId'::uuid
        AND subject_person_id = :'subject'::uuid
        AND guardian_authority_id IS NOT DISTINCT FROM NULLIF(:'guardian','')::uuid
        AND recipient_principal_id = :'principal'::uuid
        AND access = :'access'
        AND revoked_at IS NULL AND expires_at > clock_timestamp()
      FOR SHARE
    )
    SELECT CASE WHEN EXISTS (SELECT 1 FROM profile_grant)
      THEN identity.lock_journey_profile_access(:'subject'::uuid,
        NULLIF(:'guardian','')::uuid, ARRAY[:'caseOne'::uuid, :'caseTwo'::uuid])
      ELSE false END;`, profileValues(member, session));
  const profileRead = (member, session) => inContext(`
    WITH profile_grant AS MATERIALIZED (
      SELECT 1 FROM identity_journey_test.member_profile_authority
      WHERE member_ref = :'memberRef'
        AND customer_id = :'customerId'
        AND session_hash = :'sessionHash'
        AND family_id = :'familyId'::uuid
        AND subject_person_id = :'subject'::uuid
        AND guardian_authority_id IS NOT DISTINCT FROM NULLIF(:'guardian','')::uuid
        AND recipient_principal_id = :'principal'::uuid
        AND access = :'access'
        AND revoked_at IS NULL AND expires_at > clock_timestamp()
      FOR SHARE
    )
    SELECT COALESCE((SELECT identity.read_journey_member_profile(:'subject'::uuid,
      NULLIF(:'guardian','')::uuid, ARRAY[:'caseOne'::uuid, :'caseTwo'::uuid])
      FROM profile_grant), 'null'::jsonb);`, profileValues(member, session));

  const provider = {
    async resolveRoster(session) {
      if (session.customerId !== "ci-only-account") return null;
      let preparedRefs = null;
      const currentRefs = () => members.filter(member => profileLock(member, session) === "t")
        .map(member => member.ref);
      return {
        async assertCurrent() {
          const current = currentRefs();
          if (preparedRefs === null) {
            preparedRefs = current;
            return current.length > 0;
          }
          return current.length === preparedRefs.length && current.every(ref => preparedRefs.includes(ref));
        },
        async listAuthorized() {
          // Keep the first authorization snapshot.  The handler's final
          // assertCurrent() must reject if any prepared member was revoked
          // while the projection was being assembled.
          const current = new Set(currentRefs());
          return members.filter(member => current.has(member.ref) &&
            (preparedRefs === null || preparedRefs.includes(member.ref)))
            .map(({ ref, label, access }) => ({ ref, label, access }));
        },
      };
    },
    async resolveMember(session, memberRef) {
      if (session.customerId !== "ci-only-account") return null;
      const selected = memberFor(memberRef);
      return {
        async assertCurrent() {
          return selected ? profileLock(selected, session) === "t" : false;
        },
        async readAuthorized() {
          if (!selected) return null;
          const value = profileRead(selected, session);
          return value === "" || value === "null" ? null : JSON.parse(value);
        },
      };
    },
  };
  const env = {
    FAMILY_IDENTITY_PROFILE_ENABLED: "true",
    FAMILY_IDENTITY_PROFILE_PROVIDER: provider,
  };
  const get = (headers = {}, selectedEnv = env, selectedConfig = authConfig) =>
    handleIdentityProfile(new Request(origin + identityProfilePath, { headers }), selectedEnv, selectedConfig);
  const post = (body, headers = {}, selectedEnv = env, selectedConfig = authConfig) =>
    handleIdentityProfile(new Request(origin + identityProfilePath, {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }), selectedEnv, selectedConfig);

  // Feature gate, session boundary, same-origin and anti-spoofing checks.
  assert.equal((await get({}, { ...env, FAMILY_IDENTITY_PROFILE_ENABLED: "false" })).status, 404);
  assert.equal((await get({}, env, { ...authConfig, verifySession: async () => null })).status, 401);
  assert.equal((await get({ origin: "https://cross-origin.invalid" })).status, 403);
  assert.equal((await get({ "x-family-id": recipient.familyId })).status, 403);

  const rosterResponse = await get();
  assert.equal(rosterResponse.status, 200);
  assert.equal(rosterResponse.headers.get("cache-control"), "private, no-store");
  const roster = await rosterResponse.json();
  assert.deepEqual(Object.keys(roster), ["members"]);
  assert.ok(roster.members.some(member => member.ref === selfRef && member.access === "SELF"));
  assert.ok(roster.members.some(member => member.ref === childRef && member.access === "GUARDIAN"));
  assert.ok(roster.members.some(member => member.ref === adultTransitionRef));
  assert.equal(roster.members.some(member => member.ref === sameFamilyAdultRef), false);
  assert.equal(roster.members.some(member => member.ref === otherFamilyRef), false);
  assert.equal(roster.members.some(member => member.ref === generalScopeRef), false);
  const rosterSerialized = JSON.stringify(roster);
  for (const internalId of [child, childAuthority, childCaseOne, otherPerson, otherFamily, generalAuthority]) {
    assert.equal(rosterSerialized.includes(internalId), false);
  }

  // The current member's two separate cases remain separate profile episodes;
  // one verified date is readable only while its same-family document remains live.
  const childResponse = await post({ memberRef: childRef });
  assert.equal(childResponse.status, 200);
  assert.equal(childResponse.headers.get("cache-control"), "private, no-store");
  const childProfile = await childResponse.json();
  assert.equal(childProfile.episodes.length, 2);
  assert.deepEqual(new Set(childProfile.episodes.map(episode => episode.path)), new Set(["STUDENT", "DEPENDANT"]));
  assert.ok(childProfile.episodes.some(episode => episode.milestones.some(milestone =>
    milestone.kind === "STAY_EXPIRY" && milestone.verification === "VERIFIED")));
  const childMilestones = childProfile.episodes.flatMap(episode => episode.milestones);
  assert.ok(childMilestones.some(milestone => milestone.kind === "APPROVAL_DATE" && milestone.on === "2025-01-15"));
  assert.ok(childMilestones.some(milestone => milestone.kind === "STAY_EXPIRY" && milestone.on === "2026-02-01"));
  assert.equal(JSON.stringify(childProfile).includes(childDocument), false);
  for (const internalId of [child, childAuthority, childCaseOne, childCaseTwo, childDocument]) {
    assert.equal(JSON.stringify(childProfile).includes(internalId), false);
  }
  query("UPDATE docs.documents SET withdrawn_at = clock_timestamp() WHERE document_id = :'document'::uuid;",
    { document: childDocument });
  const withdrawnChildResponse = await post({ memberRef: childRef });
  assert.equal(withdrawnChildResponse.status, 200);
  const withdrawnChild = await withdrawnChildResponse.json();
  assert.equal(withdrawnChild.episodes.some(episode => episode.milestones.some(milestone =>
    milestone.kind === "STAY_EXPIRY" && milestone.verification === "VERIFIED")), false);
  assert.equal((await post({ memberRef: "member_too_short" })).status, 400);
  assert.equal((await post({ memberRef: "member_unknown_0000000000000000000000" })).status, 403);
  assert.equal((await post({ memberRef: childRef, extra: true })).status, 400);
  const wrongSessionConfig = {
    ...authConfig,
    verifySession: async () => ({
      ...(await authConfig.verifySession()),
      token_hash: "wrong-session-bound-to-no-profile-grant",
    }),
  };
  assert.equal((await post({ memberRef: childRef }, {}, env, wrongSessionConfig)).status, 403);

  // A profile-read grant is an independent, purpose-specific authorization.
  // Revoking it must hide the member even while the Canonical guardian row is
  // still active; restoring the synthetic grant then permits the read again.
  query(`UPDATE identity_journey_test.member_profile_authority
    SET revoked_at = clock_timestamp() WHERE member_ref = :'memberRef';`, { memberRef: childRef });
  assert.equal(query(`SELECT count(*) FROM core.guardian_authorities
    WHERE authority_id = :'authority'::uuid AND revoked_at IS NULL AND lifecycle_status = 'ACTIVE';`,
  { authority: childAuthority }), "1");
  const afterProfileGrantRevoke = await get();
  assert.equal((await afterProfileGrantRevoke.json()).members.some(member => member.ref === childRef), false);
  assert.equal((await post({ memberRef: childRef })).status, 403);
  query(`UPDATE identity_journey_test.member_profile_authority
    SET revoked_at = NULL WHERE member_ref = :'memberRef';`, { memberRef: childRef });
  assert.equal((await post({ memberRef: childRef })).status, 200);

  // Same-family adults cannot be reached through a guardian profile grant;
  // another family and a GENERAL authority cannot widen an IDENTITY grant.
  assert.equal((await post({ memberRef: sameFamilyAdultRef })).status, 403);
  assert.equal((await post({ memberRef: otherFamilyRef })).status, 403);
  assert.equal((await post({ memberRef: generalScopeRef })).status, 403);

  // A currently minor member is initially visible.  Appending a later verified
  // ADULT capacity record makes the same guardian grant fail closed; the old
  // capacity fact is not rewritten and the authority is not silently reused.
  assert.equal((await post({ memberRef: adultTransitionRef })).status, 200);
  query(`INSERT INTO core.civil_capacity_history(
      capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)
    VALUES(:'adultTransitionAdultCapacity'::uuid,:'adultTransition'::uuid,'ADULT_VERIFIED',
      'synthetic/profile-adult-transition',:'principalId'::uuid);`,
  { ...recipient, adultTransitionAdultCapacity, adultTransition });
  const afterAdultTransition = await get();
  assert.equal((await afterAdultTransition.json()).members.some(member => member.ref === adultTransitionRef), false);
  assert.equal((await post({ memberRef: adultTransitionRef })).status, 403);

  const revokeGuardian = () => query(`UPDATE core.guardian_authorities
    SET revoked_at = clock_timestamp(), revoked_by_principal_id = :'principalId'::uuid,
      lifecycle_status = 'REVOKED'
    WHERE authority_id = :'authority'::uuid AND revoked_at IS NULL;`,
  { ...recipient, authority: childAuthority });
  const memberResidence = await verifyIdentityMemberResidence({
    query,
    recipient,
    authConfig,
    member: memberFor(childRef),
    profileLock,
    profilePost: post,
    profileEnv: env,
    browser: memberResidenceBrowser,
  });
  if (browser) {
    await browser({
      apiPath: identityProfilePath,
      handle(request, browserOrigin, hasSession) {
        return handleIdentityProfile(request, env, {
          ...authConfig,
          origin: browserOrigin,
          verifySession: async () => hasSession ? authConfig.verifySession() : null,
        });
      },
      revokeGuardian,
      guardianLabel: "家庭成员（已核验）",
      selfLabel: "本人",
      memberRef: childRef,
      childDate: "2028-08-08",
      selfDate: query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date + 365, 'YYYY-MM-DD');"),
    });
  }
  revokeGuardian();
  const afterRevoke = await get();
  assert.equal((await afterRevoke.json()).members.some(member => member.ref === childRef), false);
  assert.equal((await post({ memberRef: childRef })).status, 403);
  assert.equal((await memberResidence.post({ memberRef: childRef })).status, 403);
  assert.equal((await get({}, env, { ...authConfig, verifySession: async () => null })).status, 401);
  console.log("PASS identity member profile HTTP/Canonical scope, opaque roster, verified minor guardian access, case separation, document minimization, adult transition, cross-family/general denial and revocation");
}
