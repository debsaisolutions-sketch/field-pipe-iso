# Takeoff number verification audit

**Product:** PipeSketch Pro (field-pipe-iso)
**Date:** 2026-09-19
**Scope:** Every numeric default, lookup cell, conversion, waste factor, and formula currently used by the multi-trade presets.
**Rule:** Values are not promoted to VERIFIED unless a source is in this repo or the existing Pipe/Welding 90°/45° Blue Book formulas.

This file is the human-readable audit. The machine inventory that generated the matrix lives in `src/lib/takeoffVerification.js` (`buildVerificationInventory()`). Metadata fields on presets (`sourceType`, `sourceName`, `sourceUrl`, `manufacturer`, `chartVersion`, `verifiedAt`) are documentation only and **do not change calculations**.

---

## Verification rules used

| Status | When it applies |
| --- | --- |
| **VERIFIED** | Source is documented in the repo, or the value is the existing Pipe/Welding 90°/45° Blue Book formula already in production use. |
| **MATHEMATICALLY DERIVED** | Deterministic unit or quantity math (ft↔in, sf, cy, stud count, sheet count, cut length = known − takeoff). |
| **COMPANY CUSTOM / USER EDITABLE** | Company/field default, intentionally editable table, or a modeling zero (no length deduction). Not universal. |
| **UNVERIFIED** | Hard-coded number with no traceable chart; AI/preset “typical”; manufacturer/system dependent but no manufacturer selected. |
| **PLACEHOLDER / ESTIMATE** | Intentionally approximate, drawing-only, or labeled estimate in the UI. |

---

## Inventory sources inspected

| Area | Files |
| --- | --- |
| Pipe table | `src/lib/takeoff.js` |
| Multi-trade presets / generated tables | `src/lib/takeoffPresets.js` |
| Run cut-length math | `src/lib/runTakeoff.js`, `src/lib/geometry.js` |
| Framing / drywall / concrete | `src/lib/tradeCalcs.js` |
| Material list | `src/lib/materialList.js` |
| Save/load / defaults | `src/lib/jobSnapshot.js`, `src/lib/standardsBundle.js`, `src/lib/takeoffSwitch.js`, `src/lib/cloudTakeoff.js`, `src/lib/localStorageJobs.js` |
| PDF | `src/components/PrintDocument.js` |
| UI defaults | `src/app/page.js`, `src/components/TradeInputsPanel.js` |

Skipped as not takeoff math: CSS layout numbers, button min-heights, entitlement flags, auth.

---

## Counts

**Total audited items: 363**

| Status | Count |
| --- | ---: |
| VERIFIED | 20 |
| MATHEMATICALLY DERIVED | 16 |
| COMPANY CUSTOM / USER EDITABLE | 114 |
| UNVERIFIED | 208 |
| PLACEHOLDER / ESTIMATE | 5 |

### By trade

| Trade | Items | VERIFIED | MATH | COMPANY | UNVERIFIED | ESTIMATE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Shared | 8 | 0 | 6 | 0 | 0 | 2 |
| Pipe / Welding | 67 | 20 | 0 | 47 | 0 | 0 |
| HVAC / Duct | 122 | 0 | 0 | 19 | 102 | 1 |
| Electrical | 66 | 0 | 0 | 34 | 32 | 0 |
| Plumbing | 72 | 0 | 0 | 0 | 72 | 0 |
| Framing | 12 | 0 | 4 | 6 | 2 | 0 |
| Drywall | 7 | 0 | 3 | 3 | 0 | 1 |
| Concrete / Masonry | 9 | 0 | 3 | 5 | 0 | 1 |

---

## Findings by trade

### Pipe / Welding — preserve current table

- **90° elbows** match the in-repo Blue Book rule `nominal inches × 1.5` (“pipe size + half”) for every catalog size. **VERIFIED.** Editable in Takeoff Settings.
- **45° elbows** match `nominal inches × 0.625`. Two cells are rounded (`3/4"` 0.469 vs 0.46875; `1-1/4"` 0.781 vs 0.78125). Still **VERIFIED** as the documented table. Do not overwrite.
- **tee / reducer / coupling / flange / valve** have **no formula in the repo**. Treat as **COMPANY CUSTOM / USER EDITABLE**. They are not a named manufacturer chart.
- Default size `2"` and default run `120 in` are app starting values, not charts.

No Pipe/Welding production numbers were changed in this audit.

### HVAC / Duct — UNVERIFIED chart

Generated as `primary dimension × {90:1, 45:0.5, transition:0.5, tee:0.75, boot:0.5, damper:0.25}`, register = 0. **No SMACNA, throat-radius, or manufacturer chart in the repo.** Fitting cells are **UNVERIFIED**. Register 0 is a modeling choice (**COMPANY CUSTOM**). Insulation copies duct cut length (**PLACEHOLDER / ESTIMATE**). UI already called these starter estimates; the Takeoff Settings table now also shows: *Unverified default — confirm against your manufacturer/company chart.*

### Electrical — UNVERIFIED bend chart

Hard-coded take-up / offset / LB values look like a bender chart but:

