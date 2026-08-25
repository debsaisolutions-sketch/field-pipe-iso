/**
 * Feature entitlements for future Solo / Pro / Team tiers.
 * Billing is unchanged: existing subscribers keep full Pro capabilities.
 */

export const PLAN_FEATURES = {
  solo: {
    cloudJobs: false,
    companyStandards: false,
    brandedPdf: true,
    teamSharing: false,
    coreCalc: true,
    drawings: true,
    pdfExport: true,
  },
  pro: {
    cloudJobs: true,
    companyStandards: true,
    brandedPdf: true,
    teamSharing: false,
    coreCalc: true,
    drawings: true,
    pdfExport: true,
  },
  team: {
    cloudJobs: true,
    companyStandards: true,
    brandedPdf: true,
    teamSharing: true,
    coreCalc: true,
    drawings: true,
    pdfExport: true,
  },
};

/** Default for authenticated PSP users until Solo tier is billed separately. */
export const DEFAULT_PLAN = "pro";

export function resolveFeatures(planKey) {
  const key = typeof planKey === "string" ? planKey.toLowerCase() : DEFAULT_PLAN;
  return PLAN_FEATURES[key] || PLAN_FEATURES.pro;
}
