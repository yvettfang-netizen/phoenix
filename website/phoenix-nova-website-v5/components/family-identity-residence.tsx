"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CalendarRange, Globe2, ShieldCheck } from "lucide-react";
import {
  identityResidenceAbsenceReasons,
  identityMemberResidencePath,
  identityResidencePath,
  type IdentityResidenceOverview,
  type IdentityResidenceRecord,
  type IdentityResidenceReport,
  type IdentityTravelMovement,
} from "@/lib/identity-journey-residence-contract";

type State = "loading" | "ready" | "denied" | "unavailable" | "stale";
type ReportState = "idle" | "submitting" | "success" | "error";
type FormState = {
  from: string;
  untilBefore: string;
  place: "HK" | "AWAY";
  absenceReason: string;
  expectedReturnOn: string;
};

const initialForm = (): FormState => ({
  from: "",
  untilBefore: "",
  place: "AWAY",
  absenceReason: "",
  expectedReturnOn: "",
});

const sourceValues = ["SELF_REPORTED", "ADVISER_VERIFIED", "OFFICIAL_RECORD", "UNSPECIFIED"] as const;
const reasonValues = identityResidenceAbsenceReasons as readonly string[];

function isCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isNullableCivilDate(value: unknown): value is string | null {
  return value === null || isCivilDate(value);
}

function isResidenceRecord(value: unknown): value is IdentityResidenceRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && row.id.length > 0 &&
    isCivilDate(row.from) && isCivilDate(row.untilBefore) && row.from < row.untilBefore &&
    (row.place === "HK" || row.place === "AWAY" || row.place === "UNVERIFIED") &&
    sourceValues.includes(row.source as typeof sourceValues[number]) &&
    (row.absenceReason === null || reasonValues.includes(row.absenceReason as string)) &&
    isNullableCivilDate(row.expectedReturnOn);
}

function isTravelMovement(value: unknown): value is IdentityTravelMovement {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return isCivilDate(row.on) && (row.direction === "ARRIVAL" || row.direction === "DEPARTURE");
}

function isResidenceOverview(value: unknown): value is IdentityResidenceOverview {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (!isCivilDate(data.asOf) || typeof data.canReport !== "boolean" ||
      (data.currentRecordedAbsenceDays !== null && (typeof data.currentRecordedAbsenceDays !== "number" ||
        !Number.isSafeInteger(data.currentRecordedAbsenceDays) || data.currentRecordedAbsenceDays <= 0)) ||
      data.rightOfAbode !== "HUMAN_REVIEW_REQUIRED" ||
      data.passportEligibility !== "HUMAN_REVIEW_REQUIRED" ||
      !Array.isArray(data.records) || !data.records.every(isResidenceRecord) ||
      (data.movements !== undefined && (!Array.isArray(data.movements) || data.movements.length > 512 || !data.movements.every(isTravelMovement))) ||
      !Array.isArray(data.years)) return false;
  if (Array.isArray(data.movements)) {
    const asOfYear = Number(data.asOf.slice(0, 4));
    const windowFrom = `${asOfYear - 6}-01-01`;
    const keys = new Set<string>();
    for (const item of data.movements) {
      const movement = item as IdentityTravelMovement;
      const key = `${movement.on}:${movement.direction}`;
      if (movement.on < windowFrom || movement.on > data.asOf || keys.has(key)) return false;
      keys.add(key);
    }
  }
  return data.years.every(year => {
    if (!year || typeof year !== "object") return false;
    const row = year as Record<string, unknown>;
    return Number.isInteger(row.year) && typeof row.recordedInHongKongDays === "number" &&
      typeof row.longestRecordedAbsenceDays === "number" && Number.isInteger(row.recordedInHongKongDays) &&
      Number.isInteger(row.longestRecordedAbsenceDays) && row.recordedInHongKongDays >= 0 &&
      row.longestRecordedAbsenceDays >= 0 && Array.isArray(row.unverified) &&
      row.unverified.every(gap => {
        if (!gap || typeof gap !== "object") return false;
        const item = gap as Record<string, unknown>;
        return isCivilDate(item.from) && isCivilDate(item.until) && item.from < item.until;
      });
  });
}

