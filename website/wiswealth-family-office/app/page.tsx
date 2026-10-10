import { SiteFooter, SiteHeader } from "./site-shell";

type IconName = "wisdom" | "wealth" | "health" | "identity" | "education" | "protection" | "legacy";

const values: Array<{ icon: IconName; en: string; zh: string; text: string }> = [
  { icon: "wisdom", en: "Wisdom", zh: "智慧判断", text: "以全球视野与本土洞察，审时度势，为家庭作出更明智的关键决策。" },
  { icon: "wealth", en: "Wealth", zh: "财富根基", text: "构建稳健的资产与现金流，布局跨境机遇，守护并传承家庭长期价值。" },
  { icon: "health", en: "Health", zh: "健康承载", text: "整合医疗与健康资源，守护身心健康，让关爱延续世代。" },
];

const services: Array<{ icon: IconName; en: string; title: string; short: string; text: string; slug: string }> = [
  { icon: "identity", en: "Identity & Hong Kong", title: "身份与香港发展", short: "身份规划 · 定居香港", text: "从家庭目标出发，梳理身份选择、香港发展路径与真实经营安排。", slug: "identity-hong-kong" },
  { icon: "education", en: "Education Planning", title: "跨境教育规划", short: "跨境升学 · 海外留学", text: "连接升学申请、国际教育与下一代成长，而不是只处理一次申请。", slug: "education" },
  { icon: "protection", en: "Health & Protection", title: "健康与家庭保障", short: "香港保险 · 抗衰医疗", text: "协同保险、医疗与健康管理资源，建立与家庭阶段相匹配的保障框架。", slug: "health-protection" },
  { icon: "legacy", en: "Wealth & Legacy", title: "财富与家族传承", short: "海外置业 · 财富传承", text: "围绕资产配置、风险隔离与传承秩序，形成可持续的家庭财富安排。", slug: "wealth-legacy" },
];

const steps = [
  ["01", "理解家庭", "确认家庭成员、所处阶段、跨境目标与真正需要解决的问题。"],
  ["02", "形成路线图", "把身份、教育、健康与财富放在同一时间轴上，识别顺序与风险。"],
  ["03", "专业协同", "由法律、税务、持牌金融、保险或医疗专业机构独立承接相应事项。"],
  ["04", "持续复盘", "随着政策、家庭阶段和目标变化，持续检视并更新长期方案。"],
];

function LineIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "wisdom") return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}><path d="M18 38h-4v-8a13 13 0 1 1 23-8.4c0 4-1.8 7.2-5 9.7V38h-8"/><path d="M17 21h12m-6-6v12m8-14 2-2m-2 15 3 2"/></svg>;
  if (name === "wealth") return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}><path d="M9 39h30M13 35V24h7v11m4 0V16h7v19m4 0V9h7v26"/></svg>;
  if (name === "health") return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}><path d="M24 39V22m0 5c-8 0-12-4-12-11 7 0 12 4 12 11Zm0-3c0-8 4-13 12-14 0 8-4 13-12 14Z"/><path d="M14 40h20"/></svg>;
  if (name === "identity") return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}><path d="M24 4 39 10v12c0 10-6 17-15 22C15 39 9 32 9 22V10l15-6Z"/><circle cx="24" cy="19" r="5"/><path d="M15.5 33c2-5 5-7 8.5-7s6.5 2 8.5 7"/></svg>;
  if (name === "education") return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}><path d="m5 18 19-10 19 10-19 10L5 18Z"/><path d="M12 22v10c7 6 17 6 24 0V22m7-4v15"/></svg>;
  if (name === "protection") return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}><path d="M24 4 39 10v12c0 10-6 17-15 22C15 39 9 32 9 22V10l15-6Z"/><path d="M24 14v16M16 22h16"/></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...common}><path d="M6 40h36M9 36h30M12 19h24v17H12V19Zm-3 0h30L24 7 9 19Z"/><path d="M17 23v9m7-9v9m7-9v9"/></svg>;
}

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">WisWealth Family Office</p>
            <h1>智启跨境之路<br />富筑家族根基</h1>
            <p className="hero-intro">以智慧规划未来，以财富守护成长，以健康延续家族价值。</p>
            <div className="hero-actions">
              <a className="button button-gold" href="#contact">开启家庭规划</a>
              <a className="button button-outline" href="#services">了解服务体系</a>
            </div>
          </div>
          <div className="sunrise-card">
            <img src="/assets/wiswealth-sunrise.png" alt="金色日升照映宁静海面，象征家庭长期价值" />
            <p>Wisdom <i>·</i> Wealth <i>·</i> Health</p>
          </div>
        </div>
      </section>

      <section className="philosophy-band" id="philosophy">
        <h2>一个家庭的长期价值，不应由单一产品定义。</h2>
        <div className="value-grid">
          {values.map((value) => (
            <article className="value-item" key={value.en}>
              <span className="round-icon"><LineIcon name={value.icon} /></span>
              <div><h3><b>{value.en}</b> {value.zh}</h3><p>{value.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="services" id="services">
        <div className="ornament-title"><span /><h2>我们的服务领域</h2><span /></div>
        <div className="service-grid">
          {services.map((service) => (
            <a className="service-card" href={`/services/${service.slug}`} key={service.en}>
              <LineIcon name={service.icon} />
              <p className="service-en">{service.en}</p>
              <h3>{service.title}</h3>
              <p className="service-short">{service.short}</p>
              <p className="service-copy">{service.text}</p>
              <span className="card-link">了解规划范围 →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="method" id="method">
        <div className="section-heading">
          <p className="eyebrow dark">Family Planning Method</p>
          <h2>先诊断，再规划。<br />先合规，再执行。</h2>
          <p>智富家办不从某一项产品开始，而是从家庭全貌开始。每一项安排，都应有清晰目标、真实依据、专业边界与长期记录。</p>
        </div>
        <div className="steps">
          {steps.map(([number, title, text]) => <article className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="standards" id="standards">
        <div className="section-heading light">
          <p className="eyebrow">Our Professional Standard</p>
          <h2>长期信任，<br />建立在清晰边界之上。</h2>
        </div>
        <div className="standard-rules">
          <p><span>01</span>不以单一产品替代家庭整体判断</p>
          <p><span>02</span>涉及持牌、法律、税务及医疗事项，由相应专业机构提供意见或服务</p>
          <p><span>03</span>不承诺审批结果、投资回报或任何无法由真实证据支持的结论</p>
          <small>对于身份与香港发展相关的企业或基金架构，我们坚持以合规设立、真实经营和可核验记录为基础，并在相应专业方完成评估后推进。</small>
        </div>
      </section>

      <section className="founder-note">
        <span aria-hidden="true">“</span>
        <blockquote>我们希望帮助家庭拥有的，不只是更多选择，<br />而是看懂选择、承担选择，并让今天的决定经得起时间。</blockquote>
        <p>方鹤潼 · 创建人 / 资深跨境规划专家</p>
      </section>

      <section className="contact" id="contact">
        <div className="section-heading light contact-heading">
          <p className="eyebrow">Begin with a Conversation</p>
          <h2>每一个长期方案，<br />都从一次真实沟通开始。</h2>
          <p>第一次沟通的目标不是推介产品，而是理解你的家庭阶段与当前问题，确认我们是否适合继续同行。</p>
          <a className="button button-gold" href="mailto:info@wwfo.online?subject=智富家办初步咨询">预约初步沟通</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
