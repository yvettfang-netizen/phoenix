import { describe, expect, it } from "vitest";

import {
  IDENTITY_PATH_DEFINITIONS,
  IDENTITY_PATH_ORDER,
  IDENTITY_PATH_ORDER_NOTICE,
} from "@/lib/identity/path-registry";

describe("Identity six-path registry", () => {
  it("locks the six product paths in information-architecture order", () => {
    expect(IDENTITY_PATH_ORDER).toEqual([
      "new_cies",
      "ttps",
      "qmas",
      "study_iang",
      "employment",
      "dependant",
    ]);
    expect(IDENTITY_PATH_DEFINITIONS.map(({ order }) => order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(IDENTITY_PATH_DEFINITIONS[1].policy_branches).toEqual(["ttps_a", "ttps_b", "ttps_c"]);
  });

  it("states that order is not a recommendation or outcome prediction", () => {
    expect(IDENTITY_PATH_ORDER_NOTICE).toContain("信息架构");
    expect(IDENTITY_PATH_ORDER_NOTICE).toContain("不代表成功率");
    expect(IDENTITY_PATH_ORDER_NOTICE).toContain("不代表");
  });
});
