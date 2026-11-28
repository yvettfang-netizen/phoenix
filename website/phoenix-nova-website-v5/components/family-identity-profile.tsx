"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, ArrowRight, Clock3 } from "lucide-react";
import {
  identityProfilePath,
  type IdentityMemberProfile,
  type IdentityProfileMember,
} from "@/lib/identity-journey-profile-contract";
import { identityPathways } from "@/lib/identity-journey-policy";

type Locale = "zh" | "en";
type LoadState = "loading" | "ready" | "empty" | "denied" | "error" | "stale";
type Milestone = IdentityMemberProfile["episodes"][number]["milestones"][number];

const milestoneLabels: Record<string, [string, string]> = {
  VISA_ISSUED: ["签证签发", "Visa issued"],
  FIRST_ENTRY_DEADLINE: ["首次入境截止", "First-entry deadline"],
  FIRST_ENTRY_ACTUAL: ["实际首次入境", "Actual first entry"],
  STAY_EXPIRY: ["获准逗留期限", "Permitted stay expiry"],
  RENEWAL_WINDOW_OPEN: ["续签申请窗口", "Renewal application window"],
  RETURN_BY: ["建议回港日期", "Suggested return date"],
  ABSENCE_REVIEW: ["离港情况待核验", "Absence review"],
  GRADUATION: ["毕业节点", "Graduation"],
  STATUS_TRANSITION: ["身份转换节点", "Status transition"],
  EMPLOYMENT_REVIEW: ["雇佣条件复核", "Employment review"],
  SPONSOR_REVIEW: ["保证关系复核", "Sponsor relationship review"],
  HKIC_AGE_11: ["11 岁身份证登记节点", "HKIC age-11 registration"],
  HKIC_AGE_18: ["18 岁身份证换领节点", "HKIC age-18 replacement"],
  PASSPORT_EXPIRY: ["护照到期", "Passport expiry"],
  TRAVEL_DOCUMENT_EXPIRY: ["旅行证件到期", "Travel document expiry"],
  APPROVAL_DATE: ["个案批准日期", "Case approval date"],
};

const basisLabels: Record<string, [string, string]> = {
  STATUTORY: ["法定事项", "Statutory"],
  CASE_APPROVAL: ["个案批准记录", "Case approval"],
  OFFICIAL_WINDOW: ["官方申请窗口", "Official window"],
  INTERNAL: ["凤启内部提醒", "Internal reminder"],
};

