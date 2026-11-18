import assert from "node:assert/strict";
import test from "node:test";
import { runPrivateWorkbenchOwnerAction } from "../lib/private-workbench-owner-audit.ts";

const account = "a0700000-0000-4000-8000-000000000001";
const insert = "INSERT INTO core_auth_audit (id,actor_user_id,action,created_at) VALUES (?,?,?,?)";

function auditBinding({ failAction } = {}) {
  const events = [];
  const audit = {
    prepare(sql) {
      assert.equal(sql, insert);
      return {
        bind(id, actor, action, time) {
          assert(Number.isSafeInteger(time));
          return { async run() {
            if (action === failAction) return { meta: { changes: 0 } };
            events.push({ id, actor, action });
            return { meta: { changes: 1 } };
          } };
        },
      };
    },
  };
  return { audit, events };
}

test("an owner operation records the intent before changing state and pairs its outcome", async () => {
  for (const [action, prefix] of [["revoke", "REVOKE"], ["expire-idle", "EXPIRE_IDLE"], ["expire-absolute", "EXPIRE_ABSOLUTE"]]) {
    const { audit, events } = auditBinding();
    const result = await runPrivateWorkbenchOwnerAction(audit, action, account, () => {
      assert.deepEqual(events.map(event => event.action), [`OWNER_CONTROL_${prefix}_REQUESTED`]);
      return "changed";
    });
    assert.equal(result.result, "changed");
    assert(Number.isSafeInteger(result.requestedAt) && Number.isSafeInteger(result.appliedAt));
    assert.deepEqual(events.map(event => event.action), [
      `OWNER_CONTROL_${prefix}_REQUESTED`, `OWNER_CONTROL_${prefix}_APPLIED`,
    ]);
    assert(events.every(event => event.actor === account));
    const requestId = events[0].id.split(":", 1)[0];
    assert.match(requestId, /^[0-9a-f-]{36}$/);
    assert.equal(result.requestId, requestId);
    assert.deepEqual(events.map(event => event.id), [`${requestId}:owner-requested`, `${requestId}:owner-applied`]);
  }
});

test("a failed state change records FAILED with the same request ID", async () => {
  const { audit, events } = auditBinding();
  await assert.rejects(runPrivateWorkbenchOwnerAction(audit, "revoke", null, async () => {
    throw new Error("state change failed");
  }), /state change failed/);
  assert.deepEqual(events.map(event => event.action), ["OWNER_CONTROL_REVOKE_REQUESTED", "OWNER_CONTROL_REVOKE_FAILED"]);
  assert.equal(events[1].id, events[0].id.replace(":owner-requested", ":owner-failed"));
  assert(events.every(event => event.actor === null));
});

test("an unavailable intent write blocks the operation", async () => {
  const { audit, events } = auditBinding({ failAction: "OWNER_CONTROL_REVOKE_REQUESTED" });
  await assert.rejects(runPrivateWorkbenchOwnerAction(audit, "revoke", account, () => assert.fail("state changed")), /audit write failed/);
  assert.deepEqual(events, []);
});

test("an unavailable terminal write leaves the recorded intent and fails the call", async () => {
  const { audit, events } = auditBinding({ failAction: "OWNER_CONTROL_EXPIRE_IDLE_APPLIED" });
  let changed = false;
  await assert.rejects(runPrivateWorkbenchOwnerAction(audit, "expire-idle", account, () => { changed = true; }), /audit write failed/);
  assert.equal(changed, true);
  assert.deepEqual(events.map(event => event.action), ["OWNER_CONTROL_EXPIRE_IDLE_REQUESTED"]);
});

test("an invalid affected account is refused before any audit or state change", async () => {
  const { audit, events } = auditBinding();
  await assert.rejects(runPrivateWorkbenchOwnerAction(audit, "revoke", "not-an-account-id", () => assert.fail("state changed")), /Invalid/);
  assert.deepEqual(events, []);
});
