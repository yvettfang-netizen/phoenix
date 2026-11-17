import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };
type Locale = "zh" | "en";

export const dynamic = "force-dynamic";

const isLocale = (value: string): value is Locale => value === "zh" || value === "en";

// Disabled until server RBAC, durable audit and the Canonical adapter are reviewed.
// Environment flags are never import authorization.
const internalGateEnabled = () => false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || !internalGateEnabled()) return {};
  return {
    title: locale === "zh" ? "CBI 导入预览" : "CBI Import Preview",
    description: locale === "zh" ? "内部 CBI 数据导入预览与错误报告。" : "Internal CBI import preview and error report.",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function CbiImportReviewPage({ params }: Props) {
  const { locale } = await params;
  // The gate is server-only. There is no public fallback and no client-side
  // role selector that could turn this page on.
  if (!internalGateEnabled() || !isLocale(locale)) notFound();
  notFound();
}
