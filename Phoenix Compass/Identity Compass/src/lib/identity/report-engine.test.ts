import { describe, expect, it } from "vitest";

import { createFreeIdentitySnapshot } from "@/lib/identity/classification";
import { normalizeIdentityAssessment } from "@/lib/identity/normalize";
import { createNormalizedEngineAnswers, runPathEngine } from "@/lib/identity/path-engine";
import { generateIdentityReport } from "@/lib/identity/report-engine";
import { POLICY_LIBRARY_VERSION, type FreeIdentityAnswers } from "@/lib/identity/types";

const answers: FreeIdentityAnswers = {
  identity_primary_goals: ["further_study"],
  current_hk_status: "mainland_resident",
  age_band: "25_34",
  highest_education: "bachelor",
  employment_status: "student",
  route_openness: ["hong_kong_study"],
};

function createReport() {
  const assessment = normalizeIdentityAssessment(answers, {
    family_id: "fam_report",
    user_id: "usr_report",
    assessment_id: "asm_report",
  });
  const normalized = createNormalizedEngineAnswers(assessment, {
    admission_status: "confirmed",
    student_visa_status: "pending",
    iang_status: "not_started",
  });
  return generateIdentityReport({
    assessment,
    snapshot: createFreeIdentitySnapshot(answers),
    normalized_answers: normalized,
    path_results: runPathEngine({ normalized_answers: normalized, policy_version: POLICY_LIBRARY_VERSION }),
    generated_at: "2026-08-26T00:00:00.000Z",
  });
}

describe("Identity Report Engine", () => {
  it("emits every required report section", () => {
    const report = createReport();
    expect(report).toMatchObject({
      identity_snapshot: expect.any(Object),
      path_fit_overview: expect.any(Array),
      key_gaps: expect.any(Array),
      timeline: expect.any(Array),
      study_strategy: expect.any(Object),
      next_actions: expect.any(Array),
      boundary_notice: expect.any(String),
    });
  });

  it("keeps Admission, Student Visa and IANG separate with correct source layers", () => {
    const strategy = createReport().study_strategy;
    expect(strategy?.boundary).toBe("Admission ≠ Student Visa ≠ IANG");
    expect(strategy?.admission).toMatchObject({ source_type: "INTERNAL_EXPERIENCE", status: "confirmed" });
    expect(strategy?.student_visa).toMatchObject({ source_type: "OFFICIAL", status: "pending" });
    expect(strategy?.iang).toMatchObject({ source_type: "OFFICIAL", status: "not_started" });
    expect(strategy?.admission.summary).toContain("不是学校官方标准或香港政府政策");
  });

  it("does not output approval probability, legal conclusion or guarantee fields", () => {
    const report = createReport();
    const serialized = JSON.stringify(report);
    expect(serialized).not.toMatch(/"(approval_probability|success_rate|legal_conclusion|guarantee)"/);
    expect(serialized).not.toMatch(/\d+(?:\.\d+)?%/);
    expect(report.boundary_notice).toContain("不构成法律意见");
    expect(report.boundary_notice).toContain("获批概率");
    expect(report.boundary_notice).toContain("任何保证");
  });
});
