import type { CRMLead } from "@/domain/wealth-compass/types";
import { IdempotentMemoryRepository } from "../repositories/idempotent-memory-repository";

export class MockCRMAdapter {
  private readonly repository = new IdempotentMemoryRepository<CRMLead>();
  submit(lead: CRMLead) { return this.repository.create(lead); }
}
