import { randomUUID } from "node:crypto";
import { createWebsiteIntakeConnection } from "./canonical-session.mjs";
import { createWebsiteConsultationReceiver } from "./receiver.mjs";
import { createWebsiteConsultationStaffHandler } from "./staff-http.mjs";
import { createStaffSessionAuthenticator } from "./staff-session.mjs";

function httpsOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value) throw new Error("Expected a configured HTTPS origin");
  return url.origin;
}

/** Compose the two private service listeners in an existing TLS host. */
export function createWebsiteConsultationGateway({
  receiverOrigin, staffOrigin, receiverToken, contactKey, macKey, acquisitionContractId, compassContractIds,
  intakePrincipalId, binderPool, writerPool, staffPool,
  readStaffSession, brokerVerifier,
}) {
  const receiveAt = httpsOrigin(receiverOrigin);
  const staffAt = httpsOrigin(staffOrigin);
  if (receiveAt === staffAt || staffPool === writerPool || staffPool === binderPool) {
    throw new Error("Separate consultation origins and database pools are required");
  }
  const withIntakeConnection = createWebsiteIntakeConnection({ binderPool, writerPool, principalId: intakePrincipalId });
  const receiver = createWebsiteConsultationReceiver({
    token: receiverToken, contactKey, macKey, contractId: acquisitionContractId, compassContractIds,
    takeAdmission: ({ emailFingerprint }) => withIntakeConnection(randomUUID(), async client => {
      const result = await client.query("SELECT crm.admit_website_consultation($1) AS allowed", [emailFingerprint]);
      return result.rows[0]?.allowed === true;
    }),
    withIntakeConnection,
  });
  const staff = createWebsiteConsultationStaffHandler({
    origin: staffAt, gatewayPool: staffPool, contactKey,
    authenticateStaff: createStaffSessionAuthenticator({ readStaffSession, brokerVerifier }),
  });
  const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return {
    intake(request) {
      const url = new URL(request.url);
      if (url.origin !== receiveAt || url.pathname !== "/v1/website-consultations" || url.search) return missing();
      return receiver(request);
    },
    staff(request) {
      if (new URL(request.url).origin !== staffAt) return missing();
      return staff(request);
    },
  };
}
