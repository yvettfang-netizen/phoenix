import { env } from "cloudflare:workers";
import { notFound } from "next/navigation";
import { sessionFamilyPreviewEnabled } from "@/lib/canonical-family-projection";
import { CanonicalFamilyPreview } from "@/components/canonical-family-preview";
export const dynamic = "force-dynamic";
export const metadata = { title: "Family read-only preview", robots: { index: false, follow: false, nocache: true } };
export default async function SessionFamilyPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if ((locale !== "zh" && locale !== "en") || !sessionFamilyPreviewEnabled(env as unknown as Record<string, unknown>, process.env.NODE_ENV)) notFound();
  return <main><h1>{locale === "zh" ? "家庭资料只读预览" : "Family read-only preview"}</h1><CanonicalFamilyPreview locale={locale} sessionMode /></main>;
}
