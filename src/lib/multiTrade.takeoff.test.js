import assert from "node:assert/strict";
import { test } from "vitest";

import { EMPTY_FITTING_COUNTS, FITTING_TYPES } from "./constants";
import {
  buildJobSnapshot,
  createDefaultSegment,
  createEmptyJobMeta,
  snapshotToEditorState,
} from "./jobSnapshot";
import { buildMaterialList, materialListUsesTerminology } from "./materialList";
import {
  computeMaterialTotals,
  computeOverallLengthCalc,
  computeSegmentRows,
} from "./runTakeoff";
import { createDefaultTakeoffTables, unwrapStandardsBlob, wrapStandardsBlob } from "./standardsBundle";
import { cloneDefaultTakeoffTable, DEFAULT_TAKEOFF_TABLE, getTakeoff } from "./takeoff";
import { fittingButtonLabel, getPreset } from "./takeoffPresets";
import {
  buildResetStateForType,
  hasMeaningfulTakeoffData,
} from "./takeoffSwitch";
import { calculateConcrete, calculateDrywall, calculateFraming } from "./tradeCalcs";
import { normalizeTakeoffType } from "./takeoffTypes";

function pipeTotals(segments, extraFittings = { ...EMPTY_FITTING_COUNTS }) {
  const table = cloneDefaultTakeoffTable();
  const segmentRows = computeSegmentRows(segments, table, '2"');
  return computeMaterialTotals({
    materialSource: "manual",
    fittingTypes: FITTING_TYPES,
    extraFittings,
    overallMaterialFittings: { ...EMPTY_FITTING_COUNTS },
    segmentRows,
    takeoffTable: table,
    size: '2"',
  });
}

test("1. old saved Pipe job loads as pipe", () => {
  const state = snapshotToEditorState({
    job_name: "Boiler Room",
    pipe_size: '2"',
    segments: [createDefaultSegment()],
    fittings: { extraFittings: { ...EMPTY_FITTING_COUNTS, flange: 2 } },
    calculator_state: {},
  });
  assert.equal(state.takeoffType, "pipe");
  assert.equal(normalizeTakeoffType(undefined), "pipe");
  assert.equal(normalizeTakeoffType(""), "pipe");
});

test("2. Pipe calculations remain unchanged (90s are size + half via table)", () => {
  assert.equal(DEFAULT_TAKEOFF_TABLE['2"']["90 elbow"], 3);
  assert.equal(getTakeoff(DEFAULT_TAKEOFF_TABLE, '2"', "90 elbow"), 3);

  const rows = computeSegmentRows(
    [
      {
        id: 1,
        label: "Run 1",
        knownLength: "120",
        direction: "east",
        startFitting: "none",
        endFitting: "90 elbow",
      },
    ],
    cloneDefaultTakeoffTable(),
    '2"'
  );
  assert.equal(rows[0].totalTakeoff, 3);
  assert.equal(rows[0].cutLength, 117);

  const overall = computeOverallLengthCalc({
    overallLength: "120",
    overallUnit: "inches",
    overallSize: '2"',
    overallFittings: { ...EMPTY_FITTING_COUNTS, "90 elbow": 1 },
    takeoffTable: cloneDefaultTakeoffTable(),
    fittingTypes: FITTING_TYPES,
  });
  assert.equal(overall.overallInches, 120);
  assert.equal(overall.totalTakeoff, 3);
  assert.equal(overall.straightCutLength, 117);
});

test("3. Switching preset updates chart/controls", () => {
  const pipe = getPreset("pipe");
  const hvac = getPreset("hvac");
  const electrical = getPreset("electrical");
  assert.deepEqual(pipe.fittingIds, FITTING_TYPES);
  assert.equal(fittingButtonLabel(pipe, "tee"), "Add tee");
  assert.ok(hvac.fittingIds.includes("transition"));
  assert.equal(fittingButtonLabel(hvac, "transition"), "Add Transition");
  assert.ok(electrical.fittingIds.includes("offset"));
  assert.notDeepEqual(hvac.sizes, pipe.sizes);
  const reset = buildResetStateForType("electrical", createEmptyJobMeta());
  assert.equal(reset.takeoffType, "electrical");
  assert.equal(reset.pipeSize, '3/4"');
});

