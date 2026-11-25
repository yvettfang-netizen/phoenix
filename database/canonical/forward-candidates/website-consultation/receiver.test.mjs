import assert from "node:assert/strict";
import { createDecipheriv } from "node:crypto";
import { test } from "node:test";
import { createWebsiteConsultationReceiver } from "./receiver.mjs";
import { handleWebsiteConsultation } from "../../../../website/phoenix-nova-website-v5/lib/website-consultation-intake.ts";

const origin = "https://preview.example";
const endpoint = "https://receiver.example/v1/website-consultations";
const token = "synthetic".repeat(4);
const contactKey = Buffer.alloc(32, 71);
const macKey = Buffer.alloc(32, 81);
const contractId = "019347ec-7740-7000-a000-000000000001";
const config = {
  WEBSITE_CONSULTATION_ENABLED: "true",
  WEBSITE_CONSULTATION_PUBLIC_ORIGIN: origin,
  WEBSITE_CONSULTATION_PRIVACY_ZH_URL: origin + "/zh/privacy",
  WEBSITE_CONSULTATION_PRIVACY_EN_URL: origin + "/en/privacy",
  WEBSITE_PRIVACY_APPROVED: "true",
  WEBSITE_PRIVACY_VERSION: "website-consultation.v1",
  WEBSITE_PRIVACY_POLICY_ZH: "合成验收政策，非正式文案。",
  WEBSITE_PRIVACY_POLICY_EN: "Synthetic test policy, not approved publication copy.",
  WEBSITE_CONSULTATION_RECEIVER_URL: endpoint,
  WEBSITE_CONSULTATION_RECEIVER_TOKEN: token,
};
const input = {
  requestId: "028347ec-7740-4000-a000-000000000001",
  locale: "en", service: "identity", email: "visitor@example.test", consent: true,
};
function submit(receiver, data = input) {
  const request = new Request(origin + "/api/website-consultations", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleWebsiteConsultation(request, config, (url, init) => receiver(new Request(url, init)));
}

test("website receives an acknowledgement after the receiver commits an encrypted contact", async () => {
  const queries = [];
  const receiver = createWebsiteConsultationReceiver({
    token, contactKey, macKey, contractId,
    takeAdmission: async ({ emailFingerprint }) => /^[0-9a-f]{64}$/.test(emailFingerprint),
    withIntakeConnection: async (nonce, perform) => {
      assert.notEqual(nonce, input.requestId);
      return perform({ async query(sql, parameters) {
        queries.push(sql);
        if (!parameters) return {};
        const [id, contract, lead, event, attribution, domain, locale, version, mac, envelope] = parameters;
        assert.deepEqual([id, contract, domain, locale, version], [
          input.requestId, contractId, "IDENTITY", "en", "website-consultation.v1",
        ]);
        for (const value of [lead, event, attribution]) assert.match(value, /^[a-f0-9]{8}-[a-f0-9]{4}-7/);
        assert.equal(mac.length, 32);
        assert.equal(envelope.includes(input.email), false);
        const decipher = createDecipheriv("aes-256-gcm", contactKey, envelope.subarray(1, 13));
        decipher.setAuthTag(envelope.subarray(13, 29));
        decipher.setAAD(Buffer.from(JSON.stringify([version, contractId, input.requestId, input.locale, input.service])));
        assert.equal(Buffer.concat([decipher.update(envelope.subarray(29)), decipher.final()]).toString(), input.email);
        return { rows: [{ outcome: "persisted" }] };
      } });
    },
  });
  const response = await submit(receiver);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: "received", requestId: input.requestId });
  assert.deepEqual(queries, [
    "BEGIN", "SET LOCAL statement_timeout = '3s'",
    "SELECT crm.record_website_consultation($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS outcome", "COMMIT",
  ]);
});

test("rejects an unauthenticated caller and rate-limited request before database access", async () => {
  let connections = 0;
  const receiver = createWebsiteConsultationReceiver({
    token, contactKey, macKey, contractId, takeAdmission: async () => false,
    withIntakeConnection: async () => { connections++; },
  });
  assert.equal((await receiver(new Request(endpoint, { method: "POST" }))).status, 401);
  assert.equal((await submit(receiver)).status, 429);
  assert.equal(connections, 0);
});

test("an unsuccessful commit produces a failure rather than a success receipt", async () => {
  let rolledBack = false;
  const receiver = createWebsiteConsultationReceiver({
    token, contactKey, macKey, contractId, takeAdmission: async () => true,
    withIntakeConnection: async (_nonce, perform) => perform({ async query(sql) {
      if (sql === "COMMIT") throw new Error("synthetic commit failure");
      if (sql === "ROLLBACK") rolledBack = true;
      return { rows: [{ outcome: "persisted" }] };
    } }),
  });
  assert.equal((await submit(receiver)).status, 503);
  assert.equal(rolledBack, true);
});
