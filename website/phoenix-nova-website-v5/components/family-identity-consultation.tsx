"use client";

import { useState, type FormEvent } from "react";
import { identityConsultationPath, identityConsultationRevision, identityConsultationTopics } from "@/lib/identity-journey-consultation";

const labels = {
  RENEWAL: ["续签安排", "Renewal planning"],
  DOCUMENT: ["证件安排", "Document planning"],
  STATUS_REVIEW: ["身份路径复核", "Status review"],
};

export function FamilyIdentityConsultation({ locale, noticeId, getSignal }: {
  locale: "zh" | "en";
  noticeId: string;
  getSignal(): AbortSignal | undefined;
}) {
  const [topic, setTopic] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"ready" | "sending" | "received" | "denied" | "unavailable">("ready");
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const signal = getSignal();
    if (!signal || signal.aborted || !topic || !accepted || status === "sending" || status === "received") return;
    setStatus("sending");
    try {
      const response = await fetch(identityConsultationPath, {
        method: "POST", credentials: "same-origin", cache: "no-store", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeId, topic, accepted: true, consentRevision: identityConsultationRevision }),
      });
      if (signal.aborted) return;
      if (!response.ok) {
        setStatus(response.status === 401 || response.status === 403 ? "denied" : "unavailable");
        return;
      }
      const result = await response.json();
      if (!signal.aborted) setStatus(result.status === "RECEIVED" ? "received" : "unavailable");
    } catch {
      if (!signal.aborted) setStatus("unavailable");
    }
  }

  if (status === "received") return <p role="status">{t("经纬殿已收到咨询需求。预约时间由顾问另行确认。", "Your consultation request was received. An adviser will confirm any appointment separately.")}</p>;
  return <form onSubmit={submit}>
    <fieldset disabled={status === "sending"}>
      <legend>{t("申请身份咨询", "Request an identity consultation")}</legend>
      <label>
        {t("咨询主题", "Consultation topic")}{" "}
        <select value={topic} onChange={event => { setTopic(event.target.value); setAccepted(false); }} required>
          <option value="">{t("请选择", "Select a topic")}</option>
          {identityConsultationTopics.map(value => <option value={value} key={value}>{labels[value][locale === "zh" ? 0 : 1]}</option>)}
        </select>
      </label>
      <p><label><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required/>{" "}
        {t("我同意凤启顾问为处理本次咨询接收身份业务分类、所选主题及紧迫度区间。证件、具体日期和出入境记录不会随本次申请发送。",
          "I agree to share the service category, selected topic and urgency band with a Phoenix Nova adviser for this request. Documents, exact dates and travel records are excluded.")}
      </label></p>
      <button type="submit" className="fc-gold" disabled={!accepted || !topic}>{t("发送咨询需求", "Send consultation request")}</button>
    </fieldset>
    {status !== "ready" && <p role="status">{status === "sending" ? t("正在提交……", "Sending…") :
      status === "denied" ? t("当前会话或授权无法完成提交。", "This session or authorization cannot submit the request.") :
      t("尚未收到确认。请稍后重试。", "A receipt was not confirmed. Please retry later.")}</p>}
  </form>;
}
