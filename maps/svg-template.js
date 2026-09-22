const ARROW_MARKER_ID = 'dim-arrow';
// These are visual proportions, not real-world measurements — the diagram
// is representative, not to a physical scale, so we work in the same
// "inches" units as the table/zone data instead of converting to mm.
const DIMENSION_FONT_SIZE = 1.2;
const DIMENSION_STROKE_WIDTH = 0.1;
const SHAPE_STROKE_WIDTH = 0.15;
const DIMENSION_TEXT_GAP = 0.4;

// Same "ConcaveTriangle" marker shape as static/squads_layout_inkscape.svg,
// so generated maps use the same arrowhead as the original hand-drawn one.
export function arrowMarkerDefs() {
  return (
    `<defs><marker id="${ARROW_MARKER_ID}" style="overflow:visible" refX="6" refY="0" ` +
    `orient="auto-start-reverse" markerWidth="1" markerHeight="1" viewBox="0 0 1 1">` +
    `<path d="M -1.4,-2.8 6.3,0 -1.4,2.8 C 0,1.169 0,-1.162 -1.4,-2.8 Z" ` +
    `style="fill:context-stroke;fill-rule:evenodd;stroke:none" /></marker></defs>`
  );
}

export function svgRect({ x, y, width, height, fill, stroke = '#000000' }) {
  return (
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
    `fill="${fill}" stroke="${stroke}" stroke-width="${SHAPE_STROKE_WIDTH}" />`
  );
}

export function svgCircle({ cx, cy, r, fill = 'none', stroke = '#000000' }) {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" ` +
    `stroke-width="${SHAPE_STROKE_WIDTH}" />`
  );
}

function dimensionText(x, y, label, anchor) {
  return (
    `<text x="${x}" y="${y}" font-family="Arial" font-size="${DIMENSION_FONT_SIZE}" ` +
    `text-anchor="${anchor}">${label}</text>`
  );
}

export function horizontalDimension({ x1, x2, y, label }) {
  const line =
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#000000" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  return line + dimensionText((x1 + x2) / 2, y - DIMENSION_TEXT_GAP, label, 'middle');
}

// Text stays horizontal even for a vertical dimension line — `side` says
// which way to offset it (away from the shape the line is measuring) so it
// doesn't overlap the line or the table.
export function verticalDimension({ y1, y2, x, label, side }) {
  const line =
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#000000" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  const textX = side === 'left' ? x - DIMENSION_TEXT_GAP : x + DIMENSION_TEXT_GAP;
  const anchor = side === 'left' ? 'end' : 'start';
  return line + dimensionText(textX, (y1 + y2) / 2, label, anchor);
}
