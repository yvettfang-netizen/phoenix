import { z } from "zod";
import { workflowStates } from "./types";

const isoDate = z.string().datetime({ offset: true });
const sourceChannel = z.enum(["DIRECT", "ADVISOR", "PARTNER", "TEST"]);
const workflowState = z.enum(workflowStates);
const rulesStatus = z.enum(["RULES_NOT_LOADED", "RULES_LOADED"]);
const meta = {
  id: z.string().uuid(),
  ruleVersion: z.string().min(1),
  createdAt: isoDate,
  updatedAt: isoDate,
  sourceChannel,
  status: workflowState,
  idempotencyKey: z.string().min(8),
};

export const assessmentAnswerSchema = z.object({
  questionId: z.string().min(1), optionId: z.string().min(1), answeredAt: isoDate,
});
export const assessmentSessionSchema = z.object({ ...meta, answers: z.array(assessmentAnswerSchema) });
export const consentRecordSchema = z.object({
  ...meta, sessionId: z.string().uuid(), privacyNoticeVersion: z.string().min(1),
  accepted: z.boolean(), acceptedAt: isoDate.nullable(),
}).refine((value) => value.accepted === (value.acceptedAt !== null), "Consent timestamp must match acceptance");
export const scoreResultSchema = z.object({
  ...meta, sessionId: z.string().uuid(), rulesStatus, dimensions: z.record(z.string(), z.number()),
});
export const personaResultSchema = z.object({
  ...meta, sessionId: z.string().uuid(), rulesStatus, personaId: z.string().nullable(),
}).refine((value) => value.rulesStatus === "RULES_LOADED" || value.personaId === null,
  "Persona cannot be assigned without official rules");
export const reportRecordSchema = z.object({
  ...meta, sessionId: z.string().uuid(), scoreResultId: z.string().uuid().nullable(),
  templateVersion: z.string().min(1), generatedAt: isoDate.nullable(),
});
export const crmLeadSchema = z.object({
  ...meta, sessionId: z.string().uuid(), consentRecordId: z.string().uuid(), externalId: z.string().nullable(),
});
export const referralRecordSchema = z.object({
  ...meta, sessionId: z.string().uuid(), crmLeadId: z.string().uuid(), externalId: z.string().nullable(),
});
