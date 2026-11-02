"use client";

import type { CountryRecord } from "@/lib/cbi-schema";
import { buildComparisonReport } from "@/lib/cbi-comparison-engine";
import styles from "./cbi-explorer.module.css";

export function CbiComparisonReport({ records, locale, preview }: { records: CountryRecord[]; locale: "zh" | "en"; preview: boolean }) {
  const report = buildComparisonReport(records, locale, preview);
  const zh = locale === "zh";
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `phoenix-identity-comparison-${locale}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className={styles.detailSection} data-cbi-report aria-labelledby="cbi-report-title">
    <h2 id="cbi-report-title">Phoenix Nova™ Global Identity Comparison Report</h2>
    <p>{preview ? (zh ? "内部审核报告，未核实字段保留待核实；不得作为正式资料对外发布。" : "Internal review report. Unverified fields remain pending; not for public release.") : (zh ? "报告依据上方核实资料表生成，仅用于初步规划参考。" : "Generated from the verified information above, for preliminary planning only.")}</p>
    <ul>{report.countries.map(country => <li key={country.country_id}>{zh ? country.country_name_zh : country.country_name_en} · {zh ? "核实日期" : "Verified"}：{country.verified_at ?? (zh ? "待核实" : "Pending verification")}</li>)}</ul>
    <p>{report.risks}</p>
    <details data-cbi-report-gaps><summary>{zh ? `待核实事项（${report.gaps.length}）` : `Pending items (${report.gaps.length})`}</summary><ul>{report.gaps.map(gap => <li key={`${gap.country_id}-${gap.field}`}>{(report.countries.find(country => country.country_id === gap.country_id)?.[zh ? "country_name_zh" : "country_name_en"])} · {report.rows.find(row => row.key === gap.field)?.label} · {zh ? "待核实" : "Pending verification"}</li>)}</ul></details>
    <h3>{zh ? "官方来源与资料日期" : "Official sources and verification dates"}</h3>
    <ul>{report.official_sources.map(item => <li key={item.country_id}>{zh ? report.countries.find(country => country.country_id === item.country_id)?.country_name_zh : report.countries.find(country => country.country_id === item.country_id)?.country_name_en}：{item.sources.length ? item.sources.map((source, index) => <span key={index}><a href={source.official_url!} target="_blank" rel="noreferrer">{source.source} ↗</a> · {source.verified_at} </span>) : (zh ? "待核实" : "Pending verification")}</li>)}</ul>
    <p className={styles.boundary} data-cbi-report-notice>{report.notice}</p>
    <div className={styles.cardActions} data-cbi-report-actions><button className={styles.button} type="button" onClick={download}>{zh ? "生成并下载比较报告（JSON）" : "Generate comparison report (JSON)"}</button><button className={styles.button} type="button" onClick={() => window.print()}>{zh ? "打印 / 保存 PDF" : "Print / save as PDF"}</button></div>
    <p>{zh ? "报告仅由当前选择生成；页面不收集身份文件，不保存偏好，不传送至 CRM、Family OS 或 Founder OS。" : "Generated only from the current selection. No identity files, stored preferences or transfers to CRM, Family OS or Founder OS."}</p>
  </section>;
}
