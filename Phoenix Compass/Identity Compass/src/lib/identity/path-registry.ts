export const IDENTITY_PATH_DEFINITIONS = [
  {
    order: 1,
    path_code: "new_cies",
    display_name: "New CIES",
    policy_branches: ["new_cies"],
  },
  {
    order: 2,
    path_code: "ttps",
    display_name: "TTPS A/B/C",
    policy_branches: ["ttps_a", "ttps_b", "ttps_c"],
  },
  {
    order: 3,
    path_code: "qmas",
    display_name: "QMAS",
    policy_branches: ["qmas"],
  },
  {
    order: 4,
    path_code: "study_iang",
    display_name: "Study/IANG",
    policy_branches: ["study_iang"],
  },
  {
    order: 5,
    path_code: "employment",
    display_name: "Employment",
    policy_branches: ["employment"],
  },
  {
    order: 6,
    path_code: "dependant",
    display_name: "Dependant",
    policy_branches: ["dependant"],
  },
] as const;

export type IdentityPathDefinition = (typeof IDENTITY_PATH_DEFINITIONS)[number];
export type IdentityPathCode = IdentityPathDefinition["path_code"];
export type IdentityPolicyBranchCode = IdentityPathDefinition["policy_branches"][number];

export const IDENTITY_PATH_ORDER = IDENTITY_PATH_DEFINITIONS.map(
  ({ path_code }) => path_code,
) as readonly IdentityPathCode[];

export const IDENTITY_POLICY_BRANCH_ORDER = IDENTITY_PATH_DEFINITIONS.flatMap(
  ({ policy_branches }) => policy_branches,
) as readonly IdentityPolicyBranchCode[];

export const IDENTITY_PATH_ORDER_NOTICE =
  "路径顺序仅用于信息架构，不代表成功率、推荐顺序或获批概率。";

export function getIdentityPathDefinition(pathCode: IdentityPathCode): IdentityPathDefinition {
  const definition = IDENTITY_PATH_DEFINITIONS.find(({ path_code }) => path_code === pathCode);
  if (!definition) throw new Error(`Unknown Identity path: ${pathCode}`);
  return definition;
}
