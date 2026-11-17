import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CbiCountryDetail } from "@/components/cbi-country-detail";
import { CbiPageFrame } from "@/components/cbi-page-frame";
import { cbiMetadata, cbiStructuredData } from "@/lib/cbi-seo";
import { normalizeCbiCountry } from "@/components/cbi-types";
import { getCbiCountry, getVisibleCbiCountries } from "@/lib/cbi-data";

type Props = { params: Promise<{ locale: string; slug: string }> };
export const dynamic = "force-dynamic";

function validLocale(value: string): value is "zh" | "en" {
  return value === "zh" || value === "en";
}

function reviewPreviewEnabled() {
  return process.env.IDENTITY_CBI_REVIEW_PREVIEW === "1";
}

function getRecord(slug: string, preview: boolean) {
  if (preview) return getCbiCountry(slug);
  return getVisibleCbiCountries().find((item) => normalizeCbiCountry(item).slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!validLocale(locale)) return {};
  const raw = getRecord(slug, reviewPreviewEnabled());
  if (!raw) return {};
  const country = normalizeCbiCountry(raw);
  const title = locale === "zh" ? `${country.name.zh || country.name.en}｜${country.programmeName.zh || country.programmeName.en}` : `${country.name.en || country.name.zh} | ${country.programmeName.en || country.programmeName.zh}`;
  const description = locale === "zh" ? "查看身份关系、居留前置条件、护照签发条件和官方来源状态。" : "Review identity relationship, residency prerequisites, passport issuance conditions and source status.";
  return cbiMetadata(locale, `/${locale}/identity/countries/${encodeURIComponent(country.slug)}`, title, description);
}

export default async function CbiCountryPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!validLocale(locale)) notFound();
  const preview = reviewPreviewEnabled();
  const raw = getRecord(slug, preview);
  if (!raw) notFound();
  const country = normalizeCbiCountry(raw);
  // Keep the release gate server-side even if a future data helper returns a
  // malformed or withdrawn record by mistake.
  if (!preview && country.contentStatus !== "PUBLISHED") notFound();
  const title = locale === "zh" ? `${country.name.zh || country.name.en}｜${country.programmeName.zh || country.programmeName.en}` : `${country.name.en || country.name.zh} | ${country.programmeName.en || country.programmeName.zh}`;
  const description = locale === "zh" ? "查看身份关系、居留前置条件、护照签发条件和官方来源状态。" : "Review identity relationship, residency prerequisites, passport issuance conditions and source status.";
  return <CbiPageFrame locale={locale} structuredData={cbiStructuredData(locale, `/${locale}/identity/countries/${encodeURIComponent(country.slug)}`, title, description)}><CbiCountryDetail locale={locale} country={country} preview={preview} /></CbiPageFrame>;
}
