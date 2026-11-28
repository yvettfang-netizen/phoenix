import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { identityInboxEnabled } from "./identity-journey-inbox";
import { hasIdentityScope, identityConsultationSummary, type IdentityDate, type SubjectAuthority } from "./identity-journey";
import { identityPrivateHeaders, isIdentityNoticeId, readIdentityRequestBody, sameOriginIdentityRequest } from "./identity-journey-request";

export const identityConsultationPath = "/api/family-services/identity-consultation";
export const identityConsultationRevision = "IDENTITY_CONSULTATION_V1";
export const identityConsultationTopics = ["RENEWAL", "DOCUMENT", "STATUS_REVIEW"] as const;
type Topic = (typeof identityConsultationTopics)[number];
type Summary = ReturnType<typeof identityConsultationSummary>;
type Outcome = "RECEIVED" | "ALREADY_RECEIVED" | "DENIED";
type Subject = Pick<SubjectAuthority, "family" | "subject">;

/**
 * Server-owned binding. The provider resolves a delivered notice addressed to
 * the live session, the exact subject/family and existing verified CRM client.
 * It records the explicit, versioned opt-in, rechecks and locks independent
 * consultation authority, and invokes appendNeed using the existing CRM writer.
 * Intent, the CRM result and access audit must commit together or use that
 * writer's durable idempotency protocol; retries may not create another Client.
 * No write may occur before the supplied callback requests it.
 */
export interface IdentityConsultationProvider {
  withAuthorizedIntent(input: {
    customerId: string;
    sessionHash: string;
    noticeId: string;
    topic: Topic;
    consentRevision: string;
    requestId: string;
  }, action: (context: {
    scope: Subject;
    consultationAuthority: SubjectAuthority | null;
    verifiedDate: IdentityDate | null;
    appendNeed(summary: Summary): Promise<Outcome>;
  }) => Promise<Outcome>): Promise<Outcome>;
}

export function identityConsultationEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_CONSULTATION_PROVIDER as IdentityConsultationProvider | undefined;
  return identityInboxEnabled(env) && env.FAMILY_IDENTITY_CONSULTATION_ENABLED === "true" &&
    env.FAMILY_IDENTITY_CONSULTATION_CONSENT_REVISION === identityConsultationRevision &&
    typeof provider?.withAuthorizedIntent === "function";
}

function isTopic(value: unknown): value is Topic {
  return identityConsultationTopics.some(topic => topic === value);
}

export async function handleIdentityConsultation(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityConsultationEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityConsultationPath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "CONSULTATION_UNAVAILABLE");
  const provider = env.FAMILY_IDENTITY_CONSULTATION_PROVIDER as IdentityConsultationProvider;

  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const body = await readIdentityRequestBody(request, 256);
    if (!body || Object.keys(body).length !== 4 || !isIdentityNoticeId(body.noticeId) ||
        !isTopic(body.topic) || body.accepted !== true || body.consentRevision !== identityConsultationRevision) {
      return reply(400, "CONSULTATION_INTENT_REQUIRED");
    }
    const topic = body.topic;
    const requestId = crypto.randomUUID();
    await config.recordAccess(session.id, "IDENTITY_CONSULTATION_ATTEMPT", requestId + ":attempt");
    const outcome = await provider.withAuthorizedIntent({
      customerId: session.id,
      sessionHash: session.token_hash,
      noticeId: body.noticeId.toLowerCase(),
      topic,
      consentRevision: identityConsultationRevision,
      requestId,
    }, async ({ scope, consultationAuthority, verifiedDate, appendNeed }) => {
      const now = new Date();
      if (session.valid_until <= now.getTime() || !hasIdentityScope(scope, consultationAuthority, "IDENTITY_CRM", now)) {
        return "DENIED";
      }
      return appendNeed(identityConsultationSummary(scope, consultationAuthority, topic, verifiedDate, now));
    });
    if (outcome === "DENIED") return reply(403, "ACCESS_DENIED");
    if (outcome !== "RECEIVED" && outcome !== "ALREADY_RECEIVED") return reply(503, "CONSULTATION_UNAVAILABLE");
    const current = await readCustomerSession(request, config, { touch: false });
    if (!current || current.id !== session.id || current.token_hash !== session.token_hash) return reply(401, "SIGN_IN_REQUIRED");
    return Response.json({ status: "RECEIVED" }, { status: outcome === "RECEIVED" ? 201 : 200, headers });
  } catch {
    return reply(503, "CONSULTATION_UNAVAILABLE");
  }
}
