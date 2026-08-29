import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Command,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const decisions = [
  { level: "P0", title: "Education Compass 接口验收是否进入收口", owner: "Fiona", due: "今日 12:00" },
  { level: "P1", title: "本周 Founder Review 保留哪三项经营信号", owner: "Fiona", due: "今日 16:00" },
  { level: "P1", title: "NOVA DIGITAL 下一阶段只读数据接入顺序", owner: "Fiona", due: "待确认" },
];

const projects = [
  { name: "Education Compass × ASKWise", owner: "玄武 · 鳌鱼", status: "GATE", progress: 82, next: "接口联调与端到端证据" },
  { name: "Phoenix Nova Website V4.0", owner: "玄武 · 朱雀", status: "REVIEW", progress: 74, next: "视觉与 GEO Gate 收口" },
  { name: "Phoenix Family OS", owner: "麒麟 · 玄武", status: "PAUSED", progress: 58, next: "等待 Compass 数据结构冻结" },
  { name: "内容矩阵与分发", owner: "青鸾 · 白泽", status: "LIVE", progress: 67, next: "今日三账号供稿与核验" },
];

const beasts = [
  ["凤凰", "中枢", "统合中", "#c8a24a"], ["朱雀", "视觉", "1 项待审", "#bd7b72"], ["玄武", "工程", "P0 执行", "#6e8992"],
  ["白泽", "审核", "2 项核验", "#9c9181"], ["青鸾", "传播", "今日排期", "#7d9eaa"], ["鳌鱼", "学习", "Pilot Live", "#6e9a91"],
  ["麒麟", "教育", "3 个成长信号", "#b99c68"], ["貔貅", "财富", "等待判断", "#a78458"], ["青龙", "组织", "配置中", "#62a398"],
];

export default function FounderPhoenixPage() {
  return (
    <main className="phoenix-console-page">
      <aside className="phoenix-console-sidebar">
        <Link href="/fenghuang-xingtu" className="console-back"><ArrowLeft />凤凰星图</Link>
        <div className="console-brand"><small>PHOENIX NOVA</small><strong>凤凰中枢</strong><span>FOUNDER COMMAND</span></div>
        <nav aria-label="凤凰中枢模块">
          <a href="#priority" className="is-active"><Command />今日指挥</a>
          <a href="#decisions"><CircleDot />待我决定</a>
          <a href="#projects"><Clock3 />项目状态</a>
          <a href="#beasts"><Sparkles />九兽状态</a>
          <a href="#brief"><CheckCircle2 />日终复盘</a>
        </nav>
        <div className="console-demo"><span>DEVELOPMENT MOCK</span><p>当前仅使用演示数据，未连接 Notion、GitHub、Compass 或学生档案。</p></div>
        <Link href="/dongfang-qijing" className="console-guest">开启访客模式<ArrowRight /></Link>
      </aside>

      <section className="phoenix-console-main">
        <header className="console-header">
          <div><p>FRIDAY · FOUNDER VIEW</p><h1>今天，先完成最重要的一件事。</h1></div>
          <div className="console-founder"><small>FOUNDER</small><strong>FIONA｜鹤潼</strong><span>Mock data · updated today</span></div>
        </header>

        <section className="console-priority" id="priority">
          <div className="console-priority-copy">
            <span>今日唯一 P0</span>
            <h2>完成 Education Compass 与核心接口的端到端验收</h2>
            <p>从真实提交到结果页、CRM 写入与报告证据，形成可由 Founder 判断的完整闭环。</p>
          </div>
          <div className="console-priority-meta">
            <small>OWNER</small><strong>Jimson · 玄武</strong>
            <small>GATE</small><strong>今日 18:00</strong>
            <div><i><em /></i><span>82%</span></div>
          </div>
        </section>

        <div className="console-grid">
          <section className="console-panel console-decisions" id="decisions">
            <header><div><small>FOUNDER DECISIONS</small><h2>待我决定</h2></div><span>3</span></header>
            <div>
              {decisions.map((item) => (
                <article key={item.title}>
                  <b>{item.level}</b><div><strong>{item.title}</strong><span>{item.owner} · {item.due}</span></div><button type="button" aria-label={`查看决定：${item.title}`}><ArrowRight /></button>
                </article>
              ))}
            </div>
          </section>

          <section className="console-panel console-risks">
            <header><div><small>RISKS & BLOCKERS</small><h2>阻塞与截止</h2></div><AlertTriangle /></header>
            <ul>
              <li><b>接口证据</b><span>缺少移动端端到端录屏</span><em>今天</em></li>
              <li><b>GitHub 状态</b><span>Jimson 记录与远端分支不一致</span><em>核验中</em></li>
              <li><b>服务器</b><span>按计划后日再搭建</span><em>非今日 P0</em></li>
            </ul>
          </section>
        </div>

        <section className="console-panel console-projects" id="projects">
          <header><div><small>PROJECT TWINS · DEMO</small><h2>项目状态</h2></div><span>4 个进行中项目</span></header>
          <div className="console-project-table" role="table" aria-label="项目状态演示表">
            <div role="row" className="console-project-head"><span>项目</span><span>守护者</span><span>状态</span><span>进度</span><span>下一行动</span></div>
            {projects.map((project) => (
              <div role="row" className="console-project-row" key={project.name}>
                <strong>{project.name}</strong><span>{project.owner}</span><b data-status={project.status}>{project.status}</b>
                <div><i><em style={{ width: `${project.progress}%` }} /></i><small>{project.progress}%</small></div><span>{project.next}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="console-panel console-beasts" id="beasts">
          <header><div><small>BEAST TWINS · DEMO</small><h2>九兽状态</h2></div><Link href="/fenghuang-xingtu">查看凤凰星图<ArrowRight /></Link></header>
          <div>
            {beasts.map(([name, domain, status, color]) => (
              <article key={name} style={{ "--beast-color": color } as React.CSSProperties}>
                <i /><small>{domain}</small><strong>{name}</strong><span>{status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="console-brief" id="brief">
          <div><small>DAILY BRIEF · MOCK</small><h2>今日判断</h2></div>
          <p>资源继续集中在 Compass 与接口验收。开发站、Codex 共享配置和服务器搭建保留为后日备忘，不进入今日 P0。</p>
          <button type="button">进入日终复盘<ArrowRight /></button>
        </section>
      </section>
    </main>
  );
}
