import assert from "node:assert/strict";
import { runStationReminderBatch } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-reminder-worker.ts";

/* Disposable STUDENT -> IANG transition verifier. */
export async function verifyEpisodeWrite({ query, recipient, verifyProfile }) {
  const existing = sequence => `01910000-0000-7000-8100-${String(sequence).padStart(12, "0")}`;
  const id = sequence => `01910000-0000-7000-8600-${String(sequence).padStart(12, "0")}`;
  const actor = existing(2);
  const advisorPerson = existing(40);
  const advisorPrincipal = existing(41);
  const sourceCase = id(8600);
  const targetCase = id(8601);
  const sourceCasework = id(8602);
  const targetCasework = id(8603);
  const sourceAssignment = id(8604);
  const targetAssignment = id(8605);
  const priorEpisode = id(8606);
  const validEpisode = id(8607);
  const replayEpisode = id(8608);
  const validRevision = id(8609);
  const replayRevision = id(8610);
  const validDocument = id(8611);
  const validVersion = id(8612);
  const missingDocument = id(8613);
  const missingVersion = id(8614);
  const wrongDocument = id(8615);
  const wrongVersion = id(8616);
  const foreignDocument = id(8617);
  const foreignVersion = id(8618);
  const missingDecision = id(8619);
  const wrongDecision = id(8620);
  const futureDecision = id(8621);
  const isolatedCase = id(8622);
  const isolatedDecision = id(8623);
  const missingEpisode = id(8624);
  const wrongEpisode = id(8625);
  const futureEpisode = id(8626);
  const isolatedEpisode = id(8627);
  const missingRevision = id(8628);
  const wrongRevision = id(8629);
  const futureRevision = id(8630);
  const isolatedRevision = id(8631);
  const oldStayRevision = id(8632);
  const oldReturnRevision = id(8633);
  const oldStatusRevision = id(8634);
  const oldPassportRevision = id(8635);
  const oldTravelRevision = id(8636);
  const oldHkicRevision = id(8637);
  const validDecision = id(8638);
  const oldPending = id(8640);
  const oldRetry = id(8641);
  const oldRetryClaim = id(8642);
  const oldDelivered = id(8643);
  const passportReminder = id(8644);
  const travelReminder = id(8645);
  const hkicReminder = id(8646);
  const newReminder = id(8647);
  const replayReminder = id(8648);
  const openTargetCase = id(8649);
  const openTargetCasework = id(8650);
  const openTargetAssignment = id(8651);
  const openEpisode = id(8652);
  const openReplayEpisode = id(8653);
  const openDocument = id(8654);
  const openVersion = id(8655);
  const openDecision = id(8656);
  const openReplayRevision = id(8657);
  const openUnexpectedRevision = id(8658);
  const openReminder = id(8659);
  const openPassportRevision = id(8660);
  const openHkicRevision = id(8661);
  const openPassportReminder = id(8662);
  const openHkicReminder = id(8663);
  const unsupportedSourceCase = id(8664);
  const unsupportedTargetCase = id(8665);
  const unsupportedSourceCasework = id(8666);
  const unsupportedTargetCasework = id(8667);
  const unsupportedSourceAssignment = id(8668);
  const unsupportedTargetAssignment = id(8669);
  const unsupportedEpisode = id(8670);
  const unsupportedDocument = id(8671);
  const unsupportedVersion = id(8672);
  const unsupportedDecision = id(8673);
  const mismatchDecision = id(8674);
  const prematureRevision = id(8675);
  const prematureReminder = id(8676);
  const foreignFamily = existing(180);
  const foreignPerson = existing(181);
  const familyContext = { principal: recipient.principalId, person: actor, channel: "FAMILY" };
  const advisorContext = { principal: advisorPrincipal, person: advisorPerson, channel: "ADVISOR" };
  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";

  function inContext(context, statement, values = {}) {
    return lastLine(query(`BEGIN;
      SET LOCAL statement_timeout='4s';
      SELECT auth.issue_context_ticket(:'principal'::uuid,:'person'::uuid,:'familyId'::uuid,
        :'channel',clock_timestamp()+interval '45 seconds',gen_random_uuid(),:'principal'::uuid) AS ticket \\gset
      SELECT auth.redeem_context_ticket(:'ticket'::uuid,:'principal'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { ...recipient, actor, ...context, ...values }));
  }
  const inFamily = (statement, values = {}) => inContext(familyContext, statement, values);
  const inAdvisor = (statement, values = {}) => inContext(advisorContext, statement, values);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date,'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const effective = addDays(today, -1);
  const newExpiry = addDays(today, 1);
  const futureEffective = addDays(today, 1);
  const futureTarget = addDays(today, 3);
  const oldExpiry = addDays(today, 15);
  const returnBy = addDays(today, 20);
  const statusOn = addDays(today, 1);
  const passportExpiry = addDays(today, 90);
  const travelExpiry = addDays(today, 120);
  const hkicOn = addDays(today, 180);

  const signature = "identity.apply_journey_episode_transition(uuid,uuid,uuid,uuid,smallint[],uuid[])";
  assert.equal(query(`SELECT to_regprocedure(:'signature') IS NOT NULL
    AND to_regclass('identity.journey_transition_attestations') IS NOT NULL;`, { signature }), "t");
  for (const role of ["phoenix_canonical_app", "phoenix_canonical_reader", "phoenix_canonical_service_workbench"]) {
    assert.equal(query("SELECT has_function_privilege(:'role',:'signature','EXECUTE');", { role, signature }), "f");
  }
  assert.equal(query(`SELECT count(*) FROM consent.grants
    WHERE consent_id IN (:'identityConsent'::uuid,:'documentReadConsent'::uuid)
      AND family_id=:'familyId'::uuid AND subject_person_id=:'actor'::uuid
      AND grantee_person_id=:'advisorPerson'::uuid AND data_class='IDENTITY_SENSITIVE'
      AND status='ACTIVE' AND withdrawn_at IS NULL AND expires_at>clock_timestamp();`, {
    ...recipient, actor, advisorPerson, identityConsent: existing(62), documentReadConsent: existing(188),
  }), "2");

  query(`CREATE TABLE identity_journey_test.transition_reminder_authority (
      identity_case_id uuid NOT NULL REFERENCES identity.cases, family_id uuid NOT NULL REFERENCES core.families,
      subject_person_id uuid NOT NULL REFERENCES core.people, recipient_principal_id uuid NOT NULL REFERENCES auth.principals,
      purpose text NOT NULL CHECK(purpose='IDENTITY_REMINDER'), expires_at timestamptz NOT NULL, revoked_at timestamptz,
      PRIMARY KEY(identity_case_id,recipient_principal_id,purpose));
    INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'sourceCase'::uuid,:'familyId'::uuid,:'actor'::uuid,'STUDENT','UNDER_REVIEW'),
        (:'targetCase'::uuid,:'familyId'::uuid,:'actor'::uuid,'IANG','UNDER_REVIEW'),
        (:'isolatedCase'::uuid,:'foreignFamily'::uuid,:'foreignPerson'::uuid,'IANG','UNDER_REVIEW');
    INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
      VALUES(:'priorEpisode'::uuid,:'sourceCase'::uuid,:'episodeStart'::date,:'principalId'::uuid);
    INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
      VALUES(:'sourceCasework'::uuid,:'familyId'::uuid,:'actor'::uuid,'Synthetic STUDENT transition','OPEN','IDENTITY_CASE',:'sourceCase'::uuid),
        (:'targetCasework'::uuid,:'familyId'::uuid,:'actor'::uuid,'Synthetic IANG transition','OPEN','IDENTITY_CASE',:'targetCase'::uuid);
    INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
      VALUES(:'sourceAssignment'::uuid,:'sourceCasework'::uuid,:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour'),
        (:'targetAssignment'::uuid,:'targetCasework'::uuid,:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');
    INSERT INTO identity_journey_test.transition_reminder_authority
      (identity_case_id,family_id,subject_person_id,recipient_principal_id,purpose,expires_at)
      VALUES(:'targetCase'::uuid,:'familyId'::uuid,:'actor'::uuid,:'principalId'::uuid,'IDENTITY_REMINDER',clock_timestamp()+interval '1 day');`, {
    ...recipient, actor, advisorPerson, sourceCase, targetCase, sourceCasework, targetCasework,
    sourceAssignment, targetAssignment, priorEpisode, isolatedCase, foreignFamily, foreignPerson,
    episodeStart: addDays(today, -30),
  });
  assert.equal(query(`SELECT count(*) FROM casework.cases c JOIN casework.advisor_assignments a USING(case_id)
    WHERE c.resource_id IN (:'sourceCase'::uuid,:'targetCase'::uuid) AND c.status='OPEN'
      AND a.advisor_person_id=:'advisorPerson'::uuid AND a.lifecycle_status='ACTIVE' AND a.revoked_at IS NULL
      AND a.valid_until>clock_timestamp();`, { sourceCase, targetCase, advisorPerson }), "2");
  assert.equal(query(`SELECT count(*) FROM identity.cases
    WHERE identity_case_id IN (:'sourceCase'::uuid,:'targetCase'::uuid)
      AND family_id=:'familyId'::uuid AND subject_person_id=:'actor'::uuid
      AND ((identity_case_id=:'sourceCase'::uuid AND case_kind='STUDENT')
        OR (identity_case_id=:'targetCase'::uuid AND case_kind='IANG'));`, {
    ...recipient, actor, sourceCase, targetCase,
  }), "2");

  query(`INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
      VALUES(:'validDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_TRANSITION_DECISION',clock_timestamp()+interval '1 day'),
        (:'missingDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_TRANSITION_DECISION',clock_timestamp()+interval '1 day'),
        (:'wrongDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_OTHER',clock_timestamp()+interval '1 day'),
        (:'foreignDocument'::uuid,:'foreignFamily'::uuid,:'foreignPerson'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_TRANSITION_DECISION',clock_timestamp()+interval '1 day');
    INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
      VALUES(:'validVersion'::uuid,:'validDocument'::uuid,1,repeat('a',64),'synthetic/episode-transition-valid',1),
        (:'missingVersion'::uuid,:'missingDocument'::uuid,1,repeat('b',64),'synthetic/episode-transition-missing',1),
        (:'wrongVersion'::uuid,:'wrongDocument'::uuid,1,repeat('c',64),'synthetic/episode-transition-wrong',1),
        (:'foreignVersion'::uuid,:'foreignDocument'::uuid,1,repeat('d',64),'synthetic/episode-transition-foreign',1);
    UPDATE docs.documents SET withdrawn_at=clock_timestamp() WHERE document_id=:'missingDocument'::uuid;`, {
    ...recipient, actor, foreignFamily, foreignPerson, validDocument, validVersion, missingDocument, missingVersion,
    wrongDocument, wrongVersion, foreignDocument, foreignVersion,
  });

  query(`INSERT INTO identity.external_facts(fact_id,identity_case_id,fact_kind,source_name,external_reference,observed_at)
      VALUES(:'missingDecision'::uuid,:'targetCase'::uuid,'DECISION','Synthetic transition','missing-evidence',clock_timestamp()),
        (:'wrongDecision'::uuid,:'targetCase'::uuid,'DECISION','Synthetic transition','wrong-document-kind',clock_timestamp()),
        (:'futureDecision'::uuid,:'targetCase'::uuid,'DECISION','Synthetic transition','future-evidence',clock_timestamp()),
        (:'isolatedDecision'::uuid,:'isolatedCase'::uuid,'DECISION','Synthetic transition','foreign-scope',clock_timestamp());
    INSERT INTO identity.journey_transition_attestations
      (decision_id,prior_episode_id,target_case_id,document_version_id,effective_on,verified_target_on,verified_by,verified_at)
      VALUES(:'missingDecision'::uuid,:'priorEpisode'::uuid,:'targetCase'::uuid,:'missingVersion'::uuid,:'effective'::date,:'newExpiry'::date,:'advisorPrincipal'::uuid,clock_timestamp()),
        (:'wrongDecision'::uuid,:'priorEpisode'::uuid,:'targetCase'::uuid,:'wrongVersion'::uuid,:'effective'::date,:'newExpiry'::date,:'advisorPrincipal'::uuid,clock_timestamp()),
        (:'futureDecision'::uuid,:'priorEpisode'::uuid,:'targetCase'::uuid,:'validVersion'::uuid,:'futureEffective'::date,:'futureTarget'::date,:'advisorPrincipal'::uuid,clock_timestamp()+interval '1 day'),
        (:'isolatedDecision'::uuid,:'priorEpisode'::uuid,:'isolatedCase'::uuid,:'foreignVersion'::uuid,:'effective'::date,:'newExpiry'::date,:'advisorPrincipal'::uuid,clock_timestamp());`, {
    missingDecision, wrongDecision, futureDecision, isolatedDecision, priorEpisode, targetCase, isolatedCase,
    missingVersion, wrongVersion, validVersion, foreignVersion, advisorPrincipal, effective, newExpiry,
    futureEffective, futureTarget,
  });

  const applyCall = ({ decision, episode, revision, recipientId = null, offsets = [], jobs = [] }) => {
    const recipientExpression = recipientId ? ":'recipientId'::uuid" : "NULL";
    const revisionExpression = revision === null ? "NULL" : ":'revision'::uuid";
    const offsetExpression = offsets.length ? `ARRAY[${offsets.join(",")}]::smallint[]` : "ARRAY[]::smallint[]";
    const jobExpression = jobs.length
      ? `ARRAY[${jobs.map((_, index) => `:'job${index}'::uuid`).join(",")}]::uuid[]`
      : "ARRAY[]::uuid[]";
    return {
      call: `identity.apply_journey_episode_transition(:'decision'::uuid,:'episode'::uuid,${revisionExpression},
        ${recipientExpression},${offsetExpression},${jobExpression})`,
      values: { decision, episode, ...(revision === null ? {} : { revision }), ...(recipientId ? { recipientId } : {}),
        ...Object.fromEntries(jobs.map((job, index) => [`job${index}`, job])) },
    };
  };
  const denied = ({ decision, episode, revision }) => {
    const { call, values } = applyCall({ decision, episode, revision });
    assert.equal(inAdvisor(`SELECT COALESCE((${call})::text,'null');`, values), "null");
  };
  denied({ decision: missingDecision, episode: missingEpisode, revision: missingRevision });
  denied({ decision: wrongDecision, episode: wrongEpisode, revision: wrongRevision });
  denied({ decision: futureDecision, episode: futureEpisode, revision: futureRevision });
  denied({ decision: isolatedDecision, episode: isolatedEpisode, revision: isolatedRevision });
  assert.equal(query(`SELECT count(*) FROM identity.journey_episodes
    WHERE identity_case_id=:'targetCase'::uuid OR episode_id IN (:'missingEpisode'::uuid,:'wrongEpisode'::uuid,:'futureEpisode'::uuid,:'isolatedEpisode'::uuid);`, {
    targetCase, missingEpisode, wrongEpisode, futureEpisode, isolatedEpisode,
  }), "0");

  query(`INSERT INTO identity.journey_date_revisions
      (date_revision_id,identity_case_id,episode_id,date_kind,date_basis,target_on,verification,document_id,verified_by,recorded_by)
      VALUES(:'oldStayRevision'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,'STAY_EXPIRY','CASE_APPROVAL',:'oldExpiry'::date,'VERIFIED',:'validDocument'::uuid,:'advisorPrincipal'::uuid,:'advisorPrincipal'::uuid),
        (:'oldReturnRevision'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,'RETURN_BY','CASE_APPROVAL',:'returnBy'::date,'VERIFIED',:'validDocument'::uuid,:'advisorPrincipal'::uuid,:'advisorPrincipal'::uuid),
        (:'oldStatusRevision'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,'STATUS_TRANSITION','INTERNAL',:'statusOn'::date,'REPORTED',NULL,NULL,:'advisorPrincipal'::uuid),
        (:'oldPassportRevision'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,'PASSPORT_EXPIRY','CASE_APPROVAL',:'passportExpiry'::date,'VERIFIED',:'validDocument'::uuid,:'advisorPrincipal'::uuid,:'advisorPrincipal'::uuid),
        (:'oldTravelRevision'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,'TRAVEL_DOCUMENT_EXPIRY','CASE_APPROVAL',:'travelExpiry'::date,'VERIFIED',:'validDocument'::uuid,:'advisorPrincipal'::uuid,:'advisorPrincipal'::uuid),
        (:'oldHkicRevision'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,'HKIC_AGE_11','INTERNAL',:'hkicOn'::date,'REPORTED',NULL,NULL,:'advisorPrincipal'::uuid);
    INSERT INTO identity.journey_station_reminders
      (reminder_id,identity_case_id,episode_id,date_revision_id,date_kind,target_on,offset_days,recipient_principal_id,state,retry_not_before,claim_token,claim_until)
      VALUES(:'oldPending'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,:'oldStayRevision'::uuid,'STAY_EXPIRY',:'oldExpiry'::date,7,:'principalId'::uuid,'PENDING',NULL,NULL,NULL),
        (:'oldRetry'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,:'oldReturnRevision'::uuid,'RETURN_BY',:'returnBy'::date,7,:'principalId'::uuid,'RETRY',clock_timestamp()-interval '1 second',:'oldRetryClaim'::uuid,clock_timestamp()+interval '1 hour'),
        (:'oldDelivered'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,:'oldStatusRevision'::uuid,'STATUS_TRANSITION',:'statusOn'::date,1,:'principalId'::uuid,'PENDING',NULL,NULL,NULL),
        (:'passportReminder'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,:'oldPassportRevision'::uuid,'PASSPORT_EXPIRY',:'passportExpiry'::date,30,:'principalId'::uuid,'PENDING',NULL,NULL,NULL),
        (:'travelReminder'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,:'oldTravelRevision'::uuid,'TRAVEL_DOCUMENT_EXPIRY',:'travelExpiry'::date,30,:'principalId'::uuid,'PENDING',NULL,NULL,NULL),
        (:'hkicReminder'::uuid,:'sourceCase'::uuid,:'priorEpisode'::uuid,:'oldHkicRevision'::uuid,'HKIC_AGE_11',:'hkicOn'::date,60,:'principalId'::uuid,'PENDING',NULL,NULL,NULL);
    UPDATE identity.journey_station_reminders SET state='DELIVERED',delivered_at=clock_timestamp()
      WHERE reminder_id=:'oldDelivered'::uuid;
    INSERT INTO identity.journey_station_notices(reminder_id,published_at)
      SELECT reminder_id,delivered_at FROM identity.journey_station_reminders WHERE reminder_id=:'oldDelivered'::uuid;`, {
    ...recipient, sourceCase, priorEpisode, advisorPrincipal, validDocument, oldStayRevision, oldReturnRevision,
    oldStatusRevision, oldPassportRevision, oldTravelRevision, oldHkicRevision, oldExpiry, returnBy, statusOn,
    passportExpiry, travelExpiry, hkicOn, oldPending, oldRetry, oldRetryClaim, oldDelivered, passportReminder,
    travelReminder, hkicReminder,
  });
  const deliveredAt = query(`SELECT to_char(published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    FROM identity.journey_station_notices WHERE reminder_id=:'oldDelivered'::uuid;`, { oldDelivered });
  assert.match(deliveredAt, /^\d{4}-\d{2}-\d{2}T/);

  query(`INSERT INTO identity.external_facts(fact_id,identity_case_id,fact_kind,source_name,external_reference,observed_at)
      VALUES(:'validDecision'::uuid,:'targetCase'::uuid,'DECISION','Synthetic transition','student-to-iang-approved',clock_timestamp());
    INSERT INTO identity.journey_transition_attestations
      (decision_id,prior_episode_id,target_case_id,document_version_id,effective_on,verified_target_on,verified_by)
      VALUES(:'validDecision'::uuid,:'priorEpisode'::uuid,:'targetCase'::uuid,:'validVersion'::uuid,:'effective'::date,:'newExpiry'::date,:'advisorPrincipal'::uuid);`, {
    validDecision, targetCase, priorEpisode, validVersion, effective, newExpiry, advisorPrincipal,
  });
  const applyWithReminderAuthority = parameters => {
    const { call, values } = applyCall(parameters);
    return inAdvisor(`WITH authorized AS MATERIALIZED (
        SELECT 1 FROM identity_journey_test.transition_reminder_authority
        WHERE identity_case_id=:'targetCase'::uuid AND family_id=:'familyId'::uuid
          AND subject_person_id=:'actor'::uuid AND recipient_principal_id=:'principalId'::uuid
          AND purpose='IDENTITY_REMINDER' AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR SHARE
      ) SELECT COALESCE((SELECT (${call})::text FROM authorized),'null');`, { ...values, targetCase });
  };
  const validParameters = { decision: validDecision, episode: validEpisode, revision: validRevision,
    recipientId: recipient.principalId, offsets: [1], jobs: [newReminder] };
  const { call: applyWithoutPlan, values: applyWithoutPlanValues } = applyCall({
    decision: validDecision, episode: validEpisode, revision: validRevision,
  });
  assert.equal(inAdvisor(`SAVEPOINT missing_source_assignment;
    UPDATE casework.advisor_assignments SET revoked_at=clock_timestamp() WHERE assignment_id=:'sourceAssignment'::uuid;
    SELECT (${applyWithoutPlan}) IS NULL;
    ROLLBACK TO SAVEPOINT missing_source_assignment;`, { ...applyWithoutPlanValues, sourceAssignment }), "t");
  assert.equal(applyWithReminderAuthority(validParameters), validEpisode);

  assert.equal(query(`SELECT e.identity_case_id=:'targetCase'::uuid AND e.started_on=:'effective'::date
      AND e.ended_before IS NULL AND e.transition_decision_id=:'validDecision'::uuid
    FROM identity.journey_episodes e WHERE e.episode_id=:'validEpisode'::uuid;`, {
    targetCase, effective, validDecision, validEpisode,
  }), "t");
  assert.equal(query(`SELECT r.identity_case_id=:'targetCase'::uuid AND r.episode_id=:'validEpisode'::uuid
      AND r.date_kind='STAY_EXPIRY' AND r.target_on=:'newExpiry'::date AND r.verification='VERIFIED'
      AND r.official_fact_id=:'validDecision'::uuid AND r.document_id=:'validDocument'::uuid
      AND r.verified_by=:'advisorPrincipal'::uuid
    FROM identity.journey_date_revisions r WHERE r.date_revision_id=:'validRevision'::uuid;`, {
    targetCase, validEpisode, newExpiry, validDecision, validDocument, advisorPrincipal, validRevision,
  }), "t");

  const familyTimeline = JSON.parse(inFamily(`
    SELECT COALESCE(jsonb_agg(to_jsonb(row) ORDER BY row.valid_until),'[]'::jsonb)
    FROM identity.list_journey_stay_timeline(:'familyId'::uuid,:'targetCase'::uuid,:'principalId'::uuid,10) row;`, {
    targetCase,
  }));
  assert.equal(familyTimeline.some(row => row.record_id === validRevision && row.is_current), true);
  const familyProfile = JSON.parse(inFamily(`
    SELECT COALESCE(identity.read_journey_member_profile(:'actor'::uuid,NULL,
      ARRAY[:'sourceCase'::uuid,:'targetCase'::uuid])::text,'null');`, { sourceCase, targetCase }));
  assert.deepEqual(familyProfile.episodes.map(row => row.path).sort(), ["IANG", "STUDENT"]);
  assert.equal(familyProfile.episodes.find(row => row.path === "IANG")?.milestones
    .some(row => row.kind === "STAY_EXPIRY" && row.on === newExpiry && row.current), true);
  const formerStage = familyProfile.episodes.find(row => row.path === "STUDENT");
  assert.equal(formerStage?.endedBefore, effective);
  assert.equal(formerStage.milestones.some(row => row.kind === "STAY_EXPIRY" && row.on === oldExpiry && !row.current), true);
  assert.equal(formerStage.milestones.some(row => row.kind === "PASSPORT_EXPIRY" && row.on === passportExpiry && row.current), true);
  assert.equal(JSON.stringify(familyProfile).includes(validRevision), false);
  assert.equal(JSON.stringify(familyProfile).includes(targetCase), false);
  assert.throws(() => query(`UPDATE identity.journey_episodes SET ended_before=NULL
    WHERE episode_id=:'priorEpisode'::uuid;`, { priorEpisode }),
  error => String(error.stderr).includes("IDENTITY_JOURNEY_EVIDENCE_IMMUTABLE"));

  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE identity_case_id=:'sourceCase'::uuid AND reminder_id IN (:'oldPending'::uuid,:'oldRetry'::uuid)
      AND state='CANCELED' AND retry_not_before IS NULL AND claim_token IS NULL AND claim_until IS NULL;`, {
    sourceCase, oldPending, oldRetry,
  }), "2");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE identity_case_id=:'sourceCase'::uuid AND reminder_id IN (:'passportReminder'::uuid,:'travelReminder'::uuid,:'hkicReminder'::uuid)
      AND state='PENDING';`, { sourceCase, passportReminder, travelReminder, hkicReminder }), "3");
  assert.equal(query(`SELECT r.state='DELIVERED' AND n.published_at=:'deliveredAt'::timestamptz
    FROM identity.journey_station_reminders r JOIN identity.journey_station_notices n USING(reminder_id)
    WHERE r.reminder_id=:'oldDelivered'::uuid;`, { oldDelivered, deliveredAt }), "t");

  // A different result UUID and queue plan on the same decision must replay
  // the original episode without creating a second target head.
  assert.equal(applyWithReminderAuthority({ decision: validDecision, episode: replayEpisode, revision: replayRevision,
    recipientId: recipient.principalId, offsets: [1], jobs: [replayReminder] }), validEpisode);
  assert.equal(query(`SELECT count(*) FROM identity.journey_episodes WHERE identity_case_id=:'targetCase'::uuid;`, { targetCase }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions WHERE identity_case_id=:'targetCase'::uuid;`, { targetCase }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders WHERE identity_case_id=:'targetCase'::uuid;`, { targetCase }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_episodes WHERE episode_id=:'replayEpisode'::uuid;`, { replayEpisode }), "0");
  assert.equal(query(`SELECT r.state='DELIVERED' AND n.published_at=:'deliveredAt'::timestamptz
    FROM identity.journey_station_reminders r JOIN identity.journey_station_notices n USING(reminder_id)
    WHERE r.reminder_id=:'oldDelivered'::uuid;`, { oldDelivered, deliveredAt }), "t");

  const queue = {
    async claimDue(limit) {
      return JSON.parse(query(`SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'reminderId',reminder_id,'recipientPrincipalId',recipient_principal_id,
          'revisionId',revision_id,'claimToken',claim_token)),'[]'::jsonb)
        FROM identity.claim_journey_station_reminders(:'limit'::integer);`, { limit }));
    },
    async publishWithAuthorization(claim) {
      return query(`BEGIN;
        SET LOCAL statement_timeout='4s';
        WITH authorized AS MATERIALIZED (
          SELECT expires_at FROM identity_journey_test.transition_reminder_authority
          WHERE identity_case_id=:'targetCase'::uuid AND family_id=:'familyId'::uuid
            AND subject_person_id=:'actor'::uuid AND recipient_principal_id=:'recipientPrincipalId'::uuid
            AND purpose='IDENTITY_REMINDER' AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR SHARE
        ) SELECT CASE WHEN EXISTS(SELECT 1 FROM authorized)
          THEN identity.publish_journey_station_notice(:'reminderId'::uuid,:'recipientPrincipalId'::uuid,
            :'revisionId'::uuid,:'claimToken'::uuid)
          ELSE 'AUTHORIZATION_DENIED' END;
        COMMIT;`, { ...claim, ...recipient, actor, targetCase });
    },
    async deferWithBackoff(claim) {
      return query(`SELECT identity.retry_journey_station_reminder(
        :'reminderId'::uuid,:'revisionId'::uuid,:'claimToken'::uuid);`, claim) === "t";
    },
  };
  const publication = await runStationReminderBatch(queue, 1);
  assert.equal(publication.claimed, 1);
  assert.equal(publication.delivered, 1);
  assert.equal(publication.denied, 0);
  assert.equal(publication.deferred, 0);
  assert.equal((await queue.claimDue(1)).length, 0);
  assert.equal(query(`SELECT r.state='DELIVERED' AND n.published_at=r.delivered_at
      AND r.claim_token IS NULL FROM identity.journey_station_reminders r
      JOIN identity.journey_station_notices n USING(reminder_id)
      WHERE r.reminder_id=:'newReminder'::uuid;`, { newReminder }), "t");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE identity_case_id=:'targetCase'::uuid AND state IN ('PENDING','RETRY')
      AND send_on <= (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;`, { targetCase }), "0");

  // An explicit, already-effective decision may describe a status with no
  // fixed permitted-stay expiry. The candidate stores that fact as a status
  // term, never as a sentinel date or a synthetic expiry reminder.
  query(`INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'openTargetCase'::uuid,:'familyId'::uuid,:'actor'::uuid,'HK_PERMANENT_RESIDENT','UNDER_REVIEW'),
        (:'unsupportedSourceCase'::uuid,:'familyId'::uuid,:'actor'::uuid,'IANG','UNDER_REVIEW'),
        (:'unsupportedTargetCase'::uuid,:'familyId'::uuid,:'actor'::uuid,'IANG','UNDER_REVIEW');
    INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
      VALUES(:'unsupportedEpisode'::uuid,:'unsupportedSourceCase'::uuid,:'episodeStart'::date,:'principalId'::uuid);
    INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
      VALUES(:'openTargetCasework'::uuid,:'familyId'::uuid,:'actor'::uuid,'Synthetic permanent-status transition','OPEN','IDENTITY_CASE',:'openTargetCase'::uuid),
        (:'unsupportedSourceCasework'::uuid,:'familyId'::uuid,:'actor'::uuid,'Synthetic unsupported source','OPEN','IDENTITY_CASE',:'unsupportedSourceCase'::uuid),
        (:'unsupportedTargetCasework'::uuid,:'familyId'::uuid,:'actor'::uuid,'Synthetic unsupported target','OPEN','IDENTITY_CASE',:'unsupportedTargetCase'::uuid);
    INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
      VALUES(:'openTargetAssignment'::uuid,:'openTargetCasework'::uuid,:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour'),
        (:'unsupportedSourceAssignment'::uuid,:'unsupportedSourceCasework'::uuid,:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour'),
        (:'unsupportedTargetAssignment'::uuid,:'unsupportedTargetCasework'::uuid,:'advisorPerson'::uuid,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');
    INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
      VALUES(:'openDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_TRANSITION_DECISION',clock_timestamp()+interval '1 day'),
        (:'unsupportedDocument'::uuid,:'familyId'::uuid,:'actor'::uuid,'IDENTITY_SENSITIVE','HK_IDENTITY_TRANSITION_DECISION',clock_timestamp()+interval '1 day');
    INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
      VALUES(:'openVersion'::uuid,:'openDocument'::uuid,1,repeat('e',64),'synthetic/episode-transition-open-ended',1),
        (:'unsupportedVersion'::uuid,:'unsupportedDocument'::uuid,1,repeat('f',64),'synthetic/episode-transition-unsupported-open-ended',1);
    INSERT INTO identity.external_facts(fact_id,identity_case_id,fact_kind,source_name,external_reference,observed_at)
      VALUES(:'openDecision'::uuid,:'openTargetCase'::uuid,'DECISION','Synthetic transition','iang-to-permanent-approved',clock_timestamp()),
        (:'unsupportedDecision'::uuid,:'unsupportedTargetCase'::uuid,'DECISION','Synthetic transition','iang-to-iang-rejected',clock_timestamp()),
        (:'mismatchDecision'::uuid,:'unsupportedTargetCase'::uuid,'DECISION','Synthetic transition','dated-without-expiry-rejected',clock_timestamp());
    INSERT INTO identity.journey_transition_attestations
      (decision_id,prior_episode_id,target_case_id,document_version_id,effective_on,verified_target_on,stay_term,verified_by)
      VALUES(:'openDecision'::uuid,:'validEpisode'::uuid,:'openTargetCase'::uuid,:'openVersion'::uuid,:'today'::date,NULL,'NO_FIXED_EXPIRY',:'advisorPrincipal'::uuid),
        (:'unsupportedDecision'::uuid,:'unsupportedEpisode'::uuid,:'unsupportedTargetCase'::uuid,:'unsupportedVersion'::uuid,:'today'::date,NULL,'NO_FIXED_EXPIRY',:'advisorPrincipal'::uuid);`, {
    ...recipient, actor, advisorPerson, advisorPrincipal, familyId: recipient.familyId,
    openTargetCase, openTargetCasework, openTargetAssignment, openDocument, openVersion, openDecision,
    unsupportedSourceCase, unsupportedTargetCase, unsupportedSourceCasework, unsupportedTargetCasework,
    unsupportedSourceAssignment, unsupportedTargetAssignment, unsupportedEpisode, unsupportedDocument,
    unsupportedVersion, unsupportedDecision, mismatchDecision, validEpisode, today,
    episodeStart: addDays(today, -45), principalId: recipient.principalId,
  });
  assert.throws(() => query(`INSERT INTO identity.journey_transition_attestations
      (decision_id,prior_episode_id,target_case_id,document_version_id,effective_on,verified_target_on,stay_term,verified_by)
      VALUES(:'mismatchDecision'::uuid,:'unsupportedEpisode'::uuid,:'unsupportedTargetCase'::uuid,:'unsupportedVersion'::uuid,
        :'today'::date,NULL,'DATED',:'advisorPrincipal'::uuid);`, {
    mismatchDecision, unsupportedEpisode, unsupportedTargetCase, unsupportedVersion, today, advisorPrincipal,
  }), error => String(error.stderr).includes("violates check constraint"));
  const openDenied = (parameters) => {
    const { call, values } = applyCall({ revision: null, ...parameters });
    assert.equal(inAdvisor(`SELECT COALESCE((${call})::text,'null');`, values), "null");
  };
  // Target-path vocabulary and argument shape are both part of the guard.
  openDenied({ decision: unsupportedDecision, episode: openEpisode });
  openDenied({ decision: openDecision, episode: openEpisode, revision: openUnexpectedRevision });
  openDenied({ decision: openDecision, episode: openEpisode, recipientId: recipient.principalId,
    offsets: [1], jobs: [prematureReminder] });
  assert.equal(query(`SELECT count(*) FROM identity.journey_episodes
    WHERE identity_case_id IN (:'openTargetCase'::uuid,:'unsupportedTargetCase'::uuid);`, {
    openTargetCase, unsupportedTargetCase,
  }), "0");

  // Attach independent document milestones to the current IANG stage. They
  // must survive the status transition, while a no-expiry stage gets no queue.
  query(`INSERT INTO identity.journey_date_revisions
      (date_revision_id,identity_case_id,episode_id,date_kind,date_basis,target_on,verification,document_id,verified_by,recorded_by)
      VALUES(:'openPassportRevision'::uuid,:'targetCase'::uuid,:'validEpisode'::uuid,'PASSPORT_EXPIRY','CASE_APPROVAL',:'passportExpiry'::date,'VERIFIED',:'validDocument'::uuid,:'advisorPrincipal'::uuid,:'advisorPrincipal'::uuid),
        (:'openHkicRevision'::uuid,:'targetCase'::uuid,:'validEpisode'::uuid,'HKIC_AGE_18','INTERNAL',:'hkicOn'::date,'REPORTED',NULL,NULL,:'advisorPrincipal'::uuid);
    INSERT INTO identity.journey_station_reminders
      (reminder_id,identity_case_id,episode_id,date_revision_id,date_kind,target_on,offset_days,recipient_principal_id,state,retry_not_before,claim_token,claim_until)
      VALUES(:'openPassportReminder'::uuid,:'targetCase'::uuid,:'validEpisode'::uuid,:'openPassportRevision'::uuid,'PASSPORT_EXPIRY',:'passportExpiry'::date,30,:'principalId'::uuid,'PENDING',NULL,NULL,NULL),
        (:'openHkicReminder'::uuid,:'targetCase'::uuid,:'validEpisode'::uuid,:'openHkicRevision'::uuid,'HKIC_AGE_18',:'hkicOn'::date,60,:'principalId'::uuid,'PENDING',NULL,NULL,NULL),
        (:'replayReminder'::uuid,:'targetCase'::uuid,:'validEpisode'::uuid,:'validRevision'::uuid,'STAY_EXPIRY',:'newExpiry'::date,7,:'principalId'::uuid,'PENDING',NULL,NULL,NULL);`, {
    ...recipient, targetCase, validEpisode, openPassportRevision, openHkicRevision, openPassportReminder,
    openHkicReminder, passportExpiry, hkicOn, validDocument, advisorPrincipal, replayReminder, validRevision, newExpiry,
  });
  const openApplied = inAdvisor(`SELECT COALESCE((SELECT identity.apply_journey_episode_transition(
      :'decision'::uuid,:'episode'::uuid,NULL,NULL,ARRAY[]::smallint[],ARRAY[]::uuid[]))::text,'null');`, {
    decision: openDecision, episode: openEpisode,
  });
  assert.equal(openApplied, openEpisode);
  assert.equal(query(`SELECT e.identity_case_id=:'openTargetCase'::uuid AND e.started_on=:'today'::date
      AND e.ended_before IS NULL AND e.transition_decision_id=:'openDecision'::uuid
    FROM identity.journey_episodes e WHERE e.episode_id=:'openEpisode'::uuid;`, {
    openTargetCase, today, openDecision, openEpisode,
  }), "t");
  assert.equal(query(`SELECT a.stay_term='NO_FIXED_EXPIRY' AND a.verified_target_on IS NULL
    FROM identity.journey_transition_attestations a WHERE a.decision_id=:'openDecision'::uuid;`, {
    openDecision,
  }), "t");
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
    WHERE episode_id=:'openEpisode'::uuid OR identity_case_id=:'openTargetCase'::uuid;`, { openEpisode, openTargetCase }), "0");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE identity_case_id=:'openTargetCase'::uuid;`, { openTargetCase }), "0");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE identity_case_id=:'targetCase'::uuid AND reminder_id IN (:'openPassportReminder'::uuid,:'openHkicReminder'::uuid)
      AND state='PENDING';`, { targetCase, openPassportReminder, openHkicReminder }), "2");
  assert.equal(query(`SELECT r.state='CANCELED' AND EXISTS (
      SELECT 1 FROM identity.journey_station_notices WHERE reminder_id=:'newReminder'::uuid
    ) FROM identity.journey_station_reminders r WHERE r.reminder_id=:'replayReminder'::uuid;`,
  { newReminder, replayReminder }), "t");

  const openTimeline = JSON.parse(inFamily(`
    SELECT COALESCE(jsonb_agg(to_jsonb(row)),'[]'::jsonb)
    FROM identity.list_journey_stay_timeline(:'familyId'::uuid,:'openTargetCase'::uuid,:'principalId'::uuid,10) row;`, {
    openTargetCase,
  }));
  assert.deepEqual(openTimeline, []);
  const readProfile = () => inFamily(`
    SELECT COALESCE(identity.read_journey_member_profile(:'actor'::uuid,NULL,
      ARRAY[:'targetCase'::uuid,:'openTargetCase'::uuid])::text,'null');`, { targetCase, openTargetCase });
  const openProfile = JSON.parse(readProfile());
  const openStage = openProfile.episodes.find(row => row.path === "HK_PERMANENT_RESIDENT");
  assert.equal(openStage?.stayTerm, "NO_FIXED_EXPIRY");
  assert.equal(openStage?.milestones.some(row => row.kind === "STAY_EXPIRY"), false);
  assert.equal(JSON.stringify(openProfile).includes(openTargetCase), false);

  // The same decision is idempotent even when the caller supplies fresh UUIDs.
  assert.equal(inAdvisor(`SELECT COALESCE((SELECT identity.apply_journey_episode_transition(
      :'decision'::uuid,:'replayEpisode'::uuid,NULL,NULL,ARRAY[]::smallint[],ARRAY[]::uuid[]))::text,'null');`, {
    decision: openDecision, replayEpisode: openReplayEpisode,
  }), openEpisode);
  assert.equal(query(`SELECT count(*) FROM identity.journey_episodes WHERE identity_case_id=:'openTargetCase'::uuid;`, {
    openTargetCase,
  }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders WHERE identity_case_id=:'openTargetCase'::uuid;`, {
    openTargetCase,
  }), "0");

  // Revoking the decision document removes the optional no-expiry projection;
  // it never fabricates an expiry or leaves a stale status assertion visible.
  const withdrawEvidence = () => query(
    `UPDATE docs.documents SET withdrawn_at=clock_timestamp() WHERE document_id=:'openDocument'::uuid;`,
    { openDocument },
  );
  if (verifyProfile) {
    await verifyProfile({ readProfile, withdrawEvidence });
  } else {
    withdrawEvidence();
  }
  const revokedProfile = JSON.parse(readProfile());
  const revokedStage = revokedProfile.episodes.find(row => row.startedOn === today);
  assert.equal(revokedStage?.path, null);
  assert.equal(Object.hasOwn(revokedStage, "stayTerm"), false);

  console.log("PASS STUDENT→IANG episode transition, dual-case advisor scope, evidence denial, Family timeline, stage cancellation, independent passport/travel/HKIC queues, immutable receipt, idempotent replay and due notice publication");
  console.log("PASS applied decision without fixed expiry, withdrawal removes status claim, no synthetic expiry or renewal reminder, independent document reminders persist");
}
