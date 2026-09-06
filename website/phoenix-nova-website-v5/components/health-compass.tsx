"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { actionText, dimensions, getResults, questions, text, toggleAction, type HealthLocale } from "@/lib/health-compass";
import styles from "./health-compass.module.css";

export function HealthCompass({ locale }: { locale: HealthLocale }) {
  const t = (zh: string, en: string) => locale === "zh" ? zh : en;
  const [step, setStep] = useState<"intro" | "questions" | "review" | "result">("intro");
  const [answers, setAnswers] = useState<(string | null)[]>(() => questions.map(() => null));
  const [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reset = useCallback(() => {
    setAnswers(questions.map(() => null)); setIndex(0); setAccepted(false);
    setEditing(false); setSelected([]); setNotice(""); setShowPlan(false);
    setConfirmClear(false); setStep("intro");
  }, []);
  useEffect(() => {
    const clearOnRestore = (event: PageTransitionEvent) => { if (event.persisted) reset(); };
    window.addEventListener("pageshow", clearOnRestore);
    window.addEventListener("pagehide", reset);
    return () => {
      window.removeEventListener("pageshow", clearOnRestore);
      window.removeEventListener("pagehide", reset);
    };
  }, [reset]);
  useEffect(() => { heading.current?.focus(); }, [step, index]);
  const question = questions[index];
  const results = getResults(answers);
  const labelFor = (i: number) => {
    const option = questions[i].options.find(item => item.value === answers[i]);
    return option ? text(option.label, locale) : t("已跳过", "Skipped");
  };
  function advance(skip = false) {
    if (skip) setAnswers(current => current.map((value, i) => i === index ? null : value));
    setSelected([]); setShowPlan(false); setNotice("");
    if (editing || index === questions.length - 1) { setEditing(false); setStep("review"); }
    else setIndex(index + 1);
  }
  function edit(i: number) { setIndex(i); setEditing(true); setSelected([]); setShowPlan(false); setNotice(""); setStep("questions"); }
  function chooseAction(id: string) {
    if (!selected.includes(id) && selected.length === 3) {
      setNotice(t("最多选择三件事，请先取消一项。", "Choose up to three actions; deselect one first.")); return;
    }
    setSelected(current => toggleAction(current, id)); setNotice(""); setShowPlan(false);
  }
  function download() {
    if (!selected.length) return;
    // Always reveal a manual-copy fallback: some embedded browsers do not support downloads.
    setShowPlan(true);
    let url: string | undefined;
    try {
      url = URL.createObjectURL(new Blob(["\uFEFF", actionText(selected, locale)], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url;
      link.download = "Phoenix_Health_Action_List.txt"; document.body.appendChild(link);
      link.click(); link.remove();
      setNotice(t("已尝试导出。若浏览器没有保存文件，请从下方复制行动单；本工具无法确认保存是否成功。", "Download requested. If no file appears, copy the list below. This tool cannot confirm a saved file."));
    } catch {
      setNotice(t("当前浏览器无法导出，请从下方复制行动单。", "Download is unavailable in this browser. Copy the list below."));
    } finally {
      if (url) { const objectUrl = url; window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
    }
  }
  return (
    <section className={styles.compass} lang={locale === "zh" ? "zh-Hans" : "en"} data-health-compass data-step={step}>
      <div className={styles.topline}>
        <span>PHOENIX HEALTH COMPASS</span>
        <span>{t("候选体验 · 非医疗服务", "Candidate preview · Not a medical service")}</span>
      </div>
      {step === "intro" ? <>
        <div className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{t("健康罗盘 / 从一次梳理开始", "HEALTH COMPASS / START WITH CLARITY")}</p>
            <h1 ref={heading} tabIndex={-1}>{t("把家人的健康安排，放回同一张地图。", "Bring your family's health arrangements into one clear map.")}</h1>
            <p>{t("不替你判断健康状况。只帮你梳理就医渠道、家庭协作与下一步安排。", "No judgement of health status. Organise care channels, family coordination and next steps.")}</p>
            <div className={styles.metrics}><span>{t("14个问题", "14 questions")}</span><span>{t("6个整理方向", "6 directions")}</span><span>{t("最多3件行动", "Up to 3 actions")}</span></div>
          </div>
          <div className={styles.map} aria-label={t("六个整理方向", "Six directions")}>
            {dimensions.map((dimension, i) => <div key={dimension.id}><small>{String(i + 1).padStart(2, "0")}</small><strong>{text(dimension.title, locale)}</strong></div>)}
          </div>
        </div>
        <div className={styles.panel}>
          <h2>{t("开始前，请了解", "Before you begin")}</h2>
          <p>{t("仅供成年使用者整理事务，不提供诊断、处方、医疗风险评分或保险推荐，也不适用于紧急情况。", "For adults organising tasks only. No diagnosis, prescription, medical risk score or insurance recommendation. Not for emergencies.")}</p>
          <p>{t("所有题目均可跳过。不填写姓名、病史、检查结果、联系方式或保单资料。回答仅在当前页面内存中使用，不提交服务器、不保存到家庭中心；刷新、离开或清空会丢失回答。", "Every question can be skipped. Do not provide names, medical history, test results, contacts or policy details. Answers stay in this page's memory, are not sent to a server or Family Center, and are lost on refresh, exit or clear.")}</p>
          <label className={styles.consent}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} data-testid="health-consent" />{t("我已年满18岁，并了解上述使用边界。", "I am at least 18 and understand these limits.")}</label>
          <button type="button" className="button button--gold" disabled={!accepted} onClick={() => setStep("questions")} data-testid="health-start">{t("开始梳理", "Start organising")} <span aria-hidden="true">→</span></button>
        </div>
      </> : null}
      {step === "questions" ? <div className={styles.panel}>
        <div className={styles.topline}><span>{question.id}</span><span>{index + 1} / {questions.length}</span></div>
        <progress className={styles.progress} value={index + 1} max={questions.length} aria-label={t("答题进度，不是健康分数", "Question progress, not a health score")} />
        <h1 ref={heading} tabIndex={-1} id="health-question">{text(question.title, locale)}</h1>
        <p id="health-hint">{text(question.hint, locale)}</p>
        <fieldset className={styles.options} aria-labelledby="health-question" aria-describedby="health-hint">
          <legend className={styles.srOnly}>{t("选择一项，或跳过", "Choose one, or skip")}</legend>
          {question.options.map(option => <label className={styles.option} key={option.value}>
            <input type="radio" name={question.id} value={option.value} checked={answers[index] === option.value} onChange={() => setAnswers(current => current.map((value, i) => i === index ? option.value : value))} />
            <span>{text(option.label, locale)}</span>
          </label>)}
        </fieldset>
        <div className={styles.actions}>
          <button type="button" onClick={() => editing ? (setEditing(false), setStep("review")) : index ? setIndex(index - 1) : setStep("intro")} data-testid="health-back">{editing ? t("返回核对", "Back to review") : t("上一步", "Back")}</button>
          <button type="button" onClick={() => advance(true)} data-testid="health-skip">{t("跳过", "Skip")}</button>
          <button type="button" className="button button--gold" disabled={answers[index] === null} onClick={() => advance()} data-testid="health-next">{editing || index === questions.length - 1 ? t("核对回答", "Review answers") : t("下一题", "Next")}</button>
        </div>
      </div> : null}
      {step === "review" ? <div className={styles.panel}>
        <h1 ref={heading} tabIndex={-1}>{t("先核对，再看安排地图。", "Review first. Then see your arrangement map.")}</h1>
        <p>{t("以下仅为你的自述，不代表机构核实或健康判断。", "These are your own descriptions, not verified arrangements or health judgements.")}</p>
        <ol className={styles.review}>{questions.map((item, i) => <li key={item.id}><div><strong>{item.id} · {text(item.title, locale)}</strong><p>{labelFor(i)}</p></div><button type="button" onClick={() => edit(i)} data-testid={`health-edit-${i}`}>{t("修改", "Edit")}</button></li>)}</ol>
        <button type="button" className="button button--gold" onClick={() => setStep("result")} data-testid="health-result">{t("查看安排地图", "View arrangement map")}</button>
      </div> : null}
      {step === "result" ? <>
        <h1 ref={heading} tabIndex={-1}>{t("你的家庭健康安排地图", "Your family's arrangement map")}</h1>
        <p>{t("文字状态仅复述你的安排情况，不表示身体健康、医疗风险高低或保障充分。", "Labels describe reported arrangements, not health, medical risk or adequacy of coverage.")}</p>
        {results.length ? <>
          <div className={styles.results}>{results.map((result, i) => <article className={styles.panel} key={result.id} data-testid="health-dimension"><small>{String(i + 1).padStart(2, "0")}</small><h2>{text(result.title, locale)}</h2><strong className={styles.status}>{text(result.status, locale)}</strong><p>{questions[i * 2 + 2].id}: {labelFor(i * 2 + 2)}<br />{questions[i * 2 + 3].id}: {labelFor(i * 2 + 3)}</p></article>)}</div>
          <div className={styles.panel}><h2>{t("接下来，你想先做哪三件事？", "Which up to three actions would you like to take?")}</h2><p>{t("由你选择，按选择顺序排列，不按医疗风险排序。也可以暂不选择。", "Choose freely. Actions follow your selection order, not medical risk. Choosing none is fine.")}</p>
            <div className={styles.options}>{dimensions.map(dimension => <button type="button" key={dimension.id} aria-pressed={selected.includes(dimension.id)} onClick={() => chooseAction(dimension.id)} data-testid={`health-action-${dimension.id}`}>{selected.includes(dimension.id) ? `${selected.indexOf(dimension.id) + 1}. ` : ""}{text(dimension.title, locale)}</button>)}</div>
            <div className={styles.actions}><button type="button" className="button button--gold" disabled={!selected.length} onClick={download} data-testid="health-export">{t("导出文字行动单", "Export action list")}</button><button type="button" disabled={!selected.length} onClick={() => setShowPlan(true)}>{t("显示可复制文本", "Show copyable text")}</button></div>
            {showPlan ? <pre className={styles.plan} data-testid="health-plan">{actionText(selected, locale)}</pre> : null}
          </div>
        </> : <div className={styles.panel} data-testid="health-empty"><h2>{t("信息不足，不生成个性化结果。", "Not enough information for a personalised result.")}</h2><p>{t("12个安排问题均未回答。关系与地区选择不能用来推断你的安排。", "All 12 arrangement questions were skipped. Relationship and region do not tell us about your arrangements.")}</p></div>}
        <button type="button" onClick={() => { setStep("review"); setNotice(""); }} data-testid="health-review">{t("返回核对回答", "Review answers")}</button>
      </> : null}
      <p className={styles.notice} role="status" aria-live="polite">{notice}</p>
      {step !== "intro" ? <div className={styles.clear}>
        {confirmClear ? <><p>{t("清空后无法恢复。确定清空本次回答和行动选择？", "This cannot be undone. Clear these answers and action choices?")}</p><button type="button" onClick={reset} data-testid="health-confirm-clear">{t("确认清空", "Confirm clear")}</button><button type="button" onClick={() => setConfirmClear(false)}>{t("保留回答", "Keep answers")}</button></> : <button type="button" onClick={() => setConfirmClear(true)} data-testid="health-clear">{t("清空本次回答", "Clear this session")}</button>}
      </div> : null}
      <p className={styles.footnote}>{t("本版不预约、不收费、不发送给顾问，不写入 Family OS。请勿用于紧急情况。", "No booking, payment, advisor submission or Family OS writeback. Not for emergencies.")}</p>
    </section>
  );
}

