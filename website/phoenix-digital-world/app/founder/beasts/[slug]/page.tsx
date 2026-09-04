import { ArrowLeft, ArrowRight, CircleCheck, ExternalLink, GitBranch, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { beastBySlug, beastConfigs } from "../beast-data";

export function generateStaticParams() {
  return beastConfigs.map((beast) => ({ slug: beast.slug }));
}

export default async function BeastWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const beast = beastBySlug[slug];
  if (!beast) notFound();

  const realWorkspace = beast.slug === "zhuque" ? {
    href: "https://zhuque-visual-studio.yvettfang.chatgpt.site",
    label: "打开朱雀视觉发布台",
    description: "已连接独立视觉发布台。进入后可生成、预览并下载 3:4 PNG 发布包。",
  } : null;

  const projects = beast.projects.length ? beast.projects : [
    { name: "空间配置等待 Visual Gate", role: "Unified Template", status: "WAITING" },
  ];
  const actions = beast.actions.length ? beast.actions : [
    { level: "P1", text: "确认使命、项目与输出字段", state: "等待 Founder" },
    { level: "P2", text: "完成同模板内容配置", state: "尚未开始" },
  ];
  const evidence = beast.evidence.length ? beast.evidence : [
    { title: "统一神兽空间模板", meta: "foundation · demo" },
  ];
  const handoffs = beast.handoffs.length ? beast.handoffs : [
    { from: "凤凰", to: beast.name, text: "等待下一阶段正式配置" },
  ];

  return (
    <main className="beast-workspace-page" style={{ "--beast-accent": beast.accent, "--beast-soft": beast.soft } as React.CSSProperties}>
      <aside className="beast-workspace-sidebar">
        <Link href="/fenghuang-xingtu" className="beast-back"><ArrowLeft />凤凰星图</Link>
        <div className="beast-side-title"><small>FOUNDER MODE</small><strong>神兽空间</strong><span>ONE TEMPLATE · EIGHT CONFIGS</span></div>
        <nav aria-label="八方神兽空间">
          {beastConfigs.map((item) => (
            <Link href={`/founder/beasts/${item.slug}`} className={item.slug === beast.slug ? "is-active" : ""} key={item.slug}>
              <i>{item.no}</i><span><strong>{item.name}</strong><small>{item.title}</small></span>{item.validated && <b>已验证</b>}
            </Link>
          ))}
        </nav>
        <div className="beast-side-note">当前使用 Mock Adapter 演示状态，不读取真实 Notion、GitHub、学生或经营数据。</div>
      </aside>

      <section className="beast-workspace-main">
        <header className="beast-identity">
          <div className="beast-glyph" aria-hidden="true"><span>{beast.name.slice(0, 1)}</span><i /><i /></div>
          <div className="beast-identity-copy">
            <p>NO.{beast.no} · {beast.en} · {beast.validated ? "TEMPLATE VERIFIED" : "FOUNDATION"}</p>
            <h1>{beast.name}</h1>
            <strong>{beast.title}</strong>
            <blockquote>{beast.motto}</blockquote>
          </div>
          <div className="beast-sync"><span>{beast.validated ? "UPDATED TODAY" : "WAITING CONFIG"}</span><small>source · mock adapter</small></div>
        </header>

        <section className="beast-mission">
          <div><small>CORE MISSION</small><h2>核心使命</h2></div><p>{beast.mission}</p>
        </section>

        <div className="beast-workspace-grid">
          <section className="beast-panel beast-projects">
            <header><div><small>GUARDED PROJECTS</small><h2>当前守护项目</h2></div><Sparkles /></header>
            <div>{projects.map((project) => <article key={project.name}><i /><div><strong>{project.name}</strong><span>{project.role}</span></div><b>{project.status}</b></article>)}</div>
          </section>

          <section className="beast-panel beast-actions">
            <header><div><small>TODAY ACTIONS</small><h2>今日处理事项</h2></div><span>{actions.length}</span></header>
            <div>{actions.map((action) => <article key={action.text}><b>{action.level}</b><div><strong>{action.text}</strong><span>{action.state}</span></div><CircleCheck /></article>)}</div>
          </section>
        </div>

        <div className="beast-workspace-grid beast-workspace-lower">
          <section className="beast-panel beast-evidence">
            <header><div><small>OUTPUTS & EVIDENCE</small><h2>最近产出与证据</h2></div><span>只读</span></header>
            <div>{evidence.map((item) => <article key={item.title}><CircleCheck /><div><strong>{item.title}</strong><span>{item.meta}</span></div><ArrowRight /></article>)}</div>
          </section>

          <section className="beast-panel beast-handoffs">
            <header><div><small>HANDOFF FLOW</small><h2>与其他神兽的交接</h2></div><GitBranch /></header>
            <div>{handoffs.map((item) => <article key={`${item.from}-${item.to}-${item.text}`}><b>{item.from}</b><ArrowRight /><b>{item.to}</b><span>{item.text}</span></article>)}</div>
          </section>
        </div>

        <section className="beast-agent-entry">
          <div>
            <small>REAL AGENT / WORKSPACE</small>
            <h2>{realWorkspace ? "进入真实工作台" : "工作台接口"}</h2>
            <p>{realWorkspace ? realWorkspace.description : "V0.1 保留接口位置。正式身份验证、访问审计与数据边界确认后再绑定。"}</p>
          </div>
          {realWorkspace ? (
            <a href={realWorkspace.href}>{realWorkspace.label}<ExternalLink /></a>
          ) : (
            <button type="button" disabled>接口待绑定<ExternalLink /></button>
          )}
        </section>
      </section>
    </main>
  );
}
