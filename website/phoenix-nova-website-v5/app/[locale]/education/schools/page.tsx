import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/v5-site";
import {
  HONG_KONG_18_DISTRICTS,
  type CurriculumLabel,
  type EducationStageId,
  type FundingLabel,
  type HongKongDistrictId,
  type LegalStatusLabel,
  type OperationLabel,
} from "@/lib/education-knowledge";
import { searchEducationKnowledge, type EducationKnowledgeSort } from "@/lib/education-knowledge-search";
import { educationAlternates } from "@/lib/education-publication";
import styles from "@/components/education-knowledge.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") return {};
  return {
    title: locale === "zh" ? "香港学校与课程检索中心" : "Hong Kong School and Curriculum Search",
    alternates: educationAlternates(locale, "schools"),
    robots: { index: false, follow: false },
  };
}

export default async function Schools({ params, searchParams }: Props) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const query = await searchParams;
  const read = (name: string) => typeof query[name] === "string" ? query[name] as string : "";
  const readMany = (name: string) => {
    const value = query[name];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : typeof value === "string" && value ? [value] : [];
  };
  const zh = locale === "zh";
  const t = (cn: string, en: string) => zh ? cn : en;
  const funding: readonly [FundingLabel, string, string][] = [
    ["government", "官立", "Government"],
    ["aided", "资助", "Aided"],
    ["direct-subsidy", "直资", "DSS"],
    ["private", "私立", "Private"],
    ["self-financed", "自资", "Self-financing"],
  ];
  const operation: readonly [OperationLabel, string, string][] = [
    ["public", "公营／官立", "Public / government"],
    ["statutory", "法定机构办学", "Statutory body"],
    ["private", "私立办学", "Private operation"],
    ["independent", "独立学校办学", "Independent operation"],
  ];
  const legal: readonly [LegalStatusLabel, string, string][] = [
    ["statutory-body", "法定机构", "Statutory body"],
    ["company", "公司／机构", "Company / organisation"],
    ["charity", "慈善机构", "Charity"],
    ["non-profit", "非牟利", "Non-profit"],
    ["registered-school", "注册学校", "Registered school"],
  ];
  const curricula: readonly [CurriculumLabel, string, string][] = [
    ["local", "本地课程", "Local curriculum"],
    ["dse", "DSE", "DSE"],
    ["international", "国际课程", "International curriculum"],
    ["ib", "IB（总类）", "IB (general)"],
    ["ib-pyp", "IB PYP", "IB PYP"],
    ["ib-myp", "IB MYP", "IB MYP"],
    ["ib-dp", "IB DP", "IB DP"],
    ["ib-cp", "IB CP", "IB CP"],
    ["a-level", "A-Level", "A-Level"],
    ["igcse", "IGCSE", "IGCSE"],
    ["as", "AS", "AS"],
    ["a2", "A2", "A2"],
    ["ap", "AP", "AP"],
    ["national", "国家课程", "National curriculum"],
  ];
  const stages = ["kindergarten", "primary-schools", "secondary-schools"] as const;
  const selectedStages = readMany("stage").filter((value): value is EducationStageId => stages.includes(value as typeof stages[number]));
  const selectedDistricts = readMany("district").filter((value): value is HongKongDistrictId => HONG_KONG_18_DISTRICTS.some(d => d.id === value));
  const selectedFunding = readMany("funding").filter((value): value is FundingLabel => funding.some(item => item[0] === value));
  const selectedOperation = readMany("operation").filter((value): value is OperationLabel => operation.some(item => item[0] === value));
  const selectedLegal = readMany("legal").filter((value): value is LegalStatusLabel => legal.some(item => item[0] === value));
  const selectedCurricula = readMany("curriculum").filter((value): value is CurriculumLabel => curricula.some(item => item[0] === value));
  const result = searchEducationKnowledge(undefined, {
    locale,
    text: read("q").slice(0, 120),
    institutionKinds: ["school", "kindergarten"],
    surface: "search",
    // This candidate route may show source-backed candidate records for
    // review; it must never be mistaken for the formally published index.
    includeUnpublished: true,
    publicationStates: ["candidate", "published"],
    stageIds: selectedStages,
    districtIds: selectedDistricts,
    fundingLabels: selectedFunding,
    operationLabels: selectedOperation,
    legalLabels: selectedLegal,
    curriculumLabels: selectedCurricula,
    sort: ["name-asc", "name-desc", "updated-desc"].includes(read("sort")) ? read("sort") as EducationKnowledgeSort : "name-asc",
    page: Number(read("page")) || 1,
    pageSize: 10,
  });
  const selected = (name: string) => readMany(name);
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) if (typeof item === "string" && item) params.append(key, item);
      } else if (value) {
        params.set(key, value);
      }
    }
    params.set("page", String(page));
    return `/${locale}/education/schools?${params.toString()}`;
  };
  return <div className={styles.page} lang={zh ? "zh-Hans" : "en"}>
    <SiteHeader locale={locale} page="education" appearance="v3" />
    <main className={styles.wrap}>
      <Link href={`/${locale}/education`}>{t("返回凤启教育", "Back to Phoenix Education")}</Link>
      <header>
        <p>{t("内容与检索候选 · 数据核实中", "Content and search candidate · Data verification in progress")}</p>
        <h1>{t("香港学校与课程检索中心", "Hong Kong School and Curriculum Search")}</h1>
        <p>{t("教育阶段、资助类型、办学性质与课程体系分别核实。仅展示获准且来源核实的学校资料。", "Stage, funding, school operation and curriculum are verified separately. Only approved, source-checked school records appear.")}</p>
      </header>
      <form method="get" action={`/${locale}/education/schools`}>
        <p><label>{t("学校名称", "School name")} <input name="q" maxLength={120} defaultValue={read("q")} /></label></p>
        <p><label>{t("教育阶段", "Stage")} <select name="stage" defaultValue={read("stage")}><option value="">{t("所有阶段", "All stages")}</option>{stages.map(value => <option key={value} value={value}>{t(value === "kindergarten" ? "幼儿园" : value === "primary-schools" ? "小学" : "中学", value === "kindergarten" ? "Kindergarten" : value === "primary-schools" ? "Primary" : "Secondary")}</option>)}</select></label></p>
        <p><label>{t("地区", "District")} <select name="district" defaultValue={read("district")}><option value="">{t("全部18区", "All 18 districts")}</option>{HONG_KONG_18_DISTRICTS.map(d => <option key={d.id} value={d.id}>{d.names[locale]}</option>)}</select></label></p>
        <p><label>{t("资助类别（可多选）", "Funding (multi-select)")} <select name="funding" multiple defaultValue={selected("funding")}>{funding.map(([value, cn, en]) => <option key={value} value={value}>{t(cn, en)}</option>)}</select></label></p>
        <p><label>{t("办学性质（独立维度）", "Operation (separate dimension)")} <select name="operation" multiple defaultValue={selected("operation")}>{operation.map(([value, cn, en]) => <option key={value} value={value}>{t(cn, en)}</option>)}</select></label></p>
        <p><label>{t("法律／非牟利属性（独立维度）", "Legal / non-profit status (separate dimension)")} <select name="legal" multiple defaultValue={selected("legal")}>{legal.map(([value, cn, en]) => <option key={value} value={value}>{t(cn, en)}</option>)}</select></label></p>
        <p><label>{t("课程体系（可多选）", "Curriculum (multi-select)")} <select name="curriculum" multiple defaultValue={selected("curriculum")}>{curricula.map(([value, cn, en]) => <option key={value} value={value}>{t(cn, en)}</option>)}</select></label><small className={styles.filterNote}>{t("国际学校是学校／课程语境，IB、DSE、A-Level、AP 是独立课程标签；数据未核实时不会推断。", "International school is a school/curriculum context; IB, DSE, A-Level and AP are independent curriculum labels. No label is inferred when unverified.")}</small></p>
        <p><label>{t("排序", "Sort")} <select name="sort" defaultValue={read("sort") || "name-asc"}><option value="name-asc">{t("名称升序", "Name ascending")}</option><option value="name-desc">{t("名称降序", "Name descending")}</option><option value="updated-desc">{t("最近更新", "Recently updated")}</option></select></label></p>
        <button type="submit">{t("组合检索", "Search with filters")}</button> <Link href={`/${locale}/education/schools`}>{t("清除条件", "Clear filters")}</Link>
      </form>
      <section aria-live="polite">
        <h2>{t(`已核实结果：${result.total}`, `Verified results: ${result.total}`)}</h2>
        <p className={styles.filterNote}>{t("本候选检索页可显示来源支持的候选记录；候选记录不等同于正式公开发布，字段仍需逐项审核。", "This candidate search may show source-backed candidate records; candidate records are not formally published and remain subject to field-level review.")}</p>
        {result.items.map(item => <article key={item.entityId}><h3>{item.names[locale]}</h3>{item.publication.state === "candidate" ? <small className={styles.filterNote}>{t("候选记录 · 待审核", "Candidate record · review pending")}</small> : null}{item.officialHomepage ? <a href={item.officialHomepage} rel="noopener noreferrer">{t("学校官方网站", "Official school website")} ↗</a> : null}</article>)}
        {result.total === 0 && <p>{t("目前没有符合条件、已获准展示的学校记录。可能是筛选条件没有匹配，或相关字段尚未完成官方核实；这不代表香港没有这些学校。您可先使用教育局官方检索。", "No approved school records currently match. The filters may have no match, or the relevant fields may not yet be officially verified; this does not mean such schools do not exist. Use the Education Bureau's official search meanwhile.")}</p>}
        <a href="https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/index.html">{t("教育局官方学校检索", "Education Bureau official school search")} ↗</a>
        {(result.hasPrevious || result.hasNext) && <nav aria-label={t("学校结果分页", "School result pagination")}>{result.hasPrevious ? <Link href={pageHref(result.page - 1)}>{t("上一页", "Previous")}</Link> : null}{result.hasNext ? <Link href={pageHref(result.page + 1)}>{t("下一页", "Next")}</Link> : null}</nav>}
      </section>
    </main>
    <SiteFooter locale={locale} appearance="v3" consultationPath="/education#consultation" />
  </div>;
}
