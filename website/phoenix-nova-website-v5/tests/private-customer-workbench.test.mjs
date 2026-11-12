import test from "node:test";
import assert from "node:assert/strict";
import { handleCustomerServices } from "../lib/customer-canonical-bridge.ts";
import { privateWorkbenchConfig } from "../lib/private-customer-workbench.ts";
import { DELIVERY_RECEIPT_HEADER, handlePrivateDeliveryReceipt } from "../lib/private-delivery-receipt.ts";

const origin = "https://staging.example";
const customerId = "00000000-0000-4000-8000-000000000001";
const sessionHash = "a".repeat(64);
const token = "b".repeat(43);
const deliverySecret = Buffer.alloc(32, 1).toString("base64url");
const scope = {
  customerId, sessionHash, channel: "FAMILY",
  principalId: "00000000-0000-7000-8000-000000000002",
  actorPersonId: "00000000-0000-7000-8000-000000000003",
  familyId: "00000000-0000-7000-8000-000000000004",
};

function fixture(afterGateway = () => {}) {
  const auditActions = [];
  const auditRows = new Map();
  const calls = [];
  let current = { ...scope, expiresAt: Date.now() + 60_000 };
  let sourceValid = true;
  let sessionIdentity = { id: customerId, token_hash: sessionHash };
  let rejectedAudit;
  const auth = {
    prepare(sql) {
      assert.match(sql, /^SELECT /, "Workbench must only read the auth D1");
      return { bind: () => ({ first: async () => sourceValid ? {
        ...sessionIdentity, valid_until: current.expiresAt,
      } : null }) };
    },
    batch() { assert.fail("Workbench must not batch auth writes"); },
  };
  const audit = {
    prepare(sql) {
      if (sql.startsWith("SELECT actor_user_id FROM core_auth_audit")) {
        return { bind: (id, action) => ({ first: async () => {
          const row = auditRows.get(id);
          return row?.action === action ? { actor_user_id: row.actor } : null;
        } }) };
      }
      assert.match(sql, /^INSERT INTO core_auth_audit /);
      return { bind: (id, actor, action) => ({ run: async () => {
        if (action === rejectedAudit) throw new Error("Synthetic audit write failure");
        if (auditRows.has(id)) {
          assert.match(sql, /ON CONFLICT\(id\) DO NOTHING$/);
          return { meta: { changes: 0 } };
        }
        auditRows.set(id, { actor, action });
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
    PRIVATE_WORKBENCH_DELIVERY_SECRET: deliverySecret,
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
  return { env, calls, auditActions, auditRows,
    changeSession(id, token_hash) { sessionIdentity = { id, token_hash }; },
    rejectAudit(action) { rejectedAudit = action; },
  };
}

function invoke(env, options = {}, resource = "projects", base = origin) {
  const headers = { cookie: "__Host-phoenix-session=" + "c".repeat(43), ...options.headers };
  const legacy = { resolve: () => assert.fail("Private requests must not use the development provider") };
  return handleCustomerServices(new Request(base + "/api/service-workbench/" + resource, {
    ...options, headers,
  }), env, "production", resource, null, legacy);
}

function acknowledge(env, receipt, overrides = {}) {
  return handlePrivateDeliveryReceipt(new Request(origin + "/api/family-services/delivery-receipt", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "sec-fetch-site": "same-origin",
      cookie: "__Host-phoenix-session=" + "c".repeat(43), ...overrides },
    body: JSON.stringify({ receipt }),
  }), env);
}

test("private bridge fails closed for missing or reused bindings, foreign origins, and writes", async () => {
  const f = fixture();
  assert.equal(privateWorkbenchConfig({ ...f.env, DB: f.env.CUSTOMER_AUTH_PRIVATE_D1 }), null);
  assert.equal(privateWorkbenchConfig({ ...f.env, PRIVATE_WORKBENCH_AUDIT: f.env.CUSTOMER_AUTH_PRIVATE_D1 }), null);
  assert.equal((await invoke({ ...f.env, PRIVATE_WORKBENCH_DELIVERY_SECRET: undefined })).status, 503);
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
  assert(response.headers.get(DELIVERY_RECEIPT_HEADER));
  assert.deepEqual(await response.json(), { schemaVersion: "service-project-list.v1", items: [] });
  assert.deepEqual(f.calls, ["resolve", "inspect", "gateway", "inspect"]);
  assert.deepEqual(f.auditActions, ["CANONICAL_ACCESS_ATTEMPT", "CANONICAL_ACCESS_PREPARED"]);
});

test("private bridge refuses prepared data after mapping changes or source session expiry", async () => {
  for (const [event, status] of [["revoke", 403], ["expire", 401]]) {
    const f = fixture(change => change[event]());
    const response = await invoke(f.env);
    assert.equal(response.status, status);
    assert.equal(response.headers.get(DELIVERY_RECEIPT_HEADER), null);
    assert(!("items" in await response.json()));
    assert.deepEqual(f.auditActions, ["CANONICAL_ACCESS_ATTEMPT", "CANONICAL_ACCESS_PREPARED", "CANONICAL_ACCESS_DENIED"]);
  }
});

test("private missing session is audited without identity and audit failures close access", async () => {
  const f = fixture();
  const response = await invoke(f.env, { headers: { cookie: "" } });
  assert.equal(response.status, 401);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.auditActions, ["CANONICAL_SESSION_REJECTED"]);
  const [[id, row]] = f.auditRows;
  assert.match(id, /^[a-f0-9-]{36}:session-rejected$/);
  assert.equal(row.actor, null);
  f.rejectAudit("CANONICAL_SESSION_REJECTED");
  assert.equal((await invoke(f.env, { headers: { cookie: "" } })).status, 503);
});

test("client delivery is recorded once only after an authenticated acknowledgement", async () => {
  const f = fixture();
  const released = await invoke(f.env);
  const proof = released.headers.get(DELIVERY_RECEIPT_HEADER);
  const requestId = proof.split(".")[0];
  await released.json();
  assert(!f.auditRows.has(`${requestId}:delivered`));
  const ack = await acknowledge(f.env, proof);
  assert.equal(ack.status, 204);
  assert.equal(ack.headers.get("cache-control"), "private, no-store");
  assert.equal((await acknowledge(f.env, proof)).status, 204);
  assert.deepEqual(f.auditActions, ["CANONICAL_ACCESS_ATTEMPT", "CANONICAL_ACCESS_PREPARED", "CANONICAL_ACCESS_DELIVERED"]);
  assert.deepEqual(f.auditRows.get(`${requestId}:delivered`), { actor: null, action: "CANONICAL_ACCESS_DELIVERED" });
});

test("delivery receipt denies another session or account, tampering and missing preparation", async () => {
  const f = fixture();
  const proof = (await invoke(f.env)).headers.get(DELIVERY_RECEIPT_HEADER);
  const [id, deadline, signature] = proof.split(".");
  assert.equal((await acknowledge(f.env, proof, { origin: "https://foreign.example" })).status, 403);
  assert.equal((await acknowledge(f.env, proof, { "sec-fetch-site": "same-site" })).status, 403);
  assert.equal((await acknowledge(f.env, proof, { cookie: "" })).status, 401);
  assert.equal((await acknowledge(f.env, `${id}.${deadline}.${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`)).status, 403);
  f.changeSession(customerId, "e".repeat(64));
  assert.equal((await acknowledge(f.env, proof)).status, 403);
  f.changeSession("00000000-0000-4000-8000-000000000005", sessionHash);
  assert.equal((await acknowledge(f.env, proof)).status, 403);
  f.changeSession(customerId, sessionHash);
  f.auditRows.delete(`${id}:prepared`);
  assert.equal((await acknowledge(f.env, proof)).status, 403);
  assert(!f.auditActions.includes("CANONICAL_ACCESS_DELIVERED"));
});

test("expired receipts and audit storage failures never claim delivery", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const f = fixture();
  const proof = (await invoke(f.env)).headers.get(DELIVERY_RECEIPT_HEADER);
  f.rejectAudit("CANONICAL_ACCESS_DELIVERED");
  assert.equal((await acknowledge(f.env, proof)).status, 503);
  t.mock.timers.tick(60_001);
  assert.equal((await acknowledge(f.env, proof)).status, 403);
  assert(!f.auditActions.includes("CANONICAL_ACCESS_DELIVERED"));
});
