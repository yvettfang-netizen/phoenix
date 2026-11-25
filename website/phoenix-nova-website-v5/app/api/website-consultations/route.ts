import { env } from "cloudflare:workers";
import { handleWebsiteConsultation } from "@/lib/website-consultation-intake";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleWebsiteConsultation(request, env as unknown as Record<string, unknown>);
}
