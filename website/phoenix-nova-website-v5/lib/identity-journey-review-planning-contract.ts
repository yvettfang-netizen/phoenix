import { reminderOffsets, type Offset } from "./identity-journey";
import type { IdentityInternalOnlyMilestoneKind } from "./identity-journey-profile-contract";

export const identityReviewPlanningPath = "/api/family-services/identity-review-planning";
export const identityReviewPlanOffsets = reminderOffsets;
export type IdentityReviewPlanOffset = Offset;

export type IdentityReviewPlanOption = {
  ref: string;
  kind: IdentityInternalOnlyMilestoneKind;
  path: string | null;
  startedOn: string;
  currentOn: string | null;
  offsets: IdentityReviewPlanOffset[];
};
