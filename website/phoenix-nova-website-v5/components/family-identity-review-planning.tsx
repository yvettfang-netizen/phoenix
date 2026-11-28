"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hkCivilDate } from "@/lib/identity-journey";
import {
  identityReviewPlanningPath,
  identityReviewPlanOffsets,
  type IdentityReviewPlanOffset,
  type IdentityReviewPlanOption,
} from "@/lib/identity-journey-review-planning-contract";
import { identityPathways } from "@/lib/identity-journey-policy";

type Locale = "zh" | "en";
type LoadState = "loading" | "ready" | "empty" | "denied" | "unavailable" | "stale";
type Notice = "saved" | "stale" | "transport" | null;

const allowedKinds = new Set<IdentityReviewPlanOption["kind"]>([
  "INVESTMENT_REVIEW",
  "PERMANENT_RESIDENCE_PREPARATION",
]);

function text(locale: Locale, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validOffset(value: unknown): value is IdentityReviewPlanOffset {
  return typeof value === "number" && (identityReviewPlanOffsets as readonly number[]).includes(value);
}

function parseOption(value: unknown): IdentityReviewPlanOption | null {
  if (!isRecord(value) || typeof value.ref !== "string" || !value.ref
    || !allowedKinds.has(value.kind as IdentityReviewPlanOption["kind"])
    || (value.path !== null && typeof value.path !== "string")
    || !validDate(value.startedOn)
    || (value.currentOn !== null && !validDate(value.currentOn))
    || !Array.isArray(value.offsets)) return null;
  const offsets = value.offsets.filter(validOffset);
  if (offsets.length !== value.offsets.length) return null;
  return {
    ref: value.ref,
    kind: value.kind as IdentityReviewPlanOption["kind"],
    path: value.path as string | null,
    startedOn: value.startedOn,
    currentOn: value.currentOn as string | null,
    offsets,
  };
}

function parseOptions(value: unknown): IdentityReviewPlanOption[] {
  if (!isRecord(value) || !Array.isArray(value.options)) return [];
  return value.options.map(parseOption).filter((option): option is IdentityReviewPlanOption => option !== null);
}

function randomRequestRef() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : null;
}

function kindLabel(kind: IdentityReviewPlanOption["kind"], locale: Locale) {
  return kind === "INVESTMENT_REVIEW"
    ? text(locale, "投资相关资料复核", "Investment-related review")
    : text(locale, "永久居民相关资料准备", "Permanent residence preparation");
}

function offsetLabel(offset: IdentityReviewPlanOffset, locale: Locale) {
  return locale === "en" ? `${offset} days before` : `提前 ${offset} 天`;
}

function pathwayLabel(path: string | null, locale: Locale) {
  if (!path || !Object.hasOwn(identityPathways, path)) return null;
  const pathway = identityPathways[path as keyof typeof identityPathways];
  return text(locale, pathway.labelZh, pathway.labelEn);
}

