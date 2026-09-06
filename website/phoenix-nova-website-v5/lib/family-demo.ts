// Synthetic UI data only. No record in this module represents a real client.
export type Locale = "zh" | "en";
export type Goal = "undergraduate" | "masters" | "doctorate";
export type HubView = "overview" | "documents" | "learning" | "services" | "profile";
export const tr = (locale: Locale, zh: string, en: string) => locale === "zh" ? zh : en;
export const demoDate = "2026-09-06";
export const members = [
  { id: "demo-xiao", zh: "林晓", en: "Xiao Lin", stage: ["本科在读", "Undergraduate student"], minor: false },
  { id: "demo-an", zh: "林安", en: "An Lin", stage: ["硕士在读", "Master’s student"], minor: false },
  { id: "demo-he", zh: "小禾", en: "He Lin", stage: ["中学在读 · 监护示例", "Secondary student · guardian demo"], minor: true },
] as const;
export const goals: {id: Goal; zh: string; en: string; description: [string, string]}[] = [
  {id: "undergraduate", zh: "本科申请", en: "Undergraduate", description: ["升学、转学与升本路径", "First degree, transfer and progression"]},
  {id: "masters", zh: "硕士申请", en: "Master’s", description: ["授课型与研究型硕士", "Taught and research programmes"]},
  {id: "doctorate", zh: "博士申请", en: "Doctoral", description: ["研究方向、导师与资助", "Research, supervisors and funding"]},
];
export const compassItems = [
  {id: "education", en: "Education Compass", zh: "教育罗盘", description: ["了解学习与升学方向，让下一步更清楚。", "Understand learning and admissions priorities."], next: ["学业与报告", "Learning & reports"]},
  {id: "identity", en: "Identity Compass", zh: "身份罗盘", description: ["梳理身份规划目标、资料与后续节点。", "Organise identity goals, evidence and milestones."], next: ["证件与节点", "Documents & milestones"]},
  {id: "wealth", en: "Wealth Compass", zh: "财富罗盘", description: ["梳理家庭保障与财务规划问题。", "Clarify protection and financial planning questions."], next: ["我的服务", "My services"]},
  {id: "health", en: "Health Compass", zh: "健康罗盘", description: ["整理健康支持需求与专业服务方向。", "Organise health support needs and professional services."], next: ["我的服务", "My services"]},
] as const;
export type DemoDocument = {id: string; memberId: string; name: [string,string]; dateType: [string,string]; date: string | null; previousDate?: string; renewed?: boolean};
export function initialDocuments(): DemoDocument[] {
  return [
    {id:"visa-xiao",memberId:"demo-xiao",name:["香港签证／逗留记录","Hong Kong visa / stay record"],dateType:["获准逗留期限","Permitted stay until"],date:"2026-09-28"},
    {id:"permit-xiao",memberId:"demo-xiao",name:["回乡证","Mainland Travel Permit"],dateType:["证件有效期","Document valid until"],date:"2026-12-07"},
    {id:"identity-xiao",memberId:"demo-xiao",name:["香港身份证","Hong Kong identity card"],dateType:["换领节点待核验","Replacement milestone to verify"],date:null},
    {id:"visa-an",memberId:"demo-an",name:["香港签证／逗留记录","Hong Kong visa / stay record"],dateType:["获准逗留期限","Permitted stay until"],date:"2026-10-26"},
    {id:"permit-he",memberId:"demo-he",name:["回乡证","Mainland Travel Permit"],dateType:["证件有效期","Document valid until"],date:"2026-11-20"},
  ];
}
export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const delta = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${demoDate}T00:00:00Z`);
  return Number.isFinite(delta) ? Math.ceil(delta / 86400000) : null;
}
export function renewDemoDocument(doc: DemoDocument): DemoDocument {
  if (!doc.date || doc.renewed) return doc;
  // A fixed fictional replacement date, never a rule for the term of a real visa.
  return {...doc, previousDate: doc.date, date: "2027-09-06", renewed: true};
}
export type ApplicationRecord = {id: string; memberId: string; goal: Goal; year: string; status: "submitted" | "withdrawn"; material: boolean; consent: boolean};
export function upsertDemoApplication(records: ApplicationRecord[], input: Omit<ApplicationRecord,"id">): ApplicationRecord[] {
  const id = `demo-application-${input.memberId}-${input.goal}-${input.year}`;
  const record = {...input, id};
  return records.some(x => x.id === id) ? records.map(x => x.id === id ? record : x) : [...records, record];
}
export function allowedGoal(minor: boolean, goal: Goal) { return !minor || goal === "undergraduate"; }
export function subjectRecords<T extends {memberId: string}>(records: T[], memberId: string): T[] {
  return records.filter(x => x.memberId === memberId);
}
