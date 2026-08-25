import { FITTING_TYPES, PIPE_SIZES } from "./constants";

// Default takeoff table — Blue Book elbow takeoffs
// (90° = pipe size × 1.5, 45° = pipe size × 0.625); users can override in Takeoff Settings.
export const DEFAULT_TAKEOFF_TABLE = {
  '1/2"': {
    "90 elbow": 0.75,
    "45 elbow": 0.3125,
    tee: 0.625,
    reducer: 0.375,
    coupling: 0.375,
    flange: 0.75,
    valve: 0.75,
  },
  '3/4"': {
    "90 elbow": 1.125,
    "45 elbow": 0.469,
    tee: 0.75,
    reducer: 0.4375,
    coupling: 0.375,
    flange: 0.875,
    valve: 0.875,
  },
  '1"': {
    "90 elbow": 1.5,
    "45 elbow": 0.625,
    tee: 0.875,
    reducer: 0.5,
    coupling: 0.5,
    flange: 1,
    valve: 1,
  },
  '1-1/4"': {
    "90 elbow": 1.875,
    "45 elbow": 0.781,
    tee: 1.125,
    reducer: 0.625,
    coupling: 0.75,
    flange: 1.25,
    valve: 1.25,
  },
  '1-1/2"': {
    "90 elbow": 2.25,
    "45 elbow": 0.9375,
    tee: 1.25,
    reducer: 0.75,
    coupling: 0.875,
    flange: 1.375,
    valve: 1.375,
  },
  '2"': {
    "90 elbow": 3,
    "45 elbow": 1.25,
    tee: 1.625,
    reducer: 0.875,
    coupling: 1,
    flange: 1.625,
    valve: 1.625,
  },
  '3"': {
    "90 elbow": 4.5,
    "45 elbow": 1.875,
    tee: 2.25,
    reducer: 1.125,
    coupling: 1.25,
    flange: 2,
    valve: 2,
  },
  '4"': {
    "90 elbow": 6,
    "45 elbow": 2.5,
    tee: 3,
    reducer: 1.5,
    coupling: 1.5,
    flange: 2.5,
    valve: 2.5,
  },
  '6"': {
    "90 elbow": 9,
    "45 elbow": 3.75,
    tee: 4.5,
    reducer: 2,
    coupling: 2,
    flange: 3.5,
    valve: 3.5,
  },
};

export function cloneDefaultTakeoffTable() {
  return Object.fromEntries(
    PIPE_SIZES.map((size) => [
      size,
      Object.fromEntries(
        FITTING_TYPES.map((fitting) => [fitting, DEFAULT_TAKEOFF_TABLE[size][fitting]])
      ),
    ])
  );
}

export function normalizeStoredTakeoffTable(raw) {
  const out = cloneDefaultTakeoffTable();
  if (!raw || typeof raw !== "object") return out;
  for (const size of PIPE_SIZES) {
    if (!raw[size] || typeof raw[size] !== "object") continue;
    for (const fitting of FITTING_TYPES) {
      const v = Number(raw[size][fitting]);
      if (Number.isFinite(v) && v >= 0) {
        out[size][fitting] = v;
      }
    }
  }
  return out;
}

export function getTakeoff(table, size, fitting) {
  if (!fitting || fitting === "none") return 0;
  const v = table[size]?.[fitting];
  return Number.isFinite(v) ? v : 0;
}
