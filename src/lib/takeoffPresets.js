import {
  CONDUIT_TYPES,
  FITTING_COLUMN_LABELS,
  FITTING_TYPES,
  PIPE_SIZES,
} from "./constants";
import { DEFAULT_TAKEOFF_TABLE } from "./takeoff";
import { normalizeTakeoffType } from "./takeoffTypes";

export const HVAC_SIZES = [
  '6"',
  '8"',
  '10"',
  '12"',
  '14"',
  '16"',
  '18"',
  '20"',
  "8x8",
  "10x8",
  "12x8",
  "12x10",
  "16x8",
  "16x12",
  "20x10",
  "20x12",
];

export const HVAC_FITTINGS = [
  { id: "90 elbow", columnLabel: "90°", buttonLabel: "Add 90", countLabel: "90 elbow", category: "fittings" },
  { id: "45 elbow", columnLabel: "45°", buttonLabel: "Add 45", countLabel: "45 elbow", category: "fittings" },
  { id: "transition", columnLabel: "Trans.", buttonLabel: "Add Transition", countLabel: "transition", category: "fittings" },
  { id: "tee", columnLabel: "Tee", buttonLabel: "Add Tee", countLabel: "tee", category: "fittings" },
  { id: "boot", columnLabel: "Boot", buttonLabel: "Add Boot", countLabel: "boot", category: "fittings" },
  { id: "register", columnLabel: "Reg.", buttonLabel: "Add Register", countLabel: "register", category: "registers" },
  { id: "damper", columnLabel: "Damper", buttonLabel: "Add Damper", countLabel: "damper", category: "fittings" },
];

export const ELECTRICAL_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"'];

export const ELECTRICAL_FITTINGS = [
  { id: "90 bend", columnLabel: "90°", buttonLabel: "Add 90", countLabel: "90 bend", category: "fittings" },
  { id: "45 bend", columnLabel: "45°", buttonLabel: "Add 45", countLabel: "45 bend", category: "fittings" },
  { id: "offset", columnLabel: "Offset", buttonLabel: "Add Offset", countLabel: "offset", category: "fittings" },
  { id: "coupling", columnLabel: "Cplg", buttonLabel: "Add Coupling", countLabel: "coupling", category: "fittings" },
  { id: "connector", columnLabel: "Conn", buttonLabel: "Add Connector", countLabel: "connector", category: "fittings" },
  { id: "junction box", columnLabel: "Box", buttonLabel: "Add Box", countLabel: "junction box", category: "boxes" },
  { id: "pull box", columnLabel: "Pull", buttonLabel: "Add Pull Box", countLabel: "pull box", category: "boxes" },
  { id: "LB", columnLabel: "LB", buttonLabel: "Add LB", countLabel: "LB", category: "fittings" },
];

export const PLUMBING_FITTINGS = [
  { id: "90 elbow", columnLabel: "90°", buttonLabel: "Add 90", countLabel: "90 elbow", category: "all" },
  { id: "45 elbow", columnLabel: "45°", buttonLabel: "Add 45", countLabel: "45 elbow", category: "all" },
  { id: "tee", columnLabel: "Tee", buttonLabel: "Add Tee", countLabel: "tee", category: "all" },
  { id: "wye", columnLabel: "Wye", buttonLabel: "Add Wye", countLabel: "wye", category: "dwv" },
  { id: "coupling", columnLabel: "Cplg", buttonLabel: "Add Coupling", countLabel: "coupling", category: "all" },
  { id: "valve", columnLabel: "Valve", buttonLabel: "Add Valve", countLabel: "valve", category: "water" },
  { id: "cleanout", columnLabel: "CO", buttonLabel: "Add Cleanout", countLabel: "cleanout", category: "dwv" },
  { id: "trap", columnLabel: "Trap", buttonLabel: "Add Trap", countLabel: "trap", category: "dwv" },
];

function primarySizeInches(size) {
  const text = String(size || "");
  const rect = text.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (rect) return Math.max(Number(rect[1]), Number(rect[2]));
  const round = text.match(/(\d+(?:\.\d+)?)/);
  return round ? Number(round[1]) : 0;
}

