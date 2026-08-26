import { IDENTITY_PATH_ORDER_NOTICE, type IdentityPathCode } from "@/lib/identity/path-registry";
import {
  deriveCandidatePaths,
  pathDisplayName,
  type NormalizedIdentityAnswers,
  type PathEngineResult,
} from "@/lib/identity/path-engine";
import { POLICY_LIBRARY_VERSION, type FreeIdentitySnapshot, type NormalizedIdentityAssessment } from "@/lib/identity/types";

export const IDENTITY_FULL_REPORT_VERSION = "IDENTITY_FULL_REPORT_V1.0" as const;

export type StudyStrategySection = Readonly<{
  source_type: "OFFICIAL" | "INTERNAL_EXPERIENCE";
  source: string;
  status: string;
  summary: string;
}>;

export type IdentityFullReport = Readonly<{
  report_version: typeof IDENTITY_FULL_REPORT_VERSION;
  policy_version: typeof POLICY_LIBRARY_VERSION;
  generated_at: string;
  identity_snapshot: FreeIdentitySnapshot;
  path_fit_overview: readonly PathEngineResult[];
  path_order_notice: typeof IDENTITY_PATH_ORDER_NOTICE;
  key_gaps: readonly string[];
  timeline: readonly Readonly<{ stage: string; action: string }>[];
  study_strategy: Readonly<{
    boundary: "Admission ≠ Student Visa ≠ IANG";
    admission: StudyStrategySection;
    student_visa: StudyStrategySection;
    iang: StudyStrategySection;
  }> | null;
  next_actions: readonly string[];
  boundary_notice: string;
}>;

export type ReportEngineInput = Readonly<{
  assessment: NormalizedIdentityAssessment;
  snapshot: FreeIdentitySnapshot;
  normalized_answers: NormalizedIdentityAnswers;
  path_results: readonly PathEngineResult[];
  generated_at?: string;
}>;

function answerStatus(answers: NormalizedIdentityAnswers, field: string): string {
  const value = answers[field];
  return typeof value === "string" && value.trim() ? value : "not_assessed";
}

function createStudyStrategy(answers: NormalizedIdentityAnswers): NonNullable<IdentityFullReport["study_strategy"]> {
  return {
    boundary: "Admission ≠ Student Visa ≠ IANG",
    admission: {
      source_type: "INTERNAL_EXPERIENCE",
      source: "Phoenix Study Admission Strategy Matrix V1.0",
      status: answerStatus(answers, "admission_status"),
      summary: "Admission 只表示学校录取策略与状态。Phoenix Matrix 是内部经验，不是学校官方标准或香港政府政策。",
    },
    student_visa: {
      source_type: "OFFICIAL",
      source: "Hong Kong Immigration Department — Study",
      status: answerStatus(answers, "student_visa_status"),
      summary: "Student Visa 是独立的官方入境决定；获得 Admission 不等于学生签证已有结果。",
    },
    iang: {
      source_type: "OFFICIAL",
      source: "Hong Kong Immigration Department — IANG",
      status: answerStatus(answers, "iang_status"),
      summary: "IANG 需独立核验毕业生类别、课程、院校、时间与就业情境，不能由 Admission 或 Student Visa 推导。",
    },
  };
}

function candidateResults(
  candidates: readonly IdentityPathCode[],
  pathResults: readonly PathEngineResult[],
): readonly PathEngineResult[] {
  const candidateSet = new Set(candidates);
  return pathResults.filter(({ path_code }) => candidateSet.has(path_code));
}

export function generateIdentityReport(input: ReportEngineInput): IdentityFullReport {
  const candidates = deriveCandidatePaths(input.normalized_answers);
  const relevantResults = candidateResults(candidates, input.path_results);
  const keyGaps = relevantResults.flatMap((result) =>
    result.gaps.map((gap) => `${pathDisplayName(result.path_code)}：${gap}`),
  );
  const uniqueGaps = [...new Set(keyGaps)];
  const hasStudyPath = candidates.includes("study_iang");

  const nextActions = [
    uniqueGaps.length > 0 ? "补齐报告列出的关键资料缺口。" : "保存已整理的事实与证据清单。",
    "由顾问按当前官方来源逐项完成 manual checks。",
    hasStudyPath ? "分别确认 Admission、Student Visa 与 IANG 三条状态线。" : null,
    "确认政策版本仍为当前有效后，再决定是否进入正式服务。",
  ].filter((item): item is string => Boolean(item));

  return {
    report_version: IDENTITY_FULL_REPORT_VERSION,
    policy_version: POLICY_LIBRARY_VERSION,
    generated_at: input.generated_at ?? new Date().toISOString(),
    identity_snapshot: input.snapshot,
    path_fit_overview: input.path_results,
    path_order_notice: IDENTITY_PATH_ORDER_NOTICE,
    key_gaps: uniqueGaps.length > 0 ? uniqueGaps : ["当前没有新增结构化缺口；仍需完成各路径人工核验。"],
    timeline: [
      { stage: "现在", action: "完成动态事实收集并保留未回答项。" },
      { stage: "下一步", action: "核对官方来源、文件证据及规则有效状态。" },
      { stage: "顾问解读", action: "解释路径差异、关键缺口与家庭时间线，不作申请决定。" },
      { stage: "正式服务（如选择）", action: "由持责团队另行确认范围；系统不会自动申请或递交。" },
    ],
    study_strategy: hasStudyPath ? createStudyStrategy(input.normalized_answers) : null,
    next_actions: nextActions,
    boundary_notice:
      "本报告为免费方向筛选与资料整理，不构成法律意见、政策资格决定、获批概率、推荐排序或任何保证。正式申请结论由相关官方机构作出；过期、未核验或非官方规则不会产生确定性结论。",
  };
}
