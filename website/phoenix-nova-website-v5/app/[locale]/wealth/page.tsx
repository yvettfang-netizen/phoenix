import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WealthLanding } from "@/components/wealth-landing";
import { isWealthSurface } from "@/lib/wealth-surface";
import { wealthMetadata, wealthJsonLd } from "@/lib/wealth-metadata";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  return wealthMetadata(
    locale,
    locale === "zh"
      ? "全球财富规划｜财富罗盘"
      : "Global Wealth Planning | Wealth Compass",
    locale === "zh"
      ? "守护当下，传承未来。凤启环球以家庭为核心，连接财富结构评估、长期规划知识及专业机构协作。"
      : "Preserve Today, Create a Lasting Tomorrow. Family wealth structure assessment, long-term planning education and professional collaboration.",
  );
}
export default async function WealthPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: wealthJsonLd(
            locale,
            locale === "zh" ? "全球财富规划" : "Global Wealth Planning",
          ),
        }}
      />
      <WealthLanding locale={locale} standalone={await isWealthSurface()} />
    </>
  );
}
