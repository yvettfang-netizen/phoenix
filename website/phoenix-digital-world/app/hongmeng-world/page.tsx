import Link from "next/link";

const chapters = [
  { en: "ORIGIN", title: "创立初心", line: "从家庭、教育与文明出发，凤启为何开始。" },
  { en: "CULTURE", title: "凤启文化", line: "价值观、做事原则，以及员工理解凤启的第一入口。" },
  { en: "PHOENIX · SPIRITS", title: "凤凰与仙灵", line: "凤凰为何成象，仙灵为何各守一方。" },
  { en: "WORLDVIEW", title: "东方世界观", line: "从东方文明理解家庭、秩序、成长与未来。" },
  { en: "STORIES · BOOKS", title: "故事与书", line: "创始、文明与凤凰的长篇叙事。" },
  { en: "SEEDS", title: "思想种子", line: "尚未命名，却值得被长期保留下来。" },
];

export default function HongmengWorld() {
  return (
    <main className="hongmeng-page">
      <div className="hongmeng-distance-light" aria-hidden="true" />
      <div className="hongmeng-mist hongmeng-mist-one" aria-hidden="true" />
      <div className="hongmeng-mist hongmeng-mist-two" aria-hidden="true" />

      <header className="hongmeng-topbar">
        <Link href="/fenghuang-xingtu" className="hongmeng-back">返回凤凰星图</Link>
        <span>PHOENIX NOVA · SOURCE WORLD</span>
      </header>

      <section className="hongmeng-content" aria-labelledby="hongmeng-title">
        <header className="hongmeng-heading">
          <p>THIRD REALM · SOURCE OF PHOENIX NOVA</p>
          <h1 id="hongmeng-title">鸿蒙世界</h1>
          <strong>鸿蒙初启，万象未名。</strong>
          <span>这里保存凤启的源头：创立初心、企业文化、凤凰与仙灵的起源、东方世界观，以及可以慢慢写成故事与书的思想。</span>
          <small className="hongmeng-scope-note">长期源头内容 · 低频更新 · 不承载资讯、热点、促销或项目管理</small>
        </header>

        <div className="hongmeng-timeline" aria-label="鸿蒙世界思想时间线">
          <div className="hongmeng-thread" aria-hidden="true" />
          {chapters.map((chapter, index) => (
            <article className={`hongmeng-chapter hongmeng-chapter-${index + 1}`} key={chapter.en}>
              <i aria-hidden="true" />
              <small>{chapter.en}</small>
              <h2>{chapter.title}</h2>
              <p>{chapter.line}</p>
            </article>
          ))}
        </div>

        <blockquote className="hongmeng-mantra">
          <span>ROOT</span><i /><span>WING</span><i /><span>HORIZON</span>
        </blockquote>
        <p className="hongmeng-boundary">鸿蒙为源 · 凤凰为象 · 星图为路 · 仙灵为伴</p>
      </section>
    </main>
  );
}
