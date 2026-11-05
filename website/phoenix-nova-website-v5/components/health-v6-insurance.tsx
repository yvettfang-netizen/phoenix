"use client";

import { useState } from "react";
import styles from "./health-v6-insurance.module.css";

type Locale = "zh" | "en";
type Copy = { zh: string; en: string };

const brands: readonly Copy[] = [
  { zh: "Manulife 宏利", en: "Manulife" },
  { zh: "AIA 友邦", en: "AIA" },
  { zh: "Prudential 保诚", en: "Prudential" },
  { zh: "AXA 安盛", en: "AXA" },
  { zh: "Bupa 保柏", en: "Bupa" },
  { zh: "Sun Life 永明", en: "Sun Life" },
  { zh: "FWD 富卫", en: "FWD" },
  { zh: "BOC Life 中银人寿", en: "BOC Life" },
  { zh: "China Life 中国人寿", en: "China Life" },
  { zh: "Cigna 信诺", en: "Cigna" },
  { zh: "HSBC Life 汇丰保险", en: "HSBC Life" },
] as const;

const specialties: readonly Copy[] = [
  { zh: "骨科与关节中心", en: "Orthopaedics & joints" },
  { zh: "肿瘤精准治疗", en: "Precision oncology" },
  { zh: "乳腺与女性健康", en: "Breast & women's health" },
  { zh: "胃肠内窥镜", en: "Gastrointestinal endoscopy" },
] as const;

const verificationFields: readonly Copy[] = [
  { zh: "保障地区", en: "Coverage territory" },
  { zh: "有效保单及版本", en: "Policy validity and version" },
  { zh: "住院与日间手术保障", en: "Inpatient and day-surgery coverage" },
  { zh: "预先批核要求", en: "Pre-authorisation requirements" },
  { zh: "香港医生转诊要求", en: "Hong Kong doctor referral requirements" },
  { zh: "指定医院网络", en: "Designated provider network" },
  { zh: "内地医院适用性", en: "Mainland hospital applicability" },
  { zh: "免找数或直付条件", en: "Direct billing conditions" },
  { zh: "免赔额及共同保险", en: "Deductible and coinsurance" },
  { zh: "申报文件与期限", en: "Claim documents and deadlines" },
] as const;

const statusLegend: readonly Copy[] = [
  { zh: "VERIFIED · 已有来源核实", en: "VERIFIED · Source checked" },
  { zh: "PARTIAL · 部分项目已核实", en: "PARTIAL · Partially checked" },
  { zh: "UNVERIFIED · 尚未核实", en: "UNVERIFIED · Not checked" },
  { zh: "NOT_APPLICABLE · 不适用", en: "NOT_APPLICABLE · Not applicable" },
] as const;

const unavailable = (locale: Locale) => locale === "zh" ? "暂未提供" : "Not available";

export function HealthV6Insurance({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [brand, setBrand] = useState("");
  const [specialty, setSpecialty] = useState("");
  const selectedBrand = brand !== "" ? brands[Number(brand)]?.[locale] : undefined;
  const selectedSpecialty = specialty !== "" ? specialties[Number(specialty)]?.[locale] : undefined;

  const reset = () => {
    setBrand("");
    setSpecialty("");
  };

  return (
    <div className={styles.root} data-testid="health-v6-insurance">
      <div className={styles.controls}>
        <label className={styles.field} htmlFor="health-v6-insurance-brand">
          <span>{zh ? "保险品牌（演示）" : "Insurance brand (demo)"}</span>
          <select
            id="health-v6-insurance-brand"
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            data-testid="health-v6-insurance-brand"
          >
            <option value="">{zh ? "请选择保险品牌" : "Select an insurer"}</option>
            {brands.map((item, index) => <option value={String(index)} key={item.en}>{item[locale]}</option>)}
          </select>
        </label>
        <label className={styles.field} htmlFor="health-v6-insurance-specialty">
          <span>{zh ? "重点专科（演示）" : "Specialty (demo)"}</span>
          <select
            id="health-v6-insurance-specialty"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            data-testid="health-v6-insurance-specialty"
          >
            <option value="">{zh ? "请选择专科方向" : "Select a specialty"}</option>
            {specialties.map((item, index) => <option value={String(index)} key={item.en}>{item[locale]}</option>)}
          </select>
        </label>
        <button className={styles.reset} type="button" onClick={reset} data-testid="health-v6-insurance-reset">
          {zh ? "清除选择" : "Clear selection"}
        </button>
      </div>

      <div className={styles.boundary}>
        <p>{zh ? "首批11家品牌仅为演示版核实对象，不代表合作、理赔直连或保障承诺。品牌层级不会自动继承任何产品的保障规则。" : "The first 11 brands are demonstration verification targets only. They do not indicate partnership, claims connectivity or coverage. Brand-level selection never inherits a product's terms."}</p>
        <p>{zh ? "未核实内容统一显示为 UNVERIFIED；请提供具体保险计划，由顾问进一步核实。" : "Unverified information is shown as UNVERIFIED. Please provide a specific insurance plan for further adviser verification."}</p>
        <div className={styles.legend} aria-label={zh ? "核实状态说明" : "Verification status legend"}>
          {statusLegend.map((item) => <span key={item.en}>{item[locale]}</span>)}
        </div>
      </div>

      <div className={styles.result} aria-live="polite" data-testid="health-v6-insurance-result">
        <div className={styles.resultHeader}>
          <div>
            <span className={styles.status}>UNVERIFIED</span>
            <h3>{selectedBrand && selectedSpecialty ? `${selectedBrand} · ${selectedSpecialty}` : (zh ? "等待选择核实对象" : "Select items to prepare a check")}</h3>
          </div>
          <span className={styles.demo}>{zh ? "本地演示" : "Local demo"}</span>
        </div>
        <dl className={styles.details}>
          <div><dt>{zh ? "具体计划" : "Plan"}</dt><dd>{unavailable(locale)}</dd></div>
          <div><dt>{zh ? "条款版本" : "Policy version"}</dt><dd>{unavailable(locale)}</dd></div>
          <div><dt>{zh ? "来源" : "Source"}</dt><dd>{unavailable(locale)}</dd></div>
          <div><dt>{zh ? "核实日期" : "Checked on"}</dt><dd>{unavailable(locale)}</dd></div>
          <div><dt>{zh ? "适用条件" : "Applicability"}</dt><dd>{unavailable(locale)}</dd></div>
        </dl>
        <div className={styles.checklist}>
          <h4>{zh ? "保单核验项目（全部待核实）" : "Policy verification checklist (all pending)"}</h4>
          <ul>
            {verificationFields.map((field) => <li key={field.en}>
              <span className={styles.checkStatus}>UNVERIFIED</span>
              <span>{field[locale]}</span>
              <strong>{unavailable(locale)}</strong>
            </li>)}
          </ul>
        </div>
        <p className={styles.notice}>{zh ? "此选择器不接收保单、病历、证件或其他敏感资料；不发送网络请求、不写入浏览器存储，也不会提交咨询。" : "This selector does not receive policies, medical records, identity documents or other sensitive data. It sends no network request, writes no browser storage and submits no enquiry."}</p>
        <p className={styles.notice}>{zh ? "查询结果不会承诺承保、预先批核、直付或理赔通过。" : "A result does not promise coverage, pre-authorisation, direct billing or claim approval."}</p>
      </div>
    </div>
  );
}

export { brands as healthV6InsuranceBrands, specialties as healthV6InsuranceSpecialties };
