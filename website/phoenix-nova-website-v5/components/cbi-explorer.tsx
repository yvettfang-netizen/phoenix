"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { countryFlag, displayDate, displayNumber, localizedText, type CbiCountry, type CbiLocale, type CbiText } from "./cbi-types";
import { amountRangeMatches, comparisonField, familyPreferenceMatches, verifiedField, verifiedMinimum } from "@/lib/cbi-comparison-engine";
import styles from "./cbi-explorer.module.css";

const UNKNOWN = "__unknown__";
type FilterKey = "country" | "operational" | "legal" | "investment" | "minimum" | "currency" | "family" | "residence" | "dual" | "passport";
type FilterState = Record<FilterKey, string>;
const FILTER_KEYS: readonly FilterKey[] = ["country", "operational", "legal", "investment", "minimum", "currency", "family", "residence", "dual", "passport"];
const INITIAL_FILTERS: FilterState = { country: "all", operational: "all", legal: "all", investment: "all", minimum: "all", currency: "all", family: "all", residence: "all", dual: "all", passport: "all" };

function label(locale: CbiLocale, zh: string, en: string) { return locale === "zh" ? zh : en; }

function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "").toLocaleLowerCase();
}

function contentStatusLabel(locale: CbiLocale, status: string) {
  if (status === "IMPORT_REVIEW") return label(locale, "内部审核中", "Internal review");
  if (status === "PUBLISHED") return label(locale, "已发布", "Published");
  if (status === "WITHDRAWN") return label(locale, "已撤回", "Withdrawn");
  return label(locale, "状态待核实", "Status pending verification");
}

function filterLabel(locale: CbiLocale, field: FilterKey) {
  const labels: Record<FilterKey, [string, string]> = {
    country: ["国家", "Country"], operational: ["运营状态", "Operational status"], legal: ["法律状态", "Legal status"],
    investment: ["投资方式", "Investment route"], minimum: ["最低金额", "Minimum amount"], currency: ["币种", "Currency"],
    family: ["家庭成员资格", "Family eligibility"], residence: ["居住要求", "Residence requirement"],
    dual: ["双重国籍", "Dual nationality"], passport: ["护照签发状态", "Passport issuance"],
  };
  return label(locale, labels[field][0], labels[field][1]);
}

function isUnknownText(value: CbiText) {
  const zh = value.zh.trim().toUpperCase();
  const en = value.en.trim().toUpperCase();
  return !zh || !en || zh.includes("待核实") || zh.includes("待核验") || en.includes("PENDING VERIFICATION") || zh === "UNKNOWN" || en === "UNKNOWN";
}

function numberText(value: number | null): CbiText[] {
  return value === null ? [{ zh: "待核实，未形成答复", en: "Pending verification; no answer has been formed." }] : [{ zh: String(value), en: String(value) }];
}

function currencyText(value: string | null): CbiText[] {
  return value ? [{ zh: value, en: value }] : numberText(null);
}

function filterValues(country: CbiCountry, field: FilterKey): CbiText[] {
  switch (field) {
    case "country": return [country.name];
    case "operational": return [country.operationalStatus];
    case "legal": return [country.legalStatus];
    case "investment": return country.investmentOptions;
    case "minimum": return numberText(verifiedMinimum(country.raw));
    case "currency": return currencyText(country.currency);
    case "family": return [country.familyEligibility];
    case "residence": return [country.residenceRequirement];
    case "dual": return [country.dualNationalityPolicy];
    case "passport": return [country.passportIssuanceStatus];
  }
}

function keyFor(value: CbiText, locale: CbiLocale) { return isUnknownText(value) ? UNKNOWN : localizedText(value, locale).toLocaleLowerCase(); }

function optionValues(records: CbiCountry[], field: FilterKey, locale: CbiLocale): [string, string][] {
  const values = new Map<string, string>();
  for (const country of records) for (const value of filterValues(country, field)) {
    const key = keyFor(value, locale);
    if (key !== UNKNOWN) values.set(key, localizedText(value, locale));
  }
  const sorted = [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], locale === "zh" ? "zh-CN" : "en-GB"));
  return [[UNKNOWN, label(locale, "未知 / 待核实", "Unknown / pending")], ...sorted];
}

