import type { ConsentRecord } from "./types";

export function canShareWithCRM(consent: ConsentRecord): boolean {
  return consent.accepted && consent.acceptedAt !== null && consent.status === "CONSENT_RECORDED";
}
