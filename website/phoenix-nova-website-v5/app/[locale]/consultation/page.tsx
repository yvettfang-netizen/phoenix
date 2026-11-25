import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebsiteConsultationPage } from "@/components/website-consultation-page";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "服务咨询" : "Service enquiry",
    robots: { index: false, follow: false },
  };
}

export default async function ConsultationPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <WebsiteConsultationPage locale={locale} />;
}
