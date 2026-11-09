import test from "node:test";
import assert from "node:assert/strict";
import { handleCustomerServices } from "../lib/customer-canonical-bridge.ts";
import { privateWorkbenchConfig } from "../lib/private-customer-workbench.ts";

const origin = "https://staging.example";
const customerId = "00000000-0000-4000-8000-000000000001";
const sessionHash = "a".repeat(64);
const token = "b".repeat(43);
const scope = {
  customerId, sessionHash, channel: "FAMILY",
  principalId: "00000000-0000-7000-8000-000000000002",
  actorPersonId: "00000000-0000-7000-8000-000000000003",
  familyId: "00000000-0000-7000-8000-000000000004",
};

function fixture(afterGateway = () => {}) {
  const auditActions = [];
  const calls = [];
  let current = { ...scope, expiresAt: Date.now() + 60_000 };
  let sourceValid = true;
  const auth = {
    prepare(sql) {
      assert.match(sql, /^SELECT /, "Workbench must only read the auth D1");
      return { bind: () => ({ first: async () => sourceValid ? {
        id: customerId, token_hash: sessionHash, valid_until: current.expiresAt,
      } : null }) };
    },
    batch() { assert.fail("Workbench must not batch auth writes"); },
  };
  const audit = {
    prepare(sql) {
      assert.match(sql, /^INSERT INTO core_auth_audit /);
      return { bind: (_id, _actor, action) => ({ run: async () => {
        auditActions.push(action);
        return { meta: { changes: 1 } };
      } }) };
    },
  };
  const env = {
    SERVICE_WORKBENCH_PRIVATE_STAGING: "true",
    SERVICE_WORKBENCH_ENABLED: "true",
    CUSTOMER_CANONICAL_BRIDGE_ENABLED: "true",
    CUSTOMER_AUTH_ENABLED: "1",
    CUSTOMER_AUTH_PRIVATE_ORIGIN: origin,
    CUSTOMER_AUTH_PRIVATE_D1: auth,
    PRIVATE_WORKBENCH_AUDIT: audit,
    PRIVATE_WORKBENCH_AUTHORITY: { async fetch(request) {
      const action = new URL(request.url).pathname.split("/").at(-1);
      calls.push(action);
      assert.equal(request.headers.get("cookie"), null);
      const body = await request.json();
      if (action === "resolve") {
        assert.deepEqual(body, { customerId, sessionHash });
        return Response.json({ token, expiresAt: current.expiresAt });
      }
      assert.equal(action, "inspect");
      assert.deepEqual(body, { token });
      return Response.json(current);
    } },
    PRIVATE_WORKBENCH_GATEWAY: { async fetch(request) {
      calls.push("gateway");
      assert.equal(new URL(request.url).pathname, "/v1/service-workbench/projects");
      assert.equal(request.method, "GET");
      assert.equal(request.headers.get("authorization"), "Bearer " + token);
      assert.equal(request.headers.get("x-phoenix-customer-bridge"), null);
      assert.equal(request.headers.get("cookie"), null);
      afterGateway({
        revoke: () => { current = { ...current, familyId: scope.principalId }; },
        expire: () => { sourceValid = false; },
      });
      return Response.json({ schemaVersion: "service-project-list.v1", items: [] });
    } },
  };
  return { env, calls, auditActions };
}

function invoke(env, options = {}, resource = "projects", base = origin) {
  const headers = { cookie: "__Host-phoenix-session=" + "c".repeat(43), ...options.headers };
  const legacy = { resolve: () => assert.fail("Private requests must not use the development provider") };
  return handleCustomerServices(new Request(base + "/api/service-workbench/" + resource, {
    ...options, headers,
  }), env, "production", resource, null, legacy);
}

test("private bridge fails closed for missing or reused bindings, foreign origins, and writes", async () => {
  const f = fixture();
  assert.equal(privateWorkbenchConfig({ ...f.env, DB: f.env.CUSTOMER_AUTH_PRIVATE_D1 }), null);
  assert.equal(privateWorkbenchConfig({ ...f.env, PRIVATE_WORKBENCH_AUDIT: f.env.CUSTOMER_AUTH_PRIVATE_D1 }), null);
  assert.equal((await invoke({ ...f.env, PRIVATE_WORKBENCH_GATEWAY: undefined })).status, 503);
  assert.equal((await invoke(f.env, {}, "projects", "https://foreign.example")).status, 403);
  assert.equal((await invoke(f.env, { headers: { "sec-fetch-site": "same-site" } })).status, 403);
  assert.equal((await invoke(f.env, { method: "POST" })).status, 405);
  assert.equal((await invoke(f.env, {}, "projects/" + customerId + "/materials/download")).status, 404);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.auditActions, []);
});

test("private D1 reads do not touch the source session and only gateway GET is forwarded", async () => {
  const f = fixture();
  const response = await invoke(f.env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { schemaVersion: "service-project-list.v1", items: [] });
  assert.deepEqual(f.calls, ["resolve", "inspect", "gateway", "inspect"]);
  assert.deepEqual(f.auditActions, ["CANONICAL_ACCESS_ATTEMPT", "CANONICAL_ACCESS_PREPARED"]);
});

test("private bridge refuses prepared data after mapping changes or source session expiry", async () => {
  for (const [event, status] of [["revoke", 403], ["expire", 401]]) {
    const f = fixture(change => change[event]());
    const response = await invoke(f.env);
    assert.equal(response.status, status);
    assert(!("items" in await response.json()));
    assert.deepEqual(f.auditActions, ["CANONICAL_ACCESS_ATTEMPT", "CANONICAL_ACCESS_PREPARED", "CANONICAL_ACCESS_DENIED"]);
  }
});
