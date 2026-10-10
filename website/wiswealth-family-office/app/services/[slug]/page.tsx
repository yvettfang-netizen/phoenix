import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedInsights, servicePages } from "../../content";
import { PageHero, SiteFooter, SiteHeader } from "../../site-shell";

export function generateStaticParams() { return servicePages.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = servicePages.find((item) => item.slug === slug);
  return service ? { title: `${service.title} | 智富家办`, description: service.intro } : {};
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = servicePages.find((item) => item.slug === slug);
  if (!service) notFound();
  const related = publishedInsights.filter((article) => article.relatedService === service.slug);

  return (
    <main>
      <SiteHeader />
      <PageHero eyebrow={service.eyebrow} title={service.title} intro={service.intro} />
      <section className="editorial-section ivory-section service-detail-grid">
        <div><p className="editorial-kicker">Who We Help</p><h2>适合哪些家庭</h2><ul>{service.audience.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><p className="editorial-kicker">Key Questions</p><h2>首先需要回答的问题</h2><ol>{service.questions.map((item) => <li key={item}>{item}</li>)}</ol></div>
      </section>
      <section className="dark-detail-section">
        <div><p className="eyebrow">Planning Scope</p><h2>智富的规划范围</h2></div>
        <div className="scope-list">{service.scope.map((item, index) => <p key={item}><span>0{index + 1}</span>{item}</p>)}</div>
      </section>
      <section className="boundary-note"><span>Professional Boundary</span><p>{service.boundary}</p><a href="/standards">查看完整专业边界 →</a></section>
      {related.length > 0 && <section className="related-insights"><p className="editorial-kicker">Related Insights</p><h2>相关洞察</h2><div className="insight-grid">{related.map((article) => <a href={`/insights/${article.slug}`} key={article.slug}><span>{article.pillar}</span><h3>{article.title}</h3><p>{article.summary}</p></a>)}</div></section>}
      <SiteFooter />
    </main>
  );
}
