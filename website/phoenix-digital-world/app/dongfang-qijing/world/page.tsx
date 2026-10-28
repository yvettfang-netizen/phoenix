import { RealmDetail, type RealmDetailConfig } from "../realm-detail";

const config: RealmDetailConfig = {
  eyebrow: "PATH 02 · PHOENIX NOVA",
  title: "走进凤启",
  subtitle: "了解凤启的世界",
  statement: "不是展示一个机构，而是看见一套正在生长的家庭未来系统。",
  tone: "world",
  focus: "50% 42%",
  modules: [
    { no: "01", title: "凤启理念", en: "OUR BELIEF", description: "从东方根脉出发，陪伴全球家庭走向更远的未来。" },
    { no: "02", title: "五大领域", en: "FIVE DOMAINS", description: "教育、身份、财富、健康与全球生活彼此连接。" },
    { no: "03", title: "九大仙灵", en: "NINE GUARDIANS", description: "九种专业能力在凤凰中枢之下协同守护。" },
    { no: "04", title: "Founder Story", en: "THE BEGINNING", description: "理解鹤潼为何建立凤启，以及它想抵达的地方。" },
  ],
};

export default function PhoenixWorldPage() {
  return <RealmDetail config={config} />;
}
