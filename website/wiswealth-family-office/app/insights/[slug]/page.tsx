import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedInsights, servicePages } from "../../content";
import { SiteFooter, SiteHeader } from "../../site-shell";

export function generateStaticParams() { return publishedInsights.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = publishedInsights.find((item) => item.slug === slug);
  return article ? { title: `${article.title} | 智富洞察`, description: article.summary } : {};
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = publishedInsights.find((item) => item.slug === slug);
  if (!article) notFound();
  const service = servicePages.find((item) => item.slug === article.relatedService);
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.summary, dateModified: article.lastVerified, author: { "@type": "Organization", name: "WisWealth Family Office Limited" }, publisher: { "@type": "Organization", name: "WisWealth Family Office Limited" } };

  return (
    <main>
      <SiteHeader />
      <article className="article-page">
        <header><p className="eyebrow">{article.pillar}</p><h1>{article.title}</h1><p>{article.summary}</p><div><span>最后核验：{article.lastVerified}</span><span>审核：{article.reviewedBy}</span></div></header>
        <section className="answer-box"><span>Direct Answer</span><p>{article.directAnswer}</p></section>
        <div className="article-body">
          {article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
          <section><h2>常见问题</h2>{article.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
          <aside><span>内容治理</span><p>内容来源：{article.sourceBrand}</p><p>使用方式：{article.reuseMode === "brand-adapted" ? "Phoenix 母内容经智富品牌适配" : "WisWealth 原创内容"}</p><p>本文仅供一般信息及规划沟通，不构成投资、法律、税务、移民、保险或医疗意见。</p></aside>
          {service && <a className="article-cta" href={`/services/${service.slug}`}><span>Related Service</span><strong>{service.title}</strong><small>了解智富的规划范围 →</small></a>}
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      