export type Subject = "Politics" | "Mathematics" | "Math";
export type ConfidenceLevel =
  | "I know how to solve it"
  | "I have an idea"
  | "I am stuck"
  | "I don't understand the question";

export type DiagnosisType =
  | "Knowledge Gap"
  | "Recognition Gap"
  | "Strategy Gap"
  | "Execution Gap"
  | "Solved";

export interface Diagnosis {
  type: DiagnosisType;
  reason: string;
  confidence: number;
}

export interface Hint {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  content: string;
}

export interface Attempt {
  attempt_number: number;
  student_response: string;
  hint_level: number;
  timestamp: string;
  is_correct: boolean;
}

export interface DailyTask {
  id: number;
  student_id: number;
  experiment_id: number;
  day: number;
  subject: string;
  topic: string;
  question: string;
  confidence: string;
  status: "in_progress" | "solved" | "not_solved" | "awaiting";
  is_placeholder: boolean;
  created_at: string;
}

export interface LearningSession {
  id: number;
  task_id: number;
  attempt_number: number;
  hint_count: number;
  retry_count: number;
  solved: boolean;
  independent: boolean;
  final_result: string;
  created_at: string;
  updated_at: string;
}

export interface LearningEvidence {
  id: number;
  date: string;
  subject: string;
  topic: string;
  question: string;
  initial_attempt: string;
  diagnosis: string;
  hint_level: number;
  hint_count: number;
  retry_count: number;
  final_result: string;
  independence: "Independent" | "Assisted";
  reflection: string;
}
