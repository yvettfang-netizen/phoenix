"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Compass, RefreshCw, UserRound } from "lucide-react";
import { onCustomerSessionEnded } from "@/lib/customer-session-event";
import { confirmPrivateDelivery } from "@/lib/confirm-private-delivery";
import { validFamilyServiceSummary } from "@/lib/family-service-summary";
import "./family-service-overview.css";

type Locale = "zh" | "en";
type NextMilestone = { id: string; title: string; target_at: string | null };
type SummaryProject = {
  service_project_id: string;
  name: string;
  compass: string;
  status: string;
  current_stage: string | null;
  adviser: string | null;
  next_milestone: NextMilestone | null;
  customer_todo_count: number;
  overdue_count: number;
  latest_progress: string | null;
  detail_href: string | null;
};

type SummaryPayload = {
  schemaVersion: "service-project-summary.v1";
  projects: SummaryProject[];
  as_of: string;
  expires_at: string;
  next_cursor: string | null;
};

type SummaryState = "loading" | "ready" | "empty" | "stale" | "unavailable" | "error";

const STATUS_LABELS: Record<string, [string, string]> = {
  ACTIVE: ["服务中", "Active"],
  PLANNED: ["待开通", "Planned"],
  ON_HOLD: ["已暂停", "On hold"],
  PAUSED: ["已暂停", "Paused"],
  COMPLETED: ["已结案", "Closed"],
  CLOSED: ["已结案", "Closed"],
  CANCELLED: ["已终止", "Terminated"],
  TERMINATED: ["已终止", "Terminated"],
};

const COMPASS_LABELS: Record<string, [string, string]> = {
  EDUCATION: ["教育 · 成长", "Education"],
  IDENTITY: ["身份 · 规划", "Identity"],
  HEALTH: ["健康 · 守护", "Health"],
  WEALTH: ["财富 · 保障", "Wealth"],
};

const STAGE_LABELS: Record<string, [string, string]> = {
  DISCOVERY: ["服务启动", "Discovery"],
  SCHOOL_SELECTION: ["选校与专业", "School selection"],
  MATERIALS: ["材料准备", "Materials"],
  SUBMISSION: ["申请递交", "Submission"],
  INTERVIEW: ["面试与补件", "Interview & follow-up"],
  DECISION: ["申请结果", "Decision"],
  DEPOSIT: ["留位与后续", "Deposit & next steps"],
  CLOSED: ["结案", "Closed"],
};

/** Reuse the server DTO validator so client rendering cannot drift from the BFF contract. */
export function normalizeFamilyServiceSummary(value: unknown): SummaryPayload | null {
  if (!validFamilyServiceSummary(value)) return null;
  const raw = value as Record<string, unknown>;
  const projectsRaw = raw.projects as Array<Record<string, unknown>>;
  if (projectsRaw.length > 20) return null;
  const asOf = Date.parse(String(raw.as_of));
  const expires = Date.parse(String(raw.expires_at));
  const now = Date.now();
  if (!Number.isFinite(asOf) || !Number.isFinite(expires) || asOf > now + 5000 || expires <= now || expires <= asOf || expires - asOf > 60000 || now - asOf > 60000) return null;
  const projects: SummaryProject[] = projectsRaw.map(project => ({
      service_project_id: String(project.service_project_id),
      name: project.name as string,
      compass: project.compass as string,
      status: project.status as string,
      current_stage: project.current_stage as string | null,
      adviser: project.adviser as string | null,
      next_milestone: project.next_milestone as NextMilestone | null,
      customer_todo_count: project.customer_todo_count as number,
      overdue_count: project.overdue_count as number,
      latest_progress: project.latest_progress as string | null,
      detail_href: project.detail_href as string | null,
    }));
  return { schemaVersion: "service-project-summary.v1", projects, as_of: raw.as_of as string, expires_at: raw.expires_at as string, next_cursor: typeof raw.next_cursor === "string" ? raw.next_cursor : null };
}

function label(value: string | null | undefined, locale: Locale) {
  if (!value) return locale === "zh" ? "待核验" : "To verify";
  return (STATUS_LABELS[value.toUpperCase()] ?? [value, value])[locale === "zh" ? 0 : 1];
}

function compassLabel(value: string, locale: Locale) {
  const key = value.toUpperCase();
  return (COMPASS_LABELS[key] ?? [value, value])[locale === "zh" ? 0 : 1];
}

