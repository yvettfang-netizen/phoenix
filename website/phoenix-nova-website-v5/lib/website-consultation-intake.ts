import { websitePrivacyPolicy } from "./website-privacy-policy.mjs";

type Bindings = Record<string, unknown>;

const maxBodyBytes = 2048;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const services = new Set(["education", "identity", "wealth", "health"]);

function reply(status: number, body: object) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function readBounded(body: ReadableStream<Uint8Array> | null) {
  if (!body) throw new Error("missing body");
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let data = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return data + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        void reader.cancel().catch(() => undefined);
        throw new Error("body too large");
      }
      data += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

function receiverConfig(env: Bindings) {
  if (env.WEBSITE_CONSULTATION_ENABLED !== "true") return null;
  try {
    const origin = new URL(String(env.WEBSITE_CONSULTATION_PUBLIC_ORIGIN ?? ""));
    const endpoint = new URL(String(env.WEBSITE_CONSULTATION_RECEIVER_URL ?? ""));
    const token = env.WEBSITE_CONSULTATION_RECEIVER_TOKEN;
    const privacyZh = new URL(String(env.WEBSITE_CONSULTATION_PRIVACY_ZH_URL ?? ""));
    const privacyEn = new URL(String(env.WEBSITE_CONSULTATION_PRIVACY_EN_URL ?? ""));
    if (origin.protocol !== "https:" || env.WEBSITE_CONSULTATION_PUBLIC_ORIGIN !== origin.origin ||
        endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
        endpoint.search || endpoint.hash || endpoint.origin === origin.origin ||
        !websitePrivacyPolicy(env) ||
        [privacyZh, privacyEn].some(policy => policy.origin !== origin.origin ||
          policy.username || policy.password || policy.search || policy.hash ||
          !policy.pathname.startsWith(policy === privacyZh ? "/zh/" : "/en/") ||
          /\/(?:consultation|api)(?:\/|$)/.test(policy.pathname)) ||
        typeof token !== "string" || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) return null;
    return { origin: origin.origin, endpoint, token, policy: { zh: privacyZh.href, en: privacyEn.href } };
  } catch {
    return null;
  }
}

export function websiteConsultationPrivacyUrl(env: Bindings, locale: "zh" | "en") {
  return receiverConfig(env)?.policy[locale] ?? null;
}

/** The intake service owns durable persistence, deduplication and shared abuse limits. */
export async function handleWebsiteConsultation(request: Request, env: Bindings, send = fetch) {
  const unavailable = () => reply(503, { code: "CONSULTATION_UNAVAILABLE" });
  const config = receiverConfig(env);
  if (!config) return unavailable();
  const { origin, endpoint, token } = config;
  if (new URL(request.url).origin !== origin || request.headers.get("origin") !== origin) {
    return reply(403, { code: "ORIGIN_NOT_ALLOWED" });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply(415, { code: "JSON_REQUIRED" });
  }
  let input;
  try {
    input = JSON.parse(await readBounded(request.body));
  } catch {
    return reply(400, { code: "INVALID_CONSULTATION" });
  }
  if (!input || typeof input !== "object" ||
      Object.keys(input).sort().join(",") !== "consent,email,locale,requestId,service" ||
      input.consent !== true || !["zh", "en"].includes(input.locale) || !services.has(input.service) ||
      typeof input.requestId !== "string" || !uuid.test(input.requestId) ||
      typeof input.email !== "string" || input.email.length > 254 ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.email.trim())) {
    return reply(400, { code: "INVALID_CONSULTATION" });
  }
  try {
    const result = await send(endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.requestId,
      },
      body: JSON.stringify({
        schemaVersion: "website-consultation.v1",
        source: "phoenix-nova-website",
        consentVersion: "website-consultation.v1",
        requestId: input.requestId,
        locale: input.locale,
        service: input.service,
        email: input.email.trim(),
      }),
    });
    if (result.status === 429) return reply(429, { code: "CONSULTATION_RATE_LIMITED" });
    if (result.status === 409) return reply(409, { code: "CONSULTATION_REFERENCE_CONFLICT" });
    if (!result.ok || !result.headers.get("content-type")?.startsWith("application/json")) return unavailable();
    const receipt = JSON.parse(await readBounded(result.body));
    if (receipt?.status !== "persisted" || receipt.requestId !== input.requestId) return unavailable();
    return reply(202, { requestId: input.requestId, status: "received" });
  } catch {
    return unavailable();
  }
}
