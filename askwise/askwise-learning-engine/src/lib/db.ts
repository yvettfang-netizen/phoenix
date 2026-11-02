import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  sanitizeAdvisorAssessmentForStorage,
  sanitizeAdvisorCaseForStorage,
} from "./advisor/advisor-engine";
import type {
  AdvisorAssessment,
  AdvisorCaseInput,
  StoredAdvisorAssessment,
} from "./advisor/advisor-types";
import { Attempt, DiagnosisType } from "./types";

import { pilotDbPath, authStorePath, privatePath } from "./pilot/paths";
import { requirePilotStudent } from "./pilot/request";
import { revokeStudent } from "./pilot/auth-core";
import { pilotDate } from "./pilot/date";
import { listPhotos, removePrivateStudentFiles } from "./pilot/uploads";

const dbPath = pilotDbPath;
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayDateStr(): string {
  return pilotDate();
}

function ensureSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      total_days INTEGER NOT NULL DEFAULT 13,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      UNIQUE(student_id)
    );

    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      experiment_id INTEGER NOT NULL,
      day INTEGER NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      question TEXT NOT NULL,
      confidence TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'in_progress',
      is_placeholder INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(experiment_id) REFERENCES experiments(id)
    );

    CREATE TABLE IF NOT EXISTS learning_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 0,
      hint_count INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      solved INTEGER NOT NULL DEFAULT 0,
      independent INTEGER NOT NULL DEFAULT 0,
      final_result TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES daily_tasks(id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      attempt_number INTEGER NOT NULL,
      student_response TEXT NOT NULL,
      hint_level INTEGER NOT NULL DEFAULT 0,
      is_correct INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS diagnoses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      diagnosis_type TEXT NOT NULL,
      diagnosis_reason TEXT NOT NULL,
      confidence REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS hints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      hint_level INTEGER NOT NULL,
      content TEXT NOT NULL,
      solved_after_hint INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS learning_evidences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      question TEXT NOT NULL,
      initial_attempt TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      hint_level INTEGER NOT NULL,
      hint_count INTEGER NOT NULL,
      retry_count INTEGER NOT NULL,
      final_result TEXT NOT NULL,
      independence TEXT NOT NULL,
      reflection TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(task_id) REFERENCES daily_tasks(id),
      UNIQUE(task_id)
    );

    CREATE TABLE IF NOT EXISTS political_knowledge_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      core_concept TEXT NOT NULL,
      key_point TEXT NOT NULL,
      connection TEXT NOT NULL,
      trigger_question TEXT NOT NULL,
      my_own_explanation TEXT NOT NULL,
      day INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      UNIQUE(student_id, topic, day)
    );

    CREATE TABLE IF NOT EXISTS math_strategy_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      problem_type TEXT NOT NULL,
      recognition_signal TEXT NOT NULL,
      possible_strategy TEXT NOT NULL,
      why_this_strategy TEXT NOT NULL,
      common_mistake TEXT NOT NULL,
      example TEXT NOT NULL,
      day INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      UNIQUE(student_id, problem_type, day)
    );

    CREATE TABLE IF NOT EXISTS daily_reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      day INTEGER NOT NULL,
      q1 TEXT NOT NULL,
      q2 TEXT NOT NULL,
      q3 TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, day),
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS advisor_cases (
      case_id TEXT PRIMARY KEY,
      sanitized_payload TEXT NOT NULL,
      source_system TEXT NOT NULL,
      source_version TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS advisor_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      input_fingerprint TEXT NOT NULL,
      assessment_status TEXT NOT NULL,
      result_payload TEXT NOT NULL,
      rule_ids TEXT NOT NULL,
      source_system TEXT NOT NULL,
      source_version TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(case_id) REFERENCES advisor_cases(case_id),
      UNIQUE(case_id, input_fingerprint)
    );
  `);
}

ensureSchema();

function currentStudentId(): number {
  const id = requirePilotStudent();
  if (!db.prepare("SELECT id FROM students WHERE id = ?").get(id)) throw new Error("Resource unavailable");
  return id;
}

function assertOwnedTask(taskId: number): void {
  const studentId = currentStudentId();
  if (!Number.isSafeInteger(taskId) || !db.prepare("SELECT id FROM daily_tasks WHERE id = ? AND student_id = ?").get(taskId, studentId)) {
    throw new Error("Resource unavailable");
  }
}

function assertOwnedSession(sessionId: number): void {
  const studentId = currentStudentId();
  if (!Number.isSafeInteger(sessionId) || !db.prepare("SELECT s.id FROM learning_sessions s JOIN daily_tasks t ON t.id=s.task_id WHERE s.id=? AND t.student_id=?").get(sessionId, studentId)) {
    throw new Error("Resource unavailable");
  }
}

function scopedStudent(requested?: number): number {
  const id = currentStudentId();
  if (requested !== undefined && requested !== id) throw new Error("Resource unavailable");
  return id;
}

// Offline operator provisioning only; never exposed as a student action.
export function provisionPilotStudent(label: string): number {
  if (!/^pilot_[a-z0-9_]{1,48}$/.test(label)) throw new Error("Use a pseudonymous pilot label");
  return db.transaction(() => {
    db.prepare("INSERT INTO students(name) VALUES (?) ON CONFLICT(name) DO NOTHING").run(label);
    const { id } = db.prepare("SELECT id FROM students WHERE name=?").get(label) as { id: number };
    db.prepare("INSERT INTO experiments(student_id,start_date,total_days) VALUES (?,?,13) ON CONFLICT(student_id) DO NOTHING").run(id, todayDateStr());
    return id;
  })();
}

function getExperiment(studentId: number) {
  return db
    .prepare("SELECT * FROM experiments WHERE student_id = ?")
    .get(studentId) as
    | {
        id: number;
        student_id: number;
        start_date: string;
        total_days: number;
      }
    | undefined;
}

function getCurrentPilotDay(studentId: number): number {
  const exp = getExperiment(studentId);
  if (!exp) {
    return 1;
  }
  const start = new Date(exp.start_date);
  const today = new Date(todayDateStr());
  const raw = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const bounded = Math.min(exp.total_days, Math.max(1, raw));
  return bounded;
}

export function getPilotContext() {
  const studentId = currentStudentId();
  const exp = getExperiment(studentId);
  if (!exp) throw new Error("Experiment not initialized");
  const day = getCurrentPilotDay(studentId);
  const todayTasks = db
    .prepare(
      `
      SELECT * FROM daily_tasks
      WHERE student_id = ? AND experiment_id = ? AND day = ? ORDER BY is_placeholder ASC, created_at DESC
      `
    )
    .all(studentId, exp.id, day) as {
    id: number;
    subject: string;
    topic: string;
    question: string;
    status: string;
    is_placeholder: number;
  }[];

  const completed = db
    .prepare(
      `
      SELECT COUNT(*) as c
      FROM daily_tasks t
      JOIN learning_sessions s ON s.task_id = t.id
      WHERE t.student_id = ? AND t.experiment_id = ? AND t.day = ? AND s.solved = 1
      `
    )
    .get(studentId, exp.id, day) as { c: number };

  const allToday = db
    .prepare(
      `
      SELECT COUNT(*) as c
      FROM daily_tasks t
      WHERE t.student_id = ? AND t.experiment_id = ? AND t.day = ?
      `
    )
    .get(studentId, exp.id, day) as { c: number };

  const yesterdayDay = Math.max(1, day - 1);
  const yesterday = db
    .prepare(
      `
      SELECT t.subject, t.topic, t.question, s.solved
      FROM daily_tasks t
      LEFT JOIN learning_sessions s ON s.task_id = t.id
      WHERE t.student_id = ? AND t.experiment_id = ? AND t.day = ? ORDER BY t.created_at DESC
      `
    )
    .all(studentId, exp.id, yesterdayDay) as {
    subject: string;
    topic: string;
    question: string;
    solved: number | null;
  }[];

  return {
    studentId,
    experimentId: exp.id,
    day,
    startDate: exp.start_date,
    todayDate: todayDateStr(),
    todayTasks,
    totalTasksToday: allToday.c,
    completedToday: completed.c,
    yesterdayCarryOver: yesterday.filter((item) => item.solved === 0),
  };
}

export function listTodayTasks(studentId?: number) {
  const student = scopedStudent(studentId);
  const exp = getExperiment(student);
  if (!exp) throw new Error("Experiment not found");
  const day = getCurrentPilotDay(student);
  return db
    .prepare(
      `
      SELECT * FROM daily_tasks
      WHERE student_id = ? AND experiment_id = ? AND day = ?
      ORDER BY is_placeholder ASC, created_at DESC
      `
    )
    .all(student, exp.id, day);
}

export function createTask(input: {
  subject: string;
  topic: string;
  question: string;
  confidence: string;
  initialAttempt: string;
  day?: number;
}) {
  const exp = getExperiment(currentStudentId());
  if (!exp) throw new Error("Experiment not found");
  const day = input.day ?? getCurrentPilotDay(currentStudentId());

  const taskInsert = db.prepare(
    `
    INSERT INTO daily_tasks
    (student_id, experiment_id, day, subject, topic, question, confidence, status, is_placeholder)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 0)
    `
  );
  const taskRes = taskInsert.run(
    currentStudentId(),
    exp.id,
    day,
    input.subject,
    input.topic,
    input.question,
    input.confidence
  );
  const taskId = Number(taskRes.lastInsertRowid);

  const sessionRes = db
    .prepare(
      `INSERT INTO learning_sessions(task_id, attempt_number, hint_count, retry_count, solved, independent)
       VALUES (?, 0, 0, 0, 0, 0)`
    )
    .run(taskId);
  const sessionId = Number(sessionRes.lastInsertRowid);

  const attemptText = input.initialAttempt.trim();
  let firstAttempt: Attempt | undefined;
  if (attemptText) {
    firstAttempt = addAttempt(sessionId, attemptText, 0, false);
  }
  return {
    taskId,
    sessionId,
    attemptId: firstAttempt?.attempt_number ?? null,
  };
}

export function getTaskById(taskId: number) {
  assertOwnedTask(taskId);
  return db
    .prepare(
      `
    SELECT t.*, e.id as experiment_id
    FROM daily_tasks t
    JOIN experiments e ON e.id = t.experiment_id
    WHERE t.id = ?
    `
    )
    .get(taskId);
}

export function getSessionByTask(taskId: number) {
  assertOwnedTask(taskId);
  return db
    .prepare(
      `
    SELECT * FROM learning_sessions WHERE task_id = ? ORDER BY updated_at DESC LIMIT 1
    `
    )
    .get(taskId);
}

export function getSessionSnapshot(sessionId: number) {
  assertOwnedSession(sessionId);
  const session = db
    .prepare("SELECT * FROM learning_sessions WHERE id = ?")
    .get(sessionId) as
    | {
        id: number;
        task_id: number;
        attempt_number: number;
        hint_count: number;
        retry_count: number;
        solved: number;
        independent: number;
        final_result: string;
      }
    | undefined;
  if (!session) return null;

  const task = db.prepare("SELECT * FROM daily_tasks WHERE id = ?").get(session.task_id);
  const attempts = db
    .prepare(
      `
      SELECT attempt_number, student_response, hint_level, is_correct, timestamp
      FROM attempts WHERE session_id = ? ORDER BY attempt_number ASC
      `
    )
    .all(sessionId) as Attempt[];

  const diagnosis = db
    .prepare(
      `
      SELECT diagnosis_type, diagnosis_reason, confidence
      FROM diagnoses
      WHERE session_id = ?
      ORDER BY id DESC
      LIMIT 1
      `
    )
    .get(sessionId) as
    | { diagnosis_type: DiagnosisType; diagnosis_reason: string; confidence: number }
    | undefined;

  const latestHint = db
    .prepare(
      `
      SELECT hint_level, content FROM hints WHERE session_id = ? ORDER BY id DESC LIMIT 1
      `
    )
    .get(sessionId) as
    | { hint_level: number; content: string }
    | undefined;

  const latestSolved = db
    .prepare(
      `
      SELECT final_result FROM learning_evidences WHERE task_id = ? ORDER BY id DESC LIMIT 1
      `
    )
    .get(session.task_id) as { final_result: string } | undefined;

  return {
    session,
    task,
    attempts,
    diagnosis: diagnosis
      ? {
          type: diagnosis.diagnosis_type,
          reason: diagnosis.diagnosis_reason,
          confidence: diagnosis.confidence,
        }
      : null,
    latestHint,
    latestEvidence: latestSolved ? latestSolved.final_result : null,
  };
}

export function getLatestHintLevel(sessionId: number): number {
  assertOwnedSession(sessionId);
  const row = db
    .prepare(
      `
      SELECT hint_level FROM hints WHERE session_id = ? ORDER BY id DESC LIMIT 1
      `
    )
    .get(sessionId) as { hint_level: number } | undefined;
  return row ? row.hint_level : 0;
}

export function addAttempt(
  sessionId: number,
  studentResponse: string,
  hintLevel: number,
  isCorrect: boolean
) {
  assertOwnedSession(sessionId);
  const session = db
    .prepare("SELECT attempt_number, retry_count FROM learning_sessions WHERE id = ?")
    .get(sessionId) as { attempt_number: number; retry_count: number } | undefined;
  if (!session) throw new Error("Session not found");

  const attemptNumber = session.attempt_number + 1;
  const retryCount = Math.max(0, attemptNumber - 1);
  db.prepare(
    `UPDATE learning_sessions
     SET attempt_number = ?, retry_count = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(attemptNumber, retryCount, sessionId);
  const info = db
    .prepare(
      `
      INSERT INTO attempts(session_id, attempt_number, student_response, hint_level, is_correct)
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(sessionId, attemptNumber, studentResponse, hintLevel, isCorrect ? 1 : 0);

  return {
    attempt_number: attemptNumber,
    student_response: studentResponse,
    hint_level: hintLevel,
    is_correct: isCorrect ? true : false,
    timestamp: new Date().toISOString(),
  };
}

export function saveDiagnosis(
  sessionId: number,
  diagnosisType: DiagnosisType,
  reason: string,
  confidence: number
) {
  assertOwnedSession(sessionId);
  return db
    .prepare(
      `
    INSERT INTO diagnoses(session_id, diagnosis_type, diagnosis_reason, confidence)
    VALUES (?, ?, ?, ?)
    `
    )
    .run(sessionId, diagnosisType, reason, confidence);
}

export function saveHint(sessionId: number, hintLevel: number, content: string, solvedAfterHint = false) {
  assertOwnedSession(sessionId);
  db.prepare(
    `
    INSERT INTO hints(session_id, hint_level, content, solved_after_hint)
    VALUES (?, ?, ?, ?)
    `
  ).run(sessionId, hintLevel, content, solvedAfterHint ? 1 : 0);
  db.prepare(
    `
    UPDATE learning_sessions SET hint_count = hint_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `
  ).run(sessionId);
  return getLatestHintLevel(sessionId);
}

export function closeSession(
  sessionId: number,
  finalResult: string,
  independent: boolean
) {
  assertOwnedSession(sessionId);
  db.prepare(
    `
    UPDATE learning_sessions
    SET solved = 1, independent = ?, final_result = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `
  ).run(independent ? 1 : 0, finalResult, sessionId);
  const session = getSessionById(sessionId);
  if (!session) return null;
  db.prepare("UPDATE daily_tasks SET status = 'solved' WHERE id = ?").run(session.task_id);
  return session;
}

export function getSessionById(sessionId: number) {
  assertOwnedSession(sessionId);
  return db
    .prepare("SELECT * FROM learning_sessions WHERE id = ?")
    .get(sessionId) as
    | {
        id: number;
        task_id: number;
        attempt_number: number;
        hint_count: number;
        retry_count: number;
        independent: number;
        final_result: string;
      }
    | undefined;
}

export function buildEvidenceForSession(sessionId: number, finalResult: string) {
  assertOwnedSession(sessionId);
  const session = getSessionById(sessionId);
  if (!session) throw new Error("Session missing");
  const task = db.prepare("SELECT * FROM daily_tasks WHERE id = ?").get(session.task_id) as
    | { id: number; subject: string; topic: string; question: string; student_id: number }
    | undefined;
  if (!task) throw new Error("Task missing");
  const firstAttempt = db
    .prepare(
      `SELECT student_response FROM attempts WHERE session_id = ? ORDER BY attempt_number ASC LIMIT 1`
    )
    .get(sessionId) as { student_response: string } | undefined;
  const latestDiag = db
    .prepare(
      `SELECT diagnosis_type, diagnosis_reason FROM diagnoses WHERE session_id = ? ORDER BY id DESC LIMIT 1`
    )
    .get(sessionId) as
    | { diagnosis_type: string; diagnosis_reason: string }
    | undefined;
  const latestHint = getLatestHintLevel(sessionId);
  const retryCount = session.retry_count;
  const hintCount = session.hint_count;

  const independence = session.independent === 1 ? "Independent" : "Assisted";

  db.prepare(
    `
    INSERT OR REPLACE INTO learning_evidences
      (student_id, task_id, date, subject, topic, question, initial_attempt, diagnosis, hint_level, hint_count, retry_count, final_result, independence, reflection)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    task.student_id,
    task.id,
    todayDateStr(),
    task.subject,
    task.topic,
    task.question,
    firstAttempt?.student_response || "",
    `${latestDiag?.diagnosis_type || "Solved"}: ${latestDiag?.diagnosis_reason || "Student produced a valid resolution."}`,
    latestHint,
    hintCount,
    retryCount,
    finalResult,
    independence,
    ""
  );
}

