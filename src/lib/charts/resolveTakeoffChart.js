import { cloneTakeoffTable } from "../takeoff";
import { ELECTRICAL_SIZES, HVAC_SIZES, TAKEOFF_PRESETS } from "../takeoffPresets";
import { FITTING_TYPES, PIPE_SIZES } from "../constants";
import { DEFAULT_TAKEOFF_TABLE } from "../takeoff";
import {
  CHART_IDS,
  DEFAULT_CHART_SELECTION,
  emptyChartSelection,
} from "./chartTypes";
import { klein90Takeup, kleinSupportsMaterial, KLEIN_CHART_META } from "./electricalKlein";
import {
  CHARLOTTE_CHART_META,
  CHARLOTTE_UNMAPPED_REASON,
  charlotteSupportsMaterial,
} from "./plumbingCharlotte";

export function emptyFittingTable(sizes, fittingIds) {
  return cloneTakeoffTable(sizes, fittingIds, {});
}

export function emptyElectricalTable() {
  const preset = TAKEOFF_PRESETS.electrical;
  return emptyFittingTable(preset.sizes, preset.fittingIds);
}

export function emptyPlumbingTable() {
  const preset = TAKEOFF_PRESETS.plumbing;
  return emptyFittingTable(preset.sizes, preset.fittingIds);
}

/** Previous AI/preset electrical numbers — used only to detect old stored tables. */
export const LEGACY_ELECTRICAL_TAKEOFF_TABLE = {
  '1/2"': { "90 bend": 4, "45 bend": 2, offset: 6, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 3 },
  '3/4"': { "90 bend": 5, "45 bend": 2.5, offset: 8, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 3.5 },
  '1"': { "90 bend": 6, "45 bend": 3, offset: 10, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 4 },
  '1-1/4"': { "90 bend": 8, "45 bend": 4, offset: 12, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 5 },
  '1-1/2"': { "90 bend": 10, "45 bend": 5, offset: 14, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 6 },
  '2"': { "90 bend": 12, "45 bend": 6, offset: 16, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 7 },
  '3"': { "90 bend": 18, "45 bend": 9, offset: 24, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 10 },
  '4"': { "90 bend": 24, "45 bend": 12, offset: 32, coupling: 0, connector: 0, "junction box": 0, "pull box": 0, LB: 12 },
};

export function legacyPlumbingFromWelding() {
  const out = {};
  for (const size of PIPE_SIZES) {
    const p = DEFAULT_TAKEOFF_TABLE[size];
    out[size] = {
      "90 elbow": p["90 elbow"],
      "45 elbow": p["45 elbow"],
      tee: p.tee,
      wye: p.tee,
      coupling: p.coupling,
      valve: p.valve,
      cleanout: p.coupling,
      trap: p["90 elbow"],
    };
  }
  return out;
}

function tablesEqual(a, b, sizes, fittingIds) {
  if (!a || !b) return false;
  for (const size of sizes) {
    for (const fitting of fittingIds) {
      if (Number(a[size]?.[fitting] || 0) !== Number(b[size]?.[fitting] || 0)) {
        return false;
      }
    }
  }
  return true;
}

export function isLegacyElectricalTable(table) {
  return tablesEqual(
    table,
    LEGACY_ELECTRICAL_TAKEOFF_TABLE,
    ELECTRICAL_SIZES,
    TAKEOFF_PRESETS.electrical.fittingIds
  );
}

export function isLegacyPlumbingWeldingTable(table) {
  return tablesEqual(
    table,
    legacyPlumbingFromWelding(),
    PIPE_SIZES,
    TAKEOFF_PRESETS.plumbing.fittingIds
  );
}

function electricalMaterialFromConduitType(conduitType) {
  const v = String(conduitType || "").toLowerCase();
  if (v === "pvc") return "pvc";
  if (v === "rmc" || v === "rigid" || v === "rigid_imc") return "rigid_imc";
  if (v === "imc") return "rigid_imc";
  if (v === "fmc" || v === "company_custom" || v === "company") return "company_custom";
  return "emt";
}

export function conduitLabelFromMaterial(materialSystem) {
  if (materialSystem === "pvc") return "PVC";
  if (materialSystem === "rigid_imc") return "Rigid/IMC";
  if (materialSystem === "company_custom") return "Custom";
  return "EMT";
}

