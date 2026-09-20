/**
 * Charlotte Pipe ABS/PVC DWV dimensional catalog — reference only.
 *
 * Primary source (inspected 2026-09-19):
 * Charlotte Pipe, Plastic DWV Pipe and Fitting Dimensions, DC-DWV (updated April 7, 2026)
 * https://www.charlottepipe.com/Documents/DimensionalCatalogs/Plastic_Pipe_Fittings_DC-DWV%28609%29.pdf
 *
 * Spears Super Sourcebook was listed as a secondary/reference index only.
 * It was not used to invent takeoff numbers.
 *
 * WHY TAKEOFF CELLS ARE NOT AUTO-FILLED
 * The catalog lists lettered dimensions (A, B, C, …) beside each fitting.
 * The PDF text extract does not include the fitting drawings or a legend that
 * states, for each letter, whether A is center-to-end, hub face, socket
 * depth, or laying length.
 *
 * The app deducts takeoff from Known Length:
 *   cutLength = knownLength − startTakeoff − endTakeoff
 *
 * Mapping catalog A into that deduction is only valid if A is the same
 * quantity the calculator subtracts. Without an unambiguous drawing-to-letter
 * mapping, filling those cells would silently mis-cut pipe.
 *
 * Hub table C values resemble ASTM socket depths (e.g. 2" → 0.750") but the
 * column headers were not preserved in extract. Socket depth alone is also
 * not the cut-length takeoff for a 90.
 *
 * Therefore Charlotte is a selectable manufacturer for PVC DWV / ABS DWV
 * architecture, and catalog letters are stored here for a future mapper.
 * Production takeoff remains blank until a drawing-backed mapping is added.
 */

export const CHARLOTTE_CHART_META = {
  sourceType: "unverified",
  sourceName: "Charlotte Pipe — Plastic DWV Pipe and Fitting Dimensions (DC-DWV)",
  sourceUrl:
    "https://www.charlottepipe.com/Documents/DimensionalCatalogs/Plastic_Pipe_Fittings_DC-DWV%28609%29.pdf",
  manufacturer: "Charlotte Pipe",
  chartName: "DC-DWV dimensional catalog (updated April 7, 2026)",
  chartVersion: "DC-DWV © 1977-2026; catalog updated April 7, 2026",
  verifiedAt: "2026-09-19",
  materialSystem: ["pvc_dwv", "abs_dwv"],
  notes:
    "Catalog inspected. Letter dimensions were not mapped into cut-length takeoff because fitting drawings/legends were not unambiguous in the source extract.",
};

function frac(whole, num, den) {
  return whole + num / den;
}

/**
 * Part 300 1/4 Bend (Sanitary 90° Ell) ALL HUB — published dimension A only.
 * Interpretation of A is NOT mapped to takeoff.
 * PVC vs ABS differs at 2".
 */
export const CHARLOTTE_PART_300_QUARTER_BEND_A = {
  pvc_dwv: {
    '1-1/4"': frac(1, 9, 16),
    '1-1/2"': frac(1, 3, 4),
    '2"': frac(2, 5, 16),
    '3"': frac(3, 1, 16),
    '4"': frac(3, 7, 8),
    '6"': 5,
  },
  abs_dwv: {
    '1-1/2"': frac(1, 3, 4),
    '2"': frac(2, 1, 4),
    '3"': frac(3, 1, 16),
    '4"': frac(3, 7, 8),
    '6"': 5,
  },
};

/**
 * Part 321 1/8 Bend (45° Ell) HUB X HUB — published dimension A only.
 * Not mapped to takeoff.
 */
export const CHARLOTTE_PART_321_EIGHTH_BEND_A = {
  pvc_dwv: {
    '1-1/4"': 1,
    '1-1/2"': frac(1, 1, 8),
    '2"': frac(1, 1, 2),
    '3"': frac(1, 3, 4),
    '4"': frac(2, 3, 16),
    '6"': frac(2, 1, 16),
  },
  abs_dwv: {
    '1-1/2"': frac(1, 1, 8),
    '2"': frac(1, 1, 2),
    '3"': frac(1, 3, 4),
    '4"': frac(2, 3, 16),
    '6"': frac(2, 1, 16),
  },
};

export const CHARLOTTE_UNMAPPED_REASON =
  "Charlotte catalog dimension letters were not mapped into PipeSketch cut-length takeoff because the fitting drawings do not make center-to-end vs socket vs laying length unambiguous for this calculator.";

export function charlotteSupportsMaterial(materialSystem) {
  return materialSystem === "pvc_dwv" || materialSystem === "abs_dwv";
}