function stageLabel(value: string | null, locale: Locale) {
  if (!value) return locale === "zh" ? "待核验" : "To verify";
  const key = value.trim().toUpperCase();
  return (STAGE_LABELS[key] ?? [locale === "zh" ? "待核验" : "To verify", locale === "zh" ? "待核验" : "To verify"])[locale === "zh" ? 0 : 1];
}

function progressText(value: string, locale: Locale) {
  const [kind, code] = value.trim().split(/\s+/, 2);
  const zh = locale === "zh";
  if (kind === "STAGE") return zh ? `服务阶段更新：${stageLabel(code ?? null, locale)}` : `Service stage updated: ${stageLabel(code ?? null, locale)}`;
  if (kind === "PROJECT_STATUS" && code && STATUS_LABELS[code]) return zh ? `服务状态更新：${label(code, locale)}` : `Service status updated: ${label(code, locale)}`;
  if (kind === "TASK_STATUS" && code === "COMPLETED") return zh ? "一项待办已完成" : "A task was completed";
  if (kind === "TASK_STATUS" || kind === "TASK_CREATE") return zh ? "待办已更新" : "Tasks were updated";
  if (kind === "MESSAGE") return zh ? "项目沟通已记录" : "Project communication was recorded";
  if (kind.startsWith("APPLICATION_")) return zh ? "申请记录已更新" : "An application record was updated";
  if (kind.startsWith("MATERIAL_")) return zh ? "材料记录已更新" : "A material record was updated";
  if (kind.startsWith("DELIVERABLE_")) return zh ? "交付记录已更新" : "A deliverable record was updated";
  return zh ? "项目进展已记录" : "A project update was recorded";
}

function activeProject(project: SummaryProject) {
  return !["COMPLETED", "CLOSED", "CANCELLED", "TERMINATED"].includes(project.status.toUpperCase());
}

function hrefFor(locale: Locale, project: SummaryProject) {
  // The API supplies detail_href as provenance, but the UI only follows a validated local route.
  return `/${locale}/my-services/${project.service_project_id}`;
}

function milestoneText(value: NextMilestone | null, locale: Locale) {
  if (!value) return null;
  if (!value.target_at) return value.title;
  const date = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium" }).format(new Date(value.target_at));
  return `${value.title} · ${date}`;
}

function Copy({ locale, zh, en }: { locale: Locale; zh: string; en: string }) {
  return <>{locale === "zh" ? zh : en}</>;
}

function ProjectCard({ locale, project, history = false }: { locale: Locale; project: SummaryProject; history?: boolean }) {
  const status = project.status.toUpperCase();
  return <article className={`fso-card fso-status-${status.toLowerCase()}${history ? " fso-history-card" : ""}`}>
    <Link className="fso-card-link" href={hrefFor(locale, project)}>
      <div className="fso-card-heading"><span className="fso-compass"><Compass size={15} />{compassLabel(project.compass, locale)}</span><span className="fso-status">{label(project.status, locale)}</span></div>
      <h3>{project.name}</h3>
      {project.current_stage && <p className="fso-stage">{stageLabel(project.current_stage, locale)}</p>}
      <div className="fso-card-meta">
        {project.adviser && <span><UserRound size={14} /><Copy locale={locale} zh={`负责顾问：${project.adviser}`} en={`Adviser: ${project.adviser}`} /></span>}
        {project.next_milestone && <span><CalendarClock size={14} /><Copy locale={locale} zh={`下一节点：${milestoneText(project.next_milestone, locale)}`} en={`Next milestone: ${milestoneText(project.next_milestone, locale)}`} /></span>}
      </div>
      <div className="fso-card-footer"><span>{project.customer_todo_count > 0 ? <><b>{project.customer_todo_count}</b> <Copy locale={locale} zh="项待办" en="to do" /></> : <Copy locale={locale} zh="暂无待办" en="No pending tasks" />}{project.overdue_count > 0 && <em><CircleAlert size={13} />{project.overdue_count} <Copy locale={locale} zh="逾期" en="overdue" /></em>}</span><ArrowRight size={17} /></div>
    </Link>
    {project.latest_progress && <p className="fso-progress"><CheckCircle2 size={14} /><span>{progressText(project.latest_progress, locale)}</span></p>}
  </article>;
}

