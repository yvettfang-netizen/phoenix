import type { Metadata } from "next";
import { WEALTH_ORIGIN, wealthPublicPath } from "./wealth-routing";
export function wealthMetadata(
  locale: "zh" | "en",
  title: string,
  description: string,
  section = "",
  slug = "",
): Metadata {
  const path = wealthPublicPath(locale, section, slug),
    url = WEALTH_ORIGIN + path;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "zh-CN": WEALTH_ORIGIN + wealthPublicPath("zh", section, slug),
        en: WEALTH_ORIGIN + wealthPublicPath("en", section, slug),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Phoenix Nova™ Wealth Compass",
      type: section === "guides" ? "article" : "website",
      locale: locale === "zh" ? "zh_CN" : "en_GB",
      images: [{ url: WEALTH_ORIGIN + "/images/wealth-v3/family-harbour.png" }],
    },
    robots: { index: false, follow: false, nocache: true },
  };
}
export function wealthJsonLd(
  locale: "zh" | "en",
  title: string,
  section = "",
  slug = "",
) {
  const url = WEALTH_ORIGIN + wealthPublicPath(locale, section, slug);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": section === "guides" ? "Article" : "WebPage",
    name: title,
    ...(section === "guides"
      ? {
          headline: title,
          author: { "@type": "Organization", name: "Phoenix Nova™" },
        }
      : {}),
    url,
    inLanguage: locale === "zh" ? "zh-CN" : "en",
    isPartOf: {
      "@type": "WebSite",
      "@id": WEALTH_ORIGIN + "/#website",
      url: WEALTH_ORIGIN,
      name: "Phoenix Nova™ Wealth Compass",
    },
    publisher: {
      "@type": "Organization",
      name: "Phoenix Nova™",
      url: "https://phoenixnova.com.cn",
    },
  }).replace(/</g, "\\u003c");
}
