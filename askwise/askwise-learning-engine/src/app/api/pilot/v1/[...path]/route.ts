import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { authStorePath } from "@/lib/pilot/paths";
import { login, logout } from "@/lib/pilot/auth-core";
import { requirePilotStudent, SESSION_COOKIE } from "@/lib/pilot/request";
import { createStructuredTask, retryStructuredTask } from "@/lib/pilot/task-service";
import { performOnce } from "@/lib/pilot/idempotency";
import { listPhotos, readPhoto, savePhoto } from "@/lib/pilot/uploads";
import { wechatLogin } from "@/lib/pilot/wechat";
import { mockCompassHandoff, mockCompassWriteback } from "@/lib/pilot/compass-service";
import type { CompassInputPayload } from "@/lib/compass/mock-adapter";
import { deleteStudentData, exportStudentData, getDashboardStats, getEvidenceForTask, getMathMaps, getPilotContext, getPoliticalMaps, getReflections, getSessionByTask, getSessionSnapshot, getTaskById, listLearningEvidence, upsertDailyReflection } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

async function input(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.length;
    if (length > 32768) { await reader.cancel(); throw new Error("INVALID_INPUT"); }
    chunks.push(part.value);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_INPUT");
  return parsed;
}

async function handle(request: Request, context: { params: { path: string[] } }) {
  try {
    const route = context.params.path.join("/");
    const method = request.method;
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) return json({ error: "ORIGIN_REJECTED", retryable: false }, 403);
    }
    if (route === "login" && method === "POST") {
      const body = await input(request);
      const result = login(authStorePath, String(body.account || ""), String(body.password || ""));
      return result ? json(result) : json({ error: "LOGIN_REJECTED", retryable: false }, 401);
    }
    if (route === "wechat-login" && method === "POST") return json(await wechatLogin((await input(request)).code));
    const studentId = requirePilotStudent();
    if (route === "compass/handoff" && method === "POST") {
      const body = await input(request);
      for (const key of ["student_id", "assessment_id", "subject_focus", "learning_bottleneck", "priority_issue", "recommended_learning_goal"]) if (typeof body[key] !== "string") throw new Error("INVALID_INPUT");
      for (const key of ["integration_version", "education_system", "family_id", "source_version", "grade_level", "created_at"]) if (body[key] !== undefined && typeof body[key] !== "string") throw new Error("INVALID_INPUT");
      return json(mockCompassHandoff(body as unknown as CompassInputPayload));
    }
    const compassReturn = /^compass\/writeback\/([A-Za-z0-9_]+)$/.exec(route);
    if (compassReturn && method === "GET") return json(mockCompassWriteback(compassReturn[1]));
    if (route === "logout" && method === "POST") {
      const token = request.headers.get("authorization")?.replace(/^Bearer /, "") || cookies().get(SESSION_COOKIE)?.value || "";
      logout(authStorePath, token);
      return json({ logged_out: true });
    }
    if (route === "today" && method === "GET") {
      const pilot = getPilotContext();
      return json({ ...pilot, tasks: pilot.todayTasks, diagnosis_source: "rules" });
    }
    if (route === "tasks" && method === "POST") return json(createStructuredTask(await input(request)), 201);
    const task = /^tasks\/(\d+)(?:\/(attempts|uploads))?$/.exec(route);
    if (task) {
      const taskId = Number(task[1]);
      getTaskById(taskId);
      if (!task[2] && method === "GET") {
        const session = getSessionByTask(taskId) as { id: number };
        return json({ ...getSessionSnapshot(session.id), evidence: getEvidenceForTask(taskId), photos: listPhotos(studentId).filter(p => p.task_id === taskId), diagnosis_source: "rules" });
      }
      if (task[2] === "attempts" && method === "POST") return json(retryStructuredTask(taskId, await input(request)));
      if (task[2] === "uploads" && method === "POST") {
        const size = Number(request.headers.get("content-length"));
        if (!size || size > 6 * 1024 * 1024) throw new Error("INVALID_UPLOAD");
        const form = await request.formData();
        const file = form.get("photo");
        if (!file || typeof file === "string" || file.size > 5 * 1024 * 1024) throw new Error("INVALID_UPLOAD");
        const bytes = new Uint8Array(await file.arrayBuffer());
        return json(performOnce(studentId, `upload:${taskId}`, String(form.get("request_id") || ""), createHash("sha256").update(bytes).digest("hex"), () => savePhoto(studentId, taskId, bytes)), 201);
      }
    }
    const attachment = /^uploads\/([a-f0-9-]{36})$/.exec(route);
    if (attachment && method === "GET") {
      const photo = readPhoto(studentId, attachment[1]);
      getTaskById(photo.record.task_id);
      return new Response(new Uint8Array(photo.bytes), { headers: { "Content-Type": photo.record.content_type, "Cache-Control": "no-store", "Content-Disposition": "attachment", "X-Content-Type-Options": "nosniff" } });
    }
    if (route === "evidence" && method === "GET") return json(listLearningEvidence());
    if (route === "maps" && method === "GET") return json({ political: getPoliticalMaps(), mathematics: getMathMaps() });
    if (route === "dashboard" && method === "GET") return json(getDashboardStats());
    if (route === "reflection" && method === "GET") return json(getReflections());
    if (route === "reflection" && method === "POST") {
      const body = await input(request);
      const values = [body.q1, body.q2, body.q3];
      if (values.some(v => typeof v !== "string" || !v.trim() || v.length > 5000)) throw new Error("INVALID_INPUT");
      return json(performOnce(studentId, "reflection", String(body.request_id || ""), body, () => {
        upsertDailyReflection({ q1: String(body.q1), q2: String(body.q2), q3: String(body.q3) });
        return { saved: true };
      }));
    }
    if (route === "export" && method === "GET") return json(exportStudentData());
    if (route === "delete" && method === "POST") {
      if ((await input(request)).confirmation !== "DELETE") throw new Error("INVALID_INPUT");
      deleteStudentData(); return json({ deleted: true });
    }
    return json({ error: "NOT_FOUND", retryable: false }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("NEXT_REDIRECT") || message === "AUTH_REQUIRED") return json({ error: "AUTH_REQUIRED", retryable: false }, 401);
    if (message === "Resource unavailable") return json({ error: "RESOURCE_UNAVAILABLE", retryable: false }, 404);
    if (["WECHAT_NOT_CONFIGURED", "WECHAT_UNAVAILABLE", "COMPASS_MOCK_NOT_CONFIGURED"].includes(message)) return json({ error: message, retryable: true }, 503);
    if (message === "WECHAT_MAPPING_MISSING" || message === "WECHAT_LOGIN_REJECTED") return json({ error: message, retryable: false }, 403);
    if (["IDEMPOTENCY_CONFLICT", "REQUEST_PENDING_RECONCILIATION", "Session unavailable"].includes(message)) return json({ error: message, retryable: false }, 409);
    if (["INVALID_INPUT", "INVALID_REQUEST_ID", "INVALID_UPLOAD", "UPLOAD_QUOTA_EXCEEDED"].includes(message) || error instanceof SyntaxError) return json({ error: "INVALID_INPUT", retryable: false }, 400);
    return json({ error: "SERVICE_UNAVAILABLE", retryable: true }, 503);
  }
}
export const GET = handle;
export const POST = handle;
