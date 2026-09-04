import { RealmDetail, type RealmDetailConfig } from "../realm-detail";

const config: RealmDetailConfig = {
  eyebrow: "PATH 03 · GROW TOGETHER",
  title: "了解合作",
  subtitle: "与凤启共同成长",
  statement: "不建孤岛，以清晰边界连接长期价值。",
  tone: "collaboration",
  focus: "72% 50%",
  modules: [
    { no: "01", title: "合作理念", en: "SHARED BELIEF", description: "以家庭长期价值为共同起点，建立可信合作。" },
    { no: "02", title: "产品闭环", en: "VALUE LOOP", description: "从入口、评估、方案到持续服务形成完整路径。" },
    { no: "03", title: "伙伴支持", en: "PARTNER ENABLEMENT", description: "品牌、内容、工具与专业能力共同支撑伙伴成长。" },
    { no: "04", title: "协作标准", en: "COLLABORATION", description: "明确客户归属、交付边界、质量与长期复盘机制。" },
  ],
};

export default function CollaborationPage() {
  return <RealmDetail config={config} />;
}
