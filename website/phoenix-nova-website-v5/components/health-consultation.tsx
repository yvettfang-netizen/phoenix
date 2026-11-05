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
  const [careDestination, setCareDestination] = useState("");
  const [coordinationNeed, setCoordinationNeed] = useState("");
  const [prepared, setPrepared] = useState(false);
  const options = family ? [...dimensions.map(dimension => text(dimension.title, locale)), zh ? "希望先了解规划方式" : "Explore the planning approach first"] : zh
    ? [
      "医疗机构与预约协调",
      "医疗翻译与患者导航",
      "跨境就医安排",
      "在地服务支持",
      "后续跟进与保险理赔协助",
      "海外客户大湾区就医协调",
      "香港保险客户医疗协调",
      "希望先了解服务",
    ]
    : [
      "Medical institution & appointment coordination",
      "Medical translation & patient navigation",
      "Cross-border care arrangements",
      "Local support services",
      "Follow-up & insurance claims assistance",
      "Overseas-to-Greater-Bay-Area coordination",
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
      id: "care-destination",
      name: "care_destination",
      label: zh ? "就医目的地" : "Care destination",
      value: careDestination,
      setValue: setCareDestination,
      options: zh
        ? [["hong-kong", "香港"], ["shenzhen", "深圳"], ["other-gba", "其他大湾区内地城市（服务条件待核实）"], ["unclear", "尚未确定"]]
        : [["hong-kong", "Hong Kong"], ["shenzhen", "Shenzhen"], ["other-gba", "Other mainland GBA city (availability to verify)"], ["unclear", "Not decided"]],
    },
    {
      id: "coordination-need",
      name: "coordination_need",
      label: zh ? "服务协调需求" : "Coordination needs",
      value: coordinationNeed,
      setValue: setCoordinationNeed,
      options: zh
        ? [["appointment", "预约与流程沟通"], ["language", "语言与资料翻译协调"], ["travel", "跨境行程与在地安排"], ["insurance", "保险资料及后续跟进"], ["unclear", "希望先了解"]]
        : [["appointment", "Appointments and processes"], ["language", "Language and document translation"], ["travel", "Travel and local arrangements"], ["insurance", "Insurance documentation and follow-up"], ["unclear", "Explore the options first"]],
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
    setCareDestination("");
    setCoordinationNeed("");
    setPrepared(false);
  };
  const PreparationContainer = family ? "form" : "div";
  return <div className={styles.consultation}>
    <p>{zh ? "咨询准备演示 · 无需填写个人或医疗资料" : "Consultation preparation demo · No personal or medical information needed"}</p>
    <PreparationContainer onSubmit={event => { event.preventDefault(); if (service) setPrepared(true); }}>
      <label htmlFor="health-service">{zh ? "您希望了解哪项服务？" : "Which service would you like to explore?"}</label>
      <select id="health-service" required value={service} onChange={event => { setService(event.target.value); setPrepared(false); }}>
        <option value="">{zh ? "请选择服务方向" : "Select a service"}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {!family && <details>
        <summary>{zh ? "补充沟通背景（可选）" : "Additional conversation context (optional)"}</summary>
        <p>{zh ? "来源、所在地区、目的地、协调需求与保险渠道分别确认，可独立留空。本页仅作本地准备，不发送任何内容，也不确定合作伙伴或费用归属。" : "Source, current region, destination, coordination needs and insurance channel are separate and optional. This page prepares a conversation locally, sends nothing and does not assign a partner or financial attribution."}</p>
        {contextFields.map(field => <div key={field.name}>
          <label htmlFor={field.id}>{field.label}</label>
          <select id={field.id} value={field.value} onChange={event => { field.setValue(event.target.value); setPrepared(false); }}>
            <option value="">{zh ? "请选择（可留空）" : "Select (optional)"}</option>
            {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>)}
      </details>}
      <button data-testid="health-consultation-prepare" className={styles.primary} type={family ? "submit" : "button"} disabled={!ready || !service} onClick={() => { if (!family && service) setPrepared(true); }}>{family
        ? (zh ? "查看咨询准备清单" : "View preparation checklist")
        : (zh ? "准备预约咨询" : "Prepare a consultation")}<span aria-hidden="true">↗</span></button>
    </PreparationContainer>
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
          {careDestination && <p><strong>{zh ? "就医目的地：" : "Care destination: "}</strong>{contextFields[2].options.find(([value]) => value === careDestination)?.[1]}</p>}
          {coordinationNeed && <p><strong>{zh ? "服务协调需求：" : "Coordination needs: "}</strong>{contextFields[3].options.find(([value]) => value === coordinationNeed)?.[1]}</p>}
          {insuranceChannel && <p><strong>{zh ? "保险协调渠道：" : "Insurance channel: "}</strong>{contextFields[4].options.find(([value]) => value === insuranceChannel)?.[1]}</p>}
          <p>{zh ? "正式联系、资料使用与患者授权将分别确认；此处的选择不构成授权，也不会随评估答案自动交接。" : "Contact, document use and patient permissions must be confirmed separately. These choices do not grant permission or transfer assessment answers."}</p>
        </>}
        <p>{zh ? "当前未接通顾问或预约系统。请勿在此提供病历、证件或保险单；本演示不保存选择，刷新即清空。" : "No advisor or booking system is connected. Do not provide medical records, identity documents or policies here. Your selection is not saved and resets on refresh."}</p>
        <button type="button" onClick={clearSelection}>{zh ? "清空选择" : "Clear selection"}</button>
      </div>}
    </div>
    <small>{zh ? "此入口仅演示咨询准备流程，不收集、提交或安排服务。" : "This demo prepares a conversation only. It does not collect, submit or arrange a service."}</small>
  </div>;
}
