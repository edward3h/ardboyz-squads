import { computeViewBox, deploymentZoneEdge, objectiveMeasurements } from './geometry.js';
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
const ZONE_DIMENSION_INSET = 1.5;
const OBJECTIVE_RADIUS = 0.5;
const OBJECTIVE_DIMENSION_INSET = 1;

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

  const objectives = mission.objectives ?? [];
  const measurements = objectiveMeasurements(objectives, table);

  objectives.forEach((objective, i) => {
    parts.push(svgCircle({ cx: objective.x, cy: objective.y, r: OBJECTIVE_RADIUS, fill: '#CCC' }));
    parts.push(objectiveDimension(objective, table, measurements.x[i], measurements.y[i]));
  });

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
  const result = deploymentZoneEdge(rect, table);
  if (!result) {
    return zoneWidthHeightDimensions(rect);
  }
  const { edge, depth } = result;
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

// A zone that doesn't span the table's full width or height (e.g. a corner
// zone) has no single edge-relative "depth" to measure, so instead it gets
// its own width and height labelled with dimension lines drawn just inside
// its top and left edges — independent of where the zone sits on the table,
// so this never collides with anything outside the zone itself.
function zoneWidthHeightDimensions(rect) {
  const width = horizontalDimension({
    x1: rect.x,
    x2: rect.x + rect.width,
    y: rect.y + ZONE_DIMENSION_INSET,
    label: `${rect.width}"`,
  });
  const height = verticalDimension({
    y1: rect.y,
    y2: rect.y + rect.height,
    x: rect.x + ZONE_DIMENSION_INSET,
    label: `${rect.height}"`,
    side: 'right',
  });
  return width + height;
}

// Draws only the measurements objectiveMeasurements says are needed (null
// means skip — either the objective is centered in that axis, or another
// objective already shows the same distance). Lines are offset slightly
// from the objective itself (above it for x, right of it for y) so they
// don't run straight through the objective marker; the edge they measure
// from doesn't change where the line is drawn, only which end of it the
// distance is measured from.
function objectiveDimension(objective, table, xMeasurement, yMeasurement) {
  let svg = '';
  if (xMeasurement) {
    svg += horizontalDimension({
      x1: xMeasurement.edge === 'start' ? 0 : table.width,
      x2: objective.x,
      y: objective.y - OBJECTIVE_DIMENSION_INSET,
      label: `${xMeasurement.distance}"`,
    });
  }
  if (yMeasurement) {
    svg += verticalDimension({
      y1: yMeasurement.edge === 'start' ? 0 : table.height,
      y2: objective.y,
      x: objective.x + OBJECTIVE_DIMENSION_INSET,
      label: `${yMeasurement.distance}"`,
      side: 'right',
    });
  }
  return svg;
}
