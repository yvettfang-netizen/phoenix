import Link from "next/link";

/** The 13-day SQLite pilot was retired; do not silently fabricate a student,
 * task, evidence or session. Canonical authenticated services will be wired
 * through a separately reviewed server-side adapter. */
export default function CanonicalPending({ title }: { title: string }) {
  return <main className="grid" style={{ maxWidth: 760, margin: "3rem auto", padding: "1rem" }}>
    <h1>{title}</h1>
    <section className="askwise-card">
      <h2>Canonical PostgreSQL Integration Pending</h2>
      <p>原本地 SQLite 学习记录系统已退役。为了防止重复建立学生、任务或测评数据，
        此页面在接入受授权的 Canonical PostgreSQL 接口前暂停读写。</p>
      <p>学习模块及鳌鱼教学逻辑继续保留；没有经核验的服务端身份、学生授权和数据库接口，不会展示虚构进度。</p>
      <Link href="/">Return to ASKWISE</Link>
    </section>
  </main>;
}
