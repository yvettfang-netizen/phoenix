import { IDENTITY_FULL_REPORT_VERSION, type IdentityFullReport } from "@/lib/identity/report-engine";
import {
  FAMILY_IDENTITY_TYPES,
  PLANNING_STAGES,
  type StoredIdentityResult,
} from "@/lib/identity/types";

export const IDENTITY_DRAFT_KEY = "pn:identity:draft:v1";
export const IDENTITY_RESULT_KEY = "pn:identity:result:v1";
export const IDENTITY_DYNAMIC_DRAFT_KEY = "pn:identity:dynamic-draft:v1";
export const IDENTITY_FULL_REPORT_KEY = "pn:identity:full-report:v1";

export type StoredIdentityFullReport = Readonly<{
  base_result: StoredIdentityResult;
  dynamic_answers: Readonly<Record<string, unknown>>;
  report: IdentityFullReport;
}>;

export function isStoredIdentityResult(value: unknown): value is StoredIdentityResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<StoredIdentityResult>;
  return Boolean(
    result.ids?.family_id?.startsWith("fam_") &&
      result.ids.user_id?.startsWith("usr_") &&
      result.ids.assessment_id?.startsWith("asm_") &&
      result.snapshot &&
      FAMILY_IDENTITY_TYPES.includes(result.snapshot.family_identity_type) &&
      PLANNING_STAGES.includes(result.snapshot.planning_stage),
  );
}

export function isStoredIdentityFullReport(value: unknown): value is StoredIdentityFullReport {
  if (!value || typeof value !== "object") return false;
  const stored = value as Partial<StoredIdentityFullReport>;
  return Boolean(
    isStoredIdentityResult(stored.base_result) &&
      stored.report?.report_version === IDENTITY_FULL_REPORT_VERSION &&
      Array.isArray(stored.report.path_fit_overview) &&
      stored.report.path_fit_overview.length === 6,
  );
}
