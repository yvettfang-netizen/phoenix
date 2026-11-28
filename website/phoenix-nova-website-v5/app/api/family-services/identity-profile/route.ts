import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityProfile } from "@/lib/identity-journey-profile";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleIdentityProfile(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}

export const POST = GET;
