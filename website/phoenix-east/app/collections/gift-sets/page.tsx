import type { Metadata } from "next";

import { CollectionPage } from "@/components/commerce";

export const metadata: Metadata = {
  title: "东方礼盒｜凤启东方",
  description: "凤启东方 Gift Sets 正式作品组合集合。",
};

export default function GiftSetsRoute() {
  return (
    <CollectionPage
      collection="gift-sets"
      eyebrow="GIFT SETS / FORMAL COMBINATIONS"
      title="东方礼盒"
      intro="只组合已经正式存在、拥有 Founder 批准视觉与真实资料的作品。"
    />
  );
}
