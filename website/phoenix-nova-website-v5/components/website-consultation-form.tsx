"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "./ui/button";

const services = [
  ["education", "教育", "Education"],
  ["identity", "身份", "Identity"],
  ["wealth", "财富", "Wealth"],
  ["health", "健康", "Health"],
] as const;

export function WebsiteConsultationForm({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  const attempt = useRef<{ payload: string; requestId: string } | null>(null);
  const busy = useRef(false);
  const [status, setStatus] = useState<"idle" | "sending" | "received" | "error" | "limited">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || status === "received") return;
    const data = new FormData(event.currentTarget);
    const payload = { locale, service: data.get("service"), email: String(data.get("email") ?? "").trim(), consent: data.get("consent") === "on" };
    const encoded = JSON.stringify(payload);
    if (attempt.current?.payload !== encoded) {
      attempt.current = { payload: encoded, requestId: crypto.randomUUID() };
    }
    const { requestId } = attempt.current;
    busy.current = true;
    setStatus("sending");
    try {
      const response = await fetch("/api/website-consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestId }),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 429) {
        setStatus("limited");
        return;
      }
      const receipt = response.status === 202 ? await response.json() : null;
      setStatus(receipt?.status === "received" && receipt.requestId === requestId ? "received" : "error");
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }

  return <form method="post" action="/api/website-consultations" onSubmit={submit} className="grid gap-4">
    {status !== "received" && <fieldset disabled={status === "sending"} className="grid gap-4">
      <label className="grid gap-2">{zh ? "咨询方向" : "Service area"}
        <select required name="service" defaultValue="" className="min-h-11 rounded border bg-white px-3">
          <option value="" disabled>{zh ? "请选择" : "Select a service"}</option>
          {services.map(([value, cn, en]) => <option key={value} value={value}>{zh ? cn : en}</option>)}
        </select>
      </label>
      <label className="grid gap-2">{zh ? "电子邮箱" : "Email address"}
        <input required type="email" name="email" autoComplete="email" maxLength={254} className="min-h-11 rounded border bg-white px-3" />
      </label>
      <label className="flex min-h-11 items-start gap-3">
        <input className="mt-1 size-5 shrink-0" type="checkbox" name="consent" required aria-describedby="consultation-data-notice" />
        {zh ? "我同意凤启环球使用此邮箱就本次咨询联系我。" : "I agree that Phoenix Nova may use this email address to contact me about this enquiry."}
      </label>
      <Button type="submit" className="min-h-11 justify-self-start">{zh ? "提交咨询" : "Submit enquiry"}</Button>
    </fieldset>}
    <p role="status" aria-live="polite">
      {status === "sending" && (zh ? "正在提交…" : "Submitting…")}
      {status === "received" && (zh ? "已收到您的咨询。顾问将通过您提供的邮箱联系您。" : "Your enquiry was received. An adviser will contact you at the email address you provided.")}
      {status === "error" && (zh ? "暂时无法确认收到。请保留当前填写内容，稍后重试。" : "We could not confirm receipt. Keep your details as entered and try again later.")}
      {status === "limited" && (zh ? "请求过于频繁，请稍后重试。" : "Too many requests. Please try again later.")}
    </p>
  </form>;
}
