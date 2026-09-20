"use client";

import styles from "@/app/page.module.css";

export default function DimensionSummary({ title, help, summary = [], assumptions = [], preview }) {
  return (
    <div>
      {title ? <h2>{title}</h2> : null}
      {help ? <p className={styles.helpText}>{help}</p> : null}
      <div className={styles.summaryPreview}>
        {preview ? (
          <svg viewBox="0 0 400 220" role="img" aria-label="Dimension preview" className={styles.summarySvg}>
            <rect x="40" y="30" width="320" height="150" fill="#f8fcfc" stroke="#0a6975" strokeWidth="3" />
            <text x="200" y="20" textAnchor="middle" className={styles.summarySvgText}>
              {preview.widthLabel || ""}
            </text>
            <text
              x="18"
              y="110"
              textAnchor="middle"
              transform="rotate(-90 18 110)"
            >
              {preview.heightLabel || ""}
            </text>
          </svg>
        ) : null}
        <div className={styles.materialSummary}>
          {summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      {assumptions.length > 0 ? (
        <div className={styles.assumptionList}>
          <p className={styles.helperNote}>Assumptions / estimates</p>
          <ul>
            {assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
