import { PageShell } from "@/components/wealth-compass/page-shell";

export default function ConsentPage() {
  return <PageShell eyebrow="Consent · 客户授权" title="你的资料，由你决定如何使用。" nextHref="/result" nextLabel="查看结果页骨架">
    <p className="lead">评测与对接授权相互独立。只有在明确同意后，最小必要信息才可进入 Mock CRM 流程；本基础版本不连接真实 CRM、飞书或生产数据库。</p>
    <section className="card"><h3>授权边界</h3><p>不处理 D3 高敏数据；不自动发送报告；不自动报价、付款或签约；可随时停止后续流程。</p></section>
  </PageShell>;
}
