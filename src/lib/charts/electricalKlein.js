/**
 * Klein Tools hand-bender 90° stub-up take-up.
 *
 * Primary source (verified 2026-09-19):
 * Klein Tools, “Conduit Bender Guide” / Conduit Bending Basics
 * https://data.kleintools.com/sites/all/product_assets/documents/instructions/klein/ConduitBenderGuide.pdf
 *
 * The published Bender Take-Up Table lists stub height (amount to subtract
 * from the desired free-end / stub height) for Klein hand benders:
 *   1/2" EMT                          → 5"
 *   3/4" EMT and 1/2" Rigid           → 6"
 *   1" EMT and 3/4" Rigid             → 8"
 *   1-1/4" EMT and 1" Rigid           → 11"
 *
 * Klein states these benders cover EMT 1/2", 3/4", 1", 1-1/4" and
 * Rigid 1/2", 3/4", 1". Klein does not list PVC, IMC, or 1-1/4" Rigid
 * in this table.
 *
 * App mapping:
 *   cutLength = knownLength − take-up
 * matches Klein’s stub-up marking rule when Known Length is the desired
 * overall free-end / stub height and a 90° is on that end.
 * This is NOT developed-length, gain, or offset-shrink.
 *
 * Offset table in the same PDF (multiplier / shrink-per-inch) is NOT a
 * single per-size takeoff deduction and is not loaded into the offset cell.
 *
 * IDEAL Conduit Bender Guide (secondary cross-check only, not a selectable
 * chart): 3/4" EMT stub example subtracts 6" take-up — agrees with Klein
 * for that size only.
 */

export const KLEIN_CHART_META = {
  sourceType: "verified_chart",
  sourceName: "Klein Tools — Conduit Bending Basics / Conduit Bender Guide",
  sourceUrl:
    "https://data.kleintools.com/sites/all/product_assets/documents/instructions/klein/ConduitBenderGuide.pdf",
  manufacturer: "Klein Tools",
  chartName: "Klein Hand Bender — 90° Stub-Up Take-Up Table",
  chartVersion: "Conduit Bender Guide (document at source URL; no edition date on the PDF)",
  verifiedAt: "2026-09-19",
  notes:
    "Hand-bender 90° stub-up take-up only. Not universal across manufacturers. PVC is not in this chart.",
};

/** EMT 90° take-up inches by catalog size. */
export const KLEIN_EMT_90_TAKEUP = {
  '1/2"': 5,
  '3/4"': 6,
  '1"': 8,
  '1-1/4"': 11,
};

/** Rigid 90° take-up inches as published next to the paired EMT size. */
export const KLEIN_RIGID_90_TAKEUP = {
  '1/2"': 6,
  '3/4"': 8,
  '1"': 11,
};

export function klein90Takeup(materialSystem, size) {
  if (materialSystem === "emt") {
    return Object.prototype.hasOwnProperty.call(KLEIN_EMT_90_TAKEUP, size)
      ? KLEIN_EMT_90_TAKEUP[size]
      : null;
  }
  if (materialSystem === "rigid_imc") {
    return Object.prototype.hasOwnProperty.call(KLEIN_RIGID_90_TAKEUP, size)
      ? KLEIN_RIGID_90_TAKEUP[size]
      : null;
  }
  return null;
}

export function kleinSupportsMaterial(materialSystem) {
  return materialSystem === "emt" || materialSystem === "rigid_imc";
}