test("4. HVAC material list uses HVAC terminology", () => {
  const preset = getPreset("hvac");
  const list = buildMaterialList({
    preset,
    categories: preset.defaultCategories,
    size: "12x8",
    materialTotals: {
      fittingTotals: Object.fromEntries(preset.fittingIds.map((id) => [id, 0])),
      totalKnownLength: 120,
      totalCutLength: 108,
      totalTakeoff: 12,
    },
    tradeInputs: {},
    includeZeroFittings: true,
  });
  assert.ok(materialListUsesTerminology(list.rows, "duct"));
  assert.equal(materialListUsesTerminology(list.rows, "Pipe ("), false);
  assert.equal(materialListUsesTerminology(list.rows, "flange"), false);
});

test("5. Electrical material list uses electrical terminology", () => {
  const preset = getPreset("electrical");
  const list = buildMaterialList({
    preset,
    categories: preset.defaultCategories,
    size: '3/4"',
    conduitType: "EMT",
    materialTotals: {
      fittingTotals: Object.fromEntries(preset.fittingIds.map((id) => [id, 1])),
      totalKnownLength: 120,
      totalCutLength: 110,
      totalTakeoff: 10,
    },
    extraLines: { conductorFeet: 200 },
    includeZeroFittings: false,
  });
  assert.ok(materialListUsesTerminology(list.rows, "conduit"));
  assert.ok(materialListUsesTerminology(list.rows, "conductor"));
  assert.equal(materialListUsesTerminology(list.rows, "Pipe (2"), false);
  assert.equal(preset.terminology.printMaterialTitle.includes("Electrical"), true);
});

test("6. Plumbing material list uses plumbing terminology", () => {
  const preset = getPreset("plumbing");
  const list = buildMaterialList({
    preset,
    categories: preset.defaultCategories,
    size: '2"',
    materialTotals: {
      fittingTotals: Object.fromEntries(preset.fittingIds.map((id) => [id, 1])),
      totalKnownLength: 80,
      totalCutLength: 70,
      totalTakeoff: 10,
    },
    includeZeroFittings: false,
  });
  assert.ok(materialListUsesTerminology(list.rows, "wye") || materialListUsesTerminology(list.rows, "trap"));
  assert.equal(preset.terminology.printMaterialTitle.includes("Plumbing"), true);
  assert.equal(preset.terminology.runsTitle, "Plumbing Runs");
});

test("7. Framing count math on a simple known wall", () => {
  const result = calculateFraming({
    wallLength: "16",
    wallLengthUnit: "feet",
    wallHeight: "8",
    studSpacing: "16",
    corners: "0",
    doors: "0",
    windows: "0",
    topPlates: "2",
    bottomPlates: "1",
    extraStudsPerCorner: "2",
    extraStudsPerDoor: "4",
    extraStudsPerWindow: "4",
    doorWidth: "3",
    windowWidth: "3",
    framingWastePct: "10",
    includeSheathing: false,
  });
  assert.equal(result.values.baseStuds, 13);
  assert.equal(result.values.studs, 15);
  assert.equal(result.values.topPlateLf.toFixed(2), "35.20");
  assert.equal(result.values.bottomPlateLf.toFixed(2), "17.60");
});

test("8. Drywall sheet count on a simple known wall", () => {
  const result = calculateDrywall({
    drywallWidth: "12",
    drywallHeight: "8",
    wallCount: "1",
    ceilingEnabled: false,
    sheetWidth: "4",
    sheetHeight: "8",
    openingCount: "0",
    openingWidth: "3",
    openingHeight: "7",
    drywallWastePct: "10",
    tapeFactor: "0.37",
    includeTape: true,
    compoundGalPer1000: "",
  });
  assert.equal(result.values.netArea, 96);
  assert.equal(result.values.sheets, 4);
});

test("9. Concrete volume conversion on simple dimensions", () => {
  const result = calculateConcrete({
    concreteSubType: "concrete",
    concLength: "10",
    concWidth: "10",
    concDepth: "4",
    concLengthUnit: "feet",
    concWidthUnit: "feet",
    concDepthUnit: "inches",
    concWastePct: "5",
  });
  assert.ok(Math.abs(result.values.cubicFeet - 33.333) < 0.01);
  assert.ok(Math.abs(result.values.cubicYards - 1.23457) < 0.001);
  assert.ok(Math.abs(result.values.cubicYardsWithWaste - 1.2963) < 0.001);
});

