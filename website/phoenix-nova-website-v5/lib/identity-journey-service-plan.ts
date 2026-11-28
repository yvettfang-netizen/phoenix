// This plan is applied by an authorized service adviser after commercial opening.
// A completed task records service work. Official outcomes use separate evidence.
export const identityRenewalServiceActions = [
  { key: "PATH_REVIEW", title: { zh: "核验续签路径", en: "Review the renewal pathway" }, audience: "STAFF" },
  { key: "MATERIALS_CHECKLIST", title: { zh: "确认材料清单", en: "Confirm the document checklist" }, audience: "CLIENT" },
  { key: "MATERIAL_REVIEW", title: { zh: "跟进材料提交与审核", en: "Track document submission and review" }, audience: "STAFF" },
  { key: "SUPPLEMENT", title: { zh: "核对补件事项", en: "Review any supplementary requests" }, audience: "CLIENT" },
  { key: "SUBMISSION_RECORD", title: { zh: "记录申请递交", en: "Record application submission" }, audience: "STAFF" },
  { key: "RESULT_REVIEW", title: { zh: "核验官方决定", en: "Verify the official decision" }, audience: "STAFF" },
  { key: "FEEDBACK", title: { zh: "收集客户反馈", en: "Collect client feedback" }, audience: "CLIENT" },
  { key: "SERVICE_CLOSURE", title: { zh: "核对服务交付并结项", en: "Review delivery and close the service" }, audience: "STAFF" },
] as const;
