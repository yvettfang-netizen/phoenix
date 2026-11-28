import test from "node:test";
import assert from "node:assert/strict";
import { createV5Worker } from "./worker-fixture.mjs";

const CRON = "*/15 * * * *";
const SCHEDULED_TIME = new Date("2026-11-28T00:00:00.000Z");
const claim = {
  reminderId: "00000000-0000-7000-8000-000000000001",
  recipientPrincipalId: "00000000-0000-7000-8000-000000000002",
  revisionId: "00000000-0000-7000-8000-000000000003",
  claimToken: "00000000-0000-4000-8000-000000000004",
};

function queueService({ claims = [claim], publication = "AUTHORIZATION_DENIED", deferred = true } = {}) {
  const calls = [];
  const service = async request => {
    const url = new URL(request.url);
    const body = await request.json();
    calls.push({ path: url.pathname, body });
    if (url.pathname === "/claim") return Response.json({ claims });
    if (url.pathname === "/publish") return Response.json({ publication });
    if (url.pathname === "/defer") return Response.json({ deferred });
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  };
  return { calls, service };
}

async function invokeExpectingFailure(worker) {
  let result;
  let thrown = null;
  try {
    result = await worker.scheduled({ cron: CRON, scheduledTime: SCHEDULED_TIME });
  } catch (error) {
    thrown = error;
  }
  // Miniflare's Fetcher.scheduled() either rejects the handler exception or
  // returns an invocation result carrying a non-ok outcome. Both represent
  // the same fail-closed behavior without exposing a public error endpoint.
  assert.ok(thrown || (result && result.outcome && result.outcome !== "ok"),
    "scheduled failure must not report a successful invocation");
}

async function scheduled(mf, cron = CRON) {
  const worker = await mf.getWorker();
  assert.equal(typeof worker.scheduled, "function", "pinned Miniflare must expose Fetcher.scheduled()");
  return worker.scheduled({ cron, scheduledTime: SCHEDULED_TIME });
}

test("scheduled identity station is a no-op when the feature flag is absent", async () => {
  const queue = queueService();
  const mf = createV5Worker({ FAMILY_IDENTITY_STATION_CRON: CRON }, {
    compatibilityFlags: ["service_binding_extra_handlers"],
    serviceBindings: { FAMILY_IDENTITY_STATION_QUEUE: queue.service },
  });
  try {
    await scheduled(mf);
    assert.deepEqual(queue.calls, []);
  } finally {
    await mf.dispose();
  }
});

test("scheduled identity station ignores a cron invocation that does not match its configured cron", async () => {
  const queue = queueService();
  const mf = createV5Worker({
    FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED: "true",
    FAMILY_IDENTITY_STATION_CRON: CRON,
  }, {
    compatibilityFlags: ["service_binding_extra_handlers"],
    serviceBindings: { FAMILY_IDENTITY_STATION_QUEUE: queue.service },
  });
  try {
    await scheduled(mf, "0 0 * * *");
    assert.deepEqual(queue.calls, []);
  } finally {
    await mf.dispose();
  }
});

test("matching scheduled identity station invocation claims, publishes, and defers an authorization denial", async () => {
  const queue = queueService({ publication: "AUTHORIZATION_DENIED" });
  const mf = createV5Worker({
    FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED: "true",
    FAMILY_IDENTITY_STATION_CRON: CRON,
  }, {
    compatibilityFlags: ["service_binding_extra_handlers"],
    serviceBindings: { FAMILY_IDENTITY_STATION_QUEUE: queue.service },
  });
  try {
    await scheduled(mf);
    assert.deepEqual(queue.calls, [
      { path: "/claim", body: { limit: 10 } },
      { path: "/publish", body: claim },
      { path: "/defer", body: claim },
    ]);
  } finally {
    await mf.dispose();
  }
});

test("the public Worker URL does not trigger the private identity station schedule", async () => {
  const queue = queueService();
  const mf = createV5Worker({
    FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED: "true",
    FAMILY_IDENTITY_STATION_CRON: CRON,
  }, {
    compatibilityFlags: ["service_binding_extra_handlers"],
    serviceBindings: { FAMILY_IDENTITY_STATION_QUEUE: queue.service },
  });
  try {
    await mf.dispatchFetch("https://public.example/api/identity-station/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cron: CRON }),
    });
    assert.deepEqual(queue.calls, []);
  } finally {
    await mf.dispose();
  }
});

test("a matching scheduled invocation without the private queue binding fails closed", async () => {
  const mf = createV5Worker({
    FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED: "true",
    FAMILY_IDENTITY_STATION_CRON: CRON,
  }, { compatibilityFlags: ["service_binding_extra_handlers"] });
  try {
    const worker = await mf.getWorker();
    assert.equal(typeof worker.scheduled, "function");
    await invokeExpectingFailure(worker);
  } finally {
    await mf.dispose();
  }
});

test("a malformed private queue claim fails closed before publish", async () => {
  const malformed = { ...claim, claimToken: "not-a-v4-token" };
  const queue = queueService({ claims: [malformed] });
  const mf = createV5Worker({
    FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED: "true",
    FAMILY_IDENTITY_STATION_CRON: CRON,
  }, {
    compatibilityFlags: ["service_binding_extra_handlers"],
    serviceBindings: { FAMILY_IDENTITY_STATION_QUEUE: queue.service },
  });
  try {
    const worker = await mf.getWorker();
    await invokeExpectingFailure(worker);
    assert.deepEqual(queue.calls, [
      { path: "/claim", body: { limit: 10 } },
    ]);
  } finally {
    await mf.dispose();
  }
});
