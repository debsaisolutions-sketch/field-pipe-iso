"use client";

import DimensionSummary from "@/components/DimensionSummary";
import { formatRunDrawingLabel } from "@/lib/runTakeoff";
import { getPreset } from "@/lib/takeoffPresets";
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
  takeoffType = "pipe",
  pipeSize,
  conduitType,
  segmentRows = [],
  materialList,
  drawingModel,
  warnings = [],
}) {
  const preset = getPreset(takeoffType);
  const terms = preset.terminology;
  const customerLine = [job.customer, job.location].filter(Boolean).join(" · ");
  const generatedAt = formatGeneratedAt();
  const isRunDrawing = preset.drawingMode === "iso-runs";
  const summaryLines = (materialList?.summary || []).map((row) =>
    row.label ? `${row.label}: ${row.value}` : row.value
  );
  const printRows = (materialList?.rows || []).filter((row) => {
    const qty = String(row.qty ?? "");
    return qty !== "0" && qty !== "0.00";
  });

  return (
    <div className={styles.printDocument} aria-hidden="true">
      <header className={styles.printHeader}>
        <div>
          <p className={styles.printBrand}>PipeSketch Pro</p>
          <p className={styles.printSubtitle}>{terms.printSubtitle}</p>
        </div>
        <div className={styles.printMeta}>
          <p suppressHydrationWarning>Generated {generatedAt}</p>
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
            <span className={styles.printLabel}>Takeoff type</span>
            <p>{preset.displayName}</p>
          </div>
          {preset.layout === "runs" ? (
            <div>
              <span className={styles.printLabel}>{terms.printSizeLabel}</span>
              <p>
                {takeoffType === "electrical" && conduitType ? `${conduitType} ` : ""}
                {pipeSize}
              </p>
            </div>
          ) : null}
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
        <h2>{terms.printDrawingTitle}</h2>
        {isRunDrawing && drawingModel ? (
          <svg
            viewBox={`0 0 ${drawingModel.width} ${drawingModel.height}`}
            role="img"
            aria-label={terms.drawingAria}
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
              const label = formatRunDrawingLabel(segment, index, preset, pipeSize, {
                conduitType,
              });
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
                    {label}
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
        ) : (
          <DimensionSummary
            summary={summaryLines}
            assumptions={materialList?.assumptions || []}
            preview={materialList?.preview}
          />
        )}
      </section>

      {isRunDrawing ? (
        <section className={styles.printRunsBlock}>
          <h2>{terms.printRunsTitle}</h2>
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
                  <td>
                    {segment.direction
                      ? segment.direction[0].toUpperCase() + segment.direction.slice(1)
                      : "East"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {materialList?.assumptions?.length && isRunDrawing ? (
        <section className={styles.printTotalsBlock}>
          <h2>Assumptions</h2>
          <ul>
            {materialList.assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {isRunDrawing ? (
        <section className={styles.printTotalsBlock}>
          <h2>Totals</h2>
          <div className={styles.printTotalsGrid}>
            {(materialList?.summary || []).map((row) => (
              <p key={`${row.label}-${row.value}`}>
                <strong>{row.label}:</strong> {row.value}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.printMaterialBlock}>
        <h2>{terms.printMaterialTitle}</h2>
        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((row) => (
              <tr key={row.item}>
                <td>{row.item}</td>
                <td>{row.qty}</td>
              </tr>
            ))}
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
        <p>{terms.printFooter}</p>
      </footer>
    </div>
  );
}