function formatCivil(value: string, locale: "zh" | "en") {
  if (!isCivilDate(value)) return value;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-HK" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function labelPlace(place: IdentityResidenceRecord["place"], locale: "zh" | "en") {
  const labels = {
    HK: ["香港境内", "In Hong Kong"],
    AWAY: ["离港／境外", "Outside Hong Kong"],
    UNVERIFIED: ["待核验区间", "Unverified interval"],
  } as const;
  return labels[place][locale === "zh" ? 0 : 1];
}

function labelSource(source: IdentityResidenceRecord["source"], locale: "zh" | "en") {
  const labels = {
    SELF_REPORTED: ["本人记录", "Self-reported"],
    ADVISER_VERIFIED: ["顾问核验", "Adviser-verified"],
    OFFICIAL_RECORD: ["官方记录", "Official record"],
    UNSPECIFIED: ["来源未说明", "Source unspecified"],
  } as const;
  return labels[source][locale === "zh" ? 0 : 1];
}

function labelReason(reason: string, locale: "zh" | "en") {
  const labels: Record<string, [string, string]> = {
    WORK: ["工作", "Work"],
    STUDY: ["学习", "Study"],
    FAMILY: ["家庭事务", "Family"],
    OTHER: ["其他", "Other"],
    WITHHELD: ["不便说明", "Withheld"],
  };
  return labels[reason]?.[locale === "zh" ? 0 : 1] ?? reason;
}

function labelTravelDirection(direction: IdentityTravelMovement["direction"], locale: "zh" | "en") {
  return direction === "ARRIVAL"
    ? locale === "zh" ? "入境／抵港" : "Arrival"
    : locale === "zh" ? "出境／离港" : "Departure";
}

