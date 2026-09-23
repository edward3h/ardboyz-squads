const ARROW_MARKER_ID = 'dim-arrow';
// These are visual proportions, not real-world measurements — the diagram
// is representative, not to a physical scale, so we work in the same
// "inches" units as the table/zone data instead of converting to mm.
const DIMENSION_FONT_SIZE = 1.2;
const DIMENSION_STROKE_WIDTH = 0.1;
const SHAPE_STROKE_WIDTH = 0.15;
const DIMENSION_TEXT_GAP = 0.4;

// Literal values duplicated from static/style.css's :root custom properties
// (--main-bg-color, --main-color) — there's no build-time link between the
// CSS file and this generator, so keep these in sync by hand.
const THEME = {
  tableBg: { light: '#ffffff', dark: '#111122' },
  dim: { light: '#111122', dark: '#eeeeee' },
  objective: { light: '#cccccc', dark: '#555577' },
};

function themeRule(className, property, value) {
  return `.${className} { ${property}: ${value}; }`;
}

// Emits the SVG's embedded stylesheet: light defaults, a dark-mode override,
// then a print override last so printing always renders light regardless of
// the viewer's OS theme (mirrors the equivalent @media print block in
// static/style.css).
export function themeStyleBlock(zoneColors) {
  const zoneEntries = Object.entries(zoneColors);
  const light = [
    themeRule('table-bg', 'fill', THEME.tableBg.light),
    themeRule('dim', 'stroke', THEME.dim.light),
    themeRule('dim-text', 'fill', THEME.dim.light),
    themeRule('objective', 'fill', THEME.objective.light),
    ...zoneEntries.map(([side, colors]) => themeRule(`zone-${side}`, 'fill', colors.light)),
  ].join(' ');
  const dark = [
    themeRule('table-bg', 'fill', THEME.tableBg.dark),
    themeRule('dim', 'stroke', THEME.dim.dark),
    themeRule('dim-text', 'fill', THEME.dim.dark),
    themeRule('objective', 'fill', THEME.objective.dark),
    ...zoneEntries.map(([side, colors]) => themeRule(`zone-${side}`, 'fill', colors.dark)),
  ].join(' ');
  return (
    `<style>${light} @media (prefers-color-scheme: dark) { ${dark} } ` +
    `@media print { ${light} }</style>`
  );
}

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

export function svgRect({ x, y, width, height, fillClass, strokeClass = 'dim' }) {
  return (
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
    `class="${fillClass} ${strokeClass}" stroke-width="${SHAPE_STROKE_WIDTH}" />`
  );
}

export function svgCircle({ cx, cy, r, fillClass, strokeClass = 'dim' }) {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" ` +
    `class="${fillClass} ${strokeClass}" stroke-width="${SHAPE_STROKE_WIDTH}" />`
  );
}

function dimensionText(x, y, label, anchor) {
  return (
    `<text x="${x}" y="${y}" font-family="Arial" font-size="${DIMENSION_FONT_SIZE}" ` +
    `text-anchor="${anchor}" class="dim-text">${label}</text>`
  );
}

export function horizontalDimension({ x1, x2, y, label }) {
  const line =
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  return line + dimensionText((x1 + x2) / 2, y - DIMENSION_TEXT_GAP, label, 'middle');
}

// Text stays horizontal even for a vertical dimension line — `side` says
// which way to offset it (away from the shape the line is measuring) so it
// doesn't overlap the line or the table.
export function verticalDimension({ y1, y2, x, label, side }) {
  const line =
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dim" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  const textX = side === 'left' ? x - DIMENSION_TEXT_GAP : x + DIMENSION_TEXT_GAP;
  const anchor = side === 'left' ? 'end' : 'start';
  return line + dimensionText(textX, (y1 + y2) / 2, label, anchor);
}
