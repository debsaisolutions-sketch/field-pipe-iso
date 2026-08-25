export function toInches(lengthValue, unit) {
  const length = Number(lengthValue) || 0;
  return unit === "feet" ? length * 12 : length;
}

export function buildKnownLengthFromCalculatorRun(lengthValue, unit) {
  if (unit === "feet") {
    return `${toInches(lengthValue, unit)}`;
  }
  return String(lengthValue ?? "");
}

export function formatRunLength(value) {
  const numeric = Number(value) || 0;
  return Number.isInteger(numeric) ? `${numeric}` : numeric.toFixed(2);
}

export function formatDirectionLabel(directionValue) {
  if (!directionValue) return "East";
  return directionValue[0].toUpperCase() + directionValue.slice(1);
}

export function rotateVector([x, y, z], turns) {
  const normalized = ((turns % 4) + 4) % 4;
  if (normalized === 0) return [x, y, z];
  if (normalized === 1) return [-y, x, z];
  if (normalized === 2) return [-x, -y, z];
  return [y, -x, z];
}

export function projectPoint([x, y, z], rotateTurns, flipped) {
  const [rx, ry, rz] = rotateVector([x, y, z], rotateTurns);
  const fx = flipped ? -rx : rx;
  const angle = Math.PI / 6;
  const px = (fx - ry) * Math.cos(angle);
  const py = (fx + ry) * Math.sin(angle) - rz;
  return [px, py];
}

export function buildOverallSketchPoints(mode, straightLength) {
  const base = Math.max(straightLength, 1);

  if (mode === "l-shape") {
    const firstLeg = Math.max(base * 0.6, 1);
    const secondLeg = Math.max(base * 0.4, 1);
    return [
      [0, 0, 0],
      [firstLeg, 0, 0],
      [firstLeg, secondLeg, 0],
    ];
  }

  if (mode === "u-z-shape") {
    const firstLeg = Math.max(base * 0.45, 1);
    const middleLeg = Math.max(base * 0.35, 1);
    return [
      [0, 0, 0],
      [firstLeg, 0, 0],
      [firstLeg, middleLeg, 0],
      [0, middleLeg, 0],
    ];
  }

  return null;
}
