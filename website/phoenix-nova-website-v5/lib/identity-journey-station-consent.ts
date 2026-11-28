import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { identityInboxEnabled } from "./identity-journey-inbox";
import { identityProfileEnabled } from "./identity-journey-profile";
import {
  identityPrivateHeaders,
  isIdentityMemberRef,
  readIdentityRequestBody,
  sameOriginIdentityRequest,
} from "./identity-journey-request";
import {
  identityStationConsentPath,
  identityStationNoticeVersion,
  isIdentityStationRef,
  isIdentityStationThrough,
  projectIdentityStationInventory,
} from "./identity-journey-station-consent-contract";

export type IdentityStationConsentIssue = {
  caseRef: string;
  through: string;
  noticeVersion: typeof identityStationNoticeVersion;
  confirmed: true;
  requestRef: string;
};

/**
 * Trusted server adapter. Opaque references must bind the current session,
 * Canonical family, authenticated owner and exact case or grant. Re-check that
 * scope in each database transaction. Bind a stable grant ID and the exclusive
 * instant after the requested Hong Kong civil date to each issuance request.
 * Require a live FAMILY actor to call the private Canonical candidate routines.
 */
export interface IdentityStationConsentProvider {
  resolveSelf(session: { customerId: string; sessionHash: string }, memberRef: string): Promise<{
    assertCurrent(): Promise<boolean>;
    listAuthorized(): Promise<unknown>;
    issueAuthorized(change: IdentityStationConsentIssue): Promise<"ISSUED" | "CONFLICT" | "DENIED">;
    revokeAuthorized(grantRef: string): Promise<"REVOKED" | "DENIED">;
  } | null>;
}

const requestPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasFields(body: Record<string, unknown>, fields: readonly string[]) {
  return Object.keys(body).length === fields.length && fields.every(key => Object.hasOwn(body, key));
}

function matches(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function readIssue(body: Record<string, unknown>): IdentityStationConsentIssue | null {
  if (!hasFields(body, ["action", "memberRef", "caseRef", "through", "noticeVersion", "confirmed", "requestRef"]) ||
    !isIdentityStationRef(body.caseRef, "case") || !isIdentityStationThrough(body.through) ||
    body.noticeVersion !== identityStationNoticeVersion || body.confirmed !== true ||
    !matches(body.requestRef, requestPattern)) return null;
  return {
    caseRef: body.caseRef, through: body.through, noticeVersion: identityStationNoticeVersion,
    confirmed: true, requestRef: body.requestRef.toLowerCase(),
  };
}

export function identityStationConsentEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_STATION_CONSENT_PROVIDER as IdentityStationConsentProvider | undefined;
  return identityProfileEnabled(env) && env.FAMILY_IDENTITY_STATION_CONSENT_ENABLED === "true" &&
    typeof provider?.resolveSelf === "function";
}

export async function handleIdentityStationConsent(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityStationConsentEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityStationConsentPath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "STATION_CONSENT_UNAVAILABLE");

  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const body = await readIdentityRequestBody(request, 1024);
    if (!body || !isIdentityMemberRef(body.memberRef)) return reply(400, "INVALID_STATION_CONSENT_REQUEST");
    const issue = body.action === "issue" ? readIssue(body) : null;
    const revoke = body.action === "revoke" && hasFields(body, ["action", "memberRef", "grantRef"]) &&
      isIdentityStationRef(body.grantRef, "grant") ? body.grantRef : null;
    const list = body.action === "list" && hasFields(body, ["action", "memberRef"]);
    if (!issue && !revoke && !list) return reply(400, "INVALID_STATION_CONSENT_REQUEST");
    const canIssue = identityInboxEnabled(env);
    if (issue && !canIssue) return reply(403, "ACCESS_DENIED");

    const action = issue ? "ISSUE" : revoke ? "REVOKE" : "LIST";
    await config.recordAccess(session.id, "IDENTITY_STATION_CONSENT_" + action + "_ATTEMPT", crypto.randomUUID());
    const provider = env.FAMILY_IDENTITY_STATION_CONSENT_PROVIDER as IdentityStationConsentProvider;
    const scope = await provider.resolveSelf({ customerId: session.id, sessionHash: session.token_hash }, body.memberRef);
    if (!scope) return reply(403, "ACCESS_DENIED");
    const currentSession = async () => {
      const current = await readCustomerSession(request, config, { touch: false });
      return current?.id === session.id && current.token_hash === session.token_hash;
    };
    if (!await currentSession()) return reply(401, "SIGN_IN_REQUIRED");
    if (await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");

    if (issue || revoke) {
      // The private adapter performs live scope verification, the audited
      // mutation and request replay protection in the same transaction.
      const result = issue ? await scope.issueAuthorized(issue) : await scope.revokeAuthorized(revoke!);
      if (!await currentSession()) return reply(401, "SIGN_IN_REQUIRED");
      if (await scope.assertCurrent() !== true || result === "DENIED") return reply(403, "ACCESS_DENIED");
      if (result === "CONFLICT") return reply(409, "STATION_CONSENT_CONFLICT");
      if (issue ? result === "ISSUED" : result === "REVOKED") return Response.json({ status: result }, { headers });
      return reply(503, "STATION_CONSENT_UNAVAILABLE");
    }

    const data = projectIdentityStationInventory(await scope.listAuthorized(), canIssue);
    if (!await currentSession()) return reply(401, "SIGN_IN_REQUIRED");
    if (await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    return Response.json(data, { headers });
  } catch {
    return reply(503, "STATION_CONSENT_UNAVAILABLE");
  }
}
