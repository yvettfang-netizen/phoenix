import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdentityLanding } from "@/components/identity-landing";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  const title = locale === "zh" ? "全球身份规划" : "Global Identity Planning";
  const description = locale === "zh"
    ? "阳光下未雨绸缪，风雨中闲庭信步。Phoenix Nova™ 连接香港身份、全球居留、家庭与子女衔接及长期跨境规划，提供自愿的咨询准备入口。"
    : "Prepare in the sunshine. Walk with confidence through the storm. Explore Hong Kong identity, global residency, family transitions and long-term cross-border planning with Phoenix Nova™.";
  return {
    title, description,
    alternates: { languages: { "zh-Hans": "/zh/identity", en: "/en/identity" } },
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title: `${title}｜Phoenix Nova™`, description, type: "website", siteName: "Phoenix Nova™", locale: locale === "zh" ? "zh_CN" : "en_GB", images: [{ url: "/images/identity-v3/identity-hero.png", alt: title }] },
    twitter: { card: "summary_large_image", title: `${title}｜Phoenix Nova™`, description, images: ["/images/identity-v3/identity-hero.png"] },
  };
}

export default async function IdentityPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <IdentityLanding locale={locale} />;
}
