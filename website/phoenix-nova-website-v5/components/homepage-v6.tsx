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
import { localizedHref } from "@/lib/locale-navigation";
import { SiteFooter, SiteHeader, type Locale } from "./v5-site";
import styles from "./homepage-v6.module.css";

type Bilingual = readonly [string, string];

function copy(locale: Locale, value: Bilingual) {
  return value[locale === "zh" ? 0 : 1];
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
  cta: Bilingual;
  image: string;
  href: string;
  tone: "education" | "identity" | "wealth" | "health";
}[] = [
  {
    id: "education",
    icon: GraduationCap,
    title: ["教育", "Education"],
    label: ["连接香港与全球教育资源", "Learning pathways from Hong Kong to the world"],
    description: [
      "从香港到全球，为下一代理清教育成长路径。",
      "Connecting families with clear education pathways in Hong Kong and beyond.",
    ],
    cta: ["探索教育", "Explore Education"],
    image: "/images/education-v3/education-hero.png",
    href: "/education",
    tone: "education",
  },
  {
    id: "identity",
    icon: Globe2,
    title: ["身份", "Identity"],
    label: ["阳光下未雨绸缪，风雨中闲庭信步。", "Prepare in the sunshine. Move forward with confidence through every storm."],
    description: [
      "了解香港身份、全球居留及家庭长期生活安排。",
      "Plan Hong Kong and global residency options with confidence.",
    ],
    cta: ["探索身份规划", "Explore Identity"],
    image: "/images/identity-v3/identity-hong-kong.png",
    href: "/identity",
    tone: "identity",
  },
  {
    id: "wealth",
    icon: Landmark,
    title: ["财富", "Wealth"],
    label: ["守护当下，传承未来。", "Preserve Today, Create a Lasting Tomorrow."],
    description: [
      "家庭保障与代际传承。受控预览。",
      "Family protection and legacy. Controlled preview.",
    ],
    cta: ["了解财富规划", "Explore Wealth"],
    image: "/images/identity-v3/identity-family.png",
    href: "/compass#wealth",
    tone: "wealth",
  },
  {
    id: "health",
    icon: HeartHandshake,
    title: ["健康", "Health"],
    label: ["让医疗资源更清晰、更可及。", "Healthcare coordination for families across the Greater Bay Area."],
    description: [
      "连接大湾区医疗资源与家庭健康协调。",
      "Find coordinated healthcare support across the Greater Bay Area.",
    ],
    cta: ["探索健康服务", "Explore Health"],
    image: "/images/health-v21-communication.jpg",
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
  { id: "next-generation", icon: GraduationCap, title: ["下一代成长", "Next Generation"], description: ["释放潜能，拓宽视野。", "Learning for a wider world."], href: "/education" },
  { id: "hong-kong", icon: Globe2, title: ["来港启程", "A Hong Kong Beginning"], description: ["连接家庭与全球选择。", "Settle with confidence."], href: "/identity" },
  { id: "family-protection", icon: ShieldCheck, title: ["家庭保障", "Family Protection"], description: ["为重要阶段预留支持。", "Support for each stage."], href: "/health" },
  { id: "business-growth", icon: Building2, title: ["企业发展", "Business Development"], description: ["让事业与家庭共同前行。", "Business and family together."], href: "/identity#consultation" },
  { id: "global-planning", icon: Compass, title: ["全球规划", "Global Planning"], description: ["把选择放进长期视野。", "See the wider possibilities."], href: "/compass" },
  { id: "family-legacy", icon: Landmark, title: ["家族传承", "Family Legacy"], description: ["以共识连接代际未来。", "Connect the generations."], href: "/compass#wealth" },
];

const connectionItems: readonly { icon: LucideIcon; title: Bilingual; body: Bilingual }[] = [
  { icon: Sparkles, title: ["智能赋能", "AI Insights"], body: ["理解复杂信息，保留人的判断。", "Clearer information, with human judgement."] },
  { icon: Globe2, title: ["全球资源", "Global Resources"], body: ["连接四大领域的专业资源。", "Professional resources across four fields."] },
  { icon: UsersRound, title: ["专业服务", "Expert Support"], body: ["在明确范围内协调专业支持。", "Coordinated support within an agreed scope."] },
  { icon: Layers3, title: ["持续管理", "Continuity"], body: ["有序记录规划、进度与后续。", "Organise plans, progress and next steps."] },
];

const familyOsItems: readonly Bilingual[] = [
  ["我的家庭", "My Family"],
  ["我的规划", "My Plans"],
  ["我的服务", "My Services"],
  ["我的成长", "My Growth"],
];

const insightTopics: readonly { id: string; title: Bilingual; href: string }[] = [
  { id: "education", title: ["教育与升学", "Education & Admissions"], href: "/education" },
  { id: "identity", title: ["香港身份与全球规划", "Hong Kong Identity & Global Planning"], href: "/identity" },
  { id: "wealth", title: ["家庭财富与家族传承", "Family Wealth & Legacy"], href: "/compass#wealth" },
  { id: "health", title: ["全球健康与跨境医疗", "Global Health & Cross-border Healthcare"], href: "/health" },
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
              <p className={styles.heroEyebrow}>{copy(locale, ["凤启环球", "PHOENIX NOVA™"])}</p>
              <h1 id="homepage-v6-title">{copy(locale, ["全球家庭成长平台", "A Global Family Growth Platform"])}</h1>
              <p className={styles.heroSubtitle}>{copy(locale, ["以教育、身份、财富与健康，陪伴家庭的每一个重要阶段。", "Supporting every important stage of family life through Education, Identity, Wealth and Health."])}</p>
              <p className={styles.heroTagline}>{copy(locale, ["让科技更有温度，让家庭成长更有方向。", "Technology with warmth. A clearer direction for every family."])}</p>
              <div className={styles.heroActions}>
                <Link className={styles.buttonPrimary} href={localizedHref(locale, "/compass")}>
                  {copy(locale, ["开启家庭成长旅程", "Start Your Family Journey"])} <Arrow />
                </Link>
                <Link className={styles.buttonSecondary} href={localizedHref(locale, "/about")}>
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
                <h2 id="compass-heading">{copy(locale, ["四大专业领域", "Four Areas of Expertise"])}</h2>
                <p className={styles.sectionLead}>{copy(locale, ["从教育成长、国际身份、财富规划到健康守护，为家庭提供系统、专业和长期的支持。", "Four connected fields. One family journey."])}</p>
              </div>
              <Link className={styles.textLink} href={localizedHref(locale, "/compass")}>
                {copy(locale, ["了解凤启罗盘", "Explore Phoenix Compass"])} <Arrow />
              </Link>
            </header>

            <div className={styles.compassGrid}>
              {compassCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Link className={`${styles.compassCard} ${styles[`compassCard--${item.tone}`]}`} href={localizedHref(locale, item.href)} key={item.id} data-v6-compass={item.id}>
                    <div className={styles.compassVisual}>
                      <Image src={item.image} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" unoptimized />
                      <span className={styles.compassBadge}><Icon aria-hidden="true" size={22} strokeWidth={1.5} />{copy(locale, item.title)}</span>
                      <span className={styles.compassArrow}><Arrow /></span>
                    </div>
                    <div className={styles.compassBody}>
                      <p>{copy(locale, item.description)}</p>
                      <span className={styles.compassCardCta}>{copy(locale, item.cta)} <Arrow /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.journeySection}`} aria-labelledby="journey-heading">
          <div className={styles.container}>
            <header className={styles.sectionHeaderCompact}>
              <div>
                <h2 id="journey-heading">{copy(locale, ["六大人生旅程", "Six Life Journeys"])}</h2>
              </div>
              <p>{copy(locale, ["每一个阶段，都值得被认真看见。", "A clearer direction at every stage."])}</p>
            </header>
            <nav className={styles.journeyGrid} aria-label={copy(locale, ["六大人生旅程", "Six life journeys"])}>
              {journeyItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link className={styles.journeyItem} href={localizedHref(locale, item.href)} key={item.id} data-v6-journey={item.id}>
                    <Icon aria-hidden="true" size={28} strokeWidth={1.3} />
                    <strong>{copy(locale, item.title)}</strong>
                    <span>{copy(locale, item.description)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        <section className={styles.connections} aria-labelledby="connections-heading">
          <div className={styles.container}>
            <div className={styles.connectionsIntro}>
              <h2 id="connections-heading">{copy(locale, ["凤启如何连接全球资源", "How Phoenix Connects Global Resources"])}</h2>
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
            <div className={styles.familyVisual} aria-hidden="true"><span>{copy(locale, ["凤启家序", "PHOENIX FAMILY OS"])}</span><div className={styles.familyOrb} /></div>
            <div className={styles.familyCopy}>
              <h2 id="family-os-heading">{copy(locale, ["凤启家序｜家庭成长中心", "One Family. One Connected Growth Journey."])}</h2>
              <p>{copy(locale, ["从家庭目标、重要节点到已授权的服务进度，为家庭协作保留统一入口。", "Phoenix Family OS provides a dedicated space to organise family goals, plans and authorised service progress."])}</p>
              <ul className={styles.familyMiniNav} aria-label={copy(locale, ["家庭中心预览栏目", "Family Center preview areas"])}>
                {familyOsItems.map((item) => <li key={item[0]}>{copy(locale, item)}</li>)}
              </ul>
              <div className={styles.familyActions}>
              <span className={styles.previewNotice}>{copy(locale, ["预览／即将开放", "Preview / Coming Soon"])}</span>
              <Link className={styles.textLink} href={localizedHref(locale, "/account")}>
                {copy(locale, ["进入家庭中心", "Enter Family Center"])} <Arrow />
              </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.ecosystemSection}`} aria-labelledby="learning-heading">
          <div className={`${styles.container} ${styles.ecosystemGrid}`}>
            <div className={styles.learningPanel}>
              <header className={styles.sectionHeaderCompact}>
                <div><h2 id="learning-heading">{copy(locale, ["教育与学习生态", "Education & Learning"])}</h2></div>
              </header>
              <div className={styles.learningGrid}>
                <Link className={`${styles.learningCard} ${styles.learningCardAcademy}`} href={localizedHref(locale, "/education#academy")}>
                  <BookOpen aria-hidden="true" size={30} strokeWidth={1.2} />
                  <div><span>{copy(locale, ["课程与导师", "PHOENIX ACADEMY™"])}</span><h3>{copy(locale, ["凤启学苑", "Phoenix Academy"])}</h3><p>{copy(locale, ["课程、导师与持续学习支持。预览／即将开放。", "Courses, mentors and continuous learning support. Preview / Coming Soon."])}</p></div><Arrow />
                </Link>
                <Link className={`${styles.learningCard} ${styles.learningCardAskwise}`} href={localizedHref(locale, "/education#askwise")}>
                  <Sparkles aria-hidden="true" size={30} strokeWidth={1.2} />
                  <div><span>ASKWISE™</span><h3>{copy(locale, ["智能学习支持", "ASKWISE™"])} </h3><p>{copy(locale, ["帮助学生理解、练习与复盘。预览／即将开放。", "AI-assisted structured learning, practice and reflection. Preview / Coming Soon."])}</p></div><Arrow />
                </Link>
              </div>
            </div>

            <div className={styles.insightsPanel}>
              <header className={styles.sectionHeaderCompact}>
                <div><h2 id="insights-heading">{copy(locale, ["凤启洞察", "Phoenix Insights"])}</h2></div>
                <p>{copy(locale, ["全球视野 · 政策动态 · 深度解读。", "Global Perspectives. Policy Updates. In-depth Knowledge."])}</p>
              </header>
              <nav className={styles.insightTopicList} aria-label={copy(locale, ["凤启洞察内容方向", "Phoenix Insights topics"])}>
                {insightTopics.map((topic) => (
                  <Link className={styles.insightTopic} href={localizedHref(locale, topic.href)} key={topic.id}>
                    {copy(locale, topic.title)} <Arrow />
                  </Link>
                ))}
              </nav>
              <p className={styles.insightComingSoon}>{copy(locale, ["精选内容即将上线。", "Editorial selection coming soon."])}</p>
              <Link className={styles.textLink} href={localizedHref(locale, "/insights")}>
                {copy(locale, ["进入凤启洞察", "Explore Phoenix Insights"])} <Arrow />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} appearance="v3" compact consultationPath="/education#consultation" />
    </div>
  );
}
