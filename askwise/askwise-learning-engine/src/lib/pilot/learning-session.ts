import { addAttempt, buildEvidenceForSession, closeSession, getAttemptsForSession, getLatestHintLevel, getSessionByTask, getTaskById, saveDiagnosis, saveHint } from "../db";
import { diagnose } from "../engine/diagnosis";
import { buildProfileFromAttempts } from "../engine/learning";
import { chooseLearningMode } from "../engine/learning-mode";
import { buildHint, nextHintLevel } from "../engine/hint-policy";
import type { Subject } from "../engine/engine-types";
import type { Attempt, DiagnosisType } from "../types";

// Orchestration only. All diagnosis, mode and hint rules remain in the existing engine.
export function submitLearningAttempt(taskId: number, response: string) {
  const input = response.trim();
  if (!input || input.length > 10000) throw new Error("Enter a response of 1-10000 characters");
  const task = getTaskById(taskId) as { subject: Subject; topic: string };
  const session = getSessionByTask(taskId) as { id: number; solved: number };
  if (!session || session.solved) throw new Error("Session unavailable");
  const history = getAttemptsForSession(session.id) as Attempt[];
  const profile = buildProfileFromAttempts(task.subject, task.topic, history.map(a => ({ isCorrect: Boolean(a.is_correct) })));
  const diagnosis = diagnose(task.subject, task.topic, input);
  const mode = chooseLearningMode(profile, task.subject, task.topic, diagnosis);
  const currentHint = getLatestHintLevel(session.id);
  const correct = diagnosis.errorType === null;
  addAttempt(session.id, input, currentHint, correct);
  saveDiagnosis(session.id, (diagnosis.errorType ?? "Solved") as DiagnosisType, diagnosis.explanation, 0.8);
  if (correct) {
    const result = currentHint === 0 ? "Solved Independently" : `Solved With Hint ${currentHint}`;
    closeSession(session.id, result, currentHint === 0);
    buildEvidenceForSession(session.id, result);
  } else {
    const level = nextHintLevel(currentHint, false);
    saveHint(session.id, level, buildHint(task.subject, task.topic, level, mode.mode));
  }
  return { sessionId: session.id, diagnosis: diagnosis.errorType, mode: mode.mode, correct };
}
