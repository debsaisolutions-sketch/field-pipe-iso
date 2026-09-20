import fs from "node:fs";
import path from "node:path";
import {
  VERIFICATION_STATUS,
  buildVerificationInventory,
  inventoryToMarkdownTable,
  summarizeVerification,
} from "../src/lib/takeoffVerification.js";

export function writeTakeoffAuditMarkdown(cwd = process.cwd()) {
  const rows = buildVerificationInventory();
  const summary = summarizeVerification(rows);
  const byTrade = {};
  for (const item of rows) {
    if (!byTrade[item.trade]) {
      byTrade[item.trade] = { total: 0, counts: {} };
    }
    byTrade[item.trade].total += 1;
    byTrade[item.trade].counts[item.status] = (byTrade[item.trade].counts[item.status] || 0) + 1;
  }

  const preamble = `# Takeoff number verification audit

**Product:** PipeSketch Pro (field-pipe-iso)
**Date:** 2026-09-19
**Scope:** Every numeric default, lookup cell, conversion, waste factor, and formula currently used by the multi-trade presets.
**Rule:** Values are not promoted to VERIFIED unless a source is in this repo or the existing Pipe/Welding 90°/45° Blue Book formulas.

This file is the human-readable audit. The machine inventory that generated the matrix lives in \`src/lib/takeoffVerification.js\` (\`buildVerificationInventory()\`). Metadata fields on presets (\`sourceType\`, \`sourceName\`, \`sourceUrl\`, \`manufacturer\`, \`chartVersion\`, \`verifiedAt\`) are documentation only and **do not change calculations**.

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
| Pipe table | \`src/lib/takeoff.js\` |
| Multi-trade presets / generated tables | \`src/lib/takeoffPresets.js\` |
| Run cut-length math | \`src/lib/runTakeoff.js\`, \`src/lib/geometry.js\` |
| Framing / drywall / concrete | \`src/lib/tradeCalcs.js\` |
| Material list | \`src/lib/materialList.js\` |
| Save/load / defaults | \`src/lib/jobSnapshot.js\`, \`src/lib/standardsBundle.js\`, \`src/lib/takeoffSwitch.js\`, \`src/lib/cloudTakeoff.js\`, \`src/lib/localStorageJobs.js\` |
| PDF | \`src/components/PrintDocument.js\` |
| UI defaults | \`src/app/page.js\`, \`src/components/TradeInputsPanel.js\` |

Skipped as not takeoff math: CSS layout numbers, button min-heights, entitlement flags, auth.

---

## Counts

**Total audited items: ${summary.total}**

| Status | Count |
| --- | ---: |
| VERIFIED | ${summary.counts[VERIFICATION_STATUS.VERIFIED] || 0} |
| MATHEMATICALLY DERIVED | ${summary.counts[VERIFICATION_STATUS.MATH] || 0} |
| COMPANY CUSTOM / USER EDITABLE | ${summary.counts[VERIFICATION_STATUS.COMPANY] || 0} |
| UNVERIFIED | ${summary.counts[VERIFICATION_STATUS.UNVERIFIED] || 0} |
| PLACEHOLDER / ESTIMATE | ${summary.counts[VERIFICATION_STATUS.ESTIMATE] || 0} |

### By trade

| Trade | Items | VERIFIED | MATH | COMPANY | UNVERIFIED | ESTIMATE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${Object.entries(byTrade)
  .map(([trade, info]) => {
    const c = info.counts;
    return `| ${trade} | ${info.total} | ${c[VERIFICATION_STATUS.VERIFIED] || 0} | ${c[VERIFICATION_STATUS.MATH] || 0} | ${c[VERIFICATION_STATUS.COMPANY] || 0} | ${c[VERIFICATION_STATUS.UNVERIFIED] || 0} | ${c[VERIFICATION_STATUS.ESTIMATE] || 0} |`;
  })
  .join("\n")}

---

## Findings by trade

### Pipe / Welding — preserve current table

- **90° elbows** match the in-repo Blue Book rule \`nominal inches × 1.5\` (“pipe size + half”) for every catalog size. **VERIFIED.** Editable in Takeoff Settings.
- **45° elbows** match \`nominal inches × 0.625\`. Two cells are rounded (\`3/4"\` 0.469 vs 0.46875; \`1-1/4"\` 0.781 vs 0.78125). Still **VERIFIED** as the documented table. Do not overwrite.
- **tee / reducer / coupling / flange / valve** have **no formula in the repo**. Treat as **COMPANY CUSTOM / USER EDITABLE**. They are not a named manufacturer chart.
- Default size \`2"\` and default run \`120 in\` are app starting values, not charts.

No Pipe/Welding production numbers were changed in this audit.

### HVAC / Duct — UNVERIFIED chart

Generated as \`primary dimension × {90:1, 45:0.5, transition:0.5, tee:0.75, boot:0.5, damper:0.25}\`, register = 0. **No SMACNA, throat-radius, or manufacturer chart in the repo.** Fitting cells are **UNVERIFIED**. Register 0 is a modeling choice (**COMPANY CUSTOM**). Insulation copies duct cut length (**PLACEHOLDER / ESTIMATE**). UI already called these starter estimates; the Takeoff Settings table now also shows: *Unverified default — confirm against your manufacturer/company chart.*

### Electrical — UNVERIFIED bend chart

Hard-coded take-up / offset / LB values look like a bender chart but:

- do not name a manufacturer (Greenlee, Klein, Ideal, Gardner Bender, …)
- do not change when the user picks EMT / PVC / RMC / IMC / FMC
- do not distinguish bender type or shoe

Those deducts are **UNVERIFIED**. Zeros for coupling / connector / boxes mean “no centerline deduction” (**COMPANY CUSTOM**). Conduit type is a **label only**. Same unverified-default label as HVAC.

### Plumbing — UNVERIFIED reuse of welding takeoffs

Plumbing 90/45/tee/valve copy the **Pipe/Welding** table. Wye copies tee, cleanout copies coupling, trap copies 90. That is **not** PVC socket depth, copper C-to-E, PEX insert, or CI. **UNVERIFIED** for plumbing use even though the copied 90/45 numbers are verified as welding elbows. Same unverified-default label.

### Framing — math + editable assumptions + two hidden risks

- Stud count \`floor(length_in / OC) + 1\`, waste, plate LF: **MATHEMATICALLY DERIVED**.
- 16" OC, extras 2/4/4, plates 2/1, 10% waste, typical header widths: **COMPANY CUSTOM / USER EDITABLE**.
- Hidden door height **7 ft** and window height **4 ft** used only for sheathing: **UNVERIFIED** and **not editable**. A quiet note was added next to the sheathing checkbox. 4×8 sheet area (32 sf) is math **given** that sheet size.

### Drywall — sheet math vs finishing guesses

- Net area and \`ceil(net × (1+waste) / sheetArea)\`: **MATHEMATICALLY DERIVED**.
- 4×8 sheets and 10% waste: **COMPANY CUSTOM / USER EDITABLE**.
- Tape factor **0.37 LF/sf**: **PLACEHOLDER / ESTIMATE** (UI already says estimate). No USG/manufacturer yield in repo.
- Compound uses the user-entered gal/1000 sf rate; omitted if blank. Divisor 1000 is unit math.

### Concrete / Masonry — volume is exact; mortar is not

- \`L×W×D\` and \`cf ÷ 27\`: **MATHEMATICALLY DERIVED**.
- 5% waste, 16×8 nominal CMU face: **COMPANY CUSTOM / USER EDITABLE**. Nominal face is not actual 15-5/8 × 7-5/8 with mortar joint unless the user types those sizes.
- Bricks per sf **6.75**: **PLACEHOLDER / ESTIMATE** (comment says “modular default”; no BIA/ASTM chart in repo).
- Mortar has **no default yield**. Blank until the user enters a rate. Correct omission.

### Shared

- Cut length \`max(known − takeoffs, 0)\` and overall straight cut: **MATHEMATICALLY DERIVED** (quality depends on the active table).
- Isometric \`π/6\`: drawing math, not material.
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

**Yes, without a new database table.** Jobs already store JSON in \`calculator_state\` and \`psp_takeoff_standards\` JSONB. Charts can live on the preset (defaults) and optionally in the standards blob.

Smallest non-breaking addition (already started on presets; not required in saved jobs yet):

\`\`\`js
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
\`\`\`

**Do not add a SQL migration until we load a real chart.** Optional \`_chartMeta\` on the existing standards wrapper would persist user-selected charts the same way \`_tradeTables\` already stores HVAC/electrical/plumbing tables.

Recommended next fields when charts are loaded: \`takeoff_type\`, \`material_system\`, \`manufacturer\`, \`chart_name\`, \`chart_version\`, \`source_url\`, \`verified_at\`, \`verification_status\`.

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

Deterministic math only (see \`src/lib/takeoffVerification.test.js\`):

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

Each row is one default, lookup cell, conversion, or formula. Generated from \`buildVerificationInventory()\`.
`;

const out = `${preamble}

${inventoryToMarkdownTable(rows)}
`;

const dest = path.join(cwd, "docs", "takeoff-number-verification-audit.md");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out, "utf8");
  return { dest, ...summary, byTrade };
}
