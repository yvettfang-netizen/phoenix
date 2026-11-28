"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Check, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import {
  identityStationConsentPath,
  identityStationNoticeVersion,
  identityStationToday,
  isIdentityStationThrough,
  parseIdentityStationInventory,
  type IdentityStationConsentInventory,
} from "@/lib/identity-journey-station-consent-contract";

type Locale = "zh" | "en";
type LoadState = "loading" | "ready" | "closed" | "denied" | "stale" | "error";
type MutationState = "idle" | "working" | "success" | "denied" | "stale" | "error";

type Props = {
  locale: Locale;
  memberRef: string;
};

function text(locale: Locale, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function statusMessage(locale: Locale, state: LoadState) {
  switch (state) {
    case "loading": return text(locale, "正在读取提醒授权范围……", "Loading reminder authorization scope…");
    case "closed": return text(locale, "站内身份提醒尚未开放。", "Identity reminders are not open yet.");
    case "denied": return text(locale, "当前登录或授权状态不允许查看提醒设置。", "Your current session or authorization does not allow reminder settings.");
    case "stale": return text(locale, "授权资料已经更新，请重新读取。", "The authorization changed. Refresh before trying again.");
    case "error": return text(locale, "暂时无法读取提醒授权，请稍后重试。", "The reminder authorization service is temporarily unavailable.");
    default: return "";
  }
}

function mutationMessage(locale: Locale, state: MutationState) {
  switch (state) {
    case "working": return text(locale, "正在处理请求……", "Processing the request…");
    case "success": return text(locale, "提醒授权已更新。", "Reminder authorization updated.");
    case "denied": return text(locale, "当前会话无法确认此操作。请重新登录后核对授权状态。", "Your session could not confirm this change. Sign in again and check its status.");
    case "stale": return text(locale, "资料已经更新，请重新读取后再试。", "The information changed. Refresh before trying again.");
    case "error": return text(locale, "暂时无法确认操作结果。请重试或重新读取授权状态。", "We could not confirm the change. Retry or refresh the authorization status.");
    default: return "";
  }
}

function responseError(status: number) {
  if (status === 404) return "closed";
  if (status === 401 || status === 403) return "denied";
  if (status === 409 || status === 412) return "stale";
  return "error";
}

export function FamilyIdentityStationConsent({ locale, memberRef }: Props) {
  const [inventory, setInventory] = useState<IdentityStationConsentInventory | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [selectedCase, setSelectedCase] = useState("");
  const [through, setThrough] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [issueState, setIssueState] = useState<MutationState>("idle");
  const [revokeState, setRevokeState] = useState<MutationState>("idle");
  const [revokeTarget, setRevokeTarget] = useState("");
  const [revokeConfirmed, setRevokeConfirmed] = useState(false);
  const requestRefs = useRef(new Map<string, string>());
  const requestController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);

  const reset = useCallback((next: LoadState = "stale") => {
    requestSequence.current += 1;
    requestController.current?.abort();
    requestController.current = null;
    setInventory(null);
    setSelectedCase("");
    setThrough("");
    setConfirmed(false);
    setIssueState("idle");
    setRevokeState("idle");
    setRevokeTarget("");
    setRevokeConfirmed(false);
    setLoadState(next);
  }, []);

  const readInventory = useCallback(async () => {
    const sequence = ++requestSequence.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoadState("loading");
    try {
      const response = await fetch(identityStationConsentPath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ action: "list", memberRef }),
        signal: controller.signal,
      });
      if (response.status !== 200) throw new Error(responseError(response.status));
      const parsed = parseIdentityStationInventory(await response.json());
      if (sequence !== requestSequence.current) return;
      setInventory(parsed);
      setSelectedCase("");
      setThrough("");
      setConfirmed(false);
      setIssueState("idle");
      setRevokeState("idle");
      setRevokeTarget("");
      setRevokeConfirmed(false);
      setLoadState("ready");
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      const next = error instanceof Error && ["closed", "denied", "stale"].includes(error.message)
        ? error.message as LoadState : "error";
      reset(next);
    }
  }, [memberRef, reset]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void readInventory(), 0);
    return () => {
      requestSequence.current += 1;
      window.clearTimeout(initialLoad);
      requestController.current?.abort();
    };
  }, [readInventory]);

  const selected = inventory?.cases.find((item) => item.ref === selectedCase) ?? null;
  const mutationPending = issueState === "working" || revokeState === "working";

  const updateIssue = useCallback(async () => {
    if (!inventory?.canIssue || !selected || selected.authorization || !isIdentityStationThrough(through) || !confirmed) return;
    const sequence = requestSequence.current;
    const body = {
      action: "issue" as const,
      memberRef,
      caseRef: selected.ref,
      through,
      noticeVersion: identityStationNoticeVersion,
      confirmed: true as const,
    };
    const key = JSON.stringify(body);
    setIssueState("working");
    try {
      const stableRef = requestRefs.current.get(key) ?? crypto.randomUUID();
      requestRefs.current.set(key, stableRef);
      const response = await fetch(identityStationConsentPath, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ ...body, requestRef: stableRef }),
      });
      if (response.status !== 200) throw new Error(responseError(response.status));
      const result: unknown = await response.json();
      if (!isRecord(result) || result.status !== "ISSUED") throw new Error("error");
      if (sequence !== requestSequence.current) return;
      requestRefs.current.delete(key);
      setIssueState("success");
      setConfirmed(false);
      await readInventory();
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setIssueState(error instanceof Error && ["denied", "stale"].includes(error.message)
        ? error.message as MutationState : "error");
    }
  }, [confirmed, inventory, memberRef, readInventory, selected, through]);

  const revoke = useCallback(async () => {
    if (!inventory || !selected || !selected.authorization || revokeTarget !== selected.authorization.ref || !revokeConfirmed) return;
    const sequence = requestSequence.current;
    const body = { action: "revoke" as const, memberRef, grantRef: revokeTarget };
    setRevokeState("working");
    try {
      const response = await fetch(identityStationConsentPath, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify(body),
      });
      if (response.status !== 200) throw new Error(responseError(response.status));
      const result: unknown = await response.json();
      if (!isRecord(result) || result.status !== "REVOKED") throw new Error("error");
      if (sequence !== requestSequence.current) return;
      setRevokeState("success");
      setRevokeTarget("");
      setRevokeConfirmed(false);
      await readInventory();
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setRevokeState(error instanceof Error && ["denied", "stale"].includes(error.message)
        ? error.message as MutationState : "error");
    }
  }, [inventory, memberRef, readInventory, revokeConfirmed, revokeTarget, selected]);

  return <section className="fc-panel" data-identity-station-consent aria-labelledby="fc-identity-station-title">
    <div className="fc-heading">
      <h2 id="fc-identity-station-title"><BellRing aria-hidden="true" />{text(locale, "身份提醒授权", "Identity reminder authorization")}</h2>
      <span>{text(locale, "仅在本人明确同意后运行", "Runs only after your explicit consent")}</span>
    </div>
    <p className="fc-muted">{text(locale, "为本人身份案件开启站内提醒。提醒用途独立于档案查阅、咨询和外部通知授权。", "Enable in-app reminders for one of your identity cases. Reminder consent is separate from profile access, consultation and external-channel consent.")}</p>
    {loadState !== "ready" ? <p className="fc-state" data-identity-station-status={loadState} role="status" aria-live="polite">{statusMessage(locale, loadState)}</p> : null}
    {loadState === "ready" && inventory ? <>
      <div className="fc-harmony-note">
        <p><ShieldCheck size={17} aria-hidden="true" /><strong>{text(locale, "安全边界", "Safety boundary")}</strong></p>
        <p className="fc-muted">{text(locale, "这里只记录提醒授权状态和期限，不上传护照、身份证、出入境记录或医疗资料。站内提醒不代表法定申请期限。", "Only authorization status and validity are handled here. No passport, identity-card, travel-history or medical data is uploaded. An in-app reminder is not a statutory deadline.")}</p>
      </div>
      {inventory.cases.length ? <fieldset className="fc-harmony-note" disabled={mutationPending}>
        <legend><strong>{text(locale, "选择身份案件", "Choose an identity case")}</strong></legend>
        {inventory.cases.map((identityCase) => <label key={identityCase.ref} className="fc-date">
          <input type="radio" name={`station-case-${memberRef}`} value={identityCase.ref} aria-label={identityCase.label} checked={selectedCase === identityCase.ref} onChange={() => { setSelectedCase(identityCase.ref); setConfirmed(false); setIssueState("idle"); setRevokeState("idle"); setThrough(""); setRevokeTarget(""); setRevokeConfirmed(false); }} />
          <span><strong>{identityCase.label}</strong>{identityCase.authorization ? <small>{text(locale, `当前授权至 ${identityCase.authorization.through}`, `Authorized through ${identityCase.authorization.through}`)}</small> : <small>{text(locale, "尚未授权提醒", "No reminder authorization")}</small>}</span>
        </label>)}
      </fieldset> : <p className="fc-state" data-identity-station-status="empty" role="status">{text(locale, "暂无可供授权的本人身份案件。", "None of your identity cases are available for reminder authorization.")}</p>}
      {selected && !selected.authorization && inventory.canIssue ? <fieldset className="fc-harmony-note" disabled={mutationPending}>
        <legend><strong>{text(locale, "开启站内提醒", "Enable in-app reminders")}</strong></legend>
        <label>{text(locale, "授权有效至（香港日期，包含当天）", "Valid through (Hong Kong date, inclusive)")}
          <input type="date" min={identityStationToday()} value={through} onChange={(event) => { setThrough(event.target.value); setConfirmed(false); setIssueState("idle"); }} aria-describedby="identity-station-through-help" />
        </label>
        <small id="identity-station-through-help" className="fc-muted">{text(locale, "这是提醒授权期限，不是签证、逗留、续签或永居资格期限。", "This is the reminder-consent expiry, not a visa, stay, renewal or residence-eligibility deadline.")}</small>
        <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} aria-required="true" /> {text(locale, "我确认只为这个已选身份案件开启站内提醒，并同意按上述日期保存授权。", "I confirm that I am enabling in-app reminders for this selected identity case only and agree to the validity date above.")}</label>
        {issueState !== "idle" ? <p className="fc-state" data-identity-station-issue-status={issueState} role="status" aria-live="polite">{mutationMessage(locale, issueState)}</p> : null}
        <button type="button" className="fc-gold" disabled={!isIdentityStationThrough(through) || !confirmed || issueState === "working"} onClick={() => void updateIssue()}><Check size={17} aria-hidden="true" />{issueState === "working" ? text(locale, "处理中……", "Processing…") : text(locale, "确认开启提醒", "Confirm reminders")}</button>
      </fieldset> : null}
      {selected?.authorization ? <fieldset className="fc-harmony-note" disabled={mutationPending}>
        <legend><strong>{text(locale, "撤回这个案件的提醒授权", "Revoke this case's reminder authorization")}</strong></legend>
        <p className="fc-muted"><Clock3 size={16} aria-hidden="true" /> {text(locale, `当前授权有效至 ${selected.authorization.through}。撤回后，未投递提醒不会继续发送；已送达记录保留。`, `Authorization is valid through ${selected.authorization.through}. After withdrawal, undelivered reminders will not continue. Delivered records remain.`)}</p>
        <label><input type="checkbox" checked={revokeConfirmed} onChange={(event) => { setRevokeConfirmed(event.target.checked); setRevokeTarget(event.target.checked ? selected.authorization?.ref ?? "" : ""); }} aria-required="true" /> {text(locale, "我确认撤回此身份案件的站内提醒授权。", "I confirm that I want to revoke this case's in-app reminder authorization.")}</label>
        {revokeState !== "idle" ? <p className="fc-state" data-identity-station-revoke-status={revokeState} role="status" aria-live="polite">{mutationMessage(locale, revokeState)}</p> : null}
        <button type="button" className="fc-gold" disabled={!revokeConfirmed || revokeTarget !== selected.authorization.ref || revokeState === "working"} onClick={() => void revoke()}><RefreshCw size={17} aria-hidden="true" />{revokeState === "working" ? text(locale, "处理中……", "Processing…") : text(locale, "确认撤回授权", "Confirm withdrawal")}</button>
      </fieldset> : null}
      {!inventory.canIssue ? <p className="fc-muted" data-identity-station-issue-closed>{text(locale, "新的提醒授权暂未开放。已有授权仍可查看并撤回。", "New reminder authorization is not open yet. Existing authorizations can still be viewed and revoked.")}</p> : null}
    </> : null}
    {loadState !== "loading" && <button type="button" className="fc-service-detail" onClick={() => void readInventory()} disabled={mutationPending}><RefreshCw size={15} aria-hidden="true" />{text(locale, "重新读取授权状态", "Refresh authorization status")}</button>}
  </section>;
}