export function listLearningEvidence() {
  return db
    .prepare(
      `
    SELECT * FROM learning_evidences WHERE student_id = ? ORDER BY created_at DESC LIMIT 100
    `
    )
    .all(currentStudentId());
}

export function getDashboardStats() {
  const studentId = currentStudentId();
  const exp = getExperiment(studentId);
  if (!exp) return null;
  const day = getCurrentPilotDay(studentId);
  const total = db
    .prepare(
      `
    SELECT COUNT(*) as c
    FROM daily_tasks t
    WHERE t.student_id = ? AND t.day <= ?
    `
    )
    .get(studentId, day) as { c: number };
  const solved = db
    .prepare(
      `
    SELECT COUNT(*) as c
    FROM daily_tasks t
    JOIN learning_sessions s ON s.task_id = t.id
    WHERE t.student_id = ? AND t.day <= ? AND s.solved = 1
    `
    )
    .get(studentId, day) as { c: number };
  const hints = db
    .prepare(
      `SELECT AVG(h.hint_level) as avgHint FROM hints h
       JOIN learning_sessions s ON s.id=h.session_id
       JOIN daily_tasks t ON t.id=s.task_id
       WHERE t.student_id=? AND t.day<=?`
    )
    .get(studentId, day) as { avgHint: number | null };
  const topDiag = db
    .prepare(
      `
    SELECT d.diagnosis_type as type, COUNT(*) as c
    FROM diagnoses d
    JOIN learning_sessions s ON s.id = d.session_id
    JOIN daily_tasks t ON t.id = s.task_id
    WHERE t.student_id = ? AND d.diagnosis_type <> 'Solved'
    GROUP BY d.diagnosis_type
    ORDER BY c DESC LIMIT 1
    `
    )
    .get(studentId) as { type: string; c: number } | undefined;

  const reflections = db
    .prepare(
      `SELECT COUNT(*) as c FROM daily_reflections WHERE student_id = ? AND day <= ?`
    )
    .get(studentId, day) as { c: number };

  return {
    tasksCompleted: solved.c,
    totalTasks: total.c,
    independentRate:
      total.c > 0
        ? `${Math.round(((db.prepare("SELECT COUNT(*) c FROM learning_sessions s JOIN daily_tasks t ON t.id=s.task_id WHERE t.student_id=? AND t.day<=? AND s.solved=1 AND s.independent=1").get(studentId, day) as { c: number }).c / total.c) * 100)}%`
        : "0%",
    avgHintLevel: hints.avgHint ? Number(hints.avgHint.toFixed(2)) : 0,
    mostCommonDiagnosis: topDiag?.type || "No data",
    hintDependencyDownTrend: "Pending review",
    reflectionCompletion: `${reflections.c}/${day} days`,
    day,
  };
}

