import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { identityPathways } from "./identity-journey-policy";
import { identityProfileEnabled } from "./identity-journey-profile";
import { isIdentityInternalOnlyMilestoneKind } from "./identity-journey-profile-contract";
import {
  identityReviewPlanOffsets, identityReviewPlanningPath,
  type IdentityReviewPlanOffset, type IdentityReviewPlanOption,
} from "./identity-journey-review-planning-contract";
import {
  identityPrivateHeaders, isIdentityCivilDate, isIdentityMemberRef, readIdentityRequestBody, sameOriginIdentityRequest,
} from "./identity-journey-request";

type Session = { customerId: string; sessionHash: string };
type PlanChange = { planRef: string; on: string; offsets: IdentityReviewPlanOffset[]; requestRef: string };

/** References are bound to the selected session, SELF subject, case, episode,
 * kind and expected revision. The provider locks the independently granted
 * planning/reminder authority and rechecks session validity through the
 * Canonical write. It binds requestRef to the payload and audits the write in
 * the same transaction, including retries after the expected revision changes.
 * CONFLICT means no write and the references must be refreshed. */
export interface IdentityReviewPlanningProvider {
  resolveSelf(session: Session, memberRef: string): Promise<{
    assertCurrent(): Promise<boolean>;
    listAuthorized(): Promise<unknown>;
    saveAuthorized(change: PlanChange): Promise<"SAVED" | "CONFLICT" | "DENIED">;
  } | null>;
}

const planRefPattern = /^plan_[A-Za-z0-9_-]{24,96}$/;
const requestRefPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const saveFields = ["action", "memberRef", "planRef", "on", "offsets", "confirmed", "requestRef"];

export function identityReviewPlanningEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_REVIEW_PLANNING_PROVIDER as IdentityReviewPlanningProvider | undefined;
  return identityProfileEnabled(env) && env.FAMILY_IDENTITY_REVIEW_PLANNING_ENABLED === "true" &&
    typeof provider?.resolveSelf === "function";
}

function reviewOffsets(value: unknown): IdentityReviewPlanOffset[] | null {
  if (!Array.isArray(value) || value.length > identityReviewPlanOffsets.length) return null;
  const offsets = identityReviewPlanOffsets.filter(offset => value.includes(offset));
  return offsets.length === value.length ? offsets : null;
}

function privateOptions(input: unknown): { options: IdentityReviewPlanOption[] } {
  if (!Array.isArray(input) || input.length > 128) throw new Error("Invalid review-plan projection");
  const seen = new Set<string>();
  return {
    options: input.map(row => {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Invalid review plan");
      const { ref, kind, path, startedOn, currentOn, offsets } = row as Record<string, unknown>;
      const acceptedOffsets = reviewOffsets(offsets);
      const safePath = typeof path === "string" && Object.hasOwn(identityPathways, path) ? path : null;
      if (typeof ref !== "string" || !planRefPattern.test(ref) || seen.has(ref) ||
        typeof kind !== "string" || !isIdentityInternalOnlyMilestoneKind(kind) ||
        (kind === "INVESTMENT_REVIEW" && safePath !== "NEW_CIES" && safePath !== "LEGACY_CIES") ||
        !isIdentityCivilDate(startedOn) || (currentOn !== null && !isIdentityCivilDate(currentOn)) ||
        acceptedOffsets === null) throw new Error("Invalid review plan");
      seen.add(ref);
      return { ref, kind, path: safePath, startedOn, currentOn, offsets: acceptedOffsets };
    }),
  };
}

function readChange(body: Record<string, unknown>): PlanChange | null {
  const { planRef, on, offsets, confirmed, requestRef } = body;
  const keys = Object.keys(body);
  const acceptedOffsets = reviewOffsets(offsets);
  if (keys.length !== saveFields.length || !keys.every(key => saveFields.includes(key)) ||
    typeof planRef !== "string" || !planRefPattern.test(planRef) ||
    !isIdentityCivilDate(on) || on < "1900-01-01" || acceptedOffsets === null || confirmed !== true ||
    typeof requestRef !== "string" || !requestRefPattern.test(requestRef)) return null;
  return { planRef, on, offsets: acceptedOffsets, requestRef: requestRef.toLowerCase() };
}

export async function handleIdentityReviewPlanning(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityReviewPlanningEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityReviewPlanningPath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "PLAN_UNAVAILABLE");

  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const body = await readIdentityRequestBody(request, 768);
    if (!body || !isIdentityMemberRef(body.memberRef) || (body.action !== "list" && body.action !== "save")) {
      return reply(400, "INVALID_PLAN_REQUEST");
    }
    const change = body.action === "save" ? readChange(body) : null;
    if (body.action === "save" ? !change : Object.keys(body).length !== 2) {
      return reply(400, "INVALID_PLAN_REQUEST");
    }
    await config.recordAccess(session.id, change ? "IDENTITY_REVIEW_PLAN_WRITE_ATTEMPT" : "IDENTITY_REVIEW_PLAN_READ_ATTEMPT",
      crypto.randomUUID());
    const provider = env.FAMILY_IDENTITY_REVIEW_PLANNING_PROVIDER as IdentityReviewPlanningProvider;
    const scope = await provider.resolveSelf({ customerId: session.id, sessionHash: session.token_hash }, body.memberRef);
    if (!scope || await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    const currentSession = async () => {
      const current = await readCustomerSession(request, config, { touch: false });
      return current?.id === session.id && current.token_hash === session.token_hash ? current : null;
    };

    if (change) {
      if (!await currentSession()) return reply(401, "SIGN_IN_REQUIRED");
      switch (await scope.saveAuthorized(change)) {
        case "SAVED": return Response.json({ status: "SAVED" }, { headers });
        case "CONFLICT": return reply(409, "PLAN_STALE");
        case "DENIED": return reply(403, "ACCESS_DENIED");
        default: return reply(503, "PLAN_UNAVAILABLE");
      }
    }

    const input = await scope.listAuthorized();
    if (input === null) return reply(403, "ACCESS_DENIED");
    const output = privateOptions(input);
    const current = await currentSession();
    if (!current) return reply(401, "SIGN_IN_REQUIRED");
    if (await scope.assertCurrent() !== true || current.valid_until <= Date.now()) return reply(403, "ACCESS_DENIED");
    return Response.json(output, { headers });
  } catch {
    return reply(503, "PLAN_UNAVAILABLE");
  }
}
