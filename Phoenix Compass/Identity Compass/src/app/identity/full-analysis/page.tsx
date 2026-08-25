import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "完整身份分析",
  description: "Phoenix Identity Compass™ 完整身份分析的 Sprint 1 接续边界。",
};

export default function FullIdentityAnalysisPlaceholderPage() {
  return (
    <main className="result-page" id="main-content">
      <header className="flow-header page-shell"><BrandLogo priority /><span className="result-status">Next Sprint</span></header>
      <section className="empty-result page-shell identity-full-placeholder">
        <span className="step-number">→</span>
        <h1>Free Snapshot 已完成</h1>
        <p>完整动态测评属于下一 Sprint。本页只确认接续路径，不运行 CIES、TTPS、QMAS、Study 或其他政策资格引擎。</p>
        <Link className="continue-button" href="/identity/result">返回 Free Identity Snapshot</Link>
      </section>
    </main>
  );
}
