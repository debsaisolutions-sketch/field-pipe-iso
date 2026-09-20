import fs from "node:fs";
import path from "node:path";
import {
  VERIFICATION_STATUS,
  buildVerificationInventory,
  inventoryToMarkdownTable,
  summarizeVerification,
  CHART_VALUE_CONVERSIONS,
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

This file is the human-readable audit. The machine inventory that generated the matrix lives in \`src/lib/takeoffVerification.js\` (\`buildVerificationInventory()\`). Chart selection and per-cell metadata live on jobs/standards JSON (\`calculator_state.chart_selection\`, \`_chartSelection\`).

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
| Charts | \`src/lib/charts/electricalKlein.js\`, \`src/lib/charts/plumbingCharlotte.js\`, \`src/lib/charts/resolveTakeoffChart.js\`, \`src/lib/charts/chartTypes.js\` |
| UI defaults | \`src/app/page.js\`, \`src/components/TradeInputsPanel.js\`, \`src/components/TakeoffTypeBar.js\` |

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

## UNVERIFIED → VERIFIED / COMPANY conversions (2026-09-19 increment)

Do not mark an entire trade verified because some cells converted.

| Previous | New | Manufacturer | Chart | Source URL | Size / item | Value | Code location | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${CHART_VALUE_CONVERSIONS.map(
  (c) =>
    `| ${c.previousStatus} | ${c.newStatus} | ${c.manufacturer} | ${c.chart} | ${c.sourceUrl || "—"} | ${c.sizeItem} | ${c.value} | \`${c.location}\` | ${c.dateVerified} |`
).join("\n")}

Plumbing: **no cells converted to VERIFIED.** Charlotte DC-DWV was inspected; letter dimensions were not mapped into cut length.

HVAC: **no cells converted.** Generated multipliers stay UNVERIFIED. SMACNA selector is present but disabled.

---

## Findings by trade

### Pipe / Welding — preserve current table

