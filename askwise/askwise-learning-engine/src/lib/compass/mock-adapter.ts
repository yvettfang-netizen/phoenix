import { createHash } from "node:crypto";

const SUPPORTED_INTEGRATION_VERSION = "v1.0";

const EDUCATION_SYSTEMS = new Set([
  "GAOKAO",
  "DSE",
  "IGCSE",
  "A_LEVEL",
  "AP_US",
  "other",
]);

export type ContractErrorCode =
  | "EC_INCOMPLETE_INPUT"
  | "EC_INVALID_FORMAT"
  | "EC_IDMAP_MISSING"
  | "EC_VERSION_MISMATCH"
  | "EC_SESSION_NOT_FOUND";

export interface CompassInputPayload {
  student_id: string;
  assessment_id: string;
  subject_focus: string;
  learning_bottleneck: string;
  priority_issue: string;
  recommended_learning_goal: string;
  family_id?: string;
  education_system?: string;
  grade_level?: string;
  source_version?: string;
  created_at?: string;
  integration_version?: string;
}

export interface ContractError {
  status: "error";
  error_code: ContractErrorCode;
  error_message: string;
  trace_id: string;
  idempotency_key: string;
  attempted_at: string;
  integration_version: string;
  missing_mapping_field?: "student_id" | "assessment_id";
}

export interface IntegrationSessionPayload {
  student_id: string;
  assessment_id: string;
  askwise_session_id: string;
  subject: string;
  diagnosis_type: string;
  learning_mode: "Teaching" | "Recall" | "Transfer" | "Thinking" | "Debug";
  hint_level_max: number;
  hint_count: number;
  retry_count: number;
  outcome: "solved" | "unsolved" | "in_progress";
  independent_solve_status:
    | "not_attempted"
    | "failed"
    | "partial"
    | "independent"
    | "with_hints";
  knowledge_map_progress: {
    status: "not_started" | "partial" | "in_progress" | "complete";
    score: number;
  };
  strategy_map_progress: {
    status: "not_started" | "partial" | "in_progress" | "complete";
    score: number;
  };
  reflection_completed: boolean;
  learning_evidence_id: string | null;
  started_at: string;
  completed_at: string | null;
  source_system: "askwise";
  source_version: string;
  integration_version: string;
  created_at: string;
  updated_at: string;
  status: "created" | "existing";
  idempotency_key: string;
}

export type AdapterResult = IntegrationSessionPayload | ContractError;

interface IdMaps {
  student: string;
  experiment: string;
}

interface CompassSessionRecord {
  id: string;
  studentMapping: IdMaps;
  external_student_id: string;
  assessment_id: string;
  askwise_experiment_id: string;
  subject_focus: string;
  learning_bottleneck: string;
  priority_issue: string;
  recommended_learning_goal: string;
  sourceContext: Pick<
    CompassInputPayload,
    "family_id" | "education_system" | "grade_level" | "source_version" | "created_at"
  >;
  status: "in_progress" | "solved" | "unsolved";
  hint_level_max: number;
  hint_count: number;
  retry_count: number;
  independent_solve_status: IntegrationSessionPayload["independent_solve_status"];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  source_system: "askwise";
  source_version: string;
  integration_version: string;
  learning_evidence_id: string | null;
}

const sessionsById = new Map<string, CompassSessionRecord>();
const sessionsByIdempotency = new Map<string, string>();
const externalStudentMap = new Map<string, string>();
const externalAssessmentMap = new Map<string, string>();

let sessionSeq = 1;
let evidenceSeq = 1;

function buildTraceId() {
  return createHash("sha1")
    .update(`${Date.now()}-${Math.random()}-${Math.random()}`)
    .digest("hex");
}

function buildIdempotencyKey(input: CompassInputPayload) {
  const integrationVersion = normalizeIntegrationVersion(input.integration_version);
  return createHash("sha1").update(
    `${input.assessment_id}::${input.student_id}::${input.subject_focus}::${integrationVersion}`,
  ).digest("hex");
}

function normalizeIntegrationVersion(version?: string) {
  return version && version.trim() ? version.trim() : SUPPORTED_INTEGRATION_VERSION;
}