function matchesFilter(country: CbiCountry, field: FilterKey, selected: string, locale: CbiLocale) {
  if (selected === "all") return true;
  const values = filterValues(country, field);
  if (selected === UNKNOWN) return !values.length || values.some((value) => isUnknownText(value));
  return values.some((value) => keyFor(value, locale) === selected);
}

export function CbiExplorer({ locale, records, preview }: { locale: CbiLocale; records: CbiCountry[]; preview: boolean }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sort, setSort] = useState<"name" | "amount" | "updated">("name");
  const [selected, setSelected] = useState<string[]>([]);
  const [range, setRange] = useState({ min: "", max: "" });
  const [family, setFamily] = useState<string[]>([]);
  const [focus, setFocus] = useState<string[]>([]);
  const invalidRange = [range.min, range.max].some(value => value !== "" && (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))) || (range.min !== "" && range.max !== "" && Number(range.min) > Number(range.max));
  const options = useMemo(() => Object.fromEntries(FILTER_KEYS.map((field) => [field, optionValues(records, field, locale)])) as Record<FilterKey, [string, string][]>, [locale, records]);
  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim());
    const output = records.filter((country) => {
      const searchable = [
        country.code, localizedText(country.name, locale), localizedText(country.officialName, locale), localizedText(country.programmeName, locale),
        localizedText(country.legalBasis, locale), localizedText(country.officialAuthority, locale), localizedText(country.operationalStatus, locale),
        localizedText(country.legalStatus, locale), localizedText(country.applicationStatus, locale), localizedText(country.passportIssuanceStatus, locale),
        country.currency ?? "", ...country.investmentOptions.map((value) => localizedText(value, locale)),
      ].map((value) => normalizeSearch(value)).join("");
      const rangeCurrency = filters.currency === "all" || filters.currency === UNKNOWN ? "" : filters.currency.toUpperCase();
      return (!normalizedQuery || searchable.includes(normalizedQuery)) && FILTER_KEYS.every((field) => matchesFilter(country, field, filters[field], locale)) && amountRangeMatches(country.raw, { ...range, currency: rangeCurrency }) && familyPreferenceMatches(country.raw, family) && focus.every(field => {
        if (field === "residence_requirement_category") return verifiedField(country.raw, field) && ["NONE", "LIMITED"].includes(country.raw.planning_details?.residence_requirement_category ?? "UNKNOWN");
        return field === "minimum_investment" ? verifiedMinimum(country.raw) !== null : verifiedField(country.raw, field);
      });
    });
    return output.sort((left, right) => {
      if (sort === "amount") {
        const currencies = new Set(output.map(country => country.currency).filter(Boolean));
        const options = new Set(output.map(country => country.investmentOptions.map(option => option.en).join("|")));
        if (currencies.size > 1 || options.size > 1) return localizedText(left.name, locale).localeCompare(localizedText(right.name, locale));
        if (left.verifiedAmount === null && right.verifiedAmount !== null) return 1;
        if (left.verifiedAmount !== null && right.verifiedAmount === null) return -1;
        if (left.verifiedAmount !== null && right.verifiedAmount !== null && left.verifiedAmount !== right.verifiedAmount) return left.verifiedAmount - right.verifiedAmount;
      }
      if (sort === "updated") {
        const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : Number.NaN;
        const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : Number.NaN;
        if (Number.isNaN(leftTime) && !Number.isNaN(rightTime)) return 1;
        if (!Number.isNaN(leftTime) && Number.isNaN(rightTime)) return -1;
        if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) return rightTime - leftTime;
      }
      return localizedText(left.name, locale).localeCompare(localizedText(right.name, locale), locale === "zh" ? "zh-CN" : "en-GB");
    });
  }, [filters, locale, query, records, sort, range, family, focus]);

  function toggleSelected(slug: string) {
    setSelected((current) => current.includes(slug) ? current.filter((item) => item !== slug) : current.length < 4 ? [...current, slug] : current);
  }
  function clearFilters() { setQuery(""); setFilters(INITIAL_FILTERS); setSort("name"); setSelected([]); setRange({ min: "", max: "" }); setFamily([]); setFocus([]); }
  const compareHref = "/" + locale + "/identity/explorer/compare?countries=" + selected.map(encodeURIComponent).join(",");
  const otherLocale: CbiLocale = locale === "zh" ? "en" : "zh";

  return <>
    <main className={styles.main} data-cbi-explorer>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={label(locale, "面包屑导航", "Breadcrumb")}><Link href={"/" + locale + "/identity"}>{label(locale, "全球身份规划", "Global Identity Planning")}</Link><span aria-hidden="true">/</span><span>{label(locale, "全球投资入籍与护照规划中心", "Global Citizenship & Passport Planning Center")}</span></nav>
        <section className={styles.hero} aria-labelledby="cbi-explorer-title">
          <div><p className={styles.eyebrow}>{label(locale, "精选投资入籍国家资料", "SELECTED CITIZENSHIP BY INVESTMENT EXPLORER")}</p><h1 id="cbi-explorer-title">{label(locale, "全球投资入籍与护照规划中心", "Global Citizenship & Passport Planning Center")}</h1><p className={styles.heroLead}>{label(locale, "按国家、运营与法律状态、投资方式及最低金额、币种、家庭成员、居住要求、双重国籍和护照签发状态检索资料。空缺资料会明确标注待核实。", "Search by country, operational and legal status, investment route and minimum amount, currency, family eligibility, residence, dual nationality and passport issuance status. Missing facts remain pending verification.")}</p></div>
          <div className={styles.heroNote}><strong>{label(locale, "资料边界", "Information boundary")}</strong>{label(locale, "本检索不排名、不计算指数；居留、国籍、公民身份、护照、旅行证件与签证须分别核验。", "This explorer does not rank or score records. Residency, nationality, citizenship status, passports, travel documents and visas require separate verification.")}</div>
        </section>
        {preview ? <div className={styles.reviewBanner} role="status"><strong>{label(locale, "内部审核预览", "Internal review preview")}</strong>{label(locale, "以下资料是候选导入记录，尚未发布，不构成官方政策或公开申请入口。", "These are candidate import records under review. They are not published and are not an official policy or public application channel.")}</div> : null}
        <section className={styles.controls} aria-label={label(locale, "检索筛选", "Search and filters")}>
          <div className={styles.control}><label htmlFor="cbi-query">{label(locale, "关键词", "Search")}</label><input id="cbi-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label(locale, "国家、项目或官方名称", "Country, programme or official name")} /></div>
          {FILTER_KEYS.map((field) => <FilterSelect key={field} id={"cbi-filter-" + field} field={field} label={filterLabel(locale, field)} value={filters[field]} onChange={(value) => setFilters((current) => ({ ...current, [field]: value }))} options={options[field]} locale={locale} />)}
          <div className={styles.control}><label htmlFor="cbi-sort">{label(locale, "排序", "Sort")}</label><select id="cbi-sort" data-cbi-sort value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="name">{label(locale, "名称", "Name")}</option><option value="amount">{label(locale, "已核实金额（空值置后）", "Verified amount (null last)")}</option><option value="updated">{label(locale, "更新时间（新到旧）", "Updated (newest first)")}</option></select></div>
          <div className={styles.control}><label htmlFor="cbi-amount-min">{label(locale, "最低投资额下限（原币）", "Minimum investment from (original currency)")}</label><input id="cbi-amount-min" inputMode="decimal" value={range.min} onChange={event => setRange(current => ({ ...current, min: event.target.value }))} /></div>
          <div className={styles.control}><label htmlFor="cbi-amount-max">{label(locale, "最低投资额上限（原币）", "Minimum investment to (original currency)")}</label><input id="cbi-amount-max" inputMode="decimal" value={range.max} onChange={event => setRange(current => ({ ...current, max: event.target.value }))} /></div>
          <button className={styles.button + " " + styles.buttonSecondary} data-cbi-clear type="button" onClick={clearFilters}>{label(locale, "清空", "Clear")}</button>
        </section>
        <p className={styles.boundary} data-cbi-cost-boundary>{label(locale, "金额区间须先选择同一币种；仅匹配逐字段核实的法定最低投资额。不换汇，不合并费用，不将不同投资方式视为相同成本；不满足这些条件时金额排序保留名称顺序。", "Choose one currency for amount ranges. Only field-verified legal minimums match. No conversion, merged fees or equivalent-cost assumption across investment routes; otherwise amount sorting retains name order.")}</p>
        {(range.min || range.max) && (filters.currency === "all" || filters.currency === UNKNOWN) ? <p role="alert">{label(locale, "请先选择币种；没有币种或金额未核实的记录不会进入区间结果。", "Select a currency first. Missing currency or unverified amounts do not match the range.")}</p> : null}
        {invalidRange ? <p role="alert">{label(locale, "请输入有效的非负金额，下限不得高于上限。", "Enter valid non-negative amounts; the lower bound cannot exceed the upper bound.")}</p> : null}
        <PlanningFilters locale={locale} family={family} focus={focus} onFamily={value => setFamily(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])} onFocus={value => setFocus(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])} />
        <section aria-labelledby="cbi-results-title"><div className={styles.resultsHeader}><h2 id="cbi-results-title">{label(locale, "资料记录", "Records")}</h2><p>{label(locale, "显示 " + filtered.length + " / " + records.length + " 条", filtered.length + " of " + records.length + " records")}</p></div>{filtered.length ? <div className={styles.cards}>{filtered.map((country) => <CountryCard key={country.slug} country={country} locale={locale} selected={selected.includes(country.slug)} onToggle={() => toggleSelected(country.slug)} />)}</div> : <div className={styles.empty}><strong>{preview ? label(locale, "候选记录暂未匹配", "No candidate records match") : label(locale, "正式资料尚未发布", "No published records yet")}</strong><p>{preview ? label(locale, "请调整关键词或筛选条件；空缺字段不会被系统猜测。", "Adjust the search or filters. Missing fields are not guessed.") : label(locale, "公开检索只展示通过发布闸门的记录。当前暂无可公开资料，候选记录不会发送到正式用户界面。", "The public selector only displays records that pass the release gate. There are no public records yet; candidate records are not sent to the formal user interface.")}</p></div>}</section>
      </div>
    </main>
    <div className={styles.shell} style={{ paddingBottom: 32 }}><Link className={styles.localeSwitch} href={"/" + otherLocale + "/identity/explorer"}>{locale === "zh" ? "English" : "中文"}</Link></div>
    {selected.length ? <div className={styles.compareBar}><div className={styles.compareBarInner}><p>{label(locale, "已选择 " + selected.length + " 条。比较仅并列展示资料，不代表排名。", selected.length + " selected. Comparison is side-by-side information, not a ranking.")}</p><Link href={compareHref}>{label(locale, "打开比较", "Open comparison")} ↗</Link></div></div> : null}
  </>;
}