test("10. Save/load preserves takeoff_type", () => {
  const snapshot = buildJobSnapshot({
    id: "local-1",
    job: { ...createEmptyJobMeta(), name: "HVAC job" },
    pipeSize: "12x8",
    segments: [createDefaultSegment()],
    extraFittings: {},
    rotateTurns: 0,
    flipped: false,
    overallLength: "120",
    overallUnit: "inches",
    overallPipeSize: "12x8",
    overallFittings: {},
    overallSketchMode: "none",
    overallSketchLength: 0,
    materialSource: "manual",
    overallMaterialFittings: {},
    calculatorRuns: [],
    takeoffTable: null,
    takeoffType: "hvac",
    categories: getPreset("hvac").defaultCategories,
    tradeInputs: {},
    conduitType: "EMT",
  });
  assert.equal(snapshot.takeoff_type, "hvac");
  assert.equal(snapshot.calculator_state.takeoff_type, "hvac");
  assert.equal(snapshot.fittings.takeoff_type, "hvac");
  const loaded = snapshotToEditorState(snapshot);
  assert.equal(loaded.takeoffType, "hvac");
});

test("11. PDF title/material headings reflect selected trade", () => {
  assert.equal(getPreset("pipe").terminology.printSubtitle.includes("pipe"), true);
  assert.equal(getPreset("hvac").terminology.printMaterialTitle.includes("HVAC"), true);
  assert.equal(getPreset("electrical").terminology.printMaterialTitle.includes("Electrical"), true);
  assert.equal(getPreset("plumbing").terminology.printMaterialTitle.includes("Plumbing"), true);
  assert.equal(getPreset("framing").terminology.printMaterialTitle.includes("Framing"), true);
  assert.equal(getPreset("drywall").terminology.printMaterialTitle.includes("Drywall"), true);
  assert.equal(getPreset("concrete").terminology.printMaterialTitle.includes("Concrete"), true);
});

test("12. Switching presets clears incompatible calculation state safely", () => {
  const dirty = hasMeaningfulTakeoffData(
    {
      segments: [{ ...createDefaultSegment(), knownLength: "240" }],
      extraFittings: { ...EMPTY_FITTING_COUNTS, tee: 2 },
      overallFittings: { ...EMPTY_FITTING_COUNTS },
      calculatorRuns: [{ id: "run-1", length: "", unit: "inches", direction: "east" }],
      tradeInputs: {},
    },
    getPreset("pipe")
  );
  assert.equal(dirty, true);

  const clean = hasMeaningfulTakeoffData(
    {
      segments: [createDefaultSegment()],
      extraFittings: { ...EMPTY_FITTING_COUNTS },
      overallFittings: { ...EMPTY_FITTING_COUNTS },
      calculatorRuns: [{ id: "run-1", length: "", unit: "inches", direction: "east" }],
      tradeInputs: {},
    },
    getPreset("pipe")
  );
  assert.equal(clean, false);

  const reset = buildResetStateForType("drywall", { name: "Keep me", customer: "Acme", location: "", date: "", notes: "" });
  assert.equal(reset.job.name, "Keep me");
  assert.equal(reset.takeoffType, "drywall");
  assert.equal(Number(reset.extraFittings["90 elbow"] || 0), 0);
});

test("old pipe takeoff blob still unwraps as pipe table", () => {
  const old = cloneDefaultTakeoffTable();
  const unwrapped = unwrapStandardsBlob(old);
  assert.equal(unwrapped.tables.pipe['2"']["90 elbow"], 3);
  const wrapped = wrapStandardsBlob(createDefaultTakeoffTables(), "hvac");
  assert.equal(wrapped['2"']["90 elbow"], 3);
  assert.equal(wrapped._defaultTakeoffType, "hvac");
  assert.ok(wrapped._tradeTables.hvac);
});

test("pipe material totals still count start/end fittings", () => {
  const totals = pipeTotals([createDefaultSegment()]);
  assert.equal(totals.fittingTotals["90 elbow"], 1);
  assert.equal(totals.totalCutLength, 117);
});
