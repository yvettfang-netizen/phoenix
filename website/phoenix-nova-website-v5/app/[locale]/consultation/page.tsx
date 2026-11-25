import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { SiteFooter, SiteHeader } from "@/components/v5-site";
import { WebsiteConsultationForm } from "@/components/website-consultation-form";
import { ConsultationPreparation } from "@/components/consultation-preparation";
import { isConsultationEntry, websiteConsultationPrivacyUrl } from "@/lib/website-consultation-intake";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ from?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "服务咨询" : "Service enquiry",
    robots: { index: false, follow: false },
  };
}

export default async function ConsultationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const zh = locale === "zh";
  const { from } = await searchParams;
  if (from !== undefined && !isConsultationEntry(from)) notFound();
  const privacyUrl = websiteConsultationPrivacyUrl(env as unknown as Record<string, unknown>, locale);
  if (!privacyUrl) return <ConsultationPreparation locale={locale} />;
  return <>
    <SiteHeader locale={locale} page="home" localePath="/consultation" localized />
    <main className="mx-auto grid max-w-xl gap-5 px-5 py-12 text-[var(--brand-ink)]">
      <h1 className="text-3xl font-semibold">{zh ? "服务咨询" : "Service enquiry"}</h1>
      <>
        <p id="consultation-data-notice">
          {zh ? "提交后，凤启环球信息科技（深圳）有限公司将使用您的邮箱和所选方向处理本次咨询。请勿在此提交证件、问卷答案、医疗或财务资料。" : "Phoenix Nova uses your email address and selected service to respond to this enquiry. Please keep identity documents, assessment answers, medical records and financial details out of this form."}
        </p>
        <a className="w-fit underline underline-offset-4" href={privacyUrl}>{zh ? "阅读隐私政策" : "Read the privacy policy"}</a>
        <WebsiteConsultationForm locale={locale} entry={from} />
        <noscript><p>{zh ? "请启用 JavaScript 后提交咨询。" : "Enable JavaScript to submit your enquiry."}</p></noscript>
      </>
    </main>
    <SiteFooter locale={locale} localized />
  </>;
}
