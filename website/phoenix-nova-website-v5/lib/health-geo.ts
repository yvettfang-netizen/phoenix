import type { Metadata } from "next";
export type HealthGeoLocale = "zh" | "en";
export type LocalizedHealthText = Record<HealthGeoLocale, string>;
/** Founder supplied hostname; HTTPS/deployment verification remains a release gate. */
export const HEALTH_GEO_ORIGIN = "https://health.phoenixnova.com.cn";
export type HealthRelease = { deploymentVerified: boolean; founderReleaseApproved: boolean; searchAllowed: boolean; trainingAllowed: boolean };
export const HEALTH_PUBLISHING: Readonly<HealthRelease> = Object.freeze({ deploymentVerified: false, founderReleaseApproved: false, searchAllowed: false, trainingAllowed: false });
export const HEALTH_PUBLISHER_ID = `${HEALTH_GEO_ORIGIN}/#phoenix-nova`;
export function healthGeoUrl(locale: HealthGeoLocale, slug = "") {
  if (!/^(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(slug)) throw new Error("Invalid Health content slug");
  return `${HEALTH_GEO_ORIGIN}/${locale}/health${slug ? `/${slug}` : ""}`;
}
export function healthGeoMetadata(locale: HealthGeoLocale, slugs: LocalizedHealthText, titles: LocalizedHealthText, descriptions: LocalizedHealthText): Metadata {
  const url = healthGeoUrl(locale, slugs[locale]);
  return { title: titles[locale], description: descriptions[locale], alternates: { canonical: url, languages: { "zh-Hans": healthGeoUrl("zh", slugs.zh), en: healthGeoUrl("en", slugs.en) } }, robots: { index: false, follow: false }, openGraph: { title: titles[locale], description: descriptions[locale], url, type: "website", locale: locale === "zh" ? "zh_CN" : "en_GB" } };
}
export function healthJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
export type HealthIndexRecord = { paths: LocalizedHealthText; reviewed: boolean; published: boolean; substantive: boolean; sourceVerified: boolean; expiresAt: string | null; modifiedAt: string };
export function healthSitemap(records: readonly HealthIndexRecord[], now: string, release: Readonly<HealthRelease> = HEALTH_PUBLISHING) {
  const current = Date.parse(now);
  if (!Number.isFinite(current) || !release.deploymentVerified || !release.founderReleaseApproved || !release.searchAllowed) return [];
  return records.filter(r => r.reviewed && r.published && r.substantive && r.sourceVerified && Number.isFinite(Date.parse(r.modifiedAt)) && Date.parse(r.modifiedAt) <= current && (r.expiresAt === null || (Number.isFinite(Date.parse(r.expiresAt)) && Date.parse(r.expiresAt) > current)))
    .flatMap(r => (["zh", "en"] as const).map(locale => ({ url: healthGeoUrl(locale, r.paths[locale]), modifiedAt: r.modifiedAt })));
}
export function healthBreadcrumb(locale: HealthGeoLocale, title: string, slug: string) {
  return { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: locale === "zh" ? "全球健康" : "Global Health", item: healthGeoUrl(locale) }, { "@type": "ListItem", position: 2, name: title, item: healthGeoUrl(locale, slug) }] };
}
