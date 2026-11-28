export const identityPrivateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const withheld = ["authorization", "x-customer-id", "x-family-id", "x-principal-id", "x-subject-id", "x-role", "x-purpose"];
const noticeIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isIdentityNoticeId(value: unknown): value is string {
  return typeof value === "string" && noticeIdPattern.test(value);
}

export function isIdentityMemberRef(value: unknown): value is string {
  return typeof value === "string" && /^member_[A-Za-z0-9_-]{24,96}$/.test(value);
}

export async function readIdentityMemberSelection(request: Request): Promise<string | null> {
  const body = await readIdentityRequestBody(request, 160);
  return body && Object.keys(body).length === 1 && isIdentityMemberRef(body.memberRef) ? body.memberRef : null;
}

export function isIdentityCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function sameOriginIdentityRequest(request: Request, path: string) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  return url.pathname === path && !url.search && !withheld.some(header => request.headers.has(header)) &&
    request.headers.get("sec-fetch-site") !== "cross-site" &&
    (request.method === "GET" && origin === null || origin === url.origin);
}

export async function readIdentityRequestBody(request: Request, limit: number): Promise<Record<string, unknown> | null> {
  if (request.headers.get("content-type")?.split(";")[0].toLowerCase() !== "application/json") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "";
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        return null;
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    const input = JSON.parse(body + decoder.decode());
    return input && typeof input === "object" && !Array.isArray(input) ? input : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
