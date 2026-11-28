export interface StationReminderClaim {
  reminderId: string;
  recipientPrincipalId: string;
  revisionId: string;
  claimToken: string;
}

export type StationPublication =
  | "DELIVERED"
  | "ALREADY_DELIVERED"
  | "AUTHORIZATION_DENIED"
  | "AUTHORIZATION_UNAVAILABLE"
  | "UNAVAILABLE"
  | "CLAIM_LOST"
  | "REVISION_CHANGED"
  | "CANCELED"
  | "NOT_DUE"
  | "RECIPIENT_UNAVAILABLE"
  | "EVIDENCE_UNAVAILABLE";

export interface StationReminderQueue {
  /** Resolve only after the claim transaction has committed. */
  claimDue(limit: number): Promise<readonly StationReminderClaim[]>;
  /**
   * Lock the current, purpose-specific grant for the exact family, subject and
   * recipient and publish on the same database transaction. Return only after
   * commit. Missing or uncertain authority must fail closed.
   */
  publishWithAuthorization(claim: StationReminderClaim): Promise<StationPublication>;
  /** Returns false when the claim no longer owns the reminder. */
  deferWithBackoff(claim: StationReminderClaim): Promise<boolean>;
}

/** Server-side scheduler entry point. Exposes counts without customer identifiers. */
export async function runStationReminderBatch(queue: StationReminderQueue, limit = 10) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RangeError("Invalid station reminder batch size");

  const claims = await queue.claimDue(limit);
  const result = { claimed: claims.length, delivered: 0, alreadyDelivered: 0, denied: 0, deferred: 0, skipped: 0, deferredWriteFailed: 0 };

  for (const claim of claims) {
    let publication: StationPublication;
    try {
      publication = await queue.publishWithAuthorization(claim);
    } catch {
      // A lost response may follow a successful commit. The fenced defer checks
      // that the job still belongs to us and has not already delivered.
      publication = "UNAVAILABLE";
    }

    if (publication === "AUTHORIZATION_DENIED") result.denied++;
    switch (publication) {
      case "DELIVERED":
        result.delivered++;
        break;
      case "ALREADY_DELIVERED":
        result.alreadyDelivered++;
        break;
      case "AUTHORIZATION_DENIED":
      case "AUTHORIZATION_UNAVAILABLE":
      case "RECIPIENT_UNAVAILABLE":
      case "EVIDENCE_UNAVAILABLE":
      case "UNAVAILABLE":
        // Permanent cancellation belongs to the approved revoke/replan path.
        try {
          if (await queue.deferWithBackoff(claim)) result.deferred++;
          else result.skipped++;
        } catch {
          // The outstanding claim will expire and become eligible again.
          result.deferredWriteFailed++;
        }
        break;
      default:
        result.skipped++;
    }
  }

  return result;
}
