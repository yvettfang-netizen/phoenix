import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { identityPathways } from "./identity-journey-policy";
import { identityMilestoneKinds, identityProfilePath, type IdentityMemberProfile, type IdentityProfileMember } from "./identity-journey-profile-contract";
import { identityPrivateHeaders, isIdentityCivilDate, readIdentityRequestBody, sameOriginIdentityRequest } from "./identity-journey-request";

type Session = { customerId: string; sessionHash: string };
type AuthorizedRead = { assertCurrent(): Promise<boolean> };

/** Roster labels and references come from a purpose-specific grant. Reference
 * lookup must be session-bound and cannot fall back to a Canonical identifier.
 * Lock the selected authority while querying Canonical, recheck before release. */
export interface IdentityProfileProvider {
  resolveRoster(session: Session): Promise<(AuthorizedRead & { listAuthorized(): Promise<unknown> }) | null>;
  resolveMember(session: Session, memberRef: string): Promise<(AuthorizedRead & { readAuthorized(): Promise<unknown> }) | null>;
}

export function identityProfileEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_PROFILE_PROVIDER as IdentityProfileProvider | undefined;
  return env.FAMILY_IDENTITY_PROFILE_ENABLED === "true" &&
    typeof provider?.resolveRoster === "function" && typeof provider.resolveMember === "function";
}

function isMemberRef(value: unknown): value is string {
  return typeof value === "string" && /^member_[A-Za-z0-9_-]{24,96}$/.test(value);
}

function readObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid profile projection");
  return input as Record<string, unknown>;
}

function privateRoster(value: unknown): { members: IdentityProfileMember[] } {
  if (!Array.isArray(value) || value.length > 24) throw new Error("Invalid member roster");
  const seen = new Set<string>();
  return {
    members: value.map(input => {
      const { ref, label, access } = readObject(input);
      if (!isMemberRef(ref) || seen.has(ref) || typeof label !== "string" || label.trim().length < 1 ||
        label.length > 120 || (access !== "SELF" && access !== "GUARDIAN")) throw new Error("Invalid member roster entry");
      seen.add(ref);
      return { ref, label: label.trim(), access };
    }),
  };
}

function privateProfile(input: unknown): IdentityMemberProfile {
  const { episodes } = readObject(input);
  if (!Array.isArray(episodes) || episodes.length > 64) throw new Error("Invalid identity history");
  return {
    episodes: episodes.map(raw => {
      const { path, startedOn, endedBefore, milestones } = readObject(raw);
      if (!isIdentityCivilDate(startedOn) || (endedBefore !== null && (!isIdentityCivilDate(endedBefore) || endedBefore <= startedOn)) ||
        !Array.isArray(milestones) || milestones.length > 96) throw new Error("Invalid identity episode");
      return {
        path: typeof path === "string" && Object.hasOwn(identityPathways, path) ? path : null,
        startedOn, endedBefore,
        milestones: milestones.map(rawMilestone => {
          const { kind, basis, on, verification, current } = readObject(rawMilestone);
          const knownKind = identityMilestoneKinds.find(value => value === kind);
          if (!knownKind || (basis !== "STATUTORY" && basis !== "CASE_APPROVAL" && basis !== "OFFICIAL_WINDOW" && basis !== "INTERNAL") ||
            !isIdentityCivilDate(on) || (verification !== "REPORTED" && verification !== "VERIFIED") || typeof current !== "boolean") {
            throw new Error("Invalid identity milestone");
          }
          return { kind: knownKind, basis, on, verification, current };
        }),
      };
    }),
  };
}

export async function handleIdentityProfile(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityProfileEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "GET" && request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityProfilePath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "PROFILE_UNAVAILABLE");
  const provider = env.FAMILY_IDENTITY_PROFILE_PROVIDER as IdentityProfileProvider;
  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const identity = { customerId: session.id, sessionHash: session.token_hash };
    const requestId = crypto.randomUUID();
    const roster = request.method === "GET";
    const selected = roster ? null : await readIdentityRequestBody(request, 160);
    const memberRef = selected?.memberRef;
    if (!roster && (!selected || Object.keys(selected).length !== 1 || !isMemberRef(memberRef))) {
      return reply(400, "INVALID_MEMBER_SELECTION");
    }
    const audit = roster ? "IDENTITY_PROFILE_ROSTER" : "IDENTITY_PROFILE_READ";
    await config.recordAccess(session.id, audit + "_ATTEMPT", requestId + ":attempt");
    const bound = roster ? await provider.resolveRoster(identity) : await provider.resolveMember(identity, memberRef as string);
    if (!bound || await bound.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    const source = "listAuthorized" in bound ? await bound.listAuthorized() : await bound.readAuthorized();
    if (source === null) return reply(403, "ACCESS_DENIED");
    const output = roster ? privateRoster(source) : privateProfile(source);
    await config.recordAccess(session.id, audit + "_PREPARED", requestId + ":prepared");
    const current = await readCustomerSession(request, config, { touch: false });
    if (!current || current.id !== session.id || current.token_hash !== session.token_hash) return reply(401, "SIGN_IN_REQUIRED");
    if (await bound.assertCurrent() !== true || current.valid_until <= Date.now()) return reply(403, "ACCESS_DENIED");
    return Response.json(output, { headers });
  } catch {
    return reply(503, "PROFILE_UNAVAILABLE");
  }
}
