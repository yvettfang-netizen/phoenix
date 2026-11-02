import { afterEach, describe, expect, it, vi } from "vitest";

import { getLatestAdvisorAssessment, resetAdvisorRecordsForTests, saveAdvisorAssessment } from "../db";
import type { AdvisorCaseInput } from "./advisor-types";
import { runAdvisorAssessment } from "./advisor-engine";

const anonymousCompleteCase: AdvisorCaseInput = {
  caseId: "case_anon_path_001",
  studentStage: "Grade 10",
  currentEducationBackground: "Mainstream secondary curriculum",
  identityOrRegionContext: "Region context submitted; no official eligibility conclusion recorded.",
  academicEvidence: [
    {
      field: "mathematics_result",
      value: "Term assessment: 78/100",
      source: "School report excerpt dated 2026-08",
      verified: false,
    },
  ],
  familyGoal: "Clarify a feasible education-path discussion for the next academic year.",
  constraints: "Budget and timing need advisor comparison before commitment.",
  knownRisks: [],
  currentJudgementQuestion: "Which evidence should be verified before the advisor compares next-step pathways?",
  informationSources: ["Advisor intake notes", "School report excerpt"],
  advisorConfirmationStatus: "not_confirmed",
  domains: ["education_pathway"],
  sourceSystem: "askwise_internal",
  sourceVersion: "v1.1-candidate",
};

afterEach(() => {
  resetAdvisorRecordsForTests();
});

describe("internal advisor minimum loop", () => {
  it("returns NEEDS_INFORMATION when required evidence is absent", () => {
    const result = runAdvisorAssessment({ ...anonymousCompleteCase, academicEvidence: [] });

    expect(result.status).toBe("NEEDS_INFORMATION");
    expect(result.missingInformation).toContain("academic evidence with field, value, and source");
    expect(result.preliminaryJudgement).toBeNull();
  });

  it("returns CONFLICT_DETECTED when two sources disagree on one evidence field", () => {
    const result = runAdvisorAssessment({
      ...anonymousCompleteCase,
      academicEvidence: [
        { field: "current_grade", value: "Grade 10", source: "School report A" },
        { field: "current_grade", value: "Grade 11", source: "School report B" },
      ],
    });

    expect(result.status).toBe("CONFLICT_DETECTED");
    expect(result.conflicts).toHaveLength(1);
    expect(result.preliminaryJudgement).toBeNull();
  });

  it("forms an evidence-backed preliminary assessment only after sufficient intake", () => {
    const result = runAdvisorAssessment(anonymousCompleteCase);

    expect(result.status).toBe("HUMAN_REVIEW_REQUIRED");
    expect(result.preliminaryJudgement).toContain("internal preliminary assessment");
    expect(result.preliminaryJudgement).not.toMatch(/guarantee|final answer|admission outcome/i);
    expect(result.requiresHumanConfirmation).toBe(true);
  });

  it("traces every judgment to active Rule Cards and approved sources", () => {
    const result = runAdvisorAssessment(anonymousCompleteCase);

    expect(result.ruleTrace.length).toBeGreaterThanOrEqual(2);
    expect(result.ruleTrace.every((trace) => trace.ruleId.startsWith("ADVISOR-") && trace.source.includes("ASKWISE_PRODUCT_BOUNDARY_V1.1_CANDIDATE.md"))).toBe(true);
  });

  it("is deterministic for repeated submission of the same case", () => {
    expect(runAdvisorAssessment(anonymousCompleteCase)).toEqual(runAdvisorAssessment(anonymousCompleteCase));
  });

  it("recalculates when submitted evidence changes", () => {
    const before = runAdvisorAssessment(anonymousCompleteCase);
    const after = runAdvisorAssessment({
      ...anonymousCompleteCase,
      academicEvidence: [
        {
          ...anonymousCompleteCase.academicEvidence[0],
          value: "Term assessment: 84/100",
        },
      ],
    });

    expect(after.inputFingerprint).not.toBe(before.inputFingerprint);
    expect(after.confirmedFacts.join(" ")).toContain("84/100");
  });

  it("persists an anonymous, redacted, traceable record", () => {
    const caseWithSensitiveText: AdvisorCaseInput = {
      ...anonymousCompleteCase,
      caseId: "case_anon_privacy_002",
      academicEvidence: [
        {
          field: "mathematics_result",
          value: "Term assessment: 78/100; contact 13800138000",
          source: "advisor@example.com",
        },
      ],
      informationSources: ["advisor@example.com", "13800138000"],
    };
    const assessment = runAdvisorAssessment(caseWithSensitiveText);
    saveAdvisorAssessment(caseWithSensitiveText, assessment);
    const stored = getLatestAdvisorAssessment(caseWithSensitiveText.caseId);

    expect(stored?.assessment.inputFingerprint).toBe(assessment.inputFingerprint);
    expect(stored?.assessment.ruleTrace.length).toBeGreaterThan(0);
    const storedJson = JSON.stringify(stored);
    expect(storedJson).not.toContain("advisor@example.com");
    expect(storedJson).not.toContain("13800138000");
    expect(storedJson).toContain("[REDACTED_EMAIL]");
    expect(storedJson).toContain("[REDACTED_PHONE]");
  });

  it("uses anonymous fixture data and makes no external API request", () => {
    const fixture = JSON.stringify(anonymousCompleteCase);
    expect(fixture).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(fixture).not.toMatch(/\b1[3-9]\d{9}\b/);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    runAdvisorAssessment(anonymousCompleteCase);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("prints the anonymous input and deterministic output when explicitly requested", () => {
    const result = runAdvisorAssessment(anonymousCompleteCase);
    if (process.env.ASKWISE_PRINT_ADVISOR_DEMO === "1") {
      console.info(JSON.stringify({ input: anonymousCompleteCase, output: result }, null, 2));
    }
    expect(result.caseId).toBe("case_anon_path_001");
  });
});
