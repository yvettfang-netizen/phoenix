import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { V5Site, type Locale } from "@/components/v5-site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "A compass for every family's growth" : "让每个家庭，都拥有自己的成长罗盘",
  };
}

export default async function LocalizedHome({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  return <V5Site locale={locale as Locale} page="home" />;
}