export function FamilyServiceOverview({ locale, requireDeliveryReceipt = false }: { locale: Locale; requireDeliveryReceipt?: boolean }) {
  const [projects, setProjects] = useState<SummaryProject[]>([]);
  const [state, setState] = useState<SummaryState>("loading");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const generation = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const expiryRef = useRef<number | null>(null);
  const projectIdsRef = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useCallback((zh: string, en: string) => locale === "zh" ? zh : en, [locale]);

  const clear = useCallback((next: SummaryState = "stale") => {
    generation.current += 1;
    activeController.current?.abort();
    activeController.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    expiryRef.current = null;
    projectIdsRef.current.clear();
    setProjects([]);
    setExpiresAt(null);
    setNextCursor(null);
    setState(next);
  }, []);

  const load = useCallback(async (cursor: string | null = null, append = false) => {
    if (document.visibilityState === "hidden") return;
    const request = ++generation.current;
    activeController.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    if (!append) {
      setProjects([]);
      expiryRef.current = null;
      projectIdsRef.current.clear();
      setExpiresAt(null);
      setNextCursor(null);
      setState("loading");
    }
    const controller = new AbortController();
    activeController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const query = new URLSearchParams({ limit: "20" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/family-services/summary?${query.toString()}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "unavailable" : "error");
      const payload = normalizeFamilyServiceSummary(await response.json());
      if (!payload || request !== generation.current) throw new Error("error");
      const expiry = Date.parse(payload.expires_at);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) { clear("stale"); return; }
      const effectiveExpiry = append && expiryRef.current !== null ? Math.min(expiryRef.current, expiry) : expiry;
      if (effectiveExpiry <= Date.now()) { clear("stale"); return; }
      const incomingIds = payload.projects.map(project => project.service_project_id);
      if (append && incomingIds.some(projectId => projectIdsRef.current.has(projectId))) { clear("error"); return; }
      if (requireDeliveryReceipt) {
        await confirmPrivateDelivery(response, controller.signal);
        if (request !== generation.current || controller.signal.aborted) return;
        if (effectiveExpiry <= Date.now()) { clear("stale"); return; }
      }
      incomingIds.forEach(projectId => projectIdsRef.current.add(projectId));
      setProjects(previous => append ? [...previous, ...payload.projects] : payload.projects);
      expiryRef.current = effectiveExpiry;
      setExpiresAt(effectiveExpiry);
      setNextCursor(payload.next_cursor);
      setState(previous => append ? (previous === "ready" || payload.projects.length > 0 ? "ready" : "empty") : payload.projects.length ? "ready" : "empty");
      timer.current = setTimeout(() => clear("stale"), Math.max(0, effectiveExpiry - Date.now()));
    } catch (error) {
      if (request !== generation.current) return;
      projectIdsRef.current.clear();
      setProjects([]);
      setExpiresAt(null);
      const status = (error as { status?: number } | null)?.status;
      setState(status === 401 || status === 403 || error instanceof Error && error.message === "unavailable" ? "unavailable" : "error");
    } finally {
      clearTimeout(timeout);
      if (activeController.current === controller) activeController.current = null;
    }
  }, [clear, requireDeliveryReceipt]);

  useEffect(() => {
    const mountedGeneration = generation.current;
    queueMicrotask(() => { if (generation.current === mountedGeneration) void load(); });
    const onFocus = () => { void load(); };
    const onVisibility = () => document.visibilityState === "visible" ? void load() : clear("stale");
    const onBlur = () => clear("stale");
    const onPageHide = () => clear("stale");
    const onPageShow = () => { void load(); };
    const stopListening = onCustomerSessionEnded(() => clear("unavailable"));
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      activeController.current?.abort();
      activeController.current = null;
      generation.current += 1;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      stopListening();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clear, load]);

  const current = useMemo(() => projects.filter(activeProject), [projects]);
  const history = useMemo(() => projects.filter(project => !activeProject(project)), [projects]);
  const next = useMemo(() => current.filter(project => project.status === "ACTIVE" && (project.customer_todo_count > 0 || project.next_milestone)).slice(0, 4), [current]);
  const progress = useMemo(() => current.filter(project => project.latest_progress).slice(0, 4), [current]);
  const compasses = useMemo(() => [...new Set(current.map(project => project.compass))], [current]);

  return <section className="fso" data-family-service-overview aria-live="polite">
    <header className="fso-heading"><div><p className="fso-kicker">PHOENIX NOVA™ · SERVICE PROJECTS</p><h2>{t("我的服务", "My services")}</h2><span>{t("你的服务项目与下一步安排。进入项目查看任务及详情。", "Your services and next steps. Open a project for tasks and details.")}</span></div><button className="fso-refresh" type="button" onClick={() => void load()} disabled={state === "loading"} aria-label={t("刷新服务摘要", "Refresh service summary")}><RefreshCw size={16} />{t("刷新", "Refresh")}</button></header>
    {state === "loading" && <p className="fso-state" role="status">{t("正在读取已授权项目……", "Loading authorized projects…")}</p>}
    {(state === "error" || state === "unavailable") && <div className="fso-state fso-error" role="alert"><strong>{t("暂时无法显示服务资料。", "Service information is temporarily unavailable.")}</strong><span>{t("请刷新或稍后重试；如仍无法读取，请联系顾问。", "Refresh or try again later. If the issue continues, contact your adviser.")}</span><button type="button" onClick={() => void load()}>{t("刷新", "Refresh")}</button></div>}
    {state === "stale" && <div className="fso-state fso-stale" role="status"><strong>{t("服务资料需要刷新。", "Service information needs a refresh.")}</strong><span>{t("资料已过期或页面离开焦点，请刷新后继续。", "This information is out of date. Refresh to continue.")}</span><button type="button" onClick={() => void load()}>{t("刷新", "Refresh")}</button></div>}
    {state === "empty" && <div className="fso-empty"><Compass size={30} /><h3>{t("目前没有可显示的服务项目", "There are no service projects to show yet")}</h3><p>{t("你可以先了解适合家庭的支持。", "Explore support for your family.")}</p><Link href={`/${locale}/education#consultation`}>{t("探索服务与咨询", "Explore services") }<ArrowRight size={16} /></Link></div>}
    {state === "ready" && <>
        <section className="fso-priority"><div><span className="fso-section-label">{t("我的下一步", "My next steps")}</span><h3>{next.length ? t("从这些事项开始", "Start with these items") : t("暂无下一步事项", "No next steps to show")}</h3></div>{next.length > 0 && <div className="fso-next-list">{next.map(project => <Link key={project.service_project_id} href={hrefFor(locale, project) + (project.customer_todo_count > 0 ? "#tasks" : "")}><span>{project.customer_todo_count > 0 ? t("查看项目待办", "Review project tasks") : milestoneText(project.next_milestone, locale)}</span><small>{project.customer_todo_count} {t("项待办", "to do")}{project.overdue_count ? ` · ${project.overdue_count} ${t("逾期", "overdue")}` : ""}</small><ArrowRight size={15} /></Link>)}</div>}</section>
      <div className="fso-grid">{current.length > 0 && <section className="fso-block fso-services"><div className="fso-block-heading"><h3>{t("我的服务项目", "My service projects")}</h3><span>{current.length}</span></div><div className="fso-cards">{current.map(project => <ProjectCard key={project.service_project_id} locale={locale} project={project} />)}</div></section>}
        <section className="fso-block"><div className="fso-block-heading"><h3>{t("最新进展", "Latest progress")}</h3></div>{progress.length ? <div className="fso-progress-list">{progress.map(project => <Link key={project.service_project_id} href={hrefFor(locale, project)+"#events"}><strong>{project.name}</strong><span>{progressText(project.latest_progress as string, locale)}</span><ArrowRight size={15} /></Link>)}</div> : <p className="fso-muted">{t("暂无可显示的客户可见进展。", "No client-visible progress is available yet.")}</p>}</section>
        <section className="fso-block"><div className="fso-block-heading"><h3>{t("我的家庭 Compass", "My family Compasses")}</h3></div>{compasses.length ? <div className="fso-compass-list">{compasses.map(compass => <div key={compass}><Compass size={18} /><strong>{compassLabel(compass, locale)}</strong><span>{current.filter(project => project.compass === compass).length} {t("个项目", "projects")}</span></div>)}</div> : <p className="fso-muted">{t("暂时没有 Compass 项目。", "No Compass projects yet.")}</p>}</section>
      </div>
      {history.length > 0 && <section className="fso-block fso-history"><div className="fso-block-heading"><h3>{t("历史服务", "Service history")}</h3><span>{history.length}</span></div><div className="fso-cards">{history.map(project => <ProjectCard key={project.service_project_id} locale={locale} project={project} history />)}</div></section>}
      {nextCursor && <button className="fso-load-more" type="button" onClick={() => void load(nextCursor, true)}>{t("加载更多项目", "Load more projects")}<ArrowRight size={15} /></button>}
      {expiresAt && <p className="fso-asof">{t("授权摘要有效至", "Authorized summary valid until")} {new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(expiresAt)}</p>}
    </>}
  </section>;
}
