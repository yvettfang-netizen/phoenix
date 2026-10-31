import Link from "next/link";
import Image from "next/image";
import { Globe2, Umbrella, Signpost, UsersRound, ShieldCheck, MessagesSquare, Search, FileText, ArrowUpRight, Compass } from "lucide-react";
import { SiteHeader, SiteFooter, type Locale } from "./v5-site";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { IdentityConsultation } from "./identity-consultation";
import { identityServices, identityValues, identityProcess } from "@/lib/identity-content";
import styles from "./identity-landing.module.css";

const icons = { umbrella: Umbrella, signpost: Signpost, family: UsersRound, shield: ShieldCheck, conversation: MessagesSquare, search: Search, document: FileText };
const pick = (locale: Locale, copy: readonly [string, string]) => copy[locale === "zh" ? 0 : 1];
const Arrow = () => <ArrowUpRight aria-hidden="true" size={18} />;

export function IdentityLanding({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return <div className={styles.page} lang={zh ? "zh-CN" : "en"} data-identity-landing>
    <a className={styles.skipLink} href="#identity-main">{zh ? "跳至正文" : "Skip to content"}</a>
    <SiteHeader locale={locale} page="identity" appearance="v3" />
    <main id="identity-main">
      <section className={styles.hero} aria-labelledby="identity-title">
        <Image className={styles.heroImage} src="/images/identity-v3/identity-hero.png" alt={zh ? "香港维港与家庭眺望未来的品牌场景示意" : "An illustrative family looking over Hong Kong’s Victoria Harbour"} fill priority unoptimized sizes="100vw" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>PHOENIX NOVA™ · IDENTITY</p>
            <p className={styles.columnLabel}>GLOBAL RESIDENCY PLANNING</p>
            <h1 id="identity-title">{zh ? "全球身份规划" : "Global Identity Planning"}</h1>
            {zh ? <><p className={styles.phrase}>阳光下未雨绸缪，<br className={styles.mobileBreak} />风雨中闲庭信步。</p><p className={styles.englishPhrase} lang="en">Prepare in the sunshine.<br className={styles.mobileBreak} /> Walk with confidence through the storm.</p></> : <><p className={styles.phrase}>Prepare in the sunshine.<br />Walk with confidence through the storm.</p><p className={styles.englishPhrase} lang="zh-CN">阳光下未雨绸缪，风雨中闲庭信步。</p></>}
            <div className={styles.heroIntro}><p>{zh ? "在充满变化的时代，提前规划全球身份，为家庭的现在与未来做好准备。" : "In a changing world, plan ahead for your family’s present and future."}</p><p>{zh ? "我们整合多国身份与居留方案，提供专业、合规、个性化的规划建议，让您和家人在全球拥有更多选择，从容应对不确定性，把握更广阔的人生机会。" : "We bring together identity and residency options across destinations, offering personalised planning support with attention to compliance, so your family can understand more choices and approach uncertainty with greater clarity."}</p></div>
            <div className={styles.actions}><Button asChild className={styles.primaryButton}><a href="#identity-services">{zh ? "了解身份规划" : "Explore identity planning"}<Arrow /></a></Button><Button asChild variant="outline" className={styles.secondaryButton}><a href="#consultation">{zh ? "预约咨询准备" : "Prepare a consultation"}<Arrow /></a></Button></div>
          </div>
        </div>
        <span className={styles.imageCaption}>{zh ? "品牌场景示意 · 非实际客户案例" : "Illustrative brand scene · Not a client case"}</span>
      </section>

      <section className={`${styles.section} ${styles.services}`} id="identity-services" aria-labelledby="services-title">
        <div className={styles.container}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>OUR SERVICES</p><h2 id="services-title">{zh ? "一站式全球身份规划服务" : "Connected global identity planning services"}</h2></div><p>{zh ? "围绕个人与家庭的不同阶段需求，提供专业、合规、个性化的身份规划支持。" : "Personalised planning support, shaped around the needs of individuals and families at different stages."}</p></div>
          <div className={styles.serviceGrid}>{identityServices.map((service, index) => <Card className={styles.serviceCard} key={service.id} data-testid="identity-service">
            <div className={styles.serviceImage}><Image src={service.image} alt={pick(locale, service.alt)} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" /></div>
            <CardContent className={styles.serviceContent}><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span><h3>{pick(locale, service.title)}</h3><span className={styles.bilingualTitle} lang={zh ? "en" : "zh-CN"}>{service.title[zh ? 1 : 0]}</span><p>{pick(locale, service.body)}</p><details className={styles.serviceDetails}><summary>{zh ? "了解更多" : "Learn more"}<Arrow /></summary><div><p>{pick(locale, service.detail)}</p><Link href="#consultation">{zh ? "准备一次咨询" : "Prepare a conversation"} ↗</Link></div></details></CardContent>
          </Card>)}</div>
          <p className={styles.boundary}>{zh ? "所有路径均需核实当时政策、个人条件及项目范围，不承诺身份获批、永久居留、审批时限或其他申请结果。" : "Every pathway requires verification of current policy, individual circumstances and service scope. Approval, permanent residence, processing times and application outcomes are not guaranteed."}</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.why}`} aria-labelledby="why-title"><div className={`${styles.container} ${styles.whyGrid}`}>
        <div className={styles.whyIntro}><p className={styles.eyebrow}>WHY IT MATTERS</p><h2 id="why-title">{zh ? <>为什么需要<br />进行全球身份规划？</> : <>Why plan your<br />global identity?</>}</h2><p>{zh ? "在充满不确定性的世界，身份规划不仅是应对变化的保障，更是为家庭创造更多可能性的战略选择。" : "In an uncertain world, identity planning offers a way to understand change and consider more possibilities for your family."}</p><p>{zh ? "提前规划，让未来多一份从容，多一份选择。" : "Plan ahead for more clarity, and more room to choose."}</p><a className={styles.textLink} href="#identity-process">{zh ? "了解服务流程" : "Explore our process"}<Arrow /></a></div>
        <div className={styles.values}>{identityValues.map(value => { const Icon = icons[value.icon]; return <article key={value.icon}><div className={styles.valueIcon}><Icon aria-hidden="true" strokeWidth={1.25} /></div><h3>{pick(locale, value.title)}</h3><p>{pick(locale, value.body)}</p></article>; })}</div>
      </div><p className={`${styles.container} ${styles.boundary}`}>{zh ? "一般身份规划不构成法律、税务、投资或资产配置意见；涉及相关事项，应另行咨询具备相应资质的专业人士。" : "General identity planning is not legal, tax, investment or asset-allocation advice. Seek appropriately qualified professionals for those matters."}</p></section>

      <section className={`${styles.section} ${styles.process}`} id="identity-process" aria-labelledby="process-title"><div className={`${styles.container} ${styles.processGrid}`}>
        <div className={styles.processIntro}><p className={styles.eyebrow}>OUR PROCESS</p><h2 id="process-title">{zh ? "专业的身份规划服务流程" : "A considered planning process"}</h2><p>{zh ? "从需求评估到落地实施，为您提供全程专业支持，让身份规划更清晰、更可行、更安心。" : "From understanding needs to coordinating agreed arrangements, bring greater clarity to each step."}</p><small>{zh ? "以下为服务阶段说明，实际交付以签约范围与授权为准。" : "Stages describe the service approach. Actual delivery depends on agreed scope and authorisation."}</small></div>
        <ol className={styles.steps}>{identityProcess.map((step, index) => { const Icon = icons[step.icon]; return <li key={step.icon} data-testid="identity-step"><span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" strokeWidth={1.4} /><h3>{pick(locale, step.title)}</h3><p>{pick(locale, step.body)}</p><details><summary>{zh ? "阶段说明" : "Stage details"}<span aria-hidden="true">+</span></summary><p>{pick(locale, step.detail)}</p></details></li>; })}</ol>
      </div></section>

      <section className={styles.global} aria-labelledby="global-title">
        <Image src="/images/identity-v3/identity-world.png" alt="" fill unoptimized sizes="100vw" />
        <div className={`${styles.container} ${styles.globalGrid}`}><div className={styles.globalCopy}><p className={styles.eyebrow}>A WORLD OF POSSIBILITIES</p><h2 id="global-title">{zh ? "连接全球机遇" : "Connect with global possibilities"}</h2><h3>{zh ? "为您的家庭创造更广阔的未来。" : "A wider future for your family."}</h3><p>{zh ? "无论是教育、事业、财富配置还是生活方式，我们都致力于为您提供专业的全球规划服务，让您和家人在世界的更多地方，拥有更多可能。" : "From education and work to family protection and ways of living, explore global planning choices with your family’s longer-term goals in view."}</p><Button asChild variant="outline" className={styles.secondaryButton}><a href="#consultation">{zh ? "预约咨询准备" : "Prepare a consultation"}<Arrow /></a></Button></div><div className={styles.destinations}><div className={styles.destinationIcon}><Globe2 size={60} strokeWidth={.8} aria-hidden="true" /><span>GLOBAL CONNECTIONS</span></div><ul>{[["香港", "Hong Kong"], ["英国", "United Kingdom"], ["加拿大", "Canada"], ["澳大利亚", "Australia"], ["新加坡", "Singapore"]].map(([cn,en]) => <li key={en}>{zh ? cn : en}</li>)}</ul><p>{zh ? "仅为规划方向示意，不代表当地办公室、服务资质、合作关系或已经核验的项目。" : "Destinations illustrate planning directions only. They do not imply local offices, qualifications, partnerships or verified programmes."}</p></div></div>
      </section>

      <section className={`${styles.section} ${styles.compass}`} id="identity-compass" aria-labelledby="compass-title"><div className={`${styles.container} ${styles.compassGrid}`}>
        <div className={styles.compassIcon}><Compass aria-hidden="true" size={58} strokeWidth={1} /></div><div><p className={styles.eyebrow}>PHOENIX COMPASS · IDENTITY</p><h2 id="compass-title">{zh ? "先看清方向，再考虑下一步。" : "Understand your direction before the next step."}</h2><p>{zh ? "Identity Compass 身份评估暂未在本官网开放。您可以先了解规划服务，或自愿使用咨询准备入口。" : "The Identity Compass assessment is not open on this website. Explore the services first, or choose to prepare a consultation."}</p><span className={styles.controlled} data-testid="identity-compass-controlled">{zh ? "身份评估 · 受控状态，暂未开放" : "Identity assessment · Controlled, not open"}</span><p className={styles.small}>{zh ? "不生成模拟评估结果，不自动传送个人信息或评估答案。" : "No simulated assessment results are generated. No personal information or assessment answers are transferred automatically."}</p></div><Button asChild className={styles.primaryButton}><a href="#consultation">{zh ? "身份规划咨询准备" : "Prepare an identity consultation"}<Arrow /></a></Button>
      </div></section>

      <section className={`${styles.section} ${styles.consultation}`} id="consultation" aria-labelledby="consultation-title"><div className={`${styles.container} ${styles.consultationGrid}`}>
        <div className={styles.consultationCopy}><p className={styles.eyebrow}>PREPARE FOR YOUR NEXT BEGINNING</p><h2 id="consultation-title">{zh ? <>把未来的选择，<br />从容地放在今天。</> : <>Make room today<br />for tomorrow’s choices.</>}</h2><p>{zh ? "让每个家庭看清方向，让每段成长都有支持。" : "Help every family find direction, and every stage of growth find support."}</p><p>{zh ? "从一个希望进一步了解的问题开始，先确认目标，再讨论合适的服务与下一步。" : "Start with a question you would like to understand. Clarify goals before discussing services and the next step."}</p><div className={styles.consultationBoundary}><ShieldCheck aria-hidden="true" size={22} /><p>{zh ? "正式咨询渠道尚未接通。本区只提供本地准备清单，不提交预约、不建立申请、不上传任何资料。" : "The official consultation channel is not connected. This section offers a local checklist only, without booking, applications or uploads."}</p></div></div><IdentityConsultation locale={locale} />
      </div></section>
      <aside className={styles.brandPromise} aria-label={zh ? "品牌理念" : "Brand philosophy"}><div className={styles.container}><span>{zh ? "承东方之源，启全球新程。" : "Rooted in the East. Opening a global chapter."}</span><span>For Every Beginning.</span><span>{zh ? "每一次启程，都值得更好的未来。" : "Every beginning deserves a better future."}</span></div></aside>
    </main>
    <SiteFooter locale={locale} appearance="v3" />
  </div>;
}
