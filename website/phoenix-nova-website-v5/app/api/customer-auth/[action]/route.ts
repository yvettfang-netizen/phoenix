import { customerAuthConfig, privateCustomerAuthRequested } from "@/db/customer-auth";
import { authUnavailable, handleCustomerAuth } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";
async function handler(request: Request) {
  const config = customerAuthConfig();
  if (privateCustomerAuthRequested()) {
    const response = config && new URL(request.url).origin === config.origin
      ? await handleCustomerAuth(request, config, { touchSession: false })
      : authUnavailable();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }
  return config ? handleCustomerAuth(request, config) : authUnavailable();
}
export const GET = handler;
export const POST = handler;
