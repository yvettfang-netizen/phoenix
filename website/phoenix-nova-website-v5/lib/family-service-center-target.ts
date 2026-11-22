/**
 * Family OS Service Center target — synthetic, non-production interaction model.
 * Do not import these fixtures into customer APIs, or authorize anything based on
 * browser-selected role. All real permissions must come from Canonical + Consent.
 */
export type PreviewRole = "student" | "guardian" | "unassigned";
export type PreviewTab = "services" | "access" | "inbox" | "assistant";
export type PreviewLocale = "zh" | "en";
export type LocaleText = Readonly<{zh: string; en: string}>;
export type PreviewTask = Readonly<{
  id: string; label: LocaleText; due: LocaleText; status: "required" | "review" | "complete";
}>;
export type PreviewNotice = Readonly<{
  id: string; title: LocaleText; summary: LocaleText; category: "task" | "progress" | "security";
}>;
export const SERVICE_CENTER_PREVIEW_FLAG = "FAMILY_SERVICE_CENTER_PREVIEW_ENABLED";
export const TARGET_IS_SYNTHETIC = true;

export function serviceCenterPreviewEnabled(env:Record<string,unknown>,mode:string|undefined):boolean {
  return mode==="development" && env[SERVICE_CENTER_PREVIEW_FLAG]==="true";
}

export const targetCase = Object.freeze({
  id:"SYN-FOS-Y8-001",
  subject:"SYN-STUDENT-A",
  title:{zh:"2027 年英国中学入学规划",en:"2027 UK Secondary School Admissions"},
  category:{zh:"教育服务",en:"Education Services"},
  stage:{zh:"材料准备与面试训练",en:"Documents & Interview Preparation"},
  advisor:{zh:"合成顾问 A",en:"Synthetic Adviser A"},
  updated:{zh:"合成数据 · 非真实日期",en:"Synthetic data · not a real update"},
  next:{zh:"确认入学材料清单",en:"Confirm required application documents"}
} as const);

export const previewTasks:ReadonlyArray<PreviewTask> = Object.freeze([
  {id:"task-document", label:{zh:"核对申请材料清单",en:"Review application checklist"},due:{zh:"模拟节点：本周",en:"Sample milestone: this week"},status:"required"},
  {id:"task-interview", label:{zh:"完成面试练习",en:"Complete interview practice"},due:{zh:"模拟节点：下一阶段",en:"Sample milestone: next phase"},status:"review"},
  {id:"task-baseline", label:{zh:"确认学生基本资料",en:"Confirm student profile"},due:{zh:"合成记录",en:"Synthetic record"},status:"complete"},
]);

export const previewNotices:ReadonlyArray<PreviewNotice> = Object.freeze([
  {id:"notice-task", title:{zh:"材料清单等待核对",en:"Document checklist needs review"},summary:{zh:"来自合成教育项目；进入我的服务查看下一步。",en:"Synthetic education project; see My Services for next steps."},category:"task"},
  {id:"notice-progress", title:{zh:"面试练习安排待确认",en:"Interview practice requires confirmation"},summary:{zh:"仅是演示提醒，不会发送真实通知。",en:"Sample reminder only; no message will be sent."},category:"progress"},
  {id:"notice-policy", title:{zh:"授权有效期可随时查看",en:"Review the expiry of granted access"},summary:{zh:"真实撤回必须由 Canonical 服务端完成。",en:"Real consent changes must happen on the Canonical server."},category:"security"}
]);

export function canSeeLearnerData(role:PreviewRole, guardianConsentActive:boolean):boolean {
  return role==="student" || (role==="guardian" && guardianConsentActive);
}
export function availableTasks(role:PreviewRole,guardianConsentActive:boolean):ReadonlyArray<PreviewTask> {
  return canSeeLearnerData(role,guardianConsentActive)?previewTasks:[];
}
export function availableNotices(role:PreviewRole,guardianConsentActive:boolean):ReadonlyArray<PreviewNotice> {
  return canSeeLearnerData(role,guardianConsentActive)?previewNotices.filter(x=>x.category!=="security"):previewNotices.filter(x=>x.category==="security");
}
export type AssistantIntent = "today" | "materials" | "milestone";
export function previewAssistantAnswer(intent:AssistantIntent,role:PreviewRole,guardianConsentActive:boolean,locale:PreviewLocale):string {
  const zh=locale==="zh";
  if(!canSeeLearnerData(role,guardianConsentActive)) return zh
    ?"当前演示角色无权查看该学生的服务信息，无法生成回答。"
    :"This demo role is not authorized to access the student's service data.";
  if(intent==="today") return zh
    ?"根据合成项目 SYN-FOS-Y8-001，优先核对申请材料清单，再安排面试练习。来源：模拟服务任务。"
    :"For synthetic case SYN-FOS-Y8-001, review the document checklist first, then plan interview practice. Source: sample project tasks.";
  if(intent==="materials") return zh
    ?"合成清单显示“核对申请材料清单”尚未完成；此演示不包含原件，也不能上传或审核材料。"
    :"The synthetic checklist still requires review. No originals can be uploaded or reviewed in this demo.";
  return zh
    ?"下一个模拟节点是材料清单确认。真实日期必须由顾问或学生核验后才能发送提醒。"
    :"The next sample milestone is checklist confirmation. Real dates require human verification before reminders.";
}
