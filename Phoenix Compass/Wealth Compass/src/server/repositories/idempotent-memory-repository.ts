export interface IdempotentRecord { id: string; idempotencyKey: string }

export class IdempotentMemoryRepository<T extends IdempotentRecord> {
  private readonly byKey = new Map<string, T>();

  create(record: T): { record: T; duplicate: boolean } {
    const existing = this.byKey.get(record.idempotencyKey);
    if (existing) return { record: existing, duplicate: true };
    this.byKey.set(record.idempotencyKey, record);
    return { record, duplicate: false };
  }
}
