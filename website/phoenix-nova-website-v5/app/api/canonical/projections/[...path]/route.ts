import { env } from "cloudflare:workers";
import { handleFamilyProjection } from "@/lib/canonical-family-projection";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleFamilyProjection(request, env as unknown as Record<string, unknown>, process.env.NODE_ENV, path.join("/"));
}
