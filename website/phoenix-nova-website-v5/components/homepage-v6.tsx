import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Coins,
  Compass,
  Globe2,
  GraduationCap,
  HeartPulse,
  IdCard,
  Landmark,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { familyCenterEntryPath, localizedHref, publicProductHref } from "@/lib/locale-navigation";
import { publicFamilyDemoEnabled } from "@/lib/public-family-demo";
import { WEALTH_ORIGIN } from "@/lib/wealth-routing";
import { SiteFooter, SiteHeader, type Locale } from "./v5-site";
import { homepageInsights } from "./homepage-insights";
import styles from "./homepage-v6.module.css";

type Bilingual = readonly [string, string];

const heroAssets = "/images/homepage-optimized/v1";
const heroSrcSet = [690, 960, 1440, 1920].map((width) => `${heroAssets}/hero-${width}.webp ${width}w`).join(", ");

function copy(locale: Locale, value: Bilingual) {
  return value[locale === "zh" ? 0 : 1];
}

function Arrow() {
  return <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.8} />;
}

function homepageHref(locale: Locale, id: string, href: string) {
  return id === "wealth" || id === "family-legacy" ? `${WEALTH_ORIGIN}/${locale}` : publicProductHref(locale, href);
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
    icon: IdCard,
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
    icon: Coins,
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
    icon: HeartPulse,
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

const academyTopics: readonly Bilingual[] = [
  ["学习规划", "Learning planning"],
  ["全球升学", "Global admissions"],
  ["学术能力提升", "Academic development"],
  ["AI 与未来素养", "AI & future skills"],
  ["家庭与成长课堂", "Family learning"],
];

function FamilyHouseArtwork() {
  return (
    <svg className={styles.houseArt} viewBox="0 0 140 130" fill="none" aria-hidden="true">
      <ellipse cx="70" cy="115" rx="66" ry="12" fill="#d6b980" />
      <ellipse cx="70" cy="111" rx="66" ry="11" fill="#fff3dc" />
      <path d="M19 54 70 13l51 41v55H19Z" fill="#f8e7c8" stroke="var(--v6-gold)" />
      <path d="M108 45l13 9v55h-13Z" fill="#e7cfa6" />
      <path d="M12 58 70 12l58 46" stroke="var(--v6-teal)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M63 40h6v6h-6zm8 0h6v6h-6zm-8 8h6v6h-6zm8 0h6v6h-6z" fill="#a77837" />
    </svg>
  );
}

function CompassHub({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const familyDemo = publicFamilyDemoEnabled();
  const FamilyCenterLink = familyDemo ? "a" : Link;

  return (
    <section className={styles.compassHub} aria-labelledby="compass-hub-heading">
      <div className={`${styles.container} ${styles.compassHubLayout}`}>
        <header className={styles.compassHubIntro}>
          <p className={styles.eyebrow} lang="en">Phoenix Compass™</p>
          <h2 id="compass-hub-heading">{zh
            ? <><span>四大罗盘</span>{" "}<span className={styles.hubTitleDot}>·</span>{" "}<span>全链协同</span></>
            : "Four Compasses, One Family Center"}</h2>
          <p className={styles.sectionLead}>{copy(locale, [
            "教育、身份、财富与健康，协同支持家庭的长期规划与成长。",
            "Education, identity, wealth and health come together to support long-term family planning and growth.",
          ])}</p>
          <p className={styles.hubFamilyNote}>{copy(locale, ["在家庭中心统筹目标、服务授权和进度。", "Manage goals, service permissions and progress in Family OS."])}</p>
        </header>

        <div className={styles.compassMap}>
          <svg className={styles.compassArcs} viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path
              className={styles.desktopArcs}
              vectorEffect="non-scaling-stroke"
              d="M100 78 C177 29 217 69 300 150 M100 242 C173 277 205 195 300 174 M500 78 C423 29 383 69 300 150 M500 242 C427 277 395 195 300 174"
            />
            <path
              className={styles.mobileArcs}
              vectorEffect="non-scaling-stroke"
              d="M100 78 C174 78 210 146 300 155 M500 78 C426 78 390 146 300 155 M100 242 C174 242 210 174 300 165 M500 242 C426 242 390 174 300 165"
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
                <span className={styles.dialNorth} aria-hidden="true" />
                <span className={styles.dialContent}>
                  <Icon aria-hidden="true" strokeWidth={1.35} />
                  <strong>{zh ? `${item.title[0]}罗盘` : item.title[1]}</strong>
                  <span lang="en">{zh ? `${item.title[1]} Compass` : "Compass"}</span>
                </span>
              </Link>
            );
          })}

          <FamilyCenterLink
            className={styles.familyHouse}
            href={localizedHref(locale, familyCenterEntryPath(familyDemo))}
            aria-label={copy(locale, familyDemo ? ["体验家庭中心 · Family OS", "Explore the Family Center Demo · Family OS"] : ["进入家庭中心 · Family OS", "Enter Family Center · Family OS"])}
            data-v6-family-os
          >
            <FamilyHouseArtwork />
            <span className={styles.houseLabel}>
              <strong>{copy(locale, ["家庭中心", "Family Center"])}</strong>
              <span lang="en">Family OS <ArrowUpRight aria-hidden="true" size={12} /></span>
            </span>
          </FamilyCenterLink>
        </div>
      </div>
    </section>
  );
}

