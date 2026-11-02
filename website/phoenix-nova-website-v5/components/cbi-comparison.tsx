import Link from "next/link";
import { displayDate, displayNumber, localizedText, type CbiCountry, type CbiLocale, type CbiText } from "./cbi-types";
import styles from "./cbi-explorer.module.css";

function label(locale: CbiLocale, zh: string, en: string) {
  return locale === "zh" ? zh : en;
}

function list(values: CbiText[], locale: CbiLocale) {
  if (!values.length) return label(locale, "待核验", "Pending verification");
  return values.map((value) => localizedText(value, locale)).join(locale === "zh" ? "、" : ", ");
}

function value(value: CbiText, locale: CbiLocale) {
  return localizedText(value, locale);
}

export function CbiComparison({ locale, countries, preview }: { locale: CbiLocale; countries: CbiCountry[]; preview: boolean }) {
  const selected = countries.slice(0, 4);
  const otherLocale: CbiLocale = locale === "zh" ? "en" : "zh";
  const query = selected.map((country) => encodeURIComponent(country.slug)).join(",");
  return <>
    <main className={styles.main} data-cbi-comparison>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={label(locale, "面包屑导航", "Breadcrumb")}><Link href={`/${locale}/identity/explorer`}>{label(locale, "精选投资入籍国家检索", "Selected CBI explorer")}</Link><span aria-hidden="true">/</span><span>{label(locale, "投资入籍国家资料比较", "Citizenship Programme Comparison")}</span></nav>
        <section className={styles.detailHeader} aria-labelledby="cbi-compare-title">
          <div><p className={styles.eyebrow}>{label(locale, "投资入籍国家资料比较", "CITIZENSHIP PROGRAMME COMPARISON")}</p><h1 id="cbi-compare-title">{label(locale, "投资入籍国家资料比较", "Citizenship Programme Comparison")}</h1><p>{label(locale, "并列展示所选记录；页面不计算排名、指数或优先级。", "Records are shown side by side. This page does not calculate rankings, scores or priorities.")}</p></div>
          <Link className={styles.localeSwitch} href={`/${otherLocale}/identity/explorer/compare?countries=${query}`}>{locale === "zh" ? "English" : "中文"}</Link>
        </section>
        {preview ? <div className={styles.reviewBanner} role="status"><strong>{label(locale, "内部审核预览", "Internal review preview")}</strong>{label(locale, "比较中的记录尚未发布，仅供内部资料审核。", "The records in this comparison are not published and are for internal review only.")}</div> : null}
        {selected.length >= 2 ? <section className={styles.detailSection} aria-labelledby="comparison-table-title"><h2 id="comparison-table-title">{label(locale, "并列资料", "Side-by-side data")}</h2><div className={styles.tableWrap}><table className={styles.compareTable} data-cbi-comparison-table><caption className="sr-only">{label(locale, "所选记录的并列资料，不代表排名", "Side-by-side information for selected records; not a ranking")}</caption><thead><tr><th scope="col">{label(locale, "资料字段", "Information field")}</th>{selected.map((country) => <th scope="col" key={country.slug}>{localizedText(country.name, locale)}<br /><small>{localizedText(country.programmeName, locale)}</small></th>)}</tr></thead><tbody>{comparisonRows(locale, selected).map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((cell, index) => <td key={`${selected[index]?.slug ?? index}-${row.label}`}>{cell}</td>)}</tr>)}</tbody></table></div></section> : <div className={styles.empty}><strong>{label(locale, "请选择 2–4 条记录", "Select 2–4 records")}</strong><p>{label(locale, "返回检索页勾选记录后，再打开比较。比较只帮助并列查看资料，不表示推荐或结果保证。", "Return to the explorer, select records, then open comparison. Comparison only supports side-by-side review; it is not a recommendation or outcome guarantee.")}</p><Link className={styles.localeSwitch} href={`/${locale}/identity/explorer`}>{label(locale, "返回检索", "Back to explorer")}</Link></div>}
        <section className={styles.detailSection}><div className={styles.boundary}>{label(locale, "边界提示：护照、国籍、居留、永久居民身份、签证及旅行证件不是同一概念。页面资料不替代签发机构的最新要求，也不构成法律结论或保证。", "Boundary: passport, nationality, residency, permanent residence, visa and travel document are different concepts. This information does not replace the issuing authority's current requirements and is not a legal conclusion or guarantee.")}</div></section>
      </div>
    </main>
  </>;
}

