import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsultationPreparation } from "@/components/consultation-preparation";
import type { Locale } from "@/components/v5-site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  return {
    title: locale === "zh" ? "咨询准备｜Phoenix Nova 凤启环球" : "Consultation preparation | Phoenix Nova",
    description: locale === "zh" ? "了解 Phoenix Nova 专业方向和安全咨询准备边界。正式接收接口开放前，不会自动提交或上传资料。" : "Explore Phoenix Nova professional areas and safe consultation preparation. No submission or upload occurs before the formal intake endpoint opens.",
    robots: { index: false, follow: false },
  };
}

export default async function ConsultationPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <ConsultationPreparation locale={locale as Locale} />;
}
