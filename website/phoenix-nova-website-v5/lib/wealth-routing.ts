/**
 * Routing helpers for the dedicated Wealth host.
 *
 * This module deliberately does not inspect forwarded-host headers. The edge
 * or worker should pass the original request URL here and let the exact URL
 * hostname decide whether Wealth routing applies.
 */

export const WEALTH_ORIGIN = "https://wealth.phoenixnova.com.cn" as const;
export const WEALTH_HOST = new URL(WEALTH_ORIGIN).hostname;

// The production main-site DNS is not verified in this repository. Keep it
// configurable and expose the provenance so callers cannot mistake a default
// for deployment evidence.
const configuredMainOrigin =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_MAIN_ORIGIN?.trim()
    : undefined;
export const MAIN_ORIGIN = configuredMainOrigin || "https://phoenixnova.com.cn";
export const MAIN_ORIGIN_VERIFIED = false as const;

export type WealthRouteResult =
  | { kind: "pass" }
  | { kind: "rewrite"; path: string }
  | { kind: "redirect"; location: string; status: 308 }
  | { kind: "deny"; status: 404 | 403 | 405 }
  | { kind: "robots" }
  | { kind: "sitemap" };

const DENY_PREFIXES = ["/api", "/auth", "/account", "/internal"] as const;
const RESOURCE_PREFIXES = [
  "/_vinext",
  "/assets",
  "/images",
  "/brand",
  "/favicon",
] as const;
const LOCALES = ["zh", "en"] as const;
type Locale = (typeof LOCALES)[number];

const publicPath = (locale: Locale, section: string, slug = ""): string => {
  if (section === "compass") return `/${locale}/compass`;
  if (section === "knowledge" || section === "guides")
    return slug ? `/${locale}/knowledge/${slug}` : `/${locale}/knowledge`;
  if (section === "services" || section === "regions")
    return slug ? `/${locale}/${section}/${slug}` : `/${locale}/${section}`;
  return `/${locale}`;
};

const internalPath = (locale: Locale, section: string, slug = ""): string => {
  if (section === "compass") return `/${locale}/wealth/assessment`;
  if (section === "knowledge")
    return slug
      ? `/${locale}/wealth/guides/${slug}`
      : `/${locale}/wealth/knowledge`;
  if (section === "guides")
    return slug
      ? `/${locale}/wealth/guides/${slug}`
      : `/${locale}/wealth/knowledge`;
  if (section === "services" || section === "regions")
    return slug
      ? `/${locale}/wealth/${section}/${slug}`
      : `/${locale}/wealth/${section}`;
  return `/${locale}/wealth`;
};

const cleanSlug = (value: string): string | null => {
  // Slugs are intentionally opaque identifiers. Reject empty, dotted or
  // multi-segment values so a public route cannot become a path traversal.
  if (!value || value === "." || value === ".." || value.includes("/"))
    return null;
  return value;
};

const absolute = (path: string): string => `${WEALTH_ORIGIN}${path}`;

const redirect = (path: string): WealthRouteResult => ({
  kind: "redirect",
  location: absolute(path),
  status: 308,
});

/** Return the public URL for a Wealth section. */
export function wealthPublicPath(
  locale: string,
  section = "",
  slug = "",
): string {
  if (!LOCALES.includes(locale as Locale))
    throw new Error(`Unsupported Wealth locale: ${locale}`);
  const safeLocale = locale as Locale;
  const safeSlug = slug ? cleanSlug(slug) : "";
  if (slug && !safeSlug) throw new Error(`Invalid Wealth slug: ${slug}`);
  return publicPath(safeLocale, section, safeSlug || "");
}

type Canonical = {
  publicPath: string;
  internalPath: string;
  redirect: boolean;
};

const classify = (path: string): Canonical | null => {
  const segments = path.split("/").filter(Boolean);
  if (path === "/")
    return { publicPath: "/zh", internalPath: "/zh/wealth", redirect: true };
  if (segments.length === 0) return null;
  const locale = segments[0] as Locale;
  if (!LOCALES.includes(locale)) return null;
  if (segments.length === 1)
    return {
      publicPath: `/${locale}`,
      internalPath: `/${locale}/wealth`,
      redirect: false,
    };

  const [, section, slug, extra] = segments;
  if (section !== "wealth" && segments.length > 3) return null;

  if (section === "compass") {
    if (slug) return null;
    return {
      publicPath: publicPath(locale, "compass"),
      internalPath: internalPath(locale, "compass"),
      redirect: false,
    };
  }
  if (section === "knowledge") {
    if (!slug)
      return {
        publicPath: publicPath(locale, "knowledge"),
        internalPath: internalPath(locale, "knowledge"),
        redirect: false,
      };
    const safe = cleanSlug(slug);
    return safe
      ? {
          publicPath: publicPath(locale, "knowledge", safe),
          internalPath: internalPath(locale, "knowledge", safe),
          redirect: false,
        }
      : null;
  }
  if (section === "services" || section === "regions") {
    if (!slug) return null;
    const safe = cleanSlug(slug);
    return safe
      ? {
          publicPath: publicPath(locale, section, safe),
          internalPath: internalPath(locale, section, safe),
          redirect: false,
        }
      : null;
  }

  // Legacy nested Wealth paths are redirected to their public subdomain paths.
  if (section === "wealth") {
    if (!slug)
      return {
        publicPath: `/${locale}`,
        internalPath: `/${locale}/wealth`,
        redirect: true,
      };
    if (slug === "assessment" || slug === "compass")
      return {
        publicPath: publicPath(locale, "compass"),
        internalPath: internalPath(locale, "compass"),
        redirect: true,
      };
    if (slug === "knowledge" || slug === "guides") {
      if (!extra)
        return {
          publicPath: publicPath(locale, "knowledge"),
          internalPath: internalPath(locale, "knowledge"),
          redirect: true,
        };
      if (segments.length !== 4) return null;
      const safeNested = cleanSlug(extra);
      return safeNested
        ? {
            publicPath: publicPath(locale, "knowledge", safeNested),
            internalPath: internalPath(locale, "knowledge", safeNested),
            redirect: true,
          }
        : null;
    }
    if (slug === "services" || slug === "regions") {
      if (!extra || segments.length !== 4) return null;
      const safeNested = cleanSlug(extra);
      return safeNested
        ? {
            publicPath: publicPath(locale, slug, safeNested),
            internalPath: internalPath(locale, slug, safeNested),
            redirect: true,
          }
        : null;
    }
    if (extra) return null;
    const safe = cleanSlug(slug);
    return safe
      ? {
          publicPath: `/${locale}/knowledge/${safe}`,
          internalPath: `/${locale}/wealth/guides/${safe}`,
          redirect: true,
        }
      : null;
  }
  if (segments.length > 3) return null;
  return null;
};

