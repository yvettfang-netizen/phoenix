import assert from "node:assert/strict";
import { runStationReminderBatch } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-reminder-worker.ts";

/*
 * Review plans are applicant-agreed dates, not policy eligibility decisions.
 * This verifier owns a disposable NEW_CIES case but reuses the worker fixture's
 * adult family, subject and FAMILY principal.  The plan host locks two
 * independent synthetic grants in the same transaction as the invoker-rights
 * save/publish calls; neither grant is a production authorization primitive.
 */
export async function verifyReviewPlans({ query, recipient }) {
  const actor = "01910000-0000-7000-8100-000000000002";
  const familyContext = { principal: recipient.principalId, person: actor, channel: "FAMILY" };
  const id = sequence => `01910000-0000-7000-8500-${String(sequence).padStart(12, "0")}`;

  const journeyCase = id(8500);
  const episode = id(8501);
  const revision = id(8502);
  const dueReminder = id(8503);
  const pendingReminder = id(8504);
  const stalePrior = id(8506);
  const foreignRevision = id(8507);
  const residenceRevision = id(8508);
  const residenceReminder = id(8509);
  const rescheduledRevision = id(8510);
  const rescheduledDueReminder = id(8511);
  const rescheduledPendingReminder = id(8512);
  const wrongJob = id(8513);

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

  const inFamily = (statement, values = {}) => inContext(familyContext, statement, values);
  const authorityJoin = `
    FROM identity_journey_test.review_plan_authority plan
    JOIN identity_journey_test.station_grant station
      ON station.identity_case_id = plan.identity_case_id
      AND station.family_id = plan.family_id
      AND station.subject_person_id = plan.subject_person_id
      AND station.recipient_principal_id = plan.recipient_principal_id
    WHERE plan.identity_case_id = :'caseId'::uuid
      AND plan.family_id = :'familyId'::uuid
      AND plan.subject_person_id = :'actor'::uuid
      AND plan.recipient_principal_id = :'principalId'::uuid
      AND plan.purpose = 'IDENTITY_REMINDER'
      AND plan.revoked_at IS NULL AND plan.expires_at > clock_timestamp()
      AND station.withdrawn_at IS NULL AND station.expires_at > clock_timestamp()`;

  // Keep the plan grant independent from the station grant.  Both rows are
  // locked before a private Canonical function is called.
  query(`CREATE TABLE identity_journey_test.review_plan_authority (
      identity_case_id uuid NOT NULL REFERENCES identity.cases,
      family_id uuid NOT NULL REFERENCES core.families,
      subject_person_id uuid NOT NULL REFERENCES core.people,
      recipient_principal_id uuid NOT NULL REFERENCES auth.principals,
      purpose text NOT NULL CHECK (purpose = 'IDENTITY_REMINDER'),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      PRIMARY KEY (identity_case_id, recipient_principal_id, purpose)
    );
    INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
      VALUES(:'journeyCase'::uuid,:'familyId'::uuid,:'actor'::uuid,'NEW_CIES','UNDER_REVIEW');
    INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
      VALUES(:'episode'::uuid,:'journeyCase'::uuid,
        (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date - 14,:'principalId'::uuid);
    INSERT INTO identity_journey_test.station_grant
      (identity_case_id,family_id,subject_person_id,recipient_principal_id,expires_at)
      VALUES(:'journeyCase'::uuid,:'familyId'::uuid,:'actor'::uuid,:'principalId'::uuid,
        clock_timestamp()+interval '1 day');
    INSERT INTO identity_journey_test.review_plan_authority
      (identity_case_id,family_id,subject_person_id,recipient_principal_id,purpose,expires_at)
      VALUES(:'journeyCase'::uuid,:'familyId'::uuid,:'actor'::uuid,:'principalId'::uuid,
        'IDENTITY_REMINDER',clock_timestamp()+interval '1 day');`,
  { ...recipient, actor, journeyCase, episode });

  assert.equal(query(`SELECT c.case_kind='NEW_CIES' AND c.status <> 'CLOSED'
      AND e.ended_before IS NULL AND e.started_on <= (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date
    FROM identity.cases c JOIN identity.journey_episodes e USING(identity_case_id)
    WHERE c.identity_case_id=:'journeyCase'::uuid AND e.episode_id=:'episode'::uuid;`,
  { journeyCase, episode }), "t");
  assert.equal(query(`SELECT to_regprocedure(
    'identity.save_journey_review_plan(uuid,uuid,uuid,uuid,text,date,smallint[],uuid[])') IS NOT NULL;`), "t");
  assert.equal(query(`SELECT has_function_privilege('phoenix_canonical_app',
    'identity.save_journey_review_plan(uuid,uuid,uuid,uuid,text,date,smallint[],uuid[])', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_reader',
    'identity.save_journey_review_plan(uuid,uuid,uuid,uuid,text,date,smallint[],uuid[])', 'EXECUTE');`), "f");

  const today = query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD');");
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const target = addDays(today, 7);
  const rescheduledTarget = addDays(today, 37);
  const residenceTarget = addDays(today, 61);

  function savePlan({ caseId = journeyCase, episodeId = episode, revisionId, prior = null,
    kind, targetOn, offsets, jobs }) {
    const priorExpression = prior ? ":'prior'::uuid" : "NULL";
    const offsetExpression = offsets.length ? `ARRAY[${offsets.join(",")}]::smallint[]` : "ARRAY[]::smallint[]";
    const jobExpression = jobs.length
      ? `ARRAY[${jobs.map((_, index) => `:'job${index}'::uuid`).join(",")}]::uuid[]`
      : "ARRAY[]::uuid[]";
    return inFamily(`
      WITH authorized AS MATERIALIZED (
        SELECT 1 ${authorityJoin} FOR SHARE OF plan, station
      )
      SELECT COALESCE((SELECT identity.save_journey_review_plan(
        :'caseId'::uuid,:'episodeId'::uuid,:'revision'::uuid,${priorExpression},
        :'kind',:'targetOn'::date,${offsetExpression},${jobExpression})
        FROM authorized)::text, 'null');`, {
      ...recipient, actor, caseId, episodeId, revision: revisionId, prior: prior ?? "",
      kind, targetOn, ...Object.fromEntries(jobs.map((job, index) => [`job${index}`, job])),
    });
  }

  const firstSave = savePlan({ revisionId: revision, kind: "INVESTMENT_REVIEW", targetOn: target,
    offsets: [7, 1], jobs: [dueReminder, pendingReminder] });
  assert.equal(firstSave, revision);
  assert.equal(query(`SELECT date_kind='INVESTMENT_REVIEW' AND date_basis='INTERNAL'
      AND verification='REPORTED' AND official_fact_id IS NULL AND document_id IS NULL
      AND target_on=:'target'::date AND identity_case_id=:'journeyCase'::uuid
      AND episode_id=:'episode'::uuid AND supersedes_id IS NULL
    FROM identity.journey_date_revisions WHERE date_revision_id=:'revision'::uuid;`,
  { target, journeyCase, episode, revision }), "t");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
      WHERE date_revision_id=:'revision'::uuid AND target_on=:'target'::date
        AND offset_days IN (7,1) AND state='PENDING'
        AND send_on IN (:'target'::date - 7, :'target'::date - 1);`,
  { revision, target }), "2");

  // Exact replay is idempotent and does not accept a different queue plan.
  assert.equal(savePlan({ revisionId: revision, kind: "INVESTMENT_REVIEW", targetOn: target,
    offsets: [7, 1], jobs: [wrongJob, id(8514)] }), revision);
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE identity_case_id=:'journeyCase'::uuid AND episode_id=:'episode'::uuid
        AND date_kind='INVESTMENT_REVIEW';`, { journeyCase, episode }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
      WHERE date_revision_id=:'revision'::uuid;`, { revision }), "2");

  // The second allowed kind is also an agreed internal date on an open case;
  // it is deliberately not derived from a policy rule or eligibility engine.
  assert.equal(savePlan({ revisionId: residenceRevision, kind: "PERMANENT_RESIDENCE_PREPARATION",
    targetOn: residenceTarget, offsets: [60], jobs: [residenceReminder] }), residenceRevision);
  assert.equal(query(`SELECT date_kind='PERMANENT_RESIDENCE_PREPARATION' AND date_basis='INTERNAL'
      AND verification='REPORTED' AND official_fact_id IS NULL AND document_id IS NULL
      AND target_on=:'target'::date
    FROM identity.journey_date_revisions WHERE date_revision_id=:'revision'::uuid;`,
  { target: residenceTarget, revision: residenceRevision }), "t");

  // A stale head, a mismatched case/episode scope and a withdrawn grant all
  // fail closed before a new revision can be appended.
  assert.equal(savePlan({ revisionId: stalePrior, prior: stalePrior, kind: "INVESTMENT_REVIEW",
    targetOn: addDays(target, 1), offsets: [1], jobs: [id(8515)] }), "null");
  assert.equal(savePlan({ caseId: recipient.caseId, revisionId: foreignRevision,
    kind: "INVESTMENT_REVIEW", targetOn: addDays(target, 2), offsets: [1], jobs: [id(8516)] }), "null");
  // Even if an untrusted caller skips the host-grant wrapper, the Canonical
  // function independently rejects a worker case paired with this episode.
  assert.equal(inFamily(`SELECT COALESCE(identity.save_journey_review_plan(
      :'caseId'::uuid,:'episodeId'::uuid,:'revision'::uuid,NULL,'INVESTMENT_REVIEW',
      :'targetOn'::date,ARRAY[1]::smallint[],ARRAY[:'job'::uuid]::uuid[])::text,'null');`, {
    caseId: recipient.caseId, episodeId: episode, revision: id(8521), targetOn: addDays(target, 2), job: id(8522),
  }), "null");
  query(`UPDATE identity_journey_test.review_plan_authority SET revoked_at=clock_timestamp()
    WHERE identity_case_id=:'journeyCase'::uuid;`, { journeyCase });
  assert.equal(savePlan({ revisionId: id(8517), prior: revision, kind: "INVESTMENT_REVIEW", targetOn: addDays(target, 3),
    offsets: [1], jobs: [id(8518)] }), "null");
  query(`UPDATE identity_journey_test.review_plan_authority SET revoked_at=NULL
    WHERE identity_case_id=:'journeyCase'::uuid;`, { journeyCase });

  // The due job is exercised through the actual worker and SQL claim/publish
  // functions. Both independent grants are checked and locked before publish.
  const queue = {
    async claimDue(limit) {
      const claims = JSON.parse(query(`SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'reminderId',reminder_id,'recipientPrincipalId',recipient_principal_id,
        'revisionId',revision_id,'claimToken',claim_token)), '[]')
        FROM identity.claim_journey_station_reminders(:'limit'::integer);`, { limit }));
      for (const claim of claims) assert.ok([dueReminder].includes(claim.reminderId),
        `unexpected due reminder ${claim.reminderId}`);
      return claims;
    },
    async publishWithAuthorization(claim) {
      return query(`BEGIN;
        SET LOCAL statement_timeout='4s';
        WITH authorized AS MATERIALIZED (
          SELECT 1
          FROM identity.journey_station_reminders r
          JOIN identity.cases c USING(identity_case_id)
          JOIN identity_journey_test.review_plan_authority plan
            ON plan.identity_case_id=c.identity_case_id
            AND plan.family_id=c.family_id
            AND plan.subject_person_id=c.subject_person_id
            AND plan.recipient_principal_id=r.recipient_principal_id
          JOIN identity_journey_test.station_grant station
            ON station.identity_case_id=plan.identity_case_id
            AND station.family_id=plan.family_id
            AND station.subject_person_id=plan.subject_person_id
            AND station.recipient_principal_id=plan.recipient_principal_id
          WHERE plan.identity_case_id=:'caseId'::uuid
            AND plan.family_id=:'familyId'::uuid
            AND plan.subject_person_id=:'actor'::uuid
            AND plan.recipient_principal_id=:'recipientPrincipalId'::uuid
            AND plan.purpose='IDENTITY_REMINDER'
            AND plan.revoked_at IS NULL AND plan.expires_at > clock_timestamp()
            AND station.withdrawn_at IS NULL AND station.expires_at > clock_timestamp()
            AND r.reminder_id=:'reminderId'::uuid AND r.recipient_principal_id=:'recipientPrincipalId'::uuid
            AND r.date_revision_id=:'revisionId'::uuid
          FOR SHARE OF plan, station
        )
        SELECT CASE WHEN EXISTS (SELECT 1 FROM authorized)
          THEN identity.publish_journey_station_notice(
            :'reminderId'::uuid,:'recipientPrincipalId'::uuid,:'revisionId'::uuid,:'claimToken'::uuid)
          ELSE 'AUTHORIZATION_DENIED' END;
        COMMIT;`, { ...claim, caseId: journeyCase, familyId: recipient.familyId, actor });
    },
    async deferWithBackoff(claim) {
      return query(`SELECT identity.retry_journey_station_reminder(
        :'reminderId'::uuid,:'revisionId'::uuid,:'claimToken'::uuid);`, claim) === "t";
    },
  };

  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders r
      WHERE r.state IN ('PENDING','RETRY') AND r.send_on <= (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date
        AND r.reminder_id=:'reminder'::uuid;`, { reminder: dueReminder }), "1");
  query(`UPDATE identity_journey_test.station_grant SET withdrawn_at=clock_timestamp()
    WHERE identity_case_id=:'journeyCase'::uuid;
    UPDATE identity_journey_test.review_plan_authority SET revoked_at=clock_timestamp()
    WHERE identity_case_id=:'journeyCase'::uuid;`, { journeyCase });
  const denied = await runStationReminderBatch(queue, 1);
  assert.deepEqual(denied, { claimed: 1, delivered: 0, alreadyDelivered: 0,
    denied: 1, deferred: 1, skipped: 0, deferredWriteFailed: 0 });
  assert.equal(query(`SELECT state='RETRY' AND claim_token IS NULL FROM identity.journey_station_reminders
    WHERE reminder_id=:'reminder'::uuid;`, { reminder: dueReminder }), "t");

  query(`UPDATE identity_journey_test.station_grant SET withdrawn_at=NULL
    WHERE identity_case_id=:'journeyCase'::uuid;
    UPDATE identity_journey_test.review_plan_authority SET revoked_at=NULL
    WHERE identity_case_id=:'journeyCase'::uuid;
    UPDATE identity.journey_station_reminders SET retry_not_before=clock_timestamp()-interval '1 second'
    WHERE reminder_id=:'reminder'::uuid;`, { journeyCase, reminder: dueReminder });
  const delivered = await runStationReminderBatch(queue, 1);
  assert.deepEqual(delivered, { claimed: 1, delivered: 1, alreadyDelivered: 0,
    denied: 0, deferred: 0, skipped: 0, deferredWriteFailed: 0 });
  assert.equal(query(`SELECT state='DELIVERED' AND delivered_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM identity.journey_station_notices n WHERE n.reminder_id=r.reminder_id)
    FROM identity.journey_station_reminders r WHERE r.reminder_id=:'reminder'::uuid;`,
  { reminder: dueReminder }), "t");

  const notices = JSON.parse(inFamily(`
    WITH authorized AS MATERIALIZED (
      SELECT 1 ${authorityJoin} FOR SHARE OF plan, station
    )
    SELECT COALESCE((SELECT jsonb_agg(to_jsonb(n))
      FROM authorized CROSS JOIN LATERAL identity.list_journey_station_notices(
        :'familyId'::uuid,:'caseId'::uuid,:'principalId'::uuid,50) n), '[]');`,
  { caseId: journeyCase }));
  assert.equal(notices.length, 1);
  assert.equal(notices[0].notice_id, dueReminder);
  const readAt = inFamily(`
    WITH authorized AS MATERIALIZED (
      SELECT 1 ${authorityJoin} FOR SHARE OF plan, station
    )
    SELECT identity.acknowledge_journey_station_notice(
      :'familyId'::uuid,:'caseId'::uuid,:'principalId'::uuid,:'noticeId'::uuid)
    FROM authorized;`, { caseId: journeyCase, noticeId: dueReminder });
  assert.ok(Number.isFinite(Date.parse(readAt)));
  assert.equal(inFamily(`
    WITH authorized AS MATERIALIZED (
      SELECT 1 ${authorityJoin} FOR SHARE OF plan, station
    )
    SELECT identity.acknowledge_journey_station_notice(
      :'familyId'::uuid,:'caseId'::uuid,:'principalId'::uuid,:'noticeId'::uuid)
    FROM authorized;`, { caseId: journeyCase, noticeId: dueReminder }), readAt);
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_notice_reads
    WHERE reminder_id=:'reminder'::uuid;`, { reminder: dueReminder }), "1");

  // Rescheduling with the exact current head cancels only the pending old
  // reminder. The delivered receipt remains attached to its original date.
  assert.equal(savePlan({ revisionId: rescheduledRevision, prior: revision,
    kind: "INVESTMENT_REVIEW", targetOn: rescheduledTarget, offsets: [7, 1],
    jobs: [rescheduledDueReminder, rescheduledPendingReminder] }), rescheduledRevision);
  assert.equal(query(`SELECT state='CANCELED' FROM identity.journey_station_reminders
      WHERE reminder_id=:'pending'::uuid;`, { pending: pendingReminder }), "t");
  assert.equal(query(`SELECT state='DELIVERED' FROM identity.journey_station_reminders
      WHERE reminder_id=:'delivered'::uuid;`, { delivered: dueReminder }), "t");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
      WHERE date_revision_id=:'revision'::uuid AND state='PENDING';`, { revision: rescheduledRevision }), "2");
  assert.equal(savePlan({ revisionId: rescheduledRevision, prior: revision,
    kind: "INVESTMENT_REVIEW", targetOn: rescheduledTarget, offsets: [7, 1],
    jobs: [id(8519), id(8520)] }), rescheduledRevision);
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE identity_case_id=:'journeyCase'::uuid AND episode_id=:'episode'::uuid
        AND date_kind='INVESTMENT_REVIEW';`, { journeyCase, episode }), "2");

  // The member-facing projection carries no internal case, episode, revision,
  // reminder or grant identifiers, and review plans do not imply eligibility.
  const profile = inFamily(`SELECT identity.read_journey_member_profile(
    :'actor'::uuid,NULL,ARRAY[:'caseId'::uuid]);`, { caseId: journeyCase });
  assert.ok(profile && profile !== "null");
  assert.deepEqual(JSON.parse(profile).episodes.flatMap(item => item.milestones)
    .map(date => [date.kind, date.on, date.basis, date.verification, date.current]), [
    ["PERMANENT_RESIDENCE_PREPARATION", residenceTarget, "INTERNAL", "REPORTED", true],
    ["INVESTMENT_REVIEW", rescheduledTarget, "INTERNAL", "REPORTED", true],
    ["INVESTMENT_REVIEW", target, "INTERNAL", "REPORTED", false],
  ]);
  for (const internalId of [journeyCase, episode, revision, rescheduledRevision,
    dueReminder, pendingReminder, residenceRevision, residenceReminder]) {
    assert.equal(profile.includes(internalId), false, `profile leaked ${internalId}`);
  }
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
      WHERE identity_case_id=:'journeyCase'::uuid AND date_kind IN
        ('INVESTMENT_REVIEW','PERMANENT_RESIDENCE_PREPARATION')
        AND (official_fact_id IS NOT NULL OR document_id IS NOT NULL);`, { journeyCase }), "0");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
      WHERE identity_case_id=:'journeyCase'::uuid
        AND state IN ('PENDING','RETRY')
        AND send_on <= (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;`, { journeyCase }), "0");
  console.log("PASS review-plan actual-date recording, NEW_CIES scope, independent reminder grants, SQL worker claim/publish, receipt acknowledgement, replay, reschedule and projection redaction");
}
