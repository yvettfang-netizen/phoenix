"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { createMockFeishuRepositories } from "@/lib/identity/adapters/mock-feishu";
import { persistCompletedIdentityAssessment } from "@/lib/identity/adapters/persist";
import { createFreeIdentitySnapshot } from "@/lib/identity/classification";
import { getOrCreateIdentityIds } from "@/lib/identity/ids";
import { normalizeIdentityAssessment, validateFreeIdentityAnswers } from "@/lib/identity/normalize";
import {
  currentHkStatusOptions,
  employmentStatusOptions,
  highestEducationOptions,
  identityAgeBandOptions,
  identityPrimaryGoalOptions,
  identityQuestionTitles,
  isIdentityStepComplete,
  routeOpennessOptions,
  type IdentityOption,
} from "@/lib/identity/questions";
import { IDENTITY_DRAFT_KEY, IDENTITY_RESULT_KEY } from "@/lib/identity/storage";
import type {
  FreeIdentityDraft,
  IdentityIds,
  IdentityPrimaryGoal,
  RouteOpenness,
  StoredIdentityResult,
} from "@/lib/identity/types";

type StoredDraft = Readonly<{ step: number; answers: FreeIdentityDraft }>;

function OptionButton<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: IdentityOption<T>;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`answer-option${selected ? " answer-option--selected" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <span aria-hidden="true" className="answer-option__marker">
        {selected ? "✓" : "○"}
      </span>
      <span>
        <strong>{option.label}</strong>
        {option.detail ? <small>{option.detail}</small> : null}
      </span>
    </button>
  );
}

export function IdentityAssessmentExperience() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<FreeIdentityDraft>({});
  const [ids, setIds] = useState<IdentityIds | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGoals = useMemo(() => draft.identity_primary_goals ?? [], [draft.identity_primary_goals]);
  const selectedRoutes = useMemo(() => draft.route_openness ?? [], [draft.route_openness]);
  const canContinue = isIdentityStepComplete(step, draft);
  const progress = ((step + 1) / identityQuestionTitles.length) * 100;

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const nextIds = getOrCreateIdentityIds(window.localStorage, window.sessionStorage);
        setIds(nextIds);
        const stored = window.sessionStorage.getItem(IDENTITY_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredDraft;
          setStep(Math.min(5, Math.max(0, Number(parsed.step) || 0)));
          setDraft(parsed.answers ?? {});
        }
      } catch {
        setError("当前浏览器无法保存测评进度，请开启站点存储后重试。");
      } finally {
        setHydrated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(IDENTITY_DRAFT_KEY, JSON.stringify({ step, answers: draft } satisfies StoredDraft));
    } catch {
      queueMicrotask(() => setError("本页进度暂时无法保存，请不要关闭页面。"));
    }
  }, [draft, hydrated, step]);

  function setField<K extends keyof FreeIdentityDraft>(field: K, value: FreeIdentityDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function toggleGoal(value: IdentityPrimaryGoal) {
    const next = selectedGoals.includes(value)
      ? selectedGoals.filter((goal) => goal !== value)
      : [...selectedGoals, value];
    setField("identity_primary_goals", next);
  }

  function toggleRoute(value: RouteOpenness) {
    const next = selectedRoutes.includes(value)
      ? selectedRoutes.filter((route) => route !== value)
      : [...selectedRoutes, value];
    setField("route_openness", next);
  }

  function goNext() {
    if (!canContinue) {
      setError("请至少选择一项后继续。");
      return;
    }
    setStep((current) => Math.min(5, current + 1));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (submitting) return;
    setStep((current) => Math.max(0, current - 1));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAssessment() {
    if (submitting || !ids) return;
    const validation = validateFreeIdentityAnswers(draft);
    if (!validation.success) {
      setError("回答还不完整，请返回检查后再提交。");
      return;
    }

    setSubmitting(true);
    setError(null);
    const assessment = normalizeIdentityAssessment(validation.data, ids);
    const result: StoredIdentityResult = {
      ids,
      assessment,
      snapshot: createFreeIdentitySnapshot(validation.data),
    };

    try {
      const repositories = createMockFeishuRepositories(window.localStorage);
      await persistCompletedIdentityAssessment(repositories, assessment);
      window.sessionStorage.setItem(IDENTITY_RESULT_KEY, JSON.stringify(result));
      router.push("/identity/result");
    } catch {
      setSubmitting(false);
      setError("结果暂时无法保存，请稍后重试。你的回答仍保留在当前页面。");
    }
  }

  return (
    <main className="assessment-page identity-assessment" id="main-content">
      <header className="flow-header page-shell">
        <BrandLogo priority />
        <Link className="quiet-link" href="/identity">
          退出测评
        </Link>
      </header>

      <div className="assessment-layout page-shell">
        <aside className="assessment-context">
          <p className="eyebrow">FREE IDENTITY COMPASS</p>
          <h1>先看清家庭意图，再比较方向。</h1>
          <p>每屏一题，只整理当前情况与开放方向，不进行政策资格判断。</p>
          <div className="privacy-note">
            <strong>本次不会询问</strong>
            <span>手机号、身份证、护照、银行流水、税单或资产证明</span>
          </div>
        </aside>

        <section aria-labelledby="identity-question-title" className="question-card">
          <div className="progress-meta">
            <span>Identity Compass</span>
            <strong>{step + 1} / 6</strong>
          </div>
          <div
            aria-label={`完成进度 ${Math.round(progress)}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress)}
            className="progress-track"
            role="progressbar"
          >
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="question-body">
            <span className="step-number">0{step + 1}</span>
            <h2 id="identity-question-title">{identityQuestionTitles[step]}</h2>
            {step === 0 || step === 5 ? <p className="selection-help">可多选，请选择所有适合当前情况的项目。</p> : null}

            {step === 0 ? (
              <div className="option-grid">
                {identityPrimaryGoalOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    onSelect={() => toggleGoal(option.value)}
                    option={option}
                    selected={selectedGoals.includes(option.value)}
                  />
                ))}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="option-grid">
                {currentHkStatusOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    onSelect={() => setField("current_hk_status", option.value)}
                    option={option}
                    selected={draft.current_hk_status === option.value}
                  />
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="option-grid option-grid--compact">
                {identityAgeBandOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    onSelect={() => setField("age_band", option.value)}
                    option={option}
                    selected={draft.age_band === option.value}
                  />
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="option-grid">
                {highestEducationOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    onSelect={() => setField("highest_education", option.value)}
                    option={option}
                    selected={draft.highest_education === option.value}
                  />
                ))}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="option-grid">
                {employmentStatusOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    onSelect={() => setField("employment_status", option.value)}
                    option={option}
                    selected={draft.employment_status === option.value}
                  />
                ))}
              </div>
            ) : null}

            {step === 5 ? (
              <div className="option-grid">
                {routeOpennessOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    onSelect={() => toggleRoute(option.value)}
                    option={option}
                    selected={selectedRoutes.includes(option.value)}
                  />
                ))}
              </div>
            ) : null}

            <p aria-live="polite" className="form-error">
              {error}
            </p>
            <div className="question-actions">
              <button className="back-button" disabled={step === 0 || submitting} onClick={goBack} type="button">
                ← 返回
              </button>
              {step < 5 ? (
                <button className="continue-button" disabled={!canContinue || submitting} onClick={goNext} type="button">
                  下一步 <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  className="continue-button"
                  disabled={!canContinue || !hydrated || !ids || submitting}
                  onClick={() => void submitAssessment()}
                  type="button"
                >
                  {submitting ? "正在生成…" : "查看免费身份快照"}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