export function normalizeChartSelection(raw, options = {}) {
  const next = emptyChartSelection();
  const src = raw && typeof raw === "object" ? raw : {};

  const elec = src.electrical && typeof src.electrical === "object" ? src.electrical : {};
  next.electrical.materialSystem =
    elec.materialSystem ||
    electricalMaterialFromConduitType(options.conduitType) ||
    DEFAULT_CHART_SELECTION.electrical.materialSystem;
  next.electrical.chartId = elec.chartId || DEFAULT_CHART_SELECTION.electrical.chartId;

  if (next.electrical.materialSystem === "pvc" && next.electrical.chartId === CHART_IDS.kleinHandBender) {
    next.electrical.chartId = CHART_IDS.companyCustom;
  }
  if (next.electrical.materialSystem === "company_custom") {
    next.electrical.chartId = CHART_IDS.companyCustom;
  }

  const plum = src.plumbing && typeof src.plumbing === "object" ? src.plumbing : {};
  next.plumbing.materialSystem =
    plum.materialSystem || DEFAULT_CHART_SELECTION.plumbing.materialSystem;
  next.plumbing.chartId = plum.chartId || DEFAULT_CHART_SELECTION.plumbing.chartId;
  const charlotteOk = charlotteSupportsMaterial(next.plumbing.materialSystem);
  if (!charlotteOk) {
    next.plumbing.chartId = CHART_IDS.companyCustom;
  }

  const hvac = src.hvac && typeof src.hvac === "object" ? src.hvac : {};
  next.hvac.materialSystem = hvac.materialSystem || DEFAULT_CHART_SELECTION.hvac.materialSystem;
  next.hvac.chartId = CHART_IDS.companyCustom;

  return next;
}

function isZeroFittingTable(table, sizes, fittingIds) {
  if (!table) return true;
  for (const size of sizes) {
    for (const fitting of fittingIds) {
      if (Number(table[size]?.[fitting] || 0) !== 0) return false;
    }
  }
  return true;
}

export function inferChartSelectionFromStoredTables(tables, conduitType) {
  const selection = emptyChartSelection();
  selection.electrical.materialSystem = electricalMaterialFromConduitType(conduitType);
  const electricalEmpty =
    !tables?.electrical ||
    isLegacyElectricalTable(tables.electrical) ||
    isZeroFittingTable(
      tables.electrical,
      ELECTRICAL_SIZES,
      TAKEOFF_PRESETS.electrical.fittingIds
    );
  if (electricalEmpty) {
    selection.electrical.chartId =
      selection.electrical.materialSystem === "pvc" ||
      selection.electrical.materialSystem === "company_custom"
        ? CHART_IDS.companyCustom
        : CHART_IDS.kleinHandBender;
  } else {
    selection.electrical.chartId = CHART_IDS.companyCustom;
  }
  const plumbingEmpty =
    !tables?.plumbing ||
    isLegacyPlumbingWeldingTable(tables.plumbing) ||
    isZeroFittingTable(tables.plumbing, PIPE_SIZES, TAKEOFF_PRESETS.plumbing.fittingIds);
  if (plumbingEmpty) {
    selection.plumbing.chartId = CHART_IDS.charlotteDwv;
    selection.plumbing.materialSystem = tables?.plumbing
      ? selection.plumbing.materialSystem || "pvc_dwv"
      : "pvc_dwv";
  } else {
    selection.plumbing.chartId = CHART_IDS.companyCustom;
  }
  return selection;
}

function cellMeta(partial) {
  return {
    verificationStatus: "unverified",
    editable: true,
    sourceType: "unverified",
    sourceName: "",
    sourceUrl: "",
    manufacturer: "",
    chartName: "",
    chartVersion: "",
    verifiedAt: null,
    materialSystem: "",
    notes: "",
    ...partial,
  };
}

export function resolveElectricalChart({ materialSystem, chartId, customTable }) {
  const table = emptyElectricalTable();
  const metaBySize = {};
  const preset = TAKEOFF_PRESETS.electrical;
  const useKlein =
    chartId === CHART_IDS.kleinHandBender && kleinSupportsMaterial(materialSystem);

  for (const size of preset.sizes) {
    metaBySize[size] = {};
    for (const fitting of preset.fittingIds) {
      metaBySize[size][fitting] = cellMeta({
        materialSystem,
        notes:
          fitting === "90 bend"
            ? "No verified take-up for this size/material/chart combination."
            : "Klein offset/45/LB tables are not a single per-size cut-length deduction. Left unverified.",
      });
    }
  }

  if (useKlein) {
    for (const size of preset.sizes) {
      const takeup = klein90Takeup(materialSystem, size);
      if (takeup != null) {
        table[size]["90 bend"] = takeup;
        metaBySize[size]["90 bend"] = cellMeta({
          verificationStatus: "verified_chart",
          editable: false,
          sourceType: KLEIN_CHART_META.sourceType,
          sourceName: KLEIN_CHART_META.sourceName,
          sourceUrl: KLEIN_CHART_META.sourceUrl,
          manufacturer: KLEIN_CHART_META.manufacturer,
          chartName: KLEIN_CHART_META.chartName,
          chartVersion: KLEIN_CHART_META.chartVersion,
          verifiedAt: KLEIN_CHART_META.verifiedAt,
          materialSystem,
          notes:
            materialSystem === "rigid_imc"
              ? "Klein publishes this as Rigid. IMC is not named in this Klein guide — confirm on the bender."
              : "Klein 90° stub-up take-up. App subtracts this from Known Length when a 90 is on that end.",
        });
      }
    }
  } else if (customTable) {
    for (const size of preset.sizes) {
      for (const fitting of preset.fittingIds) {
        const v = Number(customTable[size]?.[fitting]);
        table[size][fitting] = Number.isFinite(v) && v >= 0 ? v : 0;
        metaBySize[size][fitting] = cellMeta({
          verificationStatus: "company_custom",
          sourceType: "company_custom",
          materialSystem,
          notes: "Company custom — not a verified manufacturer chart.",
        });
      }
    }
  }

  const verifiedCount = preset.sizes.reduce((sum, size) => {
    return metaBySize[size]["90 bend"]?.verificationStatus === "verified_chart" ? sum + 1 : sum;
  }, 0);

  let status;
  if (useKlein && verifiedCount > 0) {
    status = {
      kind: "verified",
      label: "Verified manufacturer chart",
      detail: "Klein Tools — Conduit Bending Basics",
      meta: KLEIN_CHART_META,
      rigidNote:
        materialSystem === "rigid_imc"
          ? "Klein lists these take-ups as Rigid. IMC is not named in this Klein guide."
          : "",
    };
  } else if (chartId === CHART_IDS.kleinHandBender && materialSystem === "pvc") {
    status = {
      kind: "unverified",
      label: "Company Custom / Unverified",
      detail: "Klein does not publish PVC take-up in this guide. PVC does not inherit EMT values.",
      meta: null,
    };
  } else {
    status = {
      kind: "unverified",
      label: "Company Custom / Unverified",
      detail: "Enter company values. Not labeled verified.",
      meta: null,
    };
  }

  return { table, cellMeta: metaBySize, status, usesKlein: useKlein };
}

