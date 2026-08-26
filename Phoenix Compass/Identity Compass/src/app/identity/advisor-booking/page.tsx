import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "预约身份顾问解读",
  description: "预约 Phoenix Identity Compass™ 顾问人工解读。",
};

export default function IdentityAdvisorBookingPage() {
  const bookingUrl = process.env.NEXT_PUBLIC_IDENTITY_ADVISOR_BOOKING_URL;

  return (
    <main className="result-page" id="main-content">
      <header className="flow-header page-shell">
        <BrandLogo priority />
        <span className="result-status">Advisor Booking</span>
      </header>
      <section className="empty-result page-shell advisor-booking-page">
        <span className="step-number">→</span>
        <h1>预约顾问人工解读</h1>
        <p>顾问解读用于核对资料、官方来源、缺口与家庭时间线，不提供获批概率、法律结论或保证，也不会自动申请或递交。</p>
        {bookingUrl ? (
          <a className="continue-button" href={bookingUrl} rel="noreferrer" target="_blank">打开预约日历</a>
        ) : (
          <div className="booking-unavailable" role="status">
            <strong>预约入口待配置</strong>
            <span>流程与页面已就绪；连接正式日历后即可开放预约。</span>
          </div>
        )}
        <Link className="restart-link" href="/identity/full-report">返回免费完整报告</Link>
      </section>
    </main>
  );
}
