import { notFound } from "next/navigation";
import { InsightsChannel } from "@/components/insights-pages";
import { channelById, phrase, type ChannelId, type InsightLocale } from "@/lib/insights-content";
import { insightsMetadata } from "@/lib/insights-seo";
type Props = { params: Promise<{ locale: string; channel: string }>; searchParams: Promise<{ tag?: string; page?: string }> };
export async function generateMetadata({ params }: Props) { const { locale, channel } = await params; const c = channelById(channel); if ((locale !== "zh" && locale !== "en") || !c) return {}; return insightsMetadata(locale, `/${channel}`, phrase(locale, c.title), phrase(locale, c.description), c.image); }
export default async function Page({ params, searchParams }: Props) { const { locale, channel } = await params; if (locale !== "zh" && locale !== "en") notFound(); if (!channelById(channel)) notFound(); const { tag, page } = await searchParams; return <InsightsChannel locale={locale as InsightLocale} channel={channel as ChannelId} tag={typeof tag === "string" ? tag.slice(0, 80) : ""} page={Number(page) || 1}/>; }
