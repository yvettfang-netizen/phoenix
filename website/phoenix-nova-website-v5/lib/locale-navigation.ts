export type SiteLocale = "zh" | "en";
export const localeRouteMap = {
  home: "", education: "/education", identity: "/identity", health: "/health",
  wealth: "/compass#wealth", family: "/account", insights: "/insights", about: "/about",
} as const;

export function familyCenterEntryPath(publicDemo: boolean) {
  return publicDemo ? "/family-center" : localeRouteMap.family;
}

/** Explicit URL locale is authoritative. No cookie or browser-language override. */
export function localizedHref(locale: SiteLocale, path: string): string {
  if (path.startsWith("https://") || path.startsWith("#")) return path;
  const relative = path.replace(/^\/(?:zh|en)(?=\/|#|\?|$)/, "");
  return `/${locale}${relative === "/" ? "" : relative.startsWith("/") || !relative ? relative : `/${relative}`}`;
}

/** Main-site entry points use the dedicated Education and Identity previews. */
export function publicProductHref(locale: SiteLocale, path: string): string {
  const href = localizedHref(locale, path);
  if (/^\/education(?:[/?#]|$)/.test(path)) return `https://edu.phoenixnova.com.cn${href}`;
  if (/^\/identity(?:[/?#]|$)/.test(path)) return `https://identity.phoenixnova.com.cn${href}`;
  return href;
}

/** Preserve the business path, query and fragment when its translation exists. */
export function resolveLocaleSwitch(path: string, target: SiteLocale): string {
  return localizedHref(target, path);
}

export function homepageDocumentLocale(pathname: string): SiteLocale | null {
  if (pathname === "/en") return "en";
  if (pathname === "/zh") return "zh";
  return null;
}

export function getCurrentLocale(path: string): SiteLocale | null {
  const match = path.match(/^\/(zh|en)(?:\/|#|\?|$)/);
  return match ? match[1] as SiteLocale : null;
}
