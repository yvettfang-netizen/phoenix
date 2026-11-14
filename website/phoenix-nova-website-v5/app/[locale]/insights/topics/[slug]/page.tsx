import { notFound } from "next/navigation";
import { InsightsTopic } from "@/components/insights-pages";
import { topics, phrase, type InsightLocale } from "@/lib/insights-content";
import { insightsMetadata } from "@/lib/insights-seo";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) { const { locale, slug } = await params; const t = topics.find(x => x.slug === slug); if ((locale !== "zh" && locale !== "en") || !t) return {}; return insightsMetadata(locale, `/topics/${slug}`, phrase(locale, t.title), locale === "zh" ? "围绕官方来源持续整理的家庭决策专题。" : "A family decision series grounded in official sources.", t.image); }
export default async function Page({ params }: Props) { const { locale, slug } = await params; if (locale !== "zh" && locale !== "en") notFound(); if (!topics.some(t => t.slug === slug)) notFound(); return <InsightsTopic locale={locale as InsightLocale} slug={slug}/>; }
