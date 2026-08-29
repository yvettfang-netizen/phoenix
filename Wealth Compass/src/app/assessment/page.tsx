import { PageShell } from "@/components/wealth-compass/page-shell";
import { RulesStatus } from "@/components/wealth-compass/rules-status";

export default function AssessmentPage() {
  return <PageShell eyebrow="Assessment · 评测" title="先理解过程，再开始回答。" nextHref="/consent" nextLabel="继续了解授权">
    <p className="lead">正式题库载入后，这里将逐步呈现家庭财富关注问题，并允许随时暂停。当前不会采集或保存回答。</p>
    <ol className="steps"><li><span className="step">1</span>了解家庭当前关注方向</li><li><span className="step">2</span>独立确认资料使用授权</li><li><span className="step">3</span>依据正式规则生成固定模板报告</li></ol><RulesStatus />
  </PageShell>;
}