function normalizeRequired(value?: string) {
  return value?.trim();
}

function isValidEducationSystem(value?: string) {
  if (!value) {
    return true;
  }
  return EDUCATION_SYSTEMS.has(value);
}

function deriveSubject(subjectFocus: string): "Politics" | "Mathematics" {
  const normalized = subjectFocus.toLowerCase();
  const mathHints = ["line", "intersect", "ellipse", "vieta", "方程", "解", "代入"];
  if (mathHints.some((token) => normalized.includes(token))) {
    return "Mathematics";
  }
  return "Politics";
}

function defaultDiagnosis(subject: "Politics" | "Mathematics") {
  return subject === "Mathematics" ? "K1" : "P1";
}

function newSessionId() {
  return `sess_${sessionSeq.toString(10).padStart(4, "0")}`;
}

function newLearningEvidenceId() {
  const value = `evi_${evidenceSeq.toString(10).padStart(6, "0")}`;
  evidenceSeq += 1;
  return value;
}

function buildError(
  code: ContractErrorCode,
  message: string,
  traceId: string,
  key: string,
  version: string,
  missingMappingField?: "student_id" | "assessment_id",
): ContractError {
  return {
    status: "error",
    error_code: code,
    error_message: message,
    trace_id: traceId,
    idempotency_key: key,
    attempted_at: new Date().toISOString(),
    integration_version: version,
    missing_mapping_field: missingMappingField,
  };
}

function mapIds(input: CompassInputPayload): IdMaps {
  const askwiseStudentId = externalStudentMap.get(input.student_id);
  if (!askwiseStudentId) {
    throw new Error("student_mapping_missing");
  }

  const askwiseExperimentId = externalAssessmentMap.get(input.assessment_id);
  if (!askwiseExperimentId) {
    throw new Error("assessment_mapping_missing");
  }

  return {
    student: askwiseStudentId,
    experiment: askwiseExperimentId,
  };
}

export function registerStudentMapping(input: {
  external_student_id: string;
  askwise_student_id: string;
}): void {
  externalStudentMap.set(input.external_student_id, input.askwise_student_id);
}

export function registerAssessmentMapping(input: {
  external_assessment_id: string;
  askwise_experiment_id: string;
}): void {
  externalAssessmentMap.set(input.external_assessment_id, input.askwise_experiment_id);
}

export function registerIdMappings(input: {
  student_id: string;
  askwise_student_id: string;
  assessment_id: string;
  askwise_experiment_id: string;
}) {
  registerStudentMapping({
    external_student_id: input.student_id,
    askwise_student_id: input.askwise_student_id,
  });
  registerAssessmentMapping({
    external_assessment_id: input.assessment_id,
    askwise_experiment_id: input.askwise_experiment_id,
  });
}

export function clearMockAdapterState(): void {
  sessionsById.clear();
  sessionsByIdempotency.clear();
  externalStudentMap.clear();
  externalAssessmentMap.clear();
  sessionSeq = 1;
  evidenceSeq = 1;
}

