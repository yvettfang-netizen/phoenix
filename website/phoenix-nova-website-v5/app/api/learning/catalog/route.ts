import { env } from "cloudflare:workers";
import { handleLearningCatalog } from "@/lib/canonical-learning-catalog";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handleLearningCatalog(request, env as unknown as Record<string, unknown>, process.env.NODE_ENV);
}