- **90° elbows** match the in-repo Blue Book rule \`nominal inches × 1.5\` (“pipe size + half”) for every catalog size. **VERIFIED.** Editable in Takeoff Settings.
- **45° elbows** match \`nominal inches × 0.625\`. Two cells are rounded (\`3/4"\` 0.469 vs 0.46875; \`1-1/4"\` 0.781 vs 0.78125). Still **VERIFIED** as the documented table. Do not overwrite.
- **tee / reducer / coupling / flange / valve** have **no formula in the repo**. Treat as **COMPANY CUSTOM / USER EDITABLE**. They are not a named manufacturer chart.
- Default size \`2"\` and default run \`120 in\` are app starting values, not charts.

No Pipe/Welding production numbers were changed in this audit.

### HVAC / Duct — UNVERIFIED chart (architecture only)

Generated as \`primary dimension × {90:1, 45:0.5, transition:0.5, tee:0.75, boot:0.5, damper:0.25}\`, register = 0. **No SMACNA, throat-radius, or manufacturer chart is loaded.** Fitting cells remain **UNVERIFIED**. Selectors exist for Rectangular / Round / Flex and Company Custom; SMACNA is listed as disabled “not loaded.” Do not treat generated multipliers as verified.

### Electrical — Klein 90° stub-up only

Production chart: **Klein Hand Bender** on EMT (and Rigid sizes Klein lists).

Verified 90° take-up (amount to subtract from desired stub / free-end height):

- 1/2" EMT → 5"
- 3/4" EMT → 6" (same published cell as 1/2" Rigid)
- 1" EMT → 8" (same published cell as 3/4" Rigid)
- 1-1/4" EMT → 11" (same published cell as 1" Rigid)

These are **Klein hand-bender values, not universal.** PVC does not inherit EMT. 1-1/4" Rigid, IMC-as-named, 45°, offset, shrink, LB, boxes, and unlisted sizes stay **UNVERIFIED** or company-custom. Klein offset multipliers were not converted into takeoff cells.

IDEAL’s 3/4" EMT stub example (6" take-up) was used only as a cross-check. IDEAL is not a selectable chart.

### Plumbing — Charlotte architecture, no mapped takeoff

Plumbing **no longer copies Pipe/Welding**. Charlotte Pipe DC-DWV (updated April 7, 2026) is selectable for PVC DWV / ABS DWV. Catalog letter dimensions (A, B, C, …) were **not** mapped into cut length because fitting drawings/legends did not make center-to-end vs socket vs laying length unambiguous. Copper / CPVC / PEX / Cast Iron charts are not loaded. Empty cells stay **UNVERIFIED** until a company value or a drawing-backed mapping exists. UI: *Chart not verified for this material/manufacturer — enter company value.*

### Framing — exposed job assumptions

- Stud count \`floor(length_in / OC) + 1\`, waste, plate LF: **MATHEMATICALLY DERIVED**.
- 16" OC, extras 2/4/4, plates 2/1, 10% waste, typical header widths: **COMPANY CUSTOM / USER EDITABLE**.
- Door opening height (default 7 ft) and window opening height (default 4 ft) are **visible, editable job assumptions** used for sheathing. Not claimed as universal. Saved with the job. Labeled: *Job assumption — edit to match plans.*
- 4×8 sheet area (32 sf) is math **given** that sheet size.

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

1. **Electrical 45° / offset / LB / unlisted 90° sizes / PVC** — Klein 90° take-up is loaded only for listed EMT/Rigid sizes. Other electrical cells remain unverified.
2. **Plumbing fitting takeoffs** — Charlotte catalog inspected but not mapped; cells stay empty/unverified. Welding table is no longer used.
3. **HVAC elbow/transition/tee/boot/damper multipliers** — generated, not SMACNA. Still unverified.
4. **Drywall tape 0.37** and **brick 6.75 /sf** — unlabeled-source estimates (tape is at least marked estimate in the UI).

---

## Pipe / Welding items that need attention (do not overwrite)

| Item | Action |
| --- | --- |
| 90° table | Keep. Matches size × 1.5. |
| 45° table | Keep. Matches size × 0.625 with two 0.001-in roundings. |
| tee / reducer / coupling / flange / valve | Keep as company-editable. Do not claim they are a published chart. |
| Plumbing copy of this table | Problem is on the plumbing preset, not the pipe table. |

---

## Data model — manufacturer charts (no SQL)

Jobs store \`calculator_state.chart_selection\`. Company standards store \`_chartSelection\` on the existing JSON blob.

Active calculation identity:

- takeoff_type
- material_system
- manufacturer
- chart_name / chart_version / source
- size
- component
- takeoff_value
- verification_status

Per verified cell metadata: \`sourceType\`, \`sourceName\`, \`sourceUrl\`, \`manufacturer\`, \`chartName\`, \`chartVersion\`, \`verifiedAt\`, \`materialSystem\`, \`applicableSizes\`, \`notes\`.

Plumbing never falls back to the welding table. Unsupported material/manufacturer combinations stay company-custom / unverified.

---

## Source research plan (do not scrape blogs)

**Priority 1 — Electrical (in progress)**
Klein 90° stub-up take-up is loaded for listed sizes only. Still needed: 45°/offset/shrink/LB if a published rule maps cleanly to cut length; PVC; other manufacturers (Greenlee, IDEAL as its own chart, Gardner Bender).

**Priority 2 — Plumbing fitting dimensions by system**
Charlotte DC-DWV letters need drawing-backed mapping (center-to-end vs socket vs laying length) before any cell is filled. Then copper C-to-E, CPVC, PEX insert, CI hub/no-hub from primary catalogs. Spears remains a secondary index only.

**Priority 3 — HVAC / duct**
Need SMACNA fitting allowances and/or a named rectangular/round manufacturer table. Selectors are stubbed. Do not invent throat radii.

**Priority 4 — Framing / drywall / masonry finishing**
- Framing opening heights are now editable job assumptions.
- Drywall: USG or similar tape/compound yield if we keep those estimates; otherwise keep them optional.
- Masonry: BIA/NCMA face and mortar yield; actual vs nominal block size.

**Priority 5 — Pipe/Welding non-elbow fittings**
If Deb wants tee/reducer/flange/valve to be chart-backed, obtain the company Blue Book / manufacturer weld fitting C-to-E used in the field. Until then they stay company-editable.

---

## Tests added

See \`src/lib/takeoffVerification.test.js\` and \`src/lib/charts/chartTakeoff.test.js\`:

- Klein 1/2", 3/4", 1", 1-1/4" EMT 90 take-up
- Company custom override
- Unsupported combinations do not receive a verified value
- PVC does not inherit EMT
- Plumbing does not fall back to welding
- Charlotte values are not auto-mapped into takeoff
- Manufacturer selection persists in save/load
- Framing door/window heights change sheathing and persist
- Pipe/Welding math unchanged; old jobs load; trade switch does not leak charts

---

## UI safety labels

- Electrical Klein: *✓ Verified manufacturer chart — Klein Tools — Conduit Bending Basics*
- Electrical/plumbing custom or unverified: *⚠ Company Custom / Unverified* or *Chart not verified for this material/manufacturer — enter company value.*
- HVAC: *Unverified default — confirm against your manufacturer/company chart.* Generated multipliers are labeled UNVERIFIED, not SMACNA.
- Framing opening heights: *Job assumption — edit to match plans.*
- Company-custom numbers stay editable and are not labeled verified.

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
