import type { Metadata } from "next";

type Locale = "zh" | "en";
// No assumed production hostname. Relative alternates resolve on the actual host.
export function cbiMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  const suffix = path.replace(/^\/(zh|en)/, "");
  return {
    title, description,
    alternates: { canonical: path, languages: { "zh-Hans": `/zh${suffix}`, en: `/en${suffix}` } },
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title, description, type: "website", locale: locale === "zh" ? "zh_CN" : "en_GB" },
  };
}

export function cbiStructuredData(locale: Locale, path: string, title: string, description: string) {
  return {
    "@context": "https://schema.org", "@type": "WebPage",
    name: title, description, url: path, inLanguage: locale === "zh" ? "zh-Hans" : "en",
    publisher: { "@type": "Organization", name: "Phoenix Nova™" },
    breadcrumb: {
      "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "zh" ? "身份规划" : "Identity planning", item: `/${locale}/identity` },
        { "@type": "ListItem", position: 2, name: title, item: path },
      ],
    },
  };
}

export const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
