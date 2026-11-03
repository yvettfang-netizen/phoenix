/** Health navigation only. No medical scoring, persistence, network or Core handoff. */
export type HealthLocale = "zh" | "en";
export type Copy = readonly [string, string];
export const text = (copy: Copy, locale: HealthLocale) => copy[locale === "zh" ? 0 : 1];
export const QUESTION_VERSION = "health-navigation-v0.1-draft";
export const RULE_VERSION = "self-reported-arrangements-v0.1";
export type Option = { value: string; label: Copy };
export type Question = { id: string; title: Copy; hint: Copy; options: readonly Option[] };
export const commonOptions: readonly Option[] = [
  { value: "clear", label: ["已有清晰安排", "Clear arrangements in place"] },
  { value: "partial", label: ["有一部分，还需整理", "Partly arranged; more to organise"] },
  { value: "todo", label: ["还没有安排", "Not arranged yet"] },
  { value: "unknown", label: ["不清楚", "Not sure"] },
  { value: "na", label: ["本次不适用", "Not applicable this time"] },
];
export const questions: readonly Question[] = [
  { id: "HC01", title: ["这次，你主要想为谁梳理健康安排？", "Whose arrangements would you like to organise?"], hint: ["只选关系类别，不需要任何人的姓名、年龄或健康情况。", "Choose a relationship only. Do not provide names, ages or health information."], options: [
    { value: "family", label: ["全家一起", "The family together"] }, { value: "self", label: ["主要为自己", "Mainly myself"] }, { value: "elders", label: ["父母或长辈", "Parents or older relatives"] }, { value: "children", label: ["子女（只梳理安排）", "Children (arrangements only)"] }, { value: "unsure", label: ["还没有确定", "Not decided yet"] },
  ] },
  { id: "HC02", title: ["你希望了解哪个地区的安排？", "Which region's arrangements would you like to understand?"], hint: ["只选大范围地区，不定位，也不填写地址。地区选择不代表就医资格或保障资格。", "Broad regions only; no location tracking or address. This does not establish care or coverage eligibility."], options: [
    { value: "hk", label: ["香港", "Hong Kong"] }, { value: "mainland", label: ["中国内地", "Mainland China"] }, { value: "cross", label: ["香港与内地两地", "Hong Kong and Mainland China"] }, { value: "other", label: ["其他地区", "Other regions"] }, { value: "unsure", label: ["还没有确定", "Not decided yet"] },
  ] },
  { id: "HC03", title: ["有健康方面的问题时，你知道到哪里查找正规咨询渠道吗？", "Do you know where to find professional consultation channels?"], hint: ["这里只问你是否知道查找渠道，不问症状，也不会为你判断应看哪一科。", "We ask about channels, not symptoms. This tool does not choose a medical specialty."], options: commonOptions },
  { id: "HC04", title: ["跨地区生活时，你清楚到哪里核实当地就医流程和所需资料吗？", "Do you know where to verify local care procedures and required documents when living across regions?"], hint: ["没有跨地区需求，可以选“本次不适用”。", "Select not applicable when you have no cross-region needs."], options: commonOptions },
  { id: "HC05", title: ["家中的健康事务，是否已有明确的协调或分工方式？", "Is there a clear way to coordinate health-related tasks in your family?"], hint: ["例如谁负责整理信息、联系机构。不填写具体人员资料。", "For example, organising information or contacting institutions. Do not enter anyone's details."], options: commonOptions },
  { id: "HC06", title: ["对机构已经确认的预约或跟进，你是否有记录与提醒的方式？", "Do you have a way to record and remember appointments or follow-ups already confirmed by institutions?"], hint: ["无需告诉我们预约什么、何时复诊或任何医疗内容。没有相关安排可选“不适用”。", "Do not tell us appointment details, follow-up dates or medical information. Not applicable is available."], options: commonOptions },
  { id: "HC07", title: ["需要自己的健康资料时，你知道向原机构索取的渠道吗？", "Do you know how to request your own records from the original institution?"], hint: ["只梳理取用渠道。本工具不接收病历、检查报告或健康数据。", "Channels only. This tool does not accept medical records, test reports or health data."], options: commonOptions },
  { id: "HC08", title: ["由他人协助办理时，你是否清楚资料授权范围和撤回方式？", "When someone assists you, do you understand the scope of permission and how to withdraw it?"], hint: ["你可以选择“不清楚”。这里不授予任何人读取资料的权限。", "Not sure is an option. No permission to access records is granted here."], options: commonOptions },
  { id: "HC09", title: ["需要陪同或生活协助时，家中是否已有可商量的安排？", "Are there arrangements to discuss when accompaniment or daily-life assistance is needed?"], hint: ["不必说明健康原因、身体状况或具体联系人。", "Do not describe health reasons, conditions or contacts."], options: commonOptions },
  { id: "HC10", title: ["主要协助人临时没空时，是否有替代安排？", "Is there a backup when the usual helper is unavailable?"], hint: ["没有陪同或照护需求，可以选“本次不适用”。", "Select not applicable when accompaniment or care assistance is not needed."], options: commonOptions },
  { id: "HC11", title: ["你是否知道在哪里找到现有医疗保障的资料与咨询渠道？", "Do you know where to find information and support for existing healthcare coverage?"], hint: ["无需填写保单号、保障金额、保险公司或投保情况。本工具不推荐保险。", "Do not provide policy numbers, amounts, insurers or coverage status. This tool does not recommend insurance."], options: commonOptions },
  { id: "HC12", title: ["涉及费用、报销或理赔时，你是否知道应向哪里核实？", "Do you know where to verify costs, reimbursements or claims?"], hint: ["本工具不会判断能否报销、能否获赔或应购买什么产品。", "This tool does not determine reimbursement, claim eligibility or which products to buy."], options: commonOptions },
  { id: "HC13", title: ["你是否有统一整理预约、待办和下一步事项的方法？", "Do you have one way to organise appointments, tasks and next steps?"], hint: ["可以是你自己的日历或纸质清单，不需要上传。", "Your own calendar or paper checklist is enough. Nothing needs to be uploaded."], options: commonOptions },
  { id: "HC14", title: ["你是否想好之后由谁、在什么时候重新检查这些安排？", "Have you decided who will revisit these arrangements and when?"], hint: ["只问安排是否清楚，不采集人员名单或具体日期。", "We only ask whether the arrangement is clear, not for names or specific dates."], options: commonOptions },
];
export const dimensions = [
  { id: "access", title: ["就医路径", "Care pathways"] as Copy, action: ["收藏所需地区的官方就医信息入口；具体资格、流程与费用向相关机构核实。", "Bookmark official care information for the relevant region; verify eligibility, procedures and costs with the institution."] as Copy },
  { id: "arrange", title: ["健康事务安排", "Task coordination"] as Copy, action: ["明确家中负责协调的人，并为已由机构确认的预约或跟进设置自己的提醒。", "Agree who coordinates tasks and set your own reminders for institution-confirmed appointments or follow-ups."] as Copy },
  { id: "privacy", title: ["资料与授权", "Records and permission"] as Copy, action: ["记录原机构的资料索取渠道；协助他人前确认授权范围，不在本工具上传任何资料。", "Note the original institution's records-request channel and clarify permission before helping others. Upload nothing here."] as Copy },
  { id: "care", title: ["家庭照护协作", "Family support"] as Copy, action: ["与家人商量陪同方式和备用协助人；联系方式由你们自行保管。", "Discuss accompaniment and a backup helper with your family. Keep contact details yourselves."] as Copy },
  { id: "cover", title: ["保障信息理解", "Coverage information"] as Copy, action: ["找到现有保障文件和服务渠道；保障范围、报销或理赔条件向提供机构核实。", "Locate existing coverage documents and service channels; verify coverage, reimbursement and claims with the provider."] as Copy },
  { id: "follow", title: ["持续跟进", "Ongoing follow-up"] as Copy, action: ["在你自己的日历或清单里记录待办，并商定下一次检查这些安排的时间。", "Record tasks in your own calendar or checklist and agree when to review the arrangements."] as Copy },
] as const;
export type Answers = readonly (string | null)[];
export function normaliseAnswers(input: Answers): (string | null)[] {
  return questions.map((question, i) => question.options.some(option => option.value === input[i]) ? input[i] : null);
}
export function dimensionStatus(input: Answers): Copy {
  if (input.every(value => value == null)) return ["信息不足，不作判断", "Not enough information to describe arrangements"];
  if (input.every(value => value === "na")) return ["本次不适用", "Not applicable this time"];
  if (input.some(value => value === "partial" || value === "todo")) return ["你有待整理的安排", "You reported arrangements to organise"];
  if (input.includes("unknown")) return ["你有待了解的事项", "You reported matters to clarify"];
  if (input.some(value => value == null)) return ["仅提供了部分信息", "Only partial information provided"];
  return ["你已说明现有安排", "You described existing arrangements"];
}
export function getResults(input: Answers) {
  const answers = normaliseAnswers(input);
  if (answers.slice(2).every(value => value === null)) return [];
  return dimensions.map((dimension, index) => ({ ...dimension, status: dimensionStatus(answers.slice(2 + index * 2, 4 + index * 2)) }));
}
export function toggleAction(selected: readonly string[], id: string): string[] {
  const valid = [...new Set(selected)].filter(item => dimensions.some(d => d.id === item)).slice(0, 3);
  if (!dimensions.some(d => d.id === id)) return valid;
  return valid.includes(id) ? valid.filter(item => item !== id) : valid.length < 3 ? [...valid, id] : valid;
}
export function actionText(selected: readonly string[], locale: HealthLocale): string {
  const valid = [...new Set(selected)].filter(id => dimensions.some(d => d.id === id)).slice(0, 3);
  return ["Phoenix Health Compass", text(["我的健康事务行动单（非医疗建议）", "My health-task action list (not medical advice)"], locale), ...valid.map((id, index) => {
    const dimension = dimensions.find(d => d.id === id)!;
    return `${index + 1}. ${text(dimension.title, locale)}\n${text(dimension.action, locale)}`;
  }), `${QUESTION_VERSION} / ${RULE_VERSION}`].join("\n\n");
}