- do not name a manufacturer (Greenlee, Klein, Ideal, Gardner Bender, …)
- do not change when the user picks EMT / PVC / RMC / IMC / FMC
- do not distinguish bender type or shoe

Those deducts are **UNVERIFIED**. Zeros for coupling / connector / boxes mean “no centerline deduction” (**COMPANY CUSTOM**). Conduit type is a **label only**. Same unverified-default label as HVAC.

### Plumbing — UNVERIFIED reuse of welding takeoffs

Plumbing 90/45/tee/valve copy the **Pipe/Welding** table. Wye copies tee, cleanout copies coupling, trap copies 90. That is **not** PVC socket depth, copper C-to-E, PEX insert, or CI. **UNVERIFIED** for plumbing use even though the copied 90/45 numbers are verified as welding elbows. Same unverified-default label.

### Framing — math + editable assumptions + two hidden risks

- Stud count `floor(length_in / OC) + 1`, waste, plate LF: **MATHEMATICALLY DERIVED**.
- 16" OC, extras 2/4/4, plates 2/1, 10% waste, typical header widths: **COMPANY CUSTOM / USER EDITABLE**.
- Hidden door height **7 ft** and window height **4 ft** used only for sheathing: **UNVERIFIED** and **not editable**. A quiet note was added next to the sheathing checkbox. 4×8 sheet area (32 sf) is math **given** that sheet size.

### Drywall — sheet math vs finishing guesses

- Net area and `ceil(net × (1+waste) / sheetArea)`: **MATHEMATICALLY DERIVED**.
- 4×8 sheets and 10% waste: **COMPANY CUSTOM / USER EDITABLE**.
- Tape factor **0.37 LF/sf**: **PLACEHOLDER / ESTIMATE** (UI already says estimate). No USG/manufacturer yield in repo.
- Compound uses the user-entered gal/1000 sf rate; omitted if blank. Divisor 1000 is unit math.

### Concrete / Masonry — volume is exact; mortar is not

- `L×W×D` and `cf ÷ 27`: **MATHEMATICALLY DERIVED**.
- 5% waste, 16×8 nominal CMU face: **COMPANY CUSTOM / USER EDITABLE**. Nominal face is not actual 15-5/8 × 7-5/8 with mortar joint unless the user types those sizes.
- Bricks per sf **6.75**: **PLACEHOLDER / ESTIMATE** (comment says “modular default”; no BIA/ASTM chart in repo).
- Mortar has **no default yield**. Blank until the user enters a rate. Correct omission.

### Shared

- Cut length `max(known − takeoffs, 0)` and overall straight cut: **MATHEMATICALLY DERIVED** (quality depends on the active table).
- Isometric `π/6`: drawing math, not material.
- L/U sketch splits 0.6/0.4 and 0.45/0.35: **PLACEHOLDER / ESTIMATE**, drawing only.

---

## Highest-risk unverified values

1. **Electrical 90/45/offset/LB table** — looks authoritative, is not manufacturer-tagged, ignores conduit type.
2. **Plumbing fitting takeoffs** — welding numbers used as if they were plumbing insertion/C-to-E.
3. **HVAC elbow/transition/tee/boot/damper multipliers** — generated, not SMACNA.
4. **Framing hidden 7 ft door / 4 ft window** — affects sheathing only; users cannot see or edit them in the assumption fields.
5. **Drywall tape 0.37** and **brick 6.75 /sf** — unlabeled-source estimates (tape is at least marked estimate in the UI).

---

## Pipe / Welding items that need attention (do not overwrite)

| Item | Action |
| --- | --- |
| 90° table | Keep. Matches size × 1.5. |
| 45° table | Keep. Matches size × 0.625 with two 0.001-in roundings. |
| tee / reducer / coupling / flange / valve | Keep as company-editable. Do not claim they are a published chart. |
| Plumbing copy of this table | Problem is on the plumbing preset, not the pipe table. |

---

## Data model — can we support manufacturer charts?

**Yes, without a new database table.** Jobs already store JSON in `calculator_state` and `psp_takeoff_standards` JSONB. Charts can live on the preset (defaults) and optionally in the standards blob.

Smallest non-breaking addition (already started on presets; not required in saved jobs yet):

```js
verification: {
  sourceType: "verified_chart" | "math" | "company_custom" | "estimate" | "unverified",
  sourceName: "",
  sourceUrl: "",
  manufacturer: "",
  chartVersion: "",
  verifiedAt: null,
}

// later, per cell or per table (standards JSON / calculator_state):
chart_meta: {
  takeoff_type: "electrical",
  material_system: "EMT",
  manufacturer: "Greenlee",
  chart_name: "EMT 90° take-up",
  chart_version: "2024",
  source_url: "",
  verified_at: "2026-09-19",
  verification_status: "verified_chart"
}
```

**Do not add a SQL migration until we load a real chart.** Optional `_chartMeta` on the existing standards wrapper would persist user-selected charts the same way `_tradeTables` already stores HVAC/electrical/plumbing tables.

Recommended next fields when charts are loaded: `takeoff_type`, `material_system`, `manufacturer`, `chart_name`, `chart_version`, `source_url`, `verified_at`, `verification_status`.

