"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, Share2 } from "lucide-react";
import { assessmentPath, isValidAnswer, reviseAnswer, VERSIONS,
  type Answer, type Answers, type RespondentRole, type Snapshot } from "@/lib/free-education-assessment";
import { presentGrowthCards } from "../../../Phoenix Compass/education compass/models/free-education-presentation.js";
import styles from "./free-education-assessment.module.css";

const roles: { id: RespondentRole; label: string }[] = [
  { id: "PARENT_GUARDIAN", label: "以家长视角填写" },
  { id: "STUDENT", label: "学生本人填写" },
  { id: "UNDECLARED", label: "不说明身份，直接开始" },
];

export function FreeEducationAssessment({ locale }: { locale: "zh" | "en" }) {
  const [role, setRole] = useState<RespondentRole | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const target = useRef<HTMLHeadingElement>(null);
  const { questions } = assessmentPath(answers);
  const question = questions[index];
  const answer = answers[question.question_id];
  const values = ([] as string[]).concat(answer ?? []);

  useEffect(() => { target.current?.focus(); }, [role, index, snapshot]);

  function select(value: string) {
    let picked: Answer = value;
    if (question.answer_type === "MULTI_CHOICE") {
      if (values.includes(value)) picked = values.filter(item => item !== value);
      else if (question.exclusive_options.includes(value)) picked = [value];
      else picked = [...values.filter(item => !question.exclusive_options.includes(item)), value];
      if (picked.length > question.max_selections) return;
    }
    setMessage("");
    setAnswers(reviseAnswer(answers, question.question_id, picked.length ? picked : null));
  }

  async function advance(skip: boolean) {
    const next = skip ? reviseAnswer(answers, question.question_id, null) : answers;
    if (!skip && (!isValidAnswer(question, answer) || answer === null)) return;
    setAnswers(next);
    setMessage("");
    if (index < assessmentPath(next).questions.length - 1) { setIndex(index + 1); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/free-education-assessment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "omit", cache: "no-store",
        body: JSON.stringify({ versions: VERSIONS, respondent_role: role, answers: next }),
      });
      if (!response.ok) throw new Error();
      setSnapshot(await response.json() as Snapshot);
    } catch {
      setMessage("暂时无法生成快照。答案仍在当前页面，可重试。");
    } finally { setBusy(false); }
  }

  async function share() {
    const url = new URL(location.pathname, location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "凤启教育罗盘｜免费初评", url });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("入口链接已复制，可用于分享。");
      }
    } catch {
      setMessage("可从地址栏复制入口链接。");
    }
  }

  return <main className={styles.main} lang="zh-CN">
    <div className={styles.shell}>
      <a className={styles.back} href={`/${locale}/education#education-compass`}><ArrowLeft size={16} aria-hidden /> 教育规划</a>
      <div className={styles.identity}><Compass aria-hidden size={21} /> 凤启教育罗盘 · 免费初评</div>
      {!role ? <section className={styles.panel}>
        <h1 tabIndex={-1} ref={target}>先看清方向，再规划成长。</h1>
        <p>用 3–5 分钟梳理目前的教育问题。匿名填写，完成即可查看成长快照。</p>
        <div className={styles.options}>{roles.map(item => <button type="button" key={item.id}
          onClick={() => { setRole(item.id); setMessage(""); }}>{item.label}<ArrowRight size={18} aria-hidden /></button>)}</div>
        <button type="button" className={styles.secondary} onClick={share}><Share2 size={16} aria-hidden /> 分享初评入口</button>
      </section> : snapshot ? <section className={styles.panel}>
        <h1 tabIndex={-1} ref={target}>成长快照</h1>
        <div className={styles.cards}>{presentGrowthCards(snapshot).map(card => <article key={card.id}>
          <h2>{card.label}</h2>
          {card.findings.length ? card.findings.map(finding => <div className={styles.finding} key={finding.id}>
            <h3>{finding.title}</h3><p>{finding.summary}</p>
            <small>{finding.evidenceLabel}</small>
            {finding.officialNotice && <p className={styles.action}>{finding.officialNotice}</p>}
            {(finding.questionPrompts.length > 0 || finding.officialSources.length > 0) && <details className={styles.evidence}>
              <summary>查看判断依据</summary>
              {finding.questionPrompts.map(prompt => <p key={prompt}>已填写题目：{prompt}</p>)}
              {finding.officialSources.map(source => <p key={source}>官方来源：{source}</p>)}
            </details>}
            {finding.actions.map(text => <p className={styles.action} key={text}>{text}</p>)}
          </div>) : <p>目前可用信息较少。</p>}
          {card.missingInformation.length > 0 && <section className={styles.missing}>
            <h3>还需要了解</h3>
            <ul>{card.missingInformation.map(text => <li key={text}>{text}</li>)}</ul>
          </section>}
        </article>)}</div>
        <div className={styles.controls}><button type="button" className={styles.secondary}
          onClick={() => { setSnapshot(null); setIndex(0); setMessage(""); }}>回看并修改</button>
          <button type="button" className={styles.secondary} onClick={share}><Share2 size={16} aria-hidden /> 分享初评入口</button></div>
      </section> : <section className={styles.panel} aria-labelledby="free-question">
        <div className={styles.progress}><span>第 {index+1} 题，共 {questions.length} 题</span>
          <progress value={index+1} max={questions.length} aria-label="初评进度" /></div>
        <h1 id="free-question" tabIndex={-1} ref={target}>{question.prompt}</h1>
        {question.answer_type === "MULTI_CHOICE" && <p>最多选择 {question.max_selections} 项</p>}
        <div className={styles.options} role="group" aria-labelledby="free-question">
          {question.allowed_values.map(option => <button type="button" key={option.value}
            aria-pressed={values.includes(option.value)} disabled={busy} onClick={() => select(option.value)}>{option.label}</button>)}
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.secondary} disabled={busy} onClick={() => {
            setMessage(""); if (index > 0) setIndex(index - 1);
            else { setRole(null); setAnswers({}); }
          }}>返回</button>
          {!question.required && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void advance(true)}>跳过</button>}
          <button type="button" className={styles.primary} disabled={busy || !isValidAnswer(question, answer) || answer === null}
            onClick={() => void advance(false)}>{busy ? "正在生成…" : index === questions.length - 1 ? "查看成长快照" : "下一题"}<ArrowRight size={18} aria-hidden /></button>
        </div>
      </section>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </div>
  </main>;
}
