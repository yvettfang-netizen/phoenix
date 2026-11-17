import type { Metadata } from "next";
import { HOME_ORIGIN } from "./homepage-v6-seo";
import { phrase, type Article, type InsightLocale } from "./insights-content";
export function insightsMetadata(locale: InsightLocale, path: string, title: string, description: string, image = "/images/identity-v3/identity-hong-kong.png"): Metadata {
  const url = `${HOME_ORIGIN}/${locale}/insights${path}`;
  const other = locale === "zh" ? "en" : "zh";
  return { title, description, alternates: { canonical: url, languages: { "zh-Hans": `${HOME_ORIGIN}/zh/insights${path}`, en: `${HOME_ORIGIN}/en/insights${path}`, "x-default": `${HOME_ORIGIN}/zh/insights${path}` } }, robots: { index: false, follow: false, nocache: true }, openGraph: { title, description, url, siteName: "Phoenix Insights™", type: "website", locale: locale === "zh" ? "zh_CN" : "en_US", alternateLocale: other === "zh" ? "zh_CN" : "en_US", images: [{ url: `${HOME_ORIGIN}${image}`, alt: title }] } };
}
export function articleBreadcrumb(locale: InsightLocale, article: Article) {
  const base = `${HOME_ORIGIN}/${locale}/insights`;
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: locale === "zh" ? "凤启洞察" : "Phoenix Insights", item: base },
    { "@type": "ListItem", position: 2, name: phrase(locale, article.title), item: `${base}/articles/${article.slug}` },
  ] };
}
export function safeJsonLd(data: unknown) { return JSON.stringify(data).replace(/</g, "\\u003c"); }
