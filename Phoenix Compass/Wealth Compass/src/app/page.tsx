import Link from "next/link";

export default function Home() {
  return <main className="main"><p className="eyebrow">家庭财富健康与长期规划入口</p>
    <h1>看清家庭财富的方向，而不是追逐答案。</h1>
    <p className="lead">Wealth Compass™ 帮助家庭有序梳理教育资金、风险保障、现金流与长期目标。它不推荐具体金融产品，也不承诺收益。</p>
    <div className="actions"><Link className="button primary" href="/assessment">了解评测流程</Link><Link className="button" href="/consent">查看授权边界</Link></div>
    <section className="grid" aria-label="关注方向">
      <article className="card"><h3>从全局出发</h3><p>把分散的关注点放回家庭长期规划中理解。</p></article>
      <article className="card"><h3>保持克制</h3><p>只做方向梳理，不输出产品推荐或绝对化判断。</p></article>
      <article className="card"><h3>由你决定</h3><p>授权是独立步骤，未明确同意不会进入后续对接。</p></article>
    </section>
  </main>;
}
