import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Identity Compass™",
  description: "用 Free 6题整理家庭身份目标、规划阶段与值得继续比较的方向。",
};

export default function IdentityLandingPage() {
  return (
    <>
      <main id="main-content">
        <section className="landing-hero identity-landing-hero">
          <div className="hero-glow hero-glow--one" />
          <div className="hero-glow hero-glow--two" />
          <header className="landing-header page-shell">
            <BrandLogo priority variant="light" />
            <span className="header-note">Identity Compass™ · Free</span>
          </header>
          <div className="hero-layout page-shell">
            <div className="hero-copy">
              <p className="eyebrow eyebrow--light">FREE IDENTITY SNAPSHOT</p>
              <h1>先看清家庭为什么出发</h1>
              <p className="hero-lede">回答 6 个轻量问题，获得家庭身份类型、规划阶段、两个潜在方向与一个关键洞察。</p>
              <Link className="primary-cta" href="/identity/assessment">
                开始 Free 6题 <span aria-hidden="true">→</span>
              </Link>
              <ul className="trust-row" role="list">
                <li>无需手机号</li>
                <li>不收集证件或资产证明</li>
                <li>不做政策资格判断</li>
              </ul>
            </div>
            <div aria-label="Identity Snapshot 内容预览" className="snapshot-preview">
              <div aria-hidden="true" className="preview-orbit"><span>I</span></div>
              <p className="preview-kicker">YOUR IDENTITY SNAPSHOT</p>
              <h2>家庭意图，<br />先于路径结论。</h2>
              <div className="preview-list">
                <div className="preview-row"><span>01</span><div><strong>Family Identity Type</strong><small>8 类家庭意图之一</small></div></div>
                <div className="preview-row"><span>02</span><div><strong>Planning Stage</strong><small>看清目前所处的规划阶段</small></div></div>
                <div className="preview-row"><span>03</span><div><strong>Potential Directions</strong><small>两个值得继续比较的方向</small></div></div>
              </div>
              <p className="preview-footnote">约 1 分钟 · 6 个问题 · 免费结果</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer"><div className="page-shell"><span>Phoenix Nova™</span><span>Knowledge First. · For Every Beginning.</span></div></footer>
    </>
  );
}
