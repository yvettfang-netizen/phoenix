import {validAuthOrigin, type AuthConfig} from "./customer-auth";
export {readCustomerSession, type AuthConfig} from "./customer-auth";

export function familyP1Enabled(values: Record<string, unknown>, mode: string | undefined) {
  return mode === 'development' && values.FAMILY_P1_ENABLED === '1';
}

export function familyP1Auth(values: Record<string, unknown>): AuthConfig | null {
  const provider = values.CANONICAL_CUSTOMER_AUTH_PROVIDER as Partial<AuthConfig> | undefined;
  const origin = values.CUSTOMER_AUTH_ORIGIN;
  if (values.FAMILY_P1_UI_REVIEW === '1' || values.CANONICAL_CUSTOMER_AUTH_ENABLED !== '1' || typeof origin !== 'string' ||
      !validAuthOrigin(origin) || !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname) ||
      typeof provider?.verifySession !== 'function' || typeof provider.recordAccess !== 'function') return null;
  return {origin, verifySession: provider.verifySession.bind(provider), recordAccess: provider.recordAccess.bind(provider)};
}
