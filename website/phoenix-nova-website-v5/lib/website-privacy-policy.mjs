/** @param {Record<string, unknown>} env */
export function websitePrivacyPolicy(env) {
  if (env.WEBSITE_PRIVACY_APPROVED !== "true" || env.WEBSITE_PRIVACY_VERSION !== "website-consultation.v1") return null;
  const zh = policyParagraphs(env.WEBSITE_PRIVACY_POLICY_ZH);
  const en = policyParagraphs(env.WEBSITE_PRIVACY_POLICY_EN);
  return zh && en ? { zh, en } : null;
}

/** @param {unknown} text */
function policyParagraphs(text) {
  if (typeof text !== "string" || text.length > 20000 || text.includes("\0") ||
      /【[^】\n]+】|\[[^\]\n]+\]/.test(text)) return null;
  const paragraphs = text.trim().split(/\r?\n\s*\r?\n/).map(paragraph => paragraph.trim()).filter(Boolean);
  return paragraphs.length > 0 && paragraphs.length <= 60 ? paragraphs : null;
}