/**
 * Classify one request for the Wealth host. Query strings and fragments are
 * intentionally ignored; canonical redirects never echo client input.
 */
export function routeWealthRequest(input: string): WealthRouteResult {
  let url: URL;
  try {
    url = new URL(input, WEALTH_ORIGIN);
  } catch {
    return { kind: "deny", status: 404 };
  }
  if (url.hostname !== WEALTH_HOST) return { kind: "pass" };
  if (url.protocol !== "https:")
    return redirect(url.pathname === "/" ? "/zh" : url.pathname);

  const path = url.pathname.replace(/\/+/g, "/");
  if (
    RESOURCE_PREFIXES.some((prefix) =>
      prefix === "/favicon"
        ? path.startsWith(prefix)
        : path === prefix || path.startsWith(`${prefix}/`),
    )
  )
    return { kind: "pass" };
  if (path === "/robots.txt") return { kind: "robots" };
  if (path === "/sitemap.xml" || path === "/sitemap-wealth.xml")
    return { kind: "sitemap" };
  if (
    DENY_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  )
    return { kind: "deny", status: 404 };

  const canonical = classify(path);
  if (!canonical) return { kind: "deny", status: 404 };

  // Explicit trailing slashes are canonicalised away. Fragments never reach
  // the server and query strings are intentionally not copied into redirects.
  const hasTrailingSlash = path.length > 1 && path.endsWith("/");
  if (
    url.protocol !== "https:" ||
    canonical.redirect ||
    hasTrailingSlash ||
    path !== canonical.publicPath
  ) {
    return redirect(canonical.publicPath);
  }
  return { kind: "rewrite", path: canonical.internalPath };
}

const xmlEscape = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const unique = (values: readonly string[]): string[] => [
  ...new Set(values.map((value) => value.trim()).filter(Boolean)),
];

const sitemapUrls = (
  services: readonly string[],
  regions: readonly string[],
  guides: readonly string[],
): string[] => {
  const paths = [
    "/zh",
    "/en",
    "/zh/compass",
    "/en/compass",
    "/zh/knowledge",
    "/en/knowledge",
  ];
  for (const slug of unique(services))
    for (const locale of LOCALES)
      paths.push(wealthPublicPath(locale, "services", slug));
  for (const slug of unique(regions))
    for (const locale of LOCALES)
      paths.push(wealthPublicPath(locale, "regions", slug));
  for (const slug of unique(guides))
    for (const locale of LOCALES)
      paths.push(wealthPublicPath(locale, "guides", slug));
  return paths;
};

/** Build a noindex sitemap for the private-review Wealth host. */
export function buildWealthSitemap(
  services: string[],
  regions: string[],
  guides: string[],
): string {
  const urls = sitemapUrls(services, regions, guides);
  const linksFor = (href: string): string => {
    const locale = href.startsWith(`${WEALTH_ORIGIN}/zh`) ? "zh" : "en";
    const alternateZh = href.replace(/\/en(?=\/|$)/, "/zh");
    const alternateEn = href.replace(/\/zh(?=\/|$)/, "/en");
    // Keep locale ordering deterministic for review diffs.
    void locale;
    return [
      `<xhtml:link rel="alternate" hreflang="zh-CN" href="${xmlEscape(alternateZh)}"/>`,
      `<xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(alternateEn)}"/>`,
    ].join("");
  };
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urls.map((path) => {
      const href = `${WEALTH_ORIGIN}${path}`;
      return `<url><loc>${xmlEscape(href)}</loc>${linksFor(href)}</url>`;
    }),
    `</urlset>`,
  ].join("");
}

export const WEALTH_ROBOTS_TXT = [
  "User-agent: *",
  "Disallow: /",
  `Sitemap: ${WEALTH_ORIGIN}/sitemap.xml`,
  "",
].join("\n");
