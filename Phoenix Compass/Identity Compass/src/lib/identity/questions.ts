import type {
  CurrentHkStatus,
  EmploymentStatus,
  FreeIdentityDraft,
  HighestEducation,
  IdentityAgeBand,
  IdentityPrimaryGoal,
  RouteOpenness,
} from "@/lib/identity/types";

export type IdentityOption<T extends string> = Readonly<{
  value: T;
  label: string;
  detail?: string;
}>;

export const identityPrimaryGoalOptions: readonly IdentityOption<IdentityPrimaryGoal>[] = [
  { value: "child_education", label: "孩子教育" },
  { value: "permanent_residency", label: "永居" },
  { value: "career_development", label: "事业" },
  { value: "family_life_in_hong_kong", label: "全家香港生活" },
  { value: "further_study", label: "进修" },
  { value: "asset_and_family_planning", label: "资产 / 家庭规划" },
  { value: "additional_future_option", label: "多一个未来选择" },
  { value: "initial_exploration", label: "先了解" },
];

export const currentHkStatusOptions: readonly IdentityOption<CurrentHkStatus>[] = [
  { value: "mainland_resident", label: "目前没有香港身份" },
  { value: "hk_permanent", label: "本人或家庭已有香港永久身份" },
  { value: "hk_non_permanent", label: "本人或家庭已有香港居民身份（非永久）" },
  { value: "macau_or_overseas", label: "本人或家庭主要为澳门 / 海外身份" },
  { value: "multiple", label: "家庭成员身份情况不一致" },
  { value: "prefer_not_to_say", label: "暂不确定 / 不愿透露" },
];

export const identityAgeBandOptions: readonly IdentityOption<IdentityAgeBand>[] = [
  { value: "under_18", label: "18岁以下" },
  { value: "18_24", label: "18–24岁" },
  { value: "25_34", label: "25–34岁" },
  { value: "35_44", label: "35–44岁" },
  { value: "45_54", label: "45–54岁" },
  { value: "55_plus", label: "55岁及以上" },
  { value: "prefer_not_to_say", label: "暂不透露" },
];

export const highestEducationOptions: readonly IdentityOption<HighestEducation>[] = [
  { value: "secondary_or_below", label: "中学或以下" },
  { value: "associate_or_diploma", label: "副学士 / 大专 / 文凭" },
  { value: "bachelor", label: "本科" },
  { value: "master", label: "硕士" },
  { value: "doctorate", label: "博士" },
  { value: "other_or_prefer_not_to_say", label: "其他 / 暂不透露" },
];

export const employmentStatusOptions: readonly IdentityOption<EmploymentStatus>[] = [
  { value: "employed", label: "受雇工作" },
  { value: "business_owner", label: "企业经营者" },
  { value: "self_employed", label: "自由职业 / 自雇" },
  { value: "student", label: "在读" },
  { value: "not_currently_working", label: "目前未工作" },
  { value: "retired", label: "已退休" },
  { value: "prefer_not_to_say", label: "暂不透露" },
];

export const routeOpennessOptions: readonly IdentityOption<RouteOpenness>[] = [
  { value: "talent_programmes", label: "人才计划" },
  { value: "hong_kong_employment", label: "香港工作" },
  { value: "hong_kong_study", label: "香港进修" },
  { value: "capital_investment", label: "资本投资" },
  { value: "family_member_identity_arrangement", label: "家庭成员身份安排" },
  { value: "compare_all", label: "都可以比较" },
  { value: "ai_assisted_judgement", label: "AI 帮我判断" },
];

export const identityQuestionTitles = [
  "为什么开始考虑香港身份？",
  "本人 / 家庭当前香港身份状态是？",
  "你的年龄区间是？",
  "你的最高学历是？",
  "你目前的职业状态是？",
  "你愿意考虑哪些方向？",
] as const;

export function isIdentityStepComplete(step: number, draft: FreeIdentityDraft): boolean {
  switch (step) {
    case 0:
      return Boolean(draft.identity_primary_goals?.length);
    case 1:
      return Boolean(draft.current_hk_status);
    case 2:
      return Boolean(draft.age_band);
    case 3:
      return Boolean(draft.highest_education);
    case 4:
      return Boolean(draft.employment_status);
    case 5:
      return Boolean(draft.route_openness?.length);
    default:
      return false;
  }
}
