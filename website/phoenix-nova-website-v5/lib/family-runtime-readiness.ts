import {validAuthOrigin} from "./customer-auth";
import {customerBridgeEnabled} from "./customer-canonical-bridge";
import {workbenchEnabled} from "./service-workbench-bff";

type RuntimeEnvironment=Record<string,unknown>;
export type FamilyRuntimeReadiness={
  scope:"SYNTHETIC_PRIVATE_NONPRODUCTION_ONLY";
  status:"HOLD"|"CONFIG_COMPLETE_NEEDS_LIVE_EVIDENCE";
  blockers:string[];
};

/**
 * Server-side, nonsecret preflight only. A function-shaped provider does not
 * prove real issuer/session revocation, consent, RLS or an authorized customer.
 * NEVER use this as a production feature flag or as a live-readiness verdict.
 */
export function inspectPrivateFamilyRuntime(
  env:RuntimeEnvironment,mode:string|undefined,expectedOrigin:string
):FamilyRuntimeReadiness{
  const blockers:string[]=[];
  if(mode!=="development")blockers.push("PRIVATE_DEVELOPMENT_MODE_REQUIRED");
  if(env.FAMILY_CENTER_V2_ENABLED!=="true")blockers.push("FAMILY_CENTER_V2_FLAG_CLOSED");
  if(env.CANONICAL_CUSTOMER_AUTH_ENABLED!=="1")blockers.push("CANONICAL_CUSTOMER_AUTH_DISABLED");
  if(env.SERVICE_WORKBENCH_ENABLED!=="true"||!workbenchEnabled(env,mode))
    blockers.push("SERVICE_WORKBENCH_CLOSED");
  if(env.CUSTOMER_CANONICAL_BRIDGE_ENABLED!=="true"||!customerBridgeEnabled(env,mode))
    blockers.push("CUSTOMER_BRIDGE_CLOSED");
  const origin=env.CUSTOMER_AUTH_ORIGIN;
  if(typeof origin!=="string"||!validAuthOrigin(origin)||origin!==expectedOrigin)
    blockers.push("TRUSTED_CUSTOMER_ORIGIN_UNVERIFIED");
  // The present preview must never be made reachable on a public host by
  // flipping NODE_ENV=development; a hosted customer launch is another gate.
  try {
    const hostname=new URL(expectedOrigin).hostname;
    if(!["127.0.0.1","localhost","[::1]"].includes(hostname))throw Error("public origin");
  }catch{blockers.push("LOOPBACK_PREVIEW_SITE_ORIGIN_REQUIRED");}
  const auth=env.CANONICAL_CUSTOMER_AUTH_PROVIDER as Record<string,unknown>|undefined;
  if(!auth||typeof auth.verifySession!=="function"||typeof auth.recordAccess!=="function")
    blockers.push("TRUSTED_AUTH_VERIFIER_NOT_BOUND");
  const mapping=env.CUSTOMER_CANONICAL_PROVIDER as Record<string,unknown>|undefined;
  if(!mapping||typeof mapping.resolve!=="function")
    blockers.push("SUBJECT_SCOPED_CUSTOMER_MAPPING_NOT_BOUND");
  // Current BFF only permits a private Node server on the same host.
  // A remote or public service origin does not satisfy the current contract.
  const api=env.SERVICE_WORKBENCH_API_ORIGIN;
  try {
    if(typeof api!=="string")throw Error("missing");
    const u=new URL(api);
    if(u.origin!==api||u.protocol!=="http:"||u.hostname!=="127.0.0.1"||
       !!u.username||!!u.password||u.search||u.hash||u.pathname!=="/")
      throw Error("invalid");
  }catch{blockers.push("PRIVATE_LOOPBACK_BFF_ORIGIN_NOT_BOUND");}
  return {scope:"SYNTHETIC_PRIVATE_NONPRODUCTION_ONLY",
    status:blockers.length?"HOLD":"CONFIG_COMPLETE_NEEDS_LIVE_EVIDENCE",blockers};
}
