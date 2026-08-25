import { describe, expect, it } from "vitest";

import {
  identityPrimaryGoalOptions,
  identityQuestionTitles,
  routeOpennessOptions,
} from "@/lib/identity/questions";

describe("Identity Free 6 question bank projection", () => {
  it("renders exactly six screens", () => {
    expect(identityQuestionTitles).toHaveLength(6);
  });

  it("keeps the frozen Q1 and Q6 answer labels", () => {
    expect(identityPrimaryGoalOptions.map((option) => option.label)).toEqual([
      "孩子教育", "永居", "事业", "全家香港生活", "进修", "资产 / 家庭规划", "多一个未来选择", "先了解",
    ]);
    expect(routeOpennessOptions.map((option) => option.label)).toEqual([
      "人才计划", "香港工作", "香港进修", "资本投资", "家庭成员身份安排", "都可以比较", "AI 帮我判断",
    ]);
  });
});
