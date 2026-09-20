"use client";

import styles from "@/app/page.module.css";

function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

export default function TradeInputsPanel({ takeoffType, inputs, onChange }) {
  function set(field, value) {
    onChange({ ...inputs, [field]: value });
  }

  function setChecked(field, checked) {
    onChange({ ...inputs, [field]: checked });
  }

  if (takeoffType === "framing") {
    return (
      <section className={`${styles.panel} ${styles.pipeRunsPanel}`}>
        <h2>Framing Inputs</h2>
        <p className={styles.helpText}>
          Counts use the editable assumptions below. This is a wall takeoff, not a full layout engine.
        </p>
        <div className={styles.runFields}>
          <Field label="Wall length">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.wallLength}
              onChange={(e) => set("wallLength", e.target.value)}
            />
          </Field>
          <Field label="Length unit">
            <select
              value={inputs.wallLengthUnit}
              onChange={(e) => set("wallLengthUnit", e.target.value)}
            >
              <option value="feet">Feet</option>
              <option value="inches">Inches</option>
            </select>
          </Field>
          <Field label="Wall height (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.wallHeight}
              onChange={(e) => set("wallHeight", e.target.value)}
            />
          </Field>
          <Field label='Stud spacing (inches OC)'>
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.studSpacing}
              onChange={(e) => set("studSpacing", e.target.value)}
            />
          </Field>
          <Field label="Number of corners">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.corners}
              onChange={(e) => set("corners", e.target.value)}
            />
          </Field>
          <Field label="Door openings">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.doors}
              onChange={(e) => set("doors", e.target.value)}
            />
          </Field>
          <Field label="Window openings">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.windows}
              onChange={(e) => set("windows", e.target.value)}
            />
          </Field>
          <Field label="Top plates">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.topPlates}
              onChange={(e) => set("topPlates", e.target.value)}
            />
          </Field>
          <Field label="Bottom plates">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.bottomPlates}
              onChange={(e) => set("bottomPlates", e.target.value)}
            />
          </Field>
          <Field label="Waste %">
            <input
              type="number"
              min="0"
              step="0.1"
              value={inputs.framingWastePct}
              onChange={(e) => set("framingWastePct", e.target.value)}
            />
          </Field>
        </div>
        <h3 className={styles.subHead}>Assumptions (editable)</h3>
        <div className={styles.runFields}>
          <Field label="Extra studs per corner">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.extraStudsPerCorner}
              onChange={(e) => set("extraStudsPerCorner", e.target.value)}
            />
          </Field>
          <Field label="Extra studs per door">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.extraStudsPerDoor}
              onChange={(e) => set("extraStudsPerDoor", e.target.value)}
            />
          </Field>
          <Field label="Extra studs per window">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.extraStudsPerWindow}
              onChange={(e) => set("extraStudsPerWindow", e.target.value)}
            />
          </Field>
          <Field label="Typical door width (ft, headers)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.doorWidth}
              onChange={(e) => set("doorWidth", e.target.value)}
            />
          </Field>
          <Field label="Typical window width (ft, headers)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.windowWidth}
              onChange={(e) => set("windowWidth", e.target.value)}
            />
          </Field>
          <Field label="Door opening height (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.doorOpeningHeight}
              onChange={(e) => set("doorOpeningHeight", e.target.value)}
            />
          </Field>
          <Field label="Window opening height (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.windowOpeningHeight}
              onChange={(e) => set("windowOpeningHeight", e.target.value)}
            />
          </Field>
        </div>
        <label className={styles.categoryOption}>
          <input
            type="checkbox"
            checked={Boolean(inputs.includeSheathing)}
            onChange={(e) => setChecked("includeSheathing", e.target.checked)}
          />
          Include sheathing estimate (4x8 sheets)
        </label>
        <p className={styles.helperNote} role="note">
          Job assumption — edit to match plans. Opening heights are used for sheathing area only.
        </p>
      </section>
    );
  }

  if (takeoffType === "drywall") {
    return (
      <section className={`${styles.panel} ${styles.pipeRunsPanel}`}>
        <h2>Drywall Inputs</h2>
        <p className={styles.helpText}>
          Sheet count comes from area, openings, sheet size, and waste. Tape uses an editable factor.
          Compound is omitted unless you enter a rate.
        </p>
        <div className={styles.runFields}>
          <Field label="Wall width (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.drywallWidth}
              onChange={(e) => set("drywallWidth", e.target.value)}
            />
          </Field>
          <Field label="Wall height (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.drywallHeight}
              onChange={(e) => set("drywallHeight", e.target.value)}
            />
          </Field>
          <Field label="Number of walls">
            <input
              type="number"
              min="1"
              step="1"
              value={inputs.wallCount}
              onChange={(e) => set("wallCount", e.target.value)}
            />
          </Field>
          <Field label="Sheet width (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.sheetWidth}
              onChange={(e) => set("sheetWidth", e.target.value)}
            />
          </Field>
          <Field label="Sheet height (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.sheetHeight}
              onChange={(e) => set("sheetHeight", e.target.value)}
            />
          </Field>
          <Field label="Opening count">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.openingCount}
              onChange={(e) => set("openingCount", e.target.value)}
            />
          </Field>
          <Field label="Opening width (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.openingWidth}
              onChange={(e) => set("openingWidth", e.target.value)}
            />
          </Field>
          <Field label="Opening height (ft)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.openingHeight}
              onChange={(e) => set("openingHeight", e.target.value)}
            />
          </Field>
          <Field label="Waste %">
            <input
              type="number"
              min="0"
              step="0.1"
              value={inputs.drywallWastePct}
              onChange={(e) => set("drywallWastePct", e.target.value)}
            />
          </Field>
        </div>
        <label className={styles.categoryOption}>
          <input
            type="checkbox"
            checked={Boolean(inputs.ceilingEnabled)}
            onChange={(e) => setChecked("ceilingEnabled", e.target.checked)}
          />
          Include ceiling
        </label>
        {inputs.ceilingEnabled ? (
          <div className={styles.runFields}>
            <Field label="Ceiling width (ft)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.ceilingWidth}
                onChange={(e) => set("ceilingWidth", e.target.value)}
              />
            </Field>
            <Field label="Ceiling length (ft)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.ceilingLength}
                onChange={(e) => set("ceilingLength", e.target.value)}
              />
            </Field>
          </div>
        ) : null}
        <h3 className={styles.subHead}>Optional estimates</h3>
        <div className={styles.runFields}>
          <label className={styles.categoryOption}>
            <input
              type="checkbox"
              checked={inputs.includeTape !== false}
              onChange={(e) => setChecked("includeTape", e.target.checked)}
            />
            Include tape estimate
          </label>
          <Field label="Tape factor (LF per sf)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.tapeFactor}
              onChange={(e) => set("tapeFactor", e.target.value)}
            />
          </Field>
          <Field label="Joint compound (gal per 1000 sf, blank to omit)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputs.compoundGalPer1000}
              onChange={(e) => set("compoundGalPer1000", e.target.value)}
            />
          </Field>
        </div>
      </section>
    );
  }

  if (takeoffType === "concrete") {
    return (
      <section className={`${styles.panel} ${styles.pipeRunsPanel}`}>
        <h2>Concrete / Masonry Inputs</h2>
        <p className={styles.helpText}>
          Choose a sub-type. Quantities are geometric estimates from the dimensions you enter.
        </p>
        <label className={styles.inlineLabel}>
          Sub-type
          <select
            value={inputs.concreteSubType}
            onChange={(e) => set("concreteSubType", e.target.value)}
          >
            <option value="concrete">Concrete</option>
            <option value="cmu">Block / CMU</option>
            <option value="brick">Brick</option>
          </select>
        </label>
        {inputs.concreteSubType === "concrete" ? (
          <div className={styles.runFields}>
            <Field label="Length">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.concLength}
                onChange={(e) => set("concLength", e.target.value)}
              />
            </Field>
            <Field label="Length unit">
              <select
                value={inputs.concLengthUnit}
                onChange={(e) => set("concLengthUnit", e.target.value)}
              >
                <option value="feet">Feet</option>
                <option value="inches">Inches</option>
                <option value="yards">Yards</option>
              </select>
            </Field>
            <Field label="Width">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.concWidth}
                onChange={(e) => set("concWidth", e.target.value)}
              />
            </Field>
            <Field label="Width unit">
              <select
                value={inputs.concWidthUnit}
                onChange={(e) => set("concWidthUnit", e.target.value)}
              >
                <option value="feet">Feet</option>
                <option value="inches">Inches</option>
                <option value="yards">Yards</option>
              </select>
            </Field>
            <Field label="Depth / thickness">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.concDepth}
                onChange={(e) => set("concDepth", e.target.value)}
              />
            </Field>
            <Field label="Depth unit">
              <select
                value={inputs.concDepthUnit}
                onChange={(e) => set("concDepthUnit", e.target.value)}
              >
                <option value="inches">Inches</option>
                <option value="feet">Feet</option>
              </select>
            </Field>
            <Field label="Waste %">
              <input
                type="number"
                min="0"
                step="0.1"
                value={inputs.concWastePct}
                onChange={(e) => set("concWastePct", e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className={styles.runFields}>
            <Field label="Wall length (ft)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.masonryLength}
                onChange={(e) => set("masonryLength", e.target.value)}
              />
            </Field>
            <Field label="Wall height (ft)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.masonryHeight}
                onChange={(e) => set("masonryHeight", e.target.value)}
              />
            </Field>
            <Field label="Opening area (sf)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputs.masonryOpeningArea}
                onChange={(e) => set("masonryOpeningArea", e.target.value)}
              />
            </Field>
            <Field label="Waste %">
              <input
                type="number"
                min="0"
                step="0.1"
                value={inputs.masonryWastePct}
                onChange={(e) => set("masonryWastePct", e.target.value)}
              />
            </Field>
            {inputs.concreteSubType === "cmu" ? (
              <>
                <Field label="Block length (in)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inputs.blockLengthIn}
                    onChange={(e) => set("blockLengthIn", e.target.value)}
                  />
                </Field>
                <Field label="Block height (in)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inputs.blockHeightIn}
                    onChange={(e) => set("blockHeightIn", e.target.value)}
                  />
                </Field>
                <Field label="Mortar cf per 100 blocks (blank to omit)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inputs.mortarCfPer100}
                    onChange={(e) => set("mortarCfPer100", e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Bricks per sf">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inputs.brickPerSf}
                    onChange={(e) => set("brickPerSf", e.target.value)}
                  />
                </Field>
                <Field label="Mortar cf per 1000 bricks (blank to omit)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inputs.mortarCfPer100}
                    onChange={(e) => set("mortarCfPer100", e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>
        )}
      </section>
    );
  }

  return null;
}
