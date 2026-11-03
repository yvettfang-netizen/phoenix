import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Compass,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Layers3,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { SiteFooter, SiteHeader, type Locale } from "./v5-site";
import { HealthCompassEntry } from "./health-compass-entry";
import styles from "./homepage-v6.module.css";

type Bilingual = readonly [string, string];

function copy(locale: Locale, value: Bilingual) {
  return value[locale === "zh" ? 0 : 1];
}

function localHref(locale: Locale, path: string) {
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

function Arrow() {
  return <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.8} />;
}

const compassCards: readonly {
  id: string;
  icon: LucideIcon;
  title: Bilingual;
  label: Bilingual;
  description: Bilingual;
  image: string;
  href: string;
  tone: "education" | "identity" | "wealth" | "health";
}[] = [
  {
    id: "education",
    icon: GraduationCap,
    title: ["教育", "Education"],
    label: ["全球教育规划与成长支持", "Global education planning and growth support"],
    description: ["连接香港及全球教育资源，从幼儿园、中小学到大学与研究生升学，为下一代建立更清晰、更有方向的成长路径。", "Connect Hong Kong and global education resources, from kindergarten and schools to university and postgraduate study, shaping a clearer growth pathway for the next generation."],
    image: "/images/education-v3/education-hero.png",
    href: "/education",
    tone: "education",
  },
  {
    id: "identity",
    icon: Globe2,
    title: ["身份", "Identity"],
    label: ["阳光下未雨绸缪，风雨中闲庭信步。", "Prepare in the sunshine. Walk with confidence through the storm."],
    description: ["围绕家庭长期生活与全球发展需求，了解香港身份、全球居留及精选投资入籍信息与规划方向。", "Explore Hong Kong identity, global residency and selected citizenship-by-investment information in the context of family life and long-term global development."],
    image: "/images/identity-v3/identity-global.png",
    href: "/identity",
    tone: "identity",
  },
  {
    id: "wealth",
    icon: Landmark,
    title: ["财富", "Wealth"],
    label: ["守护当下，传承未来。", "Protect today. Carry the future forward."],
    description: ["从家庭财富结构出发，连接全球视野与专业资源，关注资产安排、风险保障与家族传承。财富入口为受控预览。", "Explore asset arrangements, risk protection and family legacy through a global perspective on your family's wealth structure. Wealth is a controlled preview."],
    image: "/images/phoenix-compass-hero.png",
    href: "/compass#wealth",
    tone: "wealth",
  },
  {
    id: "health",
    icon: HeartHandshake,
    title: ["健康", "Health"],
    label: ["家庭健康规划与长期陪伴", "Family health planning and continuity"],
    description: ["了解香港、深圳及粤港澳大湾区医疗资源，为国内外家庭梳理家庭健康规划、来华就医及跨境医疗协调需求。", "Explore Hong Kong, Shenzhen and Greater Bay Area healthcare resources, family health planning and coordination needs for international visitors and overseas Chinese returning to China."],
    image: "/images/health-v2-landscape.png",
    href: "/health",
    tone: "health",
  },
];

const journeyItems: readonly {
  id: string;
  icon: LucideIcon;
  title: Bilingual;
  description: Bilingual;
  href: string;
}[] = [
  { id: "next-generation", icon: GraduationCap, title: ["下一代成长", "Next generation"], description: ["释放潜能，拓宽视野", "Unlock potential and widen horizons"], href: "/education" },
  { id: "hong-kong", icon: Globe2, title: ["来港启程", "Hong Kong pathway"], description: ["连接家庭与全球选择", "Connect family and global choices"], href: "/identity" },
  { id: "family-protection", icon: ShieldCheck, title: ["家庭保障", "Family protection"], description: ["为重要阶段预留支持", "Keep support ready for important stages"], href: "/health" },
  { id: "business-growth", icon: Building2, title: ["企业发展", "Business growth"], description: ["让事业与家庭共同前行", "Let work and family grow together"], href: "/identity#consultation" },
  { id: "global-planning", icon: Compass, title: ["全球规划", "Global planning"], description: ["把选择放进长期视野", "Place choices in a long-term view"], href: "/compass" },
  { id: "family-legacy", icon: Landmark, title: ["家族传承", "Family legacy"], description: ["以共识连接代际未来", "Connect generations through shared direction"], href: "/compass#wealth" },
];

