"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "./health-landing.module.css";
import { dimensions, text } from "@/lib/health-compass";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function HealthConsultation({ locale, family = false }: { locale: "zh" | "en"; family?: boolean }) {
  const zh = locale === "zh";
  // Keep native submission disabled until React's local-only handler is attached.
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [service, setService] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [clientRegion, setClientRegion] = useState("");
  const [insuranceChannel, setInsuranceChannel] = useState("");
  const [prepared, setPrepared] = useState(false);
  const options = family ? [...dimensions.map(dimension => text(dimension.title, locale)), zh ? "希望先了解规划方式" : "Explore the planning approach first"] : zh
    ? [
      "就医前评估协调",
      "专业医疗翻译",
      "国际患者导航",
      "在地就医礼宾",
      "国际保险理赔协助",
      "海外客户赴华就医协调",
      "香港保险客户医疗协调",
      "希望先了解服务",
    ]
    : [
      "Pre-visit coordination",
      "Medical interpretation",
      "International patient navigation",
      "Local care concierge",
      "Insurance claims assistance",
      "Overseas-to-China care coordination",
      "Hong Kong insurance coordination",
      "Explore the services first",
    ];
  const contextFields = [
    {
      id: "referral-source",
      name: "referral_source",
      label: zh ? "咨询来源渠道" : "Referral source",
      value: referralSource,
      setValue: setReferralSource,
      options: zh
        ? [["uk", "英国来源渠道"], ["other-overseas", "其他海外来源渠道"], ["hong-kong", "香港来源渠道"], ["self-or-recommendation", "自行了解或推荐"], ["unclear", "尚未明确"]]
        : [["uk", "UK referral source"], ["other-overseas", "Other overseas referral source"], ["hong-kong", "Hong Kong referral source"], ["self-or-recommendation", "Self-discovered or recommendation"], ["unclear", "Not yet clear"]],
    },
    {
      id: "client-region",
      name: "client_region",
      label: zh ? "当前所在地区" : "Current region",
      value: clientRegion,
      setValue: setClientRegion,
      options: zh
        ? [["uk", "英国"], ["hong-kong", "香港"], ["mainland-china", "中国内地"], ["other-overseas", "其他海外地区"], ["unclear", "尚未明确"]]
        : [["uk", "United Kingdom"], ["hong-kong", "Hong Kong"], ["mainland-china", "Mainland China"], ["other-overseas", "Other overseas region"], ["unclear", "Not yet clear"]],
    },
    {
      id: "insurance-channel",
      name: "insurance_channel",
      label: zh ? "保险协调渠道" : "Insurance channel",
      value: insuranceChannel,
      setValue: setInsuranceChannel,
      options: zh
        ? [["hong-kong-insurance", "香港保险渠道"], ["other-insurance", "其他保险渠道"], ["self-pay-or-not-applicable", "自费或暂不涉及"], ["unclear", "尚未明确"]]
        : [["hong-kong-insurance", "Hong Kong insurance channel"], ["other-insurance", "Other insurance channel"], ["self-pay-or-not-applicable", "Self-pay or not involved"], ["unclear", "Not yet clear"]],
    },
  ] as const;
  const clearSelection = () => {
    setService("");
    setReferralSource("");
    setClientRegion("");
    setInsuranceChannel("");
    setPrepared(false);
  };
  return <div className={styles.consultation}>
    <p>{zh ? "咨询准备演示 · 无需填写个人或医疗资料" : "Consultation preparation demo · No personal or medical information needed"}</p>
    <form onSubmit={event => { event.preventDefault(); setPrepared(true); }}>
      <label htmlFor="health-service">{zh ? "您希望了解哪项服务？" : "Which service would you like to explore?"}</label>
      <select id="health-service" required value={service} onChange={event => { setService(event.target.value); setPrepared(false); }}>
        <option value="">{zh ? "请选择服务方向" : "Select a service"}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {!family && <details>
        <summary>{zh ? "补充沟通背景（可选）" : "Additional conversation context (optional)"}</summary>
        <p>{zh ? "以下三项含义不同，可分别留空；正式咨询时由顾问分别核对。本页仅作本地准备，不发送任何内容。" : "These three fields have different meanings and may be left blank independently. An adviser will verify them separately during a formal consultation. This page is local preparation only and sends nothing."}</p>
        {contextFields.map(field => <div key={field.name}>
          <label htmlFor={field.id}>{field.label}</label>
          <select id={field.id} name={field.name} value={field.value} onChange={event => { field.setValue(event.target.value); setPrepared(false); }}>
            <option value="">{zh ? "请选择（可留空）" : "Select (optional)"}</option>
            {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>)}
      </details>}
      <button className={styles.primary} type="submit" disabled={!ready}>{family
        ? (zh ? "查看咨询准备清单" : "View preparation checklist")
        : (zh ? "准备预约咨询" : "Prepare a consultation")}<span aria-hidden="true">↗</span></button>
    </form>
    <noscript><p>{zh ? "请启用 JavaScript 以使用本地咨询准备演示；此入口不发送咨询。" : "Enable JavaScript to use the local preparation demo. This entry does not send an enquiry."}</p></noscript>
    <div role="status" aria-live="polite" data-testid="health-consultation-status">
      {prepared && <div className={styles.prepared}>
        <strong>{zh ? "准备清单已在本页展开，尚未发送咨询。" : "Your checklist is shown here. No enquiry has been sent."}</strong>
        <p>{service} · {family
          ? (zh ? "可先思考家庭事务如何分工、到哪里核实资料取用渠道、何时复核安排；无需在本页填写任何个人信息。" : "Consider how tasks are shared, where to verify record-access channels, and when to review arrangements. No personal details are needed here.")
          : (zh ? "正式咨询时可先沟通目的地、时间安排、语言及陪同需要，再确认服务范围与费用。" : "For a future consultation, discuss your destination, timing, language and companion needs, then confirm scope and fees.")}</p>
        {!family && <>
          {referralSource && <p><strong>{zh ? "咨询来源渠道：" : "Referral source: "}</strong>{contextFields[0].options.find(([value]) => value === referralSource)?.[1]}</p>}
          {clientRegion && <p><strong>{zh ? "当前所在地区：" : "Current region: "}</strong>{contextFields[1].options.find(([value]) => value === clientRegion)?.[1]}</p>}
          {insuranceChannel && <p><strong>{zh ? "保险协调渠道：" : "Insurance channel: "}</strong>{contextFields[2].options.find(([value]) => value === insuranceChannel)?.[1]}</p>}
          <p>{zh ? "三项背景各自含义不同，正式咨询时由顾问分别核对；本页仅作本地准备，不发送任何内容。" : "These three fields have different meanings. An adviser will verify them separately during a formal consultation. This page is local preparation only and sends nothing."}</p>
        </>}
        <p>{zh ? "当前未接通顾问或预约系统。请勿在此提供病历、证件或保险单；本演示不保存选择，刷新即清空。" : "No advisor or booking system is connected. Do not provide medical records, identity documents or policies here. Your selection is not saved and resets on refresh."}</p>
        <button type="button" onClick={clearSelection}>{zh ? "清空选择" : "Clear selection"}</button>
      </div>}
    </div>
    <small>{zh ? "此入口仅演示咨询准备流程，不收集、提交或安排服务。" : "This demo prepares a conversation only. It does not collect, submit or arrange a service."}</small>
  </div>;
}
