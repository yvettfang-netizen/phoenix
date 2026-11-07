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
  return cbiMetadata(locale, `/${locale}/identity/countries`, locale === "zh" ? "精选投资入籍国家资料" : "Selected Citizenship by Investment Records", locale === "zh" ? "检索精选投资入籍国家资料，分别查看法律、运营、家庭、居住及护照签发状态。" : "Review selected citizenship-by-investment records with legal, operational, family, residence and passport issuance status kept separate.");
}

export default async function CbiCountriesPage({ params }: Props) {
  const { locale } = await params;
  if (!validLocale(locale)) notFound();
  const preview = process.env.IDENTITY_CBI_REVIEW_PREVIEW === "1";
  const records = normalizeCbiCountries(getVisibleCbiCountries());
  const title = locale === "zh" ? "精选投资入籍国家资料" : "Selected Citizenship by Investment Records";
  const description = locale === "zh" ? "按国家及关键投资入籍字段检索精选资料。" : "Review selected records by key citizenship-by-investment fields.";
  return <CbiPageFrame locale={locale} structuredData={cbiStructuredData(locale, `/${locale}/identity/countries`, title, description)}><CbiExplorer locale={locale} records={records} preview={preview} /></CbiPageFrame>;
}
