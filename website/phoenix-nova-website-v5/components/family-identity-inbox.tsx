"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { identityNoticePath, type IdentityNotice } from "@/lib/identity-journey-inbox";
import { FamilyIdentityConsultation } from "./family-identity-consultation";

type InboxState = "loading" | "ready" | "stale" | "denied" | "unavailable";

export function FamilyIdentityInbox({ locale, consultationEnabled, onOpenTimeline }: {
  locale: "zh" | "en";
  consultationEnabled?: boolean;
  onOpenTimeline?(): void;
}) {
  const [notices, setNotices] = useState<IdentityNotice[]>([]);
  const [state, setState] = useState<InboxState>("loading");
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [consultationNoticeId, setConsultationNoticeId] = useState<string | null>(null);
  const currentRequest = useRef<AbortController | null>(null);
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;
  const format = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong",
  });

  useEffect(() => {
    const controller = new AbortController();
    currentRequest.current = controller;
    let expires: ReturnType<typeof setTimeout> | undefined;
    const expire = () => {
      clearTimeout(expires);
      controller.abort();
      setNotices([]);
      setPending(null);
      setConsultationNoticeId(null);
      setState("stale");
    };
    const onVisibility = () => { if (document.hidden) expire(); };
    void fetch(identityNoticePath, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async response => {
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setState(response.status === 401 || response.status === 403 ? "denied" : "unavailable");
          return;
        }
        const result = await response.json();
        if (controller.signal.aborted) return;
        setNotices(result.notices);
        setState("ready");
        expires = setTimeout(expire, 60_000);
      }).catch(() => { if (!controller.signal.aborted) setState("unavailable"); });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", expire);
    return () => {
      controller.abort();
      clearTimeout(expires);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", expire);
    };
  }, [refresh]);

  async function acknowledge(id: string) {
    const signal = currentRequest.current?.signal;
    if (!signal || signal.aborted || pending) return;
    setPending(id);
    try {
      const response = await fetch(identityNoticePath, {
        method: "POST", credentials: "same-origin", cache: "no-store", signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        if (!signal.aborted) {
          setNotices([]);
          setState(response.status === 401 || response.status === 403 ? "denied" : "unavailable");
        }
        return;
      }
      const result = await response.json();
      if (!signal.aborted) setNotices(rows => rows.map(row => row.id === id ? { ...row, readAt: result.readAt } : row));
    } catch {
      if (!signal.aborted) {
        setNotices([]);
        setState("unavailable");
      }
    } finally {
      if (!signal.aborted) setPending(null);
    }
  }

  return <section className="fc-panel" aria-labelledby="identity-inbox-title">
    <div className="fc-heading"><h2 id="identity-inbox-title"><Bell aria-hidden="true"/>{t("身份提醒", "Identity notifications")}</h2></div>
    <p className="fc-muted">{t("站内通知时间为香港时间。请先核对你的身份档案，再安排下一步。", "Notification times are shown in Hong Kong time. Check your identity records before taking the next step.")}</p>
    {onOpenTimeline && <button type="button" className="fc-gold" onClick={onOpenTimeline}>
      {t("查看获准逗留期限", "View permitted stay dates")}
    </button>}
    {state !== "ready" ? <div role="status">
      <p>{state === "loading" ? t("正在读取提醒……", "Loading notifications…") :
        state === "denied" ? t("当前会话无法读取提醒。", "Your current session cannot access notifications.") :
        state === "stale" ? t("请刷新以重新核对访问权限。", "Refresh to recheck your access.") :
        t("提醒暂不可用。", "Notifications are temporarily unavailable.")}</p>
      {state !== "loading" && <button type="button" className="fc-gold" onClick={() => {
        setState("loading");
        setRefresh(value => value + 1);
      }}>{t("刷新提醒", "Refresh notifications")}</button>}
    </div> : notices.length === 0 ? <p role="status">{t("暂无可显示的提醒。", "No notifications to display.")}</p> :
      <ul aria-busy={pending !== null}>{notices.map(notice => <li key={notice.id}>
        <p>{t("身份事务提醒", "Identity planning reminder")}{" · "}
          <time dateTime={notice.publishedAt}>{format.format(new Date(notice.publishedAt))}</time></p>
        {notice.readAt ? <p className="fc-muted">{t("已读", "Read")}</p> :
          <button type="button" className="fc-gold" disabled={pending !== null}
            onClick={() => void acknowledge(notice.id)}>{t("标记为已读", "Mark as read")}</button>}
        {consultationEnabled && (
          consultationNoticeId === notice.id
            ? <FamilyIdentityConsultation locale={locale} noticeId={notice.id} getSignal={() => currentRequest.current?.signal}/>
            : <button type="button" onClick={() => setConsultationNoticeId(notice.id)}>
              {t("申请身份咨询", "Request an identity consultation")}
            </button>
        )}
      </li>)}</ul>}
  </section>;
}