export function FamilyIdentityResidence({
  locale,
  memberRef,
  memberLabel,
}: {
  locale: "zh" | "en";
  /** Opaque authorized member reference. Presence means read-only member mode. */
  memberRef?: string;
  /** Display label from the already-authorized member roster; never a member id. */
  memberLabel?: string;
}) {
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;
  const memberMode = Boolean(memberRef);
  const titleId = memberMode ? "identity-member-residence-title" : "identity-residence-title";
  const movementTitleId = memberMode ? "identity-member-travel-movements-title" : "identity-travel-movements-title";
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>("loading");
  const [overview, setOverview] = useState<IdentityResidenceOverview | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showFullMovements, setShowFullMovements] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [reportState, setReportState] = useState<ReportState>("idle");
  const [reportMessage, setReportMessage] = useState("");
  const readController = useRef<AbortController | null>(null);
  const reportController = useRef<AbortController | null>(null);

  const clearSensitive = useCallback((nextState: State = "stale") => {
    readController.current?.abort();
    reportController.current?.abort();
    setOverview(null);
    setShowFullHistory(false);
    setShowFullMovements(false);
    setForm(initialForm());
    setReportState("idle");
    setReportMessage("");
    setState(nextState);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let expiry: ReturnType<typeof setTimeout> | undefined;
    readController.current = controller;
    const clear = () => clearSensitive("stale");
    const hide = () => { if (document.hidden) clear(); };

    const request = memberRef
      ? fetch(identityMemberResidencePath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ memberRef }),
        signal: controller.signal,
      })
      : fetch(identityResidencePath, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-store" },
        signal: controller.signal,
      });
    void request.then(async response => {
      if (controller.signal.aborted) return;
      if (!response.ok) {
        clearSensitive(response.status === 401 || response.status === 403 ? "denied" : "unavailable");
        return;
      }
      const value: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (!isResidenceOverview(value)) {
        clearSensitive("unavailable");
        return;
      }
      setOverview(value);
      setState("ready");
      expiry = setTimeout(clear, 60_000);
    }).catch(() => {
      if (!controller.signal.aborted) clearSensitive("unavailable");
    });

    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", clear);
    return () => {
      controller.abort();
      reportController.current?.abort();
      clearTimeout(expiry);
      if (readController.current === controller) readController.current = null;
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", clear);
    };
  }, [clearSensitive, memberRef, reload]);

  function refresh() {
    clearSensitive("loading");
    setReload(value => value + 1);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A member reference is read-only by construction. Never send a write
    // request carrying an authorized member reference.
    if (memberRef || !overview?.canReport || reportController.current) return;
    const today = overview.asOf;
    if (!isCivilDate(form.from) || !isCivilDate(form.untilBefore) || form.from >= form.untilBefore || form.untilBefore > today) {
      setReportState("error");
      setReportMessage(t("请输入有效的香港日期区间；结束日必须晚于起始日且不晚于今天。", "Enter a valid Hong Kong civil-date interval; the end date must be after the start and no later than today."));
      return;
    }
    if (form.place === "AWAY" && form.expectedReturnOn && (!isCivilDate(form.expectedReturnOn) || form.expectedReturnOn < form.untilBefore)) {
      setReportState("error");
      setReportMessage(t("可选回港日期必须不早于离港区间的结束日。", "The optional expected return date must not be earlier than the end of the absence interval."));
      return;
    }
    const body: IdentityResidenceReport = {
      from: form.from,
      untilBefore: form.untilBefore,
      place: form.place,
      absenceReason: form.place === "AWAY" && form.absenceReason ? form.absenceReason as IdentityResidenceReport["absenceReason"] : null,
      expectedReturnOn: form.place === "AWAY" && form.expectedReturnOn ? form.expectedReturnOn : null,
    };
    const controller = new AbortController();
    reportController.current = controller;
    setReportState("submitting");
    setReportMessage("");
    try {
      const response = await fetch(identityResidencePath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        clearSensitive(response.status === 401 || response.status === 403 ? "denied" : "unavailable");
        setReportMessage(t("暂时无法确认保存结果。刷新记录后可再试，重复申报不会新增同一条记录。",
          "The save could not be confirmed. Refresh your records before retrying. Retrying the same report will not create a duplicate."));
        return;
      }
      const result: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (!result || typeof result !== "object" || (result as { status?: unknown }).status !== "RECORDED") {
        clearSensitive("unavailable");
        setReportMessage(t("记录结果无法核验，请稍后重试。", "The record result could not be verified. Please try again."));
        return;
      }
      setForm(initialForm());
      setReportState("success");
      setReportMessage(t("记录已保存。", "Record saved."));
      setOverview(null);
      setState("loading");
      setReload(value => value + 1);
    } catch {
      if (!controller.signal.aborted) {
        clearSensitive("unavailable");
        setReportMessage(t("暂时无法确认保存结果，请先刷新记录。", "The save could not be confirmed. Refresh your records first."));
      }
    } finally {
      if (reportController.current === controller) reportController.current = null;
    }
  }

  const statusText = {
    loading: t("正在读取授权记录……", "Loading authorized records…"),
    denied: t("当前会话无法读取这些记录。", "Your current session cannot access these records."),
    unavailable: t("记录暂不可用，请稍后重试。", "These records are temporarily unavailable."),
    stale: t("记录已清除，请刷新后重新核验访问权限。", "The records were cleared. Refresh to recheck access."),
    ready: "",
  }[state];

  return <section
    className="fc-panel"
    aria-labelledby={titleId}
    data-identity-member-residence={memberMode ? "true" : undefined}
    data-member-residence-readonly={memberMode ? "true" : undefined}
  >
    <div className="fc-heading">
      <h2 id={titleId}><Globe2 aria-hidden="true" />{memberMode ? t("成员出入境与通常居住记录", "Member travel, entry and ordinary residence records") : t("出入境与通常居住记录", "Travel, entry and ordinary residence records")}</h2>
      {overview ? <span>{t("截至", "As of")} {formatCivil(overview.asOf, locale)}</span> : null}
    </div>
    {memberMode ? <div className="fc-context selected-member-context" role="note" aria-label={t("所选成员只读上下文", "Selected member read-only context")}>
      <strong>{t("当前查看成员：", "Viewing member: ")}{memberLabel || t("已授权成员", "Authorized member")}</strong>
      <span>{t("仅显示经授权的只读记录；成员视图不能提交新的出入境记录。", "Only authorized read-only records are shown; new residence records cannot be submitted from a member view.")}</span>
    </div> : null}
    <p className="fc-muted">{t("这里只整理经授权的记录，不自动判断通常居住、永久居民或护照资格。所有区间为香港民用日期，结束日不含当天。", "This area organizes authorized records only. It does not determine ordinary residence, permanent-resident status or passport eligibility. Intervals use Hong Kong civil dates and exclude the end date.")}</p>
    {state !== "ready" ? <p className="fc-state" role="status" aria-live="polite">{reportMessage || statusText}</p> : null}
    {state === "ready" && overview ? <>
      <p className="fc-muted">{t("下方显示最近七个日历年的记录。", "This view shows the seven most recent calendar years.")}</p>
      {overview.currentRecordedAbsenceDays === null ? null : <p>{t("截至昨日，已连续记录离港", "Consecutive days recorded away through yesterday")}{" "}
        <strong>{overview.currentRecordedAbsenceDays}</strong> {t("天", "days")}</p>}
      <div role="note" className="fc-harmony-note">
        <p><ShieldCheck size={16} aria-hidden="true" />{t("计划回港日期仅供安排，法定期限以适用官方资料为准。", "Use expected return dates for planning. Refer to the applicable official information for statutory deadlines.")}</p>
      </div>
      <div className="fc-residence-years">
        {overview.years.map(year => <article className="fc-harmony-note" key={year.year}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>{year.year}</h3>
          <p>{t("已记录在港", "Recorded in Hong Kong")}: <strong>{year.recordedInHongKongDays}</strong> {t("天", "days")}</p>
          <p>{t("最长已记录离港", "Longest recorded absence")}: <strong>{year.longestRecordedAbsenceDays}</strong> {t("天", "days")}</p>
          {year.unverified.length > 0 ? <details className="fc-muted">
            <summary>{t("待核验区间", "Intervals to review")} ({year.unverified.length})</summary>
            <ul>{year.unverified.map(gap => <li key={gap.from}>{formatCivil(gap.from, locale)} – {formatCivil(gap.until, locale)}</li>)}</ul>
          </details> : null}
        </article>)}
      </div>
      {overview.movements?.length ? <section className="fc-harmony-note" data-identity-travel-movements="true" aria-labelledby={movementTitleId}>
        <h3 id={movementTitleId} style={{ margin: "0 0 8px", fontSize: 15 }}>{t("已核验出入境日期", "Verified travel dates")}</h3>
        <p className="fc-muted">{t("仅显示经授权且已核验的日期，不据此推断通常居住或任何资格。", "Only authorized and verified dates are shown; they do not infer ordinary residence or eligibility.")}</p>
        <div style={{ display: "grid", gap: 2 }}>
          {overview.movements.slice(0, showFullMovements ? undefined : 12).map(movement => <article className="fc-date fc-residence-record" key={`${movement.on}:${movement.direction}`}>
            <time dateTime={movement.on}>{formatCivil(movement.on, locale)}</time>
            <strong>{labelTravelDirection(movement.direction, locale)}</strong>
          </article>)}
        </div>
        {overview.movements.length > 12 ? <button className="fc-gold" type="button" onClick={() => setShowFullMovements(value => !value)}
          aria-expanded={showFullMovements}>{showFullMovements ? t("收起较早日期", "Hide earlier dates") : t("查看全部出入境日期", "Show all travel dates")}</button> : null}
      </section> : null}
      <div style={{ display: "grid", gap: 2, marginTop: 14 }}>
        {overview.records.length > 0 ? overview.records.slice(0, showFullHistory ? undefined : 12).map(record => <article className="fc-date fc-residence-record" key={record.id}>
          <span className="fc-residence-dates"><time dateTime={record.from}>{formatCivil(record.from, locale)}</time> – <time dateTime={record.untilBefore}>{formatCivil(record.untilBefore, locale)}</time></span>
          <span><strong>{labelPlace(record.place, locale)}</strong><small>{labelSource(record.source, locale)}{record.absenceReason ? ` · ${labelReason(record.absenceReason, locale)}` : ""}{record.expectedReturnOn ? ` · ${t("计划回港", "Planned return")}: ${formatCivil(record.expectedReturnOn, locale)}` : ""}</small></span>
        </article>) : <p className="fc-muted">{t("暂无可显示的授权记录。", "No authorized residence records are available.")}</p>}
      </div>
      {overview.records.length > 12 ? <button className="fc-gold" type="button" onClick={() => setShowFullHistory(value => !value)}
        aria-expanded={showFullHistory}>{showFullHistory ? t("收起较早记录", "Hide earlier records") : t("查看全部记录", "Show all records")}</button> : null}
      <div className="fc-context" role="status" aria-live="polite">
        <span>{t("通常居住辅助规划：需人工核验", "Ordinary-residence planning: human review required")}</span>
        <span>{t("居留权与永居资格：需人工核验", "Right of abode and permanent residence: human review required")}</span>
        <span>{t("护照资格：需人工核验", "Passport eligibility: human review required")}</span>
      </div>
      {overview.canReport && !memberMode ? <form onSubmit={submitReport} aria-labelledby="identity-residence-report-title">
        <fieldset style={{ border: "1px solid #e6d8c5", borderRadius: 10, padding: 12 }}>
          <legend id="identity-residence-report-title">{t("补充本人记录", "Add your record")}</legend>
          <p className="fc-muted">{t("提交日期和位置即可，无需上传证件。", "Submit dates and location. No documents are required.")}</p>
          <div className="fc-context">
            <label>{t("起始日（含）", "Start date (inclusive)")}<input required type="date" value={form.from} max={overview.asOf} onChange={event => setForm(current => ({ ...current, from: event.target.value }))} /></label>
            <label>{t("结束日（不含）", "End date (exclusive)")}<input required type="date" value={form.untilBefore} max={overview.asOf} onChange={event => setForm(current => ({ ...current, untilBefore: event.target.value }))} /></label>
            <div>
              <label htmlFor="identity-residence-place">{t("位置", "Location")}</label>
              <select id="identity-residence-place" value={form.place} onChange={event => setForm(current => ({ ...current, place: event.target.value as FormState["place"], absenceReason: event.target.value === "HK" ? "" : current.absenceReason, expectedReturnOn: event.target.value === "HK" ? "" : current.expectedReturnOn }))}>
                <option value="AWAY">{t("离港／境外", "Outside Hong Kong")}</option>
                <option value="HK">{t("香港境内", "In Hong Kong")}</option>
              </select>
            </div>
            {form.place === "AWAY" ? <div>
              <label htmlFor="identity-residence-reason">{t("离港原因（可选）", "Reason for absence (optional)")}</label>
              <select id="identity-residence-reason" value={form.absenceReason} onChange={event => setForm(current => ({ ...current, absenceReason: event.target.value }))}>
                <option value="">{t("未说明", "Not specified")}</option>
                {reasonValues.map(reason => <option key={reason} value={reason}>{labelReason(reason, locale)}</option>)}
              </select>
            </div> : null}
            {form.place === "AWAY" ? <label>{t("计划回港日（可选）", "Expected return (optional)")}<input type="date" value={form.expectedReturnOn} min={form.untilBefore || undefined} onChange={event => setForm(current => ({ ...current, expectedReturnOn: event.target.value }))} /></label> : null}
          </div>
          <button className="fc-gold" type="submit" disabled={reportState === "submitting"}>{reportState === "submitting" ? t("正在保存……", "Saving…") : t("提交记录", "Submit record")}</button>
          {reportMessage ? <p role="status" aria-live="polite" className="fc-muted">{reportMessage}</p> : null}
        </fieldset>
      </form> : <p className="fc-muted">{memberMode
        ? t("成员视图为只读；如需补充记录，请由本人在自己的授权模块中提交。", "Member view is read-only. To add a record, the signed-in person must use their own authorized module.")
        : t("自助补充记录暂未开放；已授权的只读记录仍可查看。", "Self-reporting is not currently open; authorized read-only records remain available.")}</p>}
    </> : null}
    {state !== "loading" ? <button type="button" className="fc-gold" onClick={refresh}><CalendarRange size={16} aria-hidden="true" />{t("刷新记录", "Refresh records")}</button> : null}
  </section>;
}
