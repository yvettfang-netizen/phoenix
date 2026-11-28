import assert from "node:assert/strict";

/*
 * Disposable adult-to-adult profile delegation verifier.
 *
 * The fixture deliberately uses the canonical family, person, principal,
 * identity-case, episode, document, and date-projection tables.  It creates
 * only one additional adult and never grants direct table access to an app,
 * reader, or workbench role.  The profile adapter is expected to accept an
 * explicit delegation id in its four-argument profile serving functions; the
 * versioned issue call has five arguments, while legacy three-argument calls
 * remain the null-delegation path.
 */
export async function verifyAdultDelegation({ query, recipient, verifyProfile, verifyManagement }) {
  const existing = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const id = sequence => `01910000-0000-7000-8800-${String(sequence).padStart(12, "0")}`;

  const family = recipient.familyId;
  const applicant = existing(2);
  const applicantPrincipal = recipient.principalId;
  const advisor = existing(40);
  const advisorPrincipal = existing(41);
  const otherFamily = existing(180);
  const otherPerson = existing(181);
  const otherPrincipal = existing(182);

  const adult = id(1);
  const adultPrincipal = id(2);
  const membership = id(3);
  const capacity = id(4);
  const caseA = id(5);
  const caseB = id(6);
  const episodeA = id(7);
  const episodeB = id(8);
  const documentA = id(9);
  const versionA = id(10);
  const documentB = id(11);
  const versionB = id(12);
  const revisionA = id(13);
  const revisionB = id(14);
  const delegation = id(15);
  const expiredDelegation = id(16);
  const wrongDelegation = id(17);
  const emptyScopeDelegation = id(18);
  const duplicateScopeDelegation = id(19);
  const wrongCaseDelegation = id(20);
  const advisorDelegation = id(21);
  const crossFamilyDelegation = id(22);
  const foreignCapacity = id(23);
  const unverifiedCapacity = id(24);
  const foreignMembership = id(25);
  const managementDelegation = id(26);
  const wrongNoticeVersionDelegation = id(27);
  const noticeVersion = "2026-11-28.v1";
  const wrongNoticeVersion = "2026-11-28.v0";

  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date,'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const caseAExpiry = addDays(today, 45);
  const caseBExpiry = addDays(today, 90);
  const validUntil = query("SELECT (clock_timestamp()+interval '1 hour')::timestamptz::text;");

  assert.equal(query("SELECT core.current_civil_capacity(:'applicant'::uuid);", { applicant }), "ADULT_VERIFIED");

  const signatures = [
    "identity.issue_journey_profile_delegation(uuid,uuid,uuid[],timestamptz,text)",
    "identity.list_journey_profile_delegations()",
    "identity.revoke_journey_profile_delegation(uuid)",
    "identity.lock_journey_profile_access(uuid,uuid,uuid[],uuid)",
    "identity.read_journey_member_profile(uuid,uuid,uuid[],uuid)",
  ];
  for (const signature of signatures) {
    assert.equal(query("SELECT to_regprocedure(:'signature') IS NOT NULL;", { signature }), "t");
    for (const role of [
      "phoenix_canonical_app",
      "phoenix_canonical_reader",
      "phoenix_canonical_service_workbench",
    ]) {
      assert.equal(query("SELECT has_function_privilege(:'role',:'signature','EXECUTE');", { role, signature }), "f");
    }
  }

  // Seed a distinct adult member, two existing canonical identity cases, and
  // their evidence-backed date projections.  No family/person ON CONFLICT is
  // used: a duplicate fixture must fail rather than silently bind to another
  // test's principal or membership.
  query(`
    INSERT INTO core.people(person_id,display_name)
      VALUES(:'adult'::uuid,'Synthetic delegated adult');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
      VALUES(:'adultPrincipal'::uuid,:'adult'::uuid,'FAMILY','ACTIVE');
    INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
      VALUES(:'membership'::uuid,:'familyId'::uuid,:'adult'::uuid,'MEMBER',clock_timestamp()-interval '1 day'),
        (:'foreignMembership'::uuid,:'otherFamily'::uuid,:'otherPerson'::uuid,'PRIMARY',clock_timestamp()-interval '1 day');
    INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)
      VALUES(:'capacity'::uuid,:'adult'::uuid,'ADULT_VERIFIED','synthetic/adult-delegation-capacity',:'advisorPrincipal'::uuid),
        (:'foreignCapacity'::uuid,:'otherPerson'::uuid,'ADULT_VERIFIED','synthetic/foreign-adult-capacity',:'advisorPrincipal'::uuid);
    INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'caseA'::uuid,:'familyId'::uuid,:'adult'::uuid,'GEP','UNDER_REVIEW'),
        (:'caseB'::uuid,:'familyId'::uuid,:'adult'::uuid,'QMAS','UNDER_REVIEW');
    INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
      VALUES(:'episodeA'::uuid,:'caseA'::uuid,:'startA'::date,:'adultPrincipal'::uuid),
        (:'episodeB'::uuid,:'caseB'::uuid,:'startB'::date,:'adultPrincipal'::uuid);
    INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
      VALUES(:'documentA'::uuid,:'familyId'::uuid,:'adult'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_DECISION',clock_timestamp()+interval '1 day'),
        (:'documentB'::uuid,:'familyId'::uuid,:'adult'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_DECISION',clock_timestamp()+interval '1 day');
    INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
      VALUES(:'versionA'::uuid,:'documentA'::uuid,1,repeat('a',64),'synthetic/adult-delegation-a',1),
        (:'versionB'::uuid,:'documentB'::uuid,1,repeat('b',64),'synthetic/adult-delegation-b',1);
    INSERT INTO identity.journey_date_revisions(
      date_revision_id,identity_case_id,episode_id,date_kind,date_basis,target_on,
      verification,official_fact_id,document_id,verified_by,recorded_by)
      VALUES(:'revisionA'::uuid,:'caseA'::uuid,:'episodeA'::uuid,'STAY_EXPIRY','CASE_APPROVAL',:'caseAExpiry'::date,
        'VERIFIED',NULL,:'documentA'::uuid,:'advisorPrincipal'::uuid,:'adultPrincipal'::uuid),
        (:'revisionB'::uuid,:'caseB'::uuid,:'episodeB'::uuid,'STAY_EXPIRY','CASE_APPROVAL',:'caseBExpiry'::date,
        'VERIFIED',NULL,:'documentB'::uuid,:'advisorPrincipal'::uuid,:'adultPrincipal'::uuid);
  `, {
    familyId: family, adult, adultPrincipal, membership, capacity, foreignCapacity, foreignMembership, otherFamily,
    otherPerson, advisorPrincipal,
    caseA, caseB, episodeA, episodeB, documentA, documentB, versionA, versionB,
    revisionA, revisionB, startA: addDays(today, -120), startB: addDays(today, -60),
    caseAExpiry, caseBExpiry,
  });
  assert.equal(query("SELECT core.current_civil_capacity(:'adult'::uuid);", { adult }), "ADULT_VERIFIED");

  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";
  const adultContext = { principal: adultPrincipal, person: adult, channel: "FAMILY" };
  const applicantContext = { principal: applicantPrincipal, person: applicant, channel: "FAMILY" };
  const advisorContext = { principal: advisorPrincipal, person: advisor, channel: "ADVISOR" };

  function inContext(context, statement, values = {}) {
    return lastLine(query(`
      BEGIN;
      SET LOCAL statement_timeout='4s';
      SELECT auth.issue_context_ticket(:'principal'::uuid,:'person'::uuid,:'familyId'::uuid,
        :'channel',clock_timestamp()+interval '45 seconds',gen_random_uuid(),:'principal'::uuid) AS ticket \\gset
      SELECT auth.redeem_context_ticket(:'ticket'::uuid,:'principal'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { familyId: family, ...context, ...values }));
  }
  const inAdult = (statement, values = {}) => inContext(adultContext, statement, values);
  const inApplicant = (statement, values = {}) => inContext(applicantContext, statement, values);
  const inAdvisor = (statement, values = {}) => inContext(advisorContext, statement, values);

  const issue = (delegationId, delegatePrincipal, scope, expiry = validUntil, runner = inAdult,
    submittedNoticeVersion = noticeVersion) => {
    const scopeSql = scope.length === 0
      ? "ARRAY[]::uuid[]"
      : `ARRAY[${scope.map((_, index) => `:'scope${index}'::uuid`).join(",")}]`;
    const values = {
      delegationId, delegatePrincipal, expiry, noticeVersion: submittedNoticeVersion,
      ...Object.fromEntries(scope.map((value, index) => [`scope${index}`, value])),
    };
    return runner(`SELECT COALESCE(identity.issue_journey_profile_delegation(
      :'delegationId'::uuid,:'delegatePrincipal'::uuid,${scopeSql},:'expiry'::timestamptz,
      :'noticeVersion'::text)::text,'null');`, values);
  };
  const lock = (subject, guardian, scope, delegationId, runner = inApplicant) => {
    const scopeSql = `ARRAY[${scope.map((_, index) => `:'lockScope${index}'::uuid`).join(",")}]`;
    const values = {
      subject, delegationId,
      ...(guardian ? { guardian } : {}),
      ...Object.fromEntries(scope.map((value, index) => [`lockScope${index}`, value])),
    };
    const guardianSql = guardian ? ":'guardian'::uuid" : "NULL::uuid";
    const delegationSql = delegationId ? ":'delegationId'::uuid" : "NULL::uuid";
    return runner(`SELECT identity.lock_journey_profile_access(
      :'subject'::uuid,${guardianSql},${scopeSql},${delegationSql});`, values);
  };
  const read = (subject, guardian, scope, delegationId, runner = inApplicant) => {
    const scopeSql = `ARRAY[${scope.map((_, index) => `:'readScope${index}'::uuid`).join(",")}]`;
    const values = {
      subject, delegationId,
      ...(guardian ? { guardian } : {}),
      ...Object.fromEntries(scope.map((value, index) => [`readScope${index}`, value])),
    };
    const guardianSql = guardian ? ":'guardian'::uuid" : "NULL::uuid";
    const delegationSql = delegationId ? ":'delegationId'::uuid" : "NULL::uuid";
    return runner(`SELECT COALESCE(identity.read_journey_member_profile(
      :'subject'::uuid,${guardianSql},${scopeSql},${delegationSql})::text,'null');`, values);
  };
  const revoke = (delegationId, runner = inAdult) => runner(
    "SELECT identity.revoke_journey_profile_delegation(:'delegationId'::uuid);", { delegationId });
  const listOwnedDelegations = () => JSON.parse(inAdult(`
    SELECT COALESCE(jsonb_agg(to_jsonb(item) ORDER BY item.delegation_id),'[]'::jsonb)
      FROM identity.list_journey_profile_delegations() AS item;`));

  // The family member can read their own profile through the legacy
  // null-delegation path, but another adult in the same family is not visible
  // merely because both people share a family membership.
  assert.notEqual(inAdult(`SELECT COALESCE(identity.read_journey_member_profile(
    :'adult'::uuid,NULL,ARRAY[:'caseA'::uuid])::text,'null');`, { adult, caseA }), "null");
  assert.equal(lock(adult, null, [caseA], null, inApplicant), "f");
  assert.equal(read(adult, null, [caseA], null, inApplicant), "null");
  assert.equal(inApplicant(`SELECT COALESCE(identity.read_journey_member_profile(
    :'adult'::uuid,NULL,ARRAY[:'caseA'::uuid])::text,'null');`, { adult, caseA }), "null");

  // Only the adult subject may issue a delegation.  The grant must name a
  // live FAMILY principal, use a non-empty scope, and select that subject's
  // existing cases exactly.
  assert.equal(issue(wrongDelegation, adultPrincipal, [caseA], validUntil, inApplicant), "null");
  assert.equal(issue(emptyScopeDelegation, applicantPrincipal, []), "null");
  assert.equal(issue(duplicateScopeDelegation, applicantPrincipal, [caseA, caseA]), "null");
  assert.equal(issue(wrongCaseDelegation, applicantPrincipal, [recipient.caseId]), "null");
  assert.equal(issue(advisorDelegation, advisorPrincipal, [caseA]), "null");
  assert.equal(issue(crossFamilyDelegation, otherPrincipal, [caseA]), "null");
  assert.equal(issue(crossFamilyDelegation, applicantPrincipal, [caseA], "infinity"), "null");
  assert.equal(issue(wrongNoticeVersionDelegation, applicantPrincipal, [caseA], validUntil,
    inAdult, wrongNoticeVersion), "null");

  const issued = issue(delegation, applicantPrincipal, [caseA]);
  assert.equal(issued, delegation);
  assert.equal(issue(delegation, applicantPrincipal, [caseA]), delegation);
  assert.equal(issue(delegation, applicantPrincipal, [caseB]), "null");
  assert.equal(query(`SELECT notice_version FROM identity.journey_profile_delegations
    WHERE delegation_id=:'delegationId'::uuid;`, { delegationId: delegation }), noticeVersion);
  assert.equal(query(`SELECT count(*) FROM identity.journey_profile_delegations
    WHERE delegation_id=:'delegationId'::uuid;`, { delegationId: delegation }), "1");
  const initiallyListed = listOwnedDelegations();
  assert.equal(initiallyListed.filter(row => row.delegation_id === delegation).length, 1);

  const delegatedLock = (scope = [caseA], guardian = null) => lock(adult, guardian, scope, delegation, inApplicant);
  const delegatedRead = (scope = [caseA], guardian = null) => {
    const raw = read(adult, guardian, scope, delegation, inApplicant);
    return raw === "null" ? null : JSON.parse(raw);
  };
  assert.equal(delegatedLock(), "t");
  assert.equal(delegatedLock([caseB]), "f");
  assert.equal(delegatedLock([caseA, caseB]), "f");
  assert.equal(delegatedLock([caseA], applicantPrincipal), "f");
  assert.equal(read(adult, null, [caseA], null, inApplicant), "null");
  assert.equal(lock(adult, null, [caseA], delegation,
    (statement, values) => inContext({ principal: otherPrincipal, person: otherPerson, channel: "FAMILY" },
      statement, { ...values, familyId: otherFamily })), "f");
  assert.equal(inApplicant(`SAVEPOINT suspended_capacity;
    INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)
      VALUES(:'capacity'::uuid,:'adult'::uuid,'UNVERIFIED','synthetic/delegation-capacity-review',:'advisorPrincipal'::uuid);
    SELECT identity.lock_journey_profile_access(:'adult'::uuid,NULL,ARRAY[:'caseA'::uuid],:'delegation'::uuid);
    ROLLBACK TO SAVEPOINT suspended_capacity;`, { capacity: unverifiedCapacity, adult, advisorPrincipal, caseA, delegation }), "f");
  assert.equal(inApplicant(`SELECT docs.can_read_document(:'adult'::uuid,'IDENTITY_SENSITIVE');`, { adult }), "f");
  assert.equal(inApplicant(`SELECT count(*) FROM identity.list_journey_stay_timeline(
    :'familyId'::uuid,:'caseA'::uuid,:'applicantPrincipal'::uuid,10);`, { caseA, applicantPrincipal }), "0");

  const delegatedProfile = delegatedRead();
  assert.ok(delegatedProfile);
  assert.equal(delegatedProfile.episodes.length, 1);
  assert.equal(delegatedProfile.episodes[0].path, "GEP");
  assert.equal(delegatedProfile.episodes[0].milestones.some(row => row.kind === "STAY_EXPIRY" && row.on === caseAExpiry), true);
  const serializedProfile = JSON.stringify(delegatedProfile);
  for (const rawReference of [family, adult, adultPrincipal, caseA, caseB, episodeA, episodeB,
    documentA, documentB, versionA, versionB, revisionA, revisionB, delegation]) {
    assert.equal(serializedProfile.includes(rawReference), false, `profile leaked raw reference ${rawReference}`);
  }

  // The delegated adult is a reader, not the grant owner.  Revoke by the
  // delegate is denied while the subject can still read through the grant.
  assert.equal(revoke(delegation, inApplicant), "f");
  assert.equal(delegatedLock(), "t");
  assert.equal(inAdvisor(`SELECT COALESCE(identity.issue_journey_profile_delegation(
    :'delegationId'::uuid,:'applicantPrincipal'::uuid,ARRAY[:'caseA'::uuid],clock_timestamp()+interval '1 hour',
    :'noticeVersion'::text)::text,'null');`,
    { delegationId: wrongDelegation, applicantPrincipal, caseA, noticeVersion }), "null");
  assert.equal(inAdvisor(`SELECT identity.lock_journey_profile_access(
    :'adult'::uuid,NULL,ARRAY[:'caseA'::uuid],:'delegationId'::uuid);`, { adult, caseA, delegationId: delegation }), "f");
  assert.equal(inAdvisor(`SELECT COALESCE(identity.read_journey_member_profile(
    :'adult'::uuid,NULL,ARRAY[:'caseA'::uuid],:'delegationId'::uuid)::text,'null');`,
    { adult, caseA, delegationId: delegation }), "null");

  // Let the optional browser/profile verifier exercise the same bound
  // closures.  It may revoke the subject's grant; denial is asserted below
  // regardless, so a callback cannot accidentally leave authority active.
  const revokeDelegation = () => revoke(delegation, inAdult) === "t";
  if (verifyProfile) {
    await verifyProfile({
      readDelegatedProfile: delegatedRead,
      canReadDelegatedProfile: () => delegatedLock() === "t",
      revokeDelegation,
    });
  } else {
    assert.equal(revokeDelegation(), true);
  }
  assert.equal(delegatedLock(), "f");
  assert.equal(delegatedRead(), null);
  assert.equal(revokeDelegation(), true);
  assert.equal(issue(delegation, applicantPrincipal, [caseA]), "null");
  assert.equal(query(`SELECT revoked_at IS NOT NULL FROM identity.journey_profile_delegations
    WHERE delegation_id=:'delegationId'::uuid;`, { delegationId: delegation }), "t");

  // Expiry is independent from revocation.  Insert an already-expired,
  // internally coherent history row from the disposable bootstrap fixture;
  // the immutable trigger prevents deadline mutation and the serving adapter
  // must reject it without requiring a timing-dependent sleep.
  query(`INSERT INTO identity.journey_profile_delegations(
      delegation_id,family_id,subject_person_id,subject_principal_id,delegate_principal_id,
      identity_case_ids,notice_version,issued_at,valid_until)
    VALUES(:'expiredDelegation'::uuid,:'familyId'::uuid,:'adult'::uuid,:'adultPrincipal'::uuid,
      :'applicantPrincipal'::uuid,ARRAY[:'caseB'::uuid],:'noticeVersion'::text,clock_timestamp()-interval '2 hours',
      clock_timestamp()-interval '1 hour');`,
    { expiredDelegation, familyId: family, adult, adultPrincipal, applicantPrincipal, caseB, noticeVersion });
  assert.equal(lock(adult, null, [caseB], expiredDelegation, inApplicant), "f");
  assert.equal(read(adult, null, [caseB], expiredDelegation, inApplicant), "null");
  assert.equal(query(`SELECT issued_at < valid_until AND valid_until < clock_timestamp()
    FROM identity.journey_profile_delegations WHERE delegation_id=:'expiredDelegation'::uuid;`,
    { expiredDelegation }), "t");

  // The management/browser adapter receives a bounded HK civil date and
  // opaque refs, then uses these disposable SQL closures to exercise the
  // same owner/list/revoke/read boundary without exposing canonical IDs.
  if (verifyManagement) {
    const issueDelegation = ({ through, noticeVersion: submittedNoticeVersion, requestRef }) => {
      if (typeof through !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(through)
        || !requestRef || submittedNoticeVersion !== noticeVersion) return false;
      const scoped = `ARRAY[:'caseA'::uuid]`;
      const raw = inAdult(`SELECT COALESCE(identity.issue_journey_profile_delegation(
        :'delegationId'::uuid,:'delegatePrincipal'::uuid,${scoped},
        ((:'through'::date + 1)::timestamp AT TIME ZONE 'Asia/Hong_Kong'),
        :'noticeVersion'::text)::text,'null');`, {
        delegationId: managementDelegation,
        delegatePrincipal: applicantPrincipal,
        through,
        noticeVersion: submittedNoticeVersion,
      });
      return raw === managementDelegation;
    };
    const readOwnedProfile = () => {
      const raw = inAdult(`SELECT COALESCE(identity.read_journey_member_profile(
        :'adult'::uuid,NULL,ARRAY[:'caseA'::uuid])::text,'null');`, { adult, caseA });
      return raw === "null" ? null : JSON.parse(raw);
    };
    const listDelegations = () => listOwnedDelegations();
    const readManagementProfile = () => {
      const raw = read(adult, null, [caseA], managementDelegation, inApplicant);
      return raw === "null" ? null : JSON.parse(raw);
    };
    const canReadManagementProfile = () =>
      lock(adult, null, [caseA], managementDelegation, inApplicant) === "t";
    const revokeManagementDelegation = () =>
      revoke(managementDelegation, inAdult) === "t";
    await verifyManagement({
      issueDelegation,
      listDelegations,
      revokeDelegation: revokeManagementDelegation,
      readDelegatedProfile: readManagementProfile,
      canReadDelegatedProfile: canReadManagementProfile,
      readOwnedProfile,
      expectedDate: caseAExpiry,
      today,
    });
    assert.equal(canReadManagementProfile(), false);
    assert.equal(readManagementProfile(), null);
    assert.equal(query(`SELECT revoked_at IS NOT NULL AND notice_version=:'noticeVersion'::text
      FROM identity.journey_profile_delegations
      WHERE delegation_id=:'delegationId'::uuid;`, {
      delegationId: managementDelegation,
      noticeVersion,
    }), "t");
  }

  console.log("PASS adult self-issued exact-principal delegation, family isolation, case scope, human-safe profile projection, expiry, revoke, and API privilege closure");
}
