// Server-side configuration for the Phoenix Insights & GEO Content Hub.
// The public site must only consume rows that pass every gate below.
export const phoenixContentHub = {
  databaseId: "7f0f709d-0219-4289-a0d4-01c7028bed69",
  dataSourceId: "79b4a0f7-87c0-453f-87df-f50d84a00919",
  allowedStatuses: ["Published"],
  allowedCategories: ["Identity", "Wealth", "Health", "Global Living", "Family Growth"],
  excludedCategories: ["Education"],
  allowedBrandsProperty: "Allowed Brands",
  requiredBrandValue: "WisWealth",
  reuseModeProperty: "Reuse Mode",
  requiredReuseMode: "Brand Adaptation",
  kylinReviewStatusProperty: "Kylin Review Status",
  requiredKylinReviewStatus: "Passed",
  requireSlug: true,
  requireReviewer: true,
  requireVerifiedSourceDate: tr