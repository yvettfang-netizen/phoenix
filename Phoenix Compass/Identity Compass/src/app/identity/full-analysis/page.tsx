import type { Metadata } from "next";
import { IdentityFullAnalysisExperience } from "@/components/identity-full-analysis-experience";

export const metadata: Metadata = {
  title: "免费动态身份分析",
  description: "按候选路径补齐必要事实，并生成 Phoenix Identity Compass™ 免费完整报告。",
};

export default function FullIdentityAnalysisPage() {
  return <IdentityFullAnalysisExperience />;
}
