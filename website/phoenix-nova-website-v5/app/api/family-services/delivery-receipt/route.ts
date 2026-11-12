import { env } from "cloudflare:workers";
import { handlePrivateDeliveryReceipt } from "@/lib/private-delivery-receipt";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handlePrivateDeliveryReceipt(request, env as unknown as Record<string, unknown>);
}
