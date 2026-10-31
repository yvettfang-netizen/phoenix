"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { identityConsultationOptions } from "@/lib/identity-content";
import type { Locale } from "./v5-site";
import styles from "./identity-landing.module.css";

export function IdentityConsultation({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [direction, setDirection] = useState("");
  const [prepared, setPrepared] = useState(false);
  const selected = identityConsultationOptions.find(option => option[0] === direction);
  // No form, named controls, storage or network transport: this is local preparation.
  return <div className={styles.consultationPanel} data-testid="identity-consultation">
    <span className={styles.demoLabel}>{zh ? "咨询准备演示 · 尚未接通预约系统" : "Preparation demo · No booking system connected"}</span>
    <label htmlFor="identity-direction">{zh ? "您希望了解的规划方向" : "Which planning direction would you like to explore?"}</label>
    <select id="identity-direction" value={direction} onChange={event => { setDirection(event.target.value); setPrepared(false); }}>
      <option value="">{zh ? "请选择方向" : "Select a direction"}</option>
      {identityConsultationOptions.map(([value, cn, en]) => <option key={value} value={value}>{zh ? cn : en}</option>)}
    </select>
    <p className={styles.preparationNote}>{zh ? "无需提供姓名、联系方式、护照、身份证或家庭资料。本页不会读取身份评估答案。" : "No name, contact details, passport, identity document or family record is needed. This page does not read assessment answers."}</p>
    <Button type="button" className={styles.primaryButton} disabled={!direction} onClick={() => setPrepared(true)}>{zh ? "查看咨询准备清单" : "View preparation checklist"}<span aria-hidden="true">↗</span></Button>
    <noscript><p>{zh ? "请启用 JavaScript 查看本地准备清单；此页面不提交咨询。" : "Enable JavaScript to view the local checklist. This page does not submit an enquiry."}</p></noscript>
    <div role="status" aria-live="polite" data-testid="identity-preparation-status">
      {prepared && selected ? <div className={styles.checklist}>
        <strong>{zh ? "准备清单已展开，尚未发送咨询。" : "Your checklist is ready here. No enquiry has been sent."}</strong>
        <p>{zh ? selected[1] : selected[2]}</p>
        <ul><li>{zh ? "先想一想家庭的目标、期望时间与需要进一步了解的问题。" : "Consider your family’s goals, preferred timing and questions to explore."}</li><li>{zh ? "正式沟通时核实政策信息、服务范围、专业分工及费用。" : "Verify policy information, service scope, professional responsibilities and fees during a formal conversation."}</li><li>{zh ? "敏感文件仅在确有必要、渠道安全且取得明确授权后提供。" : "Provide sensitive documents only when necessary, through a secure channel and with explicit authorisation."}</li></ul>
        <p>{zh ? "此演示没有保存或提交任何选择，也没有创建客户、申请或预约。刷新页面即清空。" : "This demo has not saved or submitted your choice, or created a client, application or appointment. Refreshing clears it."}</p>
        <Button type="button" variant="outline" className={styles.secondaryButton} onClick={() => { setDirection(""); setPrepared(false); }}>{zh ? "清空选择" : "Clear selection"}</Button>
      </div> : <p className={styles.unsent}>{zh ? "尚未发送咨询。是否继续咨询，由您自主决定。" : "No enquiry has been sent. Continuing is entirely your choice."}</p>}
    </div>
  </div>;
}
