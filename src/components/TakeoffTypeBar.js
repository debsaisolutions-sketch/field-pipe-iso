"use client";

import { TAKEOFF_TYPE_OPTIONS } from "@/lib/constants";
import {
  CHART_IDS,
  ELECTRICAL_CHARTS,
  ELECTRICAL_MATERIALS,
  HVAC_CHARTS,
  HVAC_MATERIALS,
  PLUMBING_CHARTS,
  PLUMBING_MATERIALS,
} from "@/lib/charts/chartTypes";
import styles from "@/app/page.module.css";

export default function TakeoffTypeBar({
  takeoffType,
  preset,
  categories,
  onTypeChange,
  onToggleCategory,
  onSaveDefault,
  defaultSaved,
  chartSelection,
  chartStatus,
  onChartSelectionChange,
}) {
  const elec = chartSelection?.electrical;
  const plum = chartSelection?.plumbing;
  const hvac = chartSelection?.hvac;

  return (
    <section className={`${styles.panel} ${styles.takeoffTypePanel}`}>
      <h2>What are you taking off?</h2>
      <p className={styles.helpText}>
        Choose one takeoff type. Job info stays; runs and calculations switch with the type.
      </p>
      <label className={styles.inlineLabel}>
        Takeoff type
        <select
          value={takeoffType}
          onChange={(event) => onTypeChange(event.target.value)}
          aria-label="What are you taking off?"
        >
          {TAKEOFF_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {takeoffType === "electrical" && elec ? (
        <div className={styles.chartSelectorBlock}>
          <label className={styles.inlineLabel}>
            Conduit type
            <select
              value={elec.materialSystem}
              onChange={(event) =>
                onChartSelectionChange("electrical", { materialSystem: event.target.value })
              }
              aria-label="Conduit type"
            >
              {ELECTRICAL_MATERIALS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.inlineLabel}>
            Chart
            <select
              value={elec.chartId}
              onChange={(event) =>
                onChartSelectionChange("electrical", { chartId: event.target.value })
              }
              aria-label="Electrical bender chart"
            >
              {ELECTRICAL_CHARTS.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={
                    option.id === CHART_IDS.kleinHandBender &&
                    (elec.materialSystem === "pvc" || elec.materialSystem === "company_custom")
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {takeoffType === "plumbing" && plum ? (
        <div className={styles.chartSelectorBlock}>
          <label className={styles.inlineLabel}>
            System / material
            <select
              value={plum.materialSystem}
              onChange={(event) =>
                onChartSelectionChange("plumbing", { materialSystem: event.target.value })
              }
              aria-label="Plumbing system or material"
            >
              {PLUMBING_MATERIALS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.inlineLabel}>
            Manufacturer
            <select
              value={plum.chartId}
              onChange={(event) =>
                onChartSelectionChange("plumbing", { chartId: event.target.value })
              }
              aria-label="Plumbing manufacturer chart"
            >
              {PLUMBING_CHARTS.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={
                    option.id === CHART_IDS.charlotteDwv &&
                    plum.materialSystem !== "pvc_dwv" &&
                    plum.materialSystem !== "abs_dwv"
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {takeoffType === "hvac" && hvac ? (
        <div className={styles.chartSelectorBlock}>
          <label className={styles.inlineLabel}>
            Duct system
            <select
              value={hvac.materialSystem}
              onChange={(event) =>
                onChartSelectionChange("hvac", { materialSystem: event.target.value })
              }
              aria-label="HVAC duct system"
            >
              {HVAC_MATERIALS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.inlineLabel}>
            Chart
            <select
              value={CHART_IDS.companyCustom}
              onChange={() =>
                onChartSelectionChange("hvac", { chartId: CHART_IDS.companyCustom })
              }
              aria-label="HVAC chart"
            >
              {HVAC_CHARTS.map((option) => (
                <option key={option.id} value={option.id} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {chartStatus ? (
        <p
          className={
            chartStatus.kind === "verified" ? styles.verifiedChartNote : styles.unverifiedDefaultNote
          }
          role="status"
        >
          {chartStatus.kind === "verified"
            ? `✓ Verified manufacturer chart — ${chartStatus.detail || chartStatus.label}`
            : `⚠ ${chartStatus.label}`}
          {chartStatus.kind !== "verified" && chartStatus.detail ? ` ${chartStatus.detail}` : ""}
          {chartStatus.rigidNote ? ` ${chartStatus.rigidNote}` : ""}
        </p>
      ) : null}

      {preset.categories?.length > 0 ? (
        <div>
          <p className={styles.helperNote}>Included in takeoff</p>
          <div className={styles.categoryRow}>
            {preset.categories.map((category) => (
              <label key={category.id} className={styles.categoryOption}>
                <input
                  type="checkbox"
                  checked={categories[category.id] !== false}
                  onChange={() => onToggleCategory(category.id)}
                />
                {category.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className={styles.defaultTypeRow}>
        <button type="button" className={styles.secondaryActionBtn} onClick={onSaveDefault}>
          Save as My Default Takeoff Type
        </button>
        {defaultSaved ? <span className={styles.saveStatusLine}>{defaultSaved}</span> : null}
      </div>
    </section>
  );
}
