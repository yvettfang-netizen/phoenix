import { createTask, studentTransaction } from "../db";
import { requirePilotStudent } from "./request";
import { performOnce } from "./idempotency";
import { structuredResponse } from "./api-types";
import { submitLearningAttempt } from "./learning-session";

export function createStructuredTask(input: Record<string, unknown>) {
  const id = requirePilotStudent();
  if (input.subject !== "Mathematics" && input.subject !== "Politics") throw new Error("INVALID_INPUT");
  if (typeof input.topic !== "string" || !input.topic.trim() || input.topic.length > 300 || typeof input.question !== "string" || input.question.length > 5000) throw new Error("INVALID_INPUT");
  const response = structuredResponse(input.answer);
  return performOnce(id, "create-task", String(input.request_id || ""), input, () => studentTransaction(() => {
    const result = createTask({ subject: String(input.subject), topic: String(input.topic), question: String(input.question), confidence: "Self-reported pilot attempt", initialAttempt: "" });
    submitLearningAttempt(result.taskId, response);
    return { taskId: result.taskId, sessionId: result.sessionId };
  }));
}

export function retryStructuredTask(taskId: number, input: Record<string, unknown>) {
  const id = requirePilotStudent();
  const response = structuredResponse(input.answer);
  return performOnce(id, `attempt:${taskId}`, String(input.request_id || ""), input, () => studentTransaction(() => submitLearningAttempt(taskId, response)));
}
