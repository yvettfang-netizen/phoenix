import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { SiteHeader } from "@/components/v5-site";
import { FreeEducationAssessment } from "@/components/free-education-assessment";
import { freeAssessmentPreviewEnabled } from "@/lib/free-education-assessment";

export const dynamic = "force-dynamic";
export const metadata = { title: "凤启教育罗盘｜免费初评", robots: { index: false, follow: false, nocache: true } };

export default async function FreeAssessmentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if ((locale !== "zh" && locale !== "en") ||
      !freeAssessmentPreviewEnabled(env as Record<string, unknown>)) notFound();
  return <>
    <SiteHeader locale={locale} page="home" localized localePath="/education/free-assessment" />
    <FreeEducationAssessment locale={locale} />
  </>;
}
