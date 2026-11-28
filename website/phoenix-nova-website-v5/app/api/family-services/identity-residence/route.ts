import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityResidence } from "@/lib/identity-journey-residence";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleIdentityResidence(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}

export const POST = GET;
