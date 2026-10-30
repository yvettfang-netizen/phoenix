import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HealthLanding } from "@/components/health-landing";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  const title = locale === "zh" ? "全球健康与国际医疗协调服务" : "Global Health Services";
  const description = locale === "zh"
    ? "凤启环球为跨境家庭梳理国际就医协调、医疗翻译、患者导航、在地礼宾与保险理赔行政协助需求。了解服务，准备下一步。"
    : "Phoenix Nova connects cross-border families with medical coordination, interpretation, patient navigation, local concierge and insurance claims administration support.";
  return {
    title, description,
    alternates: { languages: { "zh-Hans": "/zh/health", en: "/en/health" } },
    openGraph: { title: `Phoenix Nova™ ${title}`, description, type: "website", locale: locale === "zh" ? "zh_CN" : "en_GB", siteName: "Phoenix Nova™", images: [{ url: "/images/health-v2-landscape.png",  alt: locale === "zh" ? "国际医疗协调服务示意" : "Illustrative international care coordination" }] },
    twitter: { card: "summary_large_image", title: `Phoenix Nova™ ${title}`, description, images: ["/images/health-v2-landscape.png"] },
    robots: { index: false, follow: false, nocache: true },
  };
}
export default async function HealthPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <HealthLanding locale={locale} />;
}
