import type { Metadata } from "next";

import { CollectionPage } from "@/components/commerce";

export const metadata: Metadata = {
  title: "男士礼物｜凤启东方",
  description: "凤启东方 For Him 男士礼物集合。",
};

export default function ForHimRoute() {
  return (
    <CollectionPage
      collection="for-him"
      eyebrow="FOR HIM / RESTRAINED OBJECTS"
      title="男士礼物"
      intro="克制、深色、低饱和；让东方意象进入男士日常。"
    />
  );
}
