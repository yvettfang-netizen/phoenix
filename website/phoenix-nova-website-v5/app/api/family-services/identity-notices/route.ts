import { env } from "cloudflare:workers";
import { customerAuthConfig } from "@/db/customer-auth";
import { handleIdentityInbox } from "@/lib/identity-journey-inbox";

export const dynamic = "force-dynamic";
function handle(request: Request) {
  return handleIdentityInbox(request, env as unknown as Record<string, unknown>, customerAuthConfig());
}
export { handle as GET, handle as POST };
