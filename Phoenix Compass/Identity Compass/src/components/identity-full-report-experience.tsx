"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { pathDisplayName } from "@/lib/identity/path-engine";
import type { FitStatus } from "@/lib/identity/policy";
import {
  IDENTITY_FULL_REPORT_KEY,
  isStoredIdentityFullReport,
  type StoredIdentityFullReport,
} from "@/lib/identity/storage";

const fitStatusLabels: Record<FitStatus, string> = {
  possible_fit: "可能适用",
  needs_verification: "需核验",
  insufficient_information: "信息不足",
  clear_mismatch: "当前不匹配",
};

export function IdentityFullReportExperience() {
  const [stored, setStored] = useState<StoredIdentityFullReport | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.sessionStorage.getItem(IDENTITY_FULL_REPORT_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (isStoredIdentityFullReport(parsed)) setStored(parsed);
      } catch {
        setStored(null);
      } finally {
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <main className="result-page result-page--loading" id="main-content">
        <div aria-label="正在读取完整报告" className="compass-loader"><span>✦</span></div>
      </main>
    );
  }

  if (!stored) {
    return (
      <main className="result-page" id="main-content">
        <header className="flow-header page-shell"><BrandLogo priority /></header>
        <section className="empty-result page-shell identity-full-placeholder">
          <span className="step-number">!</span>
          <h1>还没有可显示的免费完整报告</h1>
          <p>请先完成 Free Snapshot 与动态问题。</p>
          <Link className="continue-button" href="/identity/full-analysis">继续动态分析</Link>
        </section>
      </main>
    );
  }

  const { report } = stored;

  return (
    <main className="result-page identity-full-report" id="main-content">
      <header className="flow-header page-shell">
        <BrandLogo priority />
        <span className="result-status">Free Full Report</span>
      </header>

      <section className="full-report-hero">
        <div className="page-shell">
          <p className="eyebrow eyebrow--light">IDENTITY SNAPSHOT</p>
          <h1>{report.identity_snapshot.family_identity_type}</h1>
          <p>{report.identity_snapshot.free_key_insight}</p>
          <small>Policy version · {report.policy_version}</small>
        </div>
      </section>

      <div className="page-shell full-report-content">
        <section className="full-report-section" aria-labelledby="path-fit-heading">
          <div className="full-report-heading"><span>01</span><div><p>PATH FIT OVERVIEW</p><h2 id="path-fit-heading">六条路径概览</h2></div></div>
          <p className="path-order-notice">{report.path_order_notice}</p>
          <div className="path-fit-grid">
            {report.path_fit_overview.map((path, index) => (
              <article className="path-fit-card" key={path.path_code}>
                <div className="path-fit-card__top">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong className={`fit-status fit-status--${path.fit_status}`}>{fitStatusLabels[path.fit_status]}</strong>
                </div>
                <h3>{pathDisplayName(path.path_code)}</h3>
                <p>{path.reasons[0]}</p>
                <details>
                  <summary>查看理由、缺口与人工核验</summary>
                  <div>
                    <strong>Reasons</strong>
                    <ul>{path.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                    <strong>Gaps</strong>
                    <ul>{path.gaps.length ? path.gaps.map((gap) => <li key={gap}>{gap}</li>) : <li>无新增结构化缺口</li>}</ul>
                    <strong>Manual checks</strong>
                    <ul>{path.manual_checks.length ? path.manual_checks.map((check) => <li key={check}>{check}</li>) : <li>仍须确认政策版本与正式文件</li>}</ul>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className="full-report-section" aria-labelledby="key-gaps-heading">
          <div className="full-report-heading"><span>02</span><div><p>KEY GAPS</p><h2 id="key-gaps-heading">需要补齐的资料</h2></div></div>
          <ul className="report-list">{report.key_gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
        </section>

        <section className="full-report-section" aria-labelledby="timeline-heading">
          <div className="full-report-heading"><span>03</span><div><p>TIMELINE</p><h2 id="timeline-heading">从现在到人工核验</h2></div></div>
          <ol className="report-timeline">
            {report.timeline.map((item) => <li key={item.stage}><strong>{item.stage}</strong><span>{item.action}</span></li>)}
          </ol>
        </section>

        {report.study_strategy ? (
          <section className="full-report-section study-strategy" aria-labelledby="study-strategy-heading">
            <div className="full-report-heading"><span>04</span><div><p>STUDY STRATEGY</p><h2 id="study-strategy-heading">{report.study_strategy.boundary}</h2></div></div>
            <div className="study-strategy-grid">
              {([
                ["Admission", report.study_strategy.admission],
                ["Student Visa", report.study_strategy.student_visa],
                ["IANG", report.study_strategy.iang],
              ] as const).map(([label, section]) => (
                <article key={label}>
                  <span>{section.source_type}</span>
                  <h3>{label}</h3>
                  <strong>Status · {section.status}</strong>
                  <p>{section.summary}</p>
                  <small>{section.source}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="full-report-section" aria-labelledby="next-actions-heading">
          <div className="full-report-heading"><span>{report.study_strategy ? "05" : "04"}</span><div><p>NEXT ACTIONS</p><h2 id="next-actions-heading">下一步</h2></div></div>
          <ol className="report-list report-list--numbered">{report.next_actions.map((action) => <li key={action}>{action}</li>)}</ol>
        </section>

        <section className="boundary-notice" aria-labelledby="boundary-heading">
          <p>BOUNDARY NOTICE</p>
          <h2 id="boundary-heading">报告边界</h2>
          <p>{report.boundary_notice}</p>
        </section>

        <section className="identity-next-step report-booking-cta">
          <p className="eyebrow">ADVISOR BOOKING</p>
          <h2>预约顾问解读</h2>
          <p>顾问会围绕资料缺口、政策来源与家庭时间线进行人工解读；不会自动申请或递交。</p>
          <Link className="primary-cta" href="/identity/advisor-booking">
            前往预约入口 <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
