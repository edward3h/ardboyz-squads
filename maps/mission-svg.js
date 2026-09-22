import { computeViewBox, deploymentZoneEdge } from './geometry.js';
import {
  arrowMarkerDefs,
  svgRect,
  svgCircle,
  horizontalDimension,
  verticalDimension,
} from './svg-template.js';

// Visual proportions for a representative diagram, not real-world
// measurements — units match the table/zone data ("inches" in name only).
const MARGIN = 5;
const DIMENSION_OFFSET = 1.5;
const OBJECTIVE_RADIUS = 1;

export function renderMissionSvg(mission, table, colors) {
  const viewBox = computeViewBox(table, MARGIN);
  const parts = [arrowMarkerDefs()];

  parts.push(svgRect({ x: 0, y: 0, width: table.width, height: table.height, fill: '#ffffff' }));

  for (const zone of mission.deployment) {
    parts.push(svgRect({ ...zone.rect, fill: colors[zone.side] }));
  }

  parts.push(
    horizontalDimension({
      x1: 0,
      x2: table.width,
      y: -DIMENSION_OFFSET,
      label: `${table.width}"`,
    }),
  );
  parts.push(
    verticalDimension({
      y1: 0,
      y2: table.height,
      x: table.width + DIMENSION_OFFSET,
      label: `${table.height}"`,
      side: 'right',
    }),
  );

  for (const zone of mission.deployment) {
    parts.push(deploymentDimension(zone.rect, table));
  }

  for (const objective of mission.objectives ?? []) {
    parts.push(svgCircle({ cx: objective.x, cy: objective.y, r: OBJECTIVE_RADIUS }));
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}" ` +
    `width="${viewBox.width}in" height="${viewBox.height}in">${parts.join('')}</svg>`
  );
}

// Top/bottom-edge zone labels go to the left of the table (mirroring the
// table-height label on the right), left/right-edge zone labels go below
// the table (mirroring the table-width label above) — so a zone's own
// dimension line never overlaps the table's width/height dimension lines.
function deploymentDimension(rect, table) {
  const { edge, depth } = deploymentZoneEdge(rect, table);
  const label = `${depth}"`;

  if (edge === 'top' || edge === 'bottom') {
    return verticalDimension({
      y1: rect.y,
      y2: rect.y + rect.height,
      x: -DIMENSION_OFFSET,
      label,
      side: 'left',
    });
  }
  return horizontalDimension({
    x1: rect.x,
    x2: rect.x + rect.width,
    y: table.height + DIMENSION_OFFSET,
    label,
  });
}
