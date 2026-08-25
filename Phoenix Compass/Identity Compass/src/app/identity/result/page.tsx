import type { Metadata } from "next";

import { IdentityResultExperience } from "@/components/identity-result-experience";

export const metadata: Metadata = {
  title: "Free Identity Snapshot",
  description: "你的 Phoenix Identity Compass™ 免费家庭身份方向快照。",
};

export default function IdentityResultPage() {
  return <IdentityResultExperience />;
}
