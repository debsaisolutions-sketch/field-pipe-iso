import assert from "node:assert/strict";
import { test } from "vitest";

import { EMPTY_FITTING_COUNTS, FITTING_TYPES, PIPE_SIZES } from "./constants";
import { toInches } from "./geometry";
import {
  buildJobSnapshot,
  createDefaultSegment,
  snapshotToEditorState,
} from "./jobSnapshot";
import { computeOverallLengthCalc, computeSegmentRows } from "./runTakeoff";
import { DEFAULT_TAKEOFF_TABLE, cloneDefaultTakeoffTable } from "./takeoff";
import { getPreset } from "./takeoffPresets";
import { buildResetStateForType } from "./takeoffSwitch";
import {
  VERIFICATION_STATUS,
  buildVerificationInventory,
  expectedBlueBook45,
  expectedBlueBook90,
  parsePipeSizeInches,
  summarizeVerification,
  usesUnverifiedNumericDefaults,
} from "./takeoffVerification";
import {
  calculateConcrete,
  calculateDrywall,
  calculateFraming,
  createDefaultTradeInputs,
} from "./tradeCalcs";

test("parsePipeSizeInches reads catalog labels as nominal inches", () => {
  assert.equal(parsePipeSizeInches('1/2"'), 0.5);
  assert.equal(parsePipeSizeInches('3/4"'), 0.75);
  assert.equal(parsePipeSizeInches('1"'), 1);
  assert.equal(parsePipeSizeInches('1-1/4"'), 1.25);
  assert.equal(parsePipeSizeInches('2"'), 2);
});

test("unit conversions: feet/inches/yards", () => {
  assert.equal(toInches(2, "feet"), 24);
  assert.equal(toInches(24, "inches"), 24);

  const fromYards = calculateConcrete({
    ...createDefaultTradeInputs(),
    concreteSubType: "concrete",
    concLength: "1",
    concLengthUnit: "yards",
    concWidth: "1",
    concWidthUnit: "yards",
    concDepth: "1",
    concDepthUnit: "yards",
    concWastePct: "0",
  });
  assert.equal(fromYards.values.cubicFeet, 27);
  assert.equal(fromYards.values.cubicYards, 1);
});

test("concrete cubic yards: 10 ft × 10 ft × 4 in", () => {
  const result = calculateConcrete({
    ...createDefaultTradeInputs(),
    concreteSubType: "concrete",
    concLength: "10",
    concWidth: "10",
    concDepth: "4",
    concLengthUnit: "feet",
    concWidthUnit: "feet",
    concDepthUnit: "inches",
    concWastePct: "5",
  });
  assert.ok(Math.abs(result.values.cubicFeet - 1000 / 30) < 1e-9);
  assert.ok(Math.abs(result.values.cubicYards - 1000 / 30 / 27) < 1e-9);
  assert.ok(Math.abs(result.values.cubicYardsWithWaste - (1000 / 30 / 27) * 1.05) < 1e-9);
});

test("framing stud count: 16 ft wall at 16 in OC", () => {
  const result = calculateFraming({
    ...createDefaultTradeInputs(),
    wallLength: "16",
    wallLengthUnit: "feet",
    wallHeight: "8",
    studSpacing: "16",
    corners: "0",
    doors: "0",
    windows: "0",
    framingWastePct: "10",
  });
  assert.equal(result.values.baseStuds, 13);
  assert.equal(result.values.studs, Math.ceil(13 * 1.1));
});

test("framing stud count: 10 ft wall at 16 in OC, no waste extras", () => {
  const result = calculateFraming({
    ...createDefaultTradeInputs(),
    wallLength: "10",
    wallHeight: "8",
    studSpacing: "16",
    corners: "0",
    doors: "0",
    windows: "0",
    extraStudsPerCorner: "0",
    extraStudsPerDoor: "0",
    extraStudsPerWindow: "0",
    framingWastePct: "0",
  });
  assert.equal(result.values.baseStuds, 8);
  assert.equal(result.values.studs, 8);
});

test("drywall sheet count: 12×8 wall, 4×8 sheets, 10% waste", () => {
  const result = calculateDrywall({
    ...createDefaultTradeInputs(),
    drywallWidth: "12",
    drywallHeight: "8",
    wallCount: "1",
    ceilingEnabled: false,
    openingCount: "0",
    sheetWidth: "4",
    sheetHeight: "8",
    drywallWastePct: "10",
    includeTape: false,
  });
  assert.equal(result.values.netArea, 96);
  assert.equal(result.values.sheets, Math.ceil((96 * 1.1) / 32));
});

test("drywall sheet count subtracts openings then applies waste", () => {
  const result = calculateDrywall({
    ...createDefaultTradeInputs(),
    drywallWidth: "12",
    drywallHeight: "8",
    wallCount: "1",
    ceilingEnabled: false,
    openingCount: "1",
    openingWidth: "3",
    openingHeight: "7",
    sheetWidth: "4",
    sheetHeight: "8",
    drywallWastePct: "10",
    includeTape: false,
  });
  assert.equal(result.values.netArea, 75);
  assert.equal(result.values.sheets, Math.ceil((75 * 1.1) / 32));
});

test("drywall tape uses the entered factor, not a hidden constant", () => {
  const result = calculateDrywall({
    ...createDefaultTradeInputs(),
    drywallWidth: "10",
    drywallHeight: "10",
    wallCount: "1",
    ceilingEnabled: false,
    openingCount: "0",
    includeTape: true,
    tapeFactor: "0.5",
    drywallWastePct: "0",
  });
  assert.equal(result.values.netArea, 100);
  assert.equal(result.values.tapeLf, 50);
});

