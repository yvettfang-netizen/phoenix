import { describe, expect, it } from "vitest";

import { getDynamicQuestions, normalizeDynamicAnswers } from "@/lib/identity/dynamic-questions";

describe("Identity dynamic question projection", () => {
  it("asks shared facts once across candidate paths", () => {
    const questions = getDynamicQuestions(["ttps", "study_iang", "employment"]);
    expect(questions.filter(({ field_key }) => field_key === "degree_institution")).toHaveLength(1);
    expect(questions.filter(({ field_key }) => field_key === "graduation_date")).toHaveLength(1);
    expect(questions.filter(({ field_key }) => field_key === "job_offer_status")).toHaveLength(1);
  });

  it("loads only candidate-path questions and preserves unanswered fields as missing", () => {
    const questions = getDynamicQuestions(["dependant"]);
    expect(questions.every(({ path_scope }) => path_scope.includes("dependant"))).toBe(true);
    const normalized = normalizeDynamicAnswers(questions, { sponsor_status: "  permanent resident  " });
    expect(normalized).toEqual({ sponsor_status: "permanent resident" });
    expect(normalized).not.toHaveProperty("relationship_type");
  });
});
