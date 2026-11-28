import { readCustomerSession, type AuthConfig } from "./customer-auth";
import {
  identityDelegationNoticeVersion,
  identityDelegationsPath,
  isIdentityDelegationRef,
  isIdentityDelegationThrough,
  type IdentityDelegationInventory,
} from "./identity-journey-delegations-contract";
import { identityProfileEnabled, type IdentityProfileProvider } from "./identity-journey-profile";
import {
  identityPrivateHeaders,
  isIdentityCivilDate,
  isIdentityMemberRef,
  readIdentityRequestBody,
  sameOriginIdentityRequest,
} from "./identity-journey-request";

type Session = { customerId: string; sessionHash: string };

/**
 * The website only passes opaque, session-bound references to this adapter.
 * The adapter must resolve those references to Canonical records and perform
 * the authorization, idempotency, audit, and mutation in one Canonical
 * transaction. `through` is an inclusive Hong Kong civil date; the provider
 * stores the exclusive instant at the following Hong Kong midnight.
 */
export type IdentityDelegationIssue = {
  recipientRef: string;
  caseRefs: string[];
  through: string;
  noticeVersion: string;
  requestRef: string;
};

export type IdentityDelegationRevoke = {
  grantRef: string;
  requestRef: string;
};

export interface IdentityDelegationManagementProvider {
  /**
   * Resolve the current member's independently granted delegation authority.
   * Implementations must re-check the trusted session and membership before
   * each mutation, and retain the chosen case scope and notice version in the
   * same Canonical transaction as immutable request idempotency.
   */
  resolveSelf(session: Session, memberRef: string): Promise<{
    assertCurrent(): Promise<boolean>;
    listAuthorized(): Promise<unknown>;
    issueAuthorized(change: IdentityDelegationIssue): Promise<"ISSUED" | "CONFLICT" | "DENIED">;
    revokeAuthorized(change: IdentityDelegationRevoke): Promise<"REVOKED" | "CONFLICT" | "DENIED">;
  } | null>;
}

const requestRefPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const listFields = ["action", "memberRef"];
const issueFields = ["action", "memberRef", "recipientRef", "caseRefs", "through", "noticeVersion", "confirmed", "requestRef"];
const revokeFields = ["action", "memberRef", "grantRef", "requestRef"];

function exactFields(body: Record<string, unknown>, fields: string[]) {
  const keys = Object.keys(body);
  return keys.length === fields.length && fields.every(field => keys.includes(field));
}

function requestRef(value: unknown): value is string {
  return typeof value === "string" && requestRefPattern.test(value);
}

function caseRefs(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) return null;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isIdentityDelegationRef(item, "case") || seen.has(item)) return null;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function issueChange(body: Record<string, unknown>): IdentityDelegationIssue | null {
  const selectedCases = caseRefs(body.caseRefs);
  if (!exactFields(body, issueFields) || body.action !== "issue" || !isIdentityMemberRef(body.memberRef) ||
    !isIdentityDelegationRef(body.recipientRef, "recipient") || selectedCases === null ||
    !isIdentityDelegationThrough(body.through) || body.noticeVersion !== identityDelegationNoticeVersion ||
    body.confirmed !== true || !requestRef(body.requestRef)) return null;
  return {
    recipientRef: body.recipientRef,
    caseRefs: selectedCases,
    through: body.through,
    noticeVersion: body.noticeVersion,
    requestRef: body.requestRef.toLowerCase(),
  };
}

function revokeChange(body: Record<string, unknown>): IdentityDelegationRevoke | null {
  if (!exactFields(body, revokeFields) || body.action !== "revoke" || !isIdentityMemberRef(body.memberRef) ||
    !isIdentityDelegationRef(body.grantRef, "delegation") || !requestRef(body.requestRef)) return null;
  return { grantRef: body.grantRef, requestRef: body.requestRef.toLowerCase() };
}

function validListedDate(value: unknown): value is string {
  return isIdentityCivilDate(value) && value < "9999-12-31";
}

function boundedLabel(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

/**
 * Only this projection is allowed to leave the provider. It deliberately
 * drops all Canonical identifiers, member details, case descriptions, and
 * audit metadata that an adapter may have used internally.
 */
function privateInventory(input: unknown): IdentityDelegationInventory {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid delegation projection");
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.recipients) || raw.recipients.length > 64 ||
    !Array.isArray(raw.cases) || raw.cases.length > 128 ||
    !Array.isArray(raw.grants) || raw.grants.length > 128) throw new Error("Invalid delegation projection");

  const recipientRefs = new Set<string>();
  const recipients = raw.recipients.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid delegation recipient");
    const { ref, label } = item as Record<string, unknown>;
    if (!isIdentityDelegationRef(ref, "recipient") || recipientRefs.has(ref) || !boundedLabel(label, 120)) {
      throw new Error("Invalid delegation recipient");
    }
    recipientRefs.add(ref);
    return { ref, label: label.trim() };
  });

  const caseRefsSeen = new Set<string>();
  const cases = raw.cases.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid delegation case");
    const { ref, label } = item as Record<string, unknown>;
    if (!isIdentityDelegationRef(ref, "case") || caseRefsSeen.has(ref) || !boundedLabel(label, 160)) {
      throw new Error("Invalid delegation case");
    }
    caseRefsSeen.add(ref);
    return { ref, label: label.trim() };
  });

  const grantRefsSeen = new Set<string>();
  const grants = raw.grants.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid delegation grant");
    const { ref, recipientLabel, caseLabels, through } = item as Record<string, unknown>;
    if (!isIdentityDelegationRef(ref, "delegation") || grantRefsSeen.has(ref) ||
      !boundedLabel(recipientLabel, 120) || !Array.isArray(caseLabels) || caseLabels.length < 1 || caseLabels.length > 32 ||
      !caseLabels.every(label => boundedLabel(label, 160)) || !validListedDate(through)) {
      throw new Error("Invalid delegation grant");
    }
    grantRefsSeen.add(ref);
    return {
      ref,
      recipientLabel: recipientLabel.trim(),
      caseLabels: caseLabels.map(label => label.trim()),
      through,
    };
  });

  return { recipients, cases, grants };
}

