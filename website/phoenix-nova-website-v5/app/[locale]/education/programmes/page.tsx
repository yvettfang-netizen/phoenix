import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/v5-site";
import { searchEducationKnowledge } from "@/lib/education-knowledge-search";
import { educationAlternates } from "@/lib/education-publication";
import styles from "@/components/education-knowledge.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  const title = locale === "zh" ? "香港大学与专业检索中心" : "Hong Kong University and Programme Search";
  const description = locale === "zh" ? "按学位、学习模式、学科与申请季整理香港大学及专业检索入口；正式资料逐项核实后再发布。" : "Explore Hong Kong university and programme search dimensions by degree, study mode, subject and admission cycle; records are published only after field-level verification.";
  return { title, description, alternates: educationAlternates(locale, "programmes"), robots: { index: false, follow: false } };
}

export default async function Programmes({ params, searchParams }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const query = await searchParams;
  const read = (name: string) => typeof query[name] === "string" ? query[name] as string : "";
  const zh = locale === "zh";
  const t = (cn: string, en: string) => zh ? cn : en;
  const options = {
    degree: [["undergraduate", "本科", "Undergraduate"], ["associate", "副学位", "Associate / sub-degree"], ["master", "硕士", "Master's"], ["professional", "专业课程", "Professional"]],
    mode: [["full-time", "全日制", "Full-time"], ["part-time", "兼读制", "Part-time"], ["taught", "授课型", "Taught"], ["research", "研究型", "Research"]],
    subject: [["business", "商科／金融", "Business / finance"], ["computing", "计算机／人工智能", "Computing / AI"], ["engineering", "工程", "Engineering"], ["education", "教育", "Education"], ["media", "传媒", "Media"], ["health", "健康科学", "Health sciences"]],
    cycle: [["2026-27", "2026/27 入学季", "2026/27 intake"], ["2027-28", "2027/28 入学季", "2027/28 intake"]],
  } as const;
  // Keep unknown URL values in the search request so the search contract can
  // reject them as a no-match; silently normalising them to "all" would make
  // an invalid filter look like an unfiltered result.
  const optionValue = <T extends string>(name: string): T | undefined => {
    const value = read(name);
    return value ? value as T : undefined;
  };
  const degree = optionValue<"undergraduate" | "associate" | "master" | "professional">("degree");
  const mode = optionValue<"full-time" | "part-time" | "taught" | "research">("mode");
  const subject = optionValue<"business" | "computing" | "engineering" | "education" | "media" | "health">("subject");
  const cycle = optionValue<string>("cycle");
  const result = searchEducationKnowledge(undefined, {
    locale,
    entityKind: "programme",
    surface: "search",
    text: read("q").slice(0, 120),
    degree,
    mode,
    subject,
    cycle,
    page: Number(read("page")) || 1,
    pageSize: 10,
  });
  return <div className={styles.page} lang={zh ? "zh-Hans" : "en"}>
    <SiteHeader locale={locale} page="education" appearance="v3" />
    <main className={styles.wrap}>
      <Link href={`/${locale}/education`}>{t("返回凤启教育", "Back to Phoenix Education")}</Link>
      <header><p>{t("香港高等教育 · 候选检索入口", "Hong Kong higher education · Candidate search entry")}</p><h1>{t("香港大学与专业检索中心", "Hong Kong University and Programme Search")}</h1><p>{t("按学位、学习模式、学科领域及申请季整理检索维度。当前没有获准发布的专业记录，空结果不代表相关课程不存在。", "Search dimensions cover degree, study mode, subject area and intake cycle. No programme records are approved for publication yet; an empty result does not mean that programmes do not exist.")}</p></header>
      <form method="get" action={`/${locale}/education/programmes`}>
        <p><label>{t("专业或大学名称", "Programme or university")} <input name="q" maxLength={120} defaultValue={read("q")} /></label></p>
        {(["degree", "mode", "subject", "cycle"] as const).map(key => <p key={key}><label>{t(key === "degree" ? "学位类型" : key === "mode" ? "学习模式" : key === "subject" ? "学科领域" : "申请季", key === "degree" ? "Degree" : key === "mode" ? "Study mode" : key === "subject" ? "Subject area" : "Admission cycle")} <select name={key} defaultValue={read(key)}><option value="">{t("全部", "All")}</option>{options[key].map(([value, cn, en]) => <option key={value} value={value}>{t(cn, en)}</option>)}</select></label></p>)}
        <button type="submit">{t("组合检索", "Search with filters")}</button> <Link href={`/${locale}/education/programmes`}>{t("清除条件", "Clear filters")}</Link>
      </form>
      <section aria-live="polite"><h2>{t(`已核实结果：${result.total}`, `Verified results: ${result.total}`)}</h2>{result.total > 0 ? <div className={styles.grid}>{result.items.map(item => <article key={item.entityId}><h3>{item.names[locale]}</h3>{item.entityType === "programme" && item.description?.[locale] ? <p>{item.description[locale]}</p> : null}{item.officialHomepage ? <a href={item.officialHomepage} rel="noopener noreferrer">{t("官方课程页面", "Official programme page")} ↗</a> : null}</article>)}</div> : <div className={styles.emptyState}><p>{t("专业数据与申请季尚未完成逐字段官方核验，当前检索结果保持为空。后续将按学校、学院、专业、学位、学习模式及申请季分别接入来源。", "Programme and intake fields have not completed field-level official verification, so the current result remains empty. Future records will be sourced separately by university, faculty, programme, degree, study mode and intake.")}</p><a href="https://www.edb.gov.hk/en/edu-system/postsecondary/index.html" rel="noopener noreferrer">{t("教育局专上教育资料", "Education Bureau post-secondary information")} ↗</a><a href="https://www.ugc.edu.hk/eng/ugc/site/fund_inst.html" rel="noopener noreferrer">{t("教资会资助大学名录", "UGC-funded university directory")} ↗</a></div>}</section>
      <section><h2>{t("资料边界", "Data boundary")}</h2><p>{t("本页不展示未经核实的学费、GPA、录取率、截止日期或专业要求，也不构成录取承诺。正式发布前保持 noindex。", "This page does not display unverified tuition, GPA, admission rates, deadlines or programme requirements, and does not promise admission. It remains noindex before release approval.")}</p><Link href={`/${locale}/education#consultation`}>{t("独立准备教育咨询", "Prepare an education consultation independently")}</Link></section>
    </main><SiteFooter locale={locale} appearance="v3" consultationPath="/education#consultation" />
  </div>;
}
