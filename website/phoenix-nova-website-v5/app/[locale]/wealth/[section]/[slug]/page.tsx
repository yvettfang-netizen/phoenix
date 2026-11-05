import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { WealthFrame } from "@/components/wealth-landing";
import {
  wealthArticles,
  wealthRegions,
  wealthServices,
  pick,
} from "@/lib/wealth-content";
import styles from "@/components/wealth.module.css";
import { isWealthSurface, MAIN_SITE_ORIGIN } from "@/lib/wealth-surface";
import { wealthMetadata, wealthJsonLd } from "@/lib/wealth-metadata";
type Props = {
  params: Promise<{ locale: string; section: string; slug: string }>;
};
function lookup(section: string, slug: string) {
  return section === "guides"
    ? wealthArticles.find((a) => a.slug === slug)
    : section === "regions"
      ? wealthRegions.find((r) => r.slug === slug)
      : section === "services"
        ? wealthServices.find((s) => s.slug === slug)
        : undefined;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, section, slug } = await params;
  const item = lookup(section, slug);
  if (!item || (locale !== "zh" && locale !== "en")) return {};
  return wealthMetadata(
    locale,
    pick("title" in item ? item.title : item.name, locale),
    pick("summary" in item ? item.summary : item.intro, locale),
    section,
    slug,
  );
}
export default async function WealthDetailPage({ params }: Props) {
  const { locale, section, slug } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const item = lookup(section, slug);
  if (!item) notFound();
  const standalone = await isWealthSurface(),
    zh = locale === "zh",
    t = (a: string, b: string) => (zh ? a : b),
    root = standalone ? `/${locale}` : `/${locale}/wealth`,
    title = pick("title" in item ? item.title : item.name, locale),
    intro = pick("summary" in item ? item.summary : item.intro, locale);
  return (
    <WealthFrame
      locale={locale}
      standalone={standalone}
      path={`/${standalone && section === "guides" ? "knowledge" : section}/${slug}`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: wealthJsonLd(locale, title, section, slug),
        }}
      />
      <section className={styles.detailHero}>
        <div className={styles.wrap}>
          <nav
            className={styles.breadcrumbs}
            aria-label={t("当前位置", "Breadcrumb")}
          >
            <Link href={`${standalone ? MAIN_SITE_ORIGIN : ""}/${locale}`}>
              {t("首页", "Home")}
            </Link>
            <span>/</span>
            <Link href={root}>{t("财富规划", "Wealth planning")}</Link>
            <span>/</span>
            <span>{title}</span>
          </nav>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </section>
      <article className={styles.detailBody}>
        {"sections" in item &&
          item.sections.map((s) => (
            <section key={s.title[1]}>
              <h2>{pick(s.title, locale)}</h2>
              <p>{pick(s.body, locale)}</p>
            </section>
          ))}
        {"items" in item && (
          <>
            <h2>
              {t(
                "围绕家庭需要的规划范围",
                "Planning around your family's needs",
              )}
            </h2>
            <ul>
              {item.items.map((x) => (
                <li key={x[1]}>{pick(x, locale)}</li>
              ))}
            </ul>
            <h2>{t("从厘清问题开始", "Begin by clarifying the questions")}</h2>
            <p>
              {t(
                "先讨论家庭目标、相关地区及时间节点，再确定需要核实的问题。请勿在咨询准备阶段提供精确金额、账号、证件、保单原件或家庭成员真实姓名。",
                "Discuss your family's goals, relevant regions and timeline before identifying what needs verification. Please do not provide exact amounts, account details, identity documents, original policies or family members' real names during preparation.",
              )}
            </p>
          </>
        )}
        {"questions" in item && (
          <>
            <h2>
              {t("家庭可以先讨论的问题", "Questions for a family conversation")}
            </h2>
            <ul>
              {item.questions.map((x) => (
                <li key={x[1]}>{pick(x, locale)}</li>
              ))}
            </ul>
            <h2>{t("如何使用地区知识", "Using regional perspectives")}</h2>
            <p>
              {t(
                "地区栏目帮助整理规划问题，不判断您的税务居民身份、产品资格或法律责任。跨境安排涉及不同地区与家庭事实，应由具备相应资质的专业人士逐项核实。",
                "Regional perspectives help frame questions. They do not determine tax residence, product eligibility or legal responsibilities. Qualified professionals should verify cross-border arrangements against the relevant jurisdictions and your family's facts.",
              )}
            </p>
          </>
        )}
        {"checklist" in item && (
          <>
            <h2>
              {t(
                "下一次家庭讨论前的准备",
                "Prepare for your next family conversation",
              )}
            </h2>
            <ul>
              {item.checklist.map((x) => (
                <li key={x[1]}>{pick(x, locale)}</li>
              ))}
            </ul>
          </>
        )}
        <div className={styles.notice}>
          {t(
            "一般规划知识，不构成法律、税务、投资、保险或信托意见。任何具体安排须结合事实由相应专业人士核实。",
            "General planning education, not legal, tax, investment, insurance or trust advice. Relevant professionals must verify any specific arrangements against the facts.",
          )}
        </div>
        <h2>{t("继续了解", "Continue exploring")}</h2>
        <ul>
          {wealthArticles
            .filter((a) => a.slug !== slug)
            .slice(0, 3)
            .map((a) => (
              <li key={a.slug}>
                <Link
                  className={styles.textLink}
                  href={`${root}/${standalone ? "knowledge" : "guides"}/${a.slug}`}
                >
                  {pick(a.title, locale)} ↗
                </Link>
              </li>
            ))}
        </ul>
        <div className={styles.actions}>
          <Link
            className={styles.primary}
            href={`${root}/${standalone ? "compass" : "assessment"}`}
          >
            {t("开始家庭财富罗盘", "Start Wealth Compass")} →
          </Link>
          <Link className={styles.secondary} href={`${root}#consultation`}>
            {t("准备一次咨询", "Prepare a conversation")} ↗
          </Link>
        </div>
      </article>
    </WealthFrame>
  );
}
