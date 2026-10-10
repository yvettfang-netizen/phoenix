import type { Metadata } from "next";
import { PageHero, SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = {
  title: "企业理念 | 智富家办",
  description: "了解智富家办 Wisdom · Wealth · Health 的企业理念与长期家庭规划方法。",
};

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <PageHero eyebrow="Our Philosophy" title="智慧，是方向；财富，是根基；健康，是长期价值的承载。" intro="智富家办相信，一个家庭真正的富足，不只是拥有多少财富，更在于能否作出正确选择、建立稳定根基，并拥有承载长期幸福的健康状态。" />
      <section className="editorial-section ivory-section">
        <div className="editorial-kicker">Wisdom · Wealth · Health</div>
        <div className="principle-grid">
          <article><span>01</span><h2>Wisdom｜智慧</h2><p>帮助家庭看清方向，在身份、教育、健康与财富等重要议题中，作出理性、长期且适合自身的判断。</p></article>
          <article><span>02</span><h2>Wealth｜财富</h2><p>财富不仅是资产积累，更是家庭抵御风险、支持成长、扩大人生选择和完成代际传承的基础。</p></article>
          <article><span>03</span><h2>Health｜健康</h2><p>身体健康、家庭安稳、资产稳健与生活品质，共同决定一个家庭能否拥有持续而丰盛的未来。</p></article>
        </div>
      </section>
      <section className="statement-section">
        <p className="eyebrow">Our Position</p>
        <h2>我们不从某一项产品开始，<br />而从家庭希望抵达的未来开始。</h2>
        <p>智富家办连接身份、教育、健康与财富，但不会替代需要持牌或专业资格的法律、税务、投资、保险及医疗意见。</p>
        <a className="text-link" href="/methodology">了解家庭规划方法 →</a>
      </section>
      <SiteFo