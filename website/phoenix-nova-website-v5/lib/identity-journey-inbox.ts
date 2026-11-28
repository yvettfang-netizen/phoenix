import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { identityPrivateHeaders, isIdentityNoticeId, readIdentityRequestBody, sameOriginIdentityRequest } from "./identity-journey-request";

export const identityNoticePath = "/api/family-services/identity-notices";
export type IdentityNotice = { id: string; publishedAt: string; readAt: string | null };

/** Private server binding. Each operation rechecks the session's Canonical
 * principal, selected family, subject and notice purpose in its transaction.
 * The read-marker write and its access audit commit together. */
export interface IdentityInboxProvider {
  resolve(session: { customerId: string; sessionHash: string }): Promise<{
    listAuthorized(): Promise<readonly IdentityNotice[] | null>;
    acknowledgeAuthorized(id: string): Promise<string | null>;
    assertCurrent(): Promise<boolean>;
  } | null>;
}

export function identityInboxEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_INBOX_PROVIDER as IdentityInboxProvider | undefined;
  return env.FAMILY_IDENTITY_INBOX_ENABLED === "true" && typeof provider?.resolve === "function";
}

function normalizedTime(value: string) {
  if (typeof value !== "string") throw new Error("Invalid notice timestamp");
  return new Date(value).toISOString();
}

async function parseNoticeId(request: Request) {
  const input = await readIdentityRequestBody(request, 128);
  return input && Object.keys(input).length === 1 && isIdentityNoticeId(input.id) ? input.id : null;
}

export async function handleIdentityInbox(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityInboxEnabled(env)) return reply(404, "NOT_FOUND");
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityNoticePath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== url.origin) return reply(503, "INBOX_UNAVAILABLE");
  const provider = env.FAMILY_IDENTITY_INBOX_PROVIDER as IdentityInboxProvider;
  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const id = request.method === "POST" ? await parseNoticeId(request) : null;
    if (request.method === "POST" && !id) return reply(400, "INVALID_NOTICE");
    const action = id ? "IDENTITY_INBOX_ACKNOWLEDGE" : "IDENTITY_INBOX_LIST";
    const requestId = crypto.randomUUID();
    await config.recordAccess(session.id, action + "_ATTEMPT", requestId + ":attempt");
    const bound = await provider.resolve({ customerId: session.id, sessionHash: session.token_hash });
    if (!bound || await bound.assertCurrent() !== true) {
      await config.recordAccess(session.id, action + "_DENIED", requestId + ":outcome");
      return reply(403, "ACCESS_DENIED");
    }
    let data;
    if (id) {
      const readAt = await bound.acknowledgeAuthorized(id);
      if (!readAt) {
        await config.recordAccess(session.id, action + "_DENIED", requestId + ":outcome");
        return reply(403, "ACCESS_DENIED");
      }
      data = { id, readAt: normalizedTime(readAt) };
    } else {
      const notices = await bound.listAuthorized();
      if (!notices) {
        await config.recordAccess(session.id, action + "_DENIED", requestId + ":outcome");
        return reply(403, "ACCESS_DENIED");
      }
      if (!Array.isArray(notices) || notices.length > 50) throw new Error("Invalid notice page");
      data = { notices: notices.map(({ id, publishedAt, readAt }) => {
        if (!isIdentityNoticeId(id)) throw new Error("Invalid notice ID");
        const published = normalizedTime(publishedAt);
        const read = readAt === null ? null : normalizedTime(readAt);
        if (read && read < published) throw new Error("Invalid notice sequence");
        return { id, publishedAt: published, readAt: read };
      }) };
    }
    await config.recordAccess(session.id, action + "_PREPARED", requestId + ":prepared");
    const current = await readCustomerSession(request, config, { touch: false });
    if (!current || current.id !== session.id || current.token_hash !== session.token_hash) return reply(401, "SIGN_IN_REQUIRED");
    if (await bound.assertCurrent() !== true || current.valid_until <= Date.now()) return reply(403, "ACCESS_DENIED");
    return Response.json(data, { headers });
  } catch {
    return reply(503, "INBOX_UNAVAILABLE");
  }
}
