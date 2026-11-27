/**
 * Requires distinct pg pools configured for the dedicated binder and writer logins.
 * An uncertain connection is destroyed so its context cannot reach the next request.
 */
export function createWebsiteIntakeConnection({ binderPool, writerPool, principalId }) {
  if (!binderPool || !writerPool || binderPool === writerPool ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(principalId ?? "")) {
    throw new Error("Invalid Canonical intake connection configuration");
  }

  return async function withIntakeConnection(nonce, operation) {
    const binder = await binderPool.connect();
    let ticket;
    let binderClean = false;
    try {
      await binder.query("SET ROLE phoenix_website_intake_binder");
      const issued = await binder.query("SELECT auth.issue_website_intake_ticket($1,$2) AS ticket", [principalId, nonce]);
      ticket = issued.rows[0]?.ticket;
      await binder.query("DISCARD ALL");
      binderClean = true;
      if (!ticket) throw new Error("Intake ticket unavailable");
    } finally {
      binder.release(!binderClean);
    }

    const writer = await writerPool.connect();
    let writerClean = false;
    try {
      await writer.query("SET ROLE phoenix_website_intake");
      await writer.query("SELECT auth.clear_context()");
      // Redeem outside the business transaction so rollback cannot restore a used ticket.
      await writer.query("SELECT auth.redeem_context_ticket($1,$2)", [ticket, principalId]);
      const binding = await writer.query(
        "SELECT auth.current_request_nonce()=$1::uuid AND auth.current_principal_id()=$2::uuid AND auth.current_family_id() IS NULL AS allowed",
        [nonce, principalId],
      );
      if (binding.rows[0]?.allowed !== true) throw new Error("Intake binding rejected");
      const result = await operation(writer);
      await writer.query("SELECT auth.clear_context()");
      const cleared = await writer.query("SELECT auth.current_principal_id() IS NULL AND auth.current_request_nonce() IS NULL AS cleared");
      if (cleared.rows[0]?.cleared !== true) throw new Error("Intake context was not cleared");
      await writer.query("DISCARD ALL");
      writerClean = true;
      return result;
    } finally {
      writer.release(!writerClean);
    }
  };
}
