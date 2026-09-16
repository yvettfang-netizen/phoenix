import type { Metadata } from "next";

import { CollectionPage } from "@/components/commerce";

export const metadata: Metadata = {
  title: "凤凰珠宝｜凤启东方",
  description: "凤启东方凤凰珠宝作品目录与预约定制入口。",
};

export default function JewelleryRoute() {
  return (
    <CollectionPage
      collection="jewellery"
      eyebrow="JEWELLERY / PHOENIX OBJECTS"
      title="凤凰珠宝"
      intro="让凤凰羽翼、金属与光，成为靠近身体的当代作品。"
    />
  );
}
