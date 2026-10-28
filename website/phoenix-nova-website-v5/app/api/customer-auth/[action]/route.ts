import { customerAuthConfig } from "@/db/customer-auth";
import { authUnavailable, handleCustomerAuth } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";
function handler(request: Request) {
  const config = customerAuthConfig();
  return config ? handleCustomerAuth(request, config) : authUnavailable();
}
export const GET = handler;
export const POST = handler;
