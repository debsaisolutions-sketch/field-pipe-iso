import { emptyFittingCounts } from "./constants";
import {
  createDefaultCalculatorRuns,
  createDefaultSegment,
} from "./jobSnapshot";
import { getPreset } from "./takeoffPresets";
import { createDefaultTradeInputs } from "./tradeCalcs";
import { normalizeTakeoffType } from "./takeoffTypes";

export function createDefaultSegmentForPreset(preset, id = 1, index = 0) {
  if (!preset || preset.id === "pipe") {
    if (id === 1 && index === 0) return createDefaultSegment();
    return {
      id,
      label: `Run ${index + 1}`,
      knownLength: "",
      direction: "east",
      startFitting: "none",
      endFitting: "none",
    };
  }

  const extras = {};
  if (preset.id === "hvac") {
    extras.ductShape = "rect";
    extras.ductWidth = "12";
    extras.ductHeight = "8";
    extras.ductDiameter = "8";
  }
  if (preset.id === "electrical") {
    extras.conduitType = "EMT";
  }
  if (preset.id === "plumbing") {
    extras.system = "water";
  }

  return {
    id,
    label: `Run ${index + 1}`,
    knownLength: index === 0 ? "120" : "",
    direction: "east",
    startFitting: "none",
    endFitting: "none",
    ...extras,
  };
}

function countsAreEmpty(counts) {
  return Object.values(counts || {}).every((value) => !Number(value));
}

function sameSegmentDefaults(segment, preset) {
  const expected = createDefaultSegmentForPreset(preset);
  return (
    String(segment.knownLength ?? "") === String(expected.knownLength ?? "") &&
    (segment.startFitting || "none") === expected.startFitting &&
    (segment.endFitting || "none") === expected.endFitting &&
    (segment.direction || "east") === expected.direction
  );
}

export function hasMeaningfulTakeoffData(state, preset) {
  if (!preset) return false;

  if (preset.layout === "area") {
    const defaults = createDefaultTradeInputs();
    const current = state.tradeInputs || {};
    return Object.keys(defaults).some((key) => String(current[key] ?? "") !== String(defaults[key] ?? ""));
  }

  const extra = !countsAreEmpty(state.extraFittings);
  const overall = !countsAreEmpty(state.overallFittings);
  const extraRuns = (state.segments || []).length > 1;
  const calcFilled = (state.calculatorRuns || []).some((run) => Number(run.length) > 0);
  const first = state.segments?.[0];
  const firstChanged = first ? !sameSegmentDefaults(first, preset) : false;
  const flex = Number(state.tradeInputs?.hvacFlexFeet) > 0;
  const conductors = Number(state.tradeInputs?.conductorFeet) > 0;
  return extra || overall || extraRuns || calcFilled || firstChanged || flex || conductors;
}

export function buildResetStateForType(type, job) {
  const preset = getPreset(type);
  const empty = emptyFittingCounts(preset.fittingIds);
  return {
    takeoffType: normalizeTakeoffType(type),
    categories: { ...preset.defaultCategories },
    pipeSize: preset.defaultSize || '2"',
    overallPipeSize: preset.defaultSize || '2"',
    segments: preset.layout === "runs" ? [createDefaultSegmentForPreset(preset)] : [createDefaultSegment()],
    extraFittings: empty,
    overallFittings: { ...empty },
    overallMaterialFittings: { ...empty },
    materialSource: "manual",
    calculatorRuns: createDefaultCalculatorRuns(),
    overallLength: "120",
    overallUnit: "inches",
    overallSketchMode: "none",
    overallSketchLength: 0,
    rotateTurns: 0,
    flipped: false,
    tradeInputs: createDefaultTradeInputs(),
    conduitType: "EMT",
    job,
  };
}

export const SWITCH_WARNING =
  "Switching takeoff type will clear run lengths, fittings, and trade calculations. Job info will be kept. Continue?";
