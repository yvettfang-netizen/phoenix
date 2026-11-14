import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Coins, Globe2, GraduationCap, HeartPulse, Search, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "./v5-site";
import { articles, channelById, channels, faqs, phrase, policies, searchArticles, topics, type Article, type ChannelId, type ContentBlock, type InsightLocale } from "@/lib/insights-content";
import styles from "./insights-pages.module.css";

const label = (locale: InsightLocale, zh: string, en: string) => locale === "zh" ? zh : en;
const href = (locale: InsightLocale, path = "") => `/${locale}/insights${path}`;
const icons = { education: GraduationCap, identity: ShieldCheck, wealth: Coins, health: HeartPulse, perspectives: Globe2 };
const preview = (locale: InsightLocale) => label(locale, "编辑预览 · 尚未正式发布", "Editorial preview · Not published");
const checked = (locale: InsightLocale, date: string) => label(locale, `来源核验：${date}`, `Source checked: ${date}`);
const imageAlt = (locale: InsightLocale, channel: ChannelId) => label(locale, `${phrase(locale, channelById(channel)!.title)}专题配图`, `Illustration for ${phrase(locale, channelById(channel)!.title)}`);
const searchLink = (locale: InsightLocale, query: string) => href(locale, `?q=${encodeURIComponent(query)}#results`);
function Frame({ locale, children, localePath }: { locale: InsightLocale; children: React.ReactNode; localePath: string }) {
  return <div className={styles.site} lang={locale === "zh" ? "zh-Hans" : "en"}>
    <SiteHeader locale={locale} page="insights" localePath={localePath} />
    <main id="main-content">{children}</main>
    <SiteFooter locale={locale} compact />
  </div>;
}
function Kicker({ children }: { children: React.ReactNode }) { return <span className={styles.kicker}>{children}</span>; }
function SectionHeading({ title, eyebrow, link, action }: { title: string; eyebrow?: string; link?: string; action?: string }) {
  return <div className={styles.sectionHeading}><div>{eyebrow && <Kicker>{eyebrow}</Kicker>}<h2>{title}</h2></div>{link && <Link href={link} className={styles.textLink}>{action}<ArrowUpRight size={16} /></Link>}</div>;
}
function ArticleCard({ article, locale, featured = false }: { article: Article; locale: InsightLocale; featured?: boolean }) {
  const channel = channelById(article.channel)!;
  return <Link className={featured ? styles.featureCard : styles.articleCard} href={href(locale, `/articles/${article.slug}`)}>
    <div className={styles.cardImage}><Image unoptimized src={article.image} alt={imageAlt(locale, article.channel)} width={800} height={540} sizes={featured ? "(max-width: 700px) 100vw, 58vw" : "(max-width: 700px) 34vw, 230px"} /></div>
    <div className={styles.cardCopy}><span className={styles.pill}>{phrase(locale, channel.title)}</span><h3>{phrase(locale, article.title)}</h3><p>{phrase(locale, article.summary)}</p><small>{preview(locale)} <ArrowUpRight size={14} /></small></div>
  </Link>;
}
function ChannelNav({ locale, active }: { locale: InsightLocale; active?: ChannelId }) {
  return <nav className={styles.channelNav} aria-label={label(locale, "洞察频道", "Insight channels")}>{channels.map(c => {
    const Icon = icons[c.id];
    return <Link key={c.id} className={active === c.id ? styles.channelActive : ""} href={href(locale, `/${c.id}`)}><Icon size={28} strokeWidth={1.6} /><strong>{phrase(locale, c.title)}</strong><span>{phrase(locale, c.subtitle)}</span></Link>;
  })}</nav>;
}
function PolicyStrip({ locale, channel }: { locale: InsightLocale; channel?: ChannelId }) {
  const rows = policies.filter(p => !channel || p.channel === channel);
  return <section className={styles.section} id="policy-tracker"><SectionHeading title={label(locale, "政策追踪中心", "Policy intelligence")} eyebrow="POLICY INTELLIGENCE" link={href(locale, "#policy-tracker")} action={label(locale, "查看官方来源", "Official sources")} />
    <p className={styles.sectionLead}>{label(locale, "政策状态由编辑记录，不能根据文章日期自动推断。正式发布前须再次核验。", "Policy status is editorially recorded, never inferred from article dates. Recheck before public release.")}</p>
    <div className={styles.policyGrid}>{rows.map(p => <article key={p.channel} className={styles.policyItem}><span className={styles.miniLabel}>{phrase(locale, channelById(p.channel)!.title)} · {locale === "zh" ? p.status : p.status === "已生效" ? "In effect" : "Published"}</span><h3>{phrase(locale, p.title)}</h3><p>{phrase(locale, p.analysis)}</p><dl><div><dt>{label(locale, "发布机构", "Authority")}</dt><dd>{phrase(locale, p.authority)}</dd></div><div><dt>{label(locale, "发布日期", "Issued")}</dt><dd>{p.source.publishedAt ?? label(locale, "未注明", "Not stated")}</dd></div><div><dt>{label(locale, "生效时间", "Effective")}</dt><dd>{phrase(locale, p.effectiveLabel)}</dd></div><div><dt>{label(locale, "最后核验", "Last checked")}</dt><dd>{p.source.checkedAt}</dd></div></dl><a href={p.source.url} target="_blank" rel="noopener noreferrer">{label(locale, "查看官方资料", "Official reference")} <ArrowUpRight size={15} /></a></article>)}</div>
  </section>;
}
function TopicGrid({ locale }: { locale: InsightLocale }) {
  return <section className={styles.section} id="topics"><SectionHeading title={label(locale, "深度专题研究", "Research themes")} eyebrow="DEEP DIVE" />
    <div className={styles.topicGrid}>{topics.map(t => <Link key={t.slug} href={href(locale, `/topics/${t.slug}`)} className={styles.topicCard}><Image unoptimized src={t.image} width={480} height={320} alt={phrase(locale, t.title)} sizes="(max-width: 700px) 45vw, 25vw" /><span>{phrase(locale, t.title)} <ArrowUpRight size={16} /></span></Link>)}</div>
  </section>;
}
function FAQ({ locale, channel }: { locale: InsightLocale; channel?: ChannelId }) {
  const rows = faqs.filter(f => !channel || f.channel === channel);
  return <section className={styles.section} id="family-knowledge"><SectionHeading title={label(locale, "家庭决策知识库", "Family decision library")} eyebrow="FAMILY KNOWLEDGE" />
    <div className={styles.faqGrid}>{rows.map(f => <details key={f.question.en}><summary>{phrase(locale, f.question)}</summary><p>{phrase(locale, f.answer)}</p></details>)}</div>
  </section>;
}
function Conversion({ locale }: { locale: InsightLocale }) {
  return <section className={styles.conversion}><div><Kicker>FOR EVERY BEGINNING</Kicker><h2>{label(locale, "让洞察成为家庭规划的起点。", "Let insight become the start of family planning.")}</h2><p>{label(locale, "从知识出发，自主选择下一步。资讯内容不自动传送评估答案或个人资料。", "Start with knowledge and choose your next step. Reading does not transfer assessment answers or personal information.")}</p></div><div className={styles.conversionLinks}>{(["education", "identity", "wealth", "health"] as const).map(id => <Link key={id} href={`/${locale}/${id}`}>{phrase(locale, channelById(id)!.title)} <ArrowUpRight size={16}/></Link>)}</div></section>;
}
export function InsightsHome({ locale, query = "" }: { locale: InsightLocale; query?: string }) {
  const result = searchArticles({ query, pageSize: 20 });
  const featured = articles.find(a => a.featured)!;
  const side = articles.filter(a => a !== featured).slice(0, 3);
  return <Frame locale={locale} localePath="/insights">
    <section className={styles.hero}><div className={styles.heroInner}><Kicker>PHOENIX INSIGHTS · GEO</Kicker><h1>{label(locale, "凤启洞察", "Phoenix Insights")}</h1><p className={styles.heroEnglish}>{label(locale, "Phoenix Insights", "Global Perspectives · Policy Intelligence · Family Growth")}</p><p className={styles.heroTagline}>{label(locale, "全球视野 · 政策动态 · 深度解读", "Global perspectives · Policy intelligence · Deeper understanding")}</p><p className={styles.heroBody}>{label(locale, "聚焦教育、身份、财富与健康，以官方资料为依据，帮助家庭看清长期规划中的重要变化。", "Explore education, identity, wealth and health through primary sources and thoughtful family planning context.")}</p></div></section>
    <div className={styles.container}>
      <form className={styles.searchBox} action={href(locale)} method="get" role="search"><Search size={23} aria-hidden="true"/><input name="q" defaultValue={query} aria-label={label(locale, "搜索洞察内容", "Search insights")} placeholder={label(locale, "搜索政策、院校、身份、医疗等…", "Search policy, education, identity, healthcare…")} /><button type="submit">{label(locale, "搜索", "Search")}</button></form>
      <div className={styles.popular}><span>{label(locale, "热门关注：", "Explore:")}</span>{(locale === "zh" ? ["香港升学", "JUPAS", "身份政策", "保障规划", "医疗费用"] : ["Hong Kong", "JUPAS", "Identity", "Protection", "Healthcare"]).map(q => <Link key={q} href={searchLink(locale, q)}>{q}</Link>)}</div>
      <ChannelNav locale={locale}/>
      {query ? <section className={styles.section} id="results"><SectionHeading title={label(locale, `搜索结果：${query}`, `Results for “${query}”`)} eyebrow={`${result.total} ${label(locale, "篇编辑预览", "editorial previews")}`}/><div className={styles.list}>{result.items.length ? result.items.map(a => <ArticleCard article={a} locale={locale} key={a.slug}/>) : <p>{label(locale, "暂无匹配内容。请尝试其他关键词。", "No matching content. Try another keyword.")}</p>}</div></section> : null}
      <section className={styles.section}><SectionHeading title={label(locale, "今日洞察 · 精选解读", "Featured insights")} eyebrow="EDITOR'S SELECTION" link={href(locale, "/education")} action={label(locale, "查看全部文章", "Browse articles")}/><div className={styles.featureGrid}><ArticleCard article={featured} locale={locale} featured/><div className={styles.sideCards}>{side.map(a => <ArticleCard key={a.slug} article={a} locale={locale}/>)}</div></div></section>
      <PolicyStrip locale={locale}/>
      <TopicGrid locale={locale}/>
      <FAQ locale={locale}/>
      <aside className={styles.legacyNote}><strong>{label(locale, "《维港之上》", "Above Victoria Harbour")}</strong><p>{label(locale, "原有连载仍保留在凤启洞察的编辑规划中；尚未形成可公开的文章正文与审核记录。", "The original serial remains in Phoenix Insights' editorial plan; no reviewed public article is available yet.")}</p></aside>
      <Conversion locale={locale}/>
    </div>
  </Frame>;
}
const channelTags: Partial<Record<ChannelId, string[]>> = {
  education: ["本科申请", "研究生申请", "本地生", "非联招", "DSE", "IB", "A-Level", "国际升学", "院校动态", "招生政策", "专题研究"],
  identity: ["身份政策"], wealth: ["保障规划"], health: ["医疗费用"], perspectives: ["全球视野"],
};
export function InsightsChannel({ locale, channel, tag = "", page = 1 }: { locale: InsightLocale; channel: ChannelId; tag?: string; page?: number }) {
  const c = channelById(channel)!;
  const chosen = tag === "all" ? "" : tag;
  const result = searchArticles({ channel, tag: chosen, page, pageSize: 4 });
  const tags = channelTags[channel] ?? [];
  const tagHref = (t: string, n = 1) => href(locale, `/${channel}?${new URLSearchParams({ ...(t ? { tag: t } : {}), ...(n > 1 ? { page: String(n) } : {}) }).toString()}`);
  return <Frame locale={locale} localePath={`/insights/${channel}`}>
    <section className={styles.channelHero}><div className={styles.channelHeroImage} style={{ backgroundImage: `url("${c.image}")` }} /><div className={styles.channelHeroCopy}><Kicker>PHOENIX INSIGHTS / {channel.toUpperCase()}</Kicker><h1>{phrase(locale, c.title)}</h1><p className={styles.heroEnglish}>{phrase(locale, c.subtitle)}</p><p>{phrase(locale, c.description)}</p></div></section>
    <div className={styles.container}><nav className={styles.breadcrumb} aria-label={label(locale, "面包屑", "Breadcrumb")}><Link href={href(locale)}>{label(locale, "凤启洞察", "Insights")}</Link><span>/</span><span aria-current="page">{phrase(locale, c.title)}</span></nav>
    <div className={styles.filterBar} aria-label={label(locale, "分类筛选", "Category filters")}><Link className={!chosen ? styles.filterActive : ""} href={tagHref("")}>{label(locale, "全部", "All")}</Link>{tags.map(t => { const english = articles.flatMap(a => a.tags).find(x => x.zh === t)?.en ?? ({ 本地生: "Local applicants", 国际升学: "International study" } as Record<string,string>)[t] ?? t; return <Link key={t} className={chosen === t || chosen === english ? styles.filterActive : ""} href={tagHref(locale === "zh" ? t : english)}>{locale === "zh" ? t : english}</Link>; })}</div>
    <section className={styles.section} id="latest"><SectionHeading title={label(locale, "最新文章", "Latest articles")} eyebrow={`${result.total} ${label(locale, "篇编辑预览", "editorial previews")}`}/><div className={styles.list}>{result.items.length ? result.items.map(a => <ArticleCard key={a.slug} article={a} locale={locale}/>) : <div className={styles.empty}>{label(locale, "此分类暂无经过来源核对的内容。", "No source-checked preview in this category yet.")}</div>}</div>
      {result.pages > 1 && <nav className={styles.pagination} aria-label={label(locale, "分页", "Pagination")}>{Array.from({ length: result.pages }, (_, i) => <Link key={i} className={result.page === i + 1 ? styles.pageActive : ""} aria-current={result.page === i + 1 ? "page" : undefined} href={tagHref(chosen, i + 1)}>{i + 1}</Link>)}</nav>}
    </section>
    <PolicyStrip locale={locale} channel={channel}/>
    <div className={styles.channelExtras}><TopicGrid locale={locale}/><FAQ locale={locale} channel={channel}/></div>
    <Conversion locale={locale}/></div>
  </Frame>;
}
export function InsightsTopic({ locale, slug }: { locale: InsightLocale; slug: string }) {
  const topic = topics.find(t => t.slug === slug)!;
  const matching = articles.filter(a => a.topic === slug);
  return <Frame locale={locale} localePath={`/insights/topics/${slug}`}><section className={styles.channelHero}><div className={styles.channelHeroImage} style={{ backgroundImage: `url("${topic.image}")` }} /><div className={styles.channelHeroCopy}><Kicker>RESEARCH SERIES</Kicker><h1>{phrase(locale, topic.title)}</h1><p>{label(locale, "围绕官方来源持续整理的家庭决策专题。", "A continuing family decision series grounded in official sources.")}</p></div></section><div className={styles.container}><nav className={styles.breadcrumb}><Link href={href(locale)}>{label(locale, "凤启洞察", "Insights")}</Link><span>/</span><span>{phrase(locale, topic.title)}</span></nav><div className={styles.list}>{matching.map(a => <ArticleCard key={a.slug} article={a} locale={locale}/>)}</div><Conversion locale={locale}/></div></Frame>;
}
function ArticleBlocks({ blocks, locale }: { blocks: ContentBlock[]; locale: InsightLocale }) {
  return <section className={styles.contentBlocks} aria-label={label(locale, "延伸阅读", "Further reading")}>{blocks.map((block, index) => {
    switch (block.kind) {
      case "heading": return <h3 key={index}>{phrase(locale, block.text)}</h3>;
      case "paragraph": return <p key={index}>{phrase(locale, block.text)}</p>;
      case "quote": return <blockquote key={index}>{phrase(locale, block.text)}</blockquote>;
      case "list": return <ul key={index}>{block.items.map(item => <li key={item.en}>{phrase(locale, item)}</li>)}</ul>;
      case "table": return <div className={styles.tableScroll} key={index}><table><thead><tr>{block.headers.map(h => <th key={h.en} scope="col">{phrase(locale, h)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map(cell => <td key={cell.en}>{phrase(locale, cell)}</td>)}</tr>)}</tbody></table></div>;
      case "image": return <figure key={index}><Image unoptimized src={block.src} alt={phrase(locale, block.alt)} width={900} height={520} sizes="(max-width: 700px) 100vw, 800px"/><figcaption>{phrase(locale, block.alt)}</figcaption></figure>;
      case "link": return <p key={index}><a href={block.url} target="_blank" rel="noopener noreferrer">{phrase(locale, block.label)} <ArrowUpRight size={16}/></a></p>;
    }
  })}</section>;
}
export function InsightsArticle({ locale, article }: { locale: InsightLocale; article: Article }) {
  const c = channelById(article.channel)!;
  const related = articles.filter(a => a.slug !== article.slug && (a.channel === article.channel || a.related.includes(article.channel))).slice(0, 3);
  const relatedFaq = faqs.find(f => f.channel === article.channel);
  const titles = [label(locale, "发生了什么？", "What do official sources say?"), label(locale, "凤启专业解读", "Phoenix analysis"), label(locale, "对家庭的规划建议", "A family planning checklist")];
  return <Frame locale={locale} localePath={`/insights/articles/${article.slug}`}><div className={styles.container}>
    <nav className={styles.breadcrumb} aria-label={label(locale, "面包屑", "Breadcrumb")}><Link href={href(locale)}>{label(locale, "凤启洞察", "Insights")}</Link><span>/</span><Link href={href(locale, `/${article.channel}`)}>{phrase(locale, c.title)}</Link><span>/</span><span aria-current="page">{phrase(locale, article.title)}</span></nav>
    <header className={styles.articleHeader}><span className={styles.pill}>{phrase(locale, c.title)}</span><span className={styles.previewStamp}>{preview(locale)}</span><h1>{phrase(locale, article.title)}</h1><p>{phrase(locale, article.summary)}</p><div className={styles.articleMeta}><span>{phrase(locale, article.author)}</span><span>{label(locale, "审核：待专业审核", "Review: pending specialist review")}</span><span>{checked(locale, article.source.checkedAt)}</span><span>{label(locale, "约 4 分钟阅读", "About 4 min read")}</span></div></header>
    <div className={styles.articleCover}><Image unoptimized src={article.image} width={1400} height={760} sizes="(max-width: 900px) 100vw, 1100px" alt={imageAlt(locale, article.channel)}/></div>
    <div className={styles.articleLayout}><article className={styles.prose}>
      <section className={styles.keyPoints}><Kicker>IN BRIEF</Kicker><h2>{label(locale, "核心观点", "Key takeaways")}</h2><ul>{article.keyPoints.map(x => <li key={x.en}>{phrase(locale, x)}</li>)}</ul></section>
      <section id="official-facts"><span className={styles.sectionNumber}>01 / {label(locale, "官方资料", "OFFICIAL SOURCE")}</span><h2>{titles[0]}</h2>{article.facts.map(x => <p key={x.en}>{phrase(locale, x)}</p>)}<p className={styles.factNote}>{label(locale, "以下事实归属于所列官方来源；最终以该机构的现行网页为准。", "These statements are attributed to the official source below. Check the authority’s current page before acting.")}</p></section>
      <section id="analysis"><span className={styles.sectionNumber}>02 / {label(locale, "编辑解读", "EDITORIAL ANALYSIS")}</span><h2>{titles[1]}</h2>{article.analysis.map(x => <p key={x.en}>{phrase(locale, x)}</p>)}</section>
      <section id="family-actions"><span className={styles.sectionNumber}>03 / {label(locale, "家庭行动", "FAMILY ACTIONS")}</span><h2>{titles[2]}</h2><ol>{article.actions.map(x => <li key={x.en}>{phrase(locale, x)}</li>)}</ol></section>
      {article.contentBlocks && <ArticleBlocks blocks={article.contentBlocks} locale={locale}/>}
      <section className={styles.sourcePanel} id="sources"><h2>{label(locale, "官方参考来源", "Official reference")}</h2><a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.name} <ArrowUpRight size={16}/></a><dl><div><dt>{label(locale, "来源发布", "Source date")}</dt><dd>{article.source.publishedAt ?? label(locale, "来源未注明", "Not stated by source")}</dd></div><div><dt>{label(locale, "最后核验", "Last checked")}</dt><dd>{article.source.checkedAt}</dd></div></dl></section>
      {relatedFaq && <section className={styles.articleFaq}><h2>FAQ</h2><details><summary>{phrase(locale, relatedFaq.question)}</summary><p>{phrase(locale, relatedFaq.answer)}</p></details></section>}
    </article><aside className={styles.toc}><Kicker>ON THIS PAGE</Kicker>{titles.map((t, i) => <a href={["#official-facts", "#analysis", "#family-actions"][i]} key={t}>{String(i + 1).padStart(2, "0")} {t}</a>)}<a href="#sources">{label(locale, "官方参考来源", "Official reference")}</a><div className={styles.tocNote}><BookOpen size={24}/><p>{label(locale, "内容供方向理解，不构成录取、身份、医疗、法律、保险或投资建议。", "For orientation only; not admissions, immigration, medical, legal, insurance or investment advice.")}</p></div></aside></div>
    <section className={styles.section}><SectionHeading title={label(locale, "相关阅读", "Related reading")} eyebrow="CONTINUE READING"/><div className={styles.relatedGrid}>{related.map(a => <ArticleCard key={a.slug} article={a} locale={locale}/>)}</div></section>
    <Conversion locale={locale}/>
  </div></Frame>;
}
