import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { isAbsolute } from "node:path";

export async function verifyLinkedFamilyApi({ db, Pool, connection, backend, identity, project, expectedFeedback }) {
  assert.equal(connection.host, "127.0.0.1");
  assert.equal(connection.database, "phoenix_website_intake_fixture");
  assert.ok(isAbsolute(backend));
  const { createServiceWorkbench } = await import(pathToFileURL(backend).href);
  const { handleCustomerServices } = await import("../../../../website/phoenix-nova-website-v5/lib/customer-canonical-bridge.ts");
  await db.query(`
    CREATE ROLE linked_fixture_binder LOGIN NOINHERIT;
    GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO linked_fixture_binder;
    GRANT USAGE ON SCHEMA auth TO linked_fixture_binder;
    GRANT EXECUTE ON FUNCTION auth.issue_context_ticket(uuid,uuid,uuid,text,timestamptz,uuid,uuid)
      TO linked_fixture_binder;
  `);
  const token = randomBytes(32).toString("base64url");
  const createdAt = Date.now();
  const session = {
    id: "synthetic-linked-family", username: "Synthetic family", token_hash: "d".repeat(64),
    created_at: createdAt, valid_until: createdAt + 60000,
  };
  let sessionLive = true;
  const assertCurrent = async () => { if (!sessionLive) throw new Error("Synthetic family session revoked"); };
  const workbench = createServiceWorkbench({
    app: new Pool({ ...connection, user: "linked_fixture_workbench", max: 1 }),
    binder: new Pool({ ...connection, user: "linked_fixture_binder", max: 1 }),
    objects: {
      async get() { throw new Error("File access outside this fixture"); },
      async put() { throw new Error("File writes outside this fixture"); },
    },
    mode: "test",
    async resolve(authorization) {
      assert.equal(authorization, "Bearer " + token);
      await assertCurrent();
      return { ...identity, channel: "FAMILY", profile: "CUSTOMER", assertCurrent };
    },
  });
  const server = createServer((req, res) => void workbench.handle(req, res));
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const origin = "http://127.0.0.1:4699";
    const env = {
      SERVICE_WORKBENCH_ENABLED: "true", CUSTOMER_CANONICAL_BRIDGE_ENABLED: "true",
      SERVICE_WORKBENCH_API_ORIGIN: "http://127.0.0.1:" + server.address().port,
    };
    const audit = [];
    const config = {
      origin,
      async verifySession(request) {
        return sessionLive && request.headers.get("cookie") === "fixture-session=linked-family" ? session : null;
      },
      async recordAccess(_id, action) { audit.push(action); },
    };
    const provider = { async resolve(input) {
      assert.deepEqual(input, { customerId: session.id, sessionHash: session.token_hash });
      return { token, assertCurrent };
    } };
    const proxy = (resource, headers = {}) => handleCustomerServices(
      new Request(origin + "/api/family-services/" + resource, {
        headers: { cookie: "fixture-session=linked-family", ...headers },
      }), env, "development", resource, config, provider);
    assert.equal((await proxy("summary", { cookie: "" })).status, 401);
    const result = await proxy("summary");
    assert.equal(result.status, 200, await result.clone().text());
    assert.match(result.headers.get("cache-control"), /no-store/);
    const dto = await result.json();
    assert.equal(dto.schemaVersion, "service-project-summary.v1");
    const item = dto.projects.find(row => row.service_project_id === project);
    assert.equal(item.status, "ACTIVE");
    assert.equal(item.customer_todo_count, 0);
    assert.match(item.latest_progress, /^MESSAGE/);
    const detail = await proxy("projects/" + project);
    assert.equal(detail.status, 200);
    assert.ok((await detail.json()).messages.some(entry => entry.id === expectedFeedback));
    assert.equal((await proxy("summary", { "x-role": "Founder" })).status, 403);
    sessionLive = false;
    assert.equal((await proxy("summary")).status, 401);
    assert.deepEqual(audit, ["CANONICAL_ACCESS_ATTEMPT", "CANONICAL_ACCESS_PREPARED",
      "CANONICAL_ACCESS_ATTEMPT", "CANONICAL_ACCESS_PREPARED"]);
    console.log("PASS same synthetic family project through existing Family BFF and Service Workbench HTTP API");
  } finally {
    if (server.listening) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    await workbench.close();
  }
}
