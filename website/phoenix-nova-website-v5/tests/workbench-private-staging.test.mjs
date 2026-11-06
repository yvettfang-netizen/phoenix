import assert from "node:assert/strict";
import test from "node:test";
import { handleServiceWorkbench, workbenchEnabled } from "../lib/service-workbench-bff.ts";
import { handleStagingStaff, workbenchCustomerProvider } from "../lib/workbench-staging-identity.ts";

const origin = "http://127.0.0.1:4775";
const machineKey = "synthetic-".repeat(5);
const opaque = "a".repeat(43);
const settings = {
  SERVICE_WORKBENCH_ENABLED: "true",
  SERVICE_WORKBENCH_PRIVATE_STAGING: "1",
  SERVICE_WORKBENCH_STAGING_ORIGIN: origin,
  SERVICE_WORKBENCH_SYNTHETIC_PREVIEW: "false",
  SERVICE_WORKBENCH_API_ORIGIN: "http://127.0.0.1:4776",
  WORKBENCH_STAGING_IDENTITY_ORIGIN: "http://127.0.0.1:4777",
  WORKBENCH_STAGING_IDENTITY_KEY: machineKey,
};

test("built private staging is limited to its exact loopback origin without legacy sessions", async () => {
  assert.equal(workbenchEnabled({ SERVICE_WORKBENCH_ENABLED: "true" }, "production"), false);
  assert.equal(workbenchEnabled(settings, "production"), true);
  assert.equal(workbenchEnabled({ ...settings, SERVICE_WORKBENCH_STAGING_ORIGIN: "https://private.example" }, "development"), false);
  assert.equal(workbenchEnabled({ ...settings, SERVICE_WORKBENCH_SYNTHETIC_PREVIEW: "true" }, "development"), false);
  const cookie = { headers: { Cookie: "phoenix_workbench_session=" + opaque } };
  assert.equal((await handleServiceWorkbench(new Request(origin, cookie), settings, "production", "projects")).status, 401);
  assert.equal((await handleServiceWorkbench(new Request("http://127.0.0.1:4780", cookie), settings, "production", "projects")).status, 403);
  assert.equal((await handleServiceWorkbench(new Request(origin, { method: "POST", headers: { Origin: origin } }), settings, "production", "dev-session")).status, 404);
});

test("customer mapping rejects the wrong channel, public authority and stale assertions", async t => {
  const body = [];
  let channel = "ADVISOR";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(String(url), "http://127.0.0.1:4777/v1/workbench/session");
    assert.equal(options.headers.Authorization, "Bearer " + machineKey);
    assert.equal(options.redirect, "error");
    const input = JSON.parse(options.body);
    body.push(input);
    return input.action === "assert-current" ? new Response(null, { status: 403 }) : Response.json({ token: opaque, channel });
  });
  const provider = workbenchCustomerProvider(settings);
  const session = { customerId: "synthetic", sessionHash: "verified-hash" };
  await assert.rejects(() => provider.resolve(session));
  channel = "FAMILY";
  const mapping = await provider.resolve(session);
  await assert.rejects(() => mapping.assertCurrent());
  assert.deepEqual(body.at(-1), { action: "assert-current", token: opaque, channel: "FAMILY" });
  assert.equal(workbenchCustomerProvider({ ...settings, WORKBENCH_STAGING_IDENTITY_ORIGIN: "http://external.invalid" }), undefined);
});

test("staff is resolved separately and revoked after gateway work before any result is returned", async t => {
  let attempts = 0;
  let revoke = false;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.port === "4777") {
      const input = JSON.parse(options.body);
      if (input.action === "resolve-staff") return Response.json({ token: opaque, channel: "ADVISOR" });
      assert.deepEqual(input, { action: "assert-current", token: opaque, channel: "ADVISOR" });
      return new Response(null, { status: revoke ? 403 : 204 });
    }
    assert.equal(url.port, "4776");
    assert.equal(options.headers.Authorization, "Bearer " + opaque);
    assert.equal(options.headers["X-Phoenix-Customer-Bridge"], undefined);
    attempts++;
    revoke = true;
    return Response.json({ schemaVersion: "service-project-list.v1", items: [] });
  });
  const request = headers => new Request(origin, { headers });
  assert.equal((await handleStagingStaff(request({ Cookie: "phoenix_staging_staff_session=" + opaque, "X-Role": "admin" }), settings, "projects")).status, 403);
  assert.equal((await handleStagingStaff(request({ Cookie: "phoenix_staging_staff_session=" + opaque + "; phoenix-local-session=" + opaque }), settings, "projects")).status, 401);
  assert.equal((await handleStagingStaff(request({ Cookie: "phoenix_staging_staff_session=" + opaque }), settings, "projects")).status, 503);
  assert.equal(attempts, 1);
});
