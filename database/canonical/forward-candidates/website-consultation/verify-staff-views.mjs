import assert from "node:assert/strict";

export async function verifyStaffViews({ db, staff, outside, staffHttp, issuer, staffOrigin, employee,
  dispatcher, serviceOrg, otherOrg, contractId, newLead, otherFamily }) {
  const base = staffOrigin + "/internal/website-consultations";
  const get = (role, token = "synthetic-dispatcher", headers = {}) => staffHttp(new Request(base + "/views/" + role,
    { headers: { authorization: "Bearer " + token, ...headers } }));
  const view = async (role, token) => {
    const response = await get(role, token);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    return response.json();
  };
  const dispatch = await view("DISPATCHER");
  assert.ok(dispatch.items.some(item => item.leadId === newLead));
  assert.ok(dispatch.summary.total >= 2);
  assert.ok(dispatch.items.every(item => !item.canReveal && !item.canComplete));
  const adviser = await view("ADVISER", "synthetic-staff");
  assert.deepEqual(adviser.items.map(item => item.leadId), [newLead]);
  assert.equal(adviser.summary.total, 1);
  assert.deepEqual(adviser.workload, []);
  assert.ok(adviser.items[0].canReveal && adviser.items[0].canComplete);
  assert.equal(adviser.items[0].canAssign, false);
  assert.equal(adviser.items[0].canReassign, false);
  assert.ok(adviser.items[0].history.some(event => event.kind === "ASSIGNED"));
  assert.doesNotMatch(JSON.stringify([dispatch, adviser]), /@example|contact_envelope|payload_mac|duplicate_match_mac|family_id|client_id/);
  assert.equal((await get("DISPATCHER", "synthetic-staff", { "x-role": "DISPATCHER", "x-principal-id": dispatcher })).status, 403);
  assert.equal((await get("ADVISER")).status, 403);
  for (const token of ["synthetic-staff", "synthetic-dispatcher"]) {
    const founder = await get("FOUNDER", token, { "x-role": "FOUNDER" });
    assert.equal(founder.status, 403);
    assert.deepEqual(await founder.json(), { code: "FOUNDER_SCOPE_UNCONFIRMED" });
  }
  assert.equal((await staffHttp(new Request(base + "/views/FOUNDER"))).status, 401);
  assert.equal((await staff.query("SELECT crm.read_website_consultation_staff_view($1,$2,'FOUNDER') AS view",
    [issuer, "synthetic-dispatcher"])).rows[0].view, null);
  await assert.rejects(outside.query("SELECT crm.read_website_consultation_staff_view($1,$2,'DISPATCHER')",
    [issuer, "synthetic-dispatcher"]), { code: "42501" });
  await assert.rejects(staff.query("SELECT crm.website_consultation_view_scope($1,$2,'DISPATCHER')",
    [dispatcher, newLead]), { code: "42501" });

  // All aggregate, workload, history and row projections must lose the same scope.
  await db.query("UPDATE crm.website_consultation_contract_organizations SET organization_id=$2 WHERE contract_id=$1", [contractId, otherOrg]);
  try {
    for (const [role, token] of [["DISPATCHER", "synthetic-dispatcher"], ["ADVISER", "synthetic-staff"]]) {
      const denied = await view(role, token);
      assert.equal(denied.summary.total, 0);
      assert.deepEqual(denied.items, []);
      assert.deepEqual(denied.services, []);
      assert.deepEqual(denied.workload, []);
    }
  } finally {
    await db.query("UPDATE crm.website_consultation_contract_organizations SET organization_id=$2 WHERE contract_id=$1", [contractId, serviceOrg]);
  }
  await db.query("UPDATE crm.leads SET family_id=$2 WHERE lead_id=$1", [newLead, otherFamily]);
  try {
    const familyDenied = await view("ADVISER", "synthetic-staff");
    assert.equal(familyDenied.summary.total, 0);
    assert.deepEqual(familyDenied.items, []);
    const familyDispatch = await view("DISPATCHER");
    assert.equal(familyDispatch.summary.total, dispatch.summary.total - 1);
    assert.equal(familyDispatch.items.some(item => item.leadId === newLead), false);
  } finally {
    await db.query("UPDATE crm.leads SET family_id=NULL WHERE lead_id=$1", [newLead]);
  }
  for (const [actor, role, token] of [[dispatcher, "DISPATCHER", "synthetic-dispatcher"], [employee, "ADVISER", "synthetic-staff"]]) {
    await db.query(`UPDATE crm.website_consultation_staff_grants SET revoked_at=clock_timestamp()
      WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind=$3`, [actor, serviceOrg, role]);
    try { assert.equal((await get(role, token)).status, 403); }
    finally {
      await db.query(`UPDATE crm.website_consultation_staff_grants SET revoked_at=NULL
        WHERE principal_id=$1 AND organization_id=$2 AND service_domain='EDUCATION' AND grant_kind=$3`, [actor, serviceOrg, role]);
    }
    await db.query("UPDATE auth.external_identities SET status='DISABLED',disabled_at=clock_timestamp() WHERE principal_id=$1", [actor]);
    try { assert.equal((await get(role, token)).status, 403); }
    finally { await db.query("UPDATE auth.external_identities SET status='ACTIVE',disabled_at=NULL WHERE principal_id=$1", [actor]); }
  }
  console.log("PASS role views: server-scoped aggregates, assigned-only adviser, cross-org/family exclusion, live revocation, no sensitive DTOs and Founder HOLD");
}
