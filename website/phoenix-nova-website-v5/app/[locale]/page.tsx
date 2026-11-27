import type { Metadata } from "next";
import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { notFound } from "next/navigation";
import { HomepageV6 } from "@/components/homepage-v6";
import { homepageMetadata, homepageStructuredData } from "@/lib/homepage-v6-seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return homepageMetadata(locale === "en" ? "en" : "zh", (await headers()).get("x-phoenix-request-origin"),
    (env as Record<string, unknown>).WEBSITE_HOMEPAGE_INDEX_APPROVED);
}

export default async function LocalizedHome({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const origin = (await headers()).get("x-phoenix-request-origin");
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageStructuredData(locale, origin)).replace(/</g, "\\u003c") }} /><HomepageV6 locale={locale} /></>;
}
