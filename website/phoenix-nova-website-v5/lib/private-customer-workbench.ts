import { validAuthOrigin, type AuthConfig, type AuthDatabase } from "./customer-auth";
import type { CustomerCanonicalProvider } from "./customer-canonical-bridge";

type Bindings = Record<string, unknown>;
export type PrivateWorkbenchServiceBinding = { fetch(request: Request): Promise<Response> };
type AuditBinding = Pick<AuthDatabase, "prepare">;

function service(value: unknown): value is PrivateWorkbenchServiceBinding {
  return !!value && typeof (value as PrivateWorkbenchServiceBinding).fetch === "function";
}

function database(value: unknown): value is AuditBinding {
  return !!value && typeof (value as AuditBinding).prepare === "function";
}

export function privateWorkbenchRequested(env: Bindings) {
  return env.SERVICE_WORKBENCH_PRIVATE_STAGING === "true";
}

export function privateWorkbenchConfig(env: Bindings) {
  const origin = env.CUSTOMER_AUTH_PRIVATE_ORIGIN;
  const db = env.CUSTOMER_AUTH_PRIVATE_D1;
  const audit = env.PRIVATE_WORKBENCH_AUDIT;
  const authority = env.PRIVATE_WORKBENCH_AUTHORITY;
  const gateway = env.PRIVATE_WORKBENCH_GATEWAY;
  if (!privateWorkbenchRequested(env) || env.SERVICE_WORKBENCH_ENABLED !== "true"
    || env.CUSTOMER_CANONICAL_BRIDGE_ENABLED !== "true" || env.CUSTOMER_AUTH_ENABLED !== "1"
    || typeof origin !== "string" || !origin.startsWith("https://") || !validAuthOrigin(origin)
    || origin === env.CUSTOMER_AUTH_ORIGIN
    || !database(db) || typeof (db as AuthDatabase).batch !== "function"
    || !database(audit) || audit === db || db === env.DB || audit === env.DB
    || !service(authority) || !service(gateway) || authority === gateway) return null;
  const auth: AuthConfig = { db: db as AuthDatabase, origin, registration: false };
  return { auth, audit, authority, gateway };
}

export function privateWorkbenchResource(resource: string) {
  return /^(?:summary|projects|catalogue|projects\/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(resource);
}

const tokenPattern = /^[A-Za-z0-9_-]{32,256}$/;
const customerIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const canonicalIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hashPattern = /^[0-9a-f]{64}$/;
const maxLifetimeMs = 300_000;
export class PrivateWorkbenchAccessDenied extends Error {}

function currentDeadline(value: unknown): value is number {
  const now = Date.now();
  return typeof value === "number" && Number.isSafeInteger(value) && value > now && value <= now + maxLifetimeMs;
}

async function authorityCall(binding: PrivateWorkbenchServiceBinding, action: "resolve" | "inspect", body: object) {
  const response = await binding.fetch(new Request(`https://private-workbench-authority.internal/v1/workbench/customer-session/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  }));
  if (response.status !== 200 || response.redirected) await response.body?.cancel();
  if ([401, 403, 404].includes(response.status)) return null;
  if (response.status !== 200 || response.redirected || !response.body || !/^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "")) {
    throw new Error("Private identity authority unavailable");
  }
  const reader = response.body.getReader();
  const buffer = new Uint8Array(4096);
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (length + value.byteLength > buffer.byteLength) {
        await reader.cancel();
        throw new Error("Private identity response too large");
      }
      buffer.set(value, length);
      length += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length)));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid private identity response");
  return value as Record<string, unknown>;
}

export function privateCustomerProvider(authority: PrivateWorkbenchServiceBinding): CustomerCanonicalProvider {
  return {
    async resolve(identity) {
      if (!customerIdPattern.test(identity.customerId) || !hashPattern.test(identity.sessionHash)) return null;
      const grant = await authorityCall(authority, "resolve", identity);
      if (!grant || Object.keys(grant).sort().join(",") !== "expiresAt,token"
        || typeof grant.token !== "string" || !tokenPattern.test(grant.token) || !currentDeadline(grant.expiresAt)) return null;
      const { token, expiresAt } = grant;
      let scope: string | undefined;
      return {
        token,
        async assertCurrent() {
          const state = await authorityCall(authority, "inspect", { token });
          if (!state || Object.keys(state).sort().join(",") !== "actorPersonId,channel,customerId,expiresAt,familyId,principalId,sessionHash"
            || state.customerId !== identity.customerId || state.sessionHash !== identity.sessionHash
            || state.channel !== "FAMILY" || state.expiresAt !== expiresAt || !currentDeadline(expiresAt)
            || ![state.principalId, state.actorPersonId, state.familyId].every(id => typeof id === "string" && canonicalIdPattern.test(id))) {
            throw new PrivateWorkbenchAccessDenied();
          }
          const currentScope = JSON.stringify([state.principalId, state.actorPersonId, state.familyId]);
          if (scope !== undefined && currentScope !== scope) throw new PrivateWorkbenchAccessDenied();
          scope = currentScope;
        },
      };
    },
  };
}
