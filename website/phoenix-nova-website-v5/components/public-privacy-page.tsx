import Link from "next/link";
import { SiteFooter, SiteHeader, type Locale } from "@/components/v5-site";

const copy = {
  zh: {
    eyebrow: "PRIVACY POLICY",
    title: "隐私与资料处理说明",
    lead: "本页说明 Phoenix Nova™ 公开网站在咨询准备、页面访问和后续授权服务中的资料边界。",
    sections: [
      ["公开页面", "公开页面用于介绍 Phoenix Nova™ 的教育、身份、健康与财富专业方向。浏览页面本身不会创建客户、家庭、成员、服务项目或医疗档案。"],
      ["咨询准备", "现有咨询准备入口仅在当前页面内提供本地选择与清单，不读取或上传 Compass 答案，不自动发送给顾问，也不会显示“提交成功”或生成虚假的请求编号。正式接收接口开放前，请使用明确的公开联系方式。"],
      ["敏感资料", "请不要在公开页面或普通邮箱发送护照、身份证、病历、医疗报告、保险理赔文件、完整成绩单或其他不必要的敏感资料。需要资料时，将在适用的服务范围、授权和安全渠道确认后另行说明。"],
      ["后续授权", "如您主动申请咨询，资料的收集、使用、共享、保存和撤回将以适用的隐私政策、服务协议、授权记录和权限控制为准。未经授权，问卷答案不会自动进入 CRM。"],
      ["联系我们", "如需了解资料处理边界，请通过公开邮箱联系。请在邮件正文中只提供必要的沟通背景，不要附加敏感文件。"],
    ],
    contact: "nova@phoenixnova.com.cn",
    home: "返回首页",
    consultation: "查看咨询准备",
  },
  en: {
    eyebrow: "PRIVACY POLICY",
    title: "Privacy and information handling",
    lead: "This page explains the boundaries for information on Phoenix Nova™ public pages, consultation preparation and any later authorised service.",
    sections: [
      ["Public pages", "Public pages introduce Phoenix Nova™ across education, identity, health and wealth. Browsing does not create a client, family, member, service project or medical record."],
      ["Consultation preparation", "Current preparation entries provide local choices and checklists only. They do not read or upload Compass answers, send data to an adviser, show a false success message or create a fabricated request ID. Use an explicit public contact while the formal intake endpoint is being configured."],
      ["Sensitive information", "Do not send passports, identity documents, medical records, medical reports, insurance claim files, complete transcripts or other unnecessary sensitive material through a public page or ordinary email. If information is needed, the scope, authorisation and secure channel will be confirmed first."],
      ["Later authorisation", "If you voluntarily request a consultation, collection, use, sharing, retention and withdrawal follow the applicable privacy policy, service agreement, consent record and access controls. Assessment answers are not automatically sent to CRM without authorisation."],
      ["Contact", "For questions about information handling, use the public mailbox. Include only the minimum context needed and do not attach sensitive files."],
    ],
    contact: "nova@phoenixnova.com.cn",
    home: "Back to home",
    consultation: "Consultation preparation",
  },
} as const;

export function PublicPrivacyPage({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return (
    <main className="center-page" lang={locale === "zh" ? "zh-Hans" : "en"}>
      <SiteHeader locale={locale} page="home" />
      <article className="editorial-section" aria-labelledby="privacy-title">
        <div className="shell" style={{ maxWidth: 960, paddingTop: "9rem", paddingBottom: "5rem" }}>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 id="privacy-title" style={{ maxWidth: 760 }}>{text.title}</h1>
          <p style={{ maxWidth: 700, fontSize: "1.12rem", lineHeight: 1.7 }}>{text.lead}</p>
          <div style={{ display: "grid", gap: "1.25rem", marginTop: "2.5rem" }}>
            {text.sections.map(([heading, body]) => <section key={heading} style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}><h2>{heading}</h2><p style={{ maxWidth: 760, lineHeight: 1.75 }}>{body}</p></section>)}
          </div>
          <p style={{ marginTop: "2rem" }}><a href={`mailto:${text.contact}`}>{text.contact}</a></p>
          <nav aria-label={locale === "zh" ? "隐私相关链接" : "Privacy links"} style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginTop: "2rem" }}>
            <Link href={`/${locale}/consultation`}>{text.consultation}</Link>
            <Link href={`/${locale}`}>{text.home}</Link>
          </nav>
        </div>
      </article>
      <SiteFooter locale={locale} />
    </main>
  );
}
