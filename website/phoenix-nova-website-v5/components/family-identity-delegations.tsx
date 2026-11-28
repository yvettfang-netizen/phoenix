"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, ShieldCheck } from "lucide-react";
import {
  identityDelegationNoticeVersion,
  identityDelegationToday,
  identityDelegationsPath,
  isIdentityDelegationRef,
  isIdentityDelegationThrough,
  type IdentityDelegationInventory,
} from "@/lib/identity-journey-delegations-contract";

type Locale = "zh" | "en";
type LoadState = "loading" | "ready" | "denied" | "stale" | "error";
type MutationState = "idle" | "working" | "success" | "denied" | "stale" | "error";
type Selection = { ref: string; label: string };
type Grant = IdentityDelegationInventory["grants"][number];
type SafeInventory = IdentityDelegationInventory;

type Props = {
  locale: Locale;
  memberRef: string;
};

function text(locale: Locale, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSelection(value: unknown, kind: "recipient" | "case"): Selection | null {
  if (!isRecord(value) || !isIdentityDelegationRef(value.ref, kind) || typeof value.label !== "string") return null;
  const label = value.label.trim();
  return label ? { ref: value.ref, label } : null;
}

function parseInventory(value: unknown): SafeInventory | null {
  const source = isRecord(value) && isRecord(value.inventory) ? value.inventory : value;
  if (!isRecord(source)) return null;
  const recipients = Array.isArray(source.recipients)
    ? source.recipients.map((item) => parseSelection(item, "recipient")).filter((item): item is Selection => item !== null).slice(0, 32)
    : [];
  const cases = Array.isArray(source.cases)
    ? source.cases.map((item) => parseSelection(item, "case")).filter((item): item is Selection => item !== null).slice(0, 32)
    : [];
  const grants = Array.isArray(source.grants)
    ? source.grants.filter((item): item is Grant => {
      if (!isRecord(item) || !isIdentityDelegationRef(item.ref, "delegation")) return false;
      if (typeof item.recipientLabel !== "string" || !item.recipientLabel.trim()) return false;
      if (!Array.isArray(item.caseLabels) || item.caseLabels.some((label) => typeof label !== "string")) return false;
      return typeof item.through === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.through);
    }).map((item) => ({
      ref: item.ref,
      recipientLabel: item.recipientLabel.trim(),
      caseLabels: item.caseLabels.map((label) => label.trim()).filter(Boolean).slice(0, 32),
      through: item.through,
    })).slice(0, 32)
    : [];
  return { recipients, cases, grants };
}

function statusMessage(locale: Locale, state: LoadState) {
  switch (state) {
    case "loading": return text(locale, "正在读取可授权范围……", "Loading the available delegation scope…");
    case "denied": return text(locale, "该操作未获授权，内容暂不显示。", "This action is not authorized and cannot be shown.");
    case "stale": return text(locale, "授权资料已更新，请重新读取。", "The authorization information changed. Refresh and try again.");
    case "error": return text(locale, "暂时无法读取授权范围，请稍后重试。", "The delegation service is temporarily unavailable. Please try again.");
    default: return "";
  }
}

function mutationMessage(locale: Locale, state: MutationState) {
  switch (state) {
    case "working": return text(locale, "正在处理授权请求……", "Processing the authorization request…");
    case "success": return text(locale, "授权状态已更新。", "The delegation status was updated.");
    case "denied": return text(locale, "该请求未获授权，资料未被更改。", "This request was not authorized. No information was changed.");
    case "stale": return text(locale, "资料已更新，请重新读取后再试。", "The information changed. Refresh before trying again.");
    case "error": return text(locale, "请求未完成，资料未被更改。请稍后重试。", "The request did not complete. No information was changed. Please try again.");
    default: return "";
  }
}

function stableRequestKey(value: unknown) {
  return JSON.stringify(value);
}

function requestRefFor(cache: Map<string, string>, key: string) {
  const existing = cache.get(key);
  if (existing) return existing;
  const created = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  cache.set(key, created);
  return created;
}

function isStaleStatus(status: number) {
  return status === 409 || status === 412;
}

