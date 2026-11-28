import assert from "node:assert/strict";

// Reconcile the existing scoped staff view for the same case. The Founder
// view stays unavailable until its separate management grant is approved.
export function linkedOperatingInputs({ staffHttp, staffOrigin, assignee }) {
  const base = staffOrigin + "/internal/website-consultations/views/";
  const read = (name, token, headers = {}) => staffHttp(new Request(base + name,
    { headers: { authorization: "Bearer " + token, ...headers } }));
  const dispatcherToken = "synthetic-dispatcher";
  const adviserToken = "synthetic-staff";
  const education = view => view.services.find(row => row.service === "EDUCATION")?.count ?? 0;
  const pending = view => view.workload.find(row => row.assigneeId === assignee)?.pending ?? 0;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" });
  const delta = (after, before, expected) => {
    for (const [key, n] of Object.entries(expected)) assert.equal(after.summary[key] - before.summary[key], n, key);
  };
  const dispatcher = async () => {
    const response = await read("DISPATCHER", dispatcherToken);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const data = await response.json();
    assert.equal(data.timeZone, "Asia/Shanghai");
    assert.ok(Number.isFinite(Date.parse(data.asOf)));
    return data;
  };
  return {
    dispatcher,
    async received(before, leadId, recordedAt) {
      const data = await dispatcher();
      delta(data, before, { total: 1, unassigned: 1, pending: 0 });
      assert.equal(data.limited, false);
      const currentDay = day.format(new Date(data.asOf));
      assert.equal(data.summary.newToday, data.items.filter(row => day.format(new Date(row.receivedAt)) === currentDay).length);
      assert.equal(education(data) - education(before), 1);
      const row = data.items.find(item => item.leadId === leadId);
      assert.equal(row.status, "NEW");
      assert.equal(Date.parse(row.receivedAt), recordedAt.getTime());
      return data;
    },
    async assigned(received, leadId) {
      const data = await dispatcher();
      delta(data, received, { total: 0, unassigned: -1, pending: 1 });
      assert.equal(pending(data) - pending(received), 1);
      const response = await read("ADVISER", adviserToken);
      assert.equal(response.status, 200);
      const row = (await response.json()).items.find(item => item.leadId === leadId);
      assert.equal(row.assigneeId, assignee);
      assert.equal(row.taskStatus, "PENDING");
      assert.ok(row.history.some(event => event.kind === "ASSIGNED"));
      return data;
    },
    async followedUp(assigned, leadId) {
      const data = await dispatcher();
      delta(data, assigned, { total: 0, pending: -1, completed: 1, contacted: 1 });
      assert.equal(pending(data) - pending(assigned), -1);
      assert.equal(data.items.find(item => item.leadId === leadId).taskStatus, "COMPLETED");
    },
    async converted(leadId) {
      const data = await dispatcher();
      assert.equal(data.items.some(item => item.leadId === leadId), false);
      const denied = await read("FOUNDER", dispatcherToken, { "x-role": "FOUNDER" });
      assert.equal(denied.status, 403);
      assert.deepEqual(await denied.json(), { code: "FOUNDER_SCOPE_UNCONFIRMED" });
      console.log("PASS same-case staff metrics: Education receipt, queue, adviser load and follow-up; Founder scope denied");
    },
  };
}
