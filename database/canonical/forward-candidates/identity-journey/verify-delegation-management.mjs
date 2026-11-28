import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { handleIdentityDelegations } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-delegations.ts";
import {
  identityDelegationsPath, identityDelegationNoticeVersion,
} from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-delegations-contract.ts";
import { handleIdentityProfile } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile.ts";
import { identityProfilePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile-contract.ts";

export async function verifyDelegationManagement({ authConfig, browser, ...fixture }) {
  const ownerRef = "member_management_owner_000000000000000000000000";
  const delegateViewRef = "member_management_delegate_000000000000000000000000";
  const recipient = { ref: "recipient_000000000000000000000001", label: "Synthetic recipient" };
  const identityCase = { ref: "case_000000000000000000000001", label: "Synthetic identity case" };
  const delegationRef = "delegation_000000000000000000000001";
  const owner = { customerId: "synthetic-delegation-owner", sessionHash: "synthetic-owner-session" };
  const delegate = { customerId: "synthetic-delegation-reader", sessionHash: "synthetic-reader-session" };
  const matches = (session, actor) => session.customerId === actor.customerId && session.sessionHash === actor.sessionHash;
  const authorizedOwner = async () => true;
  let lastIssue;
  const provider = {
    async resolveSelf(session, ref) {
      if (!matches(session, owner) || ref !== ownerRef) return null;
      return {
        assertCurrent: authorizedOwner,
        async listAuthorized() {
          const active = fixture.listDelegations();
          return {
            recipients: [recipient],
            cases: [identityCase],
            grants: active.map(() => ({
              ref: delegationRef, recipientLabel: recipient.label, caseLabels: [identityCase.label], through: lastIssue.through,
            })),
          };
        },
        async issueAuthorized(change) {
          if (change.recipientRef !== recipient.ref || change.caseRefs.length !== 1 || change.caseRefs[0] !== identityCase.ref) {
            return "DENIED";
          }
          // The disposable fixture pins one candidate ID to one request and
          // exercises replay against the persisted SQL scope and expiry.
          if (lastIssue && (lastIssue.requestRef !== change.requestRef || lastIssue.through !== change.through)) return "CONFLICT";
          if (!fixture.issueDelegation(change)) return "DENIED";
          lastIssue = change;
          return "ISSUED";
        },
        async revokeAuthorized(change) {
          return change.grantRef === delegationRef && fixture.revokeDelegation() ? "REVOKED" : "DENIED";
        },
      };
    },
  };
  const profileProvider = {
    async resolveRoster(session) {
      if (!matches(session, owner)) return null;
      return {
        assertCurrent: authorizedOwner,
        async listAuthorized() { return [{ ref: ownerRef, label: "Synthetic profile owner", access: "SELF" }]; },
      };
    },
    async resolveMember(session, ref) {
      if (!matches(session, owner) || ref !== ownerRef) return null;
      return { access: "SELF", assertCurrent: authorizedOwner, async readAuthorized() { return fixture.readOwnedProfile(); } };
    },
    async resolveDelegatedMember(session, ref) {
      if (!matches(session, delegate) || ref !== delegateViewRef) return null;
      return {
        access: "DELEGATE",
        async assertCurrent() { return fixture.canReadDelegatedProfile(); },
        async readAuthorized() { return fixture.readDelegatedProfile(); },
      };
    },
  };
  const env = {
    FAMILY_IDENTITY_PROFILE_ENABLED: "true",
    FAMILY_IDENTITY_PROFILE_PROVIDER: profileProvider,
    FAMILY_IDENTITY_DELEGATED_PROFILE_ENABLED: "true",
    FAMILY_IDENTITY_DELEGATION_MANAGEMENT_ENABLED: "true",
    FAMILY_IDENTITY_DELEGATION_MANAGEMENT_PROVIDER: provider,
  };
  const auth = (origin, actor) => ({
    ...authConfig, origin,
    async verifySession() {
      return actor ? { id: actor.customerId, username: "synthetic", token_hash: actor.sessionHash,
        created_at: Date.now() - 1000, valid_until: Date.now() + 60_000 } : null;
    },
  });
  const origin = authConfig.origin;
  const request = (path, body, from = origin) => new Request(origin + path, {
    method: "POST", headers: { origin: from, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const manage = (action, fields = {}, actor = owner, from = origin) =>
    handleIdentityDelegations(request(identityDelegationsPath, { action, memberRef: ownerRef, ...fields }, from), env, auth(origin, actor));
  const readAsDelegate = () => handleIdentityProfile(request(identityProfilePath, { memberRef: delegateViewRef }), env, auth(origin, delegate));
  const through = fixture.today;
  const issue = { recipientRef: recipient.ref, caseRefs: [identityCase.ref], through, noticeVersion: identityDelegationNoticeVersion,
    confirmed: true, requestRef: randomUUID() };
  const inactive = () => assert.deepEqual(fixture.listDelegations(), []);
  inactive();
  assert.equal((await readAsDelegate()).status, 403);
  env.FAMILY_IDENTITY_DELEGATION_MANAGEMENT_ENABLED = "false";
  assert.equal((await manage("list")).status, 404);
  env.FAMILY_IDENTITY_DELEGATION_MANAGEMENT_ENABLED = "true";
  const response = await manage("list");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), { recipients: [recipient], cases: [identityCase], grants: [] });
  assert.equal((await manage("issue", issue, null)).status, 401);
  assert.equal((await manage("issue", issue, delegate)).status, 403);
  assert.equal((await manage("issue", issue, owner, "https://different.synthetic.invalid")).status, 403);
  assert.equal((await manage("issue", { ...issue, confirmed: false })).status, 400);
  assert.equal((await manage("issue", { ...issue, noticeVersion: "previous" })).status, 400);
  assert.equal((await manage("issue", { ...issue, caseRefs: [identityCase.ref, identityCase.ref] })).status, 400);
  assert.equal((await manage("issue", { ...issue, recipientRef: "recipient_000000000000000000000002" })).status, 403);
  assert.equal((await manage("issue", { ...issue, familyId: randomUUID() })).status, 400);
  env.FAMILY_IDENTITY_DELEGATED_PROFILE_ENABLED = "false";
  assert.equal((await manage("issue", issue)).status, 403);
  assert.equal((await manage("list")).status, 200);
  env.FAMILY_IDENTITY_DELEGATED_PROFILE_ENABLED = "true";
  inactive();

  async function verifyIssued() {
    const active = fixture.listDelegations();
    assert.equal(active.length, 1);
    assert.equal(Date.parse(active[0].valid_until), Date.parse(lastIssue.through + "T16:00:00Z"));
    const first = await readAsDelegate();
    assert.equal(first.status, 200);
    const output = await first.json();
    assert.equal(output.episodes.length, 1);
    assert.ok(output.episodes[0].milestones.some(row => row.kind === "STAY_EXPIRY" && row.on === fixture.expectedDate));
    assert.deepEqual(await (await manage("issue", { ...lastIssue, confirmed: true })).json(), { status: "ISSUED" });
    assert.equal((await manage("issue", { ...lastIssue, confirmed: true, through: "2099-12-31" })).status, 409);
    assert.equal(fixture.listDelegations().length, 1);
    assert.equal((await manage("revoke", { grantRef: delegationRef, requestRef: randomUUID() }, delegate)).status, 403);
    env.FAMILY_IDENTITY_DELEGATED_PROFILE_ENABLED = "false";
    assert.equal((await readAsDelegate()).status, 403);
    assert.equal((await manage("list")).status, 200);
  }

  if (browser) {
    await browser({
      profilePath: identityProfilePath,
      managementPath: identityDelegationsPath,
      handleProfile: (input, browserOrigin, hasSession) => handleIdentityProfile(input, env, auth(browserOrigin, hasSession ? owner : null)),
      handleManagement: (input, browserOrigin, hasSession) => handleIdentityDelegations(input, env, auth(browserOrigin, hasSession ? owner : null)),
      through, recipientLabel: recipient.label, caseLabel: identityCase.label, verifyIssued,
    });
  } else {
    const created = await manage("issue", issue);
    assert.equal(created.status, 200);
    assert.deepEqual(await created.json(), { status: "ISSUED" });
    await verifyIssued();
    const revoked = await manage("revoke", { grantRef: delegationRef, requestRef: randomUUID() });
    assert.equal(revoked.status, 200);
    assert.deepEqual(await revoked.json(), { status: "REVOKED" });
  }
  inactive();
  env.FAMILY_IDENTITY_DELEGATED_PROFILE_ENABLED = "true";
  assert.equal((await readAsDelegate()).status, 403);
  assert.equal((await manage("issue", { ...lastIssue, confirmed: true })).status, 403);
  assert.deepEqual((await (await manage("list")).json()).grants, []);
  console.log("PASS owner delegation inventory, explicit consent, scoped issuance, idempotency, reader verification, and owner revocation while delegated reads are switched off");
}
