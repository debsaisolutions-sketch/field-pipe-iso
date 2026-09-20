import { TAKEOFF_TYPE_IDS } from "./constants";

const ALIASES = {
  pipe: "pipe",
  welding: "pipe",
  "pipe/welding": "pipe",
  "pipe / welding": "pipe",
  hvac: "hvac",
  duct: "hvac",
  "hvac/duct": "hvac",
  "hvac / duct": "hvac",
  electrical: "electrical",
  electric: "electrical",
  plumbing: "plumbing",
  framing: "framing",
  drywall: "drywall",
  concrete: "concrete",
  masonry: "concrete",
  "concrete/masonry": "concrete",
  "concrete / masonry": "concrete",
};

/** Unknown or missing values load as pipe so old jobs stay compatible. */
export function normalizeTakeoffType(value) {
  if (value == null || value === "") return "pipe";
  const key = String(value).trim().toLowerCase();
  if (TAKEOFF_TYPE_IDS.includes(key)) return key;
  return ALIASES[key] || "pipe";
}

export function isRunBasedType(type) {
  const id = normalizeTakeoffType(type);
  return id === "pipe" || id === "hvac" || id === "electrical" || id === "plumbing";
}

export function isAreaBasedType(type) {
  return !isRunBasedType(type);
}
