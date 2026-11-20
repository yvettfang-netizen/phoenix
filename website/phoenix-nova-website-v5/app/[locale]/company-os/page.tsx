import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { corporateOsPreviewEnabled } from "@/lib/corporate-os-preview";

/** Existing local candidate link. Does not enable a production Company or Corporate workspace. */
export const dynamic = "force-dynamic";
export const metadata = { title: "Corporate OS｜凤启企业运营系统", robots: { index: false, follow: false, nocache: true } };
export default async function LegacyCompanyOsRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const requestHeaders = await headers();
  if (!corporateOsPreviewEnabled(env as unknown as Record<string, unknown>, process.env.NODE_ENV, requestHeaders.get("host"))) notFound();
  redirect(`/${locale}/corporate-os`);
}
