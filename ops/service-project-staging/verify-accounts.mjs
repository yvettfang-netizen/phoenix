import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const origin = "http://127.0.0.1:4775";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const fixture = JSON.parse(readFileSync(process.argv[2], "utf8"));
assert(fixture.synthetic === true && Array.isArray(fixture.accounts) && fixture.accounts.length === 2,
  "Two expressly synthetic accounts are required");
for (const account of fixture.accounts) {
  assert(/^[A-Za-z0-9_-]{43}$/.test(account.session) &&
    Array.isArray(account.projects) && account.projects.length > 0 &&
    account.projects.every(id => typeof id === "string" && uuid.test(id)), "Invalid synthetic account fixture");
}
const [a, b] = fixture.accounts;
assert(a.session !== b.session &&
  a.projects.some(id => !b.projects.includes(id)) &&
  b.projects.some(id => !a.projects.includes(id)), "Fixtures must exercise access denial in both directions");
const read = (account, resource) => fetch(origin + resource, {
  headers: { Cookie: "phoenix-local-session=" + account.session },
  redirect: "error",
  signal: AbortSignal.timeout(15000),
});
for (const [account, other] of [[a, b], [b, a]]) {
  const projects = [];
  const cursors = new Set();
  let cursor = null;
  do {
    const resource = "/api/family-services/summary" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : "");
    const response = await read(account, resource);
    assert.equal(response.status, 200, "Authenticated summary failed");
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const data = await response.json();
    assert.equal(data.schemaVersion, "service-project-summary.v1");
    assert(Array.isArray(data.projects) && data.projects.length <= 50, "Invalid summary page");
    projects.push(...data.projects.map(item => item.service_project_id));
    cursor = data.next_cursor;
    assert(cursor === null || typeof cursor === "string", "Invalid summary cursor");
    assert(!cursors.has(cursor) && cursors.size < 10, "Summary pagination did not converge");
    cursors.add(cursor);
  } while (cursor);
  assert.deepEqual(projects.sort(), [...account.projects].sort(), "Authorized summary differs from fixture");
  const denied = await read(account, "/api/service-workbench/projects/" + other.projects.find(id => !account.projects.includes(id)));
  assert.equal(denied.status, 403, "Cross-account detail must be denied");
  const allowed = await read(account, "/api/service-workbench/projects/" + account.projects[0]);
  assert.equal(allowed.status, 200, "Authorized detail failed");
}
console.log("PASS two distinct synthetic account summaries and bidirectional direct-link denial");
console.log("NOT RUN real identity, authorized operational policy, file scanning, or formal recovery");
