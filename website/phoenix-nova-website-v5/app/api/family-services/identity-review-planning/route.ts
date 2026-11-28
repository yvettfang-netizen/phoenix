import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityReviewPlanning } from "@/lib/identity-journey-review-planning";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleIdentityReviewPlanning(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}

export const GET = POST;
