import assert from "node:assert/strict";

/*
 * Disposable sponsor/dependant verifier. The candidate relationship is an
 * identity-domain fact, not a family membership or a new person registry.
 * This fixture deliberately gives both adults separate principals and cases.
 */
export async function verifySponsorship({ query, recipient, verifyProfile }) {
  const existing = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const id = sequence => `01910000-0000-7000-8700-${String(sequence).padStart(12, "0")}`;
  const dependant = existing(2);
  const dependantPrincipal = recipient.principalId;
  const advisor = existing(40);
  const advisorPrincipal = existing(41);
  const family = recipient.familyId;
  const sponsor = id(8700);
  const sponsorPrincipal = id(8701);
  const sponsorMembership = id(8702);
  const sponsorCase = id(8703);
  const sponsorEpisode = id(8704);
  const dependantCase = id(8705);
  const dependantEpisode = id(8706);
  const sponsorCasework = id(8707);
  const dependantCasework = id(8708);
  const sponsorAssignment = id(8709);
  const dependantAssignment = id(8710);
  const sponsorIdentityConsent = id(8711);
  const sponsorExpiryDocument = id(8713);
  const sponsorExpiryVersion = id(8714);
  const sponsorCapacity = id(8715);
  const dependantDocument = id(8716);
  const dependantVersion = id(8717);
  const endDocument = id(8718);
  const endVersion = id(8719);
  const firstChange = id(8720);
  const secondChange = id(8721);
  const endChange = id(8722);
  const dependantExpiryDocument = id(8726);
  const dependantExpiryVersion = id(8727);
  const dependantExpiryRevision = id(8728);
  const missingSponsorGrantChange = id(8729);
  const deniedChange = id(8723);
  const foreignDocument = id(8724);
  const foreignVersion = id(8725);
  const otherFamily = existing(180);
  const otherPerson = existing(181);
  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date,'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const dependantStart = addDays(today, -60);
  const recordedOn = addDays(today, -1);
  const sponsorStart = addDays(today, -120);
  const dependantExpiry = addDays(today, 45);
  const sponsorExpiry = addDays(today, 120);
  const endOn = today;
  const advisorContext = { principal: advisorPrincipal, person: advisor, channel: "ADVISOR" };
  const dependantContext = { principal: dependantPrincipal, person: dependant, channel: "FAMILY" };
  const sponsorContext = { principal: sponsorPrincipal, person: sponsor, channel: "FAMILY" };
  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";
  assert.equal(query(`SELECT count(*) FROM consent.grants
    WHERE family_id=:'familyId'::uuid AND grantor_person_id=:'dependant'::uuid
      AND grantee_person_id=:'advisorPerson'::uuid AND subject_person_id=:'dependant'::uuid
      AND purpose IN ('IDENTITY_CASE','DOCUMENT_READ') AND data_class='IDENTITY_SENSITIVE'
      AND status='ACTIVE' AND withdrawn_at IS NULL AND expires_at>clock_timestamp();`,
    { familyId: family, dependant, advisorPerson: advisor }), "2");
  function inContext(context, statement, values = {}) {
    return lastLine(query(`BEGIN;
      SET LOCAL statement_timeout='4s';
      SELECT auth.issue_context_ticket(:'principal'::uuid,:'person'::uuid,:'familyId'::uuid,
        :'channel',clock_timestamp()+interval '45 seconds',gen_random_uuid(),:'principal'::uuid) AS ticket \\gset
      SELECT auth.redeem_context_ticket(:'ticket'::uuid,:'principal'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { ...recipient, familyId: family, ...context, ...values }));
  }
  const inAdvisor = (statement, values = {}) => inContext(advisorContext, statement, values);
  const inDependant = (statement, values = {}) => inContext(dependantContext, statement, values);
  const inSponsor = (statement, values = {}) => inContext(sponsorContext, statement, values);
  const signature = "identity.record_journey_sponsorship(uuid,uuid,uuid,uuid,date,uuid,uuid)";
  assert.equal(query(`SELECT to_regprocedure(:'signature') IS NOT NULL
    AND to_regclass('identity.journey_sponsorship_facts') IS NOT NULL;`, { signature }), "t");
  for (const role of ["phoenix_canonical_app", "phoenix_canonical_reader", "phoenix_canonical_service_workbench"]) {
    assert.equal(query("SELECT has_function_privilege(:'role',:'signature','EXECUTE');", { role, signature }), "f");
  }

  query(`INSERT INTO core.people(person_id,display_name)
      VALUES(:'sponsor'::uuid,'Synthetic verified sponsor')
      ON CONFLICT (person_id) DO NOTHING;
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
      VALUES(:'sponsorPrincipal'::uuid,:'sponsor'::uuid,'FAMILY','ACTIVE')
      ON CONFLICT (principal_id) DO NOTHING;
    INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
      VALUES(:'sponsorMembership'::uuid,:'familyId'::uuid,:'sponsor'::uuid,'MEMBER',clock_timestamp()-interval '1 day')
      ON CONFLICT (family_id,person_id) DO NOTHING;
    INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)
      VALUES(:'sponsorCapacity'::uuid,:'sponsor'::uuid,'ADULT_VERIFIED','synthetic/sponsorship-capacity',:'advisorPrincipal'::uuid);
    INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'sponsorCase'::uuid,:'familyId'::uuid,:'sponsor'::uuid,'GEP','UNDER_REVIEW'),
        (:'dependantCase'::uuid,:'familyId'::uuid,:'dependant'::uuid,'DEPENDANT','UNDER_REVIEW');
    INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
      VALUES(:'sponsorEpisode'::uuid,:'sponsorCase'::uuid,:'sponsorStart'::date,:'principalId'::uuid),
        (:'dependantEpisode'::uuid,:'dependantCase'::uuid,:'dependantStart'::date,:'principalId'::uuid);
    INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
      VALUES(:'sponsorCasework'::uuid,:'familyId'::uuid,:'sponsor'::uuid,'Synthetic sponsor identity','OPEN','IDENTITY_CASE',:'sponsorCase'::uuid),
        (:'dependantCasework'::uuid,:'familyId'::uuid,:'dependant'::uuid,'Synthetic dependant identity','OPEN','IDENTITY_CASE',:'dependantCase'::uuid);
    INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
      VALUES(:'sponsorAssignment'::uuid,:'sponsorCasework'::uuid,:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour'),
        (:'dependantAssignment'::uuid,:'dependantCasework'::uuid,:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');
    `,
  { familyId: family, sponsor, sponsorPrincipal, sponsorMembership, sponsorCapacity, sponsorCase, dependantCase,
    sponsorEpisode, dependantEpisode, sponsorCasework, dependantCasework, sponsorAssignment,
    dependantAssignment, sponsorStart, dependantStart,
    advisorPerson: advisor, advisorPrincipal, principalId: dependantPrincipal, dependant });

  query(`INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
      VALUES(:'sponsorExpiryDocument'::uuid,:'familyId'::uuid,:'sponsor'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_DECISION',clock_timestamp()+interval '1 day'),
        (:'dependantDocument'::uuid,:'familyId'::uuid,:'dependant'::uuid,'IDENTITY_SENSITIVE','HK_DEPENDANT_SPONSORSHIP_RECORD',clock_timestamp()+interval '1 day'),
        (:'endDocument'::uuid,:'familyId'::uuid,:'dependant'::uuid,'IDENTITY_SENSITIVE','HK_DEPENDANT_SPONSORSHIP_RECORD',clock_timestamp()+interval '1 day'),
        (:'dependantExpiryDocument'::uuid,:'familyId'::uuid,:'dependant'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_DECISION',clock_timestamp()+interval '1 day'),
        (:'foreignDocument'::uuid,:'otherFamily'::uuid,:'otherPerson'::uuid,'IDENTITY_SENSITIVE','HK_DEPENDANT_SPONSORSHIP_RECORD',clock_timestamp()+interval '1 day');
    INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
      VALUES(:'sponsorExpiryVersion'::uuid,:'sponsorExpiryDocument'::uuid,1,repeat('1',64),'synthetic/sponsor-expiry',1),
        (:'dependantVersion'::uuid,:'dependantDocument'::uuid,1,repeat('2',64),'synthetic/dependant-sponsorship',1),
        (:'endVersion'::uuid,:'endDocument'::uuid,1,repeat('3',64),'synthetic/dependant-sponsorship-end',1),
        (:'dependantExpiryVersion'::uuid,:'dependantExpiryDocument'::uuid,1,repeat('5',64),'synthetic/dependant-expiry',1),
        (:'foreignVersion'::uuid,:'foreignDocument'::uuid,1,repeat('4',64),'synthetic/foreign-sponsorship',1);
    INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,target_on,verification,official_fact_id,document_id,verified_by,recorded_by)
      VALUES(:'sponsorExpiryVersion'::uuid,:'sponsorCase'::uuid,:'sponsorEpisode'::uuid,'STAY_EXPIRY','CASE_APPROVAL',:'sponsorExpiry'::date,'VERIFIED',NULL,:'sponsorExpiryDocument'::uuid,:'advisorPrincipal'::uuid,:'advisorPrincipal'::uuid),
        (:'dependantExpiryRevision'::uuid,:'dependantCase'::uuid,:'dependantEpisode'::uuid,'STAY_EXPIRY','CASE_APPROVAL',:'dependantExpiry'::date,'VERIFIED',NULL,:'dependantExpiryDocument'::uuid,:'advisorPrincipal'::uuid,:'advisorPrincipal'::uuid);`,
  { familyId: family, sponsor, dependant, sponsorExpiryDocument, sponsorExpiryVersion, dependantDocument,
    dependantVersion, endDocument, endVersion, dependantExpiryDocument, dependantExpiryVersion,
    dependantExpiryRevision, foreignDocument, foreignVersion, otherFamily, otherPerson,
    sponsorCase, sponsorEpisode, dependantCase, dependantEpisode, sponsorExpiry, dependantExpiry, advisorPrincipal });

  const record = ({ change, caseId = dependantCase, episodeId = dependantEpisode, sponsorId = sponsor,
    effectiveOn = recordedOn, documentVersion = dependantVersion, supersedes = null }) => {
    const sponsorExpression = sponsorId ? ":'sponsorId'::uuid" : "NULL";
    const supersedesExpression = supersedes ? ":'supersedes'::uuid" : "NULL";
    return {
      sql: `SELECT identity.record_journey_sponsorship(:'change'::uuid,:'caseId'::uuid,:'episodeId'::uuid,
        ${sponsorExpression},:'effectiveOn'::date,:'documentVersion'::uuid,${supersedesExpression});`,
      values: { change, caseId, episodeId, effectiveOn, documentVersion, ...(sponsorId ? { sponsorId } : {}),
        ...(supersedes ? { supersedes } : {}) },
    };
  };
  const denied = (parameters, runner = inAdvisor) => {
    const call = record(parameters);
    const expression = call.sql.slice("SELECT ".length, -1);
    assert.equal(runner(`SELECT COALESCE((${expression})::text,'null');`, call.values), "null");
  };
  denied({ change: deniedChange, sponsorId: sponsor, documentVersion: foreignVersion });
  denied({ change: id(8730), sponsorId: sponsor, caseId: sponsorCase, episodeId: sponsorEpisode });
  denied({ change: id(8731), sponsorId: sponsor, effectiveOn: addDays(today, 1) });
  denied({ change: id(8732), sponsorId: null, supersedes: id(8733), documentVersion: endVersion });
  denied({ change: missingSponsorGrantChange, sponsorId: sponsor, documentVersion: dependantVersion });
  denied({ change: id(8734), sponsorId: null, supersedes: null, documentVersion: dependantVersion });
  denied({ change: id(8736) }, inDependant);

  // The sponsor authorization is intentionally added only after the missing-
  // grant denial above.  No sponsor DOCUMENT_READ grant is created: the
  // reviewer needs the sponsor's affirmative IDENTITY_CASE grant, while the
  // dependant evidence remains covered by the existing dependant grants.
  query(`INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,status,granted_at,expires_at)
    VALUES(:'sponsorIdentityConsent'::uuid,:'familyId'::uuid,:'sponsor'::uuid,:'advisorPerson'::uuid,:'sponsor'::uuid,
      'IDENTITY_CASE','IDENTITY_SENSITIVE','ACTIVE',clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');`,
  { familyId: family, sponsor, advisorPerson: advisor, sponsorIdentityConsent });
  assert.equal(query(`SELECT count(*) FROM consent.grants
    WHERE family_id=:'familyId'::uuid AND grantor_person_id=:'sponsor'::uuid
      AND grantee_person_id=:'advisorPerson'::uuid AND subject_person_id=:'sponsor'::uuid
      AND purpose='DOCUMENT_READ' AND data_class='IDENTITY_SENSITIVE'
      AND status='ACTIVE' AND withdrawn_at IS NULL AND expires_at>clock_timestamp();`,
    { familyId: family, sponsor, advisorPerson: advisor }), "0");
  denied({ change: id(8735), documentVersion: dependantExpiryVersion });

  const recorded = inAdvisor(`SELECT identity.record_journey_sponsorship(:'change'::uuid,:'caseId'::uuid,:'episodeId'::uuid,
    :'sponsorId'::uuid,:'effectiveOn'::date,:'documentVersion'::uuid,NULL)::text;`,
    record({ change: firstChange }).values);
  assert.equal(recorded, firstChange);
  assert.equal(query(`SELECT identity_case_id=:'dependantCase'::uuid AND episode_id=:'dependantEpisode'::uuid
    AND sponsor_person_id=:'sponsor'::uuid AND effective_on=:'recordedOn'::date
    FROM identity.journey_sponsorship_facts WHERE sponsorship_fact_id=:'firstChange'::uuid;`,
    { dependantCase, dependantEpisode, sponsor, recordedOn, firstChange }), "t");

  const replay = inAdvisor(`SELECT identity.record_journey_sponsorship(:'change'::uuid,:'caseId'::uuid,:'episodeId'::uuid,
    :'sponsorId'::uuid,:'effectiveOn'::date,:'documentVersion'::uuid,NULL)::text;`,
    record({ change: secondChange }).values);
  assert.equal(replay, firstChange);
  assert.equal(query(`SELECT count(*) FROM identity.journey_sponsorship_facts
    WHERE identity_case_id=:'dependantCase'::uuid AND sponsor_person_id IS NOT NULL;`, { dependantCase }), "1");

  const readDependantProfile = () => inDependant(`SELECT COALESCE(identity.read_journey_member_profile(
    :'dependant'::uuid,NULL,ARRAY[:'dependantCase'::uuid])::text,'null');`,
  { dependant, dependantCase });
  const profile = JSON.parse(readDependantProfile());
  const dependantStage = profile.episodes.find(row => row.path === "DEPENDANT");
  assert.deepEqual(dependantStage?.sponsorship, { effectiveOn: recordedOn, status: "RECORDED" });
  assert.equal(dependantStage?.milestones.some(milestone =>
    milestone.kind === "STAY_EXPIRY" && milestone.on === dependantExpiry), true);

  const ended = inAdvisor(`SELECT identity.record_journey_sponsorship(:'change'::uuid,:'caseId'::uuid,:'episodeId'::uuid,
    NULL,:'effectiveOn'::date,:'documentVersion'::uuid,:'supersedes'::uuid)::text;`,
    record({ change: endChange, sponsorId: null, effectiveOn: endOn, documentVersion: endVersion, supersedes: firstChange }).values);
  assert.equal(ended, endChange);
  assert.deepEqual(JSON.parse(readDependantProfile()).episodes.find(row => row.path === "DEPENDANT")?.sponsorship,
    { effectiveOn: endOn, status: "ENDED" });

  assert.equal(inSponsor(`SELECT identity.lock_journey_profile_access(:'sponsor'::uuid,NULL,
    ARRAY[:'sponsorCase'::uuid]);`, { sponsor, sponsorCase }), "t");
  assert.equal(inSponsor(`SELECT identity.lock_journey_profile_access(:'dependant'::uuid,NULL,
    ARRAY[:'dependantCase'::uuid]);`, { dependant, dependantCase }), "f");
  assert.equal(inDependant(`SELECT identity.lock_journey_profile_access(:'dependant'::uuid,NULL,
    ARRAY[:'dependantCase'::uuid]);`, { dependant, dependantCase }), "t");
  assert.equal(inDependant(`SELECT identity.lock_journey_profile_access(:'sponsor'::uuid,NULL,
    ARRAY[:'sponsorCase'::uuid]);`, { sponsor, sponsorCase }), "f");
  const sponsorProfile = JSON.parse(inSponsor(`SELECT COALESCE(identity.read_journey_member_profile(
    :'sponsor'::uuid,NULL,ARRAY[:'sponsorCase'::uuid])::text,'null');`, { sponsor, sponsorCase }));
  assert.equal(sponsorProfile.episodes.some(row => row.milestones.some(milestone =>
    milestone.kind === "STAY_EXPIRY" && milestone.on === sponsorExpiry)), true);
  assert.equal(JSON.stringify(sponsorProfile).includes("sponsorship"), false);

  const conversion = {
    familyId: family, dependant, advisor, advisorPrincipal, dependantPrincipal, sponsorPrincipal,
    dependantCase, dependantEpisode, sponsorCase, sponsorEpisode, dependantExpiryRevision, dependantExpiry,
    sponsorExpiryVersion, sponsorExpiry, endOn, caseId: id(8740), casework: id(8741), assignment: id(8742),
    document: id(8743), version: id(8744), decision: id(8745), episode: id(8746), revision: id(8747),
    dependantReminder: id(8748), sponsorReminder: id(8749), newReminder: id(8750), newExpiry: addDays(today, 80),
  };
  query(`INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'caseId'::uuid,:'familyId'::uuid,:'dependant'::uuid,'GEP','UNDER_REVIEW');
    INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
      VALUES(:'casework'::uuid,:'familyId'::uuid,:'dependant'::uuid,'Synthetic independent GEP','OPEN','IDENTITY_CASE',:'caseId'::uuid);
    INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
      VALUES(:'assignment'::uuid,:'casework'::uuid,:'advisor'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');
    INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
      VALUES(:'document'::uuid,:'familyId'::uuid,:'dependant'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_TRANSITION_DECISION',clock_timestamp()+interval '1 day');
    INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
      VALUES(:'version'::uuid,:'document'::uuid,1,repeat('e',64),'synthetic/dependant-gep',1);
    INSERT INTO identity.external_facts(fact_id,identity_case_id,fact_kind,source_name,external_reference,observed_at)
      VALUES(:'decision'::uuid,:'caseId'::uuid,'DECISION','Synthetic transition','dependant-to-gep',clock_timestamp());
    INSERT INTO identity.journey_transition_attestations
      (decision_id,prior_episode_id,target_case_id,document_version_id,effective_on,verified_target_on,verified_by)
      VALUES(:'decision'::uuid,:'dependantEpisode'::uuid,:'caseId'::uuid,:'version'::uuid,:'endOn'::date,:'newExpiry'::date,:'advisorPrincipal'::uuid);
    INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,date_kind,
      target_on,offset_days,recipient_principal_id,state)
      VALUES(:'dependantReminder'::uuid,:'dependantCase'::uuid,:'dependantEpisode'::uuid,:'dependantExpiryRevision'::uuid,
        'STAY_EXPIRY',:'dependantExpiry'::date,30,:'dependantPrincipal'::uuid,'PENDING'),
      (:'sponsorReminder'::uuid,:'sponsorCase'::uuid,:'sponsorEpisode'::uuid,:'sponsorExpiryVersion'::uuid,
        'STAY_EXPIRY',:'sponsorExpiry'::date,30,:'sponsorPrincipal'::uuid,'PENDING');
    INSERT INTO identity_journey_test.transition_reminder_authority(
      identity_case_id,family_id,subject_person_id,recipient_principal_id,purpose,expires_at)
      VALUES(:'caseId'::uuid,:'familyId'::uuid,:'dependant'::uuid,:'dependantPrincipal'::uuid,'IDENTITY_REMINDER',clock_timestamp()+interval '1 day');`, conversion);
  assert.equal(inAdvisor(`WITH authorized AS MATERIALIZED (
      SELECT 1 FROM identity_journey_test.transition_reminder_authority
      WHERE identity_case_id=:'caseId'::uuid AND family_id=:'familyId'::uuid AND subject_person_id=:'dependant'::uuid
        AND recipient_principal_id=:'dependantPrincipal'::uuid AND purpose='IDENTITY_REMINDER'
        AND expires_at>clock_timestamp() AND revoked_at IS NULL FOR SHARE
    )
    SELECT identity.apply_journey_episode_transition(:'decision'::uuid,:'episode'::uuid,:'revision'::uuid,
      :'dependantPrincipal'::uuid,ARRAY[30]::smallint[],ARRAY[:'newReminder'::uuid])::text FROM authorized;`,
  conversion), conversion.episode);
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE (reminder_id=:'dependantReminder'::uuid AND state='CANCELED')
      OR (reminder_id=:'sponsorReminder'::uuid AND state='PENDING' AND recipient_principal_id=:'sponsorPrincipal'::uuid)
      OR (reminder_id=:'newReminder'::uuid AND state='PENDING' AND target_on=:'newExpiry'::date
        AND recipient_principal_id=:'dependantPrincipal'::uuid);`, conversion), "3");
  const readConvertedProfile = () => inDependant(`SELECT COALESCE(identity.read_journey_member_profile(
    :'dependant'::uuid,NULL,ARRAY[:'dependantCase'::uuid,:'caseId'::uuid])::text,'null');`, conversion);
  const [independent, historical] = JSON.parse(readConvertedProfile()).episodes;
  assert.equal(independent.path, "GEP");
  assert.ok(independent.milestones.some(row => row.kind === "STAY_EXPIRY" && row.on === conversion.newExpiry && row.current));
  assert.equal(historical.path, "DEPENDANT");
  assert.equal(historical.endedBefore, endOn);
  assert.deepEqual(historical.sponsorship, { effectiveOn: endOn, status: "ENDED" });
  assert.ok(historical.milestones.some(row => row.kind === "STAY_EXPIRY" && row.on === dependantExpiry && !row.current));
  if (verifyProfile) await verifyProfile({ readDependantProfile: readConvertedProfile });

  query(`UPDATE docs.documents SET withdrawn_at=clock_timestamp()
    WHERE document_id = :'endDocument'::uuid;`, { endDocument });
  const withdrawnProfile = JSON.parse(readDependantProfile());
  assert.equal(Object.hasOwn(withdrawnProfile.episodes.find(row => row.path === "DEPENDANT") ?? {}, "sponsorship"), false);
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
    WHERE identity_case_id=:'sponsorCase'::uuid AND target_on=:'sponsorExpiry'::date;`,
    { sponsorCase, sponsorExpiry }), "1");
  console.log("PASS dependant/sponsor evidence and separate adult access, DEPENDANT to GEP transition, isolated reminder rescheduling and evidence withdrawal");
}
