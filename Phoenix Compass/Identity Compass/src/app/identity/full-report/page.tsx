import type { Metadata } from "next";

import { IdentityFullReportExperience } from "@/components/identity-full-report-experience";

export const metadata: Metadata = {
  title: "免费完整身份报告",
  description: "Phoenix Identity Compass™ 免费完整报告：路径适配性、关键缺口、时间线与下一步。",
};

export default function IdentityFullReportPage() {
  return <IdentityFullReportExperience />;
}
