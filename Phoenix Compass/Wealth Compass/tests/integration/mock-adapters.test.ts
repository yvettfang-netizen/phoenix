import { describe, expect, it } from "vitest";
import type { CRMLead, ReferralRecord } from "@/domain/wealth-compass/types";
import { MockCRMAdapter } from "@/server/adapters/mock-crm-adapter";
import { MockReferralAdapter } from "@/server/adapters/mock-referral-adapter";

const meta = {
  id: "2f10a82a-1cd0-4a66-a68c-69350b8de200", ruleVersion: "TEST_ONLY",
  createdAt: "2026-08-26T10:00:00.000Z", updatedAt: "2026-08-26T10:00:00.000Z",
  sourceChannel: "TEST" as const, idempotencyKey: "TEST_ONLY-idempotency-001",
};

describe("mock delivery adapters", () => {
  it("deduplicates CRM and referral submissions", () => {
    const crm = new MockCRMAdapter();
    const lead: CRMLead = { ...meta, status: "CRM_READY", sessionId: meta.id, consentRecordId: meta.id, externalId: null };
    expect(crm.submit(lead).duplicate).toBe(false);
    expect(crm.submit({ ...lead, id: crypto.randomUUID() }).duplicate).toBe(true);

    const referral = new MockReferralAdapter();
    const record: ReferralRecord = { ...meta, status: "REFERRAL_READY", sessionId: meta.id, crmLeadId: meta.id, externalId: null };
    expect(referral.submit(record).duplicate).toBe(false);
    expect(referral.submit({ ...record, id: crypto.randomUUID() }).record.id).toBe(record.id);
  });
});
