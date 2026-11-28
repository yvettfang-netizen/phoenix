import { identityPrivateHeaders, isIdentityNoticeId } from "./identity-journey-request";

export const identityRenewalMetricKeys = [
  "dueWithin90Days", "dueIn91To180Days", "datesToVerify", "authorizedRenewalConsultations",
  "unassignedIdentityLeads", "renewalServicesInProgress", "renewalServicesCompleted",
  "verifiedRenewalDates", "reminderFailures", "serviceExceptions",
] as const;
type Metric = (typeof identityRenewalMetricKeys)[number];

/** Server adapter for the existing NOVA management entry. There is no new
 * public route or identity mapping. The Canonical resolver binds a Founder
 * session to an approved organization, exact purpose and privacy policy. */
export interface IdentityFounderProjection {
  bind(request: Request): Promise<{
    role: "FOUNDER";
    domain: "IDENTITY";
    purpose: "IDENTITY_RENEWAL_SUMMARY";
    organizationId: string;
    expiresAt: number;
    policy: { revision: string; minimumHouseholds: number } | null;
    assertCurrent(): Promise<boolean>;
    /** Derive the authorized case, consultation and project scope server-side. */
    readAggregates(minimumHouseholds: number): Promise<unknown>;
    recordAudit(requestId: string, phase: "ATTEMPT" | "PREPARED"): Promise<void>;
  } | null>;
}

function publicAggregate(payload: unknown, minimum: number) {
  if (!payload || typeof payload !== "object") throw new Error("Missing identity aggregate");
  const data = payload as { status?: unknown; asOfDate?: unknown; metrics?: Partial<Record<Metric, unknown>> };
  if (data.status === "NO_DATA") return { status: "NO_DATA" };
  if (data.status !== "READY" || typeof data.asOfDate !== "string" || !data.metrics ||
      !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(data.asOfDate) ||
      new Date(data.asOfDate + "T00:00:00.000Z").toISOString().slice(0, 10) !== data.asOfDate) {
    throw new Error("Invalid identity aggregate");
  }
  const metrics: Partial<Record<Metric, number | null>> = {};
  for (const key of identityRenewalMetricKeys) {
    const value = data.metrics[key];
    if (value !== null && (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum)) {
      throw new Error("Invalid or unsuppressed identity metric");
    }
    metrics[key] = value;
  }
  return { status: "READY", asOfDate: data.asOfDate, metrics };
}

export async function readFounderIdentitySummary(request: Request, projection?: IdentityFounderProjection) {
  const deny = () => Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403, headers: identityPrivateHeaders });
  const unavailable = () => Response.json({ error: { code: "SUMMARY_UNAVAILABLE" } },
    { status: 503, headers: identityPrivateHeaders });
  if (!projection || request.method !== "GET" || new URL(request.url).search ||
      ["x-organization-id", "x-family-id", "x-principal-id", "x-role", "x-purpose"].some(header => request.headers.has(header))) {
    return deny();
  }
  try {
    const authority = await projection.bind(request);
    if (!authority || authority.role !== "FOUNDER" || authority.domain !== "IDENTITY" ||
        authority.purpose !== "IDENTITY_RENEWAL_SUMMARY" || !isIdentityNoticeId(authority.organizationId) ||
        !Number.isFinite(authority.expiresAt) || authority.expiresAt <= Date.now() ||
        await authority.assertCurrent() !== true) return deny();
    const policy = authority.policy;
    if (!policy || typeof policy.revision !== "string" || !policy.revision.trim() ||
        !Number.isSafeInteger(policy.minimumHouseholds) || policy.minimumHouseholds < 2) return deny();
    const requestId = crypto.randomUUID();
    await authority.recordAudit(requestId, "ATTEMPT");
    const summary = publicAggregate(await authority.readAggregates(policy.minimumHouseholds), policy.minimumHouseholds);
    await authority.recordAudit(requestId, "PREPARED");
    if (await authority.assertCurrent() !== true || authority.expiresAt <= Date.now()) return deny();
    return Response.json(summary, { headers: identityPrivateHeaders });
  } catch {
    return unavailable();
  }
}
