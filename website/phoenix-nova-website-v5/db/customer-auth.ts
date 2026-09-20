import { env } from "cloudflare:workers";
import { validAuthOrigin, type AuthConfig, type AuthDatabase } from "@/lib/customer-auth";

export function customerAuthEnabled() {
  return (env as unknown as Record<string,unknown>).CUSTOMER_AUTH_ENABLED === "1";
}
export function customerAuthConfig(): AuthConfig | null {
  const values = env as unknown as Record<string,unknown>;
  if (!customerAuthEnabled() || typeof values.CUSTOMER_AUTH_ORIGIN !== "string" || !validAuthOrigin(values.CUSTOMER_AUTH_ORIGIN) || !values.DB) return null;
  return { db: values.DB as AuthDatabase, origin: values.CUSTOMER_AUTH_ORIGIN,
    registration: values.CUSTOMER_AUTH_REGISTRATION_ENABLED === "1" };
}
