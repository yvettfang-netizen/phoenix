import Link from "next/link";

const chapters = [
  { en: "NOTES", title: "鹤潼手记", line: "看见、记下，然后继续理解。" },
  { en: "RESEARCH", title: "研究与论文", line: "把一个问题追得更深。" },
  { en: "DECISIONS", title: "重要决定", line: "那些真正改变方向的时刻。" },
  { en: "SEEDS", title: "未展开的灵感", line: "尚未命名，却已经出现。" },
  { en: "HORIZON", title: "Root · Wing · Horizon", line: "从根出发，长出翅膀，走向远方。" },
];

export default function HongmengWorld() {
  return (
    <main className="hongmeng-page">
      <div className="hongmeng-distance-light" aria-hidden="true" />
      <div className="hongmeng-mist hongmeng-mist-one" aria-hidden="true" />
      <div className="hongmeng-mist hongmeng-mist-two" aria-hidden="true" />

      <header className="hongmeng-topbar">
        <Link href="/fenghuang-xingtu" className="hongmeng-back">返回凤凰星图</Link>
        <span>FIONA｜鹤潼 · PRIVATE INNER WORLD</span>
      </header>

      <section className="hongmeng-content" aria-labelledby="hongmeng-title">
        <header className="hongmeng-heading">
          <p>THIRD REALM · A WORLD BECOMING</p>
          <h1 id="hongmeng-title">鸿蒙世界</h1>
          <strong>鸿蒙初启，万象未名。</strong>
          <span>这里不是答案的仓库，而是思想仍在生长、方向仍在生成的地方。</span>
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
      </section>
    </main>
  );
}
