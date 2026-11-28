"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { identityTimelinePath, type IdentityStayDate } from "@/lib/identity-journey-timeline";

type State = "loading" | "ready" | "denied" | "unavailable" | "stale";

export function FamilyIdentityTimeline({ locale }: { locale: "zh" | "en" }) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>("loading");
  const [dates, setDates] = useState<IdentityStayDate[]>([]);
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;
  const language = locale === "zh" ? "zh-HK" : "en-GB";
  const civilDate = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" });
  const reviewDate = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "Asia/Hong_Kong" });

  useEffect(() => {
    const controller = new AbortController();
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(expiry);
      controller.abort();
      setDates([]);
      setState("stale");
    };
    const hide = () => { if (document.hidden) clear(); };
    void fetch(identityTimelinePath, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setState(response.status === 401 || response.status === 403 ? "denied" : "unavailable");
          return;
        }
        const { dates: verifiedDates } = await response.json();
        if (controller.signal.aborted) return;
        setDates(verifiedDates);
        setState("ready");
        expiry = setTimeout(clear, 60_000);
      }).catch(() => { if (!controller.signal.aborted) setState("unavailable"); });
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", clear);
    return () => {
      controller.abort();
      clearTimeout(expiry);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", clear);
    };
  }, [reload]);

  function refresh() {
    setDates([]);
    setState("loading");
    setReload(value => value + 1);
  }

  return <section className="fc-panel" aria-labelledby="identity-timeline-title">
    <div className="fc-heading"><h2 id="identity-timeline-title"><CalendarDays aria-hidden="true"/>
      {t("获准逗留期限", "Permitted stay timeline")}</h2></div>
    <p className="fc-muted">{t("下列日期为获授权的个案期限记录，以香港日期显示。", "These authorized case records use Hong Kong calendar dates.")}</p>
    {state === "ready" ? <>
      {!dates.some(date => date.current) && <p role="status">{t("暂无可显示的当前核验期限。", "No current verified stay date is available.")}</p>}
      {dates.length > 0 && <ol>{dates.map(date => <li key={date.id} data-date-status={date.current ? "current" : "historical"}>
        <p><strong>{date.current ? t("当前记录", "Current record") : t("历史记录", "Previous record")}</strong>{" · "}
          <time dateTime={date.validUntil}>{civilDate.format(new Date(date.validUntil + "T00:00:00.000Z"))}</time></p>
        <p className="fc-muted">{t("记录日期", "Recorded")}{": "}
          <time dateTime={date.recordedAt}>{reviewDate.format(new Date(date.recordedAt))}</time></p>
      </li>)}</ol>}
    </> : <p role="status">{state === "loading" ? t("正在读取授权记录……", "Loading authorized records…") :
      state === "denied" ? t("当前会话无法读取期限。", "Your current session cannot access these dates.") :
      state === "stale" ? t("请刷新以重新核对访问权限。", "Refresh to recheck your access.") :
      t("期限暂不可用。", "Stay dates are temporarily unavailable.")}</p>}
    {state !== "loading" && <button type="button" className="fc-gold" onClick={refresh}>{t("刷新期限", "Refresh stay dates")}</button>}
  </section>;
}
