import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityConsultation } from "@/lib/identity-journey-consultation";

export const dynamic = "force-dynamic";
export function POST(request: Request) {
  return handleIdentityConsultation(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}
