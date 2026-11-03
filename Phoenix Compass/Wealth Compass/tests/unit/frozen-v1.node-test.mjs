import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, QUESTIONS, score, internalOverallScore, validateAnswer, VERSIONS } from "../../src/domain/wealth-compass/frozen-v1.ts";
const answer = (value, other) => ({ codes: Array.isArray(value) ? value : [value], ...(other === undefined ? {} : { other }) });
const persona1 = {
    Q01: answer("B"), Q02: answer(["EDUCATION", "LIQUIDITY", "SUCCESSION"]), Q03: answer("A"), Q04: answer("B"), Q05: answer("B"), Q06: answer(["CASH", "PROPERTY", "PROTECTION"]), Q07: answer("B"), Q08: answer("B"), Q09: answer("B"), Q10: answer("MARKET"), Q11: answer("A"), Q12: answer("B"), Q13: answer("C"), Q14: answer("C"),
};
const persona2 = {
    Q01: answer("C"), Q02: answer(["IDENTITY", "BUSINESS", "CROSS_BORDER"]), Q03: answer("D"), Q04: answer("C"), Q05: answer("C"), Q06: answer(["BUSINESS", "PROPERTY", "INVESTMENT", "DEBT"]), Q07: answer("D"), Q08: answer("C"), Q09: answer("D"), Q10: answer(["LEGAL_TAX_DISPUTE", "GUARANTEE"]), Q11: answer("D"), Q12: answer("D"), Q13: answer("B"), Q14: answer("C"),
};
const persona3 = {
    Q01: answer("A"), Q02: answer(["BUSINESS", "CROSS_BORDER", "SUCCESSION"]), Q03: answer("B"), Q04: answer("A"), Q05: answer("A"), Q06: answer(["CASH", "PROPERTY", "BUSINESS", "INVESTMENT", "PROTECTION"]), Q07: answer("A"), Q08: answer("A"), Q09: answer("A"), Q10: answer("NONE"), Q11: answer("B"), Q12: answer("B"), Q13: answer("A"), Q14: answer("A"),
};
test("exposes frozen versions, exact six dimensions and 14 questions", () => {
    assert.deepEqual(VERSIONS, { questionBank: "WC-QB-1.0.0", scoringRules: "WC-SR-1.0.0", consentCopy: "WC-CC-1.0.0", personaPack: "WC-PT-1.0.0", locale: "zh-CN" });
    assert.equal(QUESTIONS.length, 14);
    assert.deepEqual(DIMENSIONS.map((item) => item.code), ["D1", "D2", "D3", "D4", "D5", "D6"]);
    assert.deepEqual(DIMENSIONS[0].weights, { Q01: 40, Q02: 30, Q04: 30 });
    assert.deepEqual(DIMENSIONS[4].weights, { Q03: 25, Q11: 35, Q12: 40 });
});
test("matches the three frozen Persona Pack score fixtures", () => {
    assert.deepEqual([persona1, persona2, persona3].map((answers) => internalOverallScore(score(answers))), [72, 35, 96]);
    assert.deepEqual(score(persona1).dimensions.map((d) => d.readiness), [79, 79, 76, 70, 88, 38]);
    assert.deepEqual(score(persona1).topGaps, ["D6", "D4", "D3"]);
    assert.deepEqual(score(persona1).flags.map((flag) => flag.code), ["SINGLE_INFORMATION_HOLDER"]);
    assert.equal(score(persona1).reportStatus, "READY");
    assert.deepEqual(score(persona2).dimensions.map((d) => d.readiness), [54, 61, 29, 0, 15, 50]);
    assert.deepEqual(score(persona2).topGaps, ["D4", "D5", "D3"]);
    assert.deepEqual(score(persona2).flags.map((flag) => flag.code), ["MIXED_BUSINESS_FAMILY_FUNDS", "IDENTITY_CHANGE_IMMINENT", "SINGLE_INFORMATION_HOLDER", "CROSS_BORDER_UNREVIEWED", "LEGAL_TAX_DISPUTE"]);
    assert.equal(score(persona2).manualReviewRequired, true);
    assert.deepEqual(score(persona3).dimensions.map((d) => d.readiness), [100, 100, 100, 100, 73, 100]);
    assert.deepEqual(score(persona3).topGaps, ["D5"]);
    assert.deepEqual(score(persona3).flags, []);
    assert.equal(score(persona3).manualReviewRequired, false);
});
test("keeps SKIP out of the numerator and denominator", () => {
    const result = score({ Q01: answer("SKIP"), Q02: answer("SKIP"), Q04: answer("A") });
    const d1 = result.dimensions.find((item) => item.code === "D1");
    assert.equal(d1.readiness, 100);
    assert.equal(d1.confidence, 30);
    assert.equal(result.reportStatus, "NEEDS_MORE_INFO");
    assert.equal(result.manualReviewRequired, true);
});
test("validates unknown options, exclusive values, limits and red-line text", () => {
    const q02 = QUESTIONS.find((question) => question.id === "Q02");
    const q10 = QUESTIONS.find((question) => question.id === "Q10");
    assert.equal(validateAnswer(q02, answer("BAD")), "INVALID_OPTION");
    assert.equal(validateAnswer(q02, answer(["UNCLEAR", "EDUCATION"])), "EXCLUSIVE_CONFLICT");
    assert.equal(validateAnswer(q02, answer(["EDUCATION", "IDENTITY", "LIQUIDITY", "BUSINESS"])), "MAX_SELECTION");
    assert.equal(validateAnswer(q10, answer(["NONE", "MARKET"])), "EXCLUSIVE_CONFLICT");
    assert.equal(validateAnswer(q02, answer("OTHER", "12345678")), "SENSITIVE_INPUT_BLOCKED");
    assert.equal(validateAnswer(q02, answer("OTHER", "身份证号码")), "SENSITIVE_INPUT_BLOCKED");
    assert.equal(validateAnswer(q02, answer("OTHER", "资产100万")), "SENSITIVE_INPUT_BLOCKED");
    assert.equal(validateAnswer(q02, answer("OTHER", "password 123")), "SENSITIVE_INPUT_BLOCKED");
    assert.equal(validateAnswer(q02, answer("OTHER", "a".repeat(51))), "OTHER_TOO_LONG");
    assert.equal(validateAnswer(q02, answer("SKIP")), null);
});
test("fails closed for invalid and unknown answer records, and does not accept source metadata", () => {
    const result = score({ source_owner: answer("DIRECT"), Q01: answer("BAD"), Q02: answer("SKIP") });
    assert.equal(result.answeredCount, 0);
    assert.equal(result.reportStatus, "NEEDS_MORE_INFO");
    assert.equal(result.manualReviewRequired, true);
    assert.equal(validateAnswer(QUESTIONS[0], null), "INVALID_ANSWER");
    assert.equal(validateAnswer(QUESTIONS[0], { codes: "A" }), "INVALID_ANSWER");
    assert.equal(validateAnswer(QUESTIONS[0], { codes: ["A"], other: 123 }), "INVALID_OTHER");
    assert.equal(validateAnswer(QUESTIONS[0], { codes: ["A"], unexpected: "red-line record" }), "INVALID_ANSWER");
    const invalidRisk = score({ ...persona1, Q11: { codes: null } });
    assert.equal(invalidRisk.reportStatus, "NEEDS_MORE_INFO");
    assert.equal(invalidRisk.flags.some((flag) => flag.code === "IDENTITY_CHANGE_IMMINENT"), false);
});
test("only raises mixed-business risk for explicit mixing language", () => {
    const base = { Q05: answer("C"), Q06: answer("OTHER", "企业与家庭资金使用"), Q07: answer("A"), Q08: answer("A"), Q09: answer("A"), Q10: answer("NONE"), Q11: answer("A"), Q12: answer("A"), Q13: answer("A"), Q14: answer("A") };
    assert.equal(score(base).flags.map((flag) => flag.code).includes("MIXED_BUSINESS_FAMILY_FUNDS"), false);
    assert.equal(score({ ...base, Q06: answer("OTHER", "企业与家庭资金混用") }).flags.map((flag) => flag.code).includes("MIXED_BUSINESS_FAMILY_FUNDS"), true);
});
test("sorts tied gaps with a hard-risk dimension first", () => {
    const result = score({ Q01: answer("D"), Q02: answer("UNCLEAR"), Q04: answer("D"), Q05: answer("A"), Q06: answer(["CASH"]), Q07: answer("A"), Q08: answer("A"), Q09: answer("E"), Q10: answer("LEGAL_TAX_DISPUTE"), Q11: answer("A"), Q12: answer("A"), Q13: answer("A"), Q14: answer("A") });
    assert.equal(result.topGaps[0], "D4");
});
