import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { hkCivilDate } from "./identity-journey";
import { buildIdentityResidenceOverview } from "./identity-journey-residence";
import { identityMemberResidencePath } from "./identity-journey-residence-contract";
import { identityPrivateHeaders, readIdentityMemberSelection, sameOriginIdentityRequest } from "./identity-journey-request";

/** Lock both the live, session-bound profile reference and the separate
 * residence grant in the transaction that performs the Canonical read. */
export interface IdentityMemberResidenceProvider {
  resolveMember(session: { customerId: string; sessionHash: string }, memberRef: string): Promise<{
    assertCurrent(): Promise<boolean>;
    listAuthorized(from: string, untilBefore: string): Promise<unknown[] | null>;
  } | null>;
}

export function identityMemberResidenceEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_MEMBER_RESIDENCE_PROVIDER as IdentityMemberResidenceProvider | undefined;
  return env.FAMILY_IDENTITY_PROFILE_ENABLED === "true" && env.FAMILY_IDENTITY_MEMBER_RESIDENCE_ENABLED === "true" &&
    typeof provider?.resolveMember === "function";
}

export async function handleIdentityMemberResidence(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityMemberResidenceEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityMemberResidencePath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "RESIDENCE_UNAVAILABLE");
  const provider = env.FAMILY_IDENTITY_MEMBER_RESIDENCE_PROVIDER as IdentityMemberResidenceProvider;
  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const memberRef = await readIdentityMemberSelection(request);
    if (!memberRef) return reply(400, "INVALID_MEMBER_SELECTION");
    const requestId = crypto.randomUUID();
    await config.recordAccess(session.id, "IDENTITY_MEMBER_RESIDENCE_READ_ATTEMPT", requestId + ":attempt");
    const scope = await provider.resolveMember({ customerId: session.id, sessionHash: session.token_hash }, memberRef);
    if (!scope || await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    const asOf = hkCivilDate(new Date());
    const records = await scope.listAuthorized((Number(asOf.slice(0, 4)) - 6) + "-01-01", asOf);
    if (records === null) return reply(403, "ACCESS_DENIED");
    const overview = buildIdentityResidenceOverview({ records, canReport: false }, asOf, false);
    await config.recordAccess(session.id, "IDENTITY_MEMBER_RESIDENCE_READ_PREPARED", requestId + ":prepared");
    const current = await readCustomerSession(request, config, { touch: false });
    if (!current || current.id !== session.id || current.token_hash !== session.token_hash) return reply(401, "SIGN_IN_REQUIRED");
    if (await scope.assertCurrent() !== true || current.valid_until <= Date.now()) return reply(403, "ACCESS_DENIED");
    return Response.json(overview, { headers });
  } catch {
    return reply(503, "RESIDENCE_UNAVAILABLE");
  }
}
