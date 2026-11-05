import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/v5-site";
import {
  educationUniversityProfiles,
  getEducationUniversityProfile,
  type EducationUniversityProfile,
} from "@/lib/education-university-profiles";
import { EDUCATION_PROPOSED_ORIGIN, educationAlternates, safeJsonLd } from "@/lib/education-publication";
import styles from "@/components/education-knowledge.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };
type Locale = "zh" | "en";

const isLocale = (value: string): value is Locale => value === "zh" || value === "en";

const unknownFieldLabels: Readonly<Record<string, Readonly<[string, string]>>> = {
  location: ["校址/地区", "Location"],
  faculties: ["学院与学系", "Faculties and schools"],
  programmeCatalogue: ["课程目录", "Programme catalogue"],
  postgraduateAdmissionsUrl: ["研究生招生入口", "Postgraduate admissions entry"],
  doctoralAdmissionsUrl: ["博士招生入口", "Doctoral admissions entry"],
  researchPostgraduateUrl: ["研究型研究生入口", "Research-postgraduate entry"],
  applicationCycle: ["申请季与日期", "Application cycle and dates"],
  tuitionAndFees: ["学费与费用", "Tuition and fees"],
  admissionRequirements: ["入学资格与要求", "Admission requirements"],
  mainlandAdmissionsUrl: ["内地申请入口", "Mainland applicant entry"],
  creditArticulation: ["学分衔接", "Credit articulation"],
  subdegreeProgrammeDetails: ["副学位项目详情", "Sub-degree programme details"],
};

const admissionLabels: Readonly<Record<keyof EducationUniversityProfile["officialAdmissions"], Readonly<[string, string]>>> = {
  undergraduate: ["本科招生", "Undergraduate admissions"],
  postgraduate: ["研究生招生", "Postgraduate admissions"],
  researchPostgraduate: ["研究型研究生", "Research postgraduate"],
  subdegreeOrSeniorYear: ["副学位/高年级入口", "Sub-degree / senior-year entry"],
  nonLocalOrInternational: ["非本地/国际申请", "Non-local / international applicants"],
};

const text = (locale: Locale, values: Readonly<[string, string]>) => values[locale === "zh" ? 0 : 1];

function pendingText(locale: Locale): string {
  return locale === "zh" ? "尚未完成字段级核验，暂不展示具体数值。" : "Field-level verification is not complete; no specific value is published yet.";
}

function renderLocalized(value: { zh: string; en: string } | null, locale: Locale): string {
  return value?.[locale] ?? pendingText(locale);
}

function displayName(profile: EducationUniversityProfile, locale: Locale): string {
  return profile.names[locale];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const profile = getEducationUniversityProfile(slug);
  if (!profile) return {};
  const name = displayName(profile, locale);
  const description = locale === "zh"
    ? `${name}官方招生入口与资料核验状态。费用、申请季及具体项目要求须以院校官方来源为准。`
    : `${name} official admissions entries and field-verification status. Fees, cycles and programme requirements must be checked with the university.`;
  return {
    title: `${name} | Phoenix Nova Education`,
    description,
    alternates: educationAlternates(locale, `universities/${slug}`),
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title: `${name} | Phoenix Nova Education`,
      description,
      type: "website",
      siteName: "Phoenix Nova™",
      locale: locale === "zh" ? "zh_CN" : "en_GB",
    },
  };
}

export function generateStaticParams() {
  return ["zh", "en"].flatMap(locale => educationUniversityProfiles.map(profile => ({ locale, slug: profile.slug })));
}

