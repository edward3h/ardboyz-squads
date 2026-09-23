# Mission Map Dark/Light Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated mission-map SVGs (`static/maps/*.svg`) switch between light and dark colours in step with the main page's existing dark/light theming, and always render light when printed.

**Architecture:** Each generated SVG carries its own embedded `<style>` block (light default → `@media (prefers-color-scheme: dark)` override → `@media print` override last, so print always wins). Shapes/text reference CSS classes instead of literal hex colours. Deployment-zone colours gain a `dark` variant in `maps/missions.yaml`.

**Tech Stack:** Node.js (`maps/render.js` etc.), `node:test` for unit tests, hand-written SVG string templates (no SVG library).

**Spec:** `docs/superpowers/specs/2026-09-22-map-dark-mode-design.md`

---

## Chunk 1: Colour schema + validation

**Files:**
- Modify: `maps/missions.yaml` (the `colors:` block)
- Modify: `maps/validate.js` (`validateColors`)
- Modify: `maps/validate.test.js`

- [ ] **Step 1: Update the test fixture to the new colour shape**

In `maps/validate.test.js`, change `validData()`'s `colors` field:

```js
colors: {
  a: { light: '#afc6e9', dark: '#3a4f70' },
  b: { light: '#e9afaf', dark: '#704a4a' },
},
```

- [ ] **Step 2: Write failing tests for the new validation rules**

Add these test cases to `maps/validate.test.js` (after the existing "rejects a side used in missions with no color entry" test):

```js
test('validateData rejects a color entry missing "light"', () => {
  const data = validData();
  delete data.colors.b.light;
  assert.throws(() => validateData(data), /color for side "b".*light/i);
});

test('validateData rejects a color entry missing "dark"', () => {
  const data = validData();
  delete data.colors.b.dark;
  assert.throws(() => validateData(data), /color for side "b".*dark/i);
});

test('validateData rejects a color entry with a non-string dark value', () => {
  const data = validData();
  data.colors.b.dark = 123;
  assert.throws(() => validateData(data), /color for side "b".*dark/i);
});

test('validateData rejects a color entry with a non-string light value', () => {
  const data = validData();
  data.colors.b.light = 123;
  assert.throws(() => validateData(data), /color for side "b".*light/i);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test maps/validate.test.js`
