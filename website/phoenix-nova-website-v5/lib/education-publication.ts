/** Publication design contract. No deployment, crawler submission or data writes. */
export const EDUCATION_PROPOSED_ORIGIN = "http://edu.phoenixnova.com.cn";
export type EducationPublication = {
  state: "draft" | "reviewed" | "published";
  substantiveContent: boolean;
  sourcesVerified: boolean;
  editor: string | null;
  reviewer: string | null;
  lastSubstantiveUpdate: string | null;
  validUntil: string | null;
};
export type ReleaseApproval = {
  origin: string;
  domainVerified: boolean;
  founderApproved: boolean;
  allowSearchCrawlers: boolean;
  allowTrainingCrawlers: boolean;
};
export const EDUCATION_RELEASE: Readonly<ReleaseApproval> = Object.freeze({
  origin: EDUCATION_PROPOSED_ORIGIN, domainVerified: false, founderApproved: false,
  allowSearchCrawlers: false, allowTrainingCrawlers: false,
});
export function educationContentPath(locale: "zh" | "en", slug = "") {
  if (!/^(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(slug)) throw new Error("Invalid content slug");
  return `/${locale}/education${slug ? `/${slug}` : ""}`;
}
export function mayIndexEducation(record: EducationPublication, release: ReleaseApproval, now: string) {
  const date = Date.parse(now);
  return Number.isFinite(date) && release.domainVerified && release.founderApproved && release.allowSearchCrawlers
    && record.state === "published" && record.substantiveContent && record.sourcesVerified
    && Boolean(record.editor?.trim() && record.reviewer?.trim())
    && record.lastSubstantiveUpdate !== null && Number.isFinite(Date.parse(record.lastSubstantiveUpdate))
    && Date.parse(record.lastSubstantiveUpdate) <= date
    && (record.validUntil === null || (Number.isFinite(Date.parse(record.validUntil)) && Date.parse(record.validUntil) > date));
}
export function educationAlternates(locale: "zh" | "en", slug = "", release: ReleaseApproval = EDUCATION_RELEASE) {
  return { canonical: new URL(educationContentPath(locale, slug), release.origin).href,
    languages: { "zh-Hans": new URL(educationContentPath("zh", slug), release.origin).href,
      en: new URL(educationContentPath("en", slug), release.origin).href } };
}
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
