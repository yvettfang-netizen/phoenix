import type { Metadata } from "next";

import { CollectionPage } from "@/components/commerce";

export const metadata: Metadata = {
  title: "丝织四章｜凤启东方",
  description: "初羽、凤起、山海、锦羽：凤启东方 Silk Chapters。",
};

export default function SilkRoute() {
  return (
    <CollectionPage
      collection="silk"
      eyebrow="SILK / FOUR CHAPTERS"
      title="丝织四章"
      intro="从一片初生的羽翼，到一段可以被继续讲述的传承。"
    />
  );
}
