import { createDecipheriv, randomUUID } from "node:crypto";

/** Accept identity only from the caller's established, verified staff session. */
export async function readStaffConsultationEmail(client, identity, leadId, contactKey) {
  if (!Buffer.isBuffer(contactKey) || contactKey.length !== 32) throw new Error("Invalid contact key");
  const result = await client.query(
    "SELECT * FROM crm.read_website_consultation_contact($1,$2,$3,$4)",
    [identity.issuer, identity.subject, leadId, randomUUID()],
  );
  // The supplied gateway client must use an autocommit connection so the
  // access audit has committed before this function attempts decryption.
  const row = result.rows[0];
  if (!row) return null;
  const envelope = row.contact_envelope;
  if (!Buffer.isBuffer(envelope) || envelope.length < 32 || envelope[0] !== 1) throw new Error("Invalid contact envelope");
  const aad = JSON.stringify([row.consent_version, row.contract_id, row.request_id, row.locale, row.service_domain.toLowerCase()]);
  const decipher = createDecipheriv("aes-256-gcm", contactKey, envelope.subarray(1, 13));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(envelope.subarray(13, 29));
  return Buffer.concat([decipher.update(envelope.subarray(29)), decipher.final()]).toString("utf8");
}
