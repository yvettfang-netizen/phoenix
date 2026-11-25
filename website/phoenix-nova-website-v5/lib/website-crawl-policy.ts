import { homepageIndexApproved, PUBLIC_HOME_ORIGIN, RELEASE_HOME_PATHS } from "./homepage-v6-seo";

export function websiteRobots(request: Request, approval: unknown) {
  const open = homepageIndexApproved(new URL(request.url).origin, approval);
  const rules = ["User-agent: *", "Disallow: /"];
  if (open) {
    for (const path of RELEASE_HOME_PATHS) rules.push(`Allow: ${path}$`);
    rules.push(`Sitemap: ${PUBLIC_HOME_ORIGIN}/sitemap.xml`);
  }
  return new Response(rules.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function websiteSitemap(request: Request, approval: unknown) {
  const open = homepageIndexApproved(new URL(request.url).origin, approval);
  const header = '<?xml version="1.0" encoding="UTF-8"?>';
  const ns = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  const xml = open
    ? header + `<urlset ${ns}>` + RELEASE_HOME_PATHS.map(path => `<url><loc>${PUBLIC_HOME_ORIGIN}${path}</loc></url>`).join("") + "</urlset>"
    : header + `<sitemapindex ${ns}></sitemapindex>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
      ...(!open ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    },
  });
}
