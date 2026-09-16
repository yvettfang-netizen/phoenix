import type { Metadata } from "next";

import { CollectionPage } from "@/components/commerce";

export const metadata: Metadata = {
  title: "东方生活｜凤启东方",
  description: "凤启东方 Eastern Living 未来生活作品集合。",
};

export default function EasternLivingRoute() {
  return (
    <CollectionPage
      collection="eastern-living"
      eyebrow="EASTERN LIVING / COMING SOON"
      title="东方生活"
      intro="等作品完成设计、取得正式视觉资产并确认供应后，再进入日常生活。"
    />
  );
}
