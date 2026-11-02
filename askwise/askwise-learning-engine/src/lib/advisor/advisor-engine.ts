import { createHash } from "node:crypto";

import type {
  AdvisorAssessment,
  AdvisorCaseDomain,
  AdvisorCaseInput,
  AdvisorCaseStatus,
  AdvisorEvidence,
  RuleTrace,
} from "./advisor-types";
import { activeRuleCards } from "./rule-cards";

const HIGH_IMPACT_DOMAINS: readonly AdvisorCaseDomain[] = [
  "identity_pathway",
  "education_pathway",
  "school_selection",
  "long_term_planning",
  "family_complexity",
];

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizedEvidence(evidence: AdvisorEvidence[]): AdvisorEvidence[] {
  return evidence
    .map((item) => ({
      field: normalize(item.field),
      value: normalize(item.value),
      source: normalize(item.source),
      verified: Boolean(item.verified),
    }))
    .filter((item) => item.field || item.value || item.source)
    .sort((a, b) => `${a.field}|${a.value}|${a.source}`.localeCompare(`${b.field}|${b.value}|${b.source}`));
}

function canonicalCase(input: AdvisorCaseInput) {
  return {
    caseId: normalize(input.caseId),
    studentStage: normalize(input.studentStage),
    currentEducationBackground: normalize(input.currentEducationBackground),
    identityOrRegionContext: normalize(input.identityOrRegionContext),
    academicEvidence: normalizedEvidence(input.academicEvidence),
    familyGoal: normalize(input.familyGoal),
    constraints: normalize(input.constraints),
    knownRisks: input.knownRisks.map(normalize).filter(Boolean).sort(),
    currentJudgementQuestion: normalize(input.currentJudgementQuestion),
    informationSources: input.informationSources.map(normalize).filter(Boolean).sort(),
    advisorConfirmationStatus: input.advisorConfirmationStatus,
    domains: [...(input.domains ?? [])].sort(),
    sourceSystem: normalize(input.sourceSystem ?? "askwise_internal"),
    sourceVersion: normalize(input.sourceVersion ?? "v1.1-candidate"),
  };
}

export function advisorInputFingerprint(input: AdvisorCaseInput): string {
  return createHash("sha256").update(JSON.stringify(canonicalCase(input))).digest("hex").slice(0, 24);
}

function missingInformation(input: AdvisorCaseInput): string[] {
  const missing: string[] = [];
  if (!normalize(input.caseId)) missing.push("anonymous case ID");
  if (!normalize(input.studentStage)) missing.push("student stage");
  if (!normalize(input.currentEducationBackground)) missing.push("current education background");
  if (!normalize(input.identityOrRegionContext)) missing.push("identity or region context");
  if (!normalizedEvidence(input.academicEvidence).some((item) => item.field && item.value && item.source)) {
    missing.push("academic evidence with field, value, and source");
  }
  if (!normalize(input.familyGoal)) missing.push("family goal");
  if (!normalize(input.constraints)) missing.push("budget or time constraint");
  if (!normalize(input.currentJudgementQuestion)) missing.push("current judgement question");
  if (!input.informationSources.map(normalize).some(Boolean)) missing.push("information source");
  if (!input.advisorConfirmationStatus) missing.push("advisor confirmation status");
  return missing;
}

function detectEvidenceConflicts(evidence: AdvisorEvidence[]): string[] {
  const byField = new Map<string, Set<string>>();
  for (const item of normalizedEvidence(evidence)) {
    if (!item.field || !item.value) continue;
    const key = item.field.toLowerCase();
    if (!byField.has(key)) byField.set(key, new Set());
    byField.get(key)?.add(item.value.toLowerCase());
  }

  return [...byField.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([field, values]) => `Conflicting submitted values for ${field}: ${[...values].join(" | ")}.`);
}

function buildRuleTrace(status: AdvisorCaseStatus, hasConflict: boolean): RuleTrace[] {
  const cards = activeRuleCards();
  const selected = cards.filter((card) => {
    if (card.ruleId === "ADVISOR-INTAKE-001") return true;
    if (card.ruleId === "ADVISOR-EVIDENCE-002") return hasConflict;
    if (card.ruleId === "ADVISOR-PRELIMINARY-003") return status !== "NEEDS_INFORMATION" && !hasConflict;
    return status === "HUMAN_REVIEW_REQUIRED";
  });

  return selected.map((card) => ({
    ruleId: card.ruleId,
    version: card.version,
    source: card.source,
    purpose: card.domain,
  }));
}

function buildConfirmedFacts(input: AdvisorCaseInput): string[] {
  const facts = [
    `Student stage: ${normalize(input.studentStage)}`,
    `Current education background: ${normalize(input.currentEducationBackground)}`,
    `Identity or region context: ${normalize(input.identityOrRegionContext)}`,
    `Family goal: ${normalize(input.familyGoal)}`,
    `Constraint: ${normalize(input.constraints)}`,
    `Current judgement question: ${normalize(input.currentJudgementQuestion)}`,
  ];
  for (const evidence of normalizedEvidence(input.academicEvidence)) {
    if (evidence.field && evidence.value && evidence.source) {
      facts.push(`Evidence - ${evidence.field}: ${evidence.value} (source: ${evidence.source})`);
    }
  }
  return facts.filter((fact) => !fact.endsWith(": "));
}

