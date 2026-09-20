import { PIPE_SIZES } from "./constants";
import { toInches } from "./geometry";
import { DEFAULT_TAKEOFF_TABLE } from "./takeoff";
import {
  ELECTRICAL_SIZES,
  ELECTRICAL_TAKEOFF_TABLE,
  HVAC_SIZES,
  HVAC_TAKEOFF_TABLE,
  PLUMBING_TAKEOFF_TABLE,
  TAKEOFF_PRESETS,
} from "./takeoffPresets";

export const VERIFICATION_STATUS = {
  VERIFIED: "VERIFIED",
  MATH: "MATHEMATICALLY DERIVED",
  COMPANY: "COMPANY CUSTOM / USER EDITABLE",
  UNVERIFIED: "UNVERIFIED",
  ESTIMATE: "PLACEHOLDER / ESTIMATE",
};

export const SOURCE_TYPES = {
  verified_chart: "verified_chart",
  math: "math",
  company_custom: "company_custom",
  estimate: "estimate",
  unverified: "unverified",
};

const EMPTY_VERIFICATION = {
  sourceType: SOURCE_TYPES.unverified,
  sourceName: "",
  sourceUrl: "",
  manufacturer: "",
  chartVersion: "",
  verifiedAt: null,
  usesUnverifiedNumericDefaults: false,
  unverifiedLabel: "",
};

export function getPresetVerification(type) {
  return TAKEOFF_PRESETS[type]?.verification || EMPTY_VERIFICATION;
}

/**
 * Parse catalog sizes like 1/2", 1-1/4", 2" into nominal inches.
 * Not a manufacturer OD chart.
 */
