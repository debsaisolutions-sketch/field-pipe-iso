import { formatDirectionLabel, formatRunLength, toInches } from "./geometry";
import { getTakeoff } from "./takeoff";

function nonNegative(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Same math as the original Pipe & Runs cut-length rows. */
export function computeSegmentRows(segments, takeoffTable, size) {
  return (segments || []).map((segment) => {
    const known = nonNegative(segment.knownLength);
    const startTakeoff = getTakeoff(takeoffTable, size, segment.startFitting);
    const endTakeoff = getTakeoff(takeoffTable, size, segment.endFitting);
    const totalTakeoff = startTakeoff + endTakeoff;
    const cutLength = Math.max(known - totalTakeoff, 0);
    return {
      ...segment,
      known,
      startTakeoff,
      endTakeoff,
      totalTakeoff,
      cutLength,
    };
  });
}

export function filterSegmentRows(segmentRows, preset, categories = {}) {
  if (preset.id !== "plumbing") return segmentRows;
  return segmentRows.filter((segment) => {
    const system = segment.system === "dwv" ? "dwv" : "water";
    if (system === "dwv") return categories.dwv !== false;
    return categories.water !== false;
  });
}

export function fittingVisibleInCategories(preset, fittingId, categories = {}) {
  const def = preset.fittings.find((item) => item.id === fittingId);
  const category = def?.category || "all";
  if (category === "all") return true;
  if (preset.id === "plumbing") {
    if (category === "dwv") return categories.dwv !== false;
    if (category === "water") return categories.water !== false;
    return true;
  }
  return categories[category] !== false;
}

/** Same totals logic as the original Material List, with preset fitting ids. */
export function computeMaterialTotals({
  materialSource,
  fittingTypes,
  extraFittings,
  overallMaterialFittings,
  segmentRows,
  takeoffTable,
  size,
}) {
  if (materialSource === "overall") {
    const fittingTotals = Object.fromEntries(
      fittingTypes.map((fitting) => [fitting, overallMaterialFittings[fitting] || 0])
    );
    const totalKnownLength = segmentRows.reduce((sum, segment) => sum + segment.known, 0);
    const totalCutLength = segmentRows.reduce((sum, segment) => sum + segment.cutLength, 0);
    const totalTakeoff = fittingTypes.reduce((sum, fitting) => {
      const count = Number(overallMaterialFittings[fitting]) || 0;
      return sum + count * getTakeoff(takeoffTable, size, fitting);
    }, 0);

    return {
      fittingTotals,
      totalKnownLength,
      totalCutLength,
      totalTakeoff,
    };
  }

  const fittingTotals = Object.fromEntries(
    fittingTypes.map((fitting) => [fitting, extraFittings[fitting] || 0])
  );

  for (const segment of segmentRows) {
    if (segment.startFitting !== "none") {
      fittingTotals[segment.startFitting] = (fittingTotals[segment.startFitting] || 0) + 1;
    }
    if (segment.endFitting !== "none") {
      fittingTotals[segment.endFitting] = (fittingTotals[segment.endFitting] || 0) + 1;
    }
  }

  const totalKnownLength = segmentRows.reduce((sum, segment) => sum + segment.known, 0);
  const totalCutLength = segmentRows.reduce((sum, segment) => sum + segment.cutLength, 0);
  const totalTakeoff = segmentRows.reduce((sum, segment) => sum + segment.totalTakeoff, 0);

  return {
    fittingTotals,
    totalKnownLength,
    totalCutLength,
    totalTakeoff,
  };
}

export function computeOverallLengthCalc({
  overallLength,
  overallUnit,
  overallSize,
  overallFittings,
  takeoffTable,
  fittingTypes,
}) {
  const overallInches = nonNegative(toInches(overallLength, overallUnit));

  const totalTakeoff = fittingTypes.reduce((sum, fitting) => {
    const count = Number(overallFittings[fitting]) || 0;
    return sum + count * getTakeoff(takeoffTable, overallSize, fitting);
  }, 0);

  const straightCutLength = overallInches - totalTakeoff;

  return {
    overallInches,
    totalTakeoff,
    straightCutLength,
    isNonPositive: straightCutLength <= 0,
  };
}

export function formatDuctDimension(segment, fallbackSize) {
  const shape = segment?.ductShape || (String(fallbackSize || "").includes("x") ? "rect" : "round");
  if (shape === "round") {
    const diameter = segment?.ductDiameter || fallbackSize || "";
    return diameter ? `Ø${diameter}` : "";
  }
  const width = segment?.ductWidth;
  const height = segment?.ductHeight;
  if (width && height) return `${width}x${height}`;
  return fallbackSize || "";
}

export function formatRunDrawingLabel(segment, index, preset, size, extras = {}) {
  const runText = segment?.label || `Run ${index + 1}`;
  const lengthText = `${formatRunLength(segment?.known)} in`;
  const directionText = formatDirectionLabel(segment?.direction);

  if (preset.id === "hvac") {
    const dim = formatDuctDimension(segment, size);
    return dim
      ? `${runText} • ${dim} • ${lengthText} • ${directionText}`
      : `${runText} • ${lengthText} • ${directionText}`;
  }

  if (preset.id === "electrical") {
    const type = segment?.conduitType || extras.conduitType || "EMT";
    return `${runText} • ${type} ${size} • ${lengthText} • ${directionText}`;
  }

  if (preset.id === "plumbing" && segment?.system) {
    const system = segment.system === "dwv" ? "DWV" : "Water";
    return `${runText} • ${system} • ${lengthText} • ${directionText}`;
  }

  return `${runText} • ${lengthText} • ${directionText}`;
}