export function startCompassSession(input: CompassInputPayload): AdapterResult {
  const integrationVersion = normalizeIntegrationVersion(input.integration_version);
  const hasExplicitVersion =
    typeof input.integration_version === "string" && input.integration_version.trim().length > 0;
  const preparedInput: CompassInputPayload = {
    ...input,
    integration_version: integrationVersion,
    student_id: normalizeRequired(input.student_id) ?? "",
    assessment_id: normalizeRequired(input.assessment_id) ?? "",
    subject_focus: normalizeRequired(input.subject_focus) ?? "",
    learning_bottleneck: normalizeRequired(input.learning_bottleneck) ?? "",
    priority_issue: normalizeRequired(input.priority_issue) ?? "",
    recommended_learning_goal: normalizeRequired(input.recommended_learning_goal) ?? "",
  };
  const idempotencyKey = buildIdempotencyKey(preparedInput);
  const traceId = buildTraceId();

  if (
    !preparedInput.student_id ||
    !preparedInput.assessment_id ||
    !preparedInput.subject_focus ||
    !preparedInput.learning_bottleneck ||
    !preparedInput.priority_issue ||
    !preparedInput.recommended_learning_goal
  ) {
    return buildError(
      "EC_INCOMPLETE_INPUT",
      "Missing required fields: student_id, assessment_id, subject_focus, learning_bottleneck, priority_issue, recommended_learning_goal.",
      traceId,
      idempotencyKey,
      integrationVersion,
    );
  }

  if (!isValidEducationSystem(preparedInput.education_system)) {
    return buildError(
      "EC_INVALID_FORMAT",
      "education_system must be one of GAOKAO, DSE, IGCSE, A_LEVEL, AP_US, other.",
      traceId,
      idempotencyKey,
      integrationVersion,
    );
  }

  if (hasExplicitVersion && integrationVersion !== SUPPORTED_INTEGRATION_VERSION) {
    return buildError(
      "EC_VERSION_MISMATCH",
      `Unsupported integration_version ${integrationVersion}. Supported: ${SUPPORTED_INTEGRATION_VERSION}`,
      traceId,
      idempotencyKey,
      integrationVersion,
    );
  }

  let mapping: IdMaps;
  try {
    mapping = mapIds(preparedInput);
  } catch (error) {
    const message = (error as Error).message;
    if (message === "student_mapping_missing") {
      return buildError(
        "EC_IDMAP_MISSING",
        "student_id not found in adapter mapping table.",
        traceId,
        idempotencyKey,
        integrationVersion,
        "student_id",
      );
    }
    if (message === "assessment_mapping_missing") {
      return buildError(
        "EC_IDMAP_MISSING",
        "assessment_id not found in adapter mapping table.",
        traceId,
        idempotencyKey,
        integrationVersion,
        "assessment_id",
      );
    }
    return buildError(
      "EC_INVALID_FORMAT",
      `Invalid payload: ${message}`,
      traceId,
      idempotencyKey,
      integrationVersion,
    );
  }

  const existingSessionId = sessionsByIdempotency.get(idempotencyKey);
  if (existingSessionId) {
    const existing = sessionsById.get(existingSessionId);
    if (!existing) {
      sessionsByIdempotency.delete(idempotencyKey);
    } else {
      return {
        student_id: preparedInput.student_id,
        assessment_id: preparedInput.assessment_id,
        askwise_session_id: existing.id,
        subject: deriveSubject(preparedInput.subject_focus),
        diagnosis_type: defaultDiagnosis(deriveSubject(preparedInput.subject_focus)),
        learning_mode: existing.hint_level_max > 0 ? "Recall" : "Teaching",
        hint_level_max: existing.hint_level_max,
        hint_count: existing.hint_count,
        retry_count: existing.retry_count,
        outcome: existing.status,
        independent_solve_status: existing.independent_solve_status,
        knowledge_map_progress: {
          status: existing.status === "solved" ? "complete" : "in_progress",
          score: existing.status === "solved" ? 100 : 0,
        },
        strategy_map_progress: {
          status: existing.status === "solved" ? "complete" : "in_progress",
          score: existing.status === "solved" ? 100 : 0,
        },
        reflection_completed: false,
        learning_evidence_id: existing.learning_evidence_id,
        started_at: existing.created_at,
        completed_at: existing.completed_at,
        source_system: existing.source_system,
        source_version: existing.source_version,
        integration_version: existing.integration_version,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "existing",
        idempotency_key: idempotencyKey,
      };
    }
  }

  const now = new Date().toISOString();
  const sessionId = newSessionId();
  sessionSeq += 1;

  const record: CompassSessionRecord = {
    id: sessionId,
    studentMapping: mapping,
    external_student_id: preparedInput.student_id,
    assessment_id: preparedInput.assessment_id,
    askwise_experiment_id: mapping.experiment,
    subject_focus: preparedInput.subject_focus,
    learning_bottleneck: preparedInput.learning_bottleneck,
    priority_issue: preparedInput.priority_issue,
    recommended_learning_goal: preparedInput.recommended_learning_goal,
    sourceContext: {
      family_id: preparedInput.family_id,
      education_system: preparedInput.education_system,
      grade_level: preparedInput.grade_level,
      source_version: preparedInput.source_version,
      created_at: preparedInput.created_at,
    },
    status: "in_progress",
    hint_level_max: 0,
    hint_count: 0,
    retry_count: 0,
    independent_solve_status: "not_attempted",
    created_at: now,
    updated_at: now,
    completed_at: null,
    source_system: "askwise",
    source_version: preparedInput.source_version ?? "1.0.0",
    integration_version: integrationVersion,
    learning_evidence_id: newLearningEvidenceId(),
  };

  sessionsById.set(sessionId, record);
  sessionsByIdempotency.set(idempotencyKey, sessionId);

  return {
    student_id: preparedInput.student_id,
    assessment_id: preparedInput.assessment_id,
    askwise_session_id: sessionId,
    subject: deriveSubject(preparedInput.subject_focus),
    diagnosis_type: defaultDiagnosis(deriveSubject(preparedInput.subject_focus)),
    learning_mode: "Teaching",
    hint_level_max: record.hint_level_max,
    hint_count: record.hint_count,
    retry_count: record.retry_count,
    outcome: record.status,
    independent_solve_status: record.independent_solve_status,
    knowledge_map_progress: {
      status: "not_started",
      score: 0,
    },
    strategy_map_progress: {
      status: "not_started",
      score: 0,
    },
    reflection_completed: false,
    learning_evidence_id: record.learning_evidence_id,
    started_at: now,
    completed_at: null,
    source_system: record.source_system,
    source_version: record.source_version,
    integration_version: record.integration_version,
    created_at: now,
    updated_at: now,
    status: "created",
    idempotency_key: idempotencyKey,
  };
}

