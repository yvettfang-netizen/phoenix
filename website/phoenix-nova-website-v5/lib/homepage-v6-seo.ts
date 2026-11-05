import type { Metadata } from "next";

// The Node build supplies its public origin; Sites retains its review origin.
// A deployment target does not change the existing indexing policy.
function homepageOrigin(configured: string | undefined) {
  if (!configured) return "https://phoenix-nova-v5-candidate.yvettfang.chatgpt.site";
  const value = configured.trim();
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value || url.username || url.password) {
    throw new Error("NEXT_PUBLIC_MAIN_ORIGIN must be an HTTPS origin without a path or credentials");
  }
  return value;
}
export const HOME_ORIGIN = homepageOrigin(process.env.NEXT_PUBLIC_MAIN_ORIGIN);
export function homepageMetadata(locale: "zh" | "en"): Metadata {
  const title = locale === "zh" ? "鳳啟環球｜全球家庭成长平台" : "Phoenix Nova™ | Global Family Growth Platform";
  const description = locale === "zh" ? "以教育、身份、财富与健康，陪伴家庭的每一个重要阶段。连接全球资源，让科技更有温度，让家庭成长更有方向。" : "A Global Family Growth Platform for Education, Identity, Wealth and Health. Connecting global resources with thoughtful support at every stage of family life.";
  const url = `${HOME_ORIGIN}/${locale}`;
  return { title: { absolute: title }, description,
    alternates: { canonical: url, languages: { "zh-Hans": `${HOME_ORIGIN}/zh`, en: `${HOME_ORIGIN}/en`, "x-default": `${HOME_ORIGIN}/zh` } },
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title, description, url, siteName: "Phoenix Nova™", type: "website", locale: locale === "zh" ? "zh_CN" : "en_US", alternateLocale: locale === "zh" ? "en_US" : "zh_CN", images: [{ url: `${HOME_ORIGIN}/images/homepage-v6-family.png`, alt: locale === "zh" ? "多代家庭与香港海湾品牌示意" : "Illustrative multigenerational family by Hong Kong harbour" }] },
  };
}
export function homepageStructuredData(locale: "zh" | "en") {
  const names = locale === "zh" ? ["教育规划", "身份规划", "财富规划", "健康与医疗协调"] : ["Education planning", "Identity planning", "Wealth planning", "Health coordination"];
  const paths = ["education", "identity", "compass#wealth", "health"];
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${HOME_ORIGIN}/#organization`, name: "Phoenix Nova™｜鳳啟環球", description: "Global Family Growth Platform", url: HOME_ORIGIN, logo: `${HOME_ORIGIN}/brand/official/v3/phoenix-nova-bilingual-b@2x.png`, hasOfferCatalog: { "@type": "OfferCatalog", name: locale === "zh" ? "四大专业领域" : "Four professional domains", itemListElement: names.map((name, i) => ({ "@type": "OfferCatalog", name, url: `${HOME_ORIGIN}/${locale}/${paths[i]}` })) } },
    { "@type": "WebSite", "@id": `${HOME_ORIGIN}/#website`, name: "Phoenix Nova™", url: HOME_ORIGIN, inLanguage: ["zh-Hans", "en"], publisher: { "@id": `${HOME_ORIGIN}/#organization` } },
  ] };
}
