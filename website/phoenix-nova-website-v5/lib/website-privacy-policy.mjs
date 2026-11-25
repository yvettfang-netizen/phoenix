/** @param {Record<string, unknown>} env */
export function websitePrivacyPolicy(env, today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })) {
  if (env.WEBSITE_PRIVACY_APPROVED !== "true" || env.WEBSITE_PRIVACY_VERSION !== "website-consultation.v1") return null;
  const date = env.WEBSITE_PRIVACY_LAUNCH_DATE;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return null;
  const parsed = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const zh = policyParagraphs(env.WEBSITE_PRIVACY_POLICY_ZH);
  const en = policyParagraphs(env.WEBSITE_PRIVACY_POLICY_EN);
  return zh && en ? { zh: [`生效日期：${date}`, ...zh], en: [`Effective date: ${date}`, ...en] } : null;
}

/** @param {unknown} text */
function policyParagraphs(text) {
  if (typeof text !== "string" || text.length > 20000 || text.includes("\0") ||
      /【[^】\n]+】|\[[^\]\n]+\]/.test(text)) return null;
  const paragraphs = text.trim().split(/\r?\n\s*\r?\n/).map(paragraph => paragraph.trim()).filter(Boolean);
  return paragraphs.length > 0 && paragraphs.length <= 60 ? paragraphs : null;
}
