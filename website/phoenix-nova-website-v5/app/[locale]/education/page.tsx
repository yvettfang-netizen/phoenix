import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EducationLanding } from "@/components/education-landing";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  const title = locale === "zh" ? "全球教育规划与智能学习" : "Global Education Planning & Intelligent Learning";
  const description = locale === "zh" ? "让每个孩子看见更大的世界。了解 Education Compass、全球升学规划、凤启学苑与 ASKWISE，连接课程、导师及家庭长期成长。" : "A world of opportunities. Explore Education Compass, global admissions, Phoenix Academy and ASKWISE for learning, tutor support and long-term family growth.";
  return { title, description, alternates: { languages: { "zh-Hans": "/zh/education", en: "/en/education" } }, robots: { index: false, follow: false, nocache: true }, openGraph: { title: `${title}｜Phoenix Nova™`, description, type: "website", siteName: "Phoenix Nova™", locale: locale === "zh" ? "zh_CN" : "en_GB", images: [{ url: "/images/education-v3/education-hero.png", alt: title }] }, twitter: { card: "summary_large_image", title, description, images: ["/images/education-v3/education-hero.png"] } };
}
export default async function EducationPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <EducationLanding locale={locale} />;
}