export function upsertPoliticalMap(input: {
  topic: string;
  coreConcept: string;
  keyPoint: string;
  connection: string;
  triggerQuestion: string;
  myOwnExplanation: string;
}) {
  const exp = getExperiment(currentStudentId());
  if (!exp) throw new Error("Experiment not found");
  const day = getCurrentPilotDay(currentStudentId());
  db.prepare(
    `
    INSERT INTO political_knowledge_map
      (student_id, topic, core_concept, key_point, connection, trigger_question, my_own_explanation, day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, topic, day) DO UPDATE SET
      core_concept = excluded.core_concept,
      key_point = excluded.key_point,
      connection = excluded.connection,
      trigger_question = excluded.trigger_question,
      my_own_explanation = excluded.my_own_explanation,
      created_at = CURRENT_TIMESTAMP
    `
  ).run(
    currentStudentId(),
    input.topic,
    input.coreConcept,
    input.keyPoint,
    input.connection,
    input.triggerQuestion,
    input.myOwnExplanation,
    day
  );
}

export function upsertMathMap(input: {
  problemType: string;
  recognitionSignal: string;
  possibleStrategy: string;
  whyThisStrategy: string;
  commonMistake: string;
  example: string;
}) {
  const day = getCurrentPilotDay(currentStudentId());
  db.prepare(
    `
    INSERT INTO math_strategy_map
      (student_id, problem_type, recognition_signal, possible_strategy, why_this_strategy, common_mistake, example, day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, problem_type, day) DO UPDATE SET
      recognition_signal = excluded.recognition_signal,
      possible_strategy = excluded.possible_strategy,
      why_this_strategy = excluded.why_this_strategy,
      common_mistake = excluded.common_mistake,
      example = excluded.example,
      created_at = CURRENT_TIMESTAMP
    `
  ).run(
    currentStudentId(),
    input.problemType,
    input.recognitionSignal,
    input.possibleStrategy,
    input.whyThisStrategy,
    input.commonMistake,
    input.example,
    day
  );
}

