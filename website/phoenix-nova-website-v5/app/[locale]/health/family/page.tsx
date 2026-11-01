import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HealthFamily } from "@/components/health-family";
import { healthGeoMetadata } from "@/lib/health-geo";
type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  const title = locale === "zh" ? "家庭健康规划" : "Family Health Planning";
  const description = locale === "zh" ? "从就医路径、家庭协作到资料授权与持续跟进，用六大方向梳理家庭健康事务。复用 Health Compass 14题，自愿了解国际医疗协调支持。" : "Organise family health arrangements across six directions, from care pathways and shared tasks to permissions and follow-up. One Health Compass, with optional international care coordination.";
  return { title, description, alternates: healthGeoMetadata(locale, {zh:"family",en:"family"}, {zh:title,en:title}, {zh:description,en:description}).alternates, robots: { index:false, follow:false, nocache:true },
    openGraph: { title:`${title}｜Phoenix Nova™`, description, type:"website", locale:locale === "zh" ? "zh_CN" : "en_GB", images:[{url:"/images/health-claims.jpg",alt:title}] },
    twitter: { card:"summary_large_image", title, description, images:["/images/health-claims.jpg"] } };
}
export default async function FamilyPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <HealthFamily locale={locale} />;
}
