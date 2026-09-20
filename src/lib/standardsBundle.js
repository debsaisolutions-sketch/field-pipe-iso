import { DEFAULT_TAKEOFF_TYPE_KEY } from "./constants";
import {
  cloneTakeoffTable,
  DEFAULT_TAKEOFF_TABLE,
  normalizeStoredTakeoffTable,
  normalizeTakeoffTable,
} from "./takeoff";
import {
  ELECTRICAL_SIZES,
  ELECTRICAL_TAKEOFF_TABLE,
  HVAC_SIZES,
  HVAC_TAKEOFF_TABLE,
  PLUMBING_TAKEOFF_TABLE,
  TAKEOFF_PRESETS,
} from "./takeoffPresets";
import { FITTING_TYPES, PIPE_SIZES } from "./constants";
import { normalizeTakeoffType } from "./takeoffTypes";

function plumbingFittingIds() {
  return TAKEOFF_PRESETS.plumbing.fittingIds;
}

function hvacFittingIds() {
  return TAKEOFF_PRESETS.hvac.fittingIds;
}

function electricalFittingIds() {
  return TAKEOFF_PRESETS.electrical.fittingIds;
}

export function createDefaultTakeoffTables() {
  return {
    pipe: cloneTakeoffTable(PIPE_SIZES, FITTING_TYPES, DEFAULT_TAKEOFF_TABLE),
    hvac: cloneTakeoffTable(HVAC_SIZES, hvacFittingIds(), HVAC_TAKEOFF_TABLE),
    electrical: cloneTakeoffTable(ELECTRICAL_SIZES, electricalFittingIds(), ELECTRICAL_TAKEOFF_TABLE),
    plumbing: cloneTakeoffTable(PIPE_SIZES, plumbingFittingIds(), PLUMBING_TAKEOFF_TABLE),
  };
}

export function wrapStandardsBlob(tables, defaultTakeoffType) {
  const bundle = tables || createDefaultTakeoffTables();
  const pipe = bundle.pipe || createDefaultTakeoffTables().pipe;
  const payload = { ...pipe, _tradeTables: {} };
  if (bundle.hvac) payload._tradeTables.hvac = bundle.hvac;
  if (bundle.electrical) payload._tradeTables.electrical = bundle.electrical;
  if (bundle.plumbing) payload._tradeTables.plumbing = bundle.plumbing;
  if (defaultTakeoffType) {
    payload._defaultTakeoffType = normalizeTakeoffType(defaultTakeoffType);
  }
  return payload;
}

export function unwrapStandardsBlob(raw) {
  const defaults = createDefaultTakeoffTables();
  const pipe = normalizeStoredTakeoffTable(raw);
  const nested = raw && typeof raw === "object" ? raw._tradeTables : null;
  return {
    tables: {
      pipe,
      hvac: normalizeTakeoffTable(
        nested?.hvac,
        HVAC_SIZES,
        hvacFittingIds(),
        HVAC_TAKEOFF_TABLE
      ),
      electrical: normalizeTakeoffTable(
        nested?.electrical,
        ELECTRICAL_SIZES,
        electricalFittingIds(),
        ELECTRICAL_TAKEOFF_TABLE
      ),
      plumbing: normalizeTakeoffTable(
        nested?.plumbing,
        PIPE_SIZES,
        plumbingFittingIds(),
        PLUMBING_TAKEOFF_TABLE
      ),
    },
    defaultTakeoffType: raw && raw._defaultTakeoffType
      ? normalizeTakeoffType(raw._defaultTakeoffType)
      : null,
    defaults,
  };
}

export function readDefaultTakeoffType() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEFAULT_TAKEOFF_TYPE_KEY);
    if (!raw) return null;
    return normalizeTakeoffType(raw);
  } catch {
    return null;
  }
}

export function writeDefaultTakeoffType(type) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEFAULT_TAKEOFF_TYPE_KEY, normalizeTakeoffType(type));
  } catch {
    // quota / private mode
  }
}
