import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageIds, routeMetadata, V5Site, type Locale, type PageId } from "@/components/v5-site";
import { HealthCompassEntry } from "@/components/health-compass-entry";

type Props = { params: Promise<{ locale: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  if ((locale !== "zh" && locale !== "en") || !pageIds.includes(page as (typeof pageIds)[number])) return {};
  const item = routeMetadata[page as Exclude<PageId, "home">];
  return { title: locale === "zh" ? item.zh : item.en };
}

export default async function LocalizedPage({ params }: Props) {
  const { locale, page } = await params;
  if ((locale !== "zh" && locale !== "en") || !pageIds.includes(page as (typeof pageIds)[number])) notFound();
  return <>{page === "compass" ? <HealthCompassEntry locale={locale} /> : null}<div style={{ position: "relative" }}><V5Site locale={locale as Locale} page={page as PageId} /></div></>;
}
