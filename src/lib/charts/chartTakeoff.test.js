import assert from "node:assert/strict";
import { test } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { DEFAULT_TAKEOFF_TABLE, cloneDefaultTakeoffTable } from "../takeoff";
import { PIPE_SIZES } from "../constants";
import {
  buildJobSnapshot,
  createDefaultSegment,
  snapshotToEditorState,
} from "../jobSnapshot";
import { computeSegmentRows } from "../runTakeoff";
import { createDefaultTakeoffTables, unwrapStandardsBlob, wrapStandardsBlob } from "../standardsBundle";
import { buildResetStateForType } from "../takeoffSwitch";
import { calculateFraming, createDefaultTradeInputs } from "../tradeCalcs";
import { CHART_IDS, emptyChartSelection } from "./chartTypes";
import { klein90Takeup } from "./electricalKlein";
import {
  CHARLOTTE_PART_300_QUARTER_BEND_A,
  charlotteSupportsMaterial,
} from "./plumbingCharlotte";
import {
  emptyElectricalTable,
  emptyPlumbingTable,
  inferChartSelectionFromStoredTables,
  legacyPlumbingFromWelding,
  LEGACY_ELECTRICAL_TAKEOFF_TABLE,
  normalizeChartSelection,
  resolveActiveTakeoffChart,
  resolveElectricalChart,
  resolvePlumbingChart,
} from "./resolveTakeoffChart";

test("Klein EMT 90 take-up matches published stub-up table", () => {
  assert.equal(klein90Takeup("emt", '1/2"'), 5);
  assert.equal(klein90Takeup("emt", '3/4"'), 6);
  assert.equal(klein90Takeup("emt", '1"'), 8);
  assert.equal(klein90Takeup("emt", '1-1/4"'), 11);

  const resolved = resolveElectricalChart({
    materialSystem: "emt",
    chartId: CHART_IDS.kleinHandBender,
    customTable: emptyElectricalTable(),
  });
  assert.equal(resolved.table['1/2"']["90 bend"], 5);
  assert.equal(resolved.table['3/4"']["90 bend"], 6);
  assert.equal(resolved.table['1"']["90 bend"], 8);
  assert.equal(resolved.table['1-1/4"']["90 bend"], 11);
  assert.equal(resolved.cellMeta['1/2"']["90 bend"].verificationStatus, "verified_chart");
  assert.equal(resolved.cellMeta['1/2"']["90 bend"].editable, false);
  assert.equal(resolved.status.kind, "verified");
  assert.match(resolved.status.detail, /Klein Tools/);
});

test("Klein Rigid 90 take-up uses published paired values only", () => {
  assert.equal(klein90Takeup("rigid_imc", '1/2"'), 6);
  assert.equal(klein90Takeup("rigid_imc", '3/4"'), 8);
  assert.equal(klein90Takeup("rigid_imc", '1"'), 11);
  assert.equal(klein90Takeup("rigid_imc", '1-1/4"'), null);

  const resolved = resolveElectricalChart({
    materialSystem: "rigid_imc",
    chartId: CHART_IDS.kleinHandBender,
  });
  assert.equal(resolved.table['1/2"']["90 bend"], 6);
  assert.equal(resolved.table['1-1/4"']["90 bend"], 0);
  assert.equal(resolved.cellMeta['1-1/4"']["90 bend"].verificationStatus, "unverified");
});

test("unsupported electrical combinations do not silently receive a verified value", () => {
  const emt = resolveElectricalChart({
    materialSystem: "emt",
    chartId: CHART_IDS.kleinHandBender,
  });
  assert.equal(emt.table['2"']["90 bend"], 0);
  assert.notEqual(emt.cellMeta['2"']["90 bend"].verificationStatus, "verified_chart");
  assert.equal(emt.table['3/4"']["45 bend"], 0);
  assert.equal(emt.table['3/4"'].offset, 0);
  assert.equal(emt.table['3/4"'].LB, 0);
  assert.notEqual(emt.cellMeta['3/4"']["45 bend"].verificationStatus, "verified_chart");
});

test("PVC does not inherit EMT Klein values", () => {
  const viaActive = resolveActiveTakeoffChart({
    takeoffType: "electrical",
    chartSelection: {
      electrical: { materialSystem: "pvc", chartId: CHART_IDS.kleinHandBender },
    },
    takeoffTables: { electrical: emptyElectricalTable() },
  });
  assert.equal(viaActive.table['1/2"']["90 bend"], 0);
  assert.equal(viaActive.table['3/4"']["90 bend"], 0);
  assert.notEqual(viaActive.status.kind, "verified");
  assert.equal(viaActive.cellMeta['3/4"']["90 bend"].verificationStatus, "company_custom");

  const normalized = normalizeChartSelection({
    electrical: { materialSystem: "pvc", chartId: CHART_IDS.kleinHandBender },
  });
  assert.equal(normalized.electrical.chartId, CHART_IDS.companyCustom);
});