function FilterSelect({ id, field, label: fieldLabel, value, onChange, options, locale }: { id: string; field: FilterKey; label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]>; locale: CbiLocale }) {
  return <div className={styles.control}><label htmlFor={id}>{fieldLabel}</label><select id={id} data-cbi-filter={field} value={value} onChange={(event) => onChange(event.target.value)}><option value="all">{label(locale, "全部", "All")}</option>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select></div>;
}

function CountryCard({ country, locale, selected, onToggle }: { country: CbiCountry; locale: CbiLocale; selected: boolean; onToggle: () => void }) {
  const verifiedAmount = verifiedMinimum(country.raw);
  return <article className={styles.card} data-cbi-country={country.slug}>
    <header className={styles.cardHeader}><div><span role="img" aria-label={localizedText(country.name, locale)} data-cbi-card-flag>{countryFlag(country.code)}</span><h3>{localizedText(country.name, locale)}</h3><p lang={locale === "zh" ? "en" : "zh"}>{localizedText(country.name, locale === "zh" ? "en" : "zh")}</p><p>{localizedText(country.officialName, locale)} · {localizedText(country.programmeName, locale)}</p></div><span className={styles.status}>{contentStatusLabel(locale, country.publicationStatus)}</span></header>
    <dl className={styles.cardMeta}>{[["法律状态","Legal status",localizedText(country.legalStatus,locale)],["投资方式","Investment options",comparisonField(country.raw,"investment_options",locale)],["家庭申请条件","Family conditions",comparisonField(country.raw,"family_eligibility",locale)],["居住要求","Residence",comparisonField(country.raw,"residence_requirement",locale)]].map(([zh,en,value])=><div className={styles.metaItem} key={en}><dt>{label(locale,zh,en)}</dt><dd>{value}</dd></div>)}<div className={styles.metaItem}><dt>{label(locale, "计划类型", "Programme type")}</dt><dd>{localizedText(country.programmeType, locale)}</dd></div><div className={styles.metaItem}><dt>{label(locale, "运营状态", "Operational")}</dt><dd>{localizedText(country.operationalStatus, locale)}</dd></div><div className={styles.metaItem}><dt>{label(locale, "已核实金额", "Verified amount")}</dt><dd>{displayNumber(verifiedAmount, locale)}{verifiedAmount === null ? "" : " " + (country.currency ?? "")}</dd></div><div className={styles.metaItem}><dt>{label(locale, "最近核实", "Last verified")}</dt><dd>{displayDate(country.verifiedAt ?? country.updatedAt, locale)}</dd></div></dl>
    {country.raw.passport_issuance_status === "NON_CITIZEN_TRAVEL_DOCUMENT" ? <p>{label(locale, "非公民旅行证件不进入公民护照比较。", "Non-citizen travel documents are excluded from citizen passport comparison.")}</p> : null}
    <div className={styles.cardActions}><label className={styles.selectAction}><input type="checkbox" disabled={country.raw.passport_issuance_status === "NON_CITIZEN_TRAVEL_DOCUMENT"} checked={selected} onChange={onToggle} aria-label={label(locale, "选择" + localizedText(country.name, locale) + "进行比较", "Select " + localizedText(country.name, locale) + " for comparison")} />{label(locale, "加入比较", "Compare")}</label><Link href={"/" + locale + "/identity/countries/" + encodeURIComponent(country.slug)}>{label(locale, "查看详情", "View details")} ↗</Link></div>
  </article>;
}

