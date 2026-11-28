import {
  runStationReminderBatch,
  type StationPublication,
  type StationReminderClaim,
  type StationReminderQueue,
} from "./identity-journey-reminder-worker";
import { identityPrivateHeaders, isIdentityNoticeId, readIdentityRequestBody } from "./identity-journey-request";

const queueOrigin = "https://identity-station.internal";
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publications: ReadonlySet<string> = new Set<StationPublication>([
  "DELIVERED", "ALREADY_DELIVERED", "AUTHORIZATION_DENIED", "AUTHORIZATION_UNAVAILABLE",
  "UNAVAILABLE", "CLAIM_LOST", "REVISION_CHANGED", "CANCELED", "NOT_DUE",
  "RECIPIENT_UNAVAILABLE", "EVIDENCE_UNAVAILABLE",
]);

type QueueBinding = { fetch(request: Request): Promise<Response> };
type QueueOperation = "claim" | "publish" | "defer";

export interface IdentityStationScheduleBindings {
  FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED?: string;
  FAMILY_IDENTITY_STATION_CRON?: string;
  FAMILY_IDENTITY_STATION_QUEUE?: QueueBinding;
}

function readClaim(input: unknown): StationReminderClaim | null {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 4) return null;
  const { reminderId, recipientPrincipalId, revisionId, claimToken } = input as Record<string, unknown>;
  if (!isIdentityNoticeId(reminderId) || !isIdentityNoticeId(recipientPrincipalId) || !isIdentityNoticeId(revisionId) ||
    typeof claimToken !== "string" || !tokenPattern.test(claimToken)) return null;
  return { reminderId, recipientPrincipalId, revisionId, claimToken };
}

function readLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 50;
}

function readPublication(value: unknown): value is StationPublication {
  return typeof value === "string" && publications.has(value);
}

function queueUnavailable() {
  return new Error("IDENTITY_STATION_QUEUE_UNAVAILABLE");
}

function queueForBinding(binding: QueueBinding): StationReminderQueue {
  async function exchange(operation: QueueOperation, body: object): Promise<Record<string, unknown>> {
    try {
      const response = await binding.fetch(new Request(`${queueOrigin}/${operation}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        redirect: "error",
      }));
      if (response.status !== 200) throw queueUnavailable();
      const result: unknown = await response.json();
      if (!result || typeof result !== "object" || Array.isArray(result) || Object.keys(result).length !== 1) {
        throw queueUnavailable();
      }
      return result as Record<string, unknown>;
    } catch {
      throw queueUnavailable();
    }
  }

  return {
    async claimDue(limit) {
      const { claims } = await exchange("claim", { limit });
      if (!Array.isArray(claims) || claims.length > limit) throw queueUnavailable();
      const seen = new Set<string>();
      return claims.map(value => {
        const claim = readClaim(value);
        if (!claim || seen.has(claim.reminderId)) throw queueUnavailable();
        seen.add(claim.reminderId);
        return claim;
      });
    },
    async publishWithAuthorization(claim) {
      const { publication } = await exchange("publish", claim);
      if (!readPublication(publication)) throw queueUnavailable();
      return publication;
    },
    async deferWithBackoff(claim) {
      const { deferred } = await exchange("defer", claim);
      if (typeof deferred !== "boolean") throw queueUnavailable();
      return deferred;
    },
  };
}

export async function runIdentityStationSchedule(cron: string, env: IdentityStationScheduleBindings) {
  if (env.FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED !== "true") return null;
  const expected = env.FAMILY_IDENTITY_STATION_CRON;
  if (!expected?.trim()) throw new Error("IDENTITY_STATION_SCHEDULE_UNCONFIGURED");
  if (cron !== expected) return null;
  const binding = env.FAMILY_IDENTITY_STATION_QUEUE;
  if (typeof binding?.fetch !== "function") throw new Error("IDENTITY_STATION_SCHEDULE_UNCONFIGURED");
  return runStationReminderBatch(queueForBinding(binding));
}

/** For a private binding only. The queue owns Canonical transactions and
 * purpose authorization. The public website does not dispatch this handler. */
export async function handleIdentityStationQueue(request: Request, queue: StationReminderQueue): Promise<Response> {
  const url = new URL(request.url);
  const operation = url.pathname.slice(1);
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: identityPrivateHeaders });
  if (url.origin !== queueOrigin || url.search || request.method !== "POST" ||
    (operation !== "claim" && operation !== "publish" && operation !== "defer")) {
    return reply({ error: "NOT_FOUND" }, 404);
  }
  const body = await readIdentityRequestBody(request, 512);
  if (!body) return reply({ error: "INVALID_REQUEST" }, 400);
  try {
    if (operation === "claim") {
      if (Object.keys(body).length !== 1 || !readLimit(body.limit)) return reply({ error: "INVALID_REQUEST" }, 400);
      return reply({ claims: await queue.claimDue(body.limit) });
    }
    const claim = readClaim(body);
    if (!claim) return reply({ error: "INVALID_REQUEST" }, 400);
    if (operation === "publish") return reply({ publication: await queue.publishWithAuthorization(claim) });
    return reply({ deferred: await queue.deferWithBackoff(claim) });
  } catch {
    return reply({ error: "QUEUE_UNAVAILABLE" }, 503);
  }
}
