function n(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function nonNegative(value) {
  return Math.max(n(value), 0);
}

function finiteOrZero(value) {
  const num = n(value);
  return Number.isFinite(num) ? num : 0;
}

export function createDefaultTradeInputs() {
  return {
    hvacFlexFeet: "",
    hvacEquipmentCount: "",
    conductorFeet: "",
    wallLength: "16",
    wallHeight: "8",
    wallLengthUnit: "feet",
    studSpacing: "16",
    corners: "0",
    doors: "0",
    windows: "0",
    topPlates: "2",
    bottomPlates: "1",
    extraStudsPerCorner: "2",
    extraStudsPerDoor: "4",
    extraStudsPerWindow: "4",
    doorWidth: "3",
    windowWidth: "3",
    framingWastePct: "10",
    includeSheathing: false,
    drywallWidth: "12",
    drywallHeight: "8",
    wallCount: "1",
    ceilingEnabled: false,
    ceilingWidth: "12",
    ceilingLength: "12",
    sheetWidth: "4",
    sheetHeight: "8",
    openingCount: "0",
    openingWidth: "3",
    openingHeight: "7",
    drywallWastePct: "10",
    tapeFactor: "0.37",
    includeTape: true,
    compoundGalPer1000: "",
    concreteSubType: "concrete",
    concLength: "10",
    concWidth: "10",
    concDepth: "4",
    concLengthUnit: "feet",
    concWidthUnit: "feet",
    concDepthUnit: "inches",
    concWastePct: "5",
    masonryLength: "20",
    masonryHeight: "8",
    blockWidthIn: "8",
    blockHeightIn: "8",
    blockLengthIn: "16",
    brickPerSf: "6.75",
    masonryOpeningArea: "0",
    masonryWastePct: "5",
    mortarCfPer100: "",
  };
}

function toFeet(value, unit) {
  const amount = nonNegative(value);
  if (unit === "inches") return amount / 12;
  if (unit === "yards") return amount * 3;
  return amount;
}

/**
 * Framing takeoff — documented assumptions, not a layout engine.
 *
 * Base studs = floor(length_in / OC) + 1 (both end studs).
 * Plus extraStudsPerCorner per corner, extraStudsPerDoor per door,
 * extraStudsPerWindow per window (defaults 2 / 4 / 4).
 * Waste % is applied to stud count, plate LF, and optional sheathing.
 * Headers use editable typical door/window widths when opening counts are set.
 */
export function calculateFraming(inputs) {
  const wallLengthFt = toFeet(inputs.wallLength, inputs.wallLengthUnit || "feet");
  const wallHeightFt = toFeet(inputs.wallHeight, "feet");
  const spacingIn = nonNegative(inputs.studSpacing) || 16;
  const waste = nonNegative(inputs.framingWastePct) / 100;
  const corners = Math.max(0, Math.floor(nonNegative(inputs.corners)));
  const doors = Math.max(0, Math.floor(nonNegative(inputs.doors)));
  const windows = Math.max(0, Math.floor(nonNegative(inputs.windows)));

  const warnings = [];
  if (wallLengthFt <= 0 || wallHeightFt <= 0) {
    warnings.push("Wall length and height must be greater than zero.");
  }

  const lengthIn = wallLengthFt * 12;
  const baseStuds = wallLengthFt > 0 ? Math.floor(lengthIn / spacingIn) + 1 : 0;
  const extra =
    corners * nonNegative(inputs.extraStudsPerCorner) +
    doors * nonNegative(inputs.extraStudsPerDoor) +
    windows * nonNegative(inputs.extraStudsPerWindow);
  const studsRaw = baseStuds + extra;
  const studs = Math.ceil(studsRaw * (1 + waste));

  const topPlateLf = finiteOrZero(nonNegative(inputs.topPlates) * wallLengthFt * (1 + waste));
  const bottomPlateLf = finiteOrZero(nonNegative(inputs.bottomPlates) * wallLengthFt * (1 + waste));
  const headerLf = finiteOrZero(
    doors * nonNegative(inputs.doorWidth) + windows * nonNegative(inputs.windowWidth)
  );

  // Unverified hidden defaults (not editable in the form): door height 7 ft, window height 4 ft.
  // Used only for optional sheathing area, not stud counts.
  const openingArea =
    doors * nonNegative(inputs.doorWidth) * Math.min(wallHeightFt, 7) +
    windows * nonNegative(inputs.windowWidth) * 4;
  const wallArea = Math.max(wallLengthFt * wallHeightFt - openingArea, 0);
  const sheathingSf = inputs.includeSheathing ? finiteOrZero(wallArea * (1 + waste)) : 0;
  const sheathingSheets = inputs.includeSheathing ? Math.ceil(sheathingSf / 32) : 0;

  const assumptions = [
    `Stud spacing ${spacingIn}" on center.`,
    `Base studs = floor(wall length ÷ OC) + 1.`,
    `Extra studs: ${nonNegative(inputs.extraStudsPerCorner)} per corner, ${nonNegative(inputs.extraStudsPerDoor)} per door, ${nonNegative(inputs.extraStudsPerWindow)} per window (king/jack estimate).`,
    `Waste ${nonNegative(inputs.framingWastePct)}% applied to stud count and plate footage.`,
    `Headers use typical widths (${nonNegative(inputs.doorWidth)} ft doors, ${nonNegative(inputs.windowWidth)} ft windows).`,
    inputs.includeSheathing
      ? "Sheathing uses 4x8 (32 sf) sheets after subtracting a simplified opening area."
      : "Sheathing omitted unless enabled.",
  ];

  const rows = [
    { item: "Studs (count)", qty: Number.isFinite(studs) ? String(studs) : "0" },
    { item: "Top plate (linear ft)", qty: topPlateLf.toFixed(2) },
    { item: "Bottom plate (linear ft)", qty: bottomPlateLf.toFixed(2) },
  ];
  if (headerLf > 0) {
    rows.push({ item: "Headers (linear ft, typical widths)", qty: headerLf.toFixed(2) });
  }
  if (inputs.includeSheathing) {
    rows.push({ item: "Sheathing (sf, estimate)", qty: sheathingSf.toFixed(2) });
    rows.push({ item: "Sheathing sheets (4x8, estimate)", qty: String(sheathingSheets) });
  }

  return {
    ok: warnings.length === 0,
    warnings,
    assumptions,
    summary: [
      `Wall: ${wallLengthFt.toFixed(2)} ft long × ${wallHeightFt.toFixed(2)} ft high`,
      `Stud spacing: ${spacingIn}" OC`,
      `Openings: ${doors} door(s), ${windows} window(s), ${corners} corner(s)`,
    ],
    preview: {
      kind: "wall",
      widthLabel: `${wallLengthFt.toFixed(1)} ft`,
      heightLabel: `${wallHeightFt.toFixed(1)} ft`,
    },
    values: {
      wallLengthFt,
      wallHeightFt,
      baseStuds,
      studs,
      topPlateLf,
      bottomPlateLf,
      headerLf,
      sheathingSf,
      sheathingSheets,
    },
    rows,
  };
}

/**
 * Drywall sheets = ceil(netArea × (1 + waste) / sheetArea).
 * Tape uses an editable LF-per-SF factor (default 0.37) and is labeled as an estimate.
 * Compound only appears when gallons per 1000 sf is entered.
 */
export function calculateDrywall(inputs) {
  const width = nonNegative(inputs.drywallWidth);
  const height = nonNegative(inputs.drywallHeight);
  const wallCount = Math.max(1, Math.floor(nonNegative(inputs.wallCount) || 1));
  const waste = nonNegative(inputs.drywallWastePct) / 100;
  const sheetW = nonNegative(inputs.sheetWidth) || 4;
  const sheetH = nonNegative(inputs.sheetHeight) || 8;
  const sheetArea = sheetW * sheetH;

  const warnings = [];
  if (width <= 0 || height <= 0) {
    warnings.push("Wall width and height must be greater than zero.");
  }
  if (sheetArea <= 0) {
    warnings.push("Sheet size must be greater than zero.");
  }

  const wallArea = width * height * wallCount;
  const ceilingArea = inputs.ceilingEnabled
    ? nonNegative(inputs.ceilingWidth) * nonNegative(inputs.ceilingLength)
    : 0;
  const openings =
    Math.max(0, Math.floor(nonNegative(inputs.openingCount))) *
    nonNegative(inputs.openingWidth) *
    nonNegative(inputs.openingHeight);
  const grossArea = wallArea + ceilingArea;
  const netArea = Math.max(grossArea - openings, 0);
  const areaWithWaste = netArea * (1 + waste);
  const sheets =
    sheetArea > 0 && Number.isFinite(areaWithWaste) ? Math.ceil(areaWithWaste / sheetArea) : 0;

  const tapeLf =
    inputs.includeTape === false ? 0 : finiteOrZero(netArea * nonNegative(inputs.tapeFactor));
  const compoundRate = nonNegative(inputs.compoundGalPer1000);
  const compoundGal = compoundRate > 0 ? finiteOrZero((netArea / 1000) * compoundRate) : 0;

  const assumptions = [
    `Sheet size ${sheetW} ft × ${sheetH} ft (${sheetArea} sf).`,
    `Waste ${nonNegative(inputs.drywallWastePct)}% applied to sheet count.`,
    openings > 0 ? `Openings subtracted: ${openings.toFixed(2)} sf.` : "No opening area subtracted.",
    inputs.includeTape === false
      ? "Tape omitted."
      : `Tape estimate uses ${nonNegative(inputs.tapeFactor)} linear ft per sf (editable field estimate, not a spec).`,
    compoundRate > 0
      ? `Joint compound estimate uses ${compoundRate} gal per 1000 sf (editable field estimate).`
      : "Joint compound omitted until a gallons-per-1000-sf rate is entered.",
  ];

  const rows = [
    { item: "Net area (sf)", qty: netArea.toFixed(2) },
    { item: `Drywall sheets (${sheetW}x${sheetH})`, qty: String(sheets) },
  ];
  if (tapeLf > 0) {
    rows.push({ item: "Tape (linear ft, estimate)", qty: tapeLf.toFixed(1) });
  }
  if (compoundGal > 0) {
    rows.push({ item: "Joint compound (gal, estimate)", qty: compoundGal.toFixed(2) });
  }

  return {
    ok: warnings.length === 0,
    warnings,
    assumptions,
    summary: [
      `Walls: ${wallCount} × ${width.toFixed(2)} ft × ${height.toFixed(2)} ft`,
      inputs.ceilingEnabled
        ? `Ceiling: ${nonNegative(inputs.ceilingWidth).toFixed(2)} ft × ${nonNegative(inputs.ceilingLength).toFixed(2)} ft`
        : "Ceiling not included",
      `Net area: ${netArea.toFixed(2)} sf`,
    ],
    preview: {
      kind: "wall",
      widthLabel: `${width.toFixed(1)} ft`,
      heightLabel: `${height.toFixed(1)} ft`,
    },
    values: { netArea, sheets, tapeLf, compoundGal, areaWithWaste, sheetArea },
    rows,
  };
}

export function calculateConcrete(inputs) {
  const subType = inputs.concreteSubType || "concrete";
  if (subType === "cmu") return calculateCmu(inputs);
  if (subType === "brick") return calculateBrick(inputs);
  return calculateConcreteVolume(inputs);
}

function calculateConcreteVolume(inputs) {
  const lengthFt = toFeet(inputs.concLength, inputs.concLengthUnit || "feet");
  const widthFt = toFeet(inputs.concWidth, inputs.concWidthUnit || "feet");
  const depthFt = toFeet(inputs.concDepth, inputs.concDepthUnit || "inches");
  const waste = nonNegative(inputs.concWastePct) / 100;

  const warnings = [];
  if (lengthFt <= 0 || widthFt <= 0 || depthFt <= 0) {
    warnings.push("Length, width, and thickness must be greater than zero.");
  }

  const cubicFeet = finiteOrZero(lengthFt * widthFt * depthFt);
  const cubicYards = finiteOrZero(cubicFeet / 27);
  const cubicYardsWithWaste = finiteOrZero(cubicYards * (1 + waste));

  const assumptions = [
    `Volume = length × width × thickness.`,
    `Cubic yards = cubic feet ÷ 27.`,
    `Waste ${nonNegative(inputs.concWastePct)}% applied to order quantity.`,
  ];

  return {
    ok: warnings.length === 0,
    warnings,
    assumptions,
    summary: [
      `Slab/footing: ${lengthFt.toFixed(2)} ft × ${widthFt.toFixed(2)} ft × ${depthFt.toFixed(3)} ft thick`,
      `Volume: ${cubicFeet.toFixed(2)} cf (${cubicYards.toFixed(3)} cy)`,
    ],
    preview: {
      kind: "plan",
      widthLabel: `${lengthFt.toFixed(1)} ft`,
      heightLabel: `${widthFt.toFixed(1)} ft`,
    },
    values: { cubicFeet, cubicYards, cubicYardsWithWaste },
    rows: [
      { item: "Volume (cubic feet)", qty: cubicFeet.toFixed(2) },
      { item: "Volume (cubic yards)", qty: cubicYards.toFixed(3) },
      { item: "Order quantity with waste (cy)", qty: cubicYardsWithWaste.toFixed(3) },
    ],
  };
}

function masonryNetArea(inputs) {
  const length = nonNegative(inputs.masonryLength);
  const height = nonNegative(inputs.masonryHeight);
  const openings = nonNegative(inputs.masonryOpeningArea);
  return {
    length,
    height,
    wallArea: Math.max(length * height - openings, 0),
    warnings:
      length <= 0 || height <= 0 ? ["Wall length and height must be greater than zero."] : [],
  };
}

function calculateCmu(inputs) {
  const { length, height, wallArea, warnings } = masonryNetArea(inputs);
  const waste = nonNegative(inputs.masonryWastePct) / 100;
  const faceW = (nonNegative(inputs.blockLengthIn) || 16) / 12;
  const faceH = (nonNegative(inputs.blockHeightIn) || 8) / 12;
  const faceSf = faceW * faceH;
  const blocks =
    faceSf > 0 ? Math.ceil((wallArea / faceSf) * (1 + waste)) : 0;
  const mortarRate = nonNegative(inputs.mortarCfPer100);
  const mortarCf = mortarRate > 0 ? finiteOrZero((blocks / 100) * mortarRate) : 0;

  const assumptions = [
    `Block face ${nonNegative(inputs.blockLengthIn) || 16}" × ${nonNegative(inputs.blockHeightIn) || 8}" (${faceSf.toFixed(3)} sf each).`,
    `Count = ceil(net wall area ÷ block face × (1 + waste)).`,
    `Waste ${nonNegative(inputs.masonryWastePct)}%.`,
    mortarRate > 0
      ? `Mortar estimate uses ${mortarRate} cf per 100 blocks (editable).`
      : "Mortar omitted until a cf-per-100-blocks rate is entered.",
  ];

  const rows = [
    { item: "Net wall area (sf)", qty: wallArea.toFixed(2) },
    { item: "CMU count (estimate)", qty: String(blocks) },
  ];
  if (mortarCf > 0) {
    rows.push({ item: "Mortar (cf, estimate)", qty: mortarCf.toFixed(2) });
  }

  return {
    ok: warnings.length === 0,
    warnings,
    assumptions,
    summary: [
      `Wall: ${length.toFixed(2)} ft × ${height.toFixed(2)} ft`,
      `Net area: ${wallArea.toFixed(2)} sf`,
    ],
    preview: {
      kind: "wall",
      widthLabel: `${length.toFixed(1)} ft`,
      heightLabel: `${height.toFixed(1)} ft`,
    },
    values: { wallArea, blocks, mortarCf },
    rows,
  };
}

function calculateBrick(inputs) {
  const { length, height, wallArea, warnings } = masonryNetArea(inputs);
  const waste = nonNegative(inputs.masonryWastePct) / 100;
  const perSf = nonNegative(inputs.brickPerSf) || 6.75;
  const bricks = Math.ceil(wallArea * perSf * (1 + waste));
  const mortarRate = nonNegative(inputs.mortarCfPer100);
  const mortarCf = mortarRate > 0 ? finiteOrZero((bricks / 1000) * mortarRate) : 0;

  const assumptions = [
    `Brick coverage ${perSf} bricks per sf (editable modular default 6.75).`,
    `Waste ${nonNegative(inputs.masonryWastePct)}%.`,
    mortarRate > 0
      ? `Mortar estimate uses ${mortarRate} cf per 1000 bricks (editable).`
      : "Mortar omitted until a cf-per-1000-bricks rate is entered.",
  ];

  const rows = [
    { item: "Net wall area (sf)", qty: wallArea.toFixed(2) },
    { item: "Brick count (estimate)", qty: String(bricks) },
  ];
  if (mortarCf > 0) {
    rows.push({ item: "Mortar (cf, estimate)", qty: mortarCf.toFixed(2) });
  }

  return {
    ok: warnings.length === 0,
    warnings,
    assumptions,
    summary: [
      `Wall: ${length.toFixed(2)} ft × ${height.toFixed(2)} ft`,
      `Net area: ${wallArea.toFixed(2)} sf`,
    ],
    preview: {
      kind: "wall",
      widthLabel: `${length.toFixed(1)} ft`,
      heightLabel: `${height.toFixed(1)} ft`,
    },
    values: { wallArea, bricks, mortarCf, perSf },
    rows,
  };
}

export function calculateAreaTrade(takeoffType, inputs) {
  if (takeoffType === "framing") return calculateFraming(inputs);
  if (takeoffType === "drywall") return calculateDrywall(inputs);
  if (takeoffType === "concrete") return calculateConcrete(inputs);
  return null;
}