Architecture gap today: Electrical conduit type and Plumbing water/DWV are labels/categories; they **do not select a table**. HVAC has no rectangular vs round manufacturer split. Framing/drywall/concrete have no chart objects at all (formulas + defaults).

---

## Source research plan (do not scrape blogs)

**Priority 1 — Electrical EMT (and then PVC / rigid) bend charts**
Need take-up, gain, and shrink by size for 90° and 45°, plus offset multipliers, for:
- Greenlee
- Klein
- Ideal
- Gardner Bender
Also need conduit-type distinction (EMT / IMC / Rigid / PVC) and bender/shoe notes. Stub-up is manufacturer + bender specific.

**Priority 2 — Plumbing fitting dimensions by system**
Need center-to-end or socket/insertion depth by size for:
- PVC DWV (Charlotte Pipe, Spears, NIBCO)
- Copper pressure (wrought C-to-E)
- CPVC
- PEX (insert/crimp — often not a welding-style takeoff)
- Cast iron (hub/no-hub)
Wye, trap, and cleanout must come from those systems, not from welding tees/couplings/90s.

**Priority 3 — HVAC / duct**
Need SMACNA fitting allowances and/or a named rectangular/round manufacturer table for elbows, transitions, tees, boots, dampers. Do not invent throat radii. Insulation should be wrap/board coverage rules, not “same as duct LF”.

**Priority 4 — Framing / drywall / masonry finishing**
- Framing: keep formulas; expose door/window heights used in sheathing; cite IRC only as an *editable default*, never as a hidden universal.
- Drywall: USG or similar tape/compound yield if we keep those estimates; otherwise keep them optional.
- Masonry: BIA/NCMA face and mortar yield; actual vs nominal block size.

**Priority 5 — Pipe/Welding non-elbow fittings**
If Deb wants tee/reducer/flange/valve to be chart-backed, obtain the company Blue Book / manufacturer weld fitting C-to-E used in the field. Until then they stay company-editable.

---

## Tests added

Deterministic math only (see `src/lib/takeoffVerification.test.js`):