const connectionItems: readonly { icon: LucideIcon; title: Bilingual; body: Bilingual }[] = [
  { icon: Sparkles, title: ["智能赋能", "Intelligent enablement"], body: ["让复杂信息更容易理解，也让专业判断保留人的温度。", "Make complex information easier to understand while keeping human judgement at the centre."] },
  { icon: Globe2, title: ["全球资源", "Global resources"], body: ["连接教育、身份、财富与健康相关的公开资源与专业支持。", "Connect families with public resources and professional support across education, identity, wealth and health."] },
  { icon: UsersRound, title: ["专业服务", "Professional support"], body: ["在明确范围内协调值得信任的专业沟通与下一步。", "Coordinate trusted professional conversations and next steps within a clear scope."] },
  { icon: Layers3, title: ["持续管理", "Continuing management"], body: ["把重要事项整理成家庭可以回顾和持续行动的节奏。", "Turn important matters into a rhythm the family can review and act on over time."] },
];

const familyOsItems: readonly Bilingual[] = [
  ["我的家庭", "My family"],
  ["我的规划", "My planning"],
  ["我的服务", "My services"],
  ["我的成长", "My growth"],
];

export function HomepageV6({ locale }: { locale: Locale }) {
  const zh = locale === "zh";

  return (
    <div className={styles.page} lang={zh ? "zh-CN" : "en"} data-homepage-v6>
      <SiteHeader locale={locale} page="home" appearance="v3" />

      <main>
        <section className={styles.hero} aria-labelledby="homepage-v6-title">
          <Image
            className={styles.heroImage}
            src="/images/homepage-v6-family.png"
            alt={copy(locale, ["夕阳下的海湾城市与跨代家庭", "A multigenerational family beside a harbour city at sunset"])}
            fill
            priority
            sizes="100vw"
            unoptimized
          />
          <div className={styles.heroShade} />
          <div className={`${styles.container} ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>{copy(locale, ["凤启环球 · 全球家庭成长平台", "PHOENIX NOVA™ · GLOBAL FAMILY GROWTH PLATFORM"])}</p>
              <h1 id="homepage-v6-title">{copy(locale, ["全球家庭成长平台", "A Global Family Growth Platform"])}</h1>
              <p className={styles.heroSubtitle}>{copy(locale, ["以教育、身份、财富与健康，陪伴家庭的每一个重要阶段。", "For education, identity, wealth and health, we accompany families through every important stage."])}</p>
              <p className={styles.heroTagline}>{copy(locale, ["让科技更有温度，让家庭成长更有方向。", "Technology with warmth. Family growth with direction."])}</p>
              <div className={styles.heroActions}>
                <Link className={styles.buttonPrimary} href={localHref(locale, "/compass")}>
                  {copy(locale, ["开启家庭成长旅程", "Begin the family journey"])} <Arrow />
                </Link>
                <Link className={styles.buttonSecondary} href={localHref(locale, "/about")}>
                  {copy(locale, ["了解凤启环球", "Discover Phoenix Nova"])} <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.compassSection}`} aria-labelledby="compass-heading">
          <div className={styles.container}>
            <header className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{copy(locale, ["四大专业领域", "FOUR COMPASSES"])}</p>
                <h2 id="compass-heading">{copy(locale, ["从家庭当下出发，走向更大的世界。", "Start with your family today. Grow into a wider world."])}</h2>
                <p className={styles.sectionLead}>{copy(locale, ["四个平等而相连的专业领域，帮助家庭把选择、规划与长期成长放在同一张地图上。", "Four equal, connected fields help families place choices, planning and long-term growth on one map."])}</p>
              </div>
              <Link className={styles.textLink} href={localHref(locale, "/compass")}>
                {copy(locale, ["了解凤启罗盘", "Explore Phoenix Compass"])} <Arrow />
              </Link>
            </header>

            <div className={styles.compassGrid}>
              {compassCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Link className={`${styles.compassCard} ${styles[`compassCard--${item.tone}`]}`} href={localHref(locale, item.href)} key={item.id} data-v6-compass={item.id}>
                    <div className={styles.compassVisual}>
                      <Image src={item.image} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" unoptimized />
                      <span className={styles.compassBadge}><Icon aria-hidden="true" size={22} strokeWidth={1.5} />{copy(locale, item.title)}</span>
                      <span className={styles.compassArrow}><Arrow /></span>
                    </div>
                    <div className={styles.compassBody}>
                      <span>{copy(locale, item.label)}</span>
                      <p>{copy(locale, item.description)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <HealthCompassEntry locale={locale} />
        <section className={`${styles.section} ${styles.journeySection}`} aria-labelledby="journey-heading">
          <div className={styles.container}>
            <header className={styles.sectionHeaderCompact}>
              <div>
                <p className={styles.eyebrow}>{copy(locale, ["六大人生旅程", "SIX LIFE JOURNEYS"])}</p>
                <h2 id="journey-heading">{copy(locale, ["每一个阶段，都值得被认真看见。", "Every stage deserves to be seen clearly."])}</h2>
              </div>
              <p>{copy(locale, ["从孩子的成长到家族的长期安排，选择一个最接近当下的入口。", "From a child's growth to a family's long-term arrangements, choose the doorway closest to today."])}</p>
            </header>
            <nav className={styles.journeyGrid} aria-label={copy(locale, ["六大人生旅程", "Six life journeys"])}>
              {journeyItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link className={styles.journeyItem} href={localHref(locale, item.href)} key={item.id} data-v6-journey={item.id}>
                    <Icon aria-hidden="true" size={28} strokeWidth={1.3} />
                    <strong>{copy(locale, item.title)}</strong>
                    <span>{copy(locale, item.description)}</span>
                    <Arrow />
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        <section className={styles.connections} aria-labelledby="connections-heading">
          <div className={styles.container}>
            <div className={styles.connectionsIntro}>
              <p className={styles.eyebrow}>{copy(locale, ["凤启如何连接全球资源", "HOW PHOENIX NOVA CONNECTS"])}</p>
              <h2 id="connections-heading">{copy(locale, ["让专业资源，成为家庭坚定的后盾。", "Let professional resources become a steady support for your family."])}</h2>
            </div>
            <div className={styles.connectionGrid}>
              {connectionItems.map((item) => {
                const Icon = item.icon;
                return <article className={styles.connectionItem} key={item.title[0]}><Icon aria-hidden="true" size={30} strokeWidth={1.25} /><h3>{copy(locale, item.title)}</h3><p>{copy(locale, item.body)}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.familySection}`} aria-labelledby="family-os-heading">
          <div className={`${styles.container} ${styles.familyGrid}`}>
            <div className={styles.familyVisual} aria-hidden="true"><span>{copy(locale, ["凤启家序", "FAMILY OS"])}</span><div className={styles.familyOrb} /></div>
            <div className={styles.familyCopy}>
              <p className={styles.eyebrow}>{copy(locale, ["凤启家序", "PHOENIX FAMILY OS"])}</p>
              <h2 id="family-os-heading">{copy(locale, ["把家庭的成长，整理成可以同行的长期旅程。", "Turn family growth into a journey you can take together."])}</h2>
              <p>{copy(locale, ["从家庭目标、重要节点到已授权的服务进度，凤启家序为未来的家庭协作保留统一入口。当前页面仅提供受控预览，不自动创建家庭、成员或服务记录。", "From family goals and important milestones to authorised service progress, Family OS is intended as one place for family collaboration. This page is a controlled preview and does not create family, member or service records automatically."])}</p>
              <ul className={styles.familyMiniNav} aria-label={copy(locale, ["家庭中心预览栏目", "Family Center preview areas"])}>
                {familyOsItems.map((item, index) => <li key={item[0]}><span>0{index + 1}</span>{copy(locale, item)}</li>)}
              </ul>
              <Link className={styles.textLink} href={localHref(locale, "/account")}>
                {copy(locale, ["进入家庭中心 · 受控入口", "Open Family Center · Controlled entry"])} <Arrow />
              </Link>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.learningSection}`} aria-labelledby="learning-heading">
          <div className={styles.container}>
            <header className={styles.sectionHeaderCompact}>
              <div><p className={styles.eyebrow}>{copy(locale, ["教育与学习生态", "EDUCATION & LEARNING ECOSYSTEM"])}</p><h2 id="learning-heading">{copy(locale, ["为每一种成长方式，留下清晰的入口。", "A clear doorway for every way of learning."])}</h2></div>
              <p>{copy(locale, ["凤启学苑与 ASKWISE 是教育专业领域中的不同产品方向，均以公开介绍和受控入口为准。", "Phoenix Academy and ASKWISE are distinct product directions within Education, presented through public information and controlled entry points."])}</p>
            </header>
            <div className={styles.learningGrid}>
              <Link className={`${styles.learningCard} ${styles.learningCardAcademy}`} href={localHref(locale, "/education#academy")}>
                <BookOpen aria-hidden="true" size={32} strokeWidth={1.2} />
                <div><span>{copy(locale, ["课程与导师", "PHOENIX ACADEMY™"])}</span><h3>{copy(locale, ["凤启学苑", "Phoenix Academy"])} </h3><p>{copy(locale, ["课程、导师与持续学习支持。", "Courses, tutors and continuing learning support."])}</p></div><Arrow />
              </Link>
              <Link className={`${styles.learningCard} ${styles.learningCardAskwise}`} href={localHref(locale, "/education#askwise")}>
                <Sparkles aria-hidden="true" size={32} strokeWidth={1.2} />
                <div><span>ASKWISE™</span><h3>{copy(locale, ["智能学习支持", "Intelligent learning support"])} </h3><p>{copy(locale, ["帮助学生理解、练习与复盘，公开能力介绍暂不等同于开放服务。", "Help learners understand, practise and reflect; this public capability introduction is not an open service."])}</p></div><Arrow />
              </Link>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.insightsSection}`} aria-labelledby="insights-heading">
          <div className={`${styles.container} ${styles.insightsLayout}`}>
            <div><p className={styles.eyebrow}>{copy(locale, ["凤启洞察", "PHOENIX INSIGHTS"])}</p><h2 id="insights-heading">{copy(locale, ["在行动之前，先把世界看清一点。", "Before acting, see the world a little more clearly."])}</h2></div>
            <div className={styles.insightsCard}><span>{copy(locale, ["家庭 · 香港 · 长期成长", "Family · Hong Kong · Long-term growth"])}</span><p>{copy(locale, ["阅读围绕家庭、香港与长期成长的专题内容。公开内容以实际页面为准，不虚构文章日期或发布状态。", "Read editorial perspectives on family, Hong Kong and long-term growth. Public content follows the live Insights page; no article dates or publication status are invented here."])}</p><Link className={styles.textLink} href={localHref(locale, "/insights")}>{copy(locale, ["进入凤启洞察", "Explore Phoenix Insights"])} <Arrow /></Link></div>
          </div>
        </section>

        <section className={styles.story} aria-labelledby="story-heading">
          <div className={styles.container}>
            <div className={styles.storyInner}><p className={styles.eyebrow}>{copy(locale, ["每一次启程", "FOR EVERY BEGINNING."])}</p><h2 id="story-heading">{copy(locale, ["每一次启程，都值得更好的未来。", "Every beginning deserves a better future."])}</h2><Link className={styles.buttonGold} href={localHref(locale, "/about")}>{copy(locale, ["了解我们的故事", "Our story"])} <Arrow /></Link></div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} appearance="v3" consultationPath="/education#consultation" />
    </div>
  );
}