export default async function EducationUniversityDetail({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const profile = getEducationUniversityProfile(slug);
  if (!profile) notFound();

  const zh = locale === "zh";
  const t = (cn: string, en: string) => (zh ? cn : en);
  const canonical = educationAlternates(locale, `universities/${slug}`).canonical;
  const universityId = `${canonical}#${profile.entityId}`;
  const publisherId = `${EDUCATION_PROPOSED_ORIGIN}/#phoenix-nova`;
  const sourceLinks = profile.sourceUrls.filter(url => url !== EDUCATION_PROPOSED_ORIGIN);
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": publisherId,
        name: "Phoenix Nova™",
        url: EDUCATION_PROPOSED_ORIGIN,
      },
      {
        "@type": "CollegeOrUniversity",
        "@id": universityId,
        name: profile.names.en,
        alternateName: [profile.names.zh, profile.abbreviation],
        url: profile.officialHomepage,
        sameAs: sourceLinks.filter(url => url !== UGC_DIRECTORY),
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#page`,
        url: canonical,
        name: displayName(profile, locale),
        inLanguage: zh ? "zh-Hans" : "en",
        isPartOf: { "@id": publisherId },
        publisher: { "@id": publisherId },
        about: { "@id": universityId },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t("凤启教育", "Phoenix Education"), item: educationAlternates(locale).canonical },
          { "@type": "ListItem", position: 2, name: t("香港大学与高等教育", "Hong Kong Universities & Higher Education"), item: educationAlternates(locale, "hong-kong-universities").canonical },
          { "@type": "ListItem", position: 3, name: displayName(profile, locale), item: canonical },
        ],
      },
    ],
  };

  return (
    <div className={styles.page} lang={zh ? "zh-Hans" : "en"}>
      <SiteHeader locale={locale} page="education" appearance="v3" />
      <main className={styles.wrap}>
        <nav aria-label={t("面包屑", "Breadcrumb")}>
          <Link href={`/${locale}/education`}>{t("凤启教育", "Phoenix Education")}</Link>{" / "}
          <Link href={`/${locale}/education/hong-kong-universities`}>{t("香港大学与高等教育", "Hong Kong Universities & Higher Education")}</Link>{" / "}
          {displayName(profile, locale)}
        </nav>

        <header>
          <p>{t("教育知识实体 · 候选详情页 · 不开放索引", "Education knowledge entity · Candidate detail · No indexing")}</p>
          <h1>{displayName(profile, locale)}</h1>
          <p><strong>{profile.abbreviation}</strong> · {t("教资会资助大学", "UGC-funded university")}</p>
          <p>{profile.institutionalSummary[locale]}</p>
          <p className={styles.filterNote}>
            {t(`资料最后核验：${profile.lastVerifiedOn}。此页不构成录取保证。`, `Last reviewed: ${profile.lastVerifiedOn}. This page does not promise admission.`)}
          </p>
        </header>

        <section aria-labelledby="identity-heading">
          <h2 id="identity-heading">{t("机构身份与已核实范围", "Institution identity and verified scope")}</h2>
          <article>
            <h3>{t("已核实", "Verified")}</h3>
            <p>{profile.verificationNote[locale]}</p>
            <p>{t("实体 ID", "Entity ID")}: <code>{profile.entityId}</code></p>
            <p>{t("官方主页", "Official homepage")}: <a href={profile.officialHomepage} target="_blank" rel="noopener noreferrer">{profile.officialHomepage} ↗</a></p>
          </article>
          <article className={styles.emptyState}>
            <h3>{t("尚待逐字段核验", "Fields awaiting review")}</h3>
            <p>{t("以下字段保持待核验状态，不用院校名称或搜索摘要推断。", "The following fields remain pending and are not inferred from the institution name or search snippets.")}</p>
            <ul>
              {profile.unknownFields.map(field => {
                const label = unknownFieldLabels[field];
                return <li key={field}>{label ? text(locale, label) : field}</li>;
              })}
            </ul>
          </article>
        </section>

        <section aria-labelledby="admissions-heading">
          <h2 id="admissions-heading">{t("官方招生入口", "Official admissions entries")}</h2>
          <div className={styles.grid}>
            {(Object.entries(profile.officialAdmissions) as [keyof EducationUniversityProfile["officialAdmissions"], string | null][]).map(([key, url]) => {
              const label = admissionLabels[key];
              return (
                <article key={key}>
                  <h3>{text(locale, label)}</h3>
                  {url ? <a href={url} target="_blank" rel="noopener noreferrer">{t("打开官方页面", "Open official page")} ↗</a> : <p className={styles.filterNote}>{pendingText(locale)}</p>}
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="pathways-heading">
          <h2 id="pathways-heading">{t("学习阶段与申请方向", "Study stages and applicant pathways")}</h2>
          <div className={styles.grid}>
            {([
              ["本科", "Undergraduate", profile.undergraduatePath],
              ["研究生", "Postgraduate", profile.postgraduatePath],
              ["博士/研究型", "Doctoral / research", profile.doctoralPath],
              ["副学位/高年级", "Sub-degree / senior-year", profile.subdegreePath],
              ["国际申请", "International", profile.internationalApplicantPath],
              ["内地申请", "Mainland", profile.mainlandApplicantPath],
            ] as const).map(([cn, en, value]) => (
              <article key={en}>
                <h3>{t(cn, en)}</h3>
                <p>{renderLocalized(value, locale)}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="unknown-heading">
          <h2 id="unknown-heading">{t("课程、申请季与费用", "Programmes, cycles and fees")}</h2>
          <div className={styles.grid}>
            <article><h3>{t("课程目录", "Programme catalogue")}</h3><p>{renderLocalized(profile.programmeCatalogue, locale)}</p></article>
            <article><h3>{t("申请季与日期", "Application cycle and dates")}</h3><p>{renderLocalized(profile.applicationCycle, locale)}</p></article>
            <article><h3>{t("学费与费用", "Tuition and fees")}</h3><p>{renderLocalized(profile.tuitionAndFees, locale)}</p></article>
            <article><h3>{t("入学资格与要求", "Admission requirements")}</h3><p>{renderLocalized(profile.admissionRequirements, locale)}</p></article>
          </div>
          <p className={styles.filterNote}>{t("费用、截止日期、成绩门槛及专业要求均可能随项目和申请季变化，请直接核对官方页面。", "Fees, deadlines, score thresholds and programme requirements can change by programme and cycle; check the official page directly.")}</p>
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading">{t("来源与核验记录", "Sources and verification record")}</h2>
          <p>{t(`本条目最后核验日期：${profile.lastVerifiedOn}。教资会资助身份沿用现有知识库实体 ID；详情页不改变原有题库或主数据。`, `Last reviewed on ${profile.lastVerifiedOn}. The UGC-funded identity reuses the existing knowledge entity ID; this detail page does not change questionnaires or master data.`)}</p>
          <ul>
            {profile.sourceUrls.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url} ↗</a></li>)}
          </ul>
        </section>

        <section aria-labelledby="next-heading">
          <h2 id="next-heading">{t("规划准备与下一步", "Planning preparation and next step")}</h2>
          <p>{profile.phoenixPlanningNote[locale]}</p>
          <p><Link href={`/${locale}/education#consultation`}>{t("预约教育规划咨询准备", "Prepare an education planning consultation")} ↗</Link></p>
          <p><Link href={`/${locale}/education/hong-kong-universities`}>{t("返回香港大学与高等教育入口", "Back to Hong Kong Universities & Higher Education")} ↗</Link></p>
        </section>
      </main>
      <SiteFooter locale={locale} appearance="v3" consultationPath="/education#consultation" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(graph) }} />
    </div>
  );
}

// Keep the UGC directory in the module's source audit trail without exposing
// it as a second data source at runtime.  The route's JSON-LD only names the
// university and official pages, not an invented Phoenix relationship.
const UGC_DIRECTORY = "https://www.ugc.edu.hk/eng/ugc/site/fund_inst.html";