function text(locale: Locale, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

function labelFor(map: Record<string, [string, string]>, value: string, locale: Locale) {
  const label = map[value];
  return label ? text(locale, label[0], label[1]) : value;
}

function pathwayLabel(path: string | null, locale: Locale) {
  if (!path) return text(locale, "身份阶段", "Identity stage");
  const pathway = identityPathways[path as keyof typeof identityPathways];
  return pathway ? text(locale, pathway.labelZh, pathway.labelEn) : text(locale, "身份阶段", "Identity stage");
}

function milestoneLabel(milestone: Milestone, locale: Locale) {
  if (milestone.kind === "RETURN_BY") {
    if (milestone.basis === "CASE_APPROVAL") {
      return text(locale, "个案已批准的回港期限", "Case-approved return deadline");
    }
    if (milestone.basis === "OFFICIAL_WINDOW") {
      return text(locale, "官方资料中的回港期限", "Return deadline in official information");
    }
    return text(locale, "计划／内部提示回港日期", "Planned / internal return reminder");
  }
  return labelFor(milestoneLabels, String(milestone.kind), locale);
}

function formatDate(value: string, locale: Locale) {
  // Date-only values are formatted in UTC so that the displayed civil day does not
  // shift when a member views the profile from another timezone.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMembers(value: unknown): IdentityProfileMember[] {
  if (!isRecord(value) || !Array.isArray(value.members)) return [];
  return value.members.filter((member): member is IdentityProfileMember => {
    if (!isRecord(member)) return false;
    return typeof member.ref === "string" && member.ref.length > 0
      && typeof member.label === "string" && member.label.length > 0
      && (member.access === "SELF" || member.access === "GUARDIAN");
  });
}

function parseProfile(value: unknown): IdentityMemberProfile | null {
  if (!isRecord(value) || !Array.isArray(value.episodes)) return null;
  const episodes = value.episodes.filter((episode) => {
    if (!isRecord(episode) || typeof episode.startedOn !== "string") return false;
    if (episode.path !== null && typeof episode.path !== "string") return false;
    if (episode.endedBefore !== null && typeof episode.endedBefore !== "string") return false;
    return Array.isArray(episode.milestones);
  }).map((episode) => ({
    path: episode.path as string | null,
    startedOn: episode.startedOn as string,
    endedBefore: episode.endedBefore as string | null,
    milestones: (episode.milestones as unknown[]).filter((milestone): milestone is Milestone => {
      if (!isRecord(milestone)) return false;
      return typeof milestone.kind === "string"
        && (milestone.basis === "STATUTORY" || milestone.basis === "CASE_APPROVAL"
          || milestone.basis === "OFFICIAL_WINDOW" || milestone.basis === "INTERNAL")
        && typeof milestone.on === "string"
        && (milestone.verification === "REPORTED" || milestone.verification === "VERIFIED")
        && typeof milestone.current === "boolean";
    }),
  }));
  return { episodes } as IdentityMemberProfile;
}

function statusMessage(state: LoadState, locale: Locale) {
  switch (state) {
    case "loading": return text(locale, "正在读取经授权的成员资料……", "Loading authorized member information…");
    case "empty": return text(locale, "暂无可显示的成员身份档案。", "No member identity profiles are available.");
    case "denied": return text(locale, "此资料未获授权，暂不显示。", "This information is not authorized for display.");
    case "stale": return text(locale, "资料已清除，请重新核验后再查看。", "The profile was cleared. Verify again to continue.");
    case "error": return text(locale, "成员资料暂时无法读取，请稍后重试。", "Member information is temporarily unavailable. Please try again.");
    case "ready": return text(locale, "请选择一位已授权成员查看身份档案。", "Select an authorized member to view the identity profile.");
    default: return "";
  }
}

function accessLabel(member: IdentityProfileMember, locale: Locale) {
  return member.access === "SELF"
    ? text(locale, "登录本人", "Signed-in member")
    : text(locale, "已授权监护子女", "Authorized child under guardianship");
}

function MilestoneRow({ milestone, locale }: { milestone: Milestone; locale: Locale }) {
  const verification = milestone.verification === "VERIFIED"
    ? text(locale, "已核验", "Verified")
    : text(locale, "已记录，待核验", "Recorded, pending verification");
  const current = milestone.current
    ? text(locale, "当前", "Current")
    : text(locale, "历史", "History");
  return <div className="fc-date" role="listitem">
    <time dateTime={milestone.on}>{formatDate(milestone.on, locale)}</time>
    <span>
      <strong>{milestoneLabel(milestone, locale)}</strong>
      <small>{verification} · {current} · {labelFor(basisLabels, milestone.basis, locale)}</small>
    </span>
  </div>;
}

export function FamilyIdentityProfile({
  locale,
  onMemberSelectionChange,
  memberResidence,
}: {
  locale: Locale;
  /**
   * Notifies the parent only after an authorized member profile has
   * loaded.  The parent uses this to mount separately scoped, read-only
   * member modules; it must never be used to submit profile data.
   */
  onMemberSelectionChange?: (member: IdentityProfileMember | null) => void;
  /** Optional read-only member panel controlled by the residence gate. */
  memberResidence?: ReactNode;
}) {
  const [members, setMembers] = useState<IdentityProfileMember[]>([]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [profile, setProfile] = useState<IdentityMemberProfile | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const requestController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSensitive = useCallback((nextState: LoadState = "stale") => {
    requestSequence.current += 1;
    requestController.current?.abort();
    requestController.current = null;
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
    setMembers([]);
    setSelectedRef(null);
    setProfile(null);
    setState(nextState);
    onMemberSelectionChange?.(null);
  }, [onMemberSelectionChange]);

  const armExpiry = useCallback(() => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = setTimeout(() => clearSensitive("stale"), 60_000);
  }, [clearSensitive]);

  const loadMembers = useCallback(async () => {
    const sequence = ++requestSequence.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setMembers([]);
    setSelectedRef(null);
    setProfile(null);
    setState("loading");
    onMemberSelectionChange?.(null);
    try {
      const response = await fetch(identityProfilePath, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-store" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "denied" : "error");
      const parsed = parseMembers(await response.json());
      if (sequence !== requestSequence.current) return;
      setMembers(parsed);
      setState(parsed.length ? "ready" : "empty");
      armExpiry();
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      clearSensitive(error instanceof Error && error.message === "denied" ? "denied" : "error");
    }
  }, [armExpiry, clearSensitive, onMemberSelectionChange]);

  const selectMember = useCallback(async (memberRef: string) => {
    const selected = members.find((member) => member.ref === memberRef);
    if (!selected) return;
    const sequence = ++requestSequence.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    // Clear the previous member's profile before loading the new one.
    setSelectedRef(selected.ref);
    setProfile(null);
    setState("loading");
    onMemberSelectionChange?.(null);
    try {
      const response = await fetch(identityProfilePath, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ memberRef: selected.ref }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "denied" : "error");
      const parsed = parseProfile(await response.json());
      if (sequence !== requestSequence.current) return;
      if (!parsed) throw new Error("error");
      setProfile(parsed);
      setState("ready");
      onMemberSelectionChange?.(selected);
      armExpiry();
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      clearSensitive(error instanceof Error && error.message === "denied" ? "denied" : "error");
    }
  }, [armExpiry, clearSensitive, members, onMemberSelectionChange]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadMembers(), 0);
    const onPageHide = () => clearSensitive("stale");
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") clearSensitive("stale");
      else if (document.visibilityState === "visible") void loadMembers();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(initialLoad);
      if (expiryTimer.current) window.clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      requestController.current?.abort();
      onMemberSelectionChange?.(null);
    };
  }, [clearSensitive, loadMembers, onMemberSelectionChange]);

  const selectedMember = selectedRef ? members.find((member) => member.ref === selectedRef) : null;
  return <section className="fc-panel" aria-labelledby="fc-identity-profile-title">
    <div className="fc-heading">
      <h2 id="fc-identity-profile-title"><ShieldCheck aria-hidden="true" />{text(locale, "成员身份档案", "Member identity profile")}</h2>
      <span>{text(locale, "仅显示本人或已获授权的监护子女", "Only self or an authorized child is shown")}</span>
    </div>
    {members.length ? <div className="fc-members" aria-label={text(locale, "已授权成员", "Authorized members")}>
      {members.map((member) => <button
        key={member.ref}
        type="button"
        aria-pressed={member.ref === selectedRef}
        onClick={() => void selectMember(member.ref)}
      >
        <span className="fc-avatar"><ShieldCheck size={24} /></span>
        <strong>{member.label}</strong>
        <small>{accessLabel(member, locale)}</small>
      </button>)}
    </div> : null}
    {state !== "ready" ? <p className="fc-state" role="status" aria-live="polite">{statusMessage(state, locale)}</p> :
      !profile ? <p className="fc-muted">{text(locale, "选择成员查看身份阶段和日期。", "Select a member to see their identity stages and dates.")}</p> : null}
    {selectedMember && profile ? <div aria-label={text(locale, "所选成员身份档案", "Selected member identity profile")}>
      <div className="fc-context">
        <strong>{selectedMember.label}</strong>
        <span>{accessLabel(selectedMember, locale)}</span>
      </div>
      {profile.episodes.length ? profile.episodes.map((episode, index) => <article className="fc-harmony-note" key={`${episode.startedOn}-${episode.endedBefore ?? "current"}-${index}`}>
        <div className="fc-heading">
          <h3>{pathwayLabel(episode.path, locale)}</h3>
          <span>{episode.endedBefore ? text(locale, "历史阶段", "Historical stage") : text(locale, "当前阶段", "Current stage")}</span>
        </div>
        <p className="fc-muted">{formatDate(episode.startedOn, locale)}{episode.endedBefore ? ` — ${formatDate(episode.endedBefore, locale)}` : ` · ${text(locale, "仍在记录中", "ongoing")}`}</p>
        {episode.milestones.length ? <div role="list" aria-label={text(locale, "身份节点", "Identity milestones")}>
          {episode.milestones.map((milestone, milestoneIndex) => <MilestoneRow key={`${milestone.kind}-${milestone.on}-${milestoneIndex}`} milestone={milestone} locale={locale} />)}
        </div> : <p className="fc-muted">{text(locale, "暂无可显示的身份节点。", "No identity milestones are available.")}</p>}
      </article>) : <p className="fc-muted">{text(locale, "暂无可显示的身份阶段。", "No identity stages are available.")}</p>}
      <p className="fc-muted">{text(locale, "已核验与待核验信息分开显示；日期仅反映授权资料中的记录，不代表资格判断。", "Verified and reported information are shown separately. Dates reflect authorized records and do not determine eligibility.")}</p>
    </div> : null}
    {memberResidence}
    <p className="fc-muted">{text(locale, "家庭关系本身不会授予其他成年成员的资料访问权；当前暂不支持成人委托。", "Family membership alone does not grant access to another adult's records. Adult delegation is not supported at this time.")}</p>
    <button type="button" className="fc-gold" onClick={() => void loadMembers()}><ArrowRight size={17} />{text(locale, "重新核验成员授权", "Verify member access again")}</button>
    <p className="fc-muted"><Clock3 size={13} aria-hidden="true" /> {text(locale, "离开或隐藏页面后，成员资料会自动清除。", "Member information is cleared when you leave or hide this page.")}</p>
  </section>;
}
