import { inchesToMm, computeViewBox, deploymentZoneEdge } from './geometry.js';
import {
  arrowMarkerDefs,
  svgRect,
  svgCircle,
  horizontalDimension,
  verticalDimension,
} from './svg-template.js';

const MARGIN_MM = 15;
const OBJECTIVE_RADIUS_IN = 3;

export function renderMissionSvg(mission, table, colors) {
  const viewBox = computeViewBox(table, MARGIN_MM);
  const parts = [arrowMarkerDefs()];

  parts.push(
    svgRect({ x: 0, y: 0, width: viewBox.tableWidthMm, height: viewBox.tableHeightMm, fill: '#ffffff' }),
  );

  for (const zone of mission.deployment) {
    parts.push(svgRect({ ...rectToMm(zone.rect), fill: colors[zone.side] }));
  }

  parts.push(
    horizontalDimension({ x1: 0, x2: viewBox.tableWidthMm, y: -8, label: `${table.width}"` }),
  );
  parts.push(
    verticalDimension({
      y1: 0,
      y2: viewBox.tableHeightMm,
      x: viewBox.tableWidthMm + 8,
      label: `${table.height}"`,
    }),
  );

  for (const zone of mission.deployment) {
    parts.push(deploymentDimension(zone.rect, table, viewBox));
  }

  for (const objective of mission.objectives ?? []) {
    parts.push(
      svgCircle({
        cx: inchesToMm(objective.x),
        cy: inchesToMm(objective.y),
        r: inchesToMm(OBJECTIVE_RADIUS_IN),
      }),
    );
  }

  const minX = viewBox.minX;
  const minY = viewBox.minY;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${minX} ${minY} ${viewBox.width} ${viewBox.height}" ` +
    `width="${viewBox.width}mm" height="${viewBox.height}mm">${parts.join('')}</svg>`
  );
}

// Top/bottom-edge zone labels go to the left of the table (mirroring the
// table-height label on the right), left/right-edge zone labels go below
// the table (mirroring the table-width label above) — so a zone's own
// dimension line never overlaps the table's width/height dimension lines.
function deploymentDimension(rect, table, viewBox) {
  const { edge, depth } = deploymentZoneEdge(rect, table);
  const rectMm = rectToMm(rect);
  const label = `${depth}"`;

  if (edge === 'top' || edge === 'bottom') {
    return verticalDimension({ y1: rectMm.y, y2: rectMm.y + rectMm.height, x: -8, label });
  }
  return horizontalDimension({
    x1: rectMm.x,
    x2: rectMm.x + rectMm.width,
    y: viewBox.tableHeightMm + 8,
    label,
  });
}

function rectToMm(rect) {
  return {
    x: inchesToMm(rect.x),
    y: inchesToMm(rect.y),
    width: inchesToMm(rect.width),
    height: inchesToMm(rect.height),
  };
}
