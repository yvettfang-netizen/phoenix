import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WealthFrame } from "@/components/wealth-landing";
import { WealthAssessment } from "@/components/wealth-assessment";
import { isWealthSurface } from "@/lib/wealth-surface";
import { wealthMetadata } from "@/lib/wealth-metadata";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  return wealthMetadata(
    locale,
    locale === "zh"
      ? "家庭财富罗盘｜14 题结构评估"
      : "Wealth Compass | Family structure assessment",
    locale === "zh"
      ? "以六维结构问题了解家庭规划，识别下一步关注方向。"
      : "Understand your family's planning through six dimensions and identify your next priorities.",
    "compass",
  );
}
export default async function AssessmentPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const standalone = await isWealthSurface();
  return (
    <WealthFrame
      locale={locale}
      path={standalone ? "/compass" : "/assessment"}
      standalone={standalone}
    >
      <WealthAssessment locale={locale} standalone={standalone} />
    </WealthFrame>
  );
}
