export type Subject = "Politics" | "Mathematics" | "Math";

export type ErrorType = string | null;

export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type KnowledgeLabel = "unknown" | "forgotten" | "proficient" | "known";

export interface TaxonomyCode {
  code: string;
  description: string;
}

export interface DiagnosisResult {
  subject: Subject;
  topic: string;
  studentInput: string;
  errorType: ErrorType;
  explanation: string;
  methodSelected: boolean;
  executionError: boolean;
  correctReasoning: boolean;
}

export interface LearningModeDecision {
  mode: LearningMode;
  rationale: string;
}

export type LearningMode =
  | "Teaching Mode"
  | "Recall Mode"
  | "Transfer Mode"
  | "Thinking Mode"
  | "Debug Mode";

export interface SessionLogEntry {
  timestamp: string;
  subject: Subject;
  topic: string;
  studentInput: string;
  diagnosis: string;
  errorType: string;
  learningMode: LearningMode;
  hintLevel: HintLevel;
  firstStepTime: number | null;
  outcome: "correct" | "incorrect";
}

export interface AttemptOutcome {
  attemptNumber: number;
  isCorrect: boolean;
  hintLevel: HintLevel;
  studentResponse: string;
}
