import test from "node:test";
import assert from "node:assert/strict";
import { nodeRequestHeaders } from "../lib/node-request-headers.ts";
import { env } from "../build/node-cloudflare-env.mjs";

test("Node requests cannot supply platform identity or select the Wealth surface", () => {
  const incoming = new Headers({
    "OAI-Authenticated-User-Email": "forged@example.com",
    "oai-authenticated-user-full-name": "Administrator",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    "x-phoenix-surface": "wealth",
    "x-phoenix-health-locale": "en",
    cookie: "ordinary-cookie=retained",
    rsc: "1",
    "content-type": "application/json",
  });
  const safe = nodeRequestHeaders(incoming, "/zh/education");
  assert.deepEqual([...safe.keys()].sort(), ["content-type", "cookie", "rsc"]);
  assert.equal(safe.get("cookie"), "ordinary-cookie=retained");
  assert.equal(incoming.get("x-phoenix-surface"), "wealth");
});

test("Health document locale is derived from the URL and replaces forged headers", () => {
  for (const path of ["/en/health", "/en/health/family", "/en/compass/health"]) {
    assert.equal(nodeRequestHeaders(new Headers({"x-phoenix-health-locale":"zh"}), path).get("x-phoenix-health-locale"), "en");
  }
  assert.equal(nodeRequestHeaders(new Headers(), "/zh/health").get("x-phoenix-health-locale"), "zh");
  assert.equal(nodeRequestHeaders(new Headers(), "/en/healthcare").has("x-phoenix-health-locale"), false);
});

test("Node has no D1 binding or customer authentication activation path", () => {
  assert.equal(Object.isFrozen(env), true);
  assert.deepEqual(Object.keys(env), []);
  assert.throws(() => { env.CUSTOMER_AUTH_ENABLED = "1"; }, TypeError);
  assert.equal(env.DB, undefined);
});
