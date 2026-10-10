import type { Metadata } from "next";
import { PageHero, SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = { title: "专业边界 | 智富家办", description: "智富家办的专业协同、内容审核与合规边界。" };

export default function StandardsPage() {
  return (
    <main>
      <SiteHeader />
      <PageHero eyebrow="Professional Standard" title="长期信任，建立在清晰边界之上。" intro="我们负责理解家庭、组织问题和协调路线；需要专业资格的判断与执行，由相应专业机构独立完成。" />
      <section className="editorial-section ivory-section">
        <div className="boundary-grid">
          <article><h2>我们负责</h2><ul><li>家庭目标与问题诊断</li><li>跨领域时间线与优先级</li><li>资料框架与进度协调</li><li>专业机构转介与持续复盘</li></ul></article>
          <article><h2>专业机构负责</h2><ul><li>法律与入境意见</li><li>税务与公司合规意见</li><li>投资、保险及基金产品意见</li><li>医疗诊断、治疗及健康建议</li></ul></article>
          <article><h2>我们不承诺</h2><ul><li>审批或续签结果</li><li>投资回报或固定收益</li><li>无法由真实证据支持的结论</li><li>以单一产品替代家庭整体判断</li></ul></article>
        </div>
      </section>
      <SiteFooter />
 