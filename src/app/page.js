"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"', '6"'];
const FITTING_TYPES = [
  "90 elbow",
  "45 elbow",
  "tee",
  "reducer",
  "coupling",
  "flange",
  "valve",
];

const EMPTY_FITTING_COUNTS = Object.fromEntries(
  FITTING_TYPES.map((fitting) => [fitting, 0])
);

const DIRECTION_OPTIONS = [
  { value: "east", label: "East" },
  { value: "west", label: "West" },
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
];

const DIRECTION_VECTOR = {
  east: [1, 0, 0],
  west: [-1, 0, 0],
  north: [0, 1, 0],
  south: [0, -1, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};

const SAVED_JOBS_STORAGE_KEY = "field-pipe-iso.saved-jobs.v1";

function toInches(lengthValue, unit) {
  const length = Number(lengthValue) || 0;
  return unit === "feet" ? length * 12 : length;
}

function buildKnownLengthFromCalculatorRun(lengthValue, unit) {
  if (unit === "feet") {
    return `${toInches(lengthValue, unit)}`;
  }
  return String(lengthValue ?? "");
}

function formatRunLength(value) {
  const numeric = Number(value) || 0;
  return Number.isInteger(numeric) ? `${numeric}` : numeric.toFixed(2);
}

function formatDirectionLabel(directionValue) {
  if (!directionValue) return "East";
  return directionValue[0].toUpperCase() + directionValue.slice(1);
}

// Estimated takeoff table for MVP only.
// TODO: verify these with manufacturer and project spec data before production.
const TAKEOFF_TABLE = {
  '1/2"': { "90 elbow": 0.75, "45 elbow": 0.5, tee: 0.75, reducer: 0.25, coupling: 0.1, flange: 0.2, valve: 0.4 },
  '3/4"': { "90 elbow": 1, "45 elbow": 0.75, tee: 1, reducer: 0.25, coupling: 0.15, flange: 0.3, valve: 0.5 },
  '1"': { "90 elbow": 1.25, "45 elbow": 0.85, tee: 1.25, reducer: 0.3, coupling: 0.2, flange: 0.4, valve: 0.6 },
  '1-1/4"': { "90 elbow": 1.5, "45 elbow": 1, tee: 1.5, reducer: 0.35, coupling: 0.25, flange: 0.5, valve: 0.7 },
  '1-1/2"': { "90 elbow": 1.8, "45 elbow": 1.25, tee: 1.8, reducer: 0.4, coupling: 0.3, flange: 0.6, valve: 0.9 },
  '2"': { "90 elbow": 2.2, "45 elbow": 1.5, tee: 2.2, reducer: 0.5, coupling: 0.35, flange: 0.75, valve: 1.1 },
  '3"': { "90 elbow": 3.2, "45 elbow": 2.1, tee: 3.2, reducer: 0.7, coupling: 0.5, flange: 1, valve: 1.5 },
  '4"': { "90 elbow": 4.3, "45 elbow": 2.9, tee: 4.3, reducer: 0.9, coupling: 0.6, flange: 1.3, valve: 2.1 },
  '6"': { "90 elbow": 6.4, "45 elbow": 4.2, tee: 6.4, reducer: 1.3, coupling: 0.8, flange: 1.9, valve: 3 },
};

function getTakeoff(size, fitting) {
  if (!fitting || fitting === "none") return 0;
  return TAKEOFF_TABLE[size]?.[fitting] ?? 0;
}

function rotateVector([x, y, z], turns) {
  const normalized = ((turns % 4) + 4) % 4;
  if (normalized === 0) return [x, y, z];
  if (normalized === 1) return [-y, x, z];
  if (normalized === 2) return [-x, -y, z];
  return [y, -x, z];
}

function projectPoint([x, y, z], rotateTurns, flipped) {
  const [rx, ry, rz] = rotateVector([x, y, z], rotateTurns);
  const fx = flipped ? -rx : rx;
  const angle = Math.PI / 6;
  const px = (fx - ry) * Math.cos(angle);
  const py = (fx + ry) * Math.sin(angle) - rz;
  return [px, py];
}

function buildOverallSketchPoints(mode, straightLength) {
  const base = Math.max(straightLength, 1);

  if (mode === "l-shape") {
    const firstLeg = Math.max(base * 0.6, 1);
    const secondLeg = Math.max(base * 0.4, 1);
    return [
      [0, 0, 0],
      [firstLeg, 0, 0],
      [firstLeg, secondLeg, 0],
    ];
  }

  if (mode === "u-z-shape") {
    const firstLeg = Math.max(base * 0.45, 1);
    const middleLeg = Math.max(base * 0.35, 1);
    return [
      [0, 0, 0],
      [firstLeg, 0, 0],
      [firstLeg, middleLeg, 0],
      [0, middleLeg, 0],
    ];
  }

  return null;
}

export default function Home() {
  const [job, setJob] = useState({
    name: "",
    customerLocation: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [pipeSize, setPipeSize] = useState('2"');
  const [segments, setSegments] = useState([
    {
      id: 1,
      label: "Run 1",
      knownLength: "120",
      direction: "east",
      startFitting: "none",
      endFitting: "90 elbow",
    },
  ]);
  const [extraFittings, setExtraFittings] = useState(
    Object.fromEntries(FITTING_TYPES.map((fitting) => [fitting, 0]))
  );
  const [rotateTurns, setRotateTurns] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [overallLength, setOverallLength] = useState("120");
  const [overallUnit, setOverallUnit] = useState("inches");
  const [overallPipeSize, setOverallPipeSize] = useState('2"');
  const [overallFittings, setOverallFittings] = useState(EMPTY_FITTING_COUNTS);
  const [overallSketchMode, setOverallSketchMode] = useState("none");
  const [overallSketchLength, setOverallSketchLength] = useState(0);
  const [materialSource, setMaterialSource] = useState("manual");
  const [overallMaterialFittings, setOverallMaterialFittings] = useState(
    EMPTY_FITTING_COUNTS
  );
  const [overallMaterialTakeoff, setOverallMaterialTakeoff] = useState(0);
  const nextCalculatorRunId = useRef(2);
  const [calculatorRuns, setCalculatorRuns] = useState([
    {
      id: "run-1",
      label: "Run 1",
      length: "",
      unit: "inches",
      direction: "east",
    },
  ]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedSavedJobId, setSelectedSavedJobId] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SAVED_JOBS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed
        .map((item) => ({
          id: String(item.id || ""),
          name: String(item.name || ""),
          customerLocation: String(item.customerLocation || ""),
          notes: String(item.notes || ""),
        }))
        .filter((item) => item.id);
      setSavedJobs(normalized);
    } catch {
      setSavedJobs([]);
    }
  }, []);

  const segmentRows = useMemo(() => {
    return segments.map((segment) => {
      const known = Number(segment.knownLength) || 0;
      const startTakeoff = getTakeoff(pipeSize, segment.startFitting);
      const endTakeoff = getTakeoff(pipeSize, segment.endFitting);
      const totalTakeoff = startTakeoff + endTakeoff;
      const cutLength = Math.max(known - totalTakeoff, 0);
      return {
        ...segment,
        known,
        startTakeoff,
        endTakeoff,
        totalTakeoff,
        cutLength,
      };
    });
  }, [segments, pipeSize]);

  const materialTotals = useMemo(() => {
    if (materialSource === "overall") {
      const fittingTotals = Object.fromEntries(
        FITTING_TYPES.map((fitting) => [fitting, overallMaterialFittings[fitting] || 0])
      );
      const totalKnownLength = segmentRows.reduce((sum, segment) => sum + segment.known, 0);
      const totalCutLength = segmentRows.reduce((sum, segment) => sum + segment.cutLength, 0);

      return {
        fittingTotals,
        totalKnownLength,
        totalCutLength,
        totalTakeoff: overallMaterialTakeoff,
      };
    }

    const fittingTotals = Object.fromEntries(
      FITTING_TYPES.map((fitting) => [fitting, extraFittings[fitting] || 0])
    );

    for (const segment of segmentRows) {
      if (segment.startFitting !== "none") {
        fittingTotals[segment.startFitting] += 1;
      }
      if (segment.endFitting !== "none") {
        fittingTotals[segment.endFitting] += 1;
      }
    }

    const totalKnownLength = segmentRows.reduce((sum, segment) => sum + segment.known, 0);
    const totalCutLength = segmentRows.reduce((sum, segment) => sum + segment.cutLength, 0);
    const totalTakeoff = segmentRows.reduce((sum, segment) => sum + segment.totalTakeoff, 0);

    return {
      fittingTotals,
      totalKnownLength,
      totalCutLength,
      totalTakeoff,
    };
  }, [
    extraFittings,
    segmentRows,
    materialSource,
    overallMaterialFittings,
    overallMaterialTakeoff,
  ]);

  const overallLengthCalc = useMemo(() => {
    const overallInches = toInches(overallLength, overallUnit);

    const totalTakeoff = FITTING_TYPES.reduce((sum, fitting) => {
      const count = Number(overallFittings[fitting]) || 0;
      return sum + count * getTakeoff(overallPipeSize, fitting);
    }, 0);

    const straightCutLength = overallInches - totalTakeoff;

    return {
      overallInches,
      totalTakeoff,
      straightCutLength,
      isNonPositive: straightCutLength <= 0,
    };
  }, [overallLength, overallUnit, overallPipeSize, overallFittings]);

  const calculatorRunTotals = useMemo(() => {
    const totalInches = calculatorRuns.reduce(
      (sum, run) => sum + toInches(run.length, run.unit),
      0
    );
    const differenceInches = totalInches - overallLengthCalc.overallInches;

    return {
      totalInches,
      differenceInches,
      matchesOverall: Math.abs(differenceInches) < 0.01,
    };
  }, [calculatorRuns, overallLengthCalc.overallInches]);

  const drawingModel = useMemo(() => {
    let points3d = buildOverallSketchPoints(overallSketchMode, overallSketchLength);

    if (!points3d) {
      let cursor = [0, 0, 0];
      points3d = [cursor];

      for (const row of segmentRows) {
        const scalar = row.known > 0 ? row.known : 0;
        const [vx, vy, vz] = DIRECTION_VECTOR[row.direction] || [1, 0, 0];
        cursor = [cursor[0] + vx * scalar, cursor[1] + vy * scalar, cursor[2] + vz * scalar];
        points3d.push(cursor);
      }
    }

    const points2d = points3d.map((point) => projectPoint(point, rotateTurns, flipped));
    const xs = points2d.map((point) => point[0]);
    const ys = points2d.map((point) => point[1]);
    const minX = Math.min(...xs, 0);
    const minY = Math.min(...ys, 0);
    const maxX = Math.max(...xs, 1);
    const maxY = Math.max(...ys, 1);
    const width = maxX - minX;
    const height = maxY - minY;
    const innerWidth = 640;
    const innerHeight = 360;
    const padding = 32;
    const scale = Math.min(
      (innerWidth - padding * 2) / Math.max(width, 1),
      (innerHeight - padding * 2) / Math.max(height, 1)
    );

    const normalized = points2d.map(([x, y]) => [
      (x - minX) * scale + padding,
      (y - minY) * scale + padding,
    ]);

    return {
      points: normalized,
      width: innerWidth,
      height: innerHeight,
    };
  }, [segmentRows, rotateTurns, flipped, overallSketchMode, overallSketchLength]);

  function updateJobField(field, value) {
    setJob((prev) => ({ ...prev, [field]: value }));
  }

  function persistSavedJobs(nextSavedJobs) {
    setSavedJobs(nextSavedJobs);
    window.localStorage.setItem(
      SAVED_JOBS_STORAGE_KEY,
      JSON.stringify(nextSavedJobs)
    );
  }

  function saveCurrentJob() {
    const nextSavedJob = {
      id: String(Date.now()),
      name: job.name.trim(),
      customerLocation: job.customerLocation.trim(),
      notes: job.notes.trim(),
    };

    if (!nextSavedJob.name && !nextSavedJob.customerLocation && !nextSavedJob.notes) {
      return;
    }

    persistSavedJobs([nextSavedJob, ...savedJobs]);
    setSelectedSavedJobId(nextSavedJob.id);
  }

  function applySavedJob(savedJobId) {
    setSelectedSavedJobId(savedJobId);
    const chosen = savedJobs.find((savedJob) => savedJob.id === savedJobId);
    if (!chosen) return;

    setJob((prev) => ({
      ...prev,
      name: chosen.name,
      customerLocation: chosen.customerLocation,
      notes: chosen.notes,
    }));
  }

  function clearJobInfo() {
    setSelectedSavedJobId("");
    setJob((prev) => ({
      ...prev,
      name: "",
      customerLocation: "",
      notes: "",
    }));
  }

  function addPipeRun() {
    setSegments((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: `Run ${prev.length + 1}`,
        knownLength: "",
        direction: "east",
        startFitting: "none",
        endFitting: "none",
      },
    ]);
  }

  function removePipeRun(id) {
    setSegments((prev) => prev.filter((segment) => segment.id !== id));
  }

  function updateSegment(id, field, value) {
    setSegments((prev) =>
      prev.map((segment) =>
        segment.id === id ? { ...segment, [field]: value } : segment
      )
    );
  }

  function addCalculatorRun() {
    const runId = `run-${nextCalculatorRunId.current}`;
    nextCalculatorRunId.current += 1;

    setCalculatorRuns((prev) => [
      ...prev,
      {
        id: runId,
        label: `Run ${prev.length + 1}`,
        length: "",
        unit: "inches",
        direction: "east",
      },
    ]);
  }

  function removeCalculatorRun(id) {
    setCalculatorRuns((prev) => prev.filter((run) => run.id !== id));
  }

  function updateCalculatorRun(id, field, value) {
    setCalculatorRuns((prev) =>
      prev.map((run) => (run.id === id ? { ...run, [field]: value } : run))
    );
  }

  function addFittingQuick(type) {
    setMaterialSource("manual");
    setExtraFittings((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
  }

  function updateOverallFittingCount(fitting, value) {
    if (value === "") {
      setOverallFittings((prev) => ({ ...prev, [fitting]: "" }));
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    setOverallFittings((prev) => ({
      ...prev,
      [fitting]: value,
    }));
  }

  function exportPdf() {
    window.print();
  }

  function buildDrawingFromOverallLength() {
    const straightCutLength = Math.max(overallLengthCalc.straightCutLength, 0);
    const straightCutLengthString = straightCutLength.toFixed(2);
    const ninetyCount = Number(overallFittings["90 elbow"]) || 0;

    setPipeSize(overallPipeSize);
    const runsWithLength = calculatorRuns.filter((run) => Number(run.length) > 0);

    if (runsWithLength.length > 0) {
      setSegments(
        runsWithLength.map((run, index) => ({
          id: Date.now() + index,
          label: run.label || `Run ${index + 1}`,
          knownLength: buildKnownLengthFromCalculatorRun(run.length, run.unit),
          direction: run.direction || "east",
          startFitting: "none",
          endFitting: "none",
        }))
      );
    } else {
      setSegments((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: Date.now(),
              label: "Run 1",
              knownLength: straightCutLengthString,
              direction: "east",
              startFitting: "none",
              endFitting: "none",
            },
          ];
        }

        return prev.map((segment, index) =>
          index === 0
            ? {
                ...segment,
                knownLength: straightCutLengthString,
                startFitting: "none",
                endFitting: "none",
              }
            : segment
        );
      });
    }

    const exactOverallFittings = Object.fromEntries(
      FITTING_TYPES.map((fitting) => [fitting, Number(overallFittings[fitting]) || 0])
    );
    setOverallMaterialFittings(exactOverallFittings);
    setOverallMaterialTakeoff(overallLengthCalc.totalTakeoff);
    setMaterialSource("overall");

    if (ninetyCount === 1) {
      setOverallSketchMode("l-shape");
      setOverallSketchLength(straightCutLength);
      return;
    }

    if (ninetyCount >= 2) {
      setOverallSketchMode("u-z-shape");
      setOverallSketchLength(straightCutLength);
      return;
    }

    setOverallSketchMode("none");
    setOverallSketchLength(0);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Field Pipe Iso</h1>
        <p>Simple field takeoff for pipe runs, fittings, and print-ready isometric output.</p>
      </header>

      <main className={styles.mainGrid}>
        <div className={styles.leftColumn}>
        <section className={`${styles.panel} ${styles.jobPanel}`}>
          <h2>Job Info</h2>
          <div className={styles.jobPresetRow}>
            <label className={styles.inlineLabel}>
              Saved Jobs
              <select
                value={selectedSavedJobId}
                onChange={(event) => applySavedJob(event.target.value)}
              >
                <option value="">Select a saved job</option>
                {savedJobs.map((savedJob) => (
                  <option key={savedJob.id} value={savedJob.id}>
                    {savedJob.name || "Untitled Job"}
                    {savedJob.customerLocation ? ` - ${savedJob.customerLocation}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.localOnlyNote}>Saved jobs are stored on this device only.</p>
          <div className={styles.formGrid}>
            <label>
              Job Name
              <input
                value={job.name}
                onChange={(event) => updateJobField("name", event.target.value)}
                placeholder="Example: Boiler Room Retrofit"
              />
            </label>
            <label>
              Customer / Location
              <input
                value={job.customerLocation}
                onChange={(event) => updateJobField("customerLocation", event.target.value)}
                placeholder="Customer and site"
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={job.date}
                onChange={(event) => updateJobField("date", event.target.value)}
              />
            </label>
            <label className={styles.fullWidth}>
              Notes
              <textarea
                value={job.notes}
                onChange={(event) => updateJobField("notes", event.target.value)}
                placeholder="Scope notes, crew notes, install assumptions..."
              />
            </label>
            <div className={`${styles.fullWidth} ${styles.jobActionsRow}`}>
              <button
                className={styles.secondaryActionBtn}
                type="button"
                onClick={saveCurrentJob}
              >
                Save Current Job
              </button>
              <button className={styles.secondaryActionBtn} type="button" onClick={clearJobInfo}>
                Clear Job Info
              </button>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.fittingsPanel}`}>
          <h2>Fittings</h2>
          <p className={styles.helpText}>Quick-add extra fittings not already assigned to run starts/ends.</p>
          <div className={styles.fitButtons}>
            {FITTING_TYPES.map((fitting) => (
              <button key={fitting} onClick={() => addFittingQuick(fitting)} type="button">
                {fitting === "90 elbow" ? "Add 90" : fitting === "45 elbow" ? "Add 45" : `Add ${fitting}`}
              </button>
            ))}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.pipeRunsPanel}`}>
          <h2>Pipe & Runs</h2>
          <label className={styles.inlineLabel}>
            Pipe Size
            <select value={pipeSize} onChange={(event) => setPipeSize(event.target.value)}>
              {PIPE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <button className={styles.primaryBtn} onClick={addPipeRun} type="button">
            Add Pipe Run
          </button>
          <p className={styles.helperNote}>
            Tip: Add each straight section as a run. Use Direction to show the next turn.
            Example: Run 1 East + 90 elbow, Run 2 North.
          </p>

          <div className={styles.runList}>
            {segmentRows.map((segment, index) => (
              <article className={styles.runCard} key={segment.id}>
                <div className={styles.runHeader}>
                  <strong>Run {index + 1}</strong>
                  <button onClick={() => removePipeRun(segment.id)} type="button">
                    Remove
                  </button>
                </div>
                <div className={styles.runFields}>
                  <label>
                    Label
                    <input
                      value={segment.label}
                      onChange={(event) => updateSegment(segment.id, "label", event.target.value)}
                    />
                  </label>
                  <label>
                    Known Length (in)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={segment.knownLength}
                      onChange={(event) => updateSegment(segment.id, "knownLength", event.target.value)}
                    />
                  </label>
                  <label>
                    Direction
                    <select
                      value={segment.direction}
                      onChange={(event) => updateSegment(segment.id, "direction", event.target.value)}
                    >
                      {DIRECTION_OPTIONS.map((direction) => (
                        <option key={direction.value} value={direction.value}>
                          {direction.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Start Fitting
                    <select
                      value={segment.startFitting}
                      onChange={(event) => updateSegment(segment.id, "startFitting", event.target.value)}
                    >
                      <option value="none">None</option>
                      {FITTING_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    End Fitting
                    <select
                      value={segment.endFitting}
                      onChange={(event) => updateSegment(segment.id, "endFitting", event.target.value)}
                    >
                      <option value="none">None</option>
                      {FITTING_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={styles.calcRow}>
                  <span>Takeoff: {segment.totalTakeoff.toFixed(2)} in</span>
                  <span>Estimated Cut: {segment.cutLength.toFixed(2)} in</span>
                </div>
              </article>
            ))}
          </div>
        </section>
        </div>

        <div className={styles.rightColumn}>
        <section className={`${styles.panel} ${styles.overallPanel}`}>
          <h2>Overall Length Calculator</h2>
          <p className={styles.helpText}>
            Enter total end-to-end length, choose units and pipe size, then add fitting counts.
          </p>

          <div className={styles.runFields}>
            <label>
              Overall Length
              <input
                type="number"
                min="0"
                step="0.01"
                value={overallLength}
                onChange={(event) => setOverallLength(event.target.value)}
              />
            </label>
            <label>
              Unit
              <select
                value={overallUnit}
                onChange={(event) => setOverallUnit(event.target.value)}
              >
                <option value="inches">Inches</option>
                <option value="feet">Feet</option>
              </select>
            </label>
            <label>
              Pipe Size
              <select
                value={overallPipeSize}
                onChange={(event) => setOverallPipeSize(event.target.value)}
              >
                {PIPE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.runList}>
            <article className={styles.runCard}>
              <div className={styles.runHeader}>
                <strong>Run Breakdown</strong>
              </div>
              <div className={styles.runList}>
                {calculatorRuns.map((run, index) => (
                  <div key={run.id} className={styles.calcRunRow}>
                    <div className={styles.runFields}>
                      <label>
                        Label
                        <input
                          value={run.label}
                          onChange={(event) =>
                            updateCalculatorRun(run.id, "label", event.target.value)
                          }
                          placeholder={`Run ${index + 1}`}
                        />
                      </label>
                      <label>
                        Length
                        <input
                          type="text"
                          inputMode="decimal"
                          value={run.length}
                          onChange={(event) =>
                            updateCalculatorRun(run.id, "length", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Unit
                        <select
                          value={run.unit}
                          onChange={(event) =>
                            updateCalculatorRun(run.id, "unit", event.target.value)
                          }
                        >
                          <option value="inches">Inches</option>
                          <option value="feet">Feet</option>
                        </select>
                      </label>
                      <label>
                        Direction
                        <select
                          value={run.direction}
                          onChange={(event) =>
                            updateCalculatorRun(run.id, "direction", event.target.value)
                          }
                        >
                          {DIRECTION_OPTIONS.map((direction) => (
                            <option key={direction.value} value={direction.value}>
                              {direction.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCalculatorRun(run.id)}
                      disabled={calculatorRuns.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.materialSummary}>
                <p>Run Total: {calculatorRunTotals.totalInches.toFixed(2)} in</p>
                {calculatorRunTotals.matchesOverall ? (
                  <p>Run total matches overall length.</p>
                ) : (
                  <p>
                    Difference from overall length:{" "}
                    {Math.abs(calculatorRunTotals.differenceInches).toFixed(2)} in{" "}
                    {calculatorRunTotals.differenceInches > 0 ? "(over)" : "(under)"}
                  </p>
                )}
              </div>
              <button type="button" onClick={addCalculatorRun}>
                Add Calculator Run
              </button>
            </article>
          </div>

          <div className={styles.runList}>
            <article className={styles.runCard}>
              <strong>Fitting Counts</strong>
              <div className={styles.runFields}>
                {FITTING_TYPES.map((fitting) => (
                  <label key={fitting}>
                    {fitting}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={overallFittings[fitting]}
                      onChange={(event) =>
                        updateOverallFittingCount(fitting, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.materialSummary}>
            <p>Overall Length: {overallLengthCalc.overallInches.toFixed(2)} in</p>
            <p>Total Fitting Takeoff: {overallLengthCalc.totalTakeoff.toFixed(2)} in</p>
            <p>
              Estimated Straight Pipe Cut Length:{" "}
              {Math.max(overallLengthCalc.straightCutLength, 0).toFixed(2)} in
            </p>
            {overallLengthCalc.isNonPositive && (
              <p className={styles.warningText}>
                Warning: Estimated cut length is zero or negative. Check overall length, size, and fitting counts.
              </p>
            )}
          </div>
          <button
            className={styles.primaryBtn}
            type="button"
            onClick={buildDrawingFromOverallLength}
          >
            Build Drawing From Overall Length
          </button>
        </section>

        <section className={`${styles.panel} ${styles.drawingPanel}`}>
          <div className={styles.drawingTop}>
            <div>
              <h2>Drawing Preview</h2>
              <p className={styles.helpText}>Simplified field sketch for quick communication only.</p>
            </div>
            <div className={styles.drawButtons}>
              <button type="button" onClick={() => setRotateTurns((prev) => prev - 1)}>
                Rotate Left
              </button>
              <button type="button" onClick={() => setRotateTurns((prev) => prev + 1)}>
                Rotate Right
              </button>
              <button type="button" onClick={() => setFlipped((prev) => !prev)}>
                Flip View
              </button>
              <button
                type="button"
                onClick={() => {
                  setRotateTurns(0);
                  setFlipped(false);
                }}
              >
                Reset View
              </button>
              <button type="button" className={styles.primaryBtn} onClick={exportPdf}>
                Export PDF
              </button>
            </div>
          </div>

          <div className={styles.svgWrap}>
            <svg
              viewBox={`0 0 ${drawingModel.width} ${drawingModel.height}`}
              role="img"
              aria-label="Pipe isometric preview"
            >
              <rect x="0" y="0" width={drawingModel.width} height={drawingModel.height} />
              {drawingModel.points.slice(0, -1).map((point, index) => {
                const next = drawingModel.points[index + 1];
                const midX = (point[0] + next[0]) / 2;
                const midY = (point[1] + next[1]) / 2;
                const dx = next[0] - point[0];
                const dy = next[1] - point[1];
                const magnitude = Math.hypot(dx, dy) || 1;
                const offset = 14;
                const labelX = midX + (-dy / magnitude) * offset;
                const labelY = midY + (dx / magnitude) * offset;
                const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
                const readableAngle =
                  rawAngle > 90 || rawAngle < -90 ? rawAngle + 180 : rawAngle;
                const segment = segmentRows[index];
                const runText = segment?.label || `Run ${index + 1}`;
                const lengthText = `${formatRunLength(segment?.known)} in`;
                const directionText = formatDirectionLabel(segment?.direction);
                return (
                  <g key={`seg-${index}`}>
                    <line x1={point[0]} y1={point[1]} x2={next[0]} y2={next[1]} />
                    <text
                      x={labelX}
                      y={labelY}
                      transform={`rotate(${readableAngle} ${labelX} ${labelY})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {`${runText} • ${lengthText} • ${directionText}`}
                    </text>
                  </g>
                );
              })}
              {drawingModel.points.map((point, index) => (
                <circle key={`pt-${index}`} cx={point[0]} cy={point[1]} r="3.5" />
              ))}
            </svg>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.materialPanel}`}>
          <h2>Material List</h2>
          <div className={styles.materialSummary}>
            <p>Pipe Size: {pipeSize}</p>
            <p>Total Known Length: {materialTotals.totalKnownLength.toFixed(2)} in</p>
            <p>Total Estimated Takeoff: {materialTotals.totalTakeoff.toFixed(2)} in</p>
            <p>Total Estimated Cut Length: {materialTotals.totalCutLength.toFixed(2)} in</p>
          </div>
          <table className={styles.bomTable}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Pipe ({pipeSize})</td>
                <td>{materialTotals.totalCutLength.toFixed(2)} in</td>
              </tr>
              {FITTING_TYPES.map((fitting) => (
                <tr key={fitting}>
                  <td>{fitting}</td>
                  <td>{materialTotals.fittingTotals[fitting]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        </div>
      </main>
    </div>
  );
}
