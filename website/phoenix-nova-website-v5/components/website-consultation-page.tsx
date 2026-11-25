import { env } from "cloudflare:workers";
import { SiteFooter, SiteHeader } from "@/components/v5-site";
import { WebsiteConsultationForm } from "@/components/website-consultation-form";
import { ConsultationPreparation } from "@/components/consultation-preparation";
import { type ConsultationEntry, websiteConsultationPrivacyUrl } from "@/lib/website-consultation-intake";

export function WebsiteConsultationPage({ locale, entry }: { locale: "zh" | "en"; entry?: ConsultationEntry }) {
  const zh = locale === "zh";
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
        <WebsiteConsultationForm locale={locale} entry={entry} />
        <noscript><p>{zh ? "请启用 JavaScript 后提交咨询。" : "Enable JavaScript to submit your enquiry."}</p></noscript>
      </>
    </main>
    <SiteFooter locale={locale} localized />
  </>;
}