test("company custom can override Klein values and is not labeled verified", () => {
  const custom = emptyElectricalTable();
  custom['1/2"']["90 bend"] = 9;
  const resolved = resolveElectricalChart({
    materialSystem: "emt",
    chartId: CHART_IDS.companyCustom,
    customTable: custom,
  });
  assert.equal(resolved.table['1/2"']["90 bend"], 9);
  assert.equal(resolved.cellMeta['1/2"']["90 bend"].verificationStatus, "company_custom");
  assert.equal(resolved.status.kind, "unverified");
});

test("Klein 3/4 in EMT stub example: 8.5 in known length minus 6 in take-up", () => {
  const table = resolveElectricalChart({
    materialSystem: "emt",
    chartId: CHART_IDS.kleinHandBender,
  }).table;
  const rows = computeSegmentRows(
    [
      {
        ...createDefaultSegment(),
        knownLength: "8.5",
        startFitting: "none",
        endFitting: "90 bend",
      },
    ],
    table,
    '3/4"'
  );
  assert.equal(rows[0].totalTakeoff, 6);
  assert.equal(rows[0].cutLength, 2.5);
});

test("plumbing does not fall back to the welding table", () => {
  const welding = legacyPlumbingFromWelding();
  assert.equal(welding['2"']["90 elbow"], DEFAULT_TAKEOFF_TABLE['2"']["90 elbow"]);

  const charlotte = resolvePlumbingChart({
    materialSystem: "pvc_dwv",
    chartId: CHART_IDS.charlotteDwv,
    customTable: welding,
  });
  assert.equal(charlotte.table['2"']["90 elbow"], 0);
  assert.notEqual(charlotte.table['2"']["90 elbow"], DEFAULT_TAKEOFF_TABLE['2"']["90 elbow"]);
  assert.match(charlotte.status.label, /Chart not verified/);

  const unwrapped = unwrapStandardsBlob({
    ...cloneDefaultTakeoffTable(),
    _tradeTables: { plumbing: welding, electrical: LEGACY_ELECTRICAL_TAKEOFF_TABLE },
  });
  assert.equal(unwrapped.tables.plumbing['2"']["90 elbow"], 0);
  assert.notEqual(unwrapped.tables.plumbing['2"']["90 elbow"], 3);
});

test("Charlotte catalog letters are not mapped into takeoff cells", () => {
  assert.equal(charlotteSupportsMaterial("pvc_dwv"), true);
  assert.equal(charlotteSupportsMaterial("abs_dwv"), true);
  assert.equal(charlotteSupportsMaterial("copper"), false);
  assert.ok(CHARLOTTE_PART_300_QUARTER_BEND_A.pvc_dwv['2"'] > 0);

  const pvc = resolvePlumbingChart({
    materialSystem: "pvc_dwv",
    chartId: CHART_IDS.charlotteDwv,
  });
  for (const size of PIPE_SIZES) {
    assert.equal(pvc.table[size]["90 elbow"], 0);
    assert.equal(pvc.table[size]["45 elbow"], 0);
    assert.equal(pvc.table[size].tee, 0);
    assert.equal(pvc.cellMeta[size]["90 elbow"].verificationStatus, "unverified");
  }

  const copper = normalizeChartSelection({
    plumbing: { materialSystem: "copper", chartId: CHART_IDS.charlotteDwv },
  });
  assert.equal(copper.plumbing.chartId, CHART_IDS.companyCustom);
  const copperResolved = resolvePlumbingChart({
    materialSystem: copper.plumbing.materialSystem,
    chartId: copper.plumbing.chartId,
  });
  assert.match(copperResolved.status.label, /Chart not verified|Company Custom/);
});

test("plumbing manufacturer selection persists in save/load", () => {
  const selection = emptyChartSelection();
  selection.plumbing.materialSystem = "abs_dwv";
  selection.plumbing.chartId = CHART_IDS.charlotteDwv;

  const snapshot = buildJobSnapshot({
    job: { name: "DWV", customer: "", location: "", date: "", notes: "" },
    pipeSize: '2"',
    segments: [createDefaultSegment()],
    extraFittings: {},
    rotateTurns: 0,
    flipped: false,
    overallLength: "120",
    overallUnit: "inches",
    overallPipeSize: '2"',
    overallFittings: {},
    overallSketchMode: "none",
    overallSketchLength: 0,
    materialSource: "manual",
    overallMaterialFittings: {},
    calculatorRuns: [],
    takeoffTable: emptyPlumbingTable(),
    takeoffType: "plumbing",
    categories: {},
    tradeInputs: createDefaultTradeInputs(),
    conduitType: "EMT",
    chartSelection: selection,
  });
  assert.equal(snapshot.calculator_state.chart_selection.plumbing.materialSystem, "abs_dwv");
  assert.equal(snapshot.calculator_state.chart_selection.plumbing.chartId, CHART_IDS.charlotteDwv);

  const loaded = snapshotToEditorState(snapshot);
  assert.equal(loaded.chartSelection.plumbing.materialSystem, "abs_dwv");
  assert.equal(loaded.chartSelection.plumbing.chartId, CHART_IDS.charlotteDwv);

  const wrapped = wrapStandardsBlob(createDefaultTakeoffTables(), "plumbing", selection);
  const unwrapped = unwrapStandardsBlob(wrapped);
  assert.equal(unwrapped.chartSelection.plumbing.materialSystem, "abs_dwv");
  assert.equal(unwrapped.chartSelection.plumbing.chartId, CHART_IDS.charlotteDwv);
});