function delegatedProfileResolverAvailable(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_PROFILE_PROVIDER as IdentityProfileProvider | undefined;
  return env.FAMILY_IDENTITY_DELEGATED_PROFILE_ENABLED === "true" &&
    typeof provider?.resolveDelegatedMember === "function";
}

export function identityDelegationManagementEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_DELEGATION_MANAGEMENT_PROVIDER as IdentityDelegationManagementProvider | undefined;
  // Management remains available for safe inventory/revocation even when
  // delegated reads are paused. This lets a customer revoke an existing
  // grant without reopening issuance merely by enabling the management flag.
  return identityProfileEnabled(env) &&
    env.FAMILY_IDENTITY_DELEGATION_MANAGEMENT_ENABLED === "true" &&
    typeof provider?.resolveSelf === "function";
}

export async function handleIdentityDelegations(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityDelegationManagementEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityDelegationsPath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "DELEGATION_UNAVAILABLE");

  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    // 32 opaque case references at the contract's 96-character maximum fit
    // below this bound while oversized or padded requests fail closed.
    const body = await readIdentityRequestBody(request, 4096);
    if (!body || !isIdentityMemberRef(body.memberRef) ||
      (body.action !== "list" && body.action !== "issue" && body.action !== "revoke")) {
      return reply(400, "INVALID_DELEGATION_REQUEST");
    }
    const issue = body.action === "issue" ? issueChange(body) : null;
    const revoke = body.action === "revoke" ? revokeChange(body) : null;
    if ((body.action === "list" && !exactFields(body, listFields)) ||
      (body.action === "issue" && !issue) || (body.action === "revoke" && !revoke)) {
      return reply(400, "INVALID_DELEGATION_REQUEST");
    }
    // Do not even resolve a management scope for a disabled issuance surface;
    // the independent delegated-profile resolver is part of the issue gate.
    if (issue && !delegatedProfileResolverAvailable(env)) return reply(403, "ACCESS_DENIED");

    const requestId = crypto.randomUUID();
    await config.recordAccess(session.id,
      issue ? "IDENTITY_DELEGATION_ISSUE_ATTEMPT" : revoke ? "IDENTITY_DELEGATION_REVOKE_ATTEMPT" : "IDENTITY_DELEGATION_LIST_ATTEMPT",
      requestId);
    const provider = env.FAMILY_IDENTITY_DELEGATION_MANAGEMENT_PROVIDER as IdentityDelegationManagementProvider;
    const scope = await provider.resolveSelf({ customerId: session.id, sessionHash: session.token_hash }, body.memberRef);
    if (!scope || await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");

    const currentSession = async () => {
      const current = await readCustomerSession(request, config, { touch: false });
      return current?.id === session.id && current.token_hash === session.token_hash ? current : null;
    };

    if (issue) {
      // Issuance widens another member's read surface, so it additionally
      // requires the independently approved delegated-profile rollout and its
      // exact isolated resolver. A disabled rollout is an authorization denial
      // (403), while list/revoke remain available for cleanup.
      if (!await currentSession() || await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
      switch (await scope.issueAuthorized(issue)) {
        case "ISSUED": return Response.json({ status: "ISSUED" }, { headers });
        case "CONFLICT": return reply(409, "DELEGATION_CONFLICT");
        case "DENIED": return reply(403, "ACCESS_DENIED");
        default: return reply(503, "DELEGATION_UNAVAILABLE");
      }
    }

    if (revoke) {
      if (!await currentSession() || await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
      switch (await scope.revokeAuthorized(revoke)) {
        case "REVOKED": return Response.json({ status: "REVOKED" }, { headers });
        case "CONFLICT": return reply(409, "DELEGATION_CONFLICT");
        case "DENIED": return reply(403, "ACCESS_DENIED");
        default: return reply(503, "DELEGATION_UNAVAILABLE");
      }
    }

    const input = await scope.listAuthorized();
    if (input === null) return reply(403, "ACCESS_DENIED");
    const output = privateInventory(input);
    const current = await currentSession();
    if (!current) return reply(401, "SIGN_IN_REQUIRED");
    if (await scope.assertCurrent() !== true || current.valid_until <= Date.now()) return reply(403, "ACCESS_DENIED");
    return Response.json(output, { headers });
  } catch {
    return reply(503, "DELEGATION_UNAVAILABLE");
  }
}
