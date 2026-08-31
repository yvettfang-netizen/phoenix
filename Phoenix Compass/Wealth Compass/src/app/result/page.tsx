import { PageShell } from "@/components/wealth-compass/page-shell";
import { RulesStatus } from "@/components/wealth-compass/rules-status";

export default function ResultPage() {
  return <PageShell eyebrow="Result · 结果" title="正式规则就绪后，方向才会在这里呈现。" nextHref="/report/demo" nextLabel="查看报告页骨架"><p className="lead">系统当前主动阻止评分和 Persona 生成，测试规则也不能进入客户结果。</p><RulesStatus /></PageShell>;
}
