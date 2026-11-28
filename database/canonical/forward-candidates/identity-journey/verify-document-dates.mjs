import assert from "node:assert/strict";

/*
 * Document dates are verified only against a disposable, reviewed Docs
 * version. This verifier uses the existing adult subject/adviser and their
 * live consent grants, but creates its own identity case, open episode and
 * casework assignment so it cannot add heads to the worker's shared case.
 */
export async function verifyDocumentDates({ query, recipient }) {
  const existing = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const id = sequence => `01910000-0000-7000-8400-${String(sequence).padStart(12, "0")}`;
  const actor = existing(2);
  const advisorPerson = existing(40);
  const advisorPrincipal = existing(41);
  const otherFamily = existing(180);
  const otherPerson = existing(181);

  const journeyCase = id(8400);
  const episode = id(8401);
  const caseworkCase = id(8402);
  const assignment = id(8403);

  const visaDocument = id(8410);
  const visaVersion = id(8411);
  const visaVersionTwo = id(8412);
  const visaIssuedAttestation = id(8413);
  const visaIssuedRevision = id(8414);
  const deadlineAttestation = id(8415);
  const deadlineRevision = id(8416);
  const deadlineReminder = id(8417);
  const deadlineReplayRevision = id(8418);
  const deadlineReplayReminder = id(8419);

  const actualDocument = id(8420);
  const actualVersion = id(8421);
  const actualAttestation = id(8422);
  const actualRevision = id(8423);

  const passportDocument = id(8430);
  const passportVersion = id(8431);
  const passportVersionTwo = id(8432);
  const passportAttestation = id(8433);
  const passportRevision = id(8434);
  const passportReminder = id(8435);
  const passportCorrectionAttestation = id(8436);
  const passportCorrectionRevision = id(8437);
  const passportCorrectionReminder = id(8438);
  const passportStaleAttestation = id(8439);
  const passportStaleRevision = id(8440);

  const travelDocument = id(8450);
  const travelVersion = id(8451);
  const travelAttestation = id(8452);
  const travelRevision = id(8453);
  const travelReminder = id(8454);

  const wrongDocument = id(8460);
  const wrongVersion = id(8461);
  const wrongAttestation = id(8462);
  const foreignDocument = id(8470);
  const foreignVersion = id(8471);
  const foreignAttestation = id(8472);
  const expiredDocument = id(8480);
  const expiredVersion = id(8481);
  const expiredAttestation = id(8482);
  const deniedRevision = id(8483);
  const clearedRevision = id(8484);

  const advisorContext = { principal: advisorPrincipal, person: advisorPerson, channel: "ADVISOR" };
  const familyContext = { principal: recipient.principalId, person: actor, channel: "FAMILY" };
  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";

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

  const inAdvisor = (statement, values = {}) => inContext(advisorContext, statement, values);
  const inFamily = (statement, values = {}) => inContext(familyContext, statement, values);

  const applyExpression = ({ recipientPrincipal = null, offsets = [], reminders = [] }) =>
    `identity.apply_journey_document_date(
      :'attestation'::uuid, :'revision'::uuid,
      ${recipientPrincipal ? ":'recipientPrincipal'::uuid" : "NULL"},
      ${offsets.length ? `ARRAY[${offsets.join(",")}]::smallint[]` : "ARRAY[]::smallint[]"},
      ${reminders.length
        ? `ARRAY[${reminders.map((_, index) => `:'reminder${index}'::uuid`).join(",")}]::uuid[]`
        : "ARRAY[]::uuid[]"}
    )`;
  const valuesFor = ({ attestation, revision, recipientPrincipal = null, reminders = [] }) => ({
    ...recipient,
    actor,
    journeyCase,
    episode,
    attestation,
    revision,
    ...(recipientPrincipal ? { recipientPrincipal } : {}),
    ...Object.fromEntries(reminders.map((value, index) => [`reminder${index}`, value])),
  });
  const apply = parameters => ({
    sql: `SELECT ${applyExpression(parameters)};`,
    values: valuesFor(parameters),
    parameters,
  });
  const denied = (runner, parameters) => {
    const values = valuesFor(parameters);
    assert.equal(runner(`SELECT (${applyExpression(parameters)}) IS NULL;`, values), "t");
  };

  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const visaIssuedOn = addDays(today, -40);
  const entryDeadlineOn = addDays(today, 1);
  const actualEntryOn = today;
  const passportExpiryOn = addDays(today, 75);
  const passportCorrectionOn = addDays(today, 90);
  const passportStaleOn = addDays(today, 100);
  const travelExpiryOn = addDays(today, 120);

  assert.equal(query(`SELECT to_regprocedure(
    'identity.apply_journey_document_date(uuid,uuid,uuid,smallint[],uuid[])') IS NOT NULL
    AND to_regclass('identity.journey_document_date_attestations') IS NOT NULL;`), "t");

  // This candidate remains closed to generic application, reader and
  // workbench roles. Only the reviewed advisor adapter may call it.
  const signature = "identity.apply_journey_document_date(uuid,uuid,uuid,smallint[],uuid[])";
  for (const role of ["phoenix_canonical_app", "phoenix_canonical_reader", "phoenix_canonical_service_workbench"]) {
    assert.equal(query("SELECT has_function_privilege(:'role', :'signature', 'EXECUTE');",
      { role, signature }), "f", `${role} can apply document dates`);
  }

  // Isolate this verifier from the worker fixture's shared identity case and
  // give the exact case a live adviser assignment. Existing consent grants
  // from verifyResidence are deliberately reused, not recreated or changed.
  query(`INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'journeyCase'::uuid,:'familyId'::uuid,:'actor'::uuid,
        'SYNTHETIC_DOCUMENT_DATES','UNDER_REVIEW');
    INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
      VALUES(:'episode'::uuid,:'journeyCase'::uuid,
        (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date - 30,:'principalId'::uuid);
    INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
      VALUES(:'caseworkCase'::uuid,:'familyId'::uuid,:'actor'::uuid,
        'Synthetic document-date review','OPEN','IDENTITY_CASE',:'journeyCase'::uuid);
    INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
      VALUES(:'assignment'::uuid,:'caseworkCase'::uuid,:'advisorPerson'::uuid,
        clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');`,
  { ...recipient, actor, journeyCase, episode, caseworkCase, assignment, advisorPerson });
  assert.equal(query(`SELECT c.status='OPEN' AND a.lifecycle_status='ACTIVE'
    FROM casework.cases c JOIN casework.advisor_assignments a USING (case_id)
    WHERE c.resource_id=:'journeyCase'::uuid AND a.advisor_person_id=:'advisorPerson'::uuid;`,
  { journeyCase, advisorPerson }), "t");
  assert.equal(query(`SELECT identity_case_id = :'journeyCase'::uuid AND episode_id = :'episode'::uuid
    FROM identity.journey_episodes WHERE episode_id = :'episode'::uuid;`, { journeyCase, episode }), "t");

  query(`INSERT INTO docs.documents
      (document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
    VALUES
      (:'visaDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_ENTRY_PERMIT',clock_timestamp()+interval '1 day'),
      (:'actualDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_FIRST_ENTRY_RECORD',clock_timestamp()+interval '1 day'),
      (:'passportDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','PASSPORT',clock_timestamp()+interval '1 day'),
      (:'travelDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','TRAVEL_DOCUMENT',clock_timestamp()+interval '1 day'),
      (:'wrongDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','UNRELATED_NOTICE',clock_timestamp()+interval '1 day'),
      (:'foreignDocument'::uuid,:'otherFamily'::uuid,:'otherPerson'::uuid,'IDENTITY_SENSITIVE','HK_ENTRY_PERMIT',clock_timestamp()+interval '1 day'),
      (:'expiredDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_ENTRY_PERMIT',clock_timestamp()-interval '1 second');`,
  { ...recipient, actor, otherFamily, otherPerson, visaDocument, actualDocument, passportDocument,
    travelDocument, wrongDocument, foreignDocument, expiredDocument });
  query(`INSERT INTO docs.document_versions
      (version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
    VALUES
      (:'visaVersion'::uuid,:'visaDocument'::uuid,1,repeat('a',64),'synthetic/document-date-visa-v1',1),
      (:'visaVersionTwo'::uuid,:'visaDocument'::uuid,2,repeat('b',64),'synthetic/document-date-visa-v2',1),
      (:'actualVersion'::uuid,:'actualDocument'::uuid,1,repeat('c',64),'synthetic/document-date-entry-v1',1),
      (:'passportVersion'::uuid,:'passportDocument'::uuid,1,repeat('d',64),'synthetic/document-date-passport-v1',1),
      (:'passportVersionTwo'::uuid,:'passportDocument'::uuid,2,repeat('e',64),'synthetic/document-date-passport-v2',1),
      (:'travelVersion'::uuid,:'travelDocument'::uuid,1,repeat('f',64),'synthetic/document-date-travel-v1',1),
      (:'wrongVersion'::uuid,:'wrongDocument'::uuid,1,repeat('0',64),'synthetic/document-date-wrong-v1',1),
      (:'foreignVersion'::uuid,:'foreignDocument'::uuid,1,repeat('1',64),'synthetic/document-date-foreign-v1',1),
      (:'expiredVersion'::uuid,:'expiredDocument'::uuid,1,repeat('2',64),'synthetic/document-date-expired-v1',1);`,
  { visaDocument, visaVersion, visaVersionTwo, actualDocument, actualVersion, passportDocument,
    passportVersion, passportVersionTwo, travelDocument, travelVersion, wrongDocument, wrongVersion,
    foreignDocument, foreignVersion, expiredDocument, expiredVersion });

  const addAttestation = ({ attestationKey, versionKey, kind, targetKey, priorKey = null }) => `
    INSERT INTO identity.journey_document_date_attestations
      (attestation_id,identity_case_id,episode_id,document_version_id,date_kind,target_on,prior_revision_id,verified_by)
    VALUES(:'${attestationKey}'::uuid,:'journeyCase'::uuid,:'episode'::uuid,:'${versionKey}'::uuid,
      '${kind}',:'${targetKey}'::date,${priorKey ? `:'${priorKey}'::uuid` : "NULL"},:'advisorPrincipal'::uuid);`;
  query(`
    ${addAttestation({ attestationKey: "visaIssuedAttestation", versionKey: "visaVersion", kind: "VISA_ISSUED", targetKey: "visaIssuedOn" })}
    ${addAttestation({ attestationKey: "deadlineAttestation", versionKey: "visaVersion", kind: "FIRST_ENTRY_DEADLINE", targetKey: "entryDeadlineOn" })}
    ${addAttestation({ attestationKey: "actualAttestation", versionKey: "actualVersion", kind: "FIRST_ENTRY_ACTUAL", targetKey: "actualEntryOn" })}
    ${addAttestation({ attestationKey: "passportAttestation", versionKey: "passportVersion", kind: "PASSPORT_EXPIRY", targetKey: "passportExpiryOn" })}
    ${addAttestation({ attestationKey: "travelAttestation", versionKey: "travelVersion", kind: "TRAVEL_DOCUMENT_EXPIRY", targetKey: "travelExpiryOn" })}
    ${addAttestation({ attestationKey: "wrongAttestation", versionKey: "wrongVersion", kind: "VISA_ISSUED", targetKey: "visaIssuedOn" })}
    ${addAttestation({ attestationKey: "foreignAttestation", versionKey: "foreignVersion", kind: "VISA_ISSUED", targetKey: "visaIssuedOn" })}
    ${addAttestation({ attestationKey: "expiredAttestation", versionKey: "expiredVersion", kind: "VISA_ISSUED", targetKey: "visaIssuedOn" })}
  `, { journeyCase, episode, advisorPrincipal, visaIssuedOn, entryDeadlineOn, actualEntryOn,
    passportExpiryOn, passportCorrectionOn, passportStaleOn, travelExpiryOn, visaIssuedAttestation,
    deadlineAttestation, actualAttestation, passportAttestation, passportCorrectionAttestation,
    passportStaleAttestation, travelAttestation, wrongAttestation, foreignAttestation, expiredAttestation,
    visaVersion, actualVersion, passportVersion, passportVersionTwo, travelVersion, wrongVersion,
    foreignVersion, expiredVersion });

  // Exact Docs version and source-pair mapping: an HK entry permit can produce
  // both an issuance fact and a first-entry deadline, each with its own head.
  const visaApplied = apply({ attestation: visaIssuedAttestation, revision: visaIssuedRevision,
    recipientPrincipal: null, offsets: [], reminders: [] });
  assert.equal(inAdvisor(visaApplied.sql, visaApplied.values), visaIssuedRevision);
  assert.equal(query(`SELECT r.date_kind='VISA_ISSUED' AND r.document_id=:'visaDocument'::uuid
      AND r.document_date_attestation_id=:'attestation'::uuid AND a.document_version_id=:'visaVersion'::uuid
    FROM identity.journey_date_revisions r
    JOIN identity.journey_document_date_attestations a ON a.attestation_id=r.document_date_attestation_id
    WHERE r.date_revision_id=:'revision'::uuid;`, { visaDocument, visaVersion,
    attestation: visaIssuedAttestation, revision: visaIssuedRevision }), "t");

  const deadlineApplied = apply({ attestation: deadlineAttestation, revision: deadlineRevision,
    recipientPrincipal: recipient.principalId, offsets: [1], reminders: [deadlineReminder] });
  assert.equal(inAdvisor(deadlineApplied.sql, deadlineApplied.values), deadlineRevision);
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE date_revision_id=:'revision'::uuid AND identity_case_id=:'journeyCase'::uuid
        AND episode_id=:'episode'::uuid AND date_kind='FIRST_ENTRY_DEADLINE'
        AND date_basis='CASE_APPROVAL' AND target_on=:'target'::date AND verification='VERIFIED';`,
  { revision: deadlineRevision, journeyCase, episode, target: entryDeadlineOn }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
      WHERE reminder_id=:'reminder'::uuid AND date_revision_id=:'revision'::uuid
        AND target_on=:'target'::date AND offset_days=1 AND state='PENDING'
        AND send_on=(:'target'::date - 1);`, { reminder: deadlineReminder, revision: deadlineRevision,
    target: entryDeadlineOn }), "1");

  // Exact replay is idempotent and does not create another revision or queue
  // job even when a different proposed UUID is supplied.
  const deadlineReplay = apply({ attestation: deadlineAttestation, revision: deadlineReplayRevision,
    recipientPrincipal: recipient.principalId, offsets: [1], reminders: [deadlineReplayReminder] });
  assert.equal(inAdvisor(deadlineReplay.sql, deadlineReplay.values), deadlineRevision);
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE identity_case_id=:'journeyCase'::uuid AND episode_id=:'episode'::uuid
        AND date_kind='FIRST_ENTRY_DEADLINE' AND target_on=:'target'::date;`,
  { journeyCase, episode, target: entryDeadlineOn }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
      WHERE identity_case_id=:'journeyCase'::uuid AND episode_id=:'episode'::uuid
        AND date_kind='FIRST_ENTRY_DEADLINE' AND target_on=:'target'::date;`,
  { journeyCase, episode, target: entryDeadlineOn }), "1");

  // A first-entry record is separate from the deadline. It cancels the
  // pending deadline job, including a live claim, without changing the target.
  const deadlineClaim = query(`SELECT claim_token FROM identity.claim_journey_station_reminders(1)
    WHERE reminder_id=:'reminder'::uuid;`, { reminder: deadlineReminder });
  assert.match(deadlineClaim, /^[0-9a-f-]{36}$/);
  const actualApplied = apply({ attestation: actualAttestation, revision: actualRevision,
    recipientPrincipal: null, offsets: [], reminders: [] });
  assert.equal(inAdvisor(actualApplied.sql, actualApplied.values), actualRevision);
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE date_revision_id=:'revision'::uuid AND date_kind='FIRST_ENTRY_ACTUAL'
        AND target_on=:'target'::date AND verification='VERIFIED';`,
  { revision: actualRevision, target: actualEntryOn }), "1");
  assert.equal(query(`SELECT state FROM identity.journey_station_reminders
      WHERE reminder_id=:'reminder'::uuid AND date_revision_id=:'revision'::uuid;`,
  { reminder: deadlineReminder, revision: deadlineRevision }), "CANCELED");
  assert.equal(query(`SELECT identity.publish_journey_station_notice(
      :'reminder'::uuid,:'principalId'::uuid,:'revision'::uuid,:'claim'::uuid);`,
  { ...recipient, reminder: deadlineReminder, revision: deadlineRevision, claim: deadlineClaim }), "CANCELED");
  assert.equal(query(`SELECT NOT EXISTS (
    SELECT 1 FROM identity.journey_station_notices WHERE reminder_id=:'reminder'::uuid);`,
  { reminder: deadlineReminder }), "t");
  assert.equal(query(`SELECT target_on FROM identity.journey_date_revisions
      WHERE date_revision_id=:'revision'::uuid;`, { revision: deadlineRevision }), entryDeadlineOn);

  // Passport and travel-document expiry are independent date kinds and have
  // their own reminder queues. A correction must point to the exact current
  // head; a stale prior UUID is refused.
  const passportApplied = apply({ attestation: passportAttestation, revision: passportRevision,
    recipientPrincipal: recipient.principalId, offsets: [60], reminders: [passportReminder] });
  assert.equal(inAdvisor(passportApplied.sql, passportApplied.values), passportRevision);
  query(`
    ${addAttestation({ attestationKey: "passportCorrectionAttestation", versionKey: "passportVersionTwo", kind: "PASSPORT_EXPIRY", targetKey: "passportCorrectionOn", priorKey: "passportRevision" })}
    ${addAttestation({ attestationKey: "passportStaleAttestation", versionKey: "passportVersionTwo", kind: "PASSPORT_EXPIRY", targetKey: "passportStaleOn", priorKey: "passportRevision" })}
  `, { journeyCase, episode, advisorPrincipal, passportCorrectionAttestation, passportStaleAttestation,
    passportVersionTwo, passportCorrectionOn, passportStaleOn, passportRevision });
  const passportCorrection = apply({ attestation: passportCorrectionAttestation, revision: passportCorrectionRevision,
    recipientPrincipal: recipient.principalId, offsets: [60], reminders: [passportCorrectionReminder] });
  assert.equal(inAdvisor(passportCorrection.sql, passportCorrection.values), passportCorrectionRevision);
  const stalePassport = apply({ attestation: passportStaleAttestation, revision: passportStaleRevision,
    recipientPrincipal: recipient.principalId, offsets: [60], reminders: [id(8485)] });
  denied(inAdvisor, stalePassport);
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
      WHERE reminder_id=:'reminder'::uuid AND date_revision_id=:'revision'::uuid
        AND date_kind='PASSPORT_EXPIRY' AND offset_days=60 AND state='PENDING';`,
  { reminder: passportCorrectionReminder, revision: passportCorrectionRevision }), "1");

  const travelApplied = apply({ attestation: travelAttestation, revision: travelRevision,
    recipientPrincipal: recipient.principalId, offsets: [90], reminders: [travelReminder] });
  assert.equal(inAdvisor(travelApplied.sql, travelApplied.values), travelRevision);
  assert.equal(query(`SELECT date_kind FROM identity.journey_date_revisions
      WHERE date_revision_id=:'revision'::uuid;`, { revision: travelRevision }), "TRAVEL_DOCUMENT_EXPIRY");

  // The member projection exposes verified dates but no internal evidence,
  // document, attestation or revision identifiers.
  const profile = inFamily(`SELECT identity.read_journey_member_profile(
      :'actor'::uuid,NULL,ARRAY[:'journeyCase'::uuid]);`, { ...recipient, actor, journeyCase });
  assert.ok(profile && profile !== "null");
  for (const internalId of [visaDocument, visaVersion, visaIssuedAttestation, visaIssuedRevision,
    journeyCase, episode]) assert.equal(profile.includes(internalId), false, `profile leaked ${internalId}`);
  assert.equal(profile.includes(entryDeadlineOn), true);
  assert.equal(profile.includes(passportCorrectionOn), true);
  assert.equal(profile.includes(travelExpiryOn), true);

  // Wrong kind, wrong family/subject scope and expired/not-live evidence are
  // denied without changing the existing consent rows. Family context and a
  // cleared context cannot invoke the private advisor boundary.
  denied(inAdvisor, { attestation: wrongAttestation, revision: deniedRevision,
    recipientPrincipal: null, offsets: [], reminders: [] });
  denied(inAdvisor, { attestation: foreignAttestation, revision: id(8486),
    recipientPrincipal: null, offsets: [], reminders: [] });
  denied(inAdvisor, { attestation: expiredAttestation, revision: id(8487),
    recipientPrincipal: null, offsets: [], reminders: [] });
  denied(inFamily, { attestation: passportAttestation, revision: id(8488),
    recipientPrincipal: null, offsets: [], reminders: [] });
  const cleared = apply({ attestation: passportAttestation, revision: clearedRevision,
    recipientPrincipal: null, offsets: [], reminders: [] });
  assert.equal(inAdvisor(`SELECT auth.clear_context(); SELECT (${applyExpression(cleared.parameters)}) IS NULL;`,
    cleared.values), "t");

  // Corrections append a new fact; the original verified facts and deadline
  // target remain unchanged and the old pending deadline was only canceled by
  // the actual-arrival event.
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE date_revision_id=:'revision'::uuid AND verification='VERIFIED'
        AND target_on=:'target'::date;`, { revision: deadlineRevision, target: entryDeadlineOn }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE identity_case_id=:'journeyCase'::uuid AND episode_id=:'episode'::uuid
        AND date_kind='PASSPORT_EXPIRY' AND verification='VERIFIED';`, { journeyCase, episode }), "2");
  console.log("PASS isolated document-date case, exact Docs versions and source-pair mappings, same-day deadline, actual-entry cancellation, independent passport/travel reminders, current-head correction, replay, minimal profile projection and denied authority paths");
}
