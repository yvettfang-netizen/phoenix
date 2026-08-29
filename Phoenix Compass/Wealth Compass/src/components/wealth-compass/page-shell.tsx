import Link from "next/link";

export function PageShell({ eyebrow, title, children, nextHref, nextLabel }: {
  eyebrow: string; title: string; children: React.ReactNode; nextHref?: string; nextLabel?: string;
}) {
  return <main className="main"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}
    {nextHref && <div className="actions"><Link className="button primary" href={nextHref}>{nextLabel}</Link><Link className="button" href="/">返回首页</Link></div>}
  </main>;
}
