import { insightsUrl } from "@/lib/insights-seo";

// No draft or preview content is sent to RSS subscribers.
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return new Response(null, { status: 404 });

  const link = insightsUrl(locale).replaceAll("&", "&amp;");
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Phoenix Insights</title>
    <link>${link}</link>
    <description>Private review; no published articles</description>
  </channel>
</rss>`;
  return new Response(feed, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
