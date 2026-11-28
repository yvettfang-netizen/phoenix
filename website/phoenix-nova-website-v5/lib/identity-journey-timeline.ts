import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { identityPrivateHeaders, isIdentityNoticeId, sameOriginIdentityRequest } from "./identity-journey-request";

export const identityTimelinePath = "/api/family-services/identity-timeline";
export type IdentityStayDate = { id: string; validUntil: string; recordedAt: string; current: boolean };

/** Server binding only. Resolve the authenticated subject. The list operation
 * holds the exact IDENTITY_READ grant while projecting source revisions. */
export interface IdentityTimelineProvider {
  resolve(session: { customerId: string; sessionHash: string }): Promise<{
    listAuthorized(): Promise<readonly IdentityStayDate[] | null>;
    assertCurrent(): Promise<boolean>;
  } | null>;
}

export function identityTimelineEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_TIMELINE_PROVIDER as IdentityTimelineProvider | undefined;
  return env.FAMILY_IDENTITY_TIMELINE_ENABLED === "true" && typeof provider?.resolve === "function";
}

function minimizedStayDate(row: IdentityStayDate): IdentityStayDate {
  if (!isIdentityNoticeId(row.id) || typeof row.current !== "boolean" || typeof row.validUntil !== "string" ||
      !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(row.validUntil) ||
      typeof row.recordedAt !== "string") throw new Error("Invalid identity timeline entry");
  const day = new Date(row.validUntil + "T00:00:00.000Z");
  if (day.toISOString().slice(0, 10) !== row.validUntil) throw new Error("Invalid identity civil date");
  return { id: row.id, validUntil: row.validUntil, recordedAt: new Date(row.recordedAt).toISOString(), current: row.current };
}

export async function handleIdentityTimeline(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityTimelineEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "GET") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityTimelinePath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "TIMELINE_UNAVAILABLE");
  const provider = env.FAMILY_IDENTITY_TIMELINE_PROVIDER as IdentityTimelineProvider;
  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const requestId = crypto.randomUUID();
    await config.recordAccess(session.id, "IDENTITY_TIMELINE_READ_ATTEMPT", requestId + ":attempt");
    const bound = await provider.resolve({ customerId: session.id, sessionHash: session.token_hash });
    if (!bound || await bound.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    const source = await bound.listAuthorized();
    if (!source) return reply(403, "ACCESS_DENIED");
    if (!Array.isArray(source) || source.length > 50) throw new Error("Invalid identity timeline");
    const dates = source.map(minimizedStayDate);
    await config.recordAccess(session.id, "IDENTITY_TIMELINE_READ_PREPARED", requestId + ":prepared");
    const current = await readCustomerSession(request, config, { touch: false });
    if (!current || current.id !== session.id || current.token_hash !== session.token_hash) return reply(401, "SIGN_IN_REQUIRED");
    if (await bound.assertCurrent() !== true || current.valid_until <= Date.now()) return reply(403, "ACCESS_DENIED");
    return Response.json({ dates }, { headers });
  } catch {
    return reply(503, "TIMELINE_UNAVAILABLE");
  }
}
