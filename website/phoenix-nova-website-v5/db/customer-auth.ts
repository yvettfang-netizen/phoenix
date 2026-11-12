import {env} from "cloudflare:workers";
import {validAuthOrigin,type AuthConfig} from "@/lib/customer-auth";
// No D1 data source or fallback. A server-owned Canonical identity verifier
// may be provided only by the trusted hosting composition, never by the client.
export function customerAuthEnabled() {
  return (env as unknown as Record<string,unknown>).CANONICAL_CUSTOMER_AUTH_ENABLED==="1";
}
export function customerAuthConfig():AuthConfig|null {
  const vars=env as unknown as Record<string,unknown>;
  const provider=vars.CANONICAL_CUSTOMER_AUTH_PROVIDER as Partial<AuthConfig>|undefined;
  const origin=vars.CUSTOMER_AUTH_ORIGIN;
  if(!customerAuthEnabled()||typeof origin!=="string"||!validAuthOrigin(origin)||
    !provider||typeof provider.verifySession!=="function"||
    typeof provider.recordAccess!=="function")return null;
  return {origin,verifySession:provider.verifySession.bind(provider),recordAccess:provider.recordAccess.bind(provider)};
}
