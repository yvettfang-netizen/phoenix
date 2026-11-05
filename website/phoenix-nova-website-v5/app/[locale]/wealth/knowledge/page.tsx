import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { WealthFrame } from "@/components/wealth-landing";
import { WealthExplorer } from "@/components/wealth-interactions";
import { isWealthSurface } from "@/lib/wealth-surface";
import { wealthMetadata, wealthJsonLd } from "@/lib/wealth-metadata";
import styles from "@/components/wealth.module.css";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  return wealthMetadata(
    locale,
    locale === "zh" ? "财富知识中心" : "Wealth Knowledge Centre",
    locale === "zh"
      ? "家庭目标、资产结构、风险保障、跨境安排与代际传承的一般规划知识。"
      : "General planning education on family goals, asset structure, protection, cross-border arrangements and succession.",
    "knowledge",
  );
}
export default async function KnowledgePage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const standalone = await isWealthSurface(),
    zh = locale === "zh",
    title = zh ? "财富知识中心" : "Wealth Knowledge Centre";
  return (
    <WealthFrame locale={locale} standalone={standalone} path="/knowledge">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: wealthJsonLd(locale, title, "knowledge"),
        }}
      />
      <section className={styles.detailHero}>
        <div className={styles.wrap}>
          <nav
            className={styles.breadcrumbs}
            aria-label={zh ? "当前位置" : "Breadcrumb"}
          >
            <Link href={standalone ? `/${locale}` : `/${locale}/wealth`}>
              {zh ? "财富规划" : "Wealth planning"}
            </Link>
            <span>/</span>
            <span>{title}</span>
          </nav>
          <h1>{title}</h1>
          <p>
            {zh
              ? "以清晰的知识，连接家庭的规划与行动。"
              : "Clear knowledge to connect your family's plans and actions."}
          </p>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.wrap}>
          <WealthExplorer locale={locale} standalone={standalone} />
        </div>
      </section>
    </WealthFrame>
  );
}
