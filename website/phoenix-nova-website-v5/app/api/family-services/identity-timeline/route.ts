import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityTimeline } from "@/lib/identity-journey-timeline";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handleIdentityTimeline(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}
