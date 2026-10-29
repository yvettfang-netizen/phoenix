"use client";

import { useState } from "react";
import styles from "./health-landing.module.css";
import { dimensions, text } from "@/lib/health-compass";

export function HealthConsultation({ locale, family = false }: { locale: "zh" | "en"; family?: boolean }) {
  const zh = locale === "zh";
  const [service, setService] = useState("");
  const [prepared, setPrepared] = useState(false);
  const options = family ? [...dimensions.map(dimension => text(dimension.title, locale)), zh ? "希望先了解规划方式" : "Explore the planning approach first"] : zh
    ? ["就医前评估协调", "专业医疗翻译", "国际患者导航", "在地就医礼宾", "国际保险理赔协助", "希望先了解服务"]
    : ["Pre-visit coordination", "Medical interpretation", "International patient navigation", "Local care concierge", "Insurance claims assistance", "Explore the services first"];
  return <div className={styles.consultation}>
    <p>{zh ? "咨询准备演示 · 无需填写个人或医疗资料" : "Consultation preparation demo · No personal or medical information needed"}</p>
    <form onSubmit={event => { event.preventDefault(); setPrepared(true); }}>
      <label htmlFor="health-service">{zh ? "您希望了解哪项服务？" : "Which service would you like to explore?"}</label>
      <select id="health-service" required value={service} onChange={event => { setService(event.target.value); setPrepared(false); }}>
        <option value="">{zh ? "请选择服务方向" : "Select a service"}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <button className={styles.primary} type="submit">{zh ? "查看咨询准备清单" : "View preparation checklist"}<span aria-hidden="true">↗</span></button>
    </form>
    <div role="status" aria-live="polite" data-testid="health-consultation-status">
      {prepared && <div className={styles.prepared}>
        <strong>{zh ? "准备清单已在本页展开，尚未发送咨询。" : "Your checklist is shown here. No enquiry has been sent."}</strong>
        <p>{service} · {family
          ? (zh ? "可先思考家庭事务如何分工、到哪里核实资料取用渠道、何时复核安排；无需在本页填写任何个人信息。" : "Consider how tasks are shared, where to verify record-access channels, and when to review arrangements. No personal details are needed here.")
          : (zh ? "正式咨询时可先沟通目的地、时间安排、语言及陪同需要，再确认服务范围与费用。" : "For a future consultation, discuss your destination, timing, language and companion needs, then confirm scope and fees.")}</p>
        <p>{zh ? "当前未接通顾问或预约系统。请勿在此提供病历、证件或保险单；本演示不保存选择，刷新即清空。" : "No advisor or booking system is connected. Do not provide medical records, identity documents or policies here. Your selection is not saved and resets on refresh."}</p>
        <button type="button" onClick={() => { setService(""); setPrepared(false); }}>{zh ? "清空选择" : "Clear selection"}</button>
      </div>}
    </div>
    <small>{zh ? "此入口仅演示咨询准备流程，不收集、提交或安排服务。" : "This demo prepares a conversation only. It does not collect, submit or arrange a service."}</small>
  </div>;
}
