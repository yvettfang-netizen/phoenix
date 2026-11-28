export const identityResidencePath = "/api/family-services/identity-residence";

export const identityResidenceAbsenceReasons = ["WORK", "STUDY", "FAMILY", "OTHER", "WITHHELD"] as const;
export type IdentityResidenceAbsenceReason = typeof identityResidenceAbsenceReasons[number];

export type IdentityResidenceReport = {
  from: string;
  untilBefore: string;
  place: "HK" | "AWAY";
  absenceReason: IdentityResidenceAbsenceReason | null;
  expectedReturnOn: string | null;
};

export type IdentityResidenceRecord = Omit<IdentityResidenceReport, "place"> & {
  id: string;
  place: IdentityResidenceReport["place"] | "UNVERIFIED";
  source: "SELF_REPORTED" | "ADVISER_VERIFIED" | "OFFICIAL_RECORD" | "UNSPECIFIED";
};

export type IdentityResidenceOverview = {
  asOf: string;
  canReport: boolean;
  currentRecordedAbsenceDays: number | null;
  records: IdentityResidenceRecord[];
  years: {
    year: number;
    recordedInHongKongDays: number;
    longestRecordedAbsenceDays: number;
    unverified: { from: string; until: string }[];
  }[];
  rightOfAbode: "HUMAN_REVIEW_REQUIRED";
  passportEligibility: "HUMAN_REVIEW_REQUIRED";
};