export function FamilyIdentityDelegations({ locale, memberRef }: Props) {
  const [inventory, setInventory] = useState<SafeInventory | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [through, setThrough] = useState(identityDelegationToday);
  const [issueConfirmed, setIssueConfirmed] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState("");
  const [revokeConfirmed, setRevokeConfirmed] = useState(false);
  const [issueState, setIssueState] = useState<MutationState>("idle");
  const [revokeState, setRevokeState] = useState<MutationState>("idle");
  const requestRefs = useRef(new Map<string, string>());
  const requestController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);

  const clearLocal = useCallback((state: LoadState = "stale") => {
    requestSequence.current += 1;
    requestController.current?.abort();
    requestController.current = null;
    setInventory(null);
    setSelectedRecipient("");
    setSelectedCases([]);
    setThrough(identityDelegationToday());
    setIssueConfirmed(false);
    setSelectedGrant("");
    setRevokeConfirmed(false);
    setIssueState("idle");
    setRevokeState("idle");
    setLoadState(state);
  }, []);

  const readInventory = useCallback(async () => {
    const sequence = ++requestSequence.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoadState("loading");
    try {
      const response = await fetch(identityDelegationsPath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ action: "list", memberRef }),
        signal: controller.signal,
      });
      if (response.status !== 200) {
        if (response.status === 401 || response.status === 403) throw new Error("denied");
        if (isStaleStatus(response.status)) throw new Error("stale");
        throw new Error("error");
      }
      const parsed = parseInventory(await response.json());
      if (!parsed) throw new Error("error");
      if (sequence !== requestSequence.current) return;
      setInventory(parsed);
      setSelectedRecipient("");
      setSelectedCases([]);
      setIssueConfirmed(false);
      setSelectedGrant("");
      setRevokeConfirmed(false);
      setLoadState("ready");
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      const next = error instanceof Error && (error.message === "denied" || error.message === "stale") ? error.message : "error";
      clearLocal(next);
    }
  }, [clearLocal, memberRef]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void readInventory(), 0);
    const onPageHide = () => clearLocal("stale");
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") clearLocal("stale");
      else if (document.visibilityState === "visible") void readInventory();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      requestSequence.current += 1;
      window.clearTimeout(initialLoad);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      requestController.current?.abort();
    };
  }, [clearLocal, readInventory]);

  const selectedCaseLabels = useMemo(() => {
    if (!inventory) return [];
    return selectedCases.map((ref) => inventory.cases.find((item) => item.ref === ref)?.label).filter((label): label is string => Boolean(label));
  }, [inventory, selectedCases]);

  const toggleCase = useCallback((caseRef: string) => {
    setSelectedCases((current) => current.includes(caseRef)
      ? current.filter((value) => value !== caseRef)
      : current.length >= 32 ? current : [...current, caseRef]);
    setIssueConfirmed(false);
    setIssueState("idle");
  }, []);

  const issue = useCallback(async () => {
    if (!inventory || !isIdentityDelegationRef(selectedRecipient, "recipient") || selectedCases.length < 1 || selectedCases.length > 32 || !isIdentityDelegationThrough(through) || !issueConfirmed) return;
    const sequence = requestSequence.current;
    const requestBody = {
      action: "issue" as const,
      memberRef,
      recipientRef: selectedRecipient,
      caseRefs: [...selectedCases].sort(),
      through,
      noticeVersion: identityDelegationNoticeVersion,
      confirmed: true as const,
    };
    const key = stableRequestKey(requestBody);
    const requestRef = requestRefFor(requestRefs.current, key);
    setIssueState("working");
    try {
      const response = await fetch(identityDelegationsPath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ ...requestBody, requestRef }),
      });
      if (response.status !== 200) {
        if (response.status === 401 || response.status === 403) throw new Error("denied");
        if (isStaleStatus(response.status)) throw new Error("stale");
        throw new Error("error");
      }
      const result: unknown = await response.json();
      if (!isRecord(result) || result.status !== "ISSUED") throw new Error("error");
      if (sequence !== requestSequence.current) return;
      requestRefs.current.delete(key);
      setIssueState("success");
      setIssueConfirmed(false);
      await readInventory();
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setIssueState(error instanceof Error && (error.message === "denied" || error.message === "stale") ? error.message : "error");
    }
  }, [inventory, issueConfirmed, memberRef, readInventory, selectedCases, selectedRecipient, through]);

  const revoke = useCallback(async () => {
    if (!inventory || !isIdentityDelegationRef(selectedGrant, "delegation") || !revokeConfirmed) return;
    const sequence = requestSequence.current;
    const requestBody = { action: "revoke" as const, memberRef, grantRef: selectedGrant };
    const key = stableRequestKey(requestBody);
    const requestRef = requestRefFor(requestRefs.current, key);
    setRevokeState("working");
    try {
      const response = await fetch(identityDelegationsPath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ ...requestBody, requestRef }),
      });
      if (response.status !== 200) {
        if (response.status === 401 || response.status === 403) throw new Error("denied");
        if (isStaleStatus(response.status)) throw new Error("stale");
        throw new Error("error");
      }
      const result: unknown = await response.json();
      if (!isRecord(result) || result.status !== "REVOKED") throw new Error("error");
      if (sequence !== requestSequence.current) return;
      requestRefs.current.delete(key);
      setRevokeState("success");
      setSelectedGrant("");
      setRevokeConfirmed(false);
      await readInventory();
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setRevokeState(error instanceof Error && (error.message === "denied" || error.message === "stale") ? error.message : "error");
    }
  }, [inventory, memberRef, readInventory, revokeConfirmed, selectedGrant]);

  const issueReady = Boolean(inventory && selectedRecipient && selectedCases.length > 0 && isIdentityDelegationThrough(through) && issueConfirmed);
  const revokeReady = Boolean(inventory && selectedGrant && revokeConfirmed);
  const mutationPending = issueState === "working" || revokeState === "working";

  return <section className="fc-panel" data-identity-delegations aria-labelledby="fc-identity-delegations-title">
    <div className="fc-heading">
      <h2 id="fc-identity-delegations-title"><ShieldCheck aria-hidden="true" />{text(locale, "身份档案授权查阅", "Identity profile delegation")}</h2>
      <span>{text(locale, "仅限本人主动授权的只读范围", "Read-only scope explicitly authorized by the signed-in member")}</span>
    </div>
    <p className="fc-muted">{text(locale, "你可以为已核验的家庭成员发出有限的身份档案只读授权；此入口不开放写入或提醒功能。", "You may issue a bounded, read-only identity-profile delegation to an eligible household member. This entry does not open write or reminder functions.")}</p>
    {loadState !== "ready" ? <p className="fc-state" data-delegation-status={loadState} role="status" aria-live="polite">{statusMessage(locale, loadState)}</p> : null}
    {loadState === "ready" && inventory ? <>
      <div className="fc-harmony-note" data-delegation-scope>
        <p><strong>{text(locale, "授权范围", "Delegation scope")}</strong></p>
        <p className="fc-muted">{text(locale, "所有候选对象均由服务端按当前授权提供；此页面不会收集额外的个人资料。", "All candidates are supplied by the server for the current authorization. This page does not collect additional personal information.")}</p>
      </div>
      {inventory.recipients.length && inventory.cases.length ? <fieldset className="fc-harmony-note" data-delegation-issue disabled={mutationPending}>
        <legend><strong>{text(locale, "发出新的只读授权", "Issue a new read-only delegation")}</strong></legend>
        <p className="fc-muted">{text(locale, "选择一名已提供的授权接收人、至少一项身份案件，并设置香港日期（包含当天）。", "Choose one server-provided recipient, at least one identity case, and an inclusive Hong Kong date.")}</p>
        <fieldset>
          <legend>{text(locale, "授权接收人", "Authorized recipient")}</legend>
          {inventory.recipients.map((recipient) => <label key={recipient.ref}>
            <input
              type="radio"
              name={`delegation-recipient-${memberRef}`}
              value={recipient.ref}
              checked={selectedRecipient === recipient.ref}
              onChange={() => { setSelectedRecipient(recipient.ref); setIssueConfirmed(false); setIssueState("idle"); }}
            /> {recipient.label}
          </label>)}
        </fieldset>
        <fieldset>
          <legend>{text(locale, "身份案件（可多选）", "Identity cases (select one or more)")}</legend>
          {inventory.cases.map((identityCase) => <label key={identityCase.ref}>
            <input
              type="checkbox"
              value={identityCase.ref}
              checked={selectedCases.includes(identityCase.ref)}
              onChange={() => toggleCase(identityCase.ref)}
            /> {identityCase.label}
          </label>)}
          <small className="fc-muted">{text(locale, "最多选择 32 项。", "Up to 32 cases.")}</small>
        </fieldset>
        <label>
          {text(locale, "授权有效至（香港日期，包含当天）", "Valid through (Hong Kong date, inclusive)")}
          <input type="date" min={identityDelegationToday()} value={through} onChange={(event) => { setThrough(event.target.value); setIssueConfirmed(false); setIssueState("idle"); }} aria-describedby="fc-delegation-through-help" />
        </label>
        <small id="fc-delegation-through-help" className="fc-muted">{text(locale, "这是授权有效期，不代表任何法定期限或身份资格。", "This is a delegation validity date; it is not a statutory deadline or an eligibility decision.")}</small>
        <label>
          <input type="checkbox" checked={issueConfirmed} onChange={(event) => setIssueConfirmed(event.target.checked)} aria-required="true" /> {text(locale, "我确认已阅读上述说明，并同意仅按所选范围发出只读授权。", "I confirm that I have read the notice and agree to issue read-only access only within the selected scope.")}
        </label>
        {issueState !== "idle" ? <p className="fc-state" data-delegation-issue-status={issueState} role="status" aria-live="polite">{mutationMessage(locale, issueState)}</p> : null}
        <button type="button" className="fc-gold" data-delegation-issue-submit disabled={!issueReady || issueState === "working"} onClick={() => void issue()}>
          <ArrowRight size={17} aria-hidden="true" />{issueState === "working" ? text(locale, "处理中……", "Processing…") : text(locale, "发出只读授权", "Issue read-only delegation")}
        </button>
        {selectedCaseLabels.length ? <small className="fc-muted">{text(locale, `已选：${selectedCaseLabels.join("、")}`, `Selected: ${selectedCaseLabels.join(", ")}`)}</small> : null}
      </fieldset> : <p className="fc-state" data-delegation-status="empty" role="status">{text(locale, "当前没有可供授权的接收人或身份案件。", "There are currently no eligible recipients or identity cases for delegation.")}</p>}
      {inventory.grants.length ? <fieldset className="fc-harmony-note" data-delegation-revoke disabled={mutationPending}>
        <legend><strong>{text(locale, "撤回现有只读授权", "Revoke an existing read-only delegation")}</strong></legend>
        {inventory.grants.map((grant) => <label key={grant.ref}>
          <input
            type="radio"
            name={`delegation-grant-${memberRef}`}
            value={grant.ref}
            checked={selectedGrant === grant.ref}
            onChange={() => { setSelectedGrant(grant.ref); setRevokeConfirmed(false); setRevokeState("idle"); }}
          /> <span>{grant.recipientLabel} · {grant.caseLabels.join(", ")} · {grant.through}</span>
        </label>)}
        <label>
          <input type="checkbox" checked={revokeConfirmed} onChange={(event) => setRevokeConfirmed(event.target.checked)} aria-required="true" /> {text(locale, "我确认撤回所选的只读授权。", "I confirm that I want to revoke the selected read-only delegation.")}
        </label>
        {revokeState !== "idle" ? <p className="fc-state" data-delegation-revoke-status={revokeState} role="status" aria-live="polite">{mutationMessage(locale, revokeState)}</p> : null}
        <button type="button" className="fc-gold" data-delegation-revoke-submit disabled={!revokeReady || revokeState === "working"} onClick={() => void revoke()}>
          <Check size={17} aria-hidden="true" />{revokeState === "working" ? text(locale, "处理中……", "Processing…") : text(locale, "撤回所选授权", "Revoke selected delegation")}
        </button>
      </fieldset> : <p className="fc-muted" data-delegation-grants-empty>{text(locale, "当前没有已发出的只读授权。", "There are no active read-only delegations.")}</p>}
    </> : null}
    <p className="fc-muted"><Clock3 size={13} aria-hidden="true" /> {text(locale, "离开或隐藏页面时，界面会清除已显示的授权信息。", "The page clears displayed authorization information when you leave or hide it.")}</p>
    <button type="button" className="fc-gold" data-delegation-refresh onClick={() => void readInventory()} disabled={loadState === "loading" || mutationPending}><ArrowRight size={17} aria-hidden="true" />{text(locale, "重新读取授权范围", "Refresh delegation scope")}</button>
  </section>;
}