test("CMU count from face area math", () => {
  const result = calculateConcrete({
    ...createDefaultTradeInputs(),
    concreteSubType: "cmu",
    masonryLength: "20",
    masonryHeight: "8",
    masonryOpeningArea: "0",
    blockLengthIn: "16",
    blockHeightIn: "8",
    masonryWastePct: "5",
    mortarCfPer100: "",
  });
  const faceSf = (16 / 12) * (8 / 12);
  assert.equal(result.values.wallArea, 160);
  assert.equal(result.values.blocks, Math.ceil((160 / faceSf) * 1.05));
});

test("pipe 90/45 table matches documented Blue Book formulas", () => {
  for (const size of PIPE_SIZES) {
    assert.equal(DEFAULT_TAKEOFF_TABLE[size]["90 elbow"], expectedBlueBook90(size));
    assert.ok(
      Math.abs(DEFAULT_TAKEOFF_TABLE[size]["45 elbow"] - expectedBlueBook45(size)) < 0.001
    );
  }
});

test("pipe 2 in 90 still deducts 3 in from a 120 in run", () => {
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
  assert.equal(rows[0].totalTakeoff, 3);
  assert.equal(rows[0].cutLength, 117);

  const overall = computeOverallLengthCalc({
    overallLength: "10",
    overallUnit: "feet",
    overallSize: '2"',
    overallFittings: { ...EMPTY_FITTING_COUNTS, "90 elbow": 2 },
    takeoffTable: cloneDefaultTakeoffTable(),
    fittingTypes: FITTING_TYPES,
  });
  assert.equal(overall.overallInches, 120);
  assert.equal(overall.totalTakeoff, 6);
  assert.equal(overall.straightCutLength, 114);
});

test("save/load preserves takeoff type and area inputs", () => {
  const snapshot = buildJobSnapshot({
    job: { name: "Audit", customer: "", location: "", date: "", notes: "" },
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
    tradeInputs: { ...createDefaultTradeInputs(), wallLength: "24", studSpacing: "24" },
    conduitType: "EMT",
  });
  assert.equal(snapshot.takeoff_type, "framing");
  const loaded = snapshotToEditorState(snapshot);
  assert.equal(loaded.takeoffType, "framing");
  assert.equal(loaded.tradeInputs.wallLength, "24");
  assert.equal(loaded.tradeInputs.studSpacing, "24");
});

test("preset switching isolation does not copy HVAC table into pipe", () => {
  const reset = buildResetStateForType("pipe", {
    name: "Keep",
    customer: "",
    location: "",
    date: "",
    notes: "",
  });
  assert.equal(reset.takeoffType, "pipe");
  assert.equal(reset.pipeSize, getPreset("pipe").defaultSize);
  assert.equal(getPreset("hvac").takeoffTable["12x8"]["90 elbow"], 12);
  assert.equal(DEFAULT_TAKEOFF_TABLE['2"']["90 elbow"], 3);
});

test("verification inventory does not promote unverified chart cells", () => {
  const rows = buildVerificationInventory();
  const summary = summarizeVerification(rows);
  assert.ok(summary.total > 300);
  assert.ok(summary.counts[VERIFICATION_STATUS.UNVERIFIED] > 100);
  assert.equal(usesUnverifiedNumericDefaults("pipe"), false);
  assert.equal(usesUnverifiedNumericDefaults("hvac"), true);
  assert.equal(usesUnverifiedNumericDefaults("electrical"), false);
  assert.equal(usesUnverifiedNumericDefaults("plumbing"), false);

  const pipe90 = rows.find(
    (r) => r.trade === "Pipe / Welding" && r.size === '2"' && r.item === "90° elbow"
  );
  assert.equal(pipe90.status, VERIFICATION_STATUS.VERIFIED);

  const elec90 = rows.find(
    (r) =>
      r.trade === "Electrical" &&
      r.size === '1"' &&
      r.item === "90 bend" &&
      String(r.system).includes("EMT")
  );
  assert.equal(elec90.status, VERIFICATION_STATUS.VERIFIED);
  assert.equal(elec90.currentValue, 8);

  const elec45 = rows.find(
    (r) => r.trade === "Electrical" && r.size === '1"' && r.item === "45 bend"
  );
  assert.equal(elec45.status, VERIFICATION_STATUS.UNVERIFIED);

  const doorHeight = rows.find((r) => r.item === "Door opening height used in sheathing");
  assert.equal(doorHeight.status, VERIFICATION_STATUS.COMPANY);
  assert.equal(doorHeight.editable, true);

  const plum90 = rows.find(
    (r) => r.trade === "Plumbing" && r.size === '2"' && r.item === "90 elbow"
  );
  assert.equal(plum90.status, VERIFICATION_STATUS.UNVERIFIED);
  assert.equal(plum90.currentValue, 0);
});

test("writes the takeoff verification audit markdown from the live inventory", async () => {
  const { writeTakeoffAuditMarkdown } = await import("../../scripts/dump-takeoff-audit.mjs");
  const result = writeTakeoffAuditMarkdown();
  assert.ok(result.total > 300);
  assert.match(result.dest, /takeoff-number-verification-audit\.md$/);
  const fs = await import("node:fs");
  const body = fs.readFileSync(result.dest, "utf8");
  assert.match(body, /Klein Hand Bender/);
  assert.match(body, /Chart not verified for this material\/manufacturer/);
});
