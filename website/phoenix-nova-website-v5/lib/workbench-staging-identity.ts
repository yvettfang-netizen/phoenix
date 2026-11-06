import type { CustomerCanonicalProvider } from "./customer-canonical-bridge";
import { handleServiceWorkbench } from "./service-workbench-bff";
import { privateStagingHeaders, privateWorkbenchOrigin } from "./workbench-private-staging";

const opaqueToken = /^[A-Za-z0-9_-]{32,256}$/;
const staffCookie = "phoenix_staging_staff_session";

function authority(env: Record<string, unknown>) {
  const { WORKBENCH_STAGING_IDENTITY_ORIGIN: origin, WORKBENCH_STAGING_IDENTITY_KEY: key } = env;
  if (!privateWorkbenchOrigin(env) || typeof origin !== "string" ||
      typeof key !== "string" || !opaqueToken.test(key)) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.origin !== origin) return null;
    return { url, key };
  } catch {
    return null;
  }
}

function callAuthority(config: NonNullable<ReturnType<typeof authority>>, body: object) {
  return fetch(new URL("/v1/workbench/session", config.url), {
    method: "POST",
    headers: { Authorization: "Bearer " + config.key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  });
}

async function mapToken(config: NonNullable<ReturnType<typeof authority>>, body: object, channel: "FAMILY" | "ADVISOR") {
  const response = await callAuthority(config, body);
  if ([401, 403, 404].includes(response.status)) return null;
  if (!response.ok) throw new Error("STAGING_IDENTITY_UNAVAILABLE");
  // The authority is a local trusted process. Accept only a small opaque response.
  const reader = response.body?.getReader();
  if (!reader) throw new Error("STAGING_IDENTITY_UNAVAILABLE");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let data = "";
  let size = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        throw new Error("STAGING_IDENTITY_UNAVAILABLE");
      }
      data += decoder.decode(result.value, { stream: true });
    }
    data += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  const value: unknown = JSON.parse(data);
  if (!value || typeof value !== "object" || Object.keys(value).sort().join(",") !== "channel,token" ||
      !("channel" in value) || value.channel !== channel || !("token" in value) ||
      typeof value.token !== "string" || !opaqueToken.test(value.token)) throw new Error("STAGING_IDENTITY_UNAVAILABLE");
  const token = value.token;
  return { token, async assertCurrent() {
    const current = await callAuthority(config, { action: "assert-current", token, channel });
    if (current.status !== 204) {
      await current.body?.cancel();
      throw new Error("STAGING_IDENTITY_UNAVAILABLE");
    }
  } };
}

export function workbenchCustomerProvider(env: Record<string, unknown>): CustomerCanonicalProvider | undefined {
  if (env.SERVICE_WORKBENCH_PRIVATE_STAGING === undefined) {
    return env.CUSTOMER_CANONICAL_PROVIDER as CustomerCanonicalProvider | undefined;
  }
  const config = authority(env);
  if (!config) return undefined;
  return { resolve: identity => mapToken(config, { action: "resolve-customer", ...identity }, "FAMILY") };
}

function staffCookies(request: Request) {
  return (request.headers.get("cookie") ?? "").split(";").map(cookie => cookie.trim());
}

export function hasStagingStaffSession(request: Request, env: Record<string, unknown>) {
  return !!privateWorkbenchOrigin(env) && staffCookies(request).some(cookie => cookie.startsWith(staffCookie + "="));
}

export async function handleStagingStaff(request: Request, env: Record<string, unknown>, resource: string) {
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers: privateStagingHeaders() });
  const url = new URL(request.url);
  if (privateWorkbenchOrigin(env) !== url.origin || ["dev-session", "summary"].includes(resource)) return reply(404, "NOT_FOUND");
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      (request.headers.has("origin") && request.headers.get("origin") !== url.origin) ||
      (request.method === "POST" && request.headers.get("origin") !== url.origin) ||
      ["authorization", "x-customer-id", "x-family-id", "x-project-id", "x-principal-id", "x-role", "x-channel", "x-source-system", "x-phoenix-customer-bridge"].some(name => request.headers.has(name))) {
    return reply(403, "ACCESS_DENIED");
  }
  const cookies = staffCookies(request);
  const staff = cookies.filter(cookie => cookie.startsWith(staffCookie + "="));
  if (staff.length !== 1 || cookies.some(cookie => cookie.startsWith("phoenix-local-session="))) return reply(401, "SIGN_IN_REQUIRED");
  const staffSession = staff[0].slice(staffCookie.length + 1);
  if (!opaqueToken.test(staffSession)) return reply(401, "SIGN_IN_REQUIRED");
  const config = authority(env);
  if (!config) return reply(503, "IDENTITY_BRIDGE_UNAVAILABLE");
  try {
    const mapped = await mapToken(config, { action: "resolve-staff", staffSession }, "ADVISOR");
    if (!mapped) return reply(403, "ACCESS_DENIED");
    await mapped.assertCurrent();
    const response = await handleServiceWorkbench(request, env, "production", resource, mapped.token);
    await mapped.assertCurrent();
    return response;
  } catch {
    return reply(503, "IDENTITY_BRIDGE_UNAVAILABLE");
  }
}
