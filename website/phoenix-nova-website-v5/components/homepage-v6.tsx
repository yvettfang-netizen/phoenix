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
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { localeRouteMap, localizedHref } from "@/lib/locale-navigation";
import { WEALTH_ORIGIN } from "@/lib/wealth-routing";
import { SiteFooter, SiteHeader, type Locale } from "./v5-site";
import styles from "./homepage-v6.module.css";

type Bilingual = readonly [string, string];

function copy(locale: Locale, value: Bilingual) {
  return value[locale === "zh" ? 0 : 1];
}

function Arrow() {
  return <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.8} />;
}

function homepageHref(locale: Locale, id: string, href: string) {
  return id === "wealth" || id === "family-legacy" ? `${WEALTH_ORIGIN}/${locale}` : localizedHref(locale, href);
}

const compassCards: readonly {
  id: "education" | "identity" | "wealth" | "health";
  icon: LucideIcon;
  title: Bilingual;
  description: Bilingual;
  cta: Bilingual;
  image: string;
  href: string;
}[] = [
  {
    id: "education",
    icon: GraduationCap,
    title: ["教育", "Education"],
    description: [
      "从香港到全球，为下一代理清教育成长路径。",
      "Connecting families with clear education pathways in Hong Kong and beyond.",
    ],
    cta: ["探索教育", "Explore Education"],
    image: "/images/education-v3/education-hero.png",
    href: "/education",
  },
  {
    id: "identity",
    icon: Globe2,
    title: ["身份", "Identity"],
    description: [
      "了解香港身份、全球居留及家庭长期生活安排。",
      "Plan Hong Kong and global residency options with confidence.",
    ],
    cta: ["探索身份规划", "Explore Identity"],
    image: "/images/identity-v3/identity-hong-kong.png",
    href: "/identity",
  },
  {
    id: "wealth",
    icon: Landmark,
    title: ["财富", "Wealth"],
    description: [
      "家庭保障与代际传承。受控预览。",
      "Family protection and legacy. Controlled preview.",
    ],
    cta: ["了解财富规划", "Explore Wealth"],
    image: "/images/identity-v3/identity-family.png",
    href: "/compass#wealth",
  },
  {
    id: "health",
    icon: HeartHandshake,
    title: ["健康", "Health"],
    description: [
      "连接大湾区医疗资源与家庭健康协调。",
      "Find coordinated healthcare support across the Greater Bay Area.",
    ],
    cta: ["探索健康服务", "Explore Health"],
    image: "/images/health-v21-communication.jpg",
    href: "/health",
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

const insightTopics: readonly { id: string; title: Bilingual; href: string }[] = [
  { id: "education", title: ["教育与升学", "Education & Admissions"], href: "/education" },
  { id: "identity", title: ["香港身份与全球规划", "Hong Kong Identity & Global Planning"], href: "/identity" },
  { id: "wealth", title: ["家庭财富与家族传承", "Family Wealth & Legacy"], href: "/compass#wealth" },
  { id: "health", title: ["全球健康与跨境医疗", "Global Health & Cross-border Healthcare"], href: "/health" },
];

function CompassHub({ locale }: { locale: Locale }) {
  const zh = locale === "zh";

  return (
    <section className={styles.compassHub} aria-labelledby="compass-hub-heading">
      <div className={styles.container}>
        <header className={styles.compassHubIntro}>
          <p className={styles.eyebrow} lang="en">Phoenix Compass™</p>
          <h2 id="compass-hub-heading">{copy(locale, ["四大罗盘 · 全链协同", "Four Compasses, One Family Center"])}</h2>
          <p className={styles.sectionLead}>{copy(locale, [
            "教育、身份、财富与健康，协同支持家庭的长期规划。",
            "Education, identity, wealth and health come together to support long-term family planning.",
          ])}</p>
        </header>

        <div className={styles.compassMap}>
          <svg className={styles.compassArcs} viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path
              className={styles.desktopArcs}
              vectorEffect="non-scaling-stroke"
              d="M100 73 C180 73 194 151 300 160 M100 247 C180 247 194 169 300 160 M500 73 C420 73 406 151 300 160 M500 247 C420 247 406 169 300 160"
            />
            <path
              className={styles.mobileArcs}
              vectorEffect="non-scaling-stroke"
              d="M150 49 C150 104 234 111 300 160 M450 49 C450 104 366 111 300 160 M150 271 C150 216 234 209 300 160 M450 271 C450 216 366 209 300 160"
            />
          </svg>

          {compassCards.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={`${styles.compassDial} ${styles[`domain--${item.id}`]}`}
                style={{ gridArea: item.id }}
                href={homepageHref(locale, item.id, item.href)}
                key={item.id}
                data-v6-dial={item.id}
              >
                <span className={styles.dialContent}>
                  <Icon aria-hidden="true" strokeWidth={1.4} />
                  <strong>{zh ? `${item.title[0]}罗盘` : item.title[1]}</strong>
                  <span lang="en">{zh ? `${item.title[1]} Compass` : "Compass"}</span>
                </span>
              </Link>
            );
          })}

          <Link className={styles.familyHouse} href={localizedHref(locale, localeRouteMap.family)} data-v6-family-os>
            <strong>{copy(locale, ["家庭中心", "Family Center"])}</strong>
            <span lang="en">Family OS <ArrowUpRight aria-hidden="true" size={12} /></span>
          </Link>
        </div>
      </div>
    </section>
  );
}

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
                  <Link className={`${styles.compassCard} ${styles[`domain--${item.id}`]}`} href={homepageHref(locale, item.id, item.href)} key={item.id} data-v6-compass={item.id}>
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
                  <Link className={styles.journeyItem} href={homepageHref(locale, item.id, item.href)} key={item.id} data-v6-journey={item.id}>
                    <Icon aria-hidden="true" size={28} strokeWidth={1.3} />
                    <strong>{copy(locale, item.title)}</strong>
                    <span>{copy(locale, item.description)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        <CompassHub locale={locale} />

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
                  <Link className={styles.insightTopic} href={homepageHref(locale, topic.id, topic.href)} key={topic.id}>
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
