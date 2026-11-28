import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { identityPathways } from "./identity-journey-policy";
import {
  identityMilestoneKinds,
  identityNoFixedExpiryTerm,
  identityProfilePath,
  isIdentityNoFixedExpiryPathway,
  isIdentityInternalOnlyMilestoneKind,
  isIdentityProfileAccess,
  parseIdentitySponsorship,
  type IdentityMemberProfile,
  type IdentityProfileAccess,
  type IdentityProfileMember,
} from "./identity-journey-profile-contract";
import { identityPrivateHeaders, isIdentityCivilDate, isIdentityMemberRef, readIdentityMemberSelection, sameOriginIdentityRequest } from "./identity-journey-request";

type Session = { customerId: string; sessionHash: string };
type AuthorizedRead = { assertCurrent(): Promise<boolean>; access?: IdentityProfileAccess };

/** Roster labels and references come from a purpose-specific grant. Reference
 * lookup must be session-bound and cannot fall back to a Canonical identifier.
 * Lock the selected authority while querying Canonical, recheck before release. */
export interface IdentityProfileProvider {
  resolveRoster(session: Session): Promise<(AuthorizedRead & { listAuthorized(): Promise<unknown> }) | null>;
  resolveMember(session: Session, memberRef: string): Promise<(AuthorizedRead & { readAuthorized(): Promise<unknown> }) | null>;
  /** Optional isolated resolver for an independently approved adult delegate. */
  resolveDelegatedMember?(session: Session, memberRef: string): Promise<(
    AuthorizedRead & { access: "DELEGATE"; readAuthorized(): Promise<unknown> }
  ) | null>;
}

export function identityProfileEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_PROFILE_PROVIDER as IdentityProfileProvider | undefined;
  return env.FAMILY_IDENTITY_PROFILE_ENABLED === "true" &&
    typeof provider?.resolveRoster === "function" && typeof provider.resolveMember === "function";
}

function readObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid profile projection");
  return input as Record<string, unknown>;
}

function privateRoster(value: unknown, allowDelegated: boolean): { members: IdentityProfileMember[] } {
  if (!Array.isArray(value) || value.length > 24) throw new Error("Invalid member roster");
  const seen = new Set<string>();
  const members: IdentityProfileMember[] = [];
  for (const input of value) {
    const { ref, label, access } = readObject(input);
    if (!isIdentityMemberRef(ref) || seen.has(ref) || typeof label !== "string" || label.trim().length < 1 ||
      label.length > 120 || !isIdentityProfileAccess(access)) throw new Error("Invalid member roster entry");
    seen.add(ref);
    // Delegated adults are an independent, opt-in read-only surface. Keep the
    // existing SELF/GUARDIAN roster behavior unchanged while filtering them
    // when the separate rollout flag is not enabled.
    if (access === "DELEGATE" && !allowDelegated) continue;
    members.push({ ref, label: label.trim(), access });
  }
  return { members };
}