function isHighImpact(input: AdvisorCaseInput): boolean {
  const domainMatch = (input.domains ?? []).some((domain) => HIGH_IMPACT_DOMAINS.includes(domain));
  const riskText = input.knownRisks.join(" ").toLowerCase();
  return domainMatch || /identity|visa|immigration|admission|legal|身份|签证|录取|法律/.test(riskText);
}

function possiblePaths(input: AdvisorCaseInput): string[] {
  const paths = [
    "Evidence verification path: check the submitted academic evidence against its named source before comparison.",
    "Goal-constraint alignment path: compare the family goal with the stated budget and time limits after advisor confirmation.",
  ];
  if (isHighImpact(input)) {
    paths.push("High-impact review path: have an authorized Phoenix advisor verify identity/region or outcome-sensitive constraints before any recommendation.");
  }
  if ((input.domains ?? []).includes("learning_support")) {
    paths.push("Learning Support path: after advisor framing, create a focused ASKWISE learning-support task instead of restarting a broad assessment.");
  }
  return paths;
}

function redactText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?86[-\s]?)?1[3-9]\d{9}\b/g, "[REDACTED_PHONE]")
    .replace(/\b\d{15}(?:\d{2}[\dXx])?\b/g, "[REDACTED_ID]");
}

function redactUnknown(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactUnknown(item)]));
  }
  return value;
}

export function sanitizeAdvisorCaseForStorage(input: AdvisorCaseInput): AdvisorCaseInput {
  return redactUnknown(canonicalCase(input)) as AdvisorCaseInput;
}

export function sanitizeAdvisorAssessmentForStorage(assessment: AdvisorAssessment): AdvisorAssessment {
  return redactUnknown(assessment) as AdvisorAssessment;
}

export function runAdvisorAssessment(input: AdvisorCaseInput): AdvisorAssessment {
  const missing = missingInformation(input);
  const conflicts = detectEvidenceConflicts(input.academicEvidence);
  const highImpact = isHighImpact(input);
  const status: AdvisorCaseStatus = missing.length > 0
    ? "NEEDS_INFORMATION"
    : conflicts.length > 0
      ? "CONFLICT_DETECTED"
      : highImpact
        ? "HUMAN_REVIEW_REQUIRED"
        : "READY_FOR_ADVISOR_CONFIRMATION";

  const sourceSystem = normalize(input.sourceSystem ?? "askwise_internal");
  const sourceVersion = normalize(input.sourceVersion ?? "v1.1-candidate");
  const hasPreliminaryJudgement = status !== "NEEDS_INFORMATION" && status !== "CONFLICT_DETECTED";
  const facts = buildConfirmedFacts(input);

  return {
    caseId: normalize(input.caseId),
    inputFingerprint: advisorInputFingerprint(input),
    status,
    confirmedFacts: facts,
    missingInformation: missing,
    conflicts,
    preliminaryJudgement: hasPreliminaryJudgement
      ? "The submitted evidence supports an internal preliminary assessment: verify the evidence and stated constraints, then have an advisor confirm which comparison path is appropriate. This is not an admission, score, identity, school-policy, or long-term outcome conclusion."
      : null,
    judgementBasis: hasPreliminaryJudgement
      ? [
          "Required intake fields and at least one sourced academic evidence item are present.",
          "The case uses the stated family goal, constraints, and current judgement question as the decision frame.",
        ]
      : [],
    uncertainty: hasPreliminaryJudgement
      ? [
          "Evidence sources have not been independently authenticated by this module.",
          "No external school, identity, admission, or policy rule has been consulted or inferred.",
          "A Phoenix advisor must confirm the internal interpretation before any family-facing communication.",
        ]
      : ["No preliminary assessment is produced until missing or conflicting evidence is resolved."],
    nextQuestions: missing.length > 0
      ? missing.map((item) => `Please provide or verify: ${item}.`)
      : conflicts.length > 0
        ? conflicts.map((item) => `Please reconcile with original sources: ${item}`)
        : [
            "Which submitted academic evidence is current and can be verified against its original source?",
            "Which goal trade-off is acceptable if the budget or time constraint cannot support every option?",
            "What advisor-confirmed question should be answered before any external or family-facing communication?",
          ],
    possiblePaths: hasPreliminaryJudgement ? possiblePaths(input) : [],
    riskAlerts: [
      ...input.knownRisks.map(normalize).filter(Boolean),
      ...(highImpact ? ["High-impact case: human review is required; the system must not make a final outcome claim."] : []),
    ],
    requiresHumanConfirmation: true,
    ruleTrace: buildRuleTrace(status, conflicts.length > 0),
    sourceSystem,
    sourceVersion,
  };
}
