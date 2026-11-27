import assessment from "../../../Phoenix Compass/education compass/models/free-education-assessment.js";
export type { Answer, Answers, RespondentRole, Snapshot } from "../../../Phoenix Compass/education compass/models/free-education-assessment.js";

export const { assessmentPath, isValidAnswer, reviseAnswer, VERSIONS } = assessment;
const { evaluateFreeAssessment } = assessment;

export function freeAssessmentPreviewEnabled(bindings: Record<string, unknown>) {
  return bindings.EDUCATION_FREE_ASSESSMENT_PREVIEW === "true";
}

const limit = 4096;
const reply = (data: object, status: number) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export async function handleFreeEducationAssessment(request: Request, enabled: boolean) {
  if (!enabled) return reply({ error: "NOT_FOUND" }, 404);
  if (request.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (url.search || (origin && origin !== url.origin)) return reply({ error: "REQUEST_DENIED" }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || !request.body) {
    return reply({ error: "INVALID_FREE_ASSESSMENT" }, 400);
  }
  const reader = request.body.getReader();
  let length = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        return reply({ error: "BODY_TOO_LARGE" }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    // This transport has no database, contact receiver, provider, or analytics dependency.
    return reply(evaluateFreeAssessment(JSON.parse(body)), 200);
  } catch {
    return reply({ error: "INVALID_FREE_ASSESSMENT" }, 400);
  } finally {
    reader.releaseLock();
  }
}
