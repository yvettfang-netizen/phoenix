"use client";

import { useState } from "react";
import { CBI_IMPORT_MAX_BYTES, exportCbiErrorReport, previewCbiImport, type CbiImportPreview } from "@/lib/cbi-import";

type Locale = "zh" | "en";

const copy = (locale: Locale, zh: string, en: string) => locale === "zh" ? zh : en;

export function CbiImportPreviewPanel({ locale }: { locale: Locale }) {
  const [preview, setPreview] = useState<CbiImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > CBI_IMPORT_MAX_BYTES) {
      setPreview(null);
      setError(copy(locale, `文件超过 ${CBI_IMPORT_MAX_BYTES} bytes 上限，未读取内容。`, `File exceeds the ${CBI_IMPORT_MAX_BYTES}-byte limit; contents were not read.`));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setPreview(await previewCbiImport({ filename: file.name, bytes }));
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : "Import preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const downloadErrors = (format: "csv" | "json") => {
    if (!preview) return;
    const blob = new Blob([exportCbiErrorReport(preview, format)], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `cbi-${preview.batch_id}-errors.${format}`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <main style={{ width: "100%", maxWidth: 960, boxSizing: "border-box", overflowWrap: "anywhere", margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ letterSpacing: ".12em", fontSize: 12 }}>PHOENIX NOVA™ · INTERNAL CBI IMPORT REVIEW</p>
      <h1>{copy(locale, "CBI 国家数据导入预览", "CBI country-data import preview")}</h1>
      <p>{copy(locale, "仅用于本地预览、校验和错误报告导出。此页面不发布数据、不写入数据库，也不会在浏览器中伪造 Founder 权限。", "Local preview, validation and error-report export only. This page does not publish data, write to a database or simulate Founder authority in the browser.")}</p>
      <p><strong>{copy(locale, "四国范围：KN · AR · VU · ST", "Allowlist: KN · AR · VU · ST")}</strong></p>

      <label htmlFor="cbi-import-file" style={{ display: "block", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", margin: "24px 0", padding: "12px 16px", border: "1px solid currentColor", cursor: busy ? "wait" : "pointer" }}>
        {busy ? copy(locale, "正在预览…", "Previewing…") : copy(locale, "选择 CSV / XLSX / JSON", "Choose CSV / XLSX / JSON")}
        <input id="cbi-import-file" type="file" accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={event => void handleFile(event.target.files?.[0])} style={{ display: "block", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", marginTop: 8 }} />
      </label>

      {error ? <p role="alert" style={{ color: "#9b1c1c" }}>{error}</p> : null}
      {preview ? <section aria-live="polite">
        <h2>{copy(locale, "导入批次", "Import batch")}</h2>
        <dl>
          <div><dt>batch_id</dt><dd>{preview.batch_id}</dd></div>
          <div><dt>file_hash</dt><dd style={{ wordBreak: "break-all" }}>{preview.file_hash}</dd></div>
          <div><dt>gate</dt><dd>{preview.gate}</dd></div>
          <div><dt>records</dt><dd>{preview.records.length}</dd></div>
          <div><dt>issues</dt><dd>{preview.issues.length}</dd></div>
        </dl>
        <p>{copy(locale, "当前永远停留在 IMPORT_REVIEW；正式发布必须经过服务端授权的追加版本接口。", "This preview remains IMPORT_REVIEW; publication requires a server-authorized append-only version interface.")}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => downloadErrors("csv")}>{copy(locale, "下载 CSV 错误报告", "Download CSV error report")}</button>
          <button type="button" onClick={() => downloadErrors("json")}>{copy(locale, "下载 JSON 错误报告", "Download JSON error report")}</button>
        </div>
        <h2>{copy(locale, "记录预览", "Record preview")}</h2>
        <div style={{ maxWidth: "100%", overflowX: "auto", border: "1px solid #d7dbe2" }}>
          <table style={{ minWidth: 980, width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["country_id", "country_code", copy(locale, "项目", "programme"), "minimum_investment", "currency", "legal_status", "operational_status", "application_status", "passport_issuance_status", "official_sources", "last_verified_at", "next_review_at"].map(label => <th key={label} scope="col" style={{ textAlign: "left", padding: 8, whiteSpace: "nowrap", borderBottom: "1px solid #d7dbe2" }}>{label}</th>)}</tr></thead>
            <tbody>{preview.records.map(record => {
              const programme = record.programme_name ? `${record.programme_name.zh ?? ""} / ${record.programme_name.en ?? ""}` : null;
              const sourceDates = record.official_sources.map(source => source.verified_at).filter(Boolean).join(", ");
              const cell = (value: unknown) => value === null || value === undefined || value === "" ? copy(locale, "待核实", "To verify") : String(value);
              return <tr key={`${record.country_code}-${record.programme_id ?? "country"}`}>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.country_id)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.country_code)}</td>
                <td style={{ padding: 8 }}>{cell(programme)}</td>
                <td style={{ padding: 8 }}>{cell(record.minimum_investment)}</td>
                <td style={{ padding: 8 }}>{cell(record.currency)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.legal_status)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.operational_status)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.application_status)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.passport_issuance_status)}</td>
                <td style={{ padding: 8 }}>{record.official_sources.length > 0 ? `${record.official_sources.length} · ${record.official_sources.map(source => source.source).join(", ")}` : cell(null)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.last_verified_at || sourceDates)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{cell(record.next_review_at)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <h2>{copy(locale, "校验问题", "Validation issues")}</h2>
        {preview.issues.length === 0 ? <p>{copy(locale, "没有发现校验问题；仍需服务端人工核验。", "No validation issues found; server-side review is still required.")}</p> : <ul>{preview.issues.map((item, index) => <li key={`${item.code}-${item.path}-${index}`}><code>{item.code}</code> · {item.path} · {item.message}</li>)}</ul>}
      </section> : null}
    </main>
  );
}
