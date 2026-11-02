import type { CreatePilotTask, StructuredAnswer } from '../../askwise-learning-engine/src/lib/pilot/api-types';

export type Subject = CreatePilotTask['subject'];
export type Answer = StructuredAnswer;
export const SUBJECT_OPTIONS: readonly Subject[];

export interface Task {
  id: number;
  subject: Subject;
  topic: string;
  question: string;
  answer?: Answer;
  status?: string;
  solved?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface Session {
  id?: number;
  task_id?: number;
  started_at?: string;
  completed_at?: string;
  solved: 0 | 1;
  [key: string]: unknown;
}

export interface SnapshotAttempt {
  attempt_number: number;
  student_response: unknown | string;
  hint_level: number;
  is_correct: boolean;
  timestamp: string;
}

export interface SnapshotDiagnosis {
  type: string;
  reason: string;
  confidence: number;
}

export interface Evidence {
  id: number;
  task_id: number;
  date: string;
  subject: Subject;
  topic: string;
  question: string;
  initial_attempt: unknown;
  diagnosis: unknown;
  hint_level: number;
  hint_count: number;
  retry_count: number;
  final_result: unknown;
  independence: unknown;
  reflection: unknown;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  [key: string]: unknown;
}

export interface CreateTaskResponse {
  taskId: number;
  sessionId: number;
}

export interface TodayResponse {
  tasks: Task[];
  day: number;
}

export interface Photo {
  id: string;
  student_id: number;
  task_id: number;
  content_type: string;
  bytes: number;
  created_at: string;
}

export interface TaskDetailResponse {
  task: Task;
  session: Session | null;
  attempts: SnapshotAttempt[];
  diagnosis: SnapshotDiagnosis | null;
  latestHint: { hint_level: number; content: string } | null;
  latestEvidence: Evidence | string | null;
  photos: Photo[];
}

export interface RetryAttemptResponse {
  sessionId: number;
  diagnosis: string | null;
  mode: string;
  correct: boolean;
}

export interface ProjectedAttempt {
  attemptNumber: number | string;
  studentResponse: unknown;
  studentResponseText: string;
  hintLevel: number | string;
  isCorrect: boolean | null;
  isCorrectLabel: string;
  timestamp: string;
}

export interface ProjectedPhoto {
  id: string;
  studentId: number;
  taskId: number;
  contentType: string;
  bytes: number;
  createdAt: string;
}

export interface ProjectedTaskDetail {
  task: Task | null;
  session: Session | null;
  sessionSolved: number;
  solved: boolean;
  attempts: ProjectedAttempt[];
  diagnosis: SnapshotDiagnosis | null;
  latestHint: { hint_level: number | string; content: string } | null;
  latestEvidence: Evidence | string | null;
  photos: ProjectedPhoto[];
}

export interface DashboardStats {
  [key: string]: unknown;
}

export interface ReflectionEntry {
  id?: number;
  q1?: string;
  q2?: string;
  q3?: string;
  request_id?: string;
  created_at?: string;
  [key: string]: unknown;
}