function buildHvacTakeoffTable() {
  const out = {};
  for (const size of HVAC_SIZES) {
    const d = primarySizeInches(size);
    out[size] = {
      "90 elbow": d,
      "45 elbow": Number((d * 0.5).toFixed(3)),
      transition: Number((d * 0.5).toFixed(3)),
      tee: Number((d * 0.75).toFixed(3)),
      boot: Number((d * 0.5).toFixed(3)),
      register: 0,
      damper: Number((d * 0.25).toFixed(3)),
    };
  }
  return out;
}

function emptyTable(sizes, fittingDefs) {
  const out = {};
  for (const size of sizes) {
    out[size] = Object.fromEntries(fittingDefs.map((f) => [f.id, 0]));
  }
  return out;
}

function buildElectricalTakeoffTable() {
  // Storage default is empty. Live Klein 90° take-up is applied by resolveTakeoffChart.
  return emptyTable(ELECTRICAL_SIZES, ELECTRICAL_FITTINGS);
}

function buildPlumbingTakeoffTable() {
  // Do not copy Pipe/Welding. Charlotte letters are not mapped until drawings are unambiguous.
  return emptyTable(PIPE_SIZES, PLUMBING_FITTINGS);
}

export const HVAC_TAKEOFF_TABLE = buildHvacTakeoffTable();
export const ELECTRICAL_TAKEOFF_TABLE = buildElectricalTakeoffTable();
export const PLUMBING_TAKEOFF_TABLE = buildPlumbingTakeoffTable();

const UNVERIFIED_DEFAULT_LABEL =
  "Unverified default — confirm against your manufacturer/company chart.";

/** Metadata only. Does not change takeoff math. */
function verificationMeta(partial) {
  return {
    sourceType: "unverified",
    sourceName: "",
    sourceUrl: "",
    manufacturer: "",
    chartVersion: "",
    verifiedAt: null,
    usesUnverifiedNumericDefaults: false,
    unverifiedLabel: "",
    ...partial,
  };
}

const PIPE_FITTING_DEFS = FITTING_TYPES.map((id) => ({
  id,
  columnLabel: FITTING_COLUMN_LABELS[id],
  buttonLabel: id === "90 elbow" ? "Add 90" : id === "45 elbow" ? "Add 45" : `Add ${id}`,
  countLabel: id,
  category: "all",
}));

