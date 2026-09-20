import { fittingVisibleInCategories } from "./runTakeoff";
import { calculateAreaTrade } from "./tradeCalcs";

function inchesToDisplay(inches) {
  const n = Number(inches);
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

export function buildRunMaterialList({
  preset,
  categories = {},
  size,
  conduitType = "EMT",
  materialTotals,
  extraLines = {},
  includeZeroFittings = true,
}) {
  const terms = preset.terminology;
  const summary = [
    { label: terms.sizeLabel, value: size },
    { label: "Total Known Length", value: `${inchesToDisplay(materialTotals.totalKnownLength)} in` },
    { label: "Total Estimated Takeoff", value: `${inchesToDisplay(materialTotals.totalTakeoff)} in` },
    {
      label: "Total Estimated Cut Length",
      value: `${inchesToDisplay(materialTotals.totalCutLength)} in`,
    },
  ];

  const rows = [];
  const showRunFootage =
    preset.id === "pipe" ||
    preset.id === "plumbing" ||
    (preset.id === "hvac" && categories.duct !== false) ||
    (preset.id === "electrical" && categories.conduit !== false);

  if (showRunFootage) {
    const extras = { conduitType };
    rows.push({
      item: terms.materialRunLabel(size, extras),
      qty: `${inchesToDisplay(materialTotals.totalCutLength)} in`,
    });
  }

  for (const fittingId of preset.fittingIds) {
    if (!fittingVisibleInCategories(preset, fittingId, categories)) continue;
    const qty = Number(materialTotals.fittingTotals[fittingId]) || 0;
    if (!includeZeroFittings && !qty) continue;
    const def = preset.fittings.find((item) => item.id === fittingId);
    rows.push({ item: def?.countLabel || fittingId, qty: String(qty) });
  }

  if (preset.id === "hvac" && categories.insulation) {
    rows.push({
      item: "Duct insulation (est., same LF as duct — verify coverage)",
      qty: `${inchesToDisplay(materialTotals.totalCutLength)} in`,
    });
  }
  if (preset.id === "hvac" && extraLines.flexFeet) {
    const flex = Number(extraLines.flexFeet);
    if (Number.isFinite(flex) && flex > 0) {
      rows.push({ item: "Flex duct (ft, as entered)", qty: flex.toFixed(2) });
    }
  }
  if (preset.id === "hvac" && categories.equipment) {
    const count = Number(extraLines.equipmentCount) || 0;
    if (includeZeroFittings || count) {
      rows.push({ item: "Equipment (count, as entered)", qty: String(count) });
    }
  }
  if (preset.id === "electrical" && categories.conductors) {
    const feet = Number(extraLines.conductorFeet);
    if (Number.isFinite(feet) && feet > 0) {
      rows.push({ item: "Wire / conductors (ft, as entered — not NEC fill)", qty: feet.toFixed(2) });
    }
  }

  const assumptions = [];
  if (preset.chartNote) assumptions.push(preset.chartNote);
  if (preset.id === "electrical") {
    assumptions.push("Conductor footage is only listed when you enter it. No fill calculation is performed.");
  }
  if (preset.id === "hvac") {
    assumptions.push("Straight duct quantity uses estimated cut length from the run chart, not a developed fitting blank.");
  }

  return { summary, rows, assumptions };
}

export function buildMaterialList(args) {
  const { preset, tradeInputs } = args;
  if (preset.layout === "area") {
    const result = calculateAreaTrade(preset.id, tradeInputs);
    return {
      summary: (result?.summary || []).map((line) => ({ label: "", value: line })),
      rows: result?.rows || [],
      assumptions: result?.assumptions || [],
      warnings: result?.warnings || [],
      preview: result?.preview || null,
      areaResult: result,
    };
  }
  return buildRunMaterialList(args);
}

export function materialListUsesTerminology(rows, needle) {
  const lower = String(needle).toLowerCase();
  return rows.some((row) => String(row.item).toLowerCase().includes(lower));
}
