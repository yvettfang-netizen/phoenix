import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityStationConsent } from "@/lib/identity-journey-station-consent";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleIdentityStationConsent(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}