export function FamilyIdentityReviewPlanning({
  locale,
  memberRef,
  enabled,
  onSaved,
}: {
  locale: Locale;
  memberRef: string;
  enabled: boolean;
  onSaved?: () => void;
}) {
  const [options, setOptions] = useState<IdentityReviewPlanOption[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [on, setOn] = useState("");
  const [earliestPlanDate, setEarliestPlanDate] = useState("");
  const [offsets, setOffsets] = useState<IdentityReviewPlanOffset[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const saveControllerRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const sequenceRef = useRef(0);
  const draftSignatureRef = useRef("");
  const requestRefRef = useRef<string | null>(null);

  const clearSensitive = useCallback((nextState: LoadState = "stale") => {
    sequenceRef.current += 1;
    controllerRef.current?.abort();
    saveControllerRef.current?.abort();
    controllerRef.current = null;
    saveControllerRef.current = null;
    setOptions([]);
    setSelectedRef(null);
    setOn("");
    setOffsets([]);
    setConfirmed(false);
    setSaving(false);
    savingRef.current = false;
    setNotice(null);
    setState(nextState);
    draftSignatureRef.current = "";
    requestRefRef.current = null;
  }, []);

  const loadOptions = useCallback(async () => {
    if (!enabled || !memberRef) return;
    const sequence = ++sequenceRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState("loading");
    setOptions([]);
    setSelectedRef(null);
    setOn("");
    setOffsets([]);
    setConfirmed(false);
    draftSignatureRef.current = "";
    requestRefRef.current = null;
    try {
      const response = await fetch(identityReviewPlanningPath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ action: "list", memberRef }),
        signal: controller.signal,
      });
      if (controller.signal.aborted || sequence !== sequenceRef.current) return;
      if (response.status === 401 || response.status === 403) throw new Error("denied");
      if (response.status === 503) throw new Error("unavailable");
      if (!response.ok) throw new Error("unavailable");
      const parsed = parseOptions(await response.json());
      if (sequence !== sequenceRef.current) return;
      setEarliestPlanDate(hkCivilDate(new Date(Date.now() + 86_400_000)));
      setOptions(parsed);
      setState(parsed.length ? "ready" : "empty");
    } catch (error) {
      if (controller.signal.aborted || sequence !== sequenceRef.current) return;
      setState(error instanceof Error && error.message === "denied" ? "denied" : "unavailable");
    }
  }, [enabled, memberRef]);

  useEffect(() => {
    if (!enabled || !memberRef) return;
    const initialLoad = window.setTimeout(() => void loadOptions(), 0);
    const invalidate = () => {
      if (document.visibilityState === "hidden") clearSensitive("stale");
      else void loadOptions();
    };
    const onPageHide = () => clearSensitive("stale");
    document.addEventListener("visibilitychange", invalidate);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearTimeout(initialLoad);
      document.removeEventListener("visibilitychange", invalidate);
      window.removeEventListener("pagehide", onPageHide);
      clearSensitive("stale");
    };
  }, [clearSensitive, enabled, loadOptions, memberRef]);

  const selectedOption = useMemo(
    () => options.find((option) => option.ref === selectedRef) ?? null,
    [options, selectedRef],
  );

  const selectOption = (option: IdentityReviewPlanOption) => {
    if (savingRef.current) return;
    setSelectedRef(option.ref);
    setOn(option.currentOn ?? "");
    setOffsets(option.offsets.filter(validOffset));
    setConfirmed(false);
    setNotice(null);
  };

  const toggleOffset = (offset: IdentityReviewPlanOffset) => {
    setOffsets((current) => current.includes(offset)
      ? current.filter((value) => value !== offset)
      : [...current, offset].sort((a, b) => b - a));
    setConfirmed(false);
    setNotice(null);
  };

  const save = async () => {
    if (!selectedOption || !validDate(on) || on < earliestPlanDate || !confirmed || saving || savingRef.current) return;
    const signature = JSON.stringify([selectedOption.ref, on, offsets]);
    if (signature !== draftSignatureRef.current) {
      draftSignatureRef.current = signature;
      requestRefRef.current = randomRequestRef();
    }
    const requestRef = requestRefRef.current;
    if (!requestRef) {
      setNotice("transport");
      return;
    }
    const sequence = sequenceRef.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    saveControllerRef.current?.abort();
    saveControllerRef.current = controller;
    savingRef.current = true;
    requestRefRef.current = requestRef;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(identityReviewPlanningPath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ action: "save", memberRef, planRef: selectedOption.ref, on, offsets, confirmed: true, requestRef }),
        signal: controller.signal,
      });
      if (controller.signal.aborted || sequence !== sequenceRef.current) return;
      if (response.status === 401 || response.status === 403) {
        clearSensitive("denied");
        return;
      }
      if (response.status === 409) {
        setNotice("stale");
        await loadOptions();
        return;
      }
      if (response.status === 503) {
        setNotice("transport");
        return;
      }
      if (!response.ok) throw new Error("unavailable");
      const result: unknown = await response.json();
      if (controller.signal.aborted || sequence !== sequenceRef.current) return;
      if (!isRecord(result) || result.status !== "SAVED") throw new Error("unavailable");
      setNotice("saved");
      onSaved?.();
      await loadOptions();
    } catch (error) {
      if (controller.signal.aborted || sequence !== sequenceRef.current ||
        (error instanceof DOMException && error.name === "AbortError")) return;
      setNotice("transport");
    } finally {
      if (saveControllerRef.current === controller) {
        saveControllerRef.current = null;
        savingRef.current = false;
        setSaving(false);
      }
    }
  };

  if (!enabled) return null;
  const stateMessage = state === "denied"
    ? text(locale, "当前会话无法读取身份规划。", "Identity planning is not available for this session.")
    : state === "unavailable"
      ? text(locale, "身份规划暂时不可用，请稍后重试。", "Identity planning is temporarily unavailable. Please try again.")
      : state === "stale"
        ? text(locale, "资料已清除，请重新核验后再查看。", "The planning information was cleared. Verify again to continue.")
        : null;

  return <section className="fc-panel" aria-labelledby="fc-identity-review-planning-title">
    <div className="fc-heading">
      <h3 id="fc-identity-review-planning-title">{text(locale, "身份规划准备", "Identity planning")}</h3>
      <span>{text(locale, "仅供规划，资格由人工核验", "Planning only; eligibility requires human review")}</span>
    </div>
    <p className="fc-muted">{text(locale, "选择已确认的内部规划日期，可分别设置提醒；也可以只保存日期。", "Choose an agreed planning date and optional reminder offsets, or save the date only.")}</p>
    {stateMessage ? <p className="fc-state" role="status" aria-live="polite">{stateMessage}</p> : null}
    {state === "unavailable" || state === "stale" ? <button type="button" className="fc-gold"
      onClick={() => void loadOptions()}>{text(locale, "重新读取规划", "Reload plans")}</button> : null}
    {(state === "unavailable" || state === "stale") ? <button type="button" className="fc-gold" onClick={() => void loadOptions()}>
      {text(locale, "重新读取规划", "Reload planning")}
    </button> : null}
    {notice === "saved" ? <p className="fc-muted" role="status">{text(locale, "已保存规划日期。", "Planning date saved.")}</p> : null}
    {notice === "stale" ? <p className="fc-muted" role="status">{text(locale, "规划内容已有变化，请根据最新信息重新选择。", "This planning item changed. Please choose again from the latest information.")}</p> : null}
    {notice === "transport" ? <p className="fc-muted" role="status">{text(locale, "暂未确认保存结果；可重试，系统会沿用本次请求。", "The save was not confirmed. Retry to reuse this request.")}</p> : null}
    {state === "loading" ? <p className="fc-muted" role="status" aria-live="polite">{text(locale, "正在读取可用规划……", "Loading available planning items…")}</p> : null}
    {state === "empty" ? <p className="fc-muted">{text(locale, "暂无可用的身份规划项目。", "No identity planning items are available.")}</p> : null}
    {state === "ready" ? <>
      <div role="group" aria-label={text(locale, "可用身份规划", "Available identity planning")}>
        {options.map((option) => <button
          key={option.ref}
          type="button"
          className="fc-date"
          aria-pressed={selectedRef === option.ref}
          disabled={saving}
          onClick={() => selectOption(option)}
        >
          <span>
            <strong>{kindLabel(option.kind, locale)}</strong>
            <small>{[pathwayLabel(option.path, locale), text(locale, `阶段开始：${option.startedOn}`, `Stage started: ${option.startedOn}`), option.currentOn
              ? text(locale, `当前日期：${option.currentOn}`, `Current date: ${option.currentOn}`)
              : text(locale, "尚未设置规划日期", "No planning date set")].filter(Boolean).join(" · ")}</small>
          </span>
        </button>)}
      </div>
      {selectedOption ? <div className="fc-harmony-note">
        <label htmlFor="identity-review-date"><strong>{text(locale, "规划日期", "Planning date")}</strong></label>
        <input id="identity-review-date" type="date" min={earliestPlanDate} value={on} disabled={saving} onChange={(event) => { setOn(event.target.value); setConfirmed(false); setNotice(null); }} />
        <fieldset>
          <legend>{text(locale, "提醒（可选）", "Reminders (optional)")}</legend>
          <div>
            {identityReviewPlanOffsets.map((offset) => <label key={offset}>
              <input type="checkbox" checked={offsets.includes(offset)} disabled={saving} onChange={() => toggleOffset(offset)} />
              {offsetLabel(offset, locale)}
            </label>)}
          </div>
        </fieldset>
        <label>
          <input type="checkbox" checked={confirmed} disabled={saving || !on} onChange={(event) => setConfirmed(event.target.checked)} />
          {text(locale, "我确认该日期仅用于内部规划，不代表资格判断。", "I confirm this date is for planning only and does not determine eligibility.")}
        </label>
        <button type="button" className="fc-gold" disabled={!validDate(on) || on < earliestPlanDate || !confirmed || saving} onClick={() => void save()}>
          {saving ? text(locale, "正在保存……", "Saving…") : text(locale, "保存规划日期", "Save planning date")}
        </button>
      </div> : null}
    </> : null}
  </section>;
}
