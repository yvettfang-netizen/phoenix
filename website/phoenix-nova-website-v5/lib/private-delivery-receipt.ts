import { createHmac, timingSafeEqual } from "node:crypto";
import { readCustomerSession } from "./customer-auth";
import { privateWorkbenchConfig, privateWorkbenchRequested } from "./private-customer-workbench";

export const DELIVERY_RECEIPT_HEADER = "X-Phoenix-Delivery-Receipt";
const lifetimeMs = 60_000;
const maxBodyBytes = 256;
const receiptPattern = /^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.([1-9][0-9]{0,15})\.([A-Za-z0-9_-]{43})$/;
const auditInsert = "INSERT INTO core_auth_audit (id,actor_user_id,action,created_at) VALUES (?,?,?,?)";

function sign(secret: string, requestId: string, expiresAt: number, origin: string, sessionHash: string) {
  return createHmac("sha256", Buffer.from(secret, "base64url"))
    .update(`phoenix-workbench-delivery-v1\n${requestId}\n${expiresAt}\n${origin}\n${sessionHash}`)
    .digest("base64url");
}

export function createPrivateDeliveryReceipt(secret: string, requestId: string, origin: string,
  session: { token_hash: string; valid_until: number }) {
  const now = Date.now();
  const expiresAt = Math.min(now + lifetimeMs, session.valid_until);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return null;
  return `${requestId}.${expiresAt}.${sign(secret, requestId, expiresAt, origin, session.token_hash)}`;
}

async function readReceipt(request: Request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")
    || Number(request.headers.get("content-length")) > maxBodyBytes || !request.body) return null;
  const reader = request.body.getReader();
  const bytes = new Uint8Array(maxBodyBytes);
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (length + value.byteLength > maxBodyBytes) {
        await reader.cancel();
        return null;
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length)));
    return value && typeof value === "object" && Object.keys(value).join(",") === "receipt"
      && typeof value.receipt === "string" ? receiptPattern.exec(value.receipt) : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export async function handlePrivateDeliveryReceipt(request: Request, env: Record<string, unknown>) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  const reply = (status: number) => new Response(null, { status, headers });
  if (!privateWorkbenchRequested(env)) return reply(404);
  const config = privateWorkbenchConfig(env);
  if (!config) return reply(503);
  if (request.method !== "POST") return reply(405);
  const url = new URL(request.url);
  if (url.origin !== config.auth.origin || url.search || request.headers.get("origin") !== config.auth.origin
    || request.headers.get("sec-fetch-site") !== "same-origin") return reply(403);

  const receipt = await readReceipt(request);
  if (!receipt) return reply(400);
  const [, requestId, deadline, signature] = receipt;
  const expiresAt = Number(deadline);
  const now = Date.now();
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + lifetimeMs) return reply(403);

  try {
    const session = await readCustomerSession(request, config.auth, { touch: false });
    if (!session) return reply(401);
    const expected = sign(config.deliverySecret, requestId, expiresAt, config.auth.origin, session.token_hash);
    if (expiresAt > session.valid_until || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return reply(403);

    const prepared = await config.audit.prepare("SELECT actor_user_id FROM core_auth_audit WHERE id=? AND action=?")
      .bind(`${requestId}:prepared`, "CANONICAL_ACCESS_PREPARED").first<{ actor_user_id: string }>();
    if (prepared?.actor_user_id !== session.id || expiresAt <= Date.now()) return reply(403);

    // The browser acknowledges parsed JSON. The audit records that acknowledgement once.
    const result = await config.audit.prepare(`${auditInsert} ON CONFLICT(id) DO NOTHING`)
      .bind(`${requestId}:delivered`, null, "CANONICAL_ACCESS_DELIVERED", Date.now()).run();
    return reply(result.meta?.changes === 1 || result.meta?.changes === 0 ? 204 : 503);
  } catch { return reply(503); }
}
