import type { Metadata } from "next";
import { publishedInsights } from "../content";
import { PageHero, SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = { title: "智富洞察 | WisWealth", description: "围绕身份、教育、健康、财富与家庭长期规划的智富洞察。" };

export default function InsightsPage() {
  return (
    <main>
      <SiteHeader />
      <PageHero eyebrow="WisWealth Insights" title="把复杂问题，转化为可以判断的长期选择。" intro="智富洞察连接 Phoenix Nova™ 共享知识源与智富家办专业视角；只有完成来源、品牌与边界审核的内容才会公开。" />
      <section className="insights-section ivory-section">
        <div className="source-strip"><span>Knowledge Source</span><p>Phoenix Insights & GEO Content Hub＋WisWealth 专业方法论</p><small>Published only · Brand adapted · Boundary reviewed</small></div>
        <div className="insight-grid">
          {publishedInsights.map((article) => <a href={`/insights/${article.slug}`} key={article.slug}><span>{article.pillar}</span><h2>{article.title}</h2><p>{article.summary}</p><small>最后核验：{article.lastVerified}</small></a>)}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
