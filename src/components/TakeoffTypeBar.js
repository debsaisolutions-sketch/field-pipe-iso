"use client";

import { TAKEOFF_TYPE_OPTIONS } from "@/lib/constants";
import styles from "@/app/page.module.css";

export default function TakeoffTypeBar({
  takeoffType,
  preset,
  categories,
  onTypeChange,
  onToggleCategory,
  onSaveDefault,
  defaultSaved,
}) {
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