export function HomepageV6({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <div className={styles.page} lang={zh ? "zh-CN" : "en"} data-homepage-v6>
      <SiteHeader locale={locale} page="home" appearance="v3" optimizedBrand />

      <main>
        <section className={styles.hero} aria-labelledby="homepage-v6-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.heroImage}
            src={`${heroAssets}/hero-960.webp`}
            srcSet={heroSrcSet}
            sizes="(max-width: 700px) 690px, (max-width: 1180px) 100vw, 64vw"
            width={960}
            height={320}
            alt={copy(locale, ["夕阳下的海湾城市与跨代家庭", "A multigenerational family beside a harbour city at sunset"])}
            loading="eager"
            fetchPriority="high"
            decoding="async"
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
                    </div>
                    <div className={styles.compassBody}>
                      <h3><Icon aria-hidden="true" size={21} strokeWidth={1.35} />{copy(locale, item.title)}</h3>
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

        <section className={`${styles.section} ${styles.learningSection}`} aria-labelledby="learning-heading">
          <div className={styles.container}>
            <header className={styles.sectionHeader}>
              <div>
                {zh && <p className={styles.eyebrow} lang="en">Phoenix Academy</p>}
                <h2 id="learning-heading">{copy(locale, ["启明堂 · 凤启学苑", "Phoenix Academy · Qiming Hall"])}</h2>
              </div>
            </header>
            <div className={styles.learningGrid}>
              <Link className={styles.learningCard} href={publicProductHref(locale, "/education#academy")} data-v6-learning="academy">
                <div className={styles.learningPhoto}><Image src="/images/education-v3/education-academy.png" alt="" fill unoptimized sizes="(max-width: 700px) 94vw, 25vw" /></div>
                <div className={styles.learningCopy}>
                  <h3><BookOpen aria-hidden="true" strokeWidth={1.35} />{copy(locale, ["课程、导师与长期学习", "Courses, tutors & lifelong learning"])}</h3>
                  <ul>{academyTopics.map((topic) => <li key={topic[1]}>{copy(locale, topic)}</li>)}</ul>
                  <span className={styles.learningCta}>{copy(locale, ["了解凤启学苑", "Explore the Academy"])} <Arrow /></span>
                </div>
              </Link>
              <Link className={styles.learningCard} href={publicProductHref(locale, "/education#askwise")} data-v6-learning="askwise">
                <div className={styles.learningPhoto}><Image src="/images/education-v3/education-tutoring.png" alt="" fill unoptimized sizes="(max-width: 700px) 94vw, 25vw" /></div>
                <div className={styles.learningCopy}>
                  <h3><Sparkles aria-hidden="true" strokeWidth={1.35} />ASKWISE™</h3>
                  <p>{copy(locale, ["智能学习支持，帮助学生理解、练习与复盘。", "AI-assisted learning support for understanding, practice and reflection."])}</p>
                  <span className={styles.learningCta}>{copy(locale, ["了解智能学习支持", "Explore learning support"])} <Arrow /></span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.insightsSection}`} aria-labelledby="insights-heading">
          <div className={styles.container}>
            <header className={styles.sectionHeader}>
              <div>
                {zh && <p className={styles.eyebrow} lang="en">Phoenix Insights</p>}
                <h2 id="insights-heading">{copy(locale, ["资讯洞察", "Phoenix Insights"])}</h2>
                <p className={styles.sectionLead}>{copy(locale, ["全球视野 · 政策动态 · 深度解读", "Global perspectives, policy updates and deeper analysis."])}</p>
              </div>
              <Link className={styles.textLink} href={localizedHref(locale, "/insights")}>
                {copy(locale, ["进入凤启洞察内容中心", "Explore Phoenix Insights"])} <Arrow />
              </Link>
            </header>
            <nav className={styles.insightTopics} aria-label={copy(locale, ["洞察分类", "Insights topics"])}>
              {homepageInsights.map((item) => (
                <a key={item.release} href={`#insight-${item.photo}`} data-v6-insight-topic>{copy(locale, item.category)}</a>
              ))}
            </nav>
            <div className={styles.insightGrid}>
              {homepageInsights.map((item) => (
                <article className={styles.insightCard} id={`insight-${item.photo}`} key={item.release}>
                  <a href={`https://www.info.gov.hk/gia/general/${item.release}.htm`} data-v6-insight-article>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://gia.info.gov.hk/general/${item.release}_photo_${item.photo}.jpg`} alt="" width={320} height={180} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                    <div className={styles.insightCopy}>
                      <p className={styles.insightMeta}><span>{copy(locale, item.category)}</span><time dateTime={item.date}>{item.date}</time></p>
                      <h3>{copy(locale, item.title)}</h3>
                      <span className={styles.insightSource}>{copy(locale, item.publisher)} <Arrow /></span>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} appearance="v3" compact optimizedBrand consultationPath="/education#consultation" />
    </div>
  );
}
