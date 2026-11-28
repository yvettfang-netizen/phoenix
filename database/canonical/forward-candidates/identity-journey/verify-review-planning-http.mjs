import assert from "node:assert/strict";
import { handleIdentityProfile } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile.ts";
import { identityProfilePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile-contract.ts";
import { handleIdentityReviewPlanning } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-review-planning.ts";
import { identityReviewPlanningPath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-review-planning-contract.ts";

/*
 * HTTP acceptance for the member-facing review-planning adapter.
 * The fixture uses the NEW_CIES case and the two disposable grants created by
 * verifyReviewPlans. UUIDs remain inside this trusted resolver; the browser
 * receives only opaque member and plan references.
 */
export async function verifyReviewPlanningHttp({ query, recipient, authConfig, browser }) {
  assert.ok(authConfig?.origin, "review-planning HTTP verification needs CI auth");

  const actor = "01910000-0000-7000-8100-000000000002";
  const id = sequence => `01910000-0000-7000-8500-${String(sequence).padStart(12, "0")}`;
  const journeyCase = id(8500);
  const episode = id(8501);
  const currentRevision = id(8523);
  const apiRevision = id(8530);
  const apiReminder = id(8531);
  const browserRevision = id(8533);
  const browserDueReminder = id(8534);
  const browserPendingReminder = id(8535);

  const memberRef = "member_review_self_00000000000000000000";
  const guardianRef = "member_review_guardian_000000000000000";
  // One opaque reference is issued per expected revision.  None embeds a UUID.
  const initialPlanRef = "plan_review_initial_000000000000000000";
  const apiPlanRef = "plan_review_api_000000000000000000000000";
  const browserPlanRef = "plan_review_browser_00000000000000000000";
  const planRefByRevision = new Map([
    [currentRevision, initialPlanRef],
    [apiRevision, apiPlanRef],
    [browserRevision, browserPlanRef],
  ]);

  const origin = authConfig.origin;
  const events = [];
  let authActive = true;
  let expireDuringList = false;

  const session = () => authActive ? {
    id: "ci-only-account", username: "fixture", token_hash: "ci-only-session",
    created_at: Date.now() - 1000, valid_until: Date.now() + 60_000,
  } : null;
  const localAuthConfig = {
    ...authConfig, origin,
    async verifySession() { return session(); },
    async recordAccess(actorId, action, requestId) {
      events.push({ actorId, action, requestId });
      await authConfig.recordAccess?.(actorId, action, requestId);
    },
  };

  const lastLine = value => String(value ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(Boolean).at(-1) ?? "";
  const familyContext = { principal: recipient.principalId, person: actor, channel: "FAMILY" };
  function inFamily(statement, values = {}) {
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
  const activeAuthority = () => query(`SELECT EXISTS (SELECT 1 ${authorityJoin});`, {
    ...recipient, actor, caseId: journeyCase,
  }) === "t";

  function currentPlan() {
    const raw = query(`SELECT COALESCE((SELECT jsonb_build_object(
        'revisionId',r.date_revision_id,'prior',r.supersedes_id,
        'on',to_char(r.target_on,'YYYY-MM-DD'),
        'offsets',COALESCE((SELECT jsonb_agg(x.offset_days ORDER BY x.offset_days DESC)
          FROM identity.journey_station_reminders x
          WHERE x.date_revision_id=r.date_revision_id AND x.state <> 'CANCELED'), '[]'::jsonb),
        'jobs',COALESCE((SELECT jsonb_agg(x.reminder_id ORDER BY x.offset_days DESC)
          FROM identity.journey_station_reminders x
          WHERE x.date_revision_id=r.date_revision_id AND x.state <> 'CANCELED'), '[]'::jsonb)
      ) FROM identity.journey_date_revisions r
      WHERE r.identity_case_id=:'caseId'::uuid AND r.episode_id=:'episodeId'::uuid
        AND r.date_kind='INVESTMENT_REVIEW'
        AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions successor
          WHERE successor.supersedes_id=r.date_revision_id)), '{}'::jsonb);`, {
      caseId: journeyCase, episodeId: episode,
    });
    const parsed = JSON.parse(raw || "{}");
    return parsed.revisionId ? {
      revisionId: parsed.revisionId, prior: parsed.prior, on: parsed.on,
      offsets: Array.isArray(parsed.offsets) ? parsed.offsets.map(Number) : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    } : null;
  }

  const initial = currentPlan();
  assert.ok(initial, "review-plans verifier must leave an investment review head");
  assert.equal(initial.revisionId, currentRevision);
  // The delivered seven-day notice remains on id(8502); only the pending
  // one-day offset is attached to current id(8523).
  assert.deepEqual(initial.offsets, [1]);
  assert.deepEqual(initial.jobs, [id(8525)]);
  const initialOn = initial.on;
  const addDays = (date, days) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const apiSaveOn = addDays(initialOn, 7);
  const browserSaveOn = addDays(initialOn, 21);

  const lockAndList = () => {
    const head = currentPlan();
    if (!head) return "[]";
    const publicRef = planRefByRevision.get(head.revisionId);
    assert.ok(publicRef, `missing opaque plan reference for ${head.revisionId}`);
    return inFamily(`
      WITH locked_scope AS MATERIALIZED (SELECT 1 ${authorityJoin} FOR SHARE OF plan, station)
      SELECT COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'ref',:'planRef','kind',r.date_kind,'path',c.case_kind,
          'startedOn',to_char(e.started_on,'YYYY-MM-DD'),
          'currentOn',to_char(r.target_on,'YYYY-MM-DD'),
          'offsets',COALESCE((SELECT jsonb_agg(rem.offset_days ORDER BY rem.offset_days DESC)
            FROM identity.journey_station_reminders rem
            WHERE rem.date_revision_id=r.date_revision_id AND rem.state <> 'CANCELED'), '[]'::jsonb)
        )) FROM locked_scope
        JOIN identity.journey_date_revisions r ON r.identity_case_id=:'caseId'::uuid
          AND r.episode_id=:'episodeId'::uuid AND r.date_kind='INVESTMENT_REVIEW'
          AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions successor
            WHERE successor.supersedes_id=r.date_revision_id)
        JOIN identity.journey_episodes e ON e.episode_id=r.episode_id
        JOIN identity.cases c ON c.identity_case_id=r.identity_case_id), '[]'::jsonb);`, {
      caseId: journeyCase, episodeId: episode, planRef: publicRef,
    });
  };

  // The Canonical function owns episode-first locking and current-head
  // validation. The adapter only locks its two exact grants in this
  // transaction; it deliberately does not pre-lock a stale prior revision.
  const saveSql = ({ expectedPrior, revision, prior = expectedPrior, targetOn, offsets, jobs }) => {
    const offsetExpression = offsets.length ? `ARRAY[${offsets.join(",")}]::smallint[]` : "ARRAY[]::smallint[]";
    const jobExpression = jobs.length
      ? `ARRAY[${jobs.map((_, index) => `:'job${index}'::uuid`).join(",")}]::uuid[]`
      : "ARRAY[]::uuid[]";
    const variables = {
      caseId: journeyCase, episodeId: episode, expectedPrior, revision,
      targetOn, prior, ...Object.fromEntries(jobs.map((job, index) => [`job${index}`, job])),
    };
    return inFamily(`
      WITH locked_scope AS MATERIALIZED (SELECT 1 ${authorityJoin} FOR SHARE OF plan, station),
      current_head AS MATERIALIZED (
        SELECT r.date_revision_id
        FROM identity.journey_date_revisions r
        WHERE r.identity_case_id=:'caseId'::uuid AND r.episode_id=:'episodeId'::uuid
          AND r.date_kind='INVESTMENT_REVIEW'
          AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions successor
            WHERE successor.supersedes_id=r.date_revision_id)
      )
      SELECT CASE WHEN EXISTS (SELECT 1 FROM locked_scope)
        AND EXISTS (SELECT 1 FROM current_head WHERE date_revision_id=:'expectedPrior'::uuid)
        THEN COALESCE((SELECT identity.save_journey_review_plan(
          :'caseId'::uuid,:'episodeId'::uuid,:'revision'::uuid,
          NULLIF(:'prior','')::uuid,'INVESTMENT_REVIEW',:'targetOn'::date,
          ${offsetExpression},${jobExpression})::text
          FROM locked_scope CROSS JOIN current_head), 'CONFLICT')
        ELSE 'DENIED' END;`, variables);
  };

  // requestRef is a fixture-side idempotency binding, not a second database
  // identity.  It prevents a caller from replaying a request token with a
  // changed date/offset payload while the SQL revision remains the source of
  // truth for actual persistence.
  const requestBindings = new Map();
  const payloadSignature = change => JSON.stringify([change.planRef, change.on, change.offsets]);

  const scopeFor = (boundSession, requestedRef) => {
    if (!boundSession || boundSession.customerId !== "ci-only-account" ||
      boundSession.sessionHash !== "ci-only-session" || requestedRef !== memberRef) return null;
    return {
      async assertCurrent() { return activeAuthority(); },
      async listAuthorized() {
        const result = lockAndList();
        if (expireDuringList) authActive = false;
        return result ? JSON.parse(result) : null;
      },
      async saveAuthorized(change) {
        if (!activeAuthority()) return "DENIED";
        const binding = requestBindings.get(change.requestRef);
        if (binding && binding.signature !== payloadSignature(change)) return "CONFLICT";

        const head = currentPlan();
        if (!head) return "DENIED";
        const headRef = planRefByRevision.get(head.revisionId);

        // Exact request replay is allowed against the revision it created,
        // even though a successful save causes list() to issue a new ref.
        if (binding) {
          if (binding.revision !== head.revisionId) return "CONFLICT";
          const replay = saveSql({
            expectedPrior: binding.revision,
            revision: binding.revision, prior: binding.prior,
            targetOn: binding.on,
            offsets: binding.offsets,
            jobs: binding.jobs,
          });
          return replay === binding.revision ? "SAVED" : replay === "DENIED" ? "DENIED" : "CONFLICT";
        }
        if (change.planRef !== headRef) return "CONFLICT";
        const offsets = [...new Set(change.offsets)].sort((left, right) => right - left);
        if (head.revisionId === currentRevision && change.on === apiSaveOn && offsets.join(",") === "1") {
          const saved = saveSql({ expectedPrior: head.revisionId, revision: apiRevision, prior: head.revisionId,
            targetOn: apiSaveOn, offsets: [1], jobs: [apiReminder] });
          if (saved === apiRevision) {
            requestBindings.set(change.requestRef, {
              signature: payloadSignature(change), revision: apiRevision,
              prior: head.revisionId, on: apiSaveOn, offsets: [1], jobs: [apiReminder],
            });
            return "SAVED";
          }
          return saved === "DENIED" ? "DENIED" : "CONFLICT";
        }
        if (head.revisionId === apiRevision && change.on === browserSaveOn && offsets.join(",") === "7,1") {
          const saved = saveSql({ expectedPrior: head.revisionId, revision: browserRevision, prior: head.revisionId,
            targetOn: browserSaveOn, offsets: [7, 1], jobs: [browserDueReminder, browserPendingReminder] });
          if (saved === browserRevision) {
            requestBindings.set(change.requestRef, {
              signature: payloadSignature(change), revision: browserRevision,
              prior: head.revisionId, on: browserSaveOn, offsets: [7, 1], jobs: [browserDueReminder, browserPendingReminder],
            });
            return "SAVED";
          }
          return saved === "DENIED" ? "DENIED" : "CONFLICT";
        }
        return "CONFLICT";
      },
    };
  };

  const planningProvider = { async resolveSelf(boundSession, requestedRef) {
    return scopeFor(boundSession, requestedRef);
  } };
  const profileProvider = {
    async resolveRoster(boundSession) {
      if (boundSession.customerId !== "ci-only-account" || boundSession.sessionHash !== "ci-only-session") return null;
      return {
        async assertCurrent() { return activeAuthority(); },
        async listAuthorized() {
          return [
            { ref: memberRef, label: "本人", access: "SELF" },
            { ref: guardianRef, label: "已授权监护成员", access: "GUARDIAN" },
          ];
        },
      };
    },
    async resolveMember(boundSession, requestedRef) {
      if (boundSession.customerId !== "ci-only-account" || boundSession.sessionHash !== "ci-only-session") return null;
      if (requestedRef === memberRef) {
        return {
          async assertCurrent() { return activeAuthority(); },
          async readAuthorized() {
            const result = inFamily(`SELECT identity.read_journey_member_profile(
              :'actor'::uuid,NULL,ARRAY[:'caseId'::uuid]);`, { caseId: journeyCase });
            return JSON.parse(result || "null");
          },
        };
      }
      if (requestedRef === guardianRef) {
        return {
          async assertCurrent() { return activeAuthority(); },
          async readAuthorized() { return { episodes: [] }; },
        };
      }
      return null;
    },
  };
  const planningEnv = {
    FAMILY_IDENTITY_PROFILE_ENABLED: "true",
    FAMILY_IDENTITY_PROFILE_PROVIDER: profileProvider,
    FAMILY_IDENTITY_REVIEW_PLANNING_ENABLED: "true",
    FAMILY_IDENTITY_REVIEW_PLANNING_PROVIDER: planningProvider,
  };
  const profileEnv = {
    FAMILY_IDENTITY_PROFILE_ENABLED: "true",
    FAMILY_IDENTITY_PROFILE_PROVIDER: profileProvider,
  };

  const planningRequest = (body, {
    urlOrigin = origin, headerOrigin = origin, env = planningEnv, config = localAuthConfig,
  } = {}) => handleIdentityReviewPlanning(new Request(urlOrigin + identityReviewPlanningPath, {
    method: "POST", headers: { origin: headerOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  }), env, config);
  const listBody = (ref = memberRef) => ({ action: "list", memberRef: ref });
  const saveBody = (selectedPlanRef, date, offsets, requestRef = crypto.randomUUID()) => ({
    action: "save", memberRef, planRef: selectedPlanRef, on: date,
    offsets, confirmed: true, requestRef,
  });
  async function json(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  const errorCode = body => body?.error?.code;

  // Flag, profile dependency, origin and session boundaries fail closed.
  assert.equal((await planningRequest(listBody(), {
    env: { ...planningEnv, FAMILY_IDENTITY_REVIEW_PLANNING_ENABLED: "false" },
  })).status, 404);
  assert.equal((await planningRequest(listBody(), {
    env: { ...planningEnv, FAMILY_IDENTITY_PROFILE_ENABLED: "false" },
  })).status, 404);
  assert.equal((await planningRequest(listBody(), {
    headerOrigin: "https://cross-origin.invalid",
  })).status, 403);
  assert.equal((await planningRequest(listBody(), {
    config: { ...localAuthConfig, async verifySession() { return null; } },
  })).status, 401);

  const malformed = await planningRequest(saveBody(initialPlanRef, apiSaveOn, [13]));
  assert.equal(malformed.status, 400);
  assert.equal(errorCode(await json(malformed)), "INVALID_PLAN_REQUEST");

  const listed = await planningRequest(listBody());
  assert.equal(listed.status, 200);
  assert.equal(listed.headers.get("cache-control"), "private, no-store");
  const publicList = await json(listed);
  assert.deepEqual(Object.keys(publicList), ["options"]);
  assert.equal(publicList.options.length, 1);
  assert.deepEqual(Object.keys(publicList.options[0]).sort(),
    ["currentOn", "kind", "offsets", "path", "ref", "startedOn"]);
  assert.deepEqual(publicList.options[0].offsets, [1]);
  assert.equal(publicList.options[0].ref, initialPlanRef);
  assert.equal(publicList.options[0].currentOn, initialOn);
  const serializedList = JSON.stringify(publicList);
  for (const internalId of [journeyCase, episode, currentRevision, id(8502), id(8510), apiRevision,
    browserRevision, recipient.familyId]) {
    assert.equal(serializedList.includes(internalId), false, `review planning response leaked ${internalId}`);
  }

  // Guardian and forged references cannot enter a SELF scope.
  assert.equal((await planningRequest(listBody(guardianRef))).status, 403);
  assert.equal((await planningRequest(listBody("member_forged_scope_00000000000000000000"))).status, 403);
  assert.equal((await planningRequest({ ...listBody(), memberRef: "not-a-member-ref" })).status, 400);

  // API save at +7 uses the current one-day reminder; exact retry is accepted
  // by the SQL revision, while reusing the request token with changed data is
  // rejected by the fixture-side idempotency binding.
  const apiRequestRef = crypto.randomUUID();
  const apiSave = await planningRequest(saveBody(initialPlanRef, apiSaveOn, [1], apiRequestRef));
  assert.equal(apiSave.status, 200);
  assert.deepEqual(await json(apiSave), { status: "SAVED" });
  const apiReplay = await planningRequest(saveBody(initialPlanRef, apiSaveOn, [1], apiRequestRef));
  assert.equal(apiReplay.status, 200);
  assert.deepEqual(await json(apiReplay), { status: "SAVED" });
  const changedRequest = await planningRequest(saveBody(initialPlanRef, apiSaveOn, [7, 1], apiRequestRef));
  assert.equal(changedRequest.status, 409);
  assert.equal(errorCode(await json(changedRequest)), "PLAN_STALE");
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
    WHERE date_revision_id=:'revision'::uuid AND identity_case_id=:'caseId'::uuid
      AND episode_id=:'episodeId'::uuid AND date_kind='INVESTMENT_REVIEW';`, {
    revision: apiRevision, caseId: journeyCase, episodeId: episode,
  }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE date_revision_id=:'revision'::uuid AND state <> 'CANCELED';`, { revision: apiRevision }), "1");
  assert.equal(currentPlan().revisionId, apiRevision);

  // A successful save refreshes the opaque reference. The old token cannot be
  // used for a new request after the head changes.
  const refreshed = await planningRequest(listBody());
  assert.equal(refreshed.status, 200);
  const refreshedList = await json(refreshed);
  assert.equal(refreshedList.options[0].ref, apiPlanRef);
  assert.notEqual(refreshedList.options[0].ref, initialPlanRef);
  assert.equal((await planningRequest(saveBody(initialPlanRef, browserSaveOn, [7, 1]))).status, 409);

  const makeBrowserConfig = (requestOrigin, hasSession) => ({
    ...localAuthConfig,
    origin: requestOrigin,
    async verifySession() { return hasSession ? session() : null; },
  });
  const handleProfile = (request, requestOrigin, hasSession) =>
    handleIdentityProfile(request, profileEnv, makeBrowserConfig(requestOrigin, hasSession));
  const handlePlanning = (request, requestOrigin, hasSession) =>
    handleIdentityReviewPlanning(request, planningEnv, makeBrowserConfig(requestOrigin, hasSession));

  // Browser save is intentionally a distinct revision (+21) with its own
  // opaque ref and two reminders. It proves the UI uses the refreshed token.
  if (browser) {
    await browser({
      profilePath: identityProfilePath,
      planningPath: identityReviewPlanningPath,
      handleProfile,
      handlePlanning,
      ownLabel: "本人",
      guardianLabel: "已授权监护成员",
      initialOn: apiSaveOn,
      saveOn: browserSaveOn,
      verifySaved() {
        const saved = currentPlan();
        assert.equal(saved?.revisionId, browserRevision);
        assert.equal(saved?.on, browserSaveOn);
      },
    });
  } else {
    const browserRequestRef = crypto.randomUUID();
    const browserSave = await planningRequest(saveBody(apiPlanRef, browserSaveOn, [7, 1], browserRequestRef));
    assert.equal(browserSave.status, 200);
    assert.deepEqual(await json(browserSave), { status: "SAVED" });
  }
  assert.equal(query(`SELECT count(*) FROM identity.journey_date_revisions
    WHERE date_revision_id=:'revision'::uuid AND identity_case_id=:'caseId'::uuid
      AND episode_id=:'episodeId'::uuid AND date_kind='INVESTMENT_REVIEW';`, {
    revision: browserRevision, caseId: journeyCase, episodeId: episode,
  }), "1");
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_reminders
    WHERE date_revision_id=:'revision'::uuid AND state <> 'CANCELED';`, { revision: browserRevision }), "2");
  assert.equal(currentPlan().revisionId, browserRevision);
  assert.equal(currentPlan().on, browserSaveOn);

  const browserRefreshed = await planningRequest(listBody());
  assert.equal(browserRefreshed.status, 200);
  assert.equal((await json(browserRefreshed)).options[0].ref, browserPlanRef);

  // Expire the session while the authorized projection is being assembled;
  // the handler's final session check must prevent a response.
  expireDuringList = true;
  assert.equal((await planningRequest(listBody())).status, 401);
  expireDuringList = false;
  authActive = true;

  const revoke = async (table, column) => {
    query(`UPDATE identity_journey_test.${table} SET ${column}=clock_timestamp()
      WHERE identity_case_id=:'caseId'::uuid AND recipient_principal_id=:'principalId'::uuid;`, {
      caseId: journeyCase, principalId: recipient.principalId,
    });
    try {
      assert.equal((await planningRequest(listBody())).status, 403);
      assert.equal((await planningRequest(saveBody(browserPlanRef, browserSaveOn, [7, 1], crypto.randomUUID()))).status, 403);
    } finally {
      query(`UPDATE identity_journey_test.${table} SET ${column}=NULL
        WHERE identity_case_id=:'caseId'::uuid AND recipient_principal_id=:'principalId'::uuid;`, {
        caseId: journeyCase, principalId: recipient.principalId,
      });
    }
  };
  await revoke("review_plan_authority", "revoked_at");
  await revoke("station_grant", "withdrawn_at");

  const final = currentPlan();
  assert.equal(final?.revisionId, browserRevision);
  assert.equal(final?.on, browserSaveOn);
  assert.ok(events.some(event => event.action === "IDENTITY_REVIEW_PLAN_READ_ATTEMPT"));
  assert.ok(events.some(event => event.action === "IDENTITY_REVIEW_PLAN_WRITE_ATTEMPT"));
  console.log("PASS review-planning HTTP session, opaque revision refs, SELF scope, SQL save/replay, stale token, request binding, grant revocation, response redaction and browser handoff");
}
