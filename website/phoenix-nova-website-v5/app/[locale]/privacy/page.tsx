import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPrivacyPage } from "@/components/public-privacy-page";
import type { Locale } from "@/components/v5-site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  return {
    title: locale === "zh" ? "隐私政策｜Phoenix Nova 凤启环球" : "Privacy policy | Phoenix Nova",
    description: locale === "zh" ? "了解 Phoenix Nova 公开页面、咨询准备和后续授权服务中的资料处理边界。" : "Learn how Phoenix Nova handles information on public pages, consultation preparation and later authorised services.",
    robots: { index: false, follow: false },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <PublicPrivacyPage locale={locale as Locale} />;
}
