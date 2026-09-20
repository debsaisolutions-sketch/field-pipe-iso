/** Shared chart selection ids. No SQL — stored on jobs/standards JSON. */

export const CHART_IDS = {
  kleinHandBender: "klein-hand-bender",
  charlotteDwv: "charlotte-dwv",
  companyCustom: "company_custom",
  smacnaUnloaded: "smacna-unloaded",
};

export const ELECTRICAL_MATERIALS = [
  { id: "emt", label: "EMT" },
  { id: "rigid_imc", label: "Rigid / IMC" },
  { id: "pvc", label: "PVC" },
  { id: "company_custom", label: "Company Custom" },
];

export const ELECTRICAL_CHARTS = [
  { id: CHART_IDS.kleinHandBender, label: "Klein Hand Bender" },
  { id: CHART_IDS.companyCustom, label: "Company Custom" },
];

export const PLUMBING_MATERIALS = [
  { id: "pvc_dwv", label: "PVC DWV" },
  { id: "abs_dwv", label: "ABS DWV" },
  { id: "copper", label: "Copper" },
  { id: "cpvc", label: "CPVC" },
  { id: "pex", label: "PEX" },
  { id: "cast_iron", label: "Cast Iron" },
  { id: "company_custom", label: "Company Custom" },
];

export const PLUMBING_CHARTS = [
  { id: CHART_IDS.charlotteDwv, label: "Charlotte Pipe" },
  { id: CHART_IDS.companyCustom, label: "Company Custom" },
];

export const HVAC_MATERIALS = [
  { id: "rectangular", label: "Rectangular" },
  { id: "round", label: "Round" },
  { id: "flex", label: "Flex" },
];

export const HVAC_CHARTS = [
  { id: CHART_IDS.companyCustom, label: "Company Custom" },
  { id: CHART_IDS.smacnaUnloaded, label: "SMACNA (not loaded)", disabled: true },
];

export const DEFAULT_CHART_SELECTION = {
  electrical: {
    materialSystem: "emt",
    chartId: CHART_IDS.kleinHandBender,
  },
  plumbing: {
    materialSystem: "pvc_dwv",
    chartId: CHART_IDS.charlotteDwv,
  },
  hvac: {
    materialSystem: "rectangular",
    chartId: CHART_IDS.companyCustom,
  },
};

export function emptyChartSelection() {
  return {
    electrical: { ...DEFAULT_CHART_SELECTION.electrical },
    plumbing: { ...DEFAULT_CHART_SELECTION.plumbing },
    hvac: { ...DEFAULT_CHART_SELECTION.hvac },
  };
}
