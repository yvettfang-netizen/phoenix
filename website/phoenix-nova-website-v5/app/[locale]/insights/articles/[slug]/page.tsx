import { notFound } from "next/navigation";
import { InsightsArticle } from "@/components/insights-pages";
import { articleBySlug, phrase, type InsightLocale } from "@/lib/insights-content";
import { articleBreadcrumb, insightsMetadata, safeJsonLd } from "@/lib/insights-seo";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) { const { locale, slug } = await params; const a = articleBySlug(slug); if ((locale !== "zh" && locale !== "en") || !a) return {}; return insightsMetadata(locale, `/articles/${slug}`, phrase(locale, a.title), phrase(locale, a.summary), a.image); }
export default async function Page({ params }: Props) { const { locale, slug } = await params; if (locale !== "zh" && locale !== "en") notFound(); const article = articleBySlug(slug); if (!article) notFound(); return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleBreadcrumb(locale as InsightLocale, article)) }}/><InsightsArticle locale={locale as InsightLocale} article={article}/></>; }
