import {
  FREE_SNAPSHOT_VERSION,
  type FamilyIdentityType,
  type FreeIdentityAnswers,
  type FreeIdentitySnapshot,
  type PlanningStage,
  type RouteOpenness,
} from "@/lib/identity/types";

const typePriority: readonly FamilyIdentityType[] = [
  "Education-led Family",
  "Investment-led Family",
  "Talent-led Family",
  "Career-led Family",
  "Study-led Family",
  "Family-linked Family",
  "Long-term HK Family",
  "Exploration Family",
];

const goalType: Record<FreeIdentityAnswers["identity_primary_goals"][number], FamilyIdentityType> = {
  child_education: "Education-led Family",
  permanent_residency: "Long-term HK Family",
  career_development: "Career-led Family",
  family_life_in_hong_kong: "Long-term HK Family",
  further_study: "Study-led Family",
  asset_and_family_planning: "Investment-led Family",
  additional_future_option: "Exploration Family",
  initial_exploration: "Exploration Family",
};

const routeType: Record<RouteOpenness, FamilyIdentityType> = {
  talent_programmes: "Talent-led Family",
  hong_kong_employment: "Career-led Family",
  hong_kong_study: "Study-led Family",
  capital_investment: "Investment-led Family",
  family_member_identity_arrangement: "Family-linked Family",
  compare_all: "Exploration Family",
  ai_assisted_judgement: "Exploration Family",
};

const directionByType: Record<FamilyIdentityType, readonly [string, string]> = {
  "Education-led Family": ["先梳理孩子教育时间线", "比较家庭与教育安排如何衔接"],
  "Investment-led Family": ["整理家庭资产规划目标", "比较可接受的投入方式与时间线"],
  "Talent-led Family": ["梳理个人背景与发展重点", "比较人才方向所需准备信息"],
  "Career-led Family": ["梳理香港职业发展目标", "比较工作与家庭安排的先后顺序"],
  "Study-led Family": ["梳理香港进修目标", "分别核对入学、学生签证与毕业后安排"],
  "Family-linked Family": ["梳理家庭成员身份关系", "建立家庭身份安排时间线"],
  "Long-term HK Family": ["明确全家长期生活优先级", "建立身份、教育与事业的共同时间线"],
  "Exploration Family": ["完成家庭目标优先级排序", "用统一框架比较可考虑方向"],
};

const goalLabels: Record<FreeIdentityAnswers["identity_primary_goals"][number], string> = {
  child_education: "孩子教育",
  permanent_residency: "长期身份安排",
  career_development: "事业发展",
  family_life_in_hong_kong: "全家香港生活",
  further_study: "香港进修",
  asset_and_family_planning: "资产与家庭规划",
  additional_future_option: "为家庭增加未来选择",
  initial_exploration: "先建立基本了解",
};

export function classifyFamilyIdentityType(answers: FreeIdentityAnswers): FamilyIdentityType {
  const scores = new Map<FamilyIdentityType, number>(typePriority.map((type) => [type, 0]));

  for (const goal of answers.identity_primary_goals) {
    const type = goalType[goal];
    const weight = type === "Exploration Family" ? 1 : 3;
    scores.set(type, (scores.get(type) ?? 0) + weight);
  }
  for (const route of answers.route_openness) {
    const type = routeType[route];
    scores.set(type, (scores.get(type) ?? 0) + 2);
  }

  return typePriority.reduce((best, candidate) =>
    (scores.get(candidate) ?? 0) > (scores.get(best) ?? 0) ? candidate : best,
  );
}

export function derivePlanningStage(answers: FreeIdentityAnswers): PlanningStage {
  if (answers.current_hk_status === "hk_permanent") return "identity_established";
  if (answers.current_hk_status === "hk_non_permanent" || answers.current_hk_status === "multiple") {
    return "hong_kong_transition";
  }
  if (
    answers.identity_primary_goals.every((goal) =>
      ["additional_future_option", "initial_exploration"].includes(goal),
    ) &&
    answers.route_openness.every((route) => ["compare_all", "ai_assisted_judgement"].includes(route))
  ) {
    return "initial_exploration";
  }
  if (answers.route_openness.includes("compare_all") || answers.route_openness.includes("ai_assisted_judgement")) {
    return "direction_comparison";
  }
  return "planning_preparation";
}

export function createFreeIdentitySnapshot(answers: FreeIdentityAnswers): FreeIdentitySnapshot {
  const familyIdentityType = classifyFamilyIdentityType(answers);
  const [firstDirection, secondDirection] = directionByType[familyIdentityType];
  const primaryGoal = goalLabels[answers.identity_primary_goals[0]];

  return {
    snapshot_version: FREE_SNAPSHOT_VERSION,
    family_identity_type: familyIdentityType,
    planning_stage: derivePlanningStage(answers),
    free_direction_1: firstDirection,
    free_direction_2: secondDirection,
    free_key_insight: `目前最清晰的家庭信号是“${primaryGoal}”。Free 6题只整理家庭意图，不判断任何政策资格；下一步应把家庭成员、时间线与可接受方向放在一起比较。`,
  };
}