export const TAKEOFF_PRESETS = {
  pipe: {
    id: "pipe",
    displayName: "Pipe / Welding",
    layout: "runs",
    drawingMode: "iso-runs",
    showTakeoffChart: true,
    showOverallCalculator: true,
    showFittingButtons: true,
    showRuns: true,
    defaultSize: '2"',
    sizes: PIPE_SIZES,
    fittings: PIPE_FITTING_DEFS,
    fittingIds: FITTING_TYPES,
    takeoffTable: DEFAULT_TAKEOFF_TABLE,
    verification: verificationMeta({
      sourceType: "company_custom",
      sourceName:
        "In-repo Blue Book elbow formulas for 90° (size × 1.5) and 45° (size × 0.625). Other fittings are company table defaults.",
      chartVersion: "src/lib/takeoff.js Blue Book comment",
      usesUnverifiedNumericDefaults: false,
    }),
    ninetyFittingId: "90 elbow",
    categories: [],
    defaultCategories: {},
    extraRunFields: [],
    headerTagline: "Simple field takeoff for pipe runs, fittings, and print-ready isometric output.",
    terminology: {
      sizeLabel: "Pipe Size",
      runsTitle: "Pipe & Runs",
      runsHelp:
        "Use this section if you already know each run length and direction. You can enter runs here manually.",
      runsTip:
        "Tip: Add each straight section as a run. Use Direction to show the next turn. Example: Run 1 East + 90 elbow, Run 2 North.",
      fittingsTitle: "Fittings",
      fittingsHelp: "Quick-add extra fittings not already assigned to run starts/ends.",
      fittingCountsTitle: "Fitting Counts",
      straightCutLabel: "Estimated Straight Pipe Cut Length",
      addRunLabel: "Add Pipe Run",
      knownLengthLabel: "Known Length (in)",
      startFittingLabel: "Start Fitting",
      endFittingLabel: "End Fitting",
      overallSizeLabel: "Pipe Size",
      overallHelp:
        "Use this section if you know the total overall length first. Add run breakdowns here, then click Build Drawing From Overall Length to fill the Pipe & Runs section automatically.",
      buildDrawingLabel: "Build Drawing From Overall Length",
      drawingTitle: "Drawing Preview",
      drawingHelp: "Simplified field sketch for quick communication only.",
      drawingAria: "Pipe isometric preview",
      materialRunLabel: (size) => `Pipe (${size})`,
      printSubtitle: "Field-to-shop pipe isometric & takeoff",
      printSizeLabel: "Pipe size",
      printDrawingTitle: "Isometric drawing",
      printRunsTitle: "Run-by-run cut lengths",
      printMaterialTitle: "Material / fitting list",
      printFooter:
        "PipeSketch Pro · Verify takeoffs and dimensions in the field before cutting or welding.",
      takeoffChartHelp:
        "Default takeoff values are starter estimates only. Takeoff values can vary by fitting type, radius, schedule, manufacturer, and company field rules. Verify and adjust these values for your job.",
    },
  },
  hvac: {
    id: "hvac",
    displayName: "HVAC / Duct",
    layout: "runs",
    drawingMode: "iso-runs",
    showTakeoffChart: true,
    showOverallCalculator: true,
    showFittingButtons: true,
    showRuns: true,
    defaultSize: "12x8",
    sizes: HVAC_SIZES,
    fittings: HVAC_FITTINGS,
    fittingIds: HVAC_FITTINGS.map((f) => f.id),
    takeoffTable: HVAC_TAKEOFF_TABLE,
    verification: verificationMeta({
      sourceType: "unverified",
      usesUnverifiedNumericDefaults: true,
      unverifiedLabel: UNVERIFIED_DEFAULT_LABEL,
    }),
    ninetyFittingId: "90 elbow",
    categories: [
      { id: "duct", label: "Duct", defaultOn: true },
      { id: "fittings", label: "Fittings", defaultOn: true },
      { id: "registers", label: "Registers", defaultOn: true },
      { id: "insulation", label: "Insulation", defaultOn: false },
      { id: "equipment", label: "Equipment", defaultOn: false },
    ],
    defaultCategories: {
      duct: true,
      fittings: true,
      registers: true,
      insulation: false,
      equipment: false,
    },
    extraRunFields: ["duct"],
    headerTagline: "Simplified duct-run takeoff for lengths, fittings, and a field sketch.",
    chartNote:
      "These HVAC multipliers are UNVERIFIED generated placeholders — not SMACNA and not a manufacturer chart. Do not treat them as verified. SMACNA/manufacturer selection is prepared but not loaded.",
    terminology: {
      sizeLabel: "Duct Size",
      runsTitle: "Duct Runs",
      runsHelp: "Enter each straight duct section with length and direction. Add width × height or round diameter for labels and the material list.",
      runsTip: "The sketch stays a run-line drawing. Rectangular duct geometry is not fabricated in the preview.",
      fittingsTitle: "Components",
      fittingsHelp: "Quick-add extra components not already assigned to run starts/ends.",
      fittingCountsTitle: "Component Counts",
      straightCutLabel: "Estimated Straight Run Length",
      addRunLabel: "Add Duct Run",
      knownLengthLabel: "Known Length (in)",
      startFittingLabel: "Start Component",
      endFittingLabel: "End Component",
      overallSizeLabel: "Duct Size",
      overallHelp:
        "Enter overall length and a run breakdown, then build the duct-run sketch from those values.",
      buildDrawingLabel: "Build Drawing From Overall Length",
      drawingTitle: "Drawing Preview",
      drawingHelp: "Run-line field sketch with duct-size labels. Not a shop fabrication drawing.",
      drawingAria: "HVAC duct run preview",
      materialRunLabel: (size) => `Straight duct (${size})`,
      printSubtitle: "HVAC / duct field takeoff",
      printSizeLabel: "Duct size",
      printDrawingTitle: "Run layout",
      printRunsTitle: "Run-by-run lengths",
      printMaterialTitle: "HVAC material list",
      printFooter:
        "PipeSketch Pro · HVAC quantities are simplified field estimates. Verify fabrication standards before ordering.",
      takeoffChartHelp:
        "Unverified generated values only. Not SMACNA. Not a manufacturer fitting table. Enter company values or wait for a loaded chart.",
    },
  },
  electrical: {
    id: "electrical",
    displayName: "Electrical",
    layout: "runs",
    drawingMode: "iso-runs",
    showTakeoffChart: true,
    showOverallCalculator: true,
    showFittingButtons: true,
    showRuns: true,
    defaultSize: '3/4"',
    sizes: ELECTRICAL_SIZES,
    fittings: ELECTRICAL_FITTINGS,
    fittingIds: ELECTRICAL_FITTINGS.map((f) => f.id),
    takeoffTable: ELECTRICAL_TAKEOFF_TABLE,
    verification: verificationMeta({
      sourceType: "verified_chart",
      sourceName: "Klein Tools — Conduit Bending Basics (90° stub-up take-up for listed EMT/Rigid sizes only)",
      sourceUrl:
        "https://data.kleintools.com/sites/all/product_assets/documents/instructions/klein/ConduitBenderGuide.pdf",
      manufacturer: "Klein Tools",
      chartVersion: "Conduit Bender Guide",
      verifiedAt: "2026-09-19",
      usesUnverifiedNumericDefaults: false,
    }),
    ninetyFittingId: "90 bend",
    conduitTypes: CONDUIT_TYPES,
    categories: [
      { id: "conduit", label: "Conduit", defaultOn: true },
      { id: "fittings", label: "Fittings", defaultOn: true },
      { id: "boxes", label: "Boxes", defaultOn: true },
      { id: "conductors", label: "Conductors", defaultOn: true },
    ],
    defaultCategories: {
      conduit: true,
      fittings: true,
      boxes: true,
      conductors: true,
    },
    extraRunFields: ["electrical"],
    headerTagline: "Conduit-run takeoff for lengths, fittings, boxes, and conductor footage.",
    chartNote:
      "Klein 90° stub-up take-up is applied only for sizes listed in Klein’s Conduit Bender Guide. 45°, offset, LB, boxes, PVC, and unlisted sizes are not filled from that guide.",
    terminology: {
      sizeLabel: "Conduit Size",
      runsTitle: "Conduit Runs",
      runsHelp: "Enter each conduit run with length, direction, and start/end components.",
      runsTip: "Material list keeps conduit footage separate from fittings, boxes, and conductors.",
      fittingsTitle: "Components",
      fittingsHelp: "Quick-add extra fittings and boxes not already assigned to run starts/ends.",
      fittingCountsTitle: "Component Counts",
      straightCutLabel: "Estimated Straight Conduit Length",
      addRunLabel: "Add Conduit Run",
      knownLengthLabel: "Known Length (in)",
      startFittingLabel: "Start Component",
      endFittingLabel: "End Component",
      overallSizeLabel: "Conduit Size",
      overallHelp:
        "Enter overall conduit length and a run breakdown, then build the conduit sketch from those values.",
      buildDrawingLabel: "Build Drawing From Overall Length",
      drawingTitle: "Drawing Preview",
      drawingHelp: "Simplified conduit run sketch for field communication.",
      drawingAria: "Electrical conduit preview",
      materialRunLabel: (size, extras = {}) =>
        `Conduit (${extras.conduitType || "EMT"} ${size})`,
      printSubtitle: "Electrical conduit field takeoff",
      printSizeLabel: "Conduit size",
      printDrawingTitle: "Run layout",
      printRunsTitle: "Run-by-run lengths",
      printMaterialTitle: "Electrical material list",
      printFooter:
        "PipeSketch Pro · Electrical quantities are field estimates only. This is not an NEC fill or wire-sizing calculation.",
      takeoffChartHelp:
        "Select EMT or Rigid plus Klein Hand Bender for published 90° take-up. Other cells stay company-custom. This is not an NEC fill calculation.",
    },
  },
  plumbing: {
    id: "plumbing",
    displayName: "Plumbing",
    layout: "runs",
    drawingMode: "iso-runs",
    showTakeoffChart: true,
    showOverallCalculator: true,
    showFittingButtons: true,
    showRuns: true,
    defaultSize: '2"',
    sizes: PIPE_SIZES,
    fittings: PLUMBING_FITTINGS,
    fittingIds: PLUMBING_FITTINGS.map((f) => f.id),
    takeoffTable: PLUMBING_TAKEOFF_TABLE,
    verification: verificationMeta({
      sourceType: "unverified",
      sourceName: "Charlotte Pipe DC-DWV catalog inspected; letter dimensions not mapped to cut length",
      sourceUrl:
        "https://www.charlottepipe.com/Documents/DimensionalCatalogs/Plastic_Pipe_Fittings_DC-DWV%28609%29.pdf",
      manufacturer: "Charlotte Pipe",
      chartVersion: "DC-DWV updated April 7, 2026",
      verifiedAt: "2026-09-19",
      usesUnverifiedNumericDefaults: false,
      unverifiedLabel:
        "Chart not verified for this material/manufacturer — enter company value.",
    }),
    ninetyFittingId: "90 elbow",
    categories: [
      { id: "water", label: "Water / Supply", defaultOn: true },
      { id: "dwv", label: "Drain / Waste / Vent", defaultOn: true },
    ],
    defaultCategories: { water: true, dwv: true },
    extraRunFields: ["plumbing"],
    headerTagline: "Plumbing run takeoff for pipe, fittings, and a field sketch.",
    chartNote:
      "Plumbing no longer uses the Pipe/Welding table. Charlotte DWV catalog letters are on file but are not mapped into cut length until fitting drawings make that mapping unambiguous.",
    terminology: {
      sizeLabel: "Pipe Size",
      runsTitle: "Plumbing Runs",
      runsHelp: "Enter each plumbing run and tag it as Water / Supply or Drain / Waste / Vent.",
      runsTip: "Uncheck a category to hide that system from the material list.",
      fittingsTitle: "Fittings",
      fittingsHelp: "Quick-add extra fittings not already assigned to run starts/ends.",
      fittingCountsTitle: "Fitting Counts",
      straightCutLabel: "Estimated Straight Pipe Cut Length",
      addRunLabel: "Add Plumbing Run",
      knownLengthLabel: "Known Length (in)",
      startFittingLabel: "Start Fitting",
      endFittingLabel: "End Fitting",
      overallSizeLabel: "Pipe Size",
      overallHelp:
        "Enter overall length and a run breakdown, then build the plumbing sketch from those values.",
      buildDrawingLabel: "Build Drawing From Overall Length",
      drawingTitle: "Drawing Preview",
      drawingHelp: "Simplified plumbing run sketch for field communication.",
      drawingAria: "Plumbing run preview",
      materialRunLabel: (size) => `Pipe (${size})`,
      printSubtitle: "Plumbing field takeoff",
      printSizeLabel: "Pipe size",
      printDrawingTitle: "Run layout",
      printRunsTitle: "Run-by-run cut lengths",
      printMaterialTitle: "Plumbing material list",
      printFooter:
        "PipeSketch Pro · Plumbing quantities are field estimates, not a code-compliance calculation.",
      takeoffChartHelp:
        "Chart not verified for this material/manufacturer — enter company value. Welding takeoffs are not used.",
    },
  },
  framing: {
    id: "framing",
    displayName: "Framing",
    layout: "area",
    drawingMode: "summary",
    showTakeoffChart: false,
    showOverallCalculator: false,
    showFittingButtons: false,
    showRuns: false,
    defaultSize: "",
    sizes: [],
    fittings: [],
    fittingIds: [],
    takeoffTable: {},
    verification: verificationMeta({
      sourceType: "company_custom",
      sourceName: "Editable field assumptions plus deterministic count formulas.",
    }),
    categories: [],
    defaultCategories: {},
    headerTagline: "Wall-framing takeoff for studs, plates, and opening extras.",
    terminology: {
      sizeLabel: "Wall",
      drawingTitle: "Takeoff Preview",
      drawingHelp: "Dimension summary from the wall inputs. Not a framing elevation.",
      drawingAria: "Framing takeoff summary",
      printSubtitle: "Framing field takeoff",
      printSizeLabel: "Wall size",
      printDrawingTitle: "Takeoff preview",
      printRunsTitle: "Inputs",
      printMaterialTitle: "Framing material list",
      printFooter:
        "PipeSketch Pro · Framing counts use the editable assumptions shown. Verify layout and local code.",
      takeoffChartHelp:
        "These are editable takeoff assumptions, not a full wall-framing engine. Change them to match your company standard.",
    },
  },
  drywall: {
    id: "drywall",
    displayName: "Drywall",
    layout: "area",
    drawingMode: "summary",
    showTakeoffChart: false,
    showOverallCalculator: false,
    showFittingButtons: false,
    showRuns: false,
    defaultSize: "",
    sizes: [],
    fittings: [],
    fittingIds: [],
    takeoffTable: {},
    verification: verificationMeta({
      sourceType: "company_custom",
      sourceName: "Editable area inputs. Tape factor is an unlabeled-source estimate.",
    }),
    categories: [],
    defaultCategories: {},
    headerTagline: "Drywall sheet takeoff from wall/ceiling area and waste.",
    terminology: {
      sizeLabel: "Wall",
      drawingTitle: "Takeoff Preview",
      drawingHelp: "Area summary from the drywall inputs. Not a hang plan.",
      drawingAria: "Drywall takeoff summary",
      printSubtitle: "Drywall field takeoff",
      printSizeLabel: "Wall size",
      printDrawingTitle: "Takeoff preview",
      printRunsTitle: "Inputs",
      printMaterialTitle: "Drywall material list",
      printFooter:
        "PipeSketch Pro · Sheet counts are estimates from area and waste. Tape/compound only appear when you set those rates.",
      takeoffChartHelp:
        "Editable area assumptions. Tape and compound are optional estimates, not finishing specifications.",
    },
  },
  concrete: {
    id: "concrete",
    displayName: "Concrete / Masonry",
    layout: "area",
    drawingMode: "summary",
    showTakeoffChart: false,
    showOverallCalculator: false,
    showFittingButtons: false,
    showRuns: false,
    defaultSize: "",
    sizes: [],
    fittings: [],
    fittingIds: [],
    takeoffTable: {},
    verification: verificationMeta({
      sourceType: "math",
      sourceName:
        "Volume = L×W×D; cubic yards = cf ÷ 27. Brick/CMU defaults are editable estimates.",
    }),
    categories: [],
    defaultCategories: {},
    headerTagline: "Concrete volume and simple CMU/brick counts from dimensions.",
    terminology: {
      sizeLabel: "Dimensions",
      drawingTitle: "Takeoff Preview",
      drawingHelp: "Quantity summary from the dimensions you entered.",
      drawingAria: "Concrete and masonry takeoff summary",
      printSubtitle: "Concrete / masonry field takeoff",
      printSizeLabel: "Dimensions",
      printDrawingTitle: "Takeoff preview",
      printRunsTitle: "Inputs",
      printMaterialTitle: "Concrete / masonry material list",
      printFooter:
        "PipeSketch Pro · Volumes and unit counts are geometric estimates. Verify mix, bond, and waste for the job.",
      takeoffChartHelp:
        "Choose Concrete, Block / CMU, or Brick. Mortar is optional and only included when you enter a rate.",
    },
  },
};

export function getPreset(type) {
  return TAKEOFF_PRESETS[normalizeTakeoffType(type)];
}

export function getFittingIds(type) {
  return getPreset(type).fittingIds;
}

export function fittingButtonLabel(preset, fittingId) {
  const def = preset.fittings.find((item) => item.id === fittingId);
  return def?.buttonLabel || `Add ${fittingId}`;
}

export function fittingColumnLabel(preset, fittingId) {
  const def = preset.fittings.find((item) => item.id === fittingId);
  return def?.columnLabel || fittingId;
}

export function defaultCategoriesFor(type) {
  return { ...getPreset(type).defaultCategories };
}