export function parsePipeSizeInches(size) {
  const t = String(size || "").replace(/"/g, "").trim();
  if (!t) return 0;
  if (t.includes("-")) {
    const [whole, frac] = t.split("-");
    const [n, d] = (frac || "").split("/");
    return Number(whole) + Number(n) / Number(d);
  }
  if (t.includes("/")) {
    const [n, d] = t.split("/");
    return Number(n) / Number(d);
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

/** Documented in takeoff.js: 90° = pipe size × 1.5 (size + half). */
export function expectedBlueBook90(size) {
  return parsePipeSizeInches(size) * 1.5;
}

/** Documented in takeoff.js: 45° = pipe size × 0.625. */
export function expectedBlueBook45(size) {
  return parsePipeSizeInches(size) * 0.625;
}

export function hvacPrimaryInches(size) {
  const text = String(size || "");
  const rect = text.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (rect) return Math.max(Number(rect[1]), Number(rect[2]));
  const round = text.match(/(\d+(?:\.\d+)?)/);
  return round ? Number(round[1]) : 0;
}

function row(partial) {
  return {
    trade: "",
    category: "",
    system: "",
    size: "—",
    item: "",
    currentValue: "",
    unit: "",
    formula: "",
    location: "",
    source: "",
    status: VERIFICATION_STATUS.UNVERIFIED,
    editable: true,
    notes: "",
    ...partial,
  };
}

export function buildVerificationInventory() {
  const rows = [];

  rows.push(
    row({
      trade: "Shared",
      category: "Unit conversion",
      item: "Feet to inches",
      currentValue: 12,
      unit: "in/ft",
      formula: "feet × 12",
      location: "src/lib/geometry.js toInches",
      source: "US customary",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
      notes: "Deterministic conversion.",
    }),
    row({
      trade: "Shared",
      category: "Unit conversion",
      item: "Inches to feet",
      currentValue: 12,
      unit: "in/ft",
      formula: "inches ÷ 12",
      location: "src/lib/tradeCalcs.js toFeet",
      source: "US customary",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Shared",
      category: "Unit conversion",
      item: "Yards to feet",
      currentValue: 3,
      unit: "ft/yd",
      formula: "yards × 3",
      location: "src/lib/tradeCalcs.js toFeet",
      source: "US customary",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Shared",
      category: "Cut length",
      item: "Run cut length",
      currentValue: "—",
      unit: "in",
      formula: "max(knownLength − startTakeoff − endTakeoff, 0)",
      location: "src/lib/runTakeoff.js computeSegmentRows",
      source: "math",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
      notes: "Uses whatever takeoff table is active. Table quality is separate from this formula.",
    }),
    row({
      trade: "Shared",
      category: "Cut length",
      item: "Overall straight cut",
      currentValue: "—",
      unit: "in",
      formula: "toInches(overall) − Σ(count × takeoff)",
      location: "src/lib/runTakeoff.js computeOverallLengthCalc",
      source: "math",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    })
  );

  rows.push(
    row({
      trade: "Pipe / Welding",
      category: "Formula",
      system: "Existing pipe preset",
      item: "90° elbow",
      currentValue: "size × 1.5",
      unit: "in",
      formula: "nominal inches × 1.5 (size + half)",
      location: "src/lib/takeoff.js comment + DEFAULT_TAKEOFF_TABLE",
      source: "Documented in repo as Blue Book; matches field rule “90s are pipe size + half.”",
      status: VERIFICATION_STATUS.VERIFIED,
      editable: true,
      notes: "Table cells match the documented formula. Users may override in Takeoff Settings.",
    }),
    row({
      trade: "Pipe / Welding",
      category: "Formula",
      system: "Existing pipe preset",
      item: "45° elbow",
      currentValue: "size × 0.625",
      unit: "in",
      formula: "nominal inches × 0.625",
      location: "src/lib/takeoff.js comment + DEFAULT_TAKEOFF_TABLE",
      source: "Documented in repo as Blue Book elbow takeoff.",
      status: VERIFICATION_STATUS.VERIFIED,
      editable: true,
      notes: "3/4\" stored 0.469 vs exact 0.46875; 1-1/4\" stored 0.781 vs exact 0.78125.",
    })
  );

  for (const size of PIPE_SIZES) {
    const n90 = DEFAULT_TAKEOFF_TABLE[size]["90 elbow"];
    const n45 = DEFAULT_TAKEOFF_TABLE[size]["45 elbow"];
    const expect90 = expectedBlueBook90(size);
    const expect45 = expectedBlueBook45(size);
    rows.push(
      row({
        trade: "Pipe / Welding",
        category: "Fitting takeoff",
        system: "Existing pipe preset",
        size,
        item: "90° elbow",
        currentValue: n90,
        unit: "in",
        formula: "lookup; expected size × 1.5 = " + expect90,
        location: "src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE",
        source: "In-repo Blue Book formula",
        status: VERIFICATION_STATUS.VERIFIED,
        editable: true,
        notes: n90 === expect90 ? "Matches formula exactly." : "Does not match formula.",
      }),
      row({
        trade: "Pipe / Welding",
        category: "Fitting takeoff",
        system: "Existing pipe preset",
        size,
        item: "45° elbow",
        currentValue: n45,
        unit: "in",
        formula: "lookup; expected size × 0.625 = " + expect45,
        location: "src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE",
        source: "In-repo Blue Book formula",
        status: VERIFICATION_STATUS.VERIFIED,
        editable: true,
        notes:
          Math.abs(n45 - expect45) < 0.001
            ? "Matches formula (including documented rounding)."
            : "Does not match formula.",
      })
    );
    for (const fitting of ["tee", "reducer", "coupling", "flange", "valve"]) {
      rows.push(
        row({
          trade: "Pipe / Welding",
          category: "Fitting takeoff",
          system: "Existing pipe preset",
          size,
          item: fitting,
          currentValue: DEFAULT_TAKEOFF_TABLE[size][fitting],
          unit: "in",
          formula: "lookup only — no formula in repo",
          location: "src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE",
          source: "Company default table; not derived from the documented 90/45 formulas",
          status: VERIFICATION_STATUS.COMPANY,
          editable: true,
          notes: "Do not treat as a universal manufacturer chart. Keep as editable company standard.",
        })
      );
    }
  }

  rows.push(
    row({
      trade: "Pipe / Welding",
      category: "Default input",
      item: "Default pipe size",
      currentValue: '2"',
      unit: "nominal",
      formula: "constant",
      location: "src/lib/takeoffPresets.js / jobSnapshot.js",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Pipe / Welding",
      category: "Default input",
      item: "Default known / overall length",
      currentValue: 120,
      unit: "in",
      formula: "constant",
      location: "src/lib/jobSnapshot.js createDefaultSegment",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
      notes: "Starting field value, not a takeoff chart.",
    })
  );

  const hvacMult = {
    "90 elbow": { m: 1, notes: "primary dim × 1.0" },
    "45 elbow": { m: 0.5, notes: "primary dim × 0.5" },
    transition: { m: 0.5, notes: "primary dim × 0.5" },
    tee: { m: 0.75, notes: "primary dim × 0.75" },
    boot: { m: 0.5, notes: "primary dim × 0.5" },
    register: { m: 0, notes: "forced 0" },
    damper: { m: 0.25, notes: "primary dim × 0.25" },
  };

  for (const [item, spec] of Object.entries(hvacMult)) {
    rows.push(
      row({
        trade: "HVAC / Duct",
        category: "Formula",
        system: "Generic (no SMACNA / manufacturer)",
        item: `${item} multiplier`,
        currentValue: spec.m,
        unit: "× primary dim",
        formula: spec.notes,
        location: "src/lib/takeoffPresets.js buildHvacTakeoffTable",
        source: "none found — generated for the multi-trade preset",
        status: item === "register" ? VERIFICATION_STATUS.COMPANY : VERIFICATION_STATUS.UNVERIFIED,
        editable: true,
        notes:
          item === "register"
            ? "Modeling choice: no centerline length. Still not a register sizing chart."
            : "Not SMACNA, not a manufacturer throat/radius chart. UI labels these as starter estimates.",
      })
    );
  }

  for (const size of HVAC_SIZES) {
    const d = hvacPrimaryInches(size);
    const table = HVAC_TAKEOFF_TABLE[size];
    for (const item of Object.keys(hvacMult)) {
      rows.push(
        row({
          trade: "HVAC / Duct",
          category: "Fitting takeoff",
          system: "Generic",
          size,
          item,
          currentValue: table[item],
          unit: "in",
          formula: item === "register" ? "0" : `primary ${d} × ${hvacMult[item].m}`,
          location: "src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE",
          source: "none — AI/preset generated",
          status: item === "register" ? VERIFICATION_STATUS.COMPANY : VERIFICATION_STATUS.UNVERIFIED,
          editable: true,
          notes: "Labeled in UI as starter estimate. Not a fabrication development.",
        })
      );
    }
  }

  rows.push(
    row({
      trade: "HVAC / Duct",
      category: "Material list",
      item: "Insulation quantity",
      currentValue: "same as duct cut length",
      unit: "in",
      formula: "copy totalCutLength when Insulation category is on",
      location: "src/lib/materialList.js",
      source: "none",
      status: VERIFICATION_STATUS.ESTIMATE,
      editable: false,
      notes: "Not wrap coverage, not R-value, not dual-layer. Rough planning only.",
    }),
    row({
      trade: "HVAC / Duct",
      category: "Default input",
      item: "Default duct size / run WxH",
      currentValue: "12x8",
      unit: "in",
      formula: "constant",
      location: "src/lib/takeoffPresets.js defaultSize; takeoffSwitch.js extras",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "HVAC / Duct",
      category: "Default input",
      item: "Default round diameter",
      currentValue: 8,
      unit: "in",
      formula: "constant",
      location: "src/lib/takeoffSwitch.js createDefaultSegmentForPreset",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    })
  );

  const electricalDeductItems = ["90 bend", "45 bend", "offset", "LB"];
  const electricalZeroItems = ["coupling", "connector", "junction box", "pull box"];

  for (const size of ELECTRICAL_SIZES) {
    const table = ELECTRICAL_TAKEOFF_TABLE[size];
    for (const item of electricalDeductItems) {
      rows.push(
        row({
          trade: "Electrical",
          category: "Bend / take-up",
          system: "All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished)",
          size,
          item,
          currentValue: table[item],
          unit: "in",
          formula: "lookup",
          location: "src/lib/takeoffPresets.js buildElectricalTakeoffTable",
          source: "none found — comment says starter estimates, not NEC",
          status: VERIFICATION_STATUS.UNVERIFIED,
          editable: true,
          notes: "Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer.",
        })
      );
    }
    for (const item of electricalZeroItems) {
      rows.push(
        row({
          trade: "Electrical",
          category: "Component takeoff",
          system: "Generic",
          size,
          item,
          currentValue: 0,
          unit: "in",
          formula: "hard-coded 0",
          location: "src/lib/takeoffPresets.js buildElectricalTakeoffTable",
          source: "modeling choice",
          status: VERIFICATION_STATUS.COMPANY,
          editable: true,
          notes: "Means no centerline deduction. Not a box-fill or connector chart.",
        })
      );
    }
  }

  rows.push(
    row({
      trade: "Electrical",
      category: "Default input",
      item: "Default conduit size",
      currentValue: '3/4"',
      unit: "nominal",
      formula: "constant",
      location: "src/lib/takeoffPresets.js defaultSize",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Electrical",
      category: "Default input",
      item: "Default conduit type",
      currentValue: "EMT",
      unit: "—",
      formula: "constant",
      location: "src/lib/takeoffSwitch.js / page.js",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
      notes: "Type is a label only; takeoff table does not change with EMT vs PVC vs rigid.",
    })
  );

  const plumbingMap = {
    "90 elbow": "copied from pipe 90 elbow",
    "45 elbow": "copied from pipe 45 elbow",
    tee: "copied from pipe tee",
    wye: "copied from pipe tee",
    coupling: "copied from pipe coupling",
    valve: "copied from pipe valve",
    cleanout: "copied from pipe coupling",
    trap: "copied from pipe 90 elbow",
  };

  for (const size of PIPE_SIZES) {
    for (const [item, copied] of Object.entries(plumbingMap)) {
      rows.push(
        row({
          trade: "Plumbing",
          category: "Fitting takeoff",
          system: "Universal (no PVC/copper/PEX/CI/CPVC)",
          size,
          item,
          currentValue: PLUMBING_TAKEOFF_TABLE[size][item],
          unit: "in",
          formula: copied,
          location: "src/lib/takeoffPresets.js buildPlumbingTakeoffTable",
          source: "Pipe/Welding table reused — not a plumbing manufacturer socket chart",
          status: VERIFICATION_STATUS.UNVERIFIED,
          editable: true,
          notes: "Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings.",
        })
      );
    }
  }

  rows.push(
    row({
      trade: "Framing",
      category: "Formula",
      item: "Base stud count",
      currentValue: "—",
      unit: "count",
      formula: "floor(length_in / OC) + 1",
      location: "src/lib/tradeCalcs.js calculateFraming",
      source: "math",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
      notes: "Standard end-stud layout math. Does not place king/jack/cripple studs by itself.",
    }),
    row({
      trade: "Framing",
      category: "Formula",
      item: "Studs with extras and waste",
      currentValue: "—",
      unit: "count",
      formula: "ceil((base + extras) × (1 + waste%))",
      location: "src/lib/tradeCalcs.js calculateFraming",
      source: "math on top of editable extras/waste",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Framing",
      category: "Formula",
      item: "Plate linear footage",
      currentValue: "—",
      unit: "ft",
      formula: "plateCount × wallLengthFt × (1 + waste%)",
      location: "src/lib/tradeCalcs.js calculateFraming",
      source: "math",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Framing",
      category: "Default assumption",
      item: "Stud spacing OC",
      currentValue: 16,
      unit: "in",
      formula: "default; fallback 16 if empty",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs / calculateFraming",
      source: "common field default, not cited to IRC in repo",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Framing",
      category: "Default assumption",
      item: "Extra studs per corner / door / window",
      currentValue: "2 / 4 / 4",
      unit: "count",
      formula: "defaults",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "company/field estimate (king/jack style)",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Framing",
      category: "Default assumption",
      item: "Waste %",
      currentValue: 10,
      unit: "%",
      formula: "default",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "company practice",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Framing",
      category: "Default assumption",
      item: "Top / bottom plates",
      currentValue: "2 / 1",
      unit: "count",
      formula: "default",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "common double top plate practice, not a code lookup",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Framing",
      category: "Default assumption",
      item: "Typical door / window header width",
      currentValue: "3 / 3",
      unit: "ft",
      formula: "default",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "placeholder typical opening",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Framing",
      category: "Hidden assumption",
      item: "Door opening height used in sheathing",
      currentValue: 7,
      unit: "ft",
      formula: "min(wallHeight, 7)",
      location: "src/lib/tradeCalcs.js calculateFraming openingArea",
      source: "none — not exposed in the form",
      status: VERIFICATION_STATUS.UNVERIFIED,
      editable: false,
      notes: "Highest-risk framing item: affects sheathing only, not stud count. Not user-editable.",
    }),
    row({
      trade: "Framing",
      category: "Hidden assumption",
      item: "Window opening height used in sheathing",
      currentValue: 4,
      unit: "ft",
      formula: "windowWidth × 4",
      location: "src/lib/tradeCalcs.js calculateFraming openingArea",
      source: "none — not exposed in the form",
      status: VERIFICATION_STATUS.UNVERIFIED,
      editable: false,
    }),
    row({
      trade: "Framing",
      category: "Formula",
      item: "Sheathing sheet area",
      currentValue: 32,
      unit: "sf",
      formula: "4 × 8 if 4x8 sheets",
      location: "src/lib/tradeCalcs.js calculateFraming",
      source: "math given 4x8 sheet",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
      notes: "Sheet size itself is assumed 4x8, not selectable.",
    }),
    row({
      trade: "Framing",
      category: "Default input",
      item: "Default wall length × height",
      currentValue: "16 × 8",
      unit: "ft",
      formula: "starting values",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    })
  );

  rows.push(
    row({
      trade: "Drywall",
      category: "Formula",
      item: "Net area",
      currentValue: "—",
      unit: "sf",
      formula: "walls + ceiling − openings",
      location: "src/lib/tradeCalcs.js calculateDrywall",
      source: "math",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Drywall",
      category: "Formula",
      item: "Sheet count",
      currentValue: "—",
      unit: "count",
      formula: "ceil(netArea × (1 + waste%) / (sheetW × sheetH))",
      location: "src/lib/tradeCalcs.js calculateDrywall",
      source: "math",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Drywall",
      category: "Default assumption",
      item: "Sheet size",
      currentValue: "4 × 8",
      unit: "ft",
      formula: "default; fallback 4 and 8 if empty",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs / calculateDrywall",
      source: "common US sheet; not the only product",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Drywall",
      category: "Default assumption",
      item: "Waste %",
      currentValue: 10,
      unit: "%",
      formula: "default",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "company practice",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Drywall",
      category: "Default assumption",
      item: "Tape factor",
      currentValue: 0.37,
      unit: "LF/sf",
      formula: "netArea × tapeFactor",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "none in repo — labeled estimate in UI",
      status: VERIFICATION_STATUS.ESTIMATE,
      editable: true,
      notes: "Not a finishing spec. Do not treat 0.37 as industry-standard.",
    }),
    row({
      trade: "Drywall",
      category: "Formula",
      item: "Compound per 1000 sf divisor",
      currentValue: 1000,
      unit: "sf",
      formula: "(netArea / 1000) × user rate",
      location: "src/lib/tradeCalcs.js calculateDrywall",
      source: "math — rate itself is user-entered or omitted",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Drywall",
      category: "Default input",
      item: "Default wall / opening",
      currentValue: "12×8 wall; opening 3×7",
      unit: "ft",
      formula: "starting values",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "app default / typical door-ish opening",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    })
  );

  rows.push(
    row({
      trade: "Concrete / Masonry",
      category: "Formula",
      item: "Volume cubic feet",
      currentValue: "—",
      unit: "cf",
      formula: "L × W × D (all feet)",
      location: "src/lib/tradeCalcs.js calculateConcreteVolume",
      source: "math",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Formula",
      item: "Cubic yards",
      currentValue: 27,
      unit: "cf/cy",
      formula: "cubicFeet ÷ 27",
      location: "src/lib/tradeCalcs.js calculateConcreteVolume",
      source: "US customary (3 ft × 3 ft × 3 ft)",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Default assumption",
      item: "Concrete waste %",
      currentValue: 5,
      unit: "%",
      formula: "order = cy × (1 + waste%)",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "company practice, not a mix design",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Formula",
      item: "CMU face area",
      currentValue: "—",
      unit: "sf",
      formula: "(blockLengthIn/12) × (blockHeightIn/12)",
      location: "src/lib/tradeCalcs.js calculateCmu",
      source: "math from user/default block face",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
      notes: "Uses nominal face, not actual 15-5/8 × 7-5/8 with mortar joint unless the user changes sizes.",
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Default assumption",
      item: "Default CMU face",
      currentValue: "16 × 8",
      unit: "in",
      formula: "fallback 16 and 8 if empty",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs / calculateCmu",
      source: "nominal modular CMU, not a named manufacturer",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Default assumption",
      item: "Bricks per sf",
      currentValue: 6.75,
      unit: "count/sf",
      formula: "ceil(wallArea × perSf × (1 + waste%))",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs / calculateBrick",
      source: "code comment “modular default 6.75” — no ASTM/BIA chart in repo",
      status: VERIFICATION_STATUS.ESTIMATE,
      editable: true,
      notes: "Modular brick with mortar is often cited near this number, but this repo has no sourced chart.",
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Default assumption",
      item: "Masonry waste %",
      currentValue: 5,
      unit: "%",
      formula: "default",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "company practice",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Default input",
      item: "Default slab L×W×D",
      currentValue: "10 ft × 10 ft × 4 in",
      unit: "mixed",
      formula: "starting values",
      location: "src/lib/tradeCalcs.js createDefaultTradeInputs",
      source: "app default",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
    }),
    row({
      trade: "Concrete / Masonry",
      category: "Mortar",
      item: "Mortar rate",
      currentValue: "blank / 0 (omitted)",
      unit: "cf",
      formula: "CMU: (blocks/100)×rate; brick: (bricks/1000)×rate",
      location: "src/lib/tradeCalcs.js calculateCmu / calculateBrick",
      source: "user-entered only — no default yield table",
      status: VERIFICATION_STATUS.COMPANY,
      editable: true,
      notes: "Correctly omitted unless the user supplies a rate. Divisors 100 and 1000 are unit conventions, not sourced yields.",
    })
  );

  rows.push(
    row({
      trade: "Shared",
      category: "Drawing only",
      item: "Isometric projection angle",
      currentValue: "π/6",
      unit: "rad",
      formula: "standard 30° isometric",
      location: "src/lib/geometry.js projectPoint",
      source: "math / drafting convention",
      status: VERIFICATION_STATUS.MATH,
      editable: false,
      notes: "Does not affect material quantities.",
    }),
    row({
      trade: "Shared",
      category: "Drawing only",
      item: "L-shape sketch split",
      currentValue: "0.6 / 0.4",
      unit: "fraction of length",
      formula: "visual split",
      location: "src/lib/geometry.js buildOverallSketchPoints",
      source: "placeholder geometry",
      status: VERIFICATION_STATUS.ESTIMATE,
      editable: false,
      notes: "Not a takeoff. Do not use as fabricated lengths.",
    }),
    row({
      trade: "Shared",
      category: "Drawing only",
      item: "U-shape sketch split",
      currentValue: "0.45 / 0.35",
      unit: "fraction of length",
      formula: "visual split",
      location: "src/lib/geometry.js buildOverallSketchPoints",
      source: "placeholder geometry",
      status: VERIFICATION_STATUS.ESTIMATE,
      editable: false,
    })
  );

  return rows;
}

export function summarizeVerification(rows = buildVerificationInventory()) {
  const counts = {
    [VERIFICATION_STATUS.VERIFIED]: 0,
    [VERIFICATION_STATUS.MATH]: 0,
    [VERIFICATION_STATUS.COMPANY]: 0,
    [VERIFICATION_STATUS.UNVERIFIED]: 0,
    [VERIFICATION_STATUS.ESTIMATE]: 0,
  };
  for (const item of rows) {
    counts[item.status] = (counts[item.status] || 0) + 1;
  }
  return { total: rows.length, counts };
}

export function usesUnverifiedNumericDefaults(typeOrPreset) {
  const id = typeof typeOrPreset === "string" ? typeOrPreset : typeOrPreset?.id;
  return Boolean(getPresetVerification(id).usesUnverifiedNumericDefaults);
}

function mdCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

export function inventoryToMarkdownTable(rows = buildVerificationInventory()) {
  const headers = [
    "Trade",
    "Category",
    "Material/System",
    "Size/Dimension",
    "Item",
    "Current Value",
    "Unit",
    "Formula / Lookup",
    "Code Location",
    "Current Source",
    "Verification Status",
    "Editable?",
    "Notes / Risk",
  ];
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const item of rows) {
    lines.push(
      `| ${[
        item.trade,
        item.category,
        item.system,
        item.size,
        item.item,
        item.currentValue,
        item.unit,
        item.formula,
        item.location,
        item.source,
        item.status,
        item.editable ? "Yes" : "No",
        item.notes,
      ]
        .map(mdCell)
        .join(" | ")} |`
    );
  }
  return lines.join("\n");
}

export { toInches, TAKEOFF_PRESETS, PIPE_SIZES };
