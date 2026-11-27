import { createCipheriv, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const serviceDomains = new Set(["education", "identity", "wealth", "health"]);
const version = "website-consultation.v1";
const source = "phoenix-nova-website";
const compassSource = /^phoenix-nova-compass-(education|identity|health|wealth)$/;
const contractUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function uuidV7() {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(Date.now(), 0, 6);
  bytes[6] = (bytes[6] & 15) | 112;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString("hex");
  return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
}

function reply(status, body) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readPayload(request) {
  if (!request.body || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return null;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

/**
 * The host supplies a shared admission policy and an isolated Canonical session.
 * withIntakeConnection binds and verifies a per-attempt service context and
 * cleans or discards the connection after the callback.
 */
export function createWebsiteConsultationReceiver({
  token, contactKey, macKey, contractId, compassContractIds = {}, takeAdmission, withIntakeConnection,
}) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{32,256}$/.test(token) ||
      !Buffer.isBuffer(contactKey) || contactKey.length !== 32 ||
      !Buffer.isBuffer(macKey) || macKey.length !== 32 || timingSafeEqual(contactKey, macKey) ||
      !contractUuid.test(contractId) || !compassContractIds ||
      Object.entries(compassContractIds).some(([key, id]) => !compassSource.test(key) || !contractUuid.test(id)) ||
      new Set([contractId, ...Object.values(compassContractIds)]).size !== 1 + Object.keys(compassContractIds).length ||
      typeof takeAdmission !== "function" || typeof withIntakeConnection !== "function") {
    throw new Error("Invalid website consultation receiver configuration");
  }
  const contracts = new Map([[source, contractId], ...Object.entries(compassContractIds)]);
  const expectedAuth = Buffer.from("Bearer " + token);
  const encryptionKey = Buffer.from(contactKey);
  const payloadKey = Buffer.from(macKey);

  return async function receive(request) {
    if (request.method !== "POST") return reply(405, { code: "METHOD_NOT_ALLOWED" });
    const provided = Buffer.from(request.headers.get("authorization") ?? "");
    if (provided.length !== expectedAuth.length || !timingSafeEqual(provided, expectedAuth)) {
      return reply(401, { code: "UNAUTHORIZED" });
    }
    const input = await readPayload(request);
    if (!input || typeof input !== "object" ||
        Object.keys(input).sort().join(",") !== "consentVersion,email,locale,requestId,schemaVersion,service,source" ||
        input.schemaVersion !== version || input.consentVersion !== version || !(input.source === source || (typeof input.source === "string" && compassSource.test(input.source))) ||
        !["zh", "en"].includes(input.locale) || !serviceDomains.has(input.service) ||
        typeof input.requestId !== "string" || !uuidV4.test(input.requestId) ||
        request.headers.get("idempotency-key") !== input.requestId ||
        typeof input.email !== "string" || input.email.length > 254 ||
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.email)) {
      return reply(400, { code: "INVALID_CONSULTATION" });
    }
    const selectedContract = contracts.get(input.source);
    if (!selectedContract) return reply(503, { code: "INTAKE_UNAVAILABLE" });
    try {
      const emailFingerprint = createHmac("sha256", payloadKey).update("rate-limit\0" + input.email.toLowerCase()).digest("hex");
      if (await takeAdmission({ emailFingerprint }) !== true) return reply(429, { code: "RATE_LIMITED" });
      const aad = JSON.stringify([version, selectedContract, input.requestId, input.locale, input.service]);
      const mac = createHmac("sha256", payloadKey).update(JSON.stringify([aad, input.email])).digest();
      const duplicateMatchMac = createHmac("sha256", payloadKey)
        .update(JSON.stringify(["crm-duplicate-match-v1", selectedContract, input.service, input.email.toLowerCase()]))
        .digest();
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
      cipher.setAAD(Buffer.from(aad));
      const encrypted = Buffer.concat([cipher.update(input.email, "utf8"), cipher.final()]);
      const envelope = Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), encrypted]);
      const outcome = await withIntakeConnection(randomUUID(), async (client) => {
        await client.query("BEGIN");
        try {
          await client.query("SET LOCAL statement_timeout = '3s'");
          const result = await client.query(
            "SELECT crm.record_website_consultation($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) AS outcome",
            [input.requestId, selectedContract, uuidV7(), uuidV7(), uuidV7(), input.service.toUpperCase(),
              input.locale, version, mac, envelope, duplicateMatchMac, input.source],
          );
          const persisted = result.rows[0]?.outcome;
          if (!["persisted", "denied", "conflict"].includes(persisted)) throw new Error("Unexpected intake outcome");
          await client.query("COMMIT");
          return persisted;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      });
      if (outcome === "persisted") return reply(202, { status: "persisted", requestId: input.requestId });
      if (outcome === "conflict") return reply(409, { code: "REFERENCE_CONFLICT" });
    } catch {
      // Never log a raw payload, contact channel, token, or database error here.
    }
    return reply(503, { code: "INTAKE_UNAVAILABLE" });
  };
}
