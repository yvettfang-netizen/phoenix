import type { Metadata } from "next";
import { PageHero, SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = {
  title: "家庭规划方法 | 智富家办",
  description: "智富家办以理解家庭、形成路线图、专业协同和持续复盘四步推进长期规划。",
};

const steps = [
  ["01", "理解家庭", "确认家庭成员、所处阶段、跨境目标、资源边界与真正需要解决的问题。"],
  ["02", "形成路线图", "把身份、教育、健康与财富放在同一时间轴上，识别顺序、依赖与风险。"],
  ["03", "专业协同", "由法律、税务、持牌金融、保险、教育或医疗专业机构独立承接相应事项。"],
  ["04", "持续复盘", "随着政策、家庭阶段和目标变化，检视证据、进度与下一步安排。"],
];

export default function MethodologyPage() {
  return (
    <main>
      <SiteHeader />
      <PageHero eyebrow="Family Planning Method" title="先诊断，再规划。先合规，再执行。" intro="一份真正有用的家庭路线图，应当把目标、时间、责任、证据与专业边界放在一起。" />
      <section className="editorial-section ivory-section">
        <div className="method-list">
          {steps.map(([number, title, text]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}
        </div>
      </section>
      <section className="statement-section compact-statement">
        <p className="eyebrow">Planning Output</p>
        <h2>最终交付的不是一堆建议，<br />而是一张家庭能够持续使用的路线图。</h2>
        <p>路线图记录优先级、关键节点、责任方、所需资料、专业意见与复盘时间，让每一次决定都能够被理解和追踪。</p>
        <a className="button button-gold" href="/#contact">预约初步沟通</a>
      </section>
      <Si