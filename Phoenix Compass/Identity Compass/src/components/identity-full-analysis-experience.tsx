"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { getDynamicQuestions, normalizeDynamicAnswers } from "@/lib/identity/dynamic-questions";
import { getIdentityPathDefinition, IDENTITY_PATH_ORDER_NOTICE } from "@/lib/identity/path-registry";
import {
  createNormalizedEngineAnswers,
  deriveCandidatePaths,
  runPathEngine,
} from "@/lib/identity/path-engine";
import { generateIdentityReport } from "@/lib/identity/report-engine";
import {
  IDENTITY_DYNAMIC_DRAFT_KEY,
  IDENTITY_FULL_REPORT_KEY,
  IDENTITY_RESULT_KEY,
  isStoredIdentityResult,
} from "@/lib/identity/storage";
import { POLICY_LIBRARY_VERSION, type StoredIdentityResult } from "@/lib/identity/types";

export function IdentityFullAnalysisExperience() {
  const router = useRouter();
  const [baseResult, setBaseResult] = useState<StoredIdentityResult | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const storedResult = window.sessionStorage.getItem(IDENTITY_RESULT_KEY);
        const parsedResult: unknown = storedResult ? JSON.parse(storedResult) : null;
        if (isStoredIdentityResult(parsedResult)) setBaseResult(parsedResult);

        const storedDraft = window.sessionStorage.getItem(IDENTITY_DYNAMIC_DRAFT_KEY);
        if (storedDraft) setDraft(JSON.parse(storedDraft) as Record<string, string>);
      } catch {
        setError("动态问题进度暂时无法读取，请返回 Snapshot 后重试。");
      } finally {
        setReady(true);
      }
    });
  }, []);

  const candidates = useMemo(
    () => (baseResult ? deriveCandidatePaths(baseResult.assessment) : []),
    [baseResult],
  );
  const questions = useMemo(
    () => getDynamicQuestions(candidates, baseResult?.assessment ?? {}),
    [baseResult, candidates],
  );

  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(IDENTITY_DYNAMIC_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      queueMicrotask(() => setError("本页进度暂时无法保存，请保持页面开启。"));
    }
  }, [draft, ready]);

  function updateAnswer(field: string, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function createReport() {
    if (!baseResult || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const dynamicAnswers = normalizeDynamicAnswers(questions, draft);
      const normalizedAnswers = createNormalizedEngineAnswers(baseResult.assessment, dynamicAnswers);
      const pathResults = runPathEngine({
        normalized_answers: normalizedAnswers,
        policy_version: POLICY_LIBRARY_VERSION,
      });
      const report = generateIdentityReport({
        assessment: baseResult.assessment,
        snapshot: baseResult.snapshot,
        normalized_answers: normalizedAnswers,
        path_results: pathResults,
      });
      window.sessionStorage.setItem(
        IDENTITY_FULL_REPORT_KEY,
        JSON.stringify({ base_result: baseResult, dynamic_answers: dynamicAnswers, report }),
      );
      router.push("/identity/full-report");
    } catch {
      setSubmitting(false);
      setError("报告暂时无法生成。你的动态回答仍保留在当前会话中。");
    }
  }

  if (!ready) {
    return (
      <main className="result-page result-page--loading" id="main-content">
        <div aria-label="正在读取动态问题" className="compass-loader"><span>✦</span></div>
      </main>
    );
  }

  if (!baseResult) {
    return (
      <main className="result-page" id="main-content">
        <header className="flow-header page-shell"><BrandLogo priority /></header>
        <section className="empty-result page-shell identity-full-placeholder">
          <span className="step-number">!</span>
          <h1>请先完成 Free Identity Snapshot</h1>
          <p>动态问题需要使用本次 Free 6 的规范化回答。</p>
          <Link className="continue-button" href="/identity/assessment">开始 Free 6题</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="assessment-page identity-dynamic" id="main-content">
      <header className="flow-header page-shell">
        <BrandLogo priority />
        <Link className="quiet-link" href="/identity/result">返回 Snapshot</Link>
      </header>

      <div className="page-shell dynamic-analysis-layout">
        <section className="dynamic-analysis-intro">
          <p className="eyebrow">FREE DYNAMIC ANALYSIS</p>
          <h1>补齐候选路径需要的事实。</h1>
          <p>问题按候选路径加载；共用事实只出现一次。所有问题均可暂时留空，报告会明确标记信息不足。</p>
          <div aria-label="本次候选路径" className="candidate-paths">
            {candidates.map((pathCode) => (
              <span key={pathCode}>{getIdentityPathDefinition(pathCode).display_name}</span>
            ))}
          </div>
          <p className="path-order-notice">{IDENTITY_PATH_ORDER_NOTICE}</p>
        </section>

        <section aria-labelledby="dynamic-question-title" className="dynamic-question-list">
          <div className="dynamic-question-list__heading">
            <p>OPTIONAL FACT COLLECTION</p>
            <h2 id="dynamic-question-title">{questions.length} 个动态事实项</h2>
          </div>

          {questions.map((item, index) => (
            <div className="dynamic-question" key={item.question_id}>
              <label htmlFor={item.question_id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.question_text}
              </label>
              <p>{item.help_text}</p>
              {item.answer_type === "single_select" ? (
                <select
                  id={item.question_id}
                  onChange={(event) => updateAnswer(item.field_key, event.target.value)}
                  value={draft[item.field_key] ?? ""}
                >
                  <option value="">暂时留空</option>
                  {item.options?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={item.question_id}
                  inputMode={item.answer_type === "number" ? "numeric" : undefined}
                  min={item.answer_type === "number" ? 0 : undefined}
                  onChange={(event) => updateAnswer(item.field_key, event.target.value)}
                  placeholder="可暂时留空"
                  type={item.answer_type}
                  value={draft[item.field_key] ?? ""}
                />
              )}
              <small>{item.source_ref}</small>
            </div>
          ))}

          <p aria-live="polite" className="form-error">{error}</p>
          <div className="dynamic-submit-card">
            <div>
              <p>FREE FULL REPORT</p>
              <h2>按已提供事实生成，不猜测空白项。</h2>
            </div>
            <button className="continue-button" disabled={submitting} onClick={createReport} type="button">
              {submitting ? "正在生成…" : "生成免费完整报告"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
