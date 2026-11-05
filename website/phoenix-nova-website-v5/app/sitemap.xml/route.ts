// Empty until the domain and each content collection receive release approval.
export function GET() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>', {headers:{"content-type":"application/xml; charset=utf-8","x-robots-tag":"noindex, nofollow","cache-control":"no-store"}});
}
