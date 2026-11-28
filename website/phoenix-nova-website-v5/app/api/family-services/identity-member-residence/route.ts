import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityMemberResidence } from "@/lib/identity-journey-member-residence";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleIdentityMemberResidence(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}
