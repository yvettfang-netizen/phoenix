import { describe, expect, it } from "vitest";

import { diagnose, MATH_TAXONOMY, POLITICS_TAXONOMY } from "./diagnosis";
import { StudentProfile, buildProfileFromAttempts } from "./learning";
import { chooseLearningMode, LearningMode } from "./learning-mode";
import { HINT_LEVELS, buildHint, nextHintLevel } from "./hint-policy";

describe("Python baseline mapping: Politics taxonomy", () => {
  const subject = "Politics";
  const topic = "联系多样性 vs 矛盾特殊性";
  const cases: Array<[string, string]> = [
    ["P1", "这个题目里有“联系”概念"],
    ["P2", "我不知道这两个概念怎么讲"],
    ["P3", ""],
    ["P4", "我只会用矛盾特殊性回答"],
    ["P5", "我先想下政治制度的背景"],
  ];

  it("covers P1-P5", () => {
    for (const [expected, input] of cases) {
      const result = diagnose(subject, topic, input);
      expect(result.errorType).toBe(expected);
    }
    expect(new Set(Object.keys(POLITICS_TAXONOMY))).toEqual(
      new Set(["P1", "P2", "P3", "P4", "P5"]),
    );
  });
});

describe("Python baseline mapping: Math taxonomy", () => {
  const subject = "Mathematics";
  const topic = "line intersects ellipse with Vieta";
  const cases: Array<[string, string]> = [
    ["K1", ""],
    ["K2", "这题看起来像普通方程，我先整理"],
    ["K3", "已知有两个交点，设直线与椭圆交点坐标"],
    ["K4", "先用判别式判断是否有交点"],
    ["K5", "用联立代入去消元，得到一元二次"],
    ["K6", "我用韦达公式了，算错了"],
    ["K7", "先做函数图像比较"],
  ];

  it("covers K1-K7", () => {
    for (const [expected, input] of cases) {
      const result = diagnose(subject, topic, input);
      expect(result.errorType).toBe(expected);
    }
    expect(new Set(Object.keys(MATH_TAXONOMY))).toEqual(
      new Set(["K1", "K2", "K3", "K4", "K5", "K6", "K7"]),
    );
  });
});

describe("Learning mode decision mapping", () => {
  it("teaches unknown -> Teaching Mode", () => {
    const profile = new StudentProfile();
    const diagnosis = diagnose("Politics", "联系多样性 vs 矛盾特殊性", "");
    const decision = chooseLearningMode(profile, "Politics", "联系多样性 vs 矛盾特殊性", diagnosis);
    expect(decision.mode).toBe(LearningMode.TEACHING);
  });

  it("prefers Recall for forgotten profile", () => {
    const profile = new StudentProfile();
    profile.recordAttempt("Politics", "联系多样性 vs 矛盾特殊性", false);
    profile.recordAttempt("Politics", "联系多样性 vs 矛盾特殊性", false);
    profile.recordAttempt("Politics", "联系多样性 vs 矛盾特殊性", false);
    const diagnosis = diagnose("Politics", "联系多样性 vs 矛盾特殊性", "");
    const decision = chooseLearningMode(profile, "Politics", "联系多样性 vs 矛盾特殊性", diagnosis);
    expect(decision.mode).toBe(LearningMode.RECALL);
  });

  it("transfers when diagnosis correct", () => {
    const profile = new StudentProfile();
    profile.recordAttempt("Math", "line intersects ellipse with Vieta", true);
    const diagnosis = diagnose("Math", "line intersects ellipse with Vieta", "我先把直线代入椭圆方程并用韦达");
    const decision = chooseLearningMode(profile, "Math", "line intersects ellipse with Vieta", diagnosis);
    expect(decision.mode).toBe(LearningMode.TRANSFER);
  });

  it("thinks when no method is selected", () => {
    const profile = new StudentProfile();
    profile.recordAttempt("Politics", "联系多样性 vs 矛盾特殊性", true);
    const diagnosis = diagnose("Politics", "联系多样性 vs 矛盾特殊性", "我想到联系");
    const decision = chooseLearningMode(profile, "Politics", "联系多样性 vs 矛盾特殊性", diagnosis);
    expect(decision.mode).toBe(LearningMode.THINKING);
  });

  it("debugs execution error", () => {
    const profile = new StudentProfile();
    profile.recordAttempt("Math", "line intersects ellipse with Vieta", true);
    const diagnosis = diagnose("Math", "line intersects ellipse with Vieta", "我用韦达求根，但算错了");
    const decision = chooseLearningMode(profile, "Math", "line intersects ellipse with Vieta", diagnosis);
    expect(decision.mode).toBe(LearningMode.DEBUG);
  });
});

describe("Hint policy", () => {
  it("supports levels 0-5", () => {
    for (const level of [0, 1, 2, 3, 4, 5]) {
      expect(HINT_LEVELS[level]).toBeTruthy();
    }
  });

  it("escalates without crossing 5", () => {
    expect(nextHintLevel(0, false)).toBe(1);
    expect(nextHintLevel(1, false)).toBe(2);
    expect(nextHintLevel(2, false)).toBe(3);
    expect(nextHintLevel(3, false)).toBe(4);
    expect(nextHintLevel(4, false)).toBe(5);
    expect(nextHintLevel(5, false)).toBe(5);
    expect(nextHintLevel(5, true)).toBe(0);
    expect(nextHintLevel(2, true)).toBe(0);
  });

  it("does not leak final answer for early hints", () => {
    const banned = ["完整答案", "直接答案", "答案是", "最终结果是", "根即为"];
    for (const level of [1, 2, 3, 4, 5]) {
      const pHint = buildHint("Politics", "联系多样性 vs 矛盾特殊性", level, LearningMode.RECALL);
      const mHint = buildHint("Math", "line intersects ellipse with Vieta", level, LearningMode.RECALL);
      for (const token of banned) {
        expect(pHint.includes(token)).toBe(false);
        expect(mHint.includes(token)).toBe(false);
      }
    }
    expect(buildHint("Math", "line intersects ellipse with Vieta", 0, LearningMode.RECALL)).toBe("");
  });

  it("handles repeated failure escalation", () => {
    const subject = "Mathematics" as const;
    const topic = "line intersects ellipse with Vieta";
    const profile = buildProfileFromAttempts(subject, topic, [
      { isCorrect: false },
      { isCorrect: false },
      { isCorrect: false },
      { isCorrect: false },
    ]);
    let level = 0;
    const levels: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const diagnosis = diagnose(subject, topic, "");
      const decision = chooseLearningMode(profile, subject, topic, diagnosis);
      const nextLevel = nextHintLevel(level, false);
      profile.recordAttempt(subject, topic, false);
      levels.push(nextLevel);
      level = nextLevel;
      expect(decision.mode).toBe(LearningMode.RECALL);
    }
    expect(levels).toEqual([1, 2, 3, 4]);
  });
});
