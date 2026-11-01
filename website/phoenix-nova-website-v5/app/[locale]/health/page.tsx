import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HealthLanding } from "@/components/health-landing";
import { healthGeoMetadata } from "@/lib/health-geo";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  const title = locale === "zh" ? "全球健康与跨境医疗" : "Global Health & Cross-Border Medical Services";
  const description = locale === "zh"
    ? "连接香港、深圳及粤港澳大湾区医疗资源，了解医疗预约、语言沟通、跨境行程、在地支持与保险理赔行政协助。先了解家庭需要，再规划下一步。"
    : "Explore healthcare options across Hong Kong, Shenzhen and the Greater Bay Area, with appointment coordination, language support, travel, local arrangements and insurance claims administration.";
  return {
    title, description,
    alternates: healthGeoMetadata(locale, {zh:"",en:""}, {zh:title,en:title}, {zh:description,en:description}).alternates,
    openGraph: { title: `Phoenix Nova™ ${title}`, description, type: "website", locale: locale === "zh" ? "zh_CN" : "en_GB", siteName: "Phoenix Nova™", images: [{ url: "/images/health-v31-gba-family.png",  alt: locale === "zh" ? "大湾区家庭医疗协调艺术场景" : "Illustrative Greater Bay Area family care coordination" }] },
    twitter: { card: "summary_large_image", title: `Phoenix Nova™ ${title}`, description, images: ["/images/health-v31-gba-family.png"] },
    robots: { index: false, follow: false, nocache: true },
  };
}
export default async function HealthPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <HealthLanding locale={locale} />;
}
