export type ProjectionEnv = Record<string, unknown>;
export function familyPreviewEnabled(env: ProjectionEnv, mode: string | undefined): boolean {
  return mode === "development" && env.CANONICAL_FAMILY_PROJECTION_ENABLED === "true";
}
export function sessionFamilyPreviewEnabled(env: ProjectionEnv, mode: string | undefined): boolean {
  return familyPreviewEnabled(env, mode) && env.CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED === "true" &&
    env.CANONICAL_BROKER_SESSION_BRIDGE_ENABLED === "true";
}
export async function handleFamilyProjection(request: Request, env: ProjectionEnv, mode: string | undefined, resource: string): Promise<Response> {
  return handleProjection(request, env, mode, resource, false);
}
export async function handleSessionFamilyProjection(request: Request, env: ProjectionEnv, mode: string | undefined, resource: string): Promise<Response> {
  return handleProjection(request, env, mode, resource, true);
}
async function handleProjection(request: Request, env: ProjectionEnv, mode: string | undefined, resource: string, session: boolean): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
  } });
  if (!(session ? sessionFamilyPreviewEnabled(env, mode) : familyPreviewEnabled(env, mode))) return reply(404, { error: { code: "NOT_FOUND" } });
  const denied = () => reply(403, { error: { code: "FAMILY_SCOPE_REQUIRED" } });
  const unavailable = () => reply(503, { error: { code: "FAMILY_PROJECTION_UNAVAILABLE" } });
  if (request.method !== "GET") return reply(405, { error: { code: "METHOD_NOT_ALLOWED" } });
  const audited = env.CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED === "true";
  const familyId = audited ? /^fam_[a-f0-9]{32}$/ : /^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const studentId = audited ? /^stu_[a-f0-9]{32}$/ : familyId;
  const schemaVersion = audited ? "v2" : "v1";
  const match = resource.match(/^(family|students)(?:\/([a-f0-9-]{36}|stu_[a-f0-9]{32}))?$/);
  if (session && (!match || match[2])) return reply(404, { error: { code: "NOT_FOUND" } });
  if (!match || (match[1] === "family" && match[2]) || (match[2] && !studentId.test(match[2]))) return reply(404, { error: { code: "NOT_FOUND" } });
  const url = new URL(request.url);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.search ||
      (request.headers.get("origin") && request.headers.get("origin") !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site" ||
      ["x-family-id", "x-principal-id", "x-role", "x-channel", "x-source-system"].some(h => request.headers.has(h))) return denied();
  if (session && request.headers.has("authorization")) return denied();
  const cookieName = session ? "phoenix_family_session=" : "phoenix_family_preview=";
  const cookies = (request.headers.get("cookie") ?? "").split(";").map(x => x.trim()).filter(x => x.startsWith(cookieName));
  const token = cookies.length === 1 ? cookies[0].slice(cookieName.length) : "";
  if (session ? !/^[A-Za-z0-9_-]{20,512}$/.test(token) : (token.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))) return denied();
  try {
    const origin = new URL(String((session ? env.CANONICAL_SESSION_API_ORIGIN : env.CANONICAL_FAMILY_API_ORIGIN) ?? ""));
    if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return unavailable();
    const upstream = await fetch(new URL(`/v1/canonical/${session ? "session-projections" : "projections"}/${resource}`, origin), {
      headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" }, redirect: "manual", signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) {
      if ([401,403,404].includes(upstream.status)) return reply(upstream.status, { error: { code: "PROJECTION_ACCESS_DENIED" } });
      return unavailable();
    }
    if (!upstream.headers.get("content-type")?.startsWith("application/json")) return unavailable();
    const reader = upstream.body?.getReader();
    if (!reader) return unavailable();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 120000) { await reader.cancel(); return unavailable(); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const data = JSON.parse(text);
    const validName = (x: unknown) => typeof x === "string" && x.length > 0 && x.length <= 200;
    const student = (x: Record<string, unknown>) => x && Object.keys(x).sort().join(",") === "displayName,studentRef" && typeof x.studentRef === "string" && studentId.test(x.studentRef) && validName(x.displayName);
    if (resource === "family") {
      if (Object.keys(data).sort().join(",") !== "family,schemaVersion" || data.schemaVersion !== `family-summary.${schemaVersion}` ||
          !data.family || Object.keys(data.family).sort().join(",") !== "displayName,familyRef" || typeof data.family.familyRef !== "string" || !familyId.test(data.family.familyRef) || !validName(data.family.displayName)) return unavailable();
    } else if (match[2]) {
      if (Object.keys(data).sort().join(",") !== "item,schemaVersion" || data.schemaVersion !== `student-summary.${schemaVersion}` || !student(data.item) || data.item.studentRef !== match[2]) return unavailable();
    } else if (Object.keys(data).sort().join(",") !== "items,schemaVersion" || data.schemaVersion !== `student-summary.${schemaVersion}` ||
        !Array.isArray(data.items) || data.items.length > 100 || !data.items.every(student) || new Set(data.items.map((x: { studentRef: string }) => x.studentRef)).size !== data.items.length) return unavailable();
    return reply(200, data);
  } catch { return unavailable(); }
}
