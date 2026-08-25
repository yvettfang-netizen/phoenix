import type { Metadata } from "next";

import { IdentityAssessmentExperience } from "@/components/identity-assessment-experience";

export const metadata: Metadata = {
  title: "Free 6题身份测评",
  description: "每屏一题，完成 Phoenix Identity Compass™ 免费家庭意图测评。",
};

export default function IdentityAssessmentPage() {
  return <IdentityAssessmentExperience />;
}