export function resolvePlumbingChart({ materialSystem, chartId, customTable }) {
  const preset = TAKEOFF_PRESETS.plumbing;
  const table = emptyPlumbingTable();
  const metaBySize = {};

  for (const size of preset.sizes) {
    metaBySize[size] = {};
    for (const fitting of preset.fittingIds) {
      metaBySize[size][fitting] = cellMeta({
        materialSystem,
        verificationStatus: "unverified",
        notes: CHARLOTTE_UNMAPPED_REASON,
      });
    }
  }

  if (chartId === CHART_IDS.companyCustom && customTable) {
    for (const size of preset.sizes) {
      for (const fitting of preset.fittingIds) {
        const v = Number(customTable[size]?.[fitting]);
        table[size][fitting] = Number.isFinite(v) && v >= 0 ? v : 0;
        metaBySize[size][fitting] = cellMeta({
          verificationStatus: "company_custom",
          sourceType: "company_custom",
          materialSystem,
          notes: "Company custom — not a verified manufacturer chart.",
        });
      }
    }
  }

  const charlotteActive =
    chartId === CHART_IDS.charlotteDwv && charlotteSupportsMaterial(materialSystem);

  const status = charlotteActive
    ? {
        kind: "unverified",
        label: "Chart not verified for this material/manufacturer — enter company value.",
        detail: CHARLOTTE_CHART_META.chartName,
        meta: CHARLOTTE_CHART_META,
      }
    : {
        kind: "unverified",
        label:
          chartId === CHART_IDS.companyCustom
            ? "Company Custom / Unverified"
            : "Chart not verified for this material/manufacturer — enter company value.",
        detail: charlotteSupportsMaterial(materialSystem)
          ? ""
          : "Copper, CPVC, PEX, and Cast Iron charts are not loaded.",
        meta: null,
      };

  return { table, cellMeta: metaBySize, status, usesCharlotte: charlotteActive };
}

export function resolveActiveTakeoffChart({
  takeoffType,
  chartSelection,
  takeoffTables,
}) {
  const selection = normalizeChartSelection(chartSelection);
  if (takeoffType === "electrical") {
    return resolveElectricalChart({
      materialSystem: selection.electrical.materialSystem,
      chartId: selection.electrical.chartId,
      customTable: takeoffTables?.electrical,
    });
  }
  if (takeoffType === "plumbing") {
    return resolvePlumbingChart({
      materialSystem: selection.plumbing.materialSystem,
      chartId: selection.plumbing.chartId,
      customTable: takeoffTables?.plumbing,
    });
  }
  if (takeoffType === "hvac") {
    return {
      table: takeoffTables?.hvac || cloneTakeoffTable(HVAC_SIZES, TAKEOFF_PRESETS.hvac.fittingIds, {}),
      cellMeta: {},
      status: {
        kind: "unverified",
        label: "Company Custom / Unverified",
        detail:
          "Generated HVAC multipliers are not a SMACNA or manufacturer chart. Do not treat them as verified.",
        meta: null,
      },
      usesKlein: false,
    };
  }
  return {
    table: takeoffTables?.[takeoffType] || takeoffTables?.pipe,
    cellMeta: {},
    status: {
      kind: "verified",
      label: "Company / documented pipe table",
      detail: "",
      meta: null,
    },
  };
}

export { HVAC_SIZES, FITTING_TYPES };
