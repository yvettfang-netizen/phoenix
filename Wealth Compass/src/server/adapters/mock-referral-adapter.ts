import type { ReferralRecord } from "@/domain/wealth-compass/types";
import { IdempotentMemoryRepository } from "../repositories/idempotent-memory-repository";

export class MockReferralAdapter {
  private readonly repository = new IdempotentMemoryRepository<ReferralRecord>();
  submit(referral: ReferralRecord) { return this.repository.create(referral); }
}
