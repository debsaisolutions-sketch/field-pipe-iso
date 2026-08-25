"use client";

import { FITTING_TYPES } from "@/lib/constants";
import { formatDirectionLabel, formatRunLength } from "@/lib/geometry";
import styles from "@/app/page.module.css";

function formatGeneratedAt(date = new Date()) {
  try {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return date.toISOString();
  }
}

/**
 * Print-only professional field-to-shop spool sheet.
 * Hidden on screen; shown when Export PDF / window.print() runs.
 */
export default function PrintDocument({
  job,
  pipeSize,
  segmentRows,
  materialTotals,
  drawingModel,
  warnings = [],
}) {
  const customerLine = [job.customer, job.location].filter(Boolean).join(" · ");
  const generatedAt = formatGeneratedAt();

  return (
    <div className={styles.printDocument} aria-hidden="true">
      <header className={styles.printHeader}>
        <div>
          <p className={styles.printBrand}>PipeSketch Pro</p>
          <p className={styles.printSubtitle}>Field-to-shop pipe isometric &amp; takeoff</p>
        </div>
        <div className={styles.printMeta}>
          <p>Generated {generatedAt}</p>
          <p>Crew does not need an account</p>
        </div>
      </header>

      <section className={styles.printJobBlock}>
        <h1 className={styles.printJobTitle}>{job.name || "Untitled Job"}</h1>
        <div className={styles.printJobGrid}>
          <div>
            <span className={styles.printLabel}>Customer</span>
            <p>{job.customer || "—"}</p>
          </div>
          <div>
            <span className={styles.printLabel}>Location</span>
            <p>{job.location || "—"}</p>
          </div>
          <div>
            <span className={styles.printLabel}>Date</span>
            <p>{job.date || "—"}</p>
          </div>
          <div>
            <span className={styles.printLabel}>Pipe size</span>
            <p>{pipeSize}</p>
          </div>
        </div>
        {job.notes ? (
          <div className={styles.printNotes}>
            <span className={styles.printLabel}>Notes</span>
            <p>{job.notes}</p>
          </div>
        ) : null}
        {customerLine && !job.customer && !job.location ? (
          <p className={styles.printNotes}>{customerLine}</p>
        ) : null}
      </section>

      <section className={styles.printDrawingBlock}>
        <h2>Isometric drawing</h2>
        <svg
          viewBox={`0 0 ${drawingModel.width} ${drawingModel.height}`}
          role="img"
          aria-label="Pipe isometric drawing"
          className={styles.printSvg}
        >
          <rect
            x="0"
            y="0"
            width={drawingModel.width}
            height={drawingModel.height}
            fill="#fff"
            stroke="#ccc"
          />
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
              <g key={`print-seg-${index}`}>
                <line
                  x1={point[0]}
                  y1={point[1]}
                  x2={next[0]}
                  y2={next[1]}
                  stroke="#111"
                  strokeWidth="2.5"
                />
                <text
                  x={labelX}
                  y={labelY}
                  transform={`rotate(${readableAngle} ${labelX} ${labelY})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fill="#222"
                >
                  {`${runText} • ${lengthText} • ${directionText}`}
                </text>
              </g>
            );
          })}
          {drawingModel.points.map((point, index) => (
            <circle
              key={`print-pt-${index}`}
              cx={point[0]}
              cy={point[1]}
              r="3.5"
              fill="#111"
            />
          ))}
        </svg>
      </section>

      <section className={styles.printRunsBlock}>
        <h2>Run-by-run cut lengths</h2>
        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>Run</th>
              <th>Known (in)</th>
              <th>Start</th>
              <th>End</th>
              <th>Takeoff (in)</th>
              <th>Cut (in)</th>
              <th>Dir</th>
            </tr>
          </thead>
          <tbody>
            {segmentRows.map((segment, index) => (
              <tr key={segment.id || index}>
                <td>{segment.label || `Run ${index + 1}`}</td>
                <td>{segment.known.toFixed(2)}</td>
                <td>{segment.startFitting === "none" ? "—" : segment.startFitting}</td>
                <td>{segment.endFitting === "none" ? "—" : segment.endFitting}</td>
                <td>{segment.totalTakeoff.toFixed(2)}</td>
                <td>{segment.cutLength.toFixed(2)}</td>
                <td>{formatDirectionLabel(segment.direction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.printTotalsBlock}>
        <h2>Totals</h2>
        <div className={styles.printTotalsGrid}>
          <p>
            <strong>Total known length:</strong>{" "}
            {materialTotals.totalKnownLength.toFixed(2)} in
          </p>
          <p>
            <strong>Total takeoff:</strong> {materialTotals.totalTakeoff.toFixed(2)} in
          </p>
          <p>
            <strong>Total pipe cut length:</strong>{" "}
            {materialTotals.totalCutLength.toFixed(2)} in
          </p>
        </div>
      </section>

      <section className={styles.printMaterialBlock}>
        <h2>Material / fitting list</h2>
        <table className={styles.printTable}>
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
            {FITTING_TYPES.map((fitting) => {
              const qty = materialTotals.fittingTotals[fitting] || 0;
              if (!qty) return null;
              return (
                <tr key={fitting}>
                  <td>{fitting}</td>
                  <td>{qty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {warnings.length > 0 ? (
        <section className={styles.printWarnings}>
          <h2>Warnings</h2>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className={styles.printFooter}>
        <p>
          PipeSketch Pro · Verify takeoffs and dimensions in the field before cutting or welding.
        </p>
      </footer>
    </div>
  );
}