export function getCompassSession(sessionId: string): IntegrationSessionPayload | ContractError {
  const record = sessionsById.get(sessionId);
  const now = new Date().toISOString();

  if (!record) {
    return {
      status: "error",
      error_code: "EC_SESSION_NOT_FOUND",
      error_message:
        "Session not found for given askwise_session_id or the session cannot be recovered.",
      trace_id: buildTraceId(),
      idempotency_key: "unknown",
      attempted_at: now,
      integration_version: SUPPORTED_INTEGRATION_VERSION,
    };
  }

  return {
    student_id: record.external_student_id,
    assessment_id: record.assessment_id,
    askwise_session_id: record.id,
    subject: deriveSubject(record.subject_focus),
    diagnosis_type: defaultDiagnosis(deriveSubject(record.subject_focus)),
    learning_mode: record.hint_level_max > 0 ? "Recall" : "Teaching",
    hint_level_max: record.hint_level_max,
    hint_count: record.hint_count,
    retry_count: record.retry_count,
    outcome: record.status,
    independent_solve_status: record.independent_solve_status,
    knowledge_map_progress: {
      status: record.status === "solved" ? "complete" : "in_progress",
      score: record.status === "solved" ? 100 : 0,
    },
    strategy_map_progress: {
      status: record.status === "solved" ? "complete" : "in_progress",
      score: record.status === "solved" ? 100 : 0,
    },
    reflection_completed: false,
    learning_evidence_id: record.learning_evidence_id,
    started_at: record.created_at,
    completed_at: record.completed_at,
    source_system: record.source_system,
    source_version: record.source_version,
    integration_version: record.integration_version,
    created_at: record.created_at,
    updated_at: record.updated_at,
    status: "existing",
    idempotency_key: buildIdempotencyKey({
      student_id: record.external_student_id,
      assessment_id: record.assessment_id,
      subject_focus: record.subject_focus,
      learning_bottleneck: record.learning_bottleneck,
      priority_issue: record.priority_issue,
      recommended_learning_goal: record.recommended_learning_goal,
      family_id: record.sourceContext.family_id,
      education_system: record.sourceContext.education_system,
      grade_level: record.sourceContext.grade_level,
      source_version: record.sourceContext.source_version,
      created_at: record.sourceContext.created_at,
      integration_version: record.integration_version,
    }),
  };
}

export const __mockAdapterInternals = {
  sessionsById,
  sessionsByIdempotency,
  externalStudentMap,
  externalAssessmentMap,
  SUPPORTED_INTEGRATION_VERSION,
};
