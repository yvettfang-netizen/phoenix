import type { RuleCard } from "./advisor-types";

const BOUNDARY_SOURCE = "ASKWISE_PRODUCT_BOUNDARY_V1.1_CANDIDATE.md";

export const ADVISOR_RULE_CARDS: readonly RuleCard[] = [
  {
    ruleId: "ADVISOR-INTAKE-001",
    domain: "advisor_intake",
    trigger: "A consultant submits a case for an initial internal assessment.",
    requiredEvidence: [
      "anonymous case ID",
      "student stage",
      "current education background",
      "identity or region context",
      "academic evidence with source",
      "family goal",
      "constraint",
      "current judgement question",
      "information source",
      "advisor confirmation status",
    ],
    decisionLogic: "If any required evidence is absent, return NEEDS_INFORMATION and ask only for the missing evidence.",
    boundary: "Do not provide a pathway conclusion while required evidence is missing.",
    outputTemplate: "Missing information, next questions, and no preliminary conclusion.",
    source: `${BOUNDARY_SOURCE}#Hard-boundaries`,
    version: "v1.0",
    reviewer: "Phoenix Education Lead",
    status: "ACTIVE",
  },
  {
    ruleId: "ADVISOR-EVIDENCE-002",
    domain: "evidence_integrity",
    trigger: "Two submitted evidence items claim different values for the same named field.",
    requiredEvidence: ["field name", "value", "source"],
    decisionLogic: "Return CONFLICT_DETECTED, preserve both claims, and request source verification before diagnosis.",
    boundary: "Do not select one conflicting claim or infer which source is correct.",
    outputTemplate: "Conflict list, verification questions, and no preliminary conclusion.",
    source: `${BOUNDARY_SOURCE}#Askwise-is-responsible-for`,
    version: "v1.0",
    reviewer: "Phoenix Education Lead",
    status: "ACTIVE",
  },
  {
    ruleId: "ADVISOR-PRELIMINARY-003",
    domain: "preliminary_assessment",
    trigger: "Required evidence is present and no direct evidence conflict is detected.",
    requiredEvidence: ["completed intake", "evidence sources", "current judgement question"],
    decisionLogic: "Return an evidence-based internal preliminary assessment, uncertainty, next questions, possible work paths, and human-confirmation requirement.",
    boundary: "Never express a certain admission, score, identity, school-policy, or long-term outcome.",
    outputTemplate: "Facts, basis, uncertainty, questions, paths, risks, and confirmation flag.",
    source: `${BOUNDARY_SOURCE}#Hard-boundaries`,
    version: "v1.0",
    reviewer: "Phoenix Education Lead",
    status: "ACTIVE",
  },
  {
    ruleId: "ADVISOR-HUMAN-004",
    domain: "human_review",
    trigger: "The case includes a high-impact domain or a stated risk.",
    requiredEvidence: ["identity or region context", "known risks", "advisor confirmation status"],
    decisionLogic: "Escalate to HUMAN_REVIEW_REQUIRED and restrict output to verification and comparison work.",
    boundary: "The system cannot approve, reject, or publish a high-impact outcome.",
    outputTemplate: "Risk alert, evidence verification path, and required human review.",
    source: `${BOUNDARY_SOURCE}#Hard-boundaries`,
    version: "v1.0",
    reviewer: "Phoenix Education Lead",
    status: "ACTIVE",
  },
] as const;

export function activeRuleCards(): readonly RuleCard[] {
  return ADVISOR_RULE_CARDS.filter((card) => card.status === "ACTIVE");
}
