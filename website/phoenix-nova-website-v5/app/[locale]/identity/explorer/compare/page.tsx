import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CbiComparison } from "@/components/cbi-comparison";
import { CbiPageFrame } from "@/components/cbi-page-frame";
import { cbiMetadata, cbiStructuredData } from "@/lib/cbi-seo";
import { normalizeCbiCountries } from "@/components/cbi-types";
import { getCbiPreviewCountries, getVisibleCbiCountries } from "@/lib/cbi-data";
import { comparisonSelection } from "@/lib/cbi-comparison-engine";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ countries?: string | string[] }> };
export const dynamic = "force-dynamic";

function validLocale(value: string): value is "zh" | "en" {
  return value === "zh" || value === "en";
}

function previewEnabled() {
  return process.env.IDENTITY_CBI_REVIEW_PREVIEW === "1";
}

function querySlugs(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const decoded = values.flatMap((item) => item.split(",")).map((item) => {
    try { return decodeURIComponent(item); } catch { return item; }
  }).filter(Boolean);
  return [...new Set(decoded)];
}

function recordsFor(slugs: string[], preview: boolean) {
  return normalizeCbiCountries(comparisonSelection(preview ? getCbiPreviewCountries() : getVisibleCbiCountries(), slugs, preview));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!validLocale(locale)) return {};
  return cbiMetadata(locale, `/${locale}/identity/explorer/compare`, locale === "zh" ? "投资入籍国家资料比较" : "Citizenship Programme Comparison", locale === "zh" ? "并列查看精选投资入籍资料，不计算排名或指数。" : "Review selected citizenship-by-investment records side by side without ranking or scoring.");
}

export default async function CbiComparisonPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!validLocale(locale)) notFound();
  const preview = previewEnabled();
  const query = await searchParams;
  const countries = recordsFor(querySlugs(query.countries), preview);
  const title = locale === "zh" ? "投资入籍国家资料比较" : "Citizenship Programme Comparison";
  const description = locale === "zh" ? "并列查看精选投资入籍资料，不计算排名或指数。" : "Review selected citizenship-by-investment records side by side without ranking or scoring.";
  return <CbiPageFrame locale={locale} structuredData={cbiStructuredData(locale, `/${locale}/identity/explorer/compare`, title, description)}><CbiComparison locale={locale} countries={countries} preview={preview} /></CbiPageFrame>;
}
