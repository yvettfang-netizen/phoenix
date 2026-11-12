/** Server-side local synthetic preview only. No customer identity is inferred here. */
export type CatalogEnv = Record<string, unknown>;
export type CatalogItem = { courseRef: string; versionRef: string; courseCode: string; title: string; versionNo: number };
export function catalogPreviewEnabled(env: CatalogEnv, mode: string | undefined): boolean {
  return mode === "development" && env.CANONICAL_LEARNING_CATALOG_ENABLED === "true";
}
function equalSecret(value: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(value) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  let delta = 0;
  for (let i = 0; i < 64; i++) delta |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return delta === 0;
}
export async function handleLearningCatalog(request: Request, env: CatalogEnv, mode: string | undefined): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  } });
  const unavailable = (reason: string) => {
    console.error("catalog_preview_unavailable", reason);
    return reply(503, { error: { code: "CATALOG_UNAVAILABLE" } });
  };
  if (!catalogPreviewEnabled(env, mode)) return reply(404, { error: { code: "NOT_FOUND" } });
  const url = new URL(request.url);
  if (request.method !== "GET") return reply(405, { error: { code: "METHOD_NOT_ALLOWED" } });
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.search ||
      (request.headers.get("origin") && request.headers.get("origin") !== url.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site") return reply(403, { error: { code: "CATALOG_ACCESS_REQUIRED" } });
  const cookies = (request.headers.get("cookie") ?? "").split(";").map(x => x.trim());
  const matches = cookies.filter(x => x.startsWith("phoenix_catalog_preview="));
  const previewToken = String(env.CANONICAL_CATALOG_PREVIEW_TOKEN ?? "");
  if (matches.length !== 1 || !equalSecret(matches[0].slice("phoenix_catalog_preview=".length), previewToken)) {
    return reply(403, { error: { code: "CATALOG_ACCESS_REQUIRED" } });
  }
  try {
    const origin = new URL(String(env.CANONICAL_CATALOG_API_ORIGIN ?? ""));
    const serviceToken = String(env.CANONICAL_CATALOG_SERVICE_TOKEN ?? "");
    if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || origin.username || origin.password ||
        origin.pathname !== "/" || origin.search || origin.hash || !/^[a-f0-9]{64}$/.test(serviceToken) ||
        equalSecret(serviceToken, previewToken)) return unavailable("LOCAL_CONFIG_INVALID");
    const upstream = await fetch(new URL("/v1/learning/catalog", origin), { method: "GET", redirect: "manual",
      headers: { Authorization: `Bearer ${serviceToken}`, "Cache-Control": "no-store" }, signal: AbortSignal.timeout(3500) });
    if (!upstream.ok || !upstream.headers.get("content-type")?.startsWith("application/json")) return unavailable(`UPSTREAM_STATUS_${upstream.status}`);
    const text = await upstream.text();
    if (text.length > 150000) return unavailable("RESPONSE_TOO_LARGE");
    const data = JSON.parse(text);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (Object.keys(data).sort().join(",") !== "items,schemaVersion" || data.schemaVersion !== "learning-catalog.v1" ||
        !Array.isArray(data.items) || data.items.length > 200) return unavailable("ENVELOPE_INVALID");
    for (const item of data.items) {
      if (!item || Object.keys(item).sort().join(",") !== "courseCode,courseRef,title,versionNo,versionRef" ||
          !uuid.test(item.courseRef) || !uuid.test(item.versionRef) || typeof item.courseCode !== "string" ||
          item.courseCode.length > 60 || typeof item.title !== "string" || item.title.length > 300 ||
          !Number.isInteger(item.versionNo) || item.versionNo < 1) return unavailable("ITEM_INVALID");
    }
    return reply(200, data);
  } catch (error) { return unavailable(error instanceof Error ? error.name : "UPSTREAM_FAILURE"); }
}