function privateProfile(input: unknown): IdentityMemberProfile {
  const { episodes } = readObject(input);
  if (!Array.isArray(episodes) || episodes.length > 64) throw new Error("Invalid identity history");
  return {
    episodes: episodes.map(raw => {
      const { path, startedOn, endedBefore, stayTerm, sponsorship, milestones } = readObject(raw);
      if (!isIdentityCivilDate(startedOn) || (endedBefore !== null && (!isIdentityCivilDate(endedBefore) || endedBefore <= startedOn)) ||
        !Array.isArray(milestones) || milestones.length > 96) throw new Error("Invalid identity episode");
      const normalizedPath = typeof path === "string" && Object.hasOwn(identityPathways, path) ? path : null;
      if (stayTerm !== undefined &&
        (stayTerm !== identityNoFixedExpiryTerm || !normalizedPath || !isIdentityNoFixedExpiryPathway(normalizedPath) ||
          milestones.some(milestone => readObject(milestone).kind === "STAY_EXPIRY"))) {
        throw new Error("Invalid no-fixed-expiry identity episode");
      }
      const verifiedSponsorship = sponsorship === undefined ? null : parseIdentitySponsorship(sponsorship, normalizedPath, startedOn, endedBefore);
      if (sponsorship !== undefined && !verifiedSponsorship) throw new Error("Invalid dependant sponsorship record");
      return {
        path: normalizedPath,
        startedOn, endedBefore,
        ...(stayTerm === identityNoFixedExpiryTerm ? { stayTerm } : {}),
        ...(verifiedSponsorship ? { sponsorship: verifiedSponsorship } : {}),
        milestones: milestones.map(rawMilestone => {
          const { kind, basis, on, verification, current } = readObject(rawMilestone);
          const knownKind = identityMilestoneKinds.find(value => value === kind);
          if (!knownKind || (basis !== "STATUTORY" && basis !== "CASE_APPROVAL" && basis !== "OFFICIAL_WINDOW" && basis !== "INTERNAL") ||
            !isIdentityCivilDate(on) || (verification !== "REPORTED" && verification !== "VERIFIED") || typeof current !== "boolean") {
            throw new Error("Invalid identity milestone");
          }
          if (isIdentityInternalOnlyMilestoneKind(knownKind) && (basis !== "INTERNAL" || verification !== "REPORTED")) {
            throw new Error("Invalid internal planning milestone");
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
  const allowDelegated = env.FAMILY_IDENTITY_DELEGATED_PROFILE_ENABLED === "true" &&
    typeof provider.resolveDelegatedMember === "function";
  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const identity = { customerId: session.id, sessionHash: session.token_hash };
    const requestId = crypto.randomUUID();
    const roster = request.method === "GET";
    const memberRef = roster ? null : await readIdentityMemberSelection(request);
    if (!roster && !memberRef) {
      return reply(400, "INVALID_MEMBER_SELECTION");
    }
    const audit = roster ? "IDENTITY_PROFILE_ROSTER" : "IDENTITY_PROFILE_READ";
    await config.recordAccess(session.id, audit + "_ATTEMPT", requestId + ":attempt");
    let bound: (AuthorizedRead & ({ listAuthorized(): Promise<unknown> } | { readAuthorized(): Promise<unknown> })) | null;
    if (roster) {
      bound = await provider.resolveRoster(identity);
    } else {
      const legacyBound = await provider.resolveMember(identity, memberRef as string);
      // The legacy resolver is never allowed to mint a delegated scope. This
      // is deliberately rejected even when the delegate rollout is enabled;
      // delegated reads must come from the isolated resolver below.
      if (legacyBound?.access === "DELEGATE") return reply(403, "ACCESS_DENIED");
      bound = legacyBound;
      if (!bound && allowDelegated && provider.resolveDelegatedMember) {
        const delegatedBound = await provider.resolveDelegatedMember(identity, memberRef as string);
        // Fail closed if a flagged resolver is absent, stale, or returns a
        // scope other than the exact delegated read grant.
        if (!delegatedBound || delegatedBound.access !== "DELEGATE") return reply(403, "ACCESS_DENIED");
        bound = delegatedBound;
      }
    }
    if (!bound || await bound.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    // The provider may expose the resolved grant on the session-bound read
    // authority. Reject a delegated read unless the independent rollout flag
    // is on; this prevents a stale/cached member reference from widening scope.
    if (bound.access !== undefined && !isIdentityProfileAccess(bound.access)) return reply(403, "ACCESS_DENIED");
    if (bound.access === "DELEGATE" && !allowDelegated) return reply(403, "ACCESS_DENIED");
    const source = "listAuthorized" in bound ? await bound.listAuthorized() : await bound.readAuthorized();
    if (source === null) return reply(403, "ACCESS_DENIED");
    const output = roster ? privateRoster(source, allowDelegated) : privateProfile(source);
    await config.recordAccess(session.id, audit + "_PREPARED", requestId + ":prepared");
    const current = await readCustomerSession(request, config, { touch: false });
    if (!current || current.id !== session.id || current.token_hash !== session.token_hash) return reply(401, "SIGN_IN_REQUIRED");
    if (await bound.assertCurrent() !== true || current.valid_until <= Date.now()) return reply(403, "ACCESS_DENIED");
    return Response.json(output, { headers });
  } catch {
    return reply(503, "PROFILE_UNAVAILABLE");
  }
}
