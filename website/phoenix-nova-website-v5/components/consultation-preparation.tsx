import Link from "next/link";
import { SiteFooter, SiteHeader, type Locale } from "@/components/v5-site";

const copy = {
  zh: {
    eyebrow: "CONSULTATION",
    title: "从一次清晰的沟通开始。",
    lead: "请选择希望了解的专业方向。当前公开页面只提供咨询准备与安全联系说明，不会自动创建客户、预约、服务项目或上传任何资料。",
    intro: "线上咨询提交通道正在配置中。",
    body: "在正式接收接口开放前，您可以先了解服务方向，或通过公开邮箱主动联系。请不要在邮件或公开页面发送身份证件、护照、病历、保险理赔文件或其他敏感资料。",
    emailLabel: "通过邮箱联系",
    privacy: "查看隐私政策",
    back: "返回首页",
    domains: [
      ["教育规划", "/zh/education#consultation"],
      ["身份规划", "/zh/identity#consultation"],
      ["财富规划", "/zh/compass#wealth"],
      ["健康服务", "/zh/health#consultation"],
    ],
  },
  en: {
    eyebrow: "CONSULTATION",
    title: "Begin with a clear conversation.",
    lead: "Choose the professional area you would like to explore. This public page only provides preparation and safe-contact guidance; it does not create a client, booking, service project or upload.",
    intro: "The online consultation submission channel is being configured.",
    body: "Before the formal intake endpoint is opened, you can review a service area or contact the public mailbox. Please do not send passports, identity documents, medical records, insurance claim files or other sensitive material by email or through a public page.",
    emailLabel: "Contact by email",
    privacy: "Read the privacy policy",
    back: "Back to home",
    domains: [
      ["Education planning", "/en/education#consultation"],
      ["Identity planning", "/en/identity#consultation"],
      ["Wealth planning", "/en/compass#wealth"],
      ["Health services", "/en/health#consultation"],
    ],
  },
} as const;

export function ConsultationPreparation({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return (
    <main className="center-page" lang={locale === "zh" ? "zh-Hans" : "en"}>
      <SiteHeader locale={locale} page="home" />
      <section className="editorial-section" aria-labelledby="consultation-title">
        <div className="shell" style={{ maxWidth: 960, paddingTop: "9rem", paddingBottom: "5rem" }}>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 id="consultation-title" style={{ maxWidth: 760 }}>{text.title}</h1>
          <p style={{ maxWidth: 700, fontSize: "1.12rem", lineHeight: 1.7 }}>{text.lead}</p>
          <div className="quiet-cta" style={{ marginTop: "2rem" }}>
            <h2>{text.intro}</h2>
            <p>{text.body}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", marginTop: "1.25rem" }}>
              {text.domains.map(([label, href]) => <Link className="button button--navy" href={href} key={href}>{label} ↗</Link>)}
            </div>
            <p style={{ marginTop: "1.5rem" }}>
              <a className="button button--gold" href="mailto:nova@phoenixnova.com.cn">{text.emailLabel} ↗</a>
            </p>
          </div>
          <nav aria-label={locale === "zh" ? "咨询相关链接" : "Consultation links"} style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginTop: "2rem" }}>
            <Link href={`/${locale}/privacy`}>{text.privacy}</Link>
            <Link href={`/${locale}`}>{text.back}</Link>
          </nav>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
