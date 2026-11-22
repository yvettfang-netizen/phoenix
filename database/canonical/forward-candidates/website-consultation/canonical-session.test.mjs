import assert from "node:assert/strict";
import { test } from "node:test";
import { createWebsiteIntakeConnection } from "./canonical-session.mjs";

const principalId = "019347ec-7740-7000-a000-000000000001";
const nonce = "028347ec-7740-4000-a000-000000000001";
const ticket = "028347ec-7740-4000-a000-000000000002";

function fixture({ allowed = true, cleared = true } = {}) {
  const log = [];
  const pool = name => ({ async connect() {
    return {
      async query(sql, params) {
        log.push([name, sql, params]);
        if (sql.includes("issue_website_intake_ticket")) return { rows: [{ ticket }] };
        if (sql.endsWith(" AS allowed")) return { rows: [{ allowed }] };
        if (sql.endsWith(" AS cleared")) return { rows: [{ cleared }] };
        return { rows: [] };
      },
      release(destroy) { log.push([name, "release", destroy]); },
    };
  } });
  return { log, run: createWebsiteIntakeConnection({ binderPool: pool("binder"), writerPool: pool("writer"), principalId }) };
}

test("binds the specific request before running the transaction and clears context before release", async () => {
  const { log, run } = fixture();
  assert.equal(await run(nonce, async client => {
    await client.query("BEGIN");
    await client.query("COMMIT");
    return "persisted";
  }), "persisted");
  assert.deepEqual(log[1][2], [principalId, nonce]);
  const redeem = log.findIndex(([, sql]) => sql.includes("redeem_context_ticket"));
  const verify = log.findIndex(([, sql]) => sql.endsWith(" AS allowed"));
  const begin = log.findIndex(([, sql]) => sql === "BEGIN");
  const clear = log.findIndex(([, sql]) => sql.endsWith(" AS cleared"));
  assert.deepEqual(log[redeem][2], [ticket, principalId]);
  assert.deepEqual(log[verify][2], [nonce, principalId]);
  assert.ok(redeem < verify && verify < begin && begin < clear);
  assert.deepEqual(log.at(-1), ["writer", "release", false]);
});

test("destroys the writer on identity mismatch without invoking the transaction", async () => {
  const { log, run } = fixture({ allowed: false });
  let invoked = false;
  await assert.rejects(run(nonce, async () => { invoked = true; }), /binding rejected/);
  assert.equal(invoked, false);
  assert.deepEqual(log.at(-1), ["writer", "release", true]);
});

test("withholds success and destroys the writer when context cleanup cannot be confirmed", async () => {
  const { log, run } = fixture({ cleared: false });
  await assert.rejects(run(nonce, async () => "persisted"), /context was not cleared/);
  assert.deepEqual(log.at(-1), ["writer", "release", true]);
});
