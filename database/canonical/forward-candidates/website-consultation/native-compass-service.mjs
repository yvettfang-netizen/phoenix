/** Server-only application seam. The host supplies its trusted existing family
 * session resolver and private pools. This module registers no HTTP route. */
export function createNativeCompassService({
  enabled, domain, authorizationPool, operationPool, resolveFamilySession, purpose = "PUBLISHER",
}) {
  if (enabled !== true) return undefined;
  if (!["EDUCATION", "IDENTITY"].includes(domain) ||
      !["PUBLISHER", "IDENTITY_SUBMISSION"].includes(purpose) ||
      (purpose === "IDENTITY_SUBMISSION" && domain !== "IDENTITY") ||
      !authorizationPool || !operationPool || authorizationPool === operationPool ||
      typeof resolveFamilySession !== "function") throw new Error("Native Compass configuration unavailable");

  const capability = purpose === "IDENTITY_SUBMISSION" ? "phoenix_identity_assessment_writer"
    : domain === "EDUCATION" ? "phoenix_education_crm_reference_publisher"
      : "phoenix_identity_crm_reference_publisher";
  const publishSql = domain === "EDUCATION"
    ? "SELECT crm.publish_education_compass_completion($1,$2,$3,$4) AS result"
    : "SELECT crm.publish_identity_compass_completion($1,$2,$3,$4) AS result";

  async function apply(authorization, nonce, sql, params) {
    const identity = await resolveFamilySession(authorization);
    const until = () => Math.min(identity?.exp * 1000, Date.now() + 15000);
    const requireCurrent = async () => {
      if (!identity || !Number.isSafeInteger(identity.exp) || until() <= Date.now() ||
          typeof identity.assertCurrent !== "function") throw new Error("Native Compass authorization unavailable");
      if (await identity.assertCurrent() === false) throw new Error("Native Compass session revoked");
      if (until() <= Date.now()) throw new Error("Native Compass authorization unavailable");
    };
    await requireCurrent();
    const binder = await authorizationPool.connect();
    let binderClean = false;
    let context;
    let binderLogin;
    try {
      binderLogin = (await binder.query("SELECT session_user AS login")).rows[0]?.login;
      const issued = await binder.query(
        "SELECT * FROM auth.issue_application_family_context_ticket($1,$2,$3,$4,$5)",
        [identity.iss, identity.sub, identity.application_family_id, new Date(until()), nonce],
      );
      context = issued.rows[0];
      await binder.query("DISCARD ALL");
      binderClean = true;
    } finally {
      binder.release(!binderClean);
    }
    if (!context || !binderLogin) return null;
    const client = await operationPool.connect();
    let clean = false;
    try {
      const guard = await client.query(`SELECT session_user<>$1 AND current_user=session_user
        AND pg_has_role(session_user,$2,'USAGE')
        AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
        AND NOT pg_has_role(session_user,'phoenix_canonical_migrator','MEMBER')
        AND NOT pg_has_role(session_user,'phoenix_canonical_backup_runtime','MEMBER')
        AND NOT has_function_privilege(session_user,'auth.issue_application_family_context_ticket(text,text,text,timestamptz,uuid)','EXECUTE')
        AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname=session_user
          AND rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole
          AND NOT rolcreatedb AND NOT rolreplication) AS allowed`, [binderLogin, capability]);
      if (guard.rows[0]?.allowed !== true) throw new Error("Native Compass role rejected");
      await client.query("SELECT auth.clear_context()");
      await client.query("SELECT auth.redeem_context_ticket($1,$2)", [context.ticket_id, context.principal_id]);
      const bound = await client.query(`SELECT auth.current_request_nonce()=$1::uuid
        AND auth.current_principal_id()=$2::uuid AS allowed`, [nonce, context.principal_id]);
      if (bound.rows[0]?.allowed !== true) throw new Error("Native Compass context rejected");
      await requireCurrent();
      const { rows } = await client.query(sql, params);
      await client.query("SELECT auth.clear_context()");
      const cleared = await client.query("SELECT auth.current_principal_id() IS NULL AND auth.current_request_nonce() IS NULL AS cleared");
      if (cleared.rows[0]?.cleared !== true) throw new Error("Native Compass context was not cleared");
      await client.query("DISCARD ALL");
      clean = true;
      return rows[0]?.result ?? null;
    } finally {
      client.release(!clean);
    }
  }

  if (purpose === "IDENTITY_SUBMISSION") return Object.freeze({
    // sealed is produced by the trusted Identity questionnaire backend, after validation.
    submit(authorization, nonce, sealed) {
      return apply(authorization, nonce, "SELECT identity.submit_compass_assessment($1,$2,$3) AS result",
        [sealed.submissionId, sealed.questionnaireRevision, sealed.sha256]);
    },
  });
  return Object.freeze({
    acceptSharing(authorization, nonce, receipt) {
      if (receipt.accepted !== true) return Promise.resolve(null);
      return apply(authorization, nonce, "SELECT consent.capture_compass_reference($1,$2,$3,$4,$5) AS result",
        [receipt.evidenceId, domain, receipt.assessmentId, receipt.noticeRevision, receipt.expiresAt]);
    },
    withdrawSharing(authorization, nonce, evidenceId) {
      return apply(authorization, nonce, "SELECT consent.withdraw_compass_reference($1,$2) AS result", [domain, evidenceId]);
    },
    // Invoked by the source backend following a sealed completion, or when that
    // same user later explicitly authorizes sharing. The reference is resolved in SQL.
    publish(authorization, nonce, { eventId, leadId, contractId, assessmentId }) {
      return apply(authorization, nonce, publishSql, [eventId, leadId, contractId, assessmentId]);
    },
  });
}