- ft / in / yd conversions
- 10×10×4 in slab → cf and cy (with 5% waste applied as math, not as a “correct” waste rate)
- framing stud counts on 16 ft @ 16" OC and 10 ft @ 16" OC
- drywall sheet counts with and without a 3×7 opening
- tape quantity from an explicit factor (does not bless 0.37)
- CMU count from face-area math
- Pipe 90/45 vs documented Blue Book formulas
- 2" 90 still deducts 3" from 120"
- save/load of framing type + inputs
- preset isolation (HVAC table does not overwrite pipe 2" 90 = 3)
- inventory still marks electrical 1" 90 as UNVERIFIED

No test asserts that an HVAC/electrical/plumbing hard-coded takeoff is a correct published value.

---

## UI safety labels

- HVAC, Electrical, and Plumbing Takeoff Settings tables: *Unverified default — confirm against your manufacturer/company chart.*
- Framing sheathing checkbox: note that 7 ft / 4 ft opening heights are built-in and unverified.
- Mathematically derived trades (pure volume/sheet math) do not get that chart warning.
- Existing starter-estimate help text was left in place. Values stay editable.

---

## Full verification matrix

Each row is one default, lookup cell, conversion, or formula. Generated from `buildVerificationInventory()`.


| Trade | Category | Material/System | Size/Dimension | Item | Current Value | Unit | Formula / Lookup | Code Location | Current Source | Verification Status | Editable? | Notes / Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shared | Unit conversion |  | — | Feet to inches | 12 | in/ft | feet × 12 | src/lib/geometry.js toInches | US customary | MATHEMATICALLY DERIVED | No | Deterministic conversion. |
| Shared | Unit conversion |  | — | Inches to feet | 12 | in/ft | inches ÷ 12 | src/lib/tradeCalcs.js toFeet | US customary | MATHEMATICALLY DERIVED | No |  |
| Shared | Unit conversion |  | — | Yards to feet | 3 | ft/yd | yards × 3 | src/lib/tradeCalcs.js toFeet | US customary | MATHEMATICALLY DERIVED | No |  |
| Shared | Cut length |  | — | Run cut length | — | in | max(knownLength − startTakeoff − endTakeoff, 0) | src/lib/runTakeoff.js computeSegmentRows | math | MATHEMATICALLY DERIVED | No | Uses whatever takeoff table is active. Table quality is separate from this formula. |
| Shared | Cut length |  | — | Overall straight cut | — | in | toInches(overall) − Σ(count × takeoff) | src/lib/runTakeoff.js computeOverallLengthCalc | math | MATHEMATICALLY DERIVED | No |  |
| Pipe / Welding | Formula | Existing pipe preset | — | 90° elbow | size × 1.5 | in | nominal inches × 1.5 (size + half) | src/lib/takeoff.js comment + DEFAULT_TAKEOFF_TABLE | Documented in repo as Blue Book; matches field rule “90s are pipe size + half.” | VERIFIED | Yes | Table cells match the documented formula. Users may override in Takeoff Settings. |
| Pipe / Welding | Formula | Existing pipe preset | — | 45° elbow | size × 0.625 | in | nominal inches × 0.625 | src/lib/takeoff.js comment + DEFAULT_TAKEOFF_TABLE | Documented in repo as Blue Book elbow takeoff. | VERIFIED | Yes | 3/4" stored 0.469 vs exact 0.46875; 1-1/4" stored 0.781 vs exact 0.78125. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1/2" | 90° elbow | 0.75 | in | lookup; expected size × 1.5 = 0.75 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1/2" | 45° elbow | 0.3125 | in | lookup; expected size × 0.625 = 0.3125 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1/2" | tee | 0.625 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1/2" | reducer | 0.375 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1/2" | coupling | 0.375 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1/2" | flange | 0.75 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1/2" | valve | 0.75 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3/4" | 90° elbow | 1.125 | in | lookup; expected size × 1.5 = 1.125 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3/4" | 45° elbow | 0.469 | in | lookup; expected size × 0.625 = 0.46875 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3/4" | tee | 0.75 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3/4" | reducer | 0.4375 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3/4" | coupling | 0.375 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3/4" | flange | 0.875 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3/4" | valve | 0.875 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1" | 90° elbow | 1.5 | in | lookup; expected size × 1.5 = 1.5 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1" | 45° elbow | 0.625 | in | lookup; expected size × 0.625 = 0.625 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1" | tee | 0.875 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1" | reducer | 0.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1" | coupling | 0.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1" | flange | 1 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1" | valve | 1 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/4" | 90° elbow | 1.875 | in | lookup; expected size × 1.5 = 1.875 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/4" | 45° elbow | 0.781 | in | lookup; expected size × 0.625 = 0.78125 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/4" | tee | 1.125 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/4" | reducer | 0.625 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/4" | coupling | 0.75 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/4" | flange | 1.25 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/4" | valve | 1.25 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/2" | 90° elbow | 2.25 | in | lookup; expected size × 1.5 = 2.25 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/2" | 45° elbow | 0.9375 | in | lookup; expected size × 0.625 = 0.9375 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/2" | tee | 1.25 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/2" | reducer | 0.75 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/2" | coupling | 0.875 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/2" | flange | 1.375 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 1-1/2" | valve | 1.375 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 2" | 90° elbow | 3 | in | lookup; expected size × 1.5 = 3 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 2" | 45° elbow | 1.25 | in | lookup; expected size × 0.625 = 1.25 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 2" | tee | 1.625 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 2" | reducer | 0.875 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 2" | coupling | 1 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 2" | flange | 1.625 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 2" | valve | 1.625 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3" | 90° elbow | 4.5 | in | lookup; expected size × 1.5 = 4.5 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3" | 45° elbow | 1.875 | in | lookup; expected size × 0.625 = 1.875 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3" | tee | 2.25 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3" | reducer | 1.125 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3" | coupling | 1.25 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3" | flange | 2 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 3" | valve | 2 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 4" | 90° elbow | 6 | in | lookup; expected size × 1.5 = 6 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 4" | 45° elbow | 2.5 | in | lookup; expected size × 0.625 = 2.5 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 4" | tee | 3 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 4" | reducer | 1.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 4" | coupling | 1.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 4" | flange | 2.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 4" | valve | 2.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 6" | 90° elbow | 9 | in | lookup; expected size × 1.5 = 9 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula exactly. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 6" | 45° elbow | 3.75 | in | lookup; expected size × 0.625 = 3.75 | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | In-repo Blue Book formula | VERIFIED | Yes | Matches formula (including documented rounding). |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 6" | tee | 4.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 6" | reducer | 2 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 6" | coupling | 2 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 6" | flange | 3.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Fitting takeoff | Existing pipe preset | 6" | valve | 3.5 | in | lookup only — no formula in repo | src/lib/takeoff.js DEFAULT_TAKEOFF_TABLE | Company default table; not derived from the documented 90/45 formulas | COMPANY CUSTOM / USER EDITABLE | Yes | Do not treat as a universal manufacturer chart. Keep as editable company standard. |
| Pipe / Welding | Default input |  | — | Default pipe size | 2" | nominal | constant | src/lib/takeoffPresets.js / jobSnapshot.js | app default | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Pipe / Welding | Default input |  | — | Default known / overall length | 120 | in | constant | src/lib/jobSnapshot.js createDefaultSegment | app default | COMPANY CUSTOM / USER EDITABLE | Yes | Starting field value, not a takeoff chart. |
| HVAC / Duct | Formula | Generic (no SMACNA / manufacturer) | — | 90 elbow multiplier | 1 | × primary dim | primary dim × 1.0 | src/lib/takeoffPresets.js buildHvacTakeoffTable | none found — generated for the multi-trade preset | UNVERIFIED | Yes | Not SMACNA, not a manufacturer throat/radius chart. UI labels these as starter estimates. |
| HVAC / Duct | Formula | Generic (no SMACNA / manufacturer) | — | 45 elbow multiplier | 0.5 | × primary dim | primary dim × 0.5 | src/lib/takeoffPresets.js buildHvacTakeoffTable | none found — generated for the multi-trade preset | UNVERIFIED | Yes | Not SMACNA, not a manufacturer throat/radius chart. UI labels these as starter estimates. |
| HVAC / Duct | Formula | Generic (no SMACNA / manufacturer) | — | transition multiplier | 0.5 | × primary dim | primary dim × 0.5 | src/lib/takeoffPresets.js buildHvacTakeoffTable | none found — generated for the multi-trade preset | UNVERIFIED | Yes | Not SMACNA, not a manufacturer throat/radius chart. UI labels these as starter estimates. |
| HVAC / Duct | Formula | Generic (no SMACNA / manufacturer) | — | tee multiplier | 0.75 | × primary dim | primary dim × 0.75 | src/lib/takeoffPresets.js buildHvacTakeoffTable | none found — generated for the multi-trade preset | UNVERIFIED | Yes | Not SMACNA, not a manufacturer throat/radius chart. UI labels these as starter estimates. |
| HVAC / Duct | Formula | Generic (no SMACNA / manufacturer) | — | boot multiplier | 0.5 | × primary dim | primary dim × 0.5 | src/lib/takeoffPresets.js buildHvacTakeoffTable | none found — generated for the multi-trade preset | UNVERIFIED | Yes | Not SMACNA, not a manufacturer throat/radius chart. UI labels these as starter estimates. |
| HVAC / Duct | Formula | Generic (no SMACNA / manufacturer) | — | register multiplier | 0 | × primary dim | forced 0 | src/lib/takeoffPresets.js buildHvacTakeoffTable | none found — generated for the multi-trade preset | COMPANY CUSTOM / USER EDITABLE | Yes | Modeling choice: no centerline length. Still not a register sizing chart. |
| HVAC / Duct | Formula | Generic (no SMACNA / manufacturer) | — | damper multiplier | 0.25 | × primary dim | primary dim × 0.25 | src/lib/takeoffPresets.js buildHvacTakeoffTable | none found — generated for the multi-trade preset | UNVERIFIED | Yes | Not SMACNA, not a manufacturer throat/radius chart. UI labels these as starter estimates. |
| HVAC / Duct | Fitting takeoff | Generic | 6" | 90 elbow | 6 | in | primary 6 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 6" | 45 elbow | 3 | in | primary 6 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 6" | transition | 3 | in | primary 6 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 6" | tee | 4.5 | in | primary 6 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 6" | boot | 3 | in | primary 6 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 6" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 6" | damper | 1.5 | in | primary 6 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8" | 90 elbow | 8 | in | primary 8 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8" | 45 elbow | 4 | in | primary 8 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8" | transition | 4 | in | primary 8 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8" | tee | 6 | in | primary 8 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8" | boot | 4 | in | primary 8 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8" | damper | 2 | in | primary 8 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10" | 90 elbow | 10 | in | primary 10 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10" | 45 elbow | 5 | in | primary 10 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10" | transition | 5 | in | primary 10 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10" | tee | 7.5 | in | primary 10 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10" | boot | 5 | in | primary 10 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10" | damper | 2.5 | in | primary 10 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12" | 90 elbow | 12 | in | primary 12 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12" | 45 elbow | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12" | transition | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12" | tee | 9 | in | primary 12 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12" | boot | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12" | damper | 3 | in | primary 12 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 14" | 90 elbow | 14 | in | primary 14 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 14" | 45 elbow | 7 | in | primary 14 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 14" | transition | 7 | in | primary 14 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 14" | tee | 10.5 | in | primary 14 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 14" | boot | 7 | in | primary 14 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 14" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 14" | damper | 3.5 | in | primary 14 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16" | 90 elbow | 16 | in | primary 16 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16" | 45 elbow | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16" | transition | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16" | tee | 12 | in | primary 16 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16" | boot | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16" | damper | 4 | in | primary 16 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 18" | 90 elbow | 18 | in | primary 18 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 18" | 45 elbow | 9 | in | primary 18 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 18" | transition | 9 | in | primary 18 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 18" | tee | 13.5 | in | primary 18 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 18" | boot | 9 | in | primary 18 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 18" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 18" | damper | 4.5 | in | primary 18 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20" | 90 elbow | 20 | in | primary 20 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20" | 45 elbow | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20" | transition | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20" | tee | 15 | in | primary 20 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20" | boot | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20" | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20" | damper | 5 | in | primary 20 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8x8 | 90 elbow | 8 | in | primary 8 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8x8 | 45 elbow | 4 | in | primary 8 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8x8 | transition | 4 | in | primary 8 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8x8 | tee | 6 | in | primary 8 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8x8 | boot | 4 | in | primary 8 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8x8 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 8x8 | damper | 2 | in | primary 8 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10x8 | 90 elbow | 10 | in | primary 10 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10x8 | 45 elbow | 5 | in | primary 10 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10x8 | transition | 5 | in | primary 10 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10x8 | tee | 7.5 | in | primary 10 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10x8 | boot | 5 | in | primary 10 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10x8 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 10x8 | damper | 2.5 | in | primary 10 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x8 | 90 elbow | 12 | in | primary 12 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x8 | 45 elbow | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x8 | transition | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x8 | tee | 9 | in | primary 12 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x8 | boot | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x8 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x8 | damper | 3 | in | primary 12 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x10 | 90 elbow | 12 | in | primary 12 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x10 | 45 elbow | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x10 | transition | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x10 | tee | 9 | in | primary 12 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x10 | boot | 6 | in | primary 12 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x10 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 12x10 | damper | 3 | in | primary 12 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x8 | 90 elbow | 16 | in | primary 16 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x8 | 45 elbow | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x8 | transition | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x8 | tee | 12 | in | primary 16 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x8 | boot | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x8 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x8 | damper | 4 | in | primary 16 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x12 | 90 elbow | 16 | in | primary 16 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x12 | 45 elbow | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x12 | transition | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x12 | tee | 12 | in | primary 16 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x12 | boot | 8 | in | primary 16 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x12 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 16x12 | damper | 4 | in | primary 16 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x10 | 90 elbow | 20 | in | primary 20 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x10 | 45 elbow | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x10 | transition | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x10 | tee | 15 | in | primary 20 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x10 | boot | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x10 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x10 | damper | 5 | in | primary 20 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x12 | 90 elbow | 20 | in | primary 20 × 1 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x12 | 45 elbow | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x12 | transition | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x12 | tee | 15 | in | primary 20 × 0.75 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x12 | boot | 10 | in | primary 20 × 0.5 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x12 | register | 0 | in | 0 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | COMPANY CUSTOM / USER EDITABLE | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Fitting takeoff | Generic | 20x12 | damper | 5 | in | primary 20 × 0.25 | src/lib/takeoffPresets.js HVAC_TAKEOFF_TABLE | none — AI/preset generated | UNVERIFIED | Yes | Labeled in UI as starter estimate. Not a fabrication development. |
| HVAC / Duct | Material list |  | — | Insulation quantity | same as duct cut length | in | copy totalCutLength when Insulation category is on | src/lib/materialList.js | none | PLACEHOLDER / ESTIMATE | No | Not wrap coverage, not R-value, not dual-layer. Rough planning only. |
| HVAC / Duct | Default input |  | — | Default duct size / run WxH | 12x8 | in | constant | src/lib/takeoffPresets.js defaultSize; takeoffSwitch.js extras | app default | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| HVAC / Duct | Default input |  | — | Default round diameter | 8 | in | constant | src/lib/takeoffSwitch.js createDefaultSegmentForPreset | app default | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1/2" | 90 bend | 4 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1/2" | 45 bend | 2 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1/2" | offset | 6 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1/2" | LB | 3 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 1/2" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1/2" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1/2" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1/2" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3/4" | 90 bend | 5 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3/4" | 45 bend | 2.5 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3/4" | offset | 8 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3/4" | LB | 3.5 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 3/4" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 3/4" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 3/4" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 3/4" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1" | 90 bend | 6 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1" | 45 bend | 3 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1" | offset | 10 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1" | LB | 4 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 1" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/4" | 90 bend | 8 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/4" | 45 bend | 4 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/4" | offset | 12 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/4" | LB | 5 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 1-1/4" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1-1/4" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1-1/4" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1-1/4" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/2" | 90 bend | 10 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/2" | 45 bend | 5 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/2" | offset | 14 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 1-1/2" | LB | 6 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 1-1/2" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1-1/2" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1-1/2" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 1-1/2" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 2" | 90 bend | 12 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 2" | 45 bend | 6 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 2" | offset | 16 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 2" | LB | 7 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 2" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 2" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 2" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 2" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3" | 90 bend | 18 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3" | 45 bend | 9 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3" | offset | 24 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 3" | LB | 10 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 3" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 3" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 3" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 3" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 4" | 90 bend | 24 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 4" | 45 bend | 12 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 4" | offset | 32 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Bend / take-up | All conduit types share one table (EMT/PVC/RMC/IMC/FMC not distinguished) | 4" | LB | 12 | in | lookup | src/lib/takeoffPresets.js buildElectricalTakeoffTable | none found — comment says starter estimates, not NEC | UNVERIFIED | Yes | Depends on bender brand, shoe, and conduit type. Table does not select a manufacturer. |
| Electrical | Component takeoff | Generic | 4" | coupling | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 4" | connector | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 4" | junction box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Component takeoff | Generic | 4" | pull box | 0 | in | hard-coded 0 | src/lib/takeoffPresets.js buildElectricalTakeoffTable | modeling choice | COMPANY CUSTOM / USER EDITABLE | Yes | Means no centerline deduction. Not a box-fill or connector chart. |
| Electrical | Default input |  | — | Default conduit size | 3/4" | nominal | constant | src/lib/takeoffPresets.js defaultSize | app default | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Electrical | Default input |  | — | Default conduit type | EMT | — | constant | src/lib/takeoffSwitch.js / page.js | app default | COMPANY CUSTOM / USER EDITABLE | Yes | Type is a label only; takeoff table does not change with EMT vs PVC vs rigid. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | 90 elbow | 0.75 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | 45 elbow | 0.3125 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | tee | 0.625 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | wye | 0.625 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | coupling | 0.375 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | valve | 0.75 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | cleanout | 0.375 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1/2" | trap | 0.75 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | 90 elbow | 1.125 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | 45 elbow | 0.469 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | tee | 0.75 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | wye | 0.75 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | coupling | 0.375 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | valve | 0.875 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | cleanout | 0.375 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3/4" | trap | 1.125 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | 90 elbow | 1.5 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | 45 elbow | 0.625 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | tee | 0.875 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | wye | 0.875 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | coupling | 0.5 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | valve | 1 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | cleanout | 0.5 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1" | trap | 1.5 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | 90 elbow | 1.875 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | 45 elbow | 0.781 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | tee | 1.125 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | wye | 1.125 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | coupling | 0.75 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | valve | 1.25 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | cleanout | 0.75 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/4" | trap | 1.875 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | 90 elbow | 2.25 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | 45 elbow | 0.9375 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | tee | 1.25 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | wye | 1.25 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | coupling | 0.875 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | valve | 1.375 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | cleanout | 0.875 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 1-1/2" | trap | 2.25 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | 90 elbow | 3 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | 45 elbow | 1.25 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | tee | 1.625 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | wye | 1.625 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | coupling | 1 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | valve | 1.625 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | cleanout | 1 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 2" | trap | 3 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | 90 elbow | 4.5 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | 45 elbow | 1.875 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | tee | 2.25 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | wye | 2.25 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | coupling | 1.25 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | valve | 2 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | cleanout | 1.25 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 3" | trap | 4.5 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | 90 elbow | 6 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | 45 elbow | 2.5 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | tee | 3 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | wye | 3 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | coupling | 1.5 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | valve | 2.5 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | cleanout | 1.5 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 4" | trap | 6 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | 90 elbow | 9 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | 45 elbow | 3.75 | in | copied from pipe 45 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | tee | 4.5 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | wye | 4.5 | in | copied from pipe tee | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | coupling | 2 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | valve | 3.5 | in | copied from pipe valve | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | cleanout | 2 | in | copied from pipe coupling | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Plumbing | Fitting takeoff | Universal (no PVC/copper/PEX/CI/CPVC) | 6" | trap | 9 | in | copied from pipe 90 elbow | src/lib/takeoffPresets.js buildPlumbingTakeoffTable | Pipe/Welding table reused — not a plumbing manufacturer socket chart | UNVERIFIED | Yes | Welding centerline takeoffs are not PVC insertion depth, copper C-to-E, or PEX fittings. |
| Framing | Formula |  | — | Base stud count | — | count | floor(length_in / OC) + 1 | src/lib/tradeCalcs.js calculateFraming | math | MATHEMATICALLY DERIVED | No | Standard end-stud layout math. Does not place king/jack/cripple studs by itself. |
| Framing | Formula |  | — | Studs with extras and waste | — | count | ceil((base + extras) × (1 + waste%)) | src/lib/tradeCalcs.js calculateFraming | math on top of editable extras/waste | MATHEMATICALLY DERIVED | No |  |
| Framing | Formula |  | — | Plate linear footage | — | ft | plateCount × wallLengthFt × (1 + waste%) | src/lib/tradeCalcs.js calculateFraming | math | MATHEMATICALLY DERIVED | No |  |
| Framing | Default assumption |  | — | Stud spacing OC | 16 | in | default; fallback 16 if empty | src/lib/tradeCalcs.js createDefaultTradeInputs / calculateFraming | common field default, not cited to IRC in repo | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Framing | Default assumption |  | — | Extra studs per corner / door / window | 2 / 4 / 4 | count | defaults | src/lib/tradeCalcs.js createDefaultTradeInputs | company/field estimate (king/jack style) | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Framing | Default assumption |  | — | Waste % | 10 | % | default | src/lib/tradeCalcs.js createDefaultTradeInputs | company practice | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Framing | Default assumption |  | — | Top / bottom plates | 2 / 1 | count | default | src/lib/tradeCalcs.js createDefaultTradeInputs | common double top plate practice, not a code lookup | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Framing | Default assumption |  | — | Typical door / window header width | 3 / 3 | ft | default | src/lib/tradeCalcs.js createDefaultTradeInputs | placeholder typical opening | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Framing | Hidden assumption |  | — | Door opening height used in sheathing | 7 | ft | min(wallHeight, 7) | src/lib/tradeCalcs.js calculateFraming openingArea | none — not exposed in the form | UNVERIFIED | No | Highest-risk framing item: affects sheathing only, not stud count. Not user-editable. |
| Framing | Hidden assumption |  | — | Window opening height used in sheathing | 4 | ft | windowWidth × 4 | src/lib/tradeCalcs.js calculateFraming openingArea | none — not exposed in the form | UNVERIFIED | No |  |
| Framing | Formula |  | — | Sheathing sheet area | 32 | sf | 4 × 8 if 4x8 sheets | src/lib/tradeCalcs.js calculateFraming | math given 4x8 sheet | MATHEMATICALLY DERIVED | No | Sheet size itself is assumed 4x8, not selectable. |
| Framing | Default input |  | — | Default wall length × height | 16 × 8 | ft | starting values | src/lib/tradeCalcs.js createDefaultTradeInputs | app default | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Drywall | Formula |  | — | Net area | — | sf | walls + ceiling − openings | src/lib/tradeCalcs.js calculateDrywall | math | MATHEMATICALLY DERIVED | No |  |
| Drywall | Formula |  | — | Sheet count | — | count | ceil(netArea × (1 + waste%) / (sheetW × sheetH)) | src/lib/tradeCalcs.js calculateDrywall | math | MATHEMATICALLY DERIVED | No |  |
| Drywall | Default assumption |  | — | Sheet size | 4 × 8 | ft | default; fallback 4 and 8 if empty | src/lib/tradeCalcs.js createDefaultTradeInputs / calculateDrywall | common US sheet; not the only product | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Drywall | Default assumption |  | — | Waste % | 10 | % | default | src/lib/tradeCalcs.js createDefaultTradeInputs | company practice | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Drywall | Default assumption |  | — | Tape factor | 0.37 | LF/sf | netArea × tapeFactor | src/lib/tradeCalcs.js createDefaultTradeInputs | none in repo — labeled estimate in UI | PLACEHOLDER / ESTIMATE | Yes | Not a finishing spec. Do not treat 0.37 as industry-standard. |
| Drywall | Formula |  | — | Compound per 1000 sf divisor | 1000 | sf | (netArea / 1000) × user rate | src/lib/tradeCalcs.js calculateDrywall | math — rate itself is user-entered or omitted | MATHEMATICALLY DERIVED | No |  |
| Drywall | Default input |  | — | Default wall / opening | 12×8 wall; opening 3×7 | ft | starting values | src/lib/tradeCalcs.js createDefaultTradeInputs | app default / typical door-ish opening | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Concrete / Masonry | Formula |  | — | Volume cubic feet | — | cf | L × W × D (all feet) | src/lib/tradeCalcs.js calculateConcreteVolume | math | MATHEMATICALLY DERIVED | No |  |
| Concrete / Masonry | Formula |  | — | Cubic yards | 27 | cf/cy | cubicFeet ÷ 27 | src/lib/tradeCalcs.js calculateConcreteVolume | US customary (3 ft × 3 ft × 3 ft) | MATHEMATICALLY DERIVED | No |  |
| Concrete / Masonry | Default assumption |  | — | Concrete waste % | 5 | % | order = cy × (1 + waste%) | src/lib/tradeCalcs.js createDefaultTradeInputs | company practice, not a mix design | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Concrete / Masonry | Formula |  | — | CMU face area | — | sf | (blockLengthIn/12) × (blockHeightIn/12) | src/lib/tradeCalcs.js calculateCmu | math from user/default block face | MATHEMATICALLY DERIVED | No | Uses nominal face, not actual 15-5/8 × 7-5/8 with mortar joint unless the user changes sizes. |
| Concrete / Masonry | Default assumption |  | — | Default CMU face | 16 × 8 | in | fallback 16 and 8 if empty | src/lib/tradeCalcs.js createDefaultTradeInputs / calculateCmu | nominal modular CMU, not a named manufacturer | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Concrete / Masonry | Default assumption |  | — | Bricks per sf | 6.75 | count/sf | ceil(wallArea × perSf × (1 + waste%)) | src/lib/tradeCalcs.js createDefaultTradeInputs / calculateBrick | code comment “modular default 6.75” — no ASTM/BIA chart in repo | PLACEHOLDER / ESTIMATE | Yes | Modular brick with mortar is often cited near this number, but this repo has no sourced chart. |
| Concrete / Masonry | Default assumption |  | — | Masonry waste % | 5 | % | default | src/lib/tradeCalcs.js createDefaultTradeInputs | company practice | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Concrete / Masonry | Default input |  | — | Default slab L×W×D | 10 ft × 10 ft × 4 in | mixed | starting values | src/lib/tradeCalcs.js createDefaultTradeInputs | app default | COMPANY CUSTOM / USER EDITABLE | Yes |  |
| Concrete / Masonry | Mortar |  | — | Mortar rate | blank / 0 (omitted) | cf | CMU: (blocks/100)×rate; brick: (bricks/1000)×rate | src/lib/tradeCalcs.js calculateCmu / calculateBrick | user-entered only — no default yield table | COMPANY CUSTOM / USER EDITABLE | Yes | Correctly omitted unless the user supplies a rate. Divisors 100 and 1000 are unit conventions, not sourced yields. |
| Shared | Drawing only |  | — | Isometric projection angle | π/6 | rad | standard 30° isometric | src/lib/geometry.js projectPoint | math / drafting convention | MATHEMATICALLY DERIVED | No | Does not affect material quantities. |
| Shared | Drawing only |  | — | L-shape sketch split | 0.6 / 0.4 | fraction of length | visual split | src/lib/geometry.js buildOverallSketchPoints | placeholder geometry | PLACEHOLDER / ESTIMATE | No | Not a takeoff. Do not use as fabricated lengths. |
| Shared | Drawing only |  | — | U-shape sketch split | 0.45 / 0.35 | fraction of length | visual split | src/lib/geometry.js buildOverallSketchPoints | placeholder geometry | PLACEHOLDER / ESTIMATE | No |  |