Expected: the 3 new tests FAIL (old `colors.a`/`colors.b` shape and truthiness-only check don't catch these), and the existing "no color entry" test still passes since `colors.b` being `undefined` is still falsy.

- [ ] **Step 4: Update `validateColors` to check the new shape**

In `maps/validate.js`, replace `validateColors`:

```js
function validateColors(colors, missions) {
  if (!colors || typeof colors !== 'object') {
    throw new Error('Top-level "colors" must be an object');
  }
  const usedSides = new Set();
  for (const mission of Object.values(missions)) {
    for (const zone of mission.deployment) {
      usedSides.add(zone.side);
    }
  }
  for (const side of usedSides) {
    const entry = colors[side];
    if (!entry) {
      throw new Error(`No color defined for side "${side}"`);
    }
    if (typeof entry.light !== 'string') {
      throw new Error(`Color for side "${side}" must have a string "light" value`);
    }
    if (typeof entry.dark !== 'string') {
      throw new Error(`Color for side "${side}" must have a string "dark" value`);
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test maps/validate.test.js`
Expected: all tests PASS.

- [ ] **Step 6: Update `maps/missions.yaml`'s colours to the new shape**

Replace:

```yaml
colors:
  a: "#afc6e9" # light blue, matches the original hand-drawn map
  b: "#e9afaf" # light red, matches the original hand-drawn map
```

with:

```yaml
colors:
  a:
    light: "#afc6e9" # light blue, matches the original hand-drawn map
    dark: "#3a4f70" # muted dark-mode counterpart
  b:
    light: "#e9afaf" # light red, matches the original hand-drawn map
    dark: "#704a4a" # muted dark-mode counterpart
```

- [ ] **Step 7: Commit**

```bash
git add maps/missions.yaml maps/validate.js maps/validate.test.js
git commit -m "Require light/dark variants for mission map zone colors"
```

---

## Chunk 2: Themed SVG template helpers

**Files:**
- Modify: `maps/svg-template.js`

- [ ] **Step 1: Add the theme style-block constants and generator**

Add near the top of `maps/svg-template.js`, after the existing constants:

```js
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
```

- [ ] **Step 2: Change `svgRect`/`svgCircle` to take fill/stroke classes**

Replace the existing `svgRect` and `svgCircle`:

```js
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
```

Note: with class-based colouring, `fill`/`stroke` presentation attributes are gone — the `.table-bg`/`.zone-<side>`/`.objective` classes set `fill`, and `.dim` sets `stroke`, so a shape needs both classes present in its `class` attribute to get both colours (e.g. `class="table-bg dim"`).

- [ ] **Step 3: Update `dimensionText` to carry the `.dim-text` class**

Replace:

```js
function dimensionText(x, y, label, anchor) {
  return (
    `<text x="${x}" y="${y}" font-family="Arial" font-size="${DIMENSION_FONT_SIZE}" ` +
    `text-anchor="${anchor}">${label}</text>`
  );
}
```

with:

```js
function dimensionText(x, y, label, anchor) {
  return (
    `<text x="${x}" y="${y}" font-family="Arial" font-size="${DIMENSION_FONT_SIZE}" ` +
    `text-anchor="${anchor}" class="dim-text">${label}</text>`
  );
}
```

- [ ] **Step 4: Update `horizontalDimension`/`verticalDimension` to use the `.dim` class for their line**

Replace the `<line ...>` construction in both functions — in `horizontalDimension`:

```js
export function horizontalDimension({ x1, x2, y, label }) {
  const line =
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  return line + dimensionText((x1 + x2) / 2, y - DIMENSION_TEXT_GAP, label, 'middle');
}
```

and in `verticalDimension`:

```js
export function verticalDimension({ y1, y2, x, label, side }) {
  const line =
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dim" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  const textX = side === 'left' ? x - DIMENSION_TEXT_GAP : x + DIMENSION_TEXT_GAP;
  const anchor = side === 'left' ? 'end' : 'start';
  return line + dimensionText(textX, (y1 + y2) / 2, label, anchor);
}
```

(The `context-stroke` fill on the arrow marker is unaffected — it resolves the referencing line's computed stroke colour at paint time, whether that stroke comes from a presentation attribute or, as here, a CSS class.)

- [ ] **Step 5: Run the existing geometry/svg-template tests (there are none directly for svg-template.js, so just run the full suite) to confirm nothing else broke**

Run: `node --test maps/`
Expected: all PASS (svg-template.js has no dedicated test file; `mission-svg.js` isn't updated yet in this chunk so nothing calls the changed signatures yet).

- [ ] **Step 6: Commit**

```bash
git add maps/svg-template.js
git commit -m "Theme SVG template helpers with CSS classes for dark/light/print"
```

---

## Chunk 3: Wire mission-svg.js to the themed template + page CSS fix

**Files:**
- Modify: `maps/mission-svg.js`
- Modify: `static/style.css`
- Modify: `maps/render.js` (only if needed — check signature of `renderMissionSvg`, likely no change)

- [ ] **Step 1: Import `themeStyleBlock` and emit it in the SVG**

In `maps/mission-svg.js`, update the import:

```js
import {
  arrowMarkerDefs,
  themeStyleBlock,
  svgRect,
  svgCircle,
  horizontalDimension,
  verticalDimension,
} from './svg-template.js';
```

Update `renderMissionSvg` to push the style block alongside the arrow marker defs:

```js
export function renderMissionSvg(mission, table, colors) {
  const viewBox = computeViewBox(table, MARGIN);
  const parts = [themeStyleBlock(colors), arrowMarkerDefs()];

  parts.push(svgRect({ x: 0, y: 0, width: table.width, height: table.height, fillClass: 'table-bg' }));

  for (const zone of mission.deployment) {
    parts.push(svgRect({ ...zone.rect, fillClass: `zone-${zone.side}` }));
  }
  ...
```

- [ ] **Step 2: Update the objective circle call**

Find:

```js
parts.push(svgCircle({ cx: objective.x, cy: objective.y, r: OBJECTIVE_RADIUS, fill: '#CCC' }));
```

Replace with:

```js
parts.push(svgCircle({ cx: objective.x, cy: objective.y, r: OBJECTIVE_RADIUS, fillClass: 'objective' }));
```

- [ ] **Step 3: Read the rest of `maps/mission-svg.js` for any other `fill`/`stroke` literal usages**

Run: `grep -n "fill\|stroke" maps/mission-svg.js`
Expected: only the two calls above should reference colour — the dimension-line/text calls already went through `svg-template.js` helpers updated in Chunk 2 and take no colour params. If anything else shows up, convert it the same way (literal colour → matching class).

- [ ] **Step 4: Regenerate the SVGs**

Run: `node maps/render.js`
Expected: prints `Rendered <mission>.svg` for all 5 missions, no errors.

- [ ] **Step 5: Spot-check one generated SVG**

Run: `cat static/maps/point-assault.svg`
Expected: contains a `<style>` block with `.table-bg`, `.dim`, `.dim-text`, `.objective`, `.zone-a`, `.zone-b` rules under default/`prefers-color-scheme: dark`/`print`; the table rect has `class="table-bg dim"`; zone rects have `class="zone-a dim"`/`class="zone-b dim"`; objective circle has `class="objective dim"`; dimension lines have `class="dim"`; dimension text has `class="dim-text"`.

- [ ] **Step 6: Remove the forced-white figure background**

In `static/style.css`, delete the `background-color: white;` line from the `figure` rule (around line 118-121):

```css
figure {
  max-width: 800px;
  background-color: white;
}
```

becomes:

```css
figure {
  max-width: 800px;
}
```

- [ ] **Step 7: Commit**

```bash
git add maps/mission-svg.js static/maps/*.svg static/style.css
git commit -m "Render mission maps with dark/light theming, stop forcing figure white"
```

---

## Chunk 4: Manual verification

- [ ] **Step 1: Run the full test suite**

Run: `node --test maps/`
Expected: all PASS.

- [ ] **Step 2: Visually check the maps in a browser under both OS themes**

Open `src/markdown/missions.md`'s rendered output (or directly open one of the `static/maps/*.svg` files, e.g. `static/maps/point-assault.svg`, in a browser tab) and toggle the OS/browser dark-mode setting (or use browser devtools' "Emulate CSS media feature prefers-color-scheme"). Confirm: light mode shows the original white/black/blue/red look; dark mode shows a dark-navy background with light strokes/text and the muted zone colours; nothing looks unreadable in either mode.

- [ ] **Step 3: Verify print still forces light regardless of OS theme**

With the OS/browser set to dark mode, use the browser's print preview (or devtools' "Emulate CSS media type: print" alongside "prefers-color-scheme: dark") on the page containing the maps. Confirm the map still renders with the light palette (white background, dark strokes/text) rather than dark.

- [ ] **Step 4: Confirm no stray white/dark seams around the maps**

In dark mode, check that the area around each map (where the dimension lines/labels extend beyond the table rect) matches the page's dark background rather than showing a white box — this is the effect of removing `figure`'s forced white background in Chunk 3.

No commit for this chunk — verification only. If any check fails, fix the relevant chunk's code and re-run.
