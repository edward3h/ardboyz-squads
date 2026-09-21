export const IN_TO_MM = 25.4;

export function inchesToMm(inches) {
  return inches * IN_TO_MM;
}

export function computeViewBox(table, marginMm) {
  const tableWidthMm = inchesToMm(table.width);
  const tableHeightMm = inchesToMm(table.height);
  return {
    minX: -marginMm,
    minY: -marginMm,
    width: tableWidthMm + marginMm * 2,
    height: tableHeightMm + marginMm * 2,
    tableWidthMm,
    tableHeightMm,
  };
}
