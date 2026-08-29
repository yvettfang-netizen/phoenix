import { PageShell } from "@/components/wealth-compass/page-shell";
import { RulesStatus } from "@/components/wealth-compass/rules-status";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageShell eyebrow="Report · 家庭财富方向报告" title="一份等待正式规则的报告框架。"><p className="lead">报告编号：{id}</p><RulesStatus /><section className="grid"><article className="card"><h3>家庭关注方向</h3><p>等待正式规则。</p></article><article className="card"><h3>值得进一步梳理</h3><p>等待正式规则。</p></article><article className="card"><h3>可讨论的下一步</h3><p>等待正式规则。</p></article></section></PageShell>;
}
