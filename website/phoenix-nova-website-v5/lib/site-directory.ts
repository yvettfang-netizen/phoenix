import type { Locale } from "@/components/v5-site";

type Label = readonly [string, string];
export type DirectoryItem = { label: Label; path?: string; status?: Label };
export const directoryGroups: readonly { title: Label; items: readonly DirectoryItem[] }[] = [
  { title: ["规划与专业服务", "Planning & professional services"], items: [
    { label: ["凤启罗盘 Phoenix Compass", "Phoenix Compass"], path: "/compass" },
    { label: ["Education｜教育规划", "Education"], path: "/compass#education" },
    { label: ["Identity｜全球身份规划", "Identity"], path: "/identity" },
    { label: ["Wealth｜财富保障", "Wealth"], path: "/compass#wealth" },
    { label: ["Health｜健康与医疗", "Health"], path: "/health" },
  ] },
  { title: ["教育与学习平台", "Education & learning"], items: [
    { label: ["凤启学苑 Phoenix Academy", "Phoenix Academy"] },
    { label: ["ASKWISE｜问思", "ASKWISE"] },
    { label: ["启明堂", "Qiming Learning"] },
    { label: ["学苑约课管理系统", "Academy booking platform"] },
    { label: ["学员入口", "Student entry"] },
    { label: ["导师入口", "Tutor entry"] },
  ] },
  { title: ["家庭与会员服务", "Family & membership"], items: [
    { label: ["凤启家序 Family OS", "Family OS"] },
    { label: ["家庭中心", "Family Center"], path: "/family-center", status: ["受控预览", "Controlled preview"] },
    { label: ["家庭档案", "Family profile"] },
    { label: ["家庭成长与服务进度", "Growth & service progress"] },
  ] },
  { title: ["凤启世界", "The Phoenix world"], items: [
    { label: ["凤启洞察", "Phoenix Insights"], path: "/insights" },
    { label: ["凤启东方", "Phoenix Oriental"], path: "/oriental" },
    { label: ["NOVA DIGITAL", "NOVA DIGITAL"] },
    { label: ["全球家庭成长", "Global family growth"], path: "" },
  ] },
  { title: ["关于凤启", "About Phoenix Nova"], items: [
    { label: ["品牌介绍", "Our brand"], path: "/about" },
    { label: ["企业文化", "Our principles"], path: "/about" },
    { label: ["全球合作", "Global collaboration"] },
    { label: ["联系我们", "Contact us"], path: "/identity#consultation", status: ["咨询准备演示", "Preparation demo"] },
  ] },
];
export const directoryText = (label: Label, locale: Locale) => label[locale === "zh" ? 0 : 1];
