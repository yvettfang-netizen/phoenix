"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import type { Locale } from "./v5-site";
import { educationConsultationOptions } from "@/lib/education-content";
import styles from "./education-landing.module.css";

export function EducationConsultation({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [direction, setDirection] = useState("");
  const [prepared, setPrepared] = useState(false);
  const selected = educationConsultationOptions.find(option => option[0] === direction);
  return <div className={styles.consultationPanel} data-testid="education-consultation">
    <span className={styles.status}>{zh ? "咨询准备演示 · 尚未接通预约系统" : "Preparation demo · Booking is not connected"}</span>
    <label htmlFor="education-direction">{zh ? "您希望了解的教育方向" : "Which education direction would you like to explore?"}</label>
    <select id="education-direction" value={direction} onChange={event => { setDirection(event.target.value); setPrepared(false); }}><option value="">{zh ? "请选择方向" : "Select a direction"}</option>{educationConsultationOptions.map(([id, cn, en]) => <option value={id} key={id}>{zh ? cn : en}</option>)}</select>
    <p>{zh ? "无需填写学生姓名、联系方式或上传证件、成绩单。本区不读取或传送评估答案。" : "No student name, contact details, identity documents or transcripts are needed. This section does not read or transfer assessment answers."}</p>
    <Button type="button" className={styles.primaryButton} disabled={!direction} onClick={() => setPrepared(true)}>{zh ? "查看咨询准备清单" : "View preparation checklist"}<span aria-hidden="true">↗</span></Button>
    <noscript><p>{zh ? "启用 JavaScript 可查看本地清单；本页不提交咨询。" : "Enable JavaScript for the local checklist. This page does not submit an enquiry."}</p></noscript>
    <div role="status" aria-live="polite" data-testid="education-preparation-status">{prepared && selected ? <div className={styles.checklist}>
      <strong>{zh ? "准备清单已展开，尚未发送咨询。" : "Your checklist is ready here. No enquiry has been sent."}</strong><p>{zh ? selected[1] : selected[2]}</p>
      <ul><li>{zh ? "想一想当前学习阶段、成长目标和最希望了解的问题，无需在此填写。" : "Consider the learner’s stage, goals and questions. You do not need to enter them here."}</li><li>{zh ? "正式沟通时确认课程、导师、服务范围、时间与费用。" : "Confirm courses, tutors, scope, timing and fees during a formal conversation."}</li><li>{zh ? "未成年人资料及后续交接须按适用规则核实监护人授权。" : "Verify appropriate guardian authorisation for a minor’s information and any subsequent handoff."}</li><li>{zh ? "敏感文件仅在必要、渠道安全且取得明确授权后提供。" : "Provide sensitive documents only when necessary, through a secure channel and with explicit authorisation."}</li></ul>
      <p>{zh ? "选择仅在当前页面内存中使用，刷新即清空；没有创建客户、预约或服务项目。" : "Your choice exists only in this page’s memory and clears on refresh. No client, booking or service project has been created."}</p>
      <Button type="button" variant="outline" className={styles.secondaryButton} onClick={() => { setDirection(""); setPrepared(false); }}>{zh ? "清空选择" : "Clear selection"}</Button>
    </div> : <p>{zh ? "尚未发送咨询。是否继续，由您自主决定。" : "No enquiry has been sent. Continuing is entirely your choice."}</p>}</div>
  </div>;
}
