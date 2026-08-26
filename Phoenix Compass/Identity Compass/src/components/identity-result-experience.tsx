"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { IDENTITY_ASSESSMENT_ID_KEY } from "@/lib/identity/ids";
import {
  IDENTITY_DRAFT_KEY,
  IDENTITY_DYNAMIC_DRAFT_KEY,
  IDENTITY_FULL_REPORT_KEY,
  IDENTITY_RESULT_KEY,
  isStoredIdentityResult,
} from "@/lib/identity/storage";
import type { StoredIdentityResult } from "@/lib/identity/types";

const planningStageLabels: Record<StoredIdentityResult["snapshot"]["planning_stage"], string> = {
  initial_exploration: "了解起点",
  direction_comparison: "方向比较",
  planning_preparation: "规划准备",
  hong_kong_transition: "香港身份衔接",
  identity_established: "已有身份基础",
};

export function IdentityResultExperience() {
  const [result, setResult] = useState<StoredIdentityResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = window.sessionStorage.getItem(IDENTITY_RESULT_KEY);
        if (!stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (isStoredIdentityResult(parsed)) setResult(parsed);
      } catch {
        setResult(null);
      } finally {
        setReady(true);
      }
    });
  }, []);

  function resetAssessment() {
    window.sessionStorage.removeItem(IDENTITY_DRAFT_KEY);
    window.sessionStorage.removeItem(IDENTITY_DYNAMIC_DRAFT_KEY);
    window.sessionStorage.removeItem(IDENTITY_FULL_REPORT_KEY);
    window.sessionStorage.removeItem(IDENTITY_RESULT_KEY);
    window.sessionStorage.removeItem(IDENTITY_ASSESSMENT_ID_KEY);
  }

  if (!ready) {
    return (
      <main className="result-page result-page--loading" id="main-content">
        <div aria-label="正在读取身份快照" className="compass-loader"><span>✦</span></div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="result-page" id="main-content">
        <header className="flow-header page-shell"><BrandLogo priority /></header>
        <section className="empty-result page-shell">
          <span className="step-number">!</span>
          <h1>还没有可显示的 Identity Snapshot</h1>
          <p>当前会话中没有找到完整结果。你可以重新完成 Free 6题。</p>
          <Link className="continue-button" href="/identity/assessment">开始免费身份测评</Link>
        </section>
      </main>
    );
  }

  const { snapshot, ids } = result;

  return (
    <main className="result-page identity-result" id="main-content">
      <header className="flow-header page-shell">
        <BrandLogo priority />
        <span className="result-status">Free Snapshot</span>
      </header>

      <section className="result-hero identity-result-hero">
        <div className="page-shell result-hero__inner">
          <div>
            <p className="eyebrow eyebrow--light">FAMILY IDENTITY TYPE</p>
            <h1>{snapshot.family_identity_type}</h1>
            <p>这是一份家庭意图分类，不是政策资格、获批概率或法律意见。</p>
            <span className="exploration-badge">Planning Stage · {planningStageLabels[snapshot.planning_stage]}</span>
          </div>
          <div aria-hidden="true" className="result-compass">
            <span>✦</span>
            <small>IDENTITY<br />COMPASS</small>
          </div>
        </div>
      </section>

      <div className="result-content page-shell">
        <section className="result-section">
          <div className="result-section__heading">
            <span>01</span>
            <div><p>PLANNING STAGE</p><h2>{planningStageLabels[snapshot.planning_stage]}</h2></div>
          </div>
        </section>

        <section className="result-section">
          <div className="result-section__heading">
            <span>02</span>
            <div><p>POTENTIAL DIRECTIONS</p><h2>接下来值得比较的两个方向</h2></div>
          </div>
          <div className="direction-list">
            {[snapshot.free_direction_1, snapshot.free_direction_2].map((direction, index) => (
              <article className="direction-card" key={direction}>
                <span className="direction-index">0{index + 1}</span>
                <div><h3>{direction}</h3><p>进入完整分析后，再依据家庭信息与正式资料展开，不在 Free 阶段判断资格。</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="today-card identity-insight-card">
          <div><p>ONE KEY INSIGHT</p><h2>这次回答透露的重点</h2></div>
          <p>{snapshot.free_key_insight}</p>
        </section>

        <section className="identity-next-step">
          <p className="eyebrow">NEXT STEP</p>
          <h2>继续完整身份分析</h2>
          <p>下一阶段将补充家庭结构、时间线与正式政策资料；不会从这 6 题直接得出资格结论。</p>
          <Link className="primary-cta" href="/identity/full-analysis">
            继续完整身份分析 <span aria-hidden="true">→</span>
          </Link>
        </section>

        <details className="identity-record-meta">
          <summary>查看本次记录编号</summary>
          <dl>
            <div><dt>Family ID</dt><dd>{ids.family_id}</dd></div>
            <div><dt>User ID</dt><dd>{ids.user_id}</dd></div>
            <div><dt>Assessment ID</dt><dd>{ids.assessment_id}</dd></div>
          </dl>
        </details>

        <p className="result-disclaimer">本结果仅用于家庭意图整理，不构成政策资格判断、法律意见、获批承诺或成功率预测。</p>
        <Link className="restart-link" href="/identity/assessment" onClick={resetAssessment}>重新完成 Free 6题</Link>
      </div>
    </main>
  );
}
