import { notFound } from "next/navigation";
import { InsightsHome } from "@/components/insights-pages";
import { insightsMetadata } from "@/lib/insights-seo";
import type { InsightLocale } from "@/lib/insights-content";
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };
export async function generateMetadata({ params }: Props) { const { locale } = await params; if (locale !== "zh" && locale !== "en") return {}; return insightsMetadata(locale, "", locale === "zh" ? "凤启洞察｜Phoenix Insights" : "Phoenix Insights™ | Global Perspectives", locale === "zh" ? "教育、身份、财富与健康：以官方资料为依据的家庭规划洞察。" : "Source-led insights on education, identity, wealth and health for global families."); }
export default async function Page({ params, searchParams }: Props) { const { locale } = await params; if (locale !== "zh" && locale !== "en") notFound(); const { q } = await searchParams; return <InsightsHome locale={locale as InsightLocale} query={typeof q === "string" ? q.slice(0, 120) : ""}/>; }
