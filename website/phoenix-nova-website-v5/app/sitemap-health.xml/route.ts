import { healthSitemap } from "@/lib/health-geo";
import { HEALTH_GEO_GUIDES } from "@/lib/health-geo-content";
export function GET() {
  // No draft content or private records are submitted for indexing.
  const records = HEALTH_GEO_GUIDES.map(guide=>({paths:{zh:guide.paths.zh.replace('/zh/health/',''),en:guide.paths.en.replace('/en/health/','')},reviewed:false,published:false,substantive:guide.sections.length>0,sourceVerified:false,expiresAt:null,modifiedAt:guide.verifiedAt}));
  const urls = healthSitemap(records, new Date().toISOString());
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(item=>`<url><loc>${item.url}</loc><lastmod>${item.modifiedAt}</lastmod></url>`).join("")}</urlset>`;
  return new Response(body, {headers:{"content-type":"application/xml; charset=utf-8","x-robots-tag":"noindex, nofollow"}});
}