function PlanningFilters({ locale, family, focus, onFamily, onFocus }: { locale: CbiLocale; family: string[]; focus: string[]; onFamily: (value: string) => void; onFocus: (value: string) => void }) {
  const families = [["INDIVIDUAL", "个人申请", "Individual"], ["COUPLE", "夫妻申请", "Couple"], ["MINOR_CHILDREN", "有未成年子女", "Minor children"], ["ADULT_CHILDREN", "有成年子女", "Adult children"], ["PARENTS", "父母共同规划", "Parents"]];
  const interests = [["residence_requirement_category", "希望减少实际居住要求", "Lower residence requirements"], ["minimum_investment", "关注投资成本", "Investment costs"], ["eligibility", "关注办理条件", "Application conditions"], ["travel_access_data", "关注旅行便利度", "Travel access"], ["dual_nationality_policy", "关注双重国籍", "Dual nationality"], ["family_eligibility", "关注长期家庭安排", "Long-term family arrangements"]];
  return <section className={styles.detailSection} data-cbi-planning-filters>
    <h2>{label(locale, "可选家庭规划筛选", "Optional family planning filters")}</h2>
    <p>{label(locale, "仅匹配具备对应核实资料的记录，不判断您的法律资格。未知资料不会推测匹配。选择只在当前页面使用，刷新即清空。", "Matches records with verified information only, without deciding your legal eligibility. Unknown data is not inferred. Choices stay in this page and clear on refresh.")}</p>
    <fieldset><legend>{label(locale, "家庭安排", "Family arrangements")}</legend>{families.map(([key, zh, en]) => <label key={key} style={{ display: "inline-flex", gap: 8, margin: 12 }}><input type="checkbox" data-cbi-family={key} checked={family.includes(key)} onChange={() => onFamily(key)} />{label(locale, zh, en)}</label>)}</fieldset>
    <fieldset><legend>{label(locale, "关注事项", "Planning interests")}</legend>{interests.map(([key, zh, en]) => <label key={key} style={{ display: "inline-flex", gap: 8, margin: 12 }}><input type="checkbox" data-cbi-focus={key} checked={focus.includes(key)} onChange={() => onFocus(key)} />{label(locale, zh, en)}</label>)}</fieldset>
  </section>;
}
