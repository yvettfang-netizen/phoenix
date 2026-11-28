import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityDelegations } from "@/lib/identity-journey-delegations";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleIdentityDelegations(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}