function comparisonRows(locale: CbiLocale, countries: CbiCountry[]) {
  const row = (zh: string, en: string, values: string[]) => ({ label: label(locale, zh, en), values });
  return [
    row("正式名称", "Official name", countries.map((country) => value(country.officialName, locale))),
    row("签发机构", "Issuing authority", countries.map((country) => value(country.officialAuthority, locale))),
    row("计划类型", "Programme type", countries.map((country) => value(country.programmeType, locale))),
    row("对应身份关系", "Identity relationship", countries.map((country) => list(country.identityRelationships, locale))),
    row("取得途径", "Acquisition route", countries.map((country) => list(country.acquisitionPaths, locale))),
    row("居留前置条件", "Residency prerequisite", countries.map((country) => value(country.residencyPrerequisite, locale))),
    row("法律状态", "Legal status", countries.map((country) => value(country.legalStatus, locale))),
    row("项目运营状态", "Operational status", countries.map((country) => value(country.operationalStatus, locale))),
    row("当前受理状态", "Application status", countries.map((country) => value(country.applicationStatus, locale))),
    row("投资方式", "Investment options", countries.map((country) => list(country.investmentOptions, locale))),
    row("最低投资额", "Minimum investment", countries.map((country) => `${displayNumber(country.minimumInvestment, locale)}${country.minimumInvestment === null ? "" : ` ${country.currency ?? ""}`}`)),
    row("家庭成员条件", "Family eligibility", countries.map((country) => value(country.familyEligibility, locale))),
    row("居住要求", "Residence requirements", countries.map((country) => value(country.residenceRequirement, locale))),
    row("护照签发状态", "Passport issuance status", countries.map((country) => value(country.passportIssuanceStatus, locale))),
    row("官方来源", "Official sources", countries.map((country) => country.policyRules.filter((rule) => rule.sourceType === "OFFICIAL" && rule.officialUrl).map((rule) => rule.officialUrl).join(" · ") || label(locale, "待核实", "Pending verification"))),
    row("护照有效期限", "Passport validity", countries.map((country) => value(country.passportValidity, locale))),
    row("更新及续发", "Renewal and reissue", countries.map((country) => value(country.passportRenewal, locale))),
    row("免签目的地数量", "Visa-free destinations", countries.map((country) => displayNumber(country.travelPolicy.visaFree, locale))),
    row("落地签目的地数量", "Visa-on-arrival destinations", countries.map((country) => displayNumber(country.travelPolicy.visaOnArrival, locale))),
    row("电子旅行授权目的地数量", "Electronic travel authorisation destinations", countries.map((country) => displayNumber(country.travelPolicy.eta, locale))),
    row("电子签证目的地数量", "Electronic visa destinations", countries.map((country) => displayNumber(country.travelPolicy.evisa, locale))),
    row("旅行资料统计方法", "Travel data methodology", countries.map((country) => value(country.travelPolicy.methodology, locale))),
    row("旅行资料来源", "Travel data source", countries.map((country) => value(country.travelPolicy.source, locale))),
    row("旅行资料统计日期", "Travel data date", countries.map((country) => displayDate(country.travelPolicy.date, locale))),
    row("资料最近核实", "Last verified", countries.map((country) => displayDate(country.verifiedAt, locale))),
    row("资料状态", "Content status", countries.map((country) => country.contentStatus)),
  ];
}
