/**
 * readStaffSession is the host's authoritative staff-session lookup. It returns
 * a server-held assertion and the staff subject already bound to that session.
 * brokerVerifier is the existing Canonical broker verifier, configured for the
 * approved issuer. This adapter does not mint accounts or interpret role headers.
 */
export function createStaffSessionAuthenticator({ readStaffSession, brokerVerifier, now = Date.now }) {
  if (typeof readStaffSession !== "function" || typeof brokerVerifier?.verify !== "function") {
    throw new Error("Staff session verification has not been configured");
  }
  return async function authenticateStaff(request) {
    try {
      const session = await readStaffSession(request);
      if (!session || session.profile !== "STAFF" || typeof session.brokerAssertion !== "string" ||
          typeof session.issuer !== "string" || typeof session.subject !== "string" ||
          !Number.isFinite(session.expiresAt) || session.expiresAt <= now() ||
          typeof session.assertCurrent !== "function") return null;

      const assertion = await brokerVerifier.verify(session.brokerAssertion);
      if (!assertion || assertion.aud !== "phoenix-canonical-postgresql" ||
          assertion.iss !== session.issuer || assertion.sub !== session.subject ||
          !Number.isSafeInteger(assertion.exp) || assertion.exp * 1000 <= now()) return null;
      // The session store must check revocation and subject binding again after
      // the potentially asynchronous signature verification.
      if (await session.assertCurrent() !== true ||
          session.expiresAt <= now() || assertion.exp * 1000 <= now()) return null;
      return Object.freeze({ issuer: assertion.iss, subject: assertion.sub });
    } catch {
      return null;
    }
  };
}
