"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import {
  QUESTIONS,
  DIMENSIONS,
  CONSENTS,
  VERSIONS,
  score,
  validateAnswer,
  type Answers,
} from "../../../Phoenix Compass/Wealth Compass/src/domain/wealth-compass/frozen-v1";
import styles from "./wealth.module.css";
const DRAFT_KEY = "phoenix-wealth-frozen-v1-draft";
const riskLabels: Record<string, readonly [string, string]> = {
  MIXED_BUSINESS_FAMILY_FUNDS: [
    "企业与家庭结构边界待核实",
    "Business and family boundaries need review",
  ],
  IDENTITY_CHANGE_IMMINENT: [
    "近期身份或结构变化待核实",
    "Upcoming identity or structural changes need review",
  ],
  SINGLE_INFORMATION_HOLDER: [
    "关键资料依赖单一负责人",
    "Essential information depends on one person",
  ],
  CROSS_BORDER_UNREVIEWED: [
    "跨境关系尚未整体复核",
    "Cross-border arrangements need a coordinated review",
  ],
  NO_EMERGENCY_LIQUIDITY: [
    "应急流动性需优先关注",
    "Emergency liquidity deserves priority attention",
  ],
  LEGAL_TAX_DISPUTE: [
    "已存在法律或税务争议，须专业核实",
    "An existing legal or tax dispute requires professional review",
  ],
};
export function WealthAssessment({
  locale,
  standalone = false,
}: {
  locale: "zh" | "en";
  standalone?: boolean;
}) {
  const zh = locale === "zh",
    t = (a: string, b: string) => (zh ? a : b),
    p = (copy: readonly [string, string]) => copy[zh ? 0 : 1];
  const [consentRecord, setConsentRecord] = useState<{
    consent_type: "C1";
    version: string;
    granted_at: string;
    withdrawn_at: null;
    source_page: string;
    actor: string;
  } | null>(null);
  const [consent, setConsent] = useState(false),
    [step, setStep] = useState(-1),
    [answers, setAnswers] = useState<Answers>({}),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [hasDraft, setHasDraft] = useState(false),
    [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setHasDraft(!!sessionStorage.getItem(DRAFT_KEY));
      } catch {
        setStorageAvailable(false);
      }
    });
  }, []);
  const question = QUESTIONS[step],
    current = question
      ? (answers[question.id] ?? { codes: [] })
      : { codes: [] };
  const update = (code: string) => {
    if (!question) return;
    let codes: string[];
    if (!question.multiple) codes = [code];
    else if (current.codes.includes(code))
      codes = current.codes.filter((x) => x !== code);
    else if (question.exclusive?.includes(code) || code === "SKIP")
      codes = [code];
    else
      codes = [
        ...current.codes.filter(
          (x) => x !== "SKIP" && !question.exclusive?.includes(x),
        ),
        code,
      ];
    setAnswers((old) => ({
      ...old,
      [question.id]: {
        codes,
        ...(codes.includes("OTHER") && current.other
          ? { other: current.other }
          : {}),
      },
    }));
    setError("");
    setSaved(false);
  };
  const reset = () => {
    setAnswers({});
    setConsent(false);
    setConsentRecord(null);
    setStep(-1);
    setError("");
    setSaved(false);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    setHasDraft(false);
  };
  const next = () => {
    const problem = validateAnswer(question, current);
    if (problem) {
      setError(
        t(
          "请检查选项：多选须遵守数量限制；“其他”只填写 50 字以内的一般说明，不填写账号、证件、金额或敏感资料。",
          "Check your selection limits. For Other, use up to 50 characters of general information without account details, identity numbers, amounts or sensitive records.",
        ),
      );
      return;
    }
    setError("");
    setStep((x) => x + 1);
  };
  const save = () => {
    const valid = Object.entries(answers).every(([id, a]) => {
      const q = QUESTIONS.find((q) => q.id === id);
      return q && !validateAnswer(q, a);
    });
    if (!valid) {
      setError(
        t(
          "请先检查当前答案，敏感或不完整内容不能保存。",
          "Please review your current answers. Sensitive or incomplete content cannot be saved.",
        ),
      );
      return;
    }
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          versions: VERSIONS,
          consent: consentRecord,
          answers,
          step: Math.min(Math.max(step, 0), 13),
        }),
      );
      setHasDraft(true);
      setSaved(true);
      setError("");
    } catch {
      setError(
        t(
          "当前浏览器无法保存，请继续完成或退出并清除。",
          "This browser cannot save progress. Continue now, or exit and clear.",
        ),
      );
    }
  };
  const restore = () => {
    if (!consent) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (
        !draft ||
        JSON.stringify(draft.versions) !== JSON.stringify(VERSIONS) ||
        !Number.isInteger(draft.step) ||
        draft.step < 0 ||
        draft.step > 13 ||
        !draft.answers ||
        Array.isArray(draft.answers) ||
        typeof draft.answers !== "object"
      )
        throw Error();
      for (const [id, a] of Object.entries(draft.answers)) {
        const q = QUESTIONS.find((q) => q.id === id);
        if (!q || validateAnswer(q, a as Answers[string])) throw Error();
      }
      setAnswers(draft.answers);
      setStep(draft.step);
      setSaved(false);
    } catch {
      setError(
        t(
          "草稿版本或内容无法验证，请清除后重新开始。",
          "The draft version or content could not be verified. Clear it and start again.",
        ),
      );
    }
  };
  const result = step === QUESTIONS.length ? score(answers) : null;
  return (
    <div className={styles.assessment} data-testid="wealth-assessment">
      <nav
        className={styles.breadcrumbs}
        aria-label={t("当前位置", "Breadcrumb")}
      >
        <Link href={standalone ? `/${locale}` : `/${locale}/wealth`}>
          {t("财富规划", "Wealth planning")}
        </Link>
        <span>/</span>
        <span>{t("家庭财富罗盘", "Wealth Compass")}</span>
      </nav>
      <p className={styles.eyebrow}>PHOENIX WEALTH COMPASS™</p>
      <h1>{t("从了解家庭当下开始。", "Begin with your family's present.")}</h1>
      <p>
        {t(
          "14 道结构问题，六个规划维度。没有财富等级，也无需填写精确资产金额。",
          "14 structural questions. Six planning dimensions. No wealth rankings or exact asset amounts.",
        )}
      </p>
      {step === -1 && (
        <div
          className={styles.assessmentPanel}
          data-testid="wealth-consent-panel"
        >
          <ShieldCheck color="#a77b4a" />
          <h2>
            {t(
              "开始前，先了解您的选择。",
              "Before you start, understand your choices.",
            )}
          </h2>
          <p>
            {t(
              "本次为浏览器内的规则评估。不在服务器保存、不上传、不构成投资建议，也不会建立客户、家庭、顾问或转介记录。您可返回修改、暂不回答，或主动保存当前浏览器会话中的进度。",
              "This assessment runs in your browser using fixed rules. Answers are not saved on a server or uploaded. This is not investment advice and does not create client, family, advisor or referral records. Go back, skip questions or explicitly save progress within this browser session.",
            )}
          </p>
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setConsentRecord(
                  e.target.checked
                    ? {
                        consent_type: "C1",
                        version: VERSIONS.consentCopy,
                        granted_at: new Date().toISOString(),
                        withdrawn_at: null,
                        source_page: window.location.pathname,
                        actor: crypto.randomUUID(),
                      }
                    : null,
                );
              }}
              data-testid="wealth-consent"
            />
            <span>
              <strong>{p(CONSENTS[0].title)}</strong>
              <p>{p(CONSENTS[0].body)}</p>
            </span>
          </label>
          <p className={styles.footnote}>
            {t(
              "本路径不使用 AI。顾问联系、特定机构共享与营销须分别另行授权，不因本次同意而开启。",
              "This path does not use AI. Advisor contact, sharing with a named institution and marketing each require separate authorisation.",
            )}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={!consent}
              onClick={() => setStep(0)}
              data-testid="wealth-start"
            >
              {t("同意并开始", "Agree and begin")}
              <ArrowRight size={16} />
            </button>
            {hasDraft && (
              <button
                className={styles.secondary}
                disabled={!consent}
                onClick={restore}
                type="button"
              >
                {t("继续已保存的进度", "Resume saved progress")}
              </button>
            )}
          </div>
          {hasDraft && (
            <button className={styles.clear} type="button" onClick={reset}>
              {t("清除已有草稿", "Clear saved draft")}
            </button>
          )}
        </div>
      )}
      {question && step >= 0 && (
        <div className={styles.assessmentPanel}>
          <div className={styles.questionMeta}>
            <span>{question.id} / 14</span>
            <span>
              {p(DIMENSIONS.find((d) => d.code === question.dimension)!.name)}
            </span>
          </div>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label={t("问卷进度", "Assessment progress")}
            aria-valuemin={0}
            aria-valuemax={14}
            aria-valuenow={step}
          >
            <span style={{ width: `${(step / 14) * 100}%` }} />
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>
              <h2>{p(question.text)}</h2>
            </legend>
            <p>
              {question.multiple
                ? t(
                    question.max
                      ? `可多选，最多 ${question.max} 项。`
                      : "可多选。",
                    question.max
                      ? `Choose up to ${question.max} options.`
                      : "Choose all that apply.",
                  )
                : t("请选择一项，或暂不回答。", "Choose one option, or skip.")}
            </p>
            <div className={styles.options}>
              {question.options.map((o) => (
                <label className={styles.option} key={o.code}>
                  <input
                    type={question.multiple ? "checkbox" : "radio"}
                    name={question.id}
                    value={o.code}
                    checked={current.codes.includes(o.code)}
                    onChange={() => update(o.code)}
                  />
                  <span>{p(o.label)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {question.allowOther && current.codes.includes("OTHER") && (
            <>
              <label className={styles.footnote} htmlFor="wealth-other">
                {t(
                  "一般说明（最多 50 字，不填写敏感资料）",
                  "General information (up to 50 characters, no sensitive records)",
                )}
              </label>
              <textarea
                id="wealth-other"
                maxLength={50}
                value={current.other ?? ""}
                onChange={(e) => {
                  const other = e.target.value;
                  const candidate = { codes: current.codes, other };
                  if (
                    ["SENSITIVE_INPUT_BLOCKED", "OTHER_TOO_LONG"].includes(
                      validateAnswer(question, candidate) ?? "",
                    )
                  ) {
                    setError(
                      t(
                        "请勿输入敏感资料，内容未被保存。",
                        "Please do not enter sensitive records. The content was not saved.",
                      ),
                    );
                    return;
                  }
                  setAnswers((old) => ({ ...old, [question.id]: candidate }));
                  setSaved(false);
                  setError("");
                }}
              />
            </>
          )}
          <div className={styles.assessmentActions}>
            <button
              className={styles.secondary}
              type="button"
              disabled={step === 0}
              onClick={() => {
                setStep((x) => x - 1);
                setError("");
              }}
            >
              <ArrowLeft size={15} />
              {t("上一题", "Back")}
            </button>
            <button
              className={styles.primary}
              type="button"
              onClick={next}
              data-testid="wealth-next"
            >
              {step === 13
                ? t("查看六维结果", "View six-dimension results")
                : t("下一题", "Continue")}
              <ArrowRight size={15} />
            </button>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.clear}
              disabled={!storageAvailable}
              onClick={save}
            >
              {t("保存本次会话进度", "Save this session's progress")}
            </button>
            <button type="button" className={styles.clear} onClick={reset}>
              {t("退出并清除", "Exit and clear")}
            </button>
          </div>
          <p className={styles.footnote}>
            {t(
              "保存仅限当前浏览器会话，关闭会话后可能丢失。不是云端家庭档案。",
              "Saving is limited to this browser session and may be lost when it closes. It is not a cloud family record.",
            )}
          </p>
        </div>
      )}
      {result && (
        <div data-testid="wealth-result">
          <div className={styles.notice}>
            {result.reportStatus === "READY"
              ? t(
                  "您的六维结构结果已整理。结果用于梳理规划问题，不是专业意见或正式顾问报告。",
                  "Your six-dimension results are ready for reflection. They help organise planning questions and are not professional advice or a formal advisor report.",
                )
              : t(
                  "信息尚不完整。请补充答案后再形成完整结果；以下仅显示已有信息。",
                  "More information is needed. Complete the answers before drawing an overall interpretation; only available information is shown below.",
                )}
          </div>
          <div className={styles.scoreGrid}>
            {result.dimensions.map((d) => (
              <article
                key={d.code}
                className={styles.scoreCard}
                data-testid="wealth-dimension"
              >
                <small>{d.code}</small>
                <h3>{p(DIMENSIONS.find((x) => x.code === d.code)!.name)}</h3>
                <strong>{d.readiness ?? "—"}</strong>
                <small>{p(d.band)}</small>
                <div className={styles.scoreBar}>
                  <span style={{ width: `${d.readiness ?? 0}%` }} />
                </div>
                <p>
                  {t(
                    `信息完整度 ${d.confidence}% · 规划关注差距 ${d.gap ?? "—"}`,
                    `Information confidence ${d.confidence}% · Planning gap ${d.gap ?? "—"}`,
                  )}
                </p>
              </article>
            ))}
          </div>
          {result.manualReviewRequired && (
            <div className={styles.notice}>
              {t(
                "需要人工复核：请先核实事实与相关安排，不依据自动结果作出专业决定。",
                "Human review is needed. Verify the facts and relevant arrangements before making professional decisions.",
              )}
            </div>
          )}
          {result.flags.length > 0 && (
            <ul className={styles.riskList}>
              {result.flags.map((f) => (
                <li key={f.code}>
                  {p(riskLabels[f.code] ?? [f.code, f.code])}
                </li>
              ))}
            </ul>
          )}
          {result.reportStatus === "READY" && result.actions.length > 0 && (
            <div className={styles.assessmentPanel}>
              <h2>
                {t(
                  "下一步，优先关注这些问题。",
                  "Your next planning priorities.",
                )}
              </h2>
              <ol>
                {result.actions.map((a) => (
                  <li key={a[0]}>{p(a)}</li>
                ))}
              </ol>
            </div>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setStep(0)}
            >
              {t("返回核对答案", "Review answers")}
            </button>
            <Link
              href={`${standalone ? `/${locale}` : `/${locale}/wealth`}#consultation`}
              className={styles.primary}
            >
              {t("准备顾问咨询", "Prepare an advisor conversation")}
              <ArrowRight size={16} />
            </Link>
            <button type="button" className={styles.clear} onClick={reset}>
              {t("清除并重新开始", "Clear and restart")}
            </button>
          </div>
          <p className={styles.footnote}>
            {t(
              "结果不会自动同步至家庭中心或分享给机构。",
              "Results are not automatically synced to Family Center or shared with institutions.",
            )}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className={styles.footnote}>
          {t("已保存至当前浏览器会话。", "Saved to this browser session.")}
        </p>
      )}
    </div>
  );
}
