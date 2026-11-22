import { env } from "cloudflare:workers";
import { websiteSitemap } from "@/lib/website-crawl-policy";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return websiteSitemap(request, (env as Record<string, unknown>).WEBSITE_HOMEPAGE_INDEX_APPROVED);
}
