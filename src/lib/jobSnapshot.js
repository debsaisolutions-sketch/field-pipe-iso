import { EMPTY_FITTING_COUNTS } from "./constants";

export function createEmptyJobMeta() {
  return {
    name: "",
    customer: "",
    location: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

export function createDefaultSegment() {
  return {
    id: 1,
    label: "Run 1",
    knownLength: "120",
    direction: "east",
    startFitting: "none",
    endFitting: "90 elbow",
  };
}

export function createDefaultCalculatorRuns() {
  return [
    {
      id: "run-1",
      label: "Run 1",
      length: "",
      unit: "inches",
      direction: "east",
    },
  ];
}

/** Snapshot of the full editor state for cloud / local persistence. */
export function buildJobSnapshot(state) {
  const {
    id,
    job,
    pipeSize,
    segments,
    extraFittings,
    rotateTurns,
    flipped,
    overallLength,
    overallUnit,
    overallPipeSize,
    overallFittings,
    overallSketchMode,
    overallSketchLength,
    materialSource,
    overallMaterialFittings,
    calculatorRuns,
    takeoffTable,
  } = state;
  const now = new Date().toISOString();
  return {
    id: id || null,
    job_name: (job.name || "").trim(),
    customer_name: (job.customer || "").trim(),
    job_location: (job.location || "").trim(),
    job_date: job.date || null,
    notes: (job.notes || "").trim(),
    pipe_size: pipeSize,
    segments,
    fittings: {
      extraFittings,
      materialSource,
      overallMaterialFittings,
    },
    calculator_state: {
      overallLength,
      overallUnit,
      overallPipeSize,
      overallFittings,
      calculatorRuns,
      overallSketchMode,
      overallSketchLength,
    },
    drawing_settings: {
      rotateTurns,
      flipped,
    },
    takeoff_snapshot: takeoffTable,
    updated_at: now,
    created_at: now,
  };
}

export function snapshotToEditorState(row) {
  const fittings = row.fittings && typeof row.fittings === "object" ? row.fittings : {};
  const calc =
    row.calculator_state && typeof row.calculator_state === "object"
      ? row.calculator_state
      : {};
  const drawing =
    row.drawing_settings && typeof row.drawing_settings === "object"
      ? row.drawing_settings
      : {};

  const customer =
    row.customer_name || row.customer || row.customerLocation || "";
  const location = row.job_location || row.location || "";

  return {
    id: row.id || null,
    job: {
      name: row.job_name || row.name || "",
      customer,
      location,
      date: row.job_date || row.date || new Date().toISOString().slice(0, 10),
      notes: row.notes || "",
    },
    pipeSize: row.pipe_size || '2"',
    segments:
      Array.isArray(row.segments) && row.segments.length > 0
        ? row.segments
        : [createDefaultSegment()],
    extraFittings: fittings.extraFittings || { ...EMPTY_FITTING_COUNTS },
    materialSource: fittings.materialSource || "manual",
    overallMaterialFittings:
      fittings.overallMaterialFittings || { ...EMPTY_FITTING_COUNTS },
    overallLength: calc.overallLength ?? "120",
    overallUnit: calc.overallUnit || "inches",
    overallPipeSize: calc.overallPipeSize || row.pipe_size || '2"',
    overallFittings: calc.overallFittings || { ...EMPTY_FITTING_COUNTS },
    calculatorRuns:
      Array.isArray(calc.calculatorRuns) && calc.calculatorRuns.length > 0
        ? calc.calculatorRuns
        : createDefaultCalculatorRuns(),
    overallSketchMode: calc.overallSketchMode || "none",
    overallSketchLength: Number(calc.overallSketchLength) || 0,
    rotateTurns: Number(drawing.rotateTurns) || 0,
    flipped: Boolean(drawing.flipped),
    takeoffSnapshot: row.takeoff_snapshot || null,
    updatedAt: row.updated_at || null,
    createdAt: row.created_at || null,
  };
}

export function rowFromSnapshot(snapshot, userId) {
  return {
    user_id: userId,
    account_id: userId,
    job_name: snapshot.job_name || "",
    customer_name: snapshot.customer_name || "",
    job_location: snapshot.job_location || "",
    job_date: snapshot.job_date || null,
    notes: snapshot.notes || "",
    pipe_size: snapshot.pipe_size || '2"',
    segments: snapshot.segments || [],
    fittings: snapshot.fittings || {},
    calculator_state: snapshot.calculator_state || {},
    drawing_settings: snapshot.drawing_settings || {},
    takeoff_snapshot: snapshot.takeoff_snapshot || null,
  };
}

export function listItemFromRow(row) {
  return {
    id: row.id,
    job_name: row.job_name || "",
    customer_name: row.customer_name || "",
    job_location: row.job_location || "",
    updated_at: row.updated_at,
    created_at: row.created_at,
    source: row._source || "cloud",
  };
}