export function upsertDailyReflection(input: { q1: string; q2: string; q3: string }) {
  currentStudentId();
  if ([input.q1, input.q2, input.q3].some(value => typeof value !== "string" || !value.trim() || value.length > 5000)) throw new Error("INVALID_INPUT");
  const day = getCurrentPilotDay(currentStudentId());
  db.prepare(
    `
    INSERT INTO daily_reflections(student_id, day, q1, q2, q3)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(student_id, day) DO UPDATE SET
      q1 = excluded.q1,
      q2 = excluded.q2,
      q3 = excluded.q3,
      created_at = CURRENT_TIMESTAMP
    `
  ).run(currentStudentId(), day, input.q1, input.q2, input.q3);
}

type AdvisorAssessmentRow = {
  id: number;
  case_id: string;
  input_fingerprint: string;
  assessment_status: string;
  sanitized_payload: string;
  result_payload: string;
  created_at: string;
  updated_at: string;
};

function toStoredAdvisorAssessment(row: AdvisorAssessmentRow): StoredAdvisorAssessment {
  return {
    id: row.id,
    caseId: row.case_id,
    inputFingerprint: row.input_fingerprint,
    status: row.assessment_status as StoredAdvisorAssessment["status"],
    sanitizedCase: JSON.parse(row.sanitized_payload) as AdvisorCaseInput,
    assessment: JSON.parse(row.result_payload) as AdvisorAssessment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function saveAdvisorAssessment(
  input: AdvisorCaseInput,
  assessment: AdvisorAssessment
): StoredAdvisorAssessment {
  if (process.env.NODE_ENV !== "test") throw new Error("Advisor module disabled in student pilot");
  const sanitizedCase = sanitizeAdvisorCaseForStorage(input);
  const sanitizedAssessment = sanitizeAdvisorAssessmentForStorage(assessment);
  const casePayload = JSON.stringify(sanitizedCase);
  const assessmentPayload = JSON.stringify(sanitizedAssessment);
  const ruleIds = sanitizedAssessment.ruleTrace.map((trace) => trace.ruleId).join(",");

  const persist = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO advisor_cases(case_id, sanitized_payload, source_system, source_version)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(case_id) DO UPDATE SET
        sanitized_payload = excluded.sanitized_payload,
        source_system = excluded.source_system,
        source_version = excluded.source_version,
        updated_at = CURRENT_TIMESTAMP
      `
    ).run(
      sanitizedCase.caseId,
      casePayload,
      sanitizedAssessment.sourceSystem,
      sanitizedAssessment.sourceVersion
    );

    db.prepare(
      `
      INSERT INTO advisor_assessments
        (case_id, input_fingerprint, assessment_status, result_payload, rule_ids, source_system, source_version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(case_id, input_fingerprint) DO UPDATE SET
        assessment_status = excluded.assessment_status,
        result_payload = excluded.result_payload,
        rule_ids = excluded.rule_ids,
        source_system = excluded.source_system,
        source_version = excluded.source_version,
        updated_at = CURRENT_TIMESTAMP
      `
    ).run(
      sanitizedCase.caseId,
      sanitizedAssessment.inputFingerprint,
      sanitizedAssessment.status,
      assessmentPayload,
      ruleIds,
      sanitizedAssessment.sourceSystem,
      sanitizedAssessment.sourceVersion
    );

    return db.prepare(
      `
      SELECT a.id, a.case_id, a.input_fingerprint, a.assessment_status,
             c.sanitized_payload, a.result_payload, a.created_at, a.updated_at
      FROM advisor_assessments a
      JOIN advisor_cases c ON c.case_id = a.case_id
      WHERE a.case_id = ? AND a.input_fingerprint = ?
      `
    ).get(sanitizedCase.caseId, sanitizedAssessment.inputFingerprint) as AdvisorAssessmentRow;
  });

  return toStoredAdvisorAssessment(persist());
}

export function getLatestAdvisorAssessment(caseId: string): StoredAdvisorAssessment | null {
  if (process.env.NODE_ENV !== "test") throw new Error("Advisor module disabled in student pilot");
  const row = db.prepare(
    `
    SELECT a.id, a.case_id, a.input_fingerprint, a.assessment_status,
           c.sanitized_payload, a.result_payload, a.created_at, a.updated_at
    FROM advisor_assessments a
    JOIN advisor_cases c ON c.case_id = a.case_id
    WHERE a.case_id = ?
    ORDER BY a.updated_at DESC, a.id DESC
    LIMIT 1
    `
  ).get(caseId) as AdvisorAssessmentRow | undefined;
  return row ? toStoredAdvisorAssessment(row) : null;
}

export function resetAdvisorRecordsForTests(): void {
  if (process.env.NODE_ENV !== "test") throw new Error("Test-only operation");
  db.exec("DELETE FROM advisor_assessments; DELETE FROM advisor_cases;");
}

export function getDailyReflection(day: number) {
  return db
    .prepare(
      "SELECT * FROM daily_reflections WHERE student_id = ? AND day = ?"
    )
    .get(currentStudentId(), day);
}

export function getTodayTaskHistory() {
  const day = getCurrentPilotDay(currentStudentId());
  return db
    .prepare(
      `SELECT t.*, s.solved, s.hint_count, s.retry_count
       FROM daily_tasks t
       LEFT JOIN learning_sessions s ON s.task_id = t.id
       WHERE t.student_id = ? AND t.day = ?
       ORDER BY t.created_at DESC`
    )
    .all(currentStudentId(), day);
}

export function getLatestSessionForTask(taskId: number) {
  return getSessionByTask(taskId);
}

export function getAttemptsForSession(sessionId: number) {
  assertOwnedSession(sessionId);
  return db
    .prepare(
      `
      SELECT attempt_number, student_response, hint_level, is_correct, timestamp
      FROM attempts
      WHERE session_id = ?
      ORDER BY attempt_number ASC
      `
    )
    .all(sessionId);
}

export function getLatestAttempt(sessionId: number) {
  assertOwnedSession(sessionId);
  return db
    .prepare(
      `
      SELECT attempt_number, student_response, hint_level, is_correct, timestamp
      FROM attempts
      WHERE session_id = ?
      ORDER BY attempt_number DESC
      LIMIT 1
      `
    )
    .get(sessionId);
}

export function getPoliticalMaps(studentId?: number, day?: number) {
  const owner = scopedStudent(studentId);
  if (day !== undefined) {
    return db
      .prepare(
        `SELECT * FROM political_knowledge_map WHERE student_id = ? AND day = ? ORDER BY created_at DESC`
      )
      .all(owner, day);
  }
  return db
    .prepare(`SELECT * FROM political_knowledge_map WHERE student_id = ? ORDER BY day DESC, created_at DESC`)
    .all(owner);
}

export function getMathMaps(studentId?: number, day?: number) {
  const owner = scopedStudent(studentId);
  if (day !== undefined) {
    return db
      .prepare(
        `SELECT * FROM math_strategy_map WHERE student_id = ? AND day = ? ORDER BY created_at DESC`
      )
      .all(owner, day);
  }
  return db
    .prepare(`SELECT * FROM math_strategy_map WHERE student_id = ? ORDER BY day DESC, created_at DESC`)
    .all(owner);
}

export function getReflections(studentId?: number, day?: number) {
  const owner = scopedStudent(studentId);
  if (day !== undefined) {
    return db
      .prepare(
        `SELECT * FROM daily_reflections WHERE student_id = ? AND day = ?`
      )
      .get(owner, day);
  }
  return db
    .prepare(`SELECT * FROM daily_reflections WHERE student_id = ? ORDER BY day DESC`)
    .all(owner);
}

export function getEvidenceForTask(taskId: number) {
  assertOwnedTask(taskId);
  return db
    .prepare(`SELECT * FROM learning_evidences WHERE task_id = ?`)
    .get(taskId);
}

export const studentDbReady = true as const;

export function studentTransaction<T>(operation: () => T): T {
  currentStudentId();
  return db.transaction(operation)();
}

export function isProvisionedPilotStudent(id: number): boolean {
  return Number.isSafeInteger(id) && Boolean(db.prepare("SELECT id FROM students WHERE id=?").get(id));
}

export function ownsPilotExperiment(id: number): boolean {
  return Number.isSafeInteger(id) && Boolean(db.prepare("SELECT id FROM experiments WHERE id=? AND student_id=?").get(id, currentStudentId()));
}


export function exportStudentData() {
  const id = currentStudentId();
  const direct = ["students", "experiments", "daily_tasks", "learning_evidences", "political_knowledge_map", "math_strategy_map", "daily_reflections"];
  const records: Record<string, unknown[]> = {};
  for (const table of direct) records[table] = db.prepare("SELECT * FROM " + table + " WHERE " + (table === "students" ? "id" : "student_id") + "=?").all(id);
  records.learning_sessions = db.prepare("SELECT s.* FROM learning_sessions s JOIN daily_tasks t ON t.id=s.task_id WHERE t.student_id=?").all(id);
  for (const table of ["attempts", "diagnoses", "hints"]) records[table] = db.prepare("SELECT r.* FROM " + table + " r JOIN learning_sessions s ON s.id=r.session_id JOIN daily_tasks t ON t.id=s.task_id WHERE t.student_id=?").all(id);
  return { schema_version: "askwise-sqlite-v1", source_system: "askwise_independent_pilot", exported_at: new Date().toISOString(), student_id: id, canonical_student_id: null, records, attachments: listPhotos(id) };
}

export function deleteStudentData(): void {
  const id = currentStudentId();
  // Revoke access first: a failed DB deletion must never leave a deleted account usable.
  revokeStudent(authStorePath, id);
  removePrivateStudentFiles(id);
  db.transaction(() => {
    for (const table of ["attempts", "diagnoses", "hints"]) db.prepare("DELETE FROM " + table + " WHERE session_id IN (SELECT s.id FROM learning_sessions s JOIN daily_tasks t ON t.id=s.task_id WHERE t.student_id=?)").run(id);
    db.prepare("DELETE FROM learning_sessions WHERE task_id IN (SELECT id FROM daily_tasks WHERE student_id=?)").run(id);
    for (const table of ["learning_evidences", "political_knowledge_map", "math_strategy_map", "daily_reflections", "daily_tasks", "experiments"]) db.prepare("DELETE FROM " + table + " WHERE student_id=?").run(id);
    db.prepare("DELETE FROM students WHERE id=?").run(id);
  })();
}

// Offline operator backup, never exposed as an HTTP endpoint.
export async function backupPilotDatabase(destination: string): Promise<void> {
  const target = privatePath(destination);
  if (fs.existsSync(target)) throw new Error("Backup destination already exists");
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  await db.backup(target);
  fs.chmodSync(target, 0o600);
}
