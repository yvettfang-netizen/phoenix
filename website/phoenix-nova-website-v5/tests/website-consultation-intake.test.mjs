import assert from "node:assert/strict";
import { test } from "node:test";
import { handleWebsiteConsultation } from "../lib/website-consultation-intake.ts";

const origin = "https://preview.example";
const env = {
  WEBSITE_CONSULTATION_ENABLED: "true",
  WEBSITE_CONSULTATION_PUBLIC_ORIGIN: origin,
  WEBSITE_CONSULTATION_PRIVACY_ZH_URL: origin + "/zh/privacy",
  WEBSITE_CONSULTATION_PRIVACY_EN_URL: origin + "/en/privacy",
  WEBSITE_PRIVACY_APPROVED: "true",
  WEBSITE_PRIVACY_VERSION: "website-consultation.v1",
  WEBSITE_PRIVACY_POLICY_ZH: "合成验收政策，非正式文案。",
  WEBSITE_PRIVACY_POLICY_EN: "Synthetic test policy, not approved publication copy.",
  WEBSITE_CONSULTATION_RECEIVER_URL: "https://intake.example/v1/website-consultations",
  WEBSITE_CONSULTATION_RECEIVER_TOKEN: "test".repeat(8),
};
const input = {
  requestId: "016975e9-b87c-4a35-8185-d08146e60a90",
  locale: "zh",
  service: "wealth",
  email: "visitor@example.test",
  consent: true,
};
function request(data = input, source = origin) {
  return new Request(origin + "/api/website-consultations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: source },
    body: JSON.stringify(data),
  });
}

test("passes the selected service and idempotency key to the receiver", async () => {
  const response = await handleWebsiteConsultation(request(), env, async (url, options) => {
    assert.equal(url.href, env.WEBSITE_CONSULTATION_RECEIVER_URL);
    assert.equal(options.redirect, "error");
    assert.equal(options.headers["Idempotency-Key"], input.requestId);
    assert.deepEqual(JSON.parse(options.body), {
      schemaVersion: "website-consultation.v1",
      source: "phoenix-nova-website",
      consentVersion: "website-consultation.v1",
      requestId: input.requestId,
      locale: input.locale,
      service: input.service,
      email: input.email,
    });
    return Response.json({ status: "persisted", requestId: input.requestId });
  });
  assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rejects disabled intake, foreign origins, absent consent and unexpected personal fields", async () => {
  const unexpectedSend = () => assert.fail("receiver must not be called");
  for (const [req, config, status] of [
    [request(), {}, 503],
    [request(), { ...env, WEBSITE_CONSULTATION_PRIVACY_EN_URL: undefined }, 503],
    [request(), { ...env, WEBSITE_PRIVACY_POLICY_EN: "" }, 503],
    [request(), { ...env, WEBSITE_PRIVACY_POLICY_EN: "Contact [privacy contact]." }, 503],
    [request(), { ...env, WEBSITE_PRIVACY_POLICY_ZH: "请联系【隐私联系渠道】。" }, 503],
    [request(), { ...env, WEBSITE_PRIVACY_APPROVED: undefined }, 503],
    [request(), { ...env, WEBSITE_PRIVACY_VERSION: "website-consultation.v2" }, 503],
    [request(), { ...env, WEBSITE_CONSULTATION_PRIVACY_ZH_URL: "https://elsewhere.example/zh/privacy" }, 503],
    [request(), { ...env, WEBSITE_CONSULTATION_PRIVACY_EN_URL: origin + "/zh/privacy" }, 503],
    [request(input, "https://elsewhere.example"), env, 403],
    [request({ ...input, consent: false }), env, 400],
    [request({ ...input, email: "bad address@example.test" }), env, 400],
    [request({ ...input, notes: "synthetic" }), env, 400],
    [request({ ...input, email: "x".repeat(2048) }), env, 400],
  ]) {
    let called = false;
    const result = await handleWebsiteConsultation(req, config, (...args) => {
      called = true;
      return unexpectedSend(...args);
    });
    assert.equal(called, false);
    assert.equal(result.status, status);
  }
});

test("reports receiver limits and conflicts and requires a matching persisted receipt", async () => {
  for (const [upstream, expected] of [
    [Response.json({ status: "accepted", requestId: input.requestId }), 503],
    [Response.json({ status: "persisted", requestId: "different" }), 503],
    [new Response(null, { status: 429 }), 429],
    [new Response(null, { status: 409 }), 409],
  ]) {
    const result = await handleWebsiteConsultation(request(), env, async () => upstream);
    assert.equal(result.status, expected);
  }
});
