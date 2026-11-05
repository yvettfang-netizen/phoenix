// Candidate content is not approved for indexing. Never publish draft URLs.
export function GET() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {headers:{"content-type":"application/xml; charset=utf-8","x-robots-tag":"noindex, nofollow","cache-control":"no-store"}});
}
