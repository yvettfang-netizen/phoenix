export const IDENTITY_POLICY_PATHS = [
  "new_cies",
  "ttps_a",
  "ttps_b",
  "ttps_c",
  "qmas",
  "study_iang",
  "employment",
  "dependant_family_linked",
] as const;

export type IdentityPolicyPath = (typeof IDENTITY_POLICY_PATHS)[number];

export type IdentityPolicyRecord = Readonly<{
  path: IdentityPolicyPath;
  policy_library_version: string;
  source_register_reference: string;
  rules: readonly unknown[];
}>;

// Sprint 1 intentionally defines no eligibility evaluator. Rules enter through
// IdentityPolicyRepository once the ACTIVE Policy Library is available.