test("old saved pipe jobs still load and pipe math is unchanged", () => {
  const state = snapshotToEditorState({
    job_name: "Boiler Room",
    pipe_size: '2"',
    segments: [createDefaultSegment()],
    fittings: {},
    calculator_state: {},
  });
  assert.equal(state.takeoffType, "pipe");
  assert.equal(DEFAULT_TAKEOFF_TABLE['2"']["90 elbow"], 3);

  const rows = computeSegmentRows(
    [
      {
        ...createDefaultSegment(),
        knownLength: "120",
        startFitting: "none",
        endFitting: "90 elbow",
      },
    ],
    cloneDefaultTakeoffTable(),
    '2"'
  );
  assert.equal(rows[0].cutLength, 117);
});

test("switching trade does not leak Klein or HVAC tables into pipe", () => {
  const klein = resolveActiveTakeoffChart({
    takeoffType: "electrical",
    chartSelection: emptyChartSelection(),
    takeoffTables: createDefaultTakeoffTables(),
  });
  const pipe = resolveActiveTakeoffChart({
    takeoffType: "pipe",
    chartSelection: emptyChartSelection(),
    takeoffTables: createDefaultTakeoffTables(),
  });
  assert.equal(klein.table['3/4"']["90 bend"], 6);
  assert.equal(pipe.table['2"']["90 elbow"], 3);
  assert.equal(pipe.table['3/4"']["90 elbow"], 1.125);

  const reset = buildResetStateForType("pipe", { name: "Keep", customer: "", location: "", date: "", notes: "" });
  assert.equal(reset.takeoffType, "pipe");
  assert.equal(reset.chartSelection.electrical.chartId, CHART_IDS.kleinHandBender);
});

test("empty stored electrical/plumbing tables infer manufacturer charts, not silent custom fill", () => {
  const inferred = inferChartSelectionFromStoredTables({
    electrical: emptyElectricalTable(),
    plumbing: emptyPlumbingTable(),
  });
  assert.equal(inferred.electrical.chartId, CHART_IDS.kleinHandBender);
  assert.equal(inferred.plumbing.chartId, CHART_IDS.charlotteDwv);
});

test("framing door and window heights are editable job assumptions that change sheathing", () => {
  const panel = fs.readFileSync(
    path.join(process.cwd(), "src/components/TradeInputsPanel.js"),
    "utf8"
  );
  assert.match(panel, /Door opening height/);
  assert.match(panel, /Window opening height/);
  assert.match(panel, /Job assumption — edit to match plans/);

  const baseline = calculateFraming({
    ...createDefaultTradeInputs(),
    wallLength: "16",
    wallHeight: "8",
    doors: "1",
    windows: "1",
    doorWidth: "3",
    windowWidth: "3",
    doorOpeningHeight: "7",
    windowOpeningHeight: "4",
    includeSheathing: true,
    framingWastePct: "0",
  });
  const taller = calculateFraming({
    ...createDefaultTradeInputs(),
    wallLength: "16",
    wallHeight: "8",
    doors: "1",
    windows: "1",
    doorWidth: "3",
    windowWidth: "3",
    doorOpeningHeight: "8",
    windowOpeningHeight: "6",
    includeSheathing: true,
    framingWastePct: "0",
  });
  assert.ok(Number(taller.values.sheathingSf) < Number(baseline.values.sheathingSf));

  const snapshot = buildJobSnapshot({
    job: { name: "Wall", customer: "", location: "", date: "", notes: "" },
    pipeSize: "",
    segments: [],
    extraFittings: {},
    rotateTurns: 0,
    flipped: false,
    overallLength: "",
    overallUnit: "inches",
    overallPipeSize: "",
    overallFittings: {},
    overallSketchMode: "none",
    overallSketchLength: 0,
    materialSource: "manual",
    overallMaterialFittings: {},
    calculatorRuns: [],
    takeoffTable: null,
    takeoffType: "framing",
    categories: {},
    tradeInputs: {
      ...createDefaultTradeInputs(),
      doorOpeningHeight: "8.5",
      windowOpeningHeight: "5",
    },
    conduitType: "EMT",
    chartSelection: emptyChartSelection(),
  });
  const loaded = snapshotToEditorState(snapshot);
  assert.equal(loaded.tradeInputs.doorOpeningHeight, "8.5");
  assert.equal(loaded.tradeInputs.windowOpeningHeight, "5");
});

test("HVAC generated table remains unverified and SMACNA is not loaded", () => {
  const hvac = resolveActiveTakeoffChart({
    takeoffType: "hvac",
    chartSelection: emptyChartSelection(),
    takeoffTables: createDefaultTakeoffTables(),
  });
  assert.equal(hvac.status.kind, "unverified");
  assert.match(hvac.status.detail, /not a SMACNA/i);
  assert.equal(hvac.table["12x8"]["90 elbow"], 12);
});
