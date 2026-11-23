export type SiteLocale = "zh" | "en";
export const localeRouteMap = {
  home: "", education: "/education", identity: "/identity", health: "/health",
  wealth: "/compass#wealth", family: "/account", insights: "/insights", about: "/about",
} as const;

/** Explicit URL locale is authoritative. No cookie or browser-language override. */
export function localizedHref(locale: SiteLocale, path: string): string {
  if (path.startsWith("https://") || path.startsWith("#")) return path;
  const relative = path.replace(/^\/(?:zh|en)(?=\/|#|\?|$)/, "");
  return `/${locale}${relative === "/" ? "" : relative.startsWith("/") || !relative ? relative : `/${relative}`}`;
}

/** Preserve the business path, query and fragment when its translation exists. */
export function resolveLocaleSwitch(path: string, target: SiteLocale): string {
  return localizedHref(target, path);
}

export function getCurrentLocale(path: string): SiteLocale | null {
  const match = path.match(/^\/(zh|en)(?:\/|#|\?|$)/);
  return match ? match[1] as SiteLocale : null;
}

/** Public localized routes share the same document language on server and client. */
export function getDocumentLocale(pathname: string): SiteLocale | null {
  if (pathname === "/zh" || pathname === "/en") return pathname === "/zh" ? "zh" : "en";
  const match = /^\/(zh|en)\/([^/?#]+)(?:\/|$)/.exec(pathname);
  if (!match) return null;
  const localizedSections = new Set([
    "about", "account", "admissions", "application", "compass", "consultation",
    "education", "family-center", "health", "identity", "insights", "lighthouse",
    "my-services", "oriental", "privacy", "services", "wealth",
  ]);
  return localizedSections.has(match[2]) ? match[1] as SiteLocale : null;
}
