import Link from "next/link";
import { localizedText, type CbiCountry, type CbiLocale } from "./cbi-types";
import { comparisonRows as engineRows, comparisonSelection } from "@/lib/cbi-comparison-engine";
import { CbiComparisonReport } from "./cbi-comparison-report";
import styles from "./cbi-explorer.module.css";

function label(locale: CbiLocale, zh: string, en: string) {
  return locale === "zh" ? zh : en;
}

export function CbiComparison({ locale, countries, preview }: { locale: CbiLocale; countries: CbiCountry[]; preview: boolean }) {
  const approvedSelection = comparisonSelection(countries.map(country => country.raw), countries.map(country => country.slug), preview);
  const selected = approvedSelection.map(record => countries.find(country => country.slug === record.country_id)!);
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
        {selected.length >= 2 ? <CbiComparisonReport records={approvedSelection} locale={locale} preview={preview} /> : null}
        <section className={styles.detailSection}><div className={styles.boundary}>{label(locale, "边界提示：护照、国籍、居留、永久居民身份、签证及旅行证件不是同一概念。页面资料不替代签发机构的最新要求，也不构成法律结论或保证。", "Boundary: passport, nationality, residency, permanent residence, visa and travel document are different concepts. This information does not replace the issuing authority's current requirements and is not a legal conclusion or guarantee.")}</div></section>
      </div>
    </main>
  </>;
}

function comparisonRows(locale: CbiLocale, countries: CbiCountry[]) { return engineRows(countries.map(country => country.raw), locale); }
