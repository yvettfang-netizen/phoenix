import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CbiExplorer } from "@/components/cbi-explorer";
import { CbiPageFrame } from "@/components/cbi-page-frame";
import { cbiMetadata, cbiStructuredData } from "@/lib/cbi-seo";
import { normalizeCbiCountries } from "@/components/cbi-types";
import { getVisibleCbiCountries } from "@/lib/cbi-data";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";

function validLocale(value: string): value is "zh" | "en" {
  return value === "zh" || value === "en";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!validLocale(locale)) return {};
  return cbiMetadata(locale, `/${locale}/identity/explorer`, locale === "zh" ? "精选投资入籍国家检索" : "Selected Citizenship by Investment Explorer", locale === "zh" ? "按国家、运营与法律状态、投资方式、家庭、居住及护照签发状态检索精选投资入籍资料。" : "Review selected citizenship-by-investment records by country, status, investment, family, residence and passport issuance.");
}

export default async function CbiExplorerPage({ params }: Props) {
  const { locale } = await params;
  if (!validLocale(locale)) notFound();
  const preview = process.env.IDENTITY_CBI_REVIEW_PREVIEW === "1";
  const records = normalizeCbiCountries(getVisibleCbiCountries());
  const title = locale === "zh" ? "精选投资入籍国家检索" : "Selected Citizenship by Investment Explorer";
  const description = locale === "zh" ? "按国家及关键投资入籍字段检索精选资料。" : "Review selected records by key citizenship-by-investment fields.";
  return <CbiPageFrame locale={locale} structuredData={cbiStructuredData(locale, `/${locale}/identity/explorer`, title, description)}><CbiExplorer locale={locale} records={records} preview={preview} /></CbiPageFrame>;
}
