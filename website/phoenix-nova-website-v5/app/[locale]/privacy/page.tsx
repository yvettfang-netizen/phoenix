import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { SiteFooter, SiteHeader } from "@/components/v5-site";
import { PublicPrivacyPage } from "@/components/public-privacy-page";
import { websitePrivacyPolicy } from "@/lib/website-privacy-policy.mjs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "隐私政策" : "Privacy policy",
    robots: { index: false, follow: false },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const policy = websitePrivacyPolicy(env as Record<string, unknown>);
  if (!policy) return <PublicPrivacyPage locale={locale} />;
  return <>
    <SiteHeader locale={locale} page="home" localePath="/privacy" localized />
    <main className="mx-auto max-w-3xl space-y-5 px-5 py-12 leading-relaxed text-[var(--brand-ink)]">
      <h1 className="text-3xl font-semibold">{locale === "zh" ? "隐私政策" : "Privacy policy"}</h1>
      {policy[locale].map((paragraph, index) => <p key={index} className="whitespace-pre-line [overflow-wrap:anywhere]">{paragraph}</p>)}
    </main>
    <SiteFooter locale={locale} localized />
  </>;
}
