import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { HOME_ORIGIN } from "./homepage-v6-seo";
import { phrase, type Article, type InsightLocale } from "./insights-content";

function insightsOrigin() {
  const configured = (env.PHOENIX_INSIGHTS_ORIGIN ?? process.env.PHOENIX_INSIGHTS_ORIGIN)?.trim();
  if (!configured) return HOME_ORIGIN;

  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.href === `${url.origin}/` ? url.origin : HOME_ORIGIN;
  } catch {
    return HOME_ORIGIN;
  }
}

export function insightsUrl(locale: InsightLocale, path = "") {
  return `${insightsOrigin()}/${locale}/insights${path}`;
}

export function insightsMetadata(locale: InsightLocale, path: string, title: string, description: string, image = "/images/identity-v3/identity-hong-kong.png"): Metadata {
  const chinese = insightsUrl("zh", path);
  const english = insightsUrl("en", path);
  const url = locale === "zh" ? chinese : english;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { "zh-Hans": chinese, en: english, "x-default": chinese },
    },
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description,
      url,
      siteName: "Phoenix Insights™",
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      alternateLocale: locale === "zh" ? "en_US" : "zh_CN",
      images: [{ url: new URL(image, url).href, alt: title }],
    },
  };
}

export function articleBreadcrumb(locale: InsightLocale, article: Article) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: locale === "zh" ? "凤启洞察" : "Phoenix Insights", item: insightsUrl(locale) },
    { "@type": "ListItem", position: 2, name: phrase(locale, article.title), item: insightsUrl(locale, `/articles/${article.slug}`) },
  ] };
}
export function safeJsonLd(data: unknown) { return JSON.stringify(data).replace(/</g, "\\u003c"); }
