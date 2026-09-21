# Mission Maps as Data Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-drawn Inkscape mission map with a YAML data file and a Node build-time script that renders one SVG per mission into `static/maps/`, wired into `build.ab` and referenced from `src/markdown/missions.md`.

**Architecture:** A single `maps/missions.yaml` holds a shared table size, a shared side-colour map, and per-mission deployment zones (rectangles) and objective markers (plain points). `maps/render.js` reads and validates that file, then for each mission builds an SVG string (table outline, coloured deployment zones, derived dimension arrows/labels, objective circles) via small pure helper modules, and writes it to `static/maps/<mission-key>.svg`. `build.ab` runs the renderer before pandoc. Pure logic (unit conversion, viewBox sizing, deployment-edge/depth derivation, data validation) is unit-tested with Node's built-in test runner; SVG string assembly and the end-to-end build are verified by running the script and eyeballing output, per the spec's testing section.

**Tech Stack:** Node 22 (pinned via `.mise.toml`, already committed), `js-yaml` for parsing, Node's built-in `node:test`/`node:assert` for unit tests (no new test framework dependency), ESM modules (`"type": "module"`), `amber` (Homebrew-installed) to execute the existing `build.ab` script.

**Spec:** `docs/superpowers/specs/2026-09-21-mission-maps-dsl-design.md` — read this first for the full rationale behind every decision below (side a/b naming, unlabelled fixed-radius objectives, shared table size, colours in YAML, viewBox-scales-to-table, etc). This plan implements that spec; it doesn't re-decide anything from it.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | Project manifest: `js-yaml` dependency, `build:maps`/`test` scripts, `"type": "module"` |
| `.gitignore` | Add `node_modules/` |
| `maps/missions.yaml` | The data: shared `table`, shared `colors`, five `missions` entries (deployment zones + objectives) |
| `maps/geometry.js` | Pure functions: inches→mm conversion, viewBox sizing, deployment zone edge/depth derivation |
| `maps/geometry.test.js` | Unit tests for `geometry.js` |
| `maps/validate.js` | Pure function: validates the parsed YAML shape, throws with a clear message on any problem |
| `maps/validate.test.js` | Unit tests for `validate.js` |
| `maps/svg-template.js` | Pure functions: SVG string builders for rects, circles, text, dimension arrows, and the arrowhead marker `<defs>` |
| `maps/mission-svg.js` | Combines `geometry.js` + `svg-template.js` into one full mission SVG document string |
| `maps/render.js` | Entry point: reads `missions.yaml`, validates, loops missions, writes `static/maps/<key>.svg` |
| `build.ab` | Modify: run `node maps/render.js` before the pandoc step |
| `src/markdown/missions.md` | Modify: add an `<img>` under each mission heading, drop the "Maps _WIP_." line |

`geometry.js` and `validate.js` are pure (no file I/O, no SVG string concerns) so they're the ones worth unit testing in isolation — this is where bugs in the actual logic (wrong mm conversion, wrong edge detection, a validation gap) would hide. `svg-template.js` and `mission-svg.js` are string assembly with no interesting branching to unit test; they're verified by running the renderer and looking at the output, per the spec's testing section. `render.js` is I/O glue, also verified by running it.

---

## Chunk 1: Project setup and data

### Task 1: Initialize the Node project

**Files:**
- Create: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Confirm mise is using the pinned Node version**

Run: `mise install && mise exec -- node --version`
Expected: prints a `v22.x.x` version (matches `.mise.toml`'s `node = "22"`, already committed on this branch).

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "ardboyz-squads-maps",
  "private": true,
  "type": "module",
  "scripts": {
    "build:maps": "node maps/render.js",
    "test": "node --test maps/"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `mise exec -- npm install`
Expected: creates `node_modules/` and `package-lock.json`, no errors.

- [ ] **Step 4: Add `node_modules/` to `.gitignore`**

Current `.gitignore` contains only `index.html`. Add a line so it reads:

```
index.html
node_modules/
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "Add Node project for mission map renderer

Sets up package.json with js-yaml as a dependency and build:maps/test
scripts, ready for the map data and renderer scripts."
```

---

### Task 2: Write the map data file

**Files:**
- Create: `maps/missions.yaml`

This reuses the existing hand-drawn map's numbers (44"×30" table, 5" deployment bands) as the shared table size and as `point-assault`'s deployment zones, per the spec. The other four missions' deployment zones and objective positions are illustrative placeholder data — the whole point of this feature is that they're now trivial to adjust in one file, not something this plan needs to finalize as game design.

- [ ] **Step 1: Write `maps/missions.yaml`**

```yaml
# Mission map data. Table size and colors are shared across all
# missions (see docs/superpowers/specs/2026-09-21-mission-maps-dsl-design.md).
# Deployment zones and objectives are placeholder/illustrative — adjust freely.

table:
  width: 44 # inches
  height: 30 # inches

colors:
  a: "#afc6e9" # light blue, matches the original hand-drawn map
  b: "#e9afaf" # light red, matches the original hand-drawn map

missions:
  point-assault:
    title: Point Assault
    deployment:
      - side: a
        rect: { x: 0, y: 0, width: 44, height: 5 }
      - side: b
        rect: { x: 0, y: 25, width: 44, height: 5 }
    objectives:
      - { x: 22, y: 5 }
      - { x: 22, y: 15 }
      - { x: 22, y: 25 }

  forward-push:
    title: Forward Push
    deployment:
      - side: a
        rect: { x: 0, y: 0, width: 44, height: 5 }
      - side: b
        rect: { x: 0, y: 25, width: 44, height: 5 }
    objectives:
      - { x: 22, y: 5 }
      - { x: 22, y: 15 }
      - { x: 22, y: 25 }

  retrieval:
    title: Retrieval
    deployment:
      - side: a
        rect: { x: 0, y: 0, width: 44, height: 5 }
      - side: b
        rect: { x: 0, y: 25, width: 44, height: 5 }
    objectives:
      - { x: 11, y: 15 }
      - { x: 22, y: 15 }
      - { x: 33, y: 15 }

  confrontation:
    title: Confrontation
    deployment:
      - side: a
        rect: { x: 0, y: 0, width: 44, height: 5 }
      - side: b
        rect: { x: 0, y: 25, width: 44, height: 5 }
    objectives:
      - { x: 22, y: 5 }
      - { x: 22, y: 25 }

  conquest:
    title: Conquest
    deployment:
      - side: a
        rect: { x: 0, y: 0, width: 44, height: 5 }
      - side: b
        rect: { x: 0, y: 25, width: 44, height: 5 }
    objectives:
      - { x: 11, y: 10 }
      - { x: 33, y: 10 }
      - { x: 11, y: 20 }
      - { x: 33, y: 20 }
```

- [ ] **Step 2: Commit**

```bash
git add maps/missions.yaml
git commit -m "Add mission map data

Shared 44x30 table and side a/b colors, plus deployment zones and
objective positions for all five missions. Deployment/objectives are
illustrative placeholders, easy to tune now that they're data."
```

---

## Chunk 2: Geometry and validation (TDD)

### Task 3: `geometry.js` — unit conversion

**Files:**
- Create: `maps/geometry.js`
- Test: `maps/geometry.test.js`

- [ ] **Step 1: Write the failing test**

Create `maps/geometry.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inchesToMm } from './geometry.js';

test('inchesToMm converts inches to millimetres', () => {
  assert.equal(inchesToMm(1), 25.4);
  assert.equal(inchesToMm(44), 1117.6);
  assert.equal(inchesToMm(0), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mise exec -- node --test maps/geometry.test.js`
Expected: FAIL — `geometry.js` doesn't exist yet (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `maps/geometry.js`:

```js
export const IN_TO_MM = 25.4;

export function inchesToMm(inches) {
  return inches * IN_TO_MM;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `mise exec -- node --test maps/geometry.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add maps/geometry.js maps/geometry.test.js
git commit -m "Add inches-to-mm conversion helper"
```

---

### Task 4: `geometry.js` — viewBox sizing

**Files:**
- Modify: `maps/geometry.js`
- Modify: `maps/geometry.test.js`

Per the spec, each mission's SVG `viewBox` is the shared table size (converted to mm) plus a fixed margin on every side, wide enough for the dimension arrows and labels. This plan fixes that margin at 15mm.

- [ ] **Step 1: Write the failing test**

Add to `maps/geometry.test.js`:

```js
import { computeViewBox } from './geometry.js';

test('computeViewBox sizes the viewBox to the table plus margin on every side', () => {
  const viewBox = computeViewBox({ width: 44, height: 30 }, 15);

  assert.equal(viewBox.tableWidthMm, 1117.6);
  assert.equal(viewBox.tableHeightMm, 762);
  assert.equal(viewBox.minX, -15);
  assert.equal(viewBox.minY, -15);
  assert.equal(viewBox.width, 1117.6 + 30);
  assert.equal(viewBox.height, 762 + 30);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mise exec -- node --test maps/geometry.test.js`
Expected: FAIL — `computeViewBox` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `maps/geometry.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `mise exec -- node --test maps/geometry.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add maps/geometry.js maps/geometry.test.js
git commit -m "Add viewBox sizing to geometry helpers"
```

---

### Task 5: `geometry.js` — deployment zone edge/depth

**Files:**
- Modify: `maps/geometry.js`
- Modify: `maps/geometry.test.js`

Per the spec, a deployment zone rect is assumed flush against one table edge; its "depth" (the dimension the renderer labels) is its extent perpendicular to that edge. A zone spanning the table's full height (a left/right-edge band) always also satisfies `y === 0` and `y + height === table.height`, so top/bottom cannot be checked first without misclassifying it — this plan requires deployment zones to span the table's full width (top/bottom zones) or full height (left/right zones), matching every example in the spec and in `missions.yaml`, and uses that to disambiguate: check which full dimension the rect spans first, then which of that pair of edges it touches. This needs a test per edge, plus the not-flush error case.

- [ ] **Step 1: Write the failing tests**

Add to `maps/geometry.test.js`:

```js
import { deploymentZoneEdge } from './geometry.js';

const table = { width: 44, height: 30 };

test('deploymentZoneEdge identifies a zone flush against the top edge', () => {
  const result = deploymentZoneEdge({ x: 0, y: 0, width: 44, height: 5 }, table);
  assert.deepEqual(result, { edge: 'top', depth: 5 });
});

test('deploymentZoneEdge identifies a zone flush against the bottom edge', () => {
  const result = deploymentZoneEdge({ x: 0, y: 25, width: 44, height: 5 }, table);
  assert.deepEqual(result, { edge: 'bottom', depth: 5 });
});

test('deploymentZoneEdge identifies a zone flush against the left edge', () => {
  const result = deploymentZoneEdge({ x: 0, y: 0, width: 5, height: 30 }, table);
  assert.deepEqual(result, { edge: 'left', depth: 5 });
});

test('deploymentZoneEdge identifies a zone flush against the right edge', () => {
  const result = deploymentZoneEdge({ x: 39, y: 0, width: 5, height: 30 }, table);
  assert.deepEqual(result, { edge: 'right', depth: 5 });
});

test('deploymentZoneEdge throws for a zone not flush against any edge', () => {
  assert.throws(
    () => deploymentZoneEdge({ x: 10, y: 10, width: 5, height: 5 }, table),
    /not flush against any table edge/,
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `mise exec -- node --test maps/geometry.test.js`
Expected: FAIL — `deploymentZoneEdge` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `maps/geometry.js`:

```js
export function deploymentZoneEdge(rect, table) {
  const spansWidth = rect.width === table.width;
  const spansHeight = rect.height === table.height;

  if (spansWidth && rect.y === 0) {
    return { edge: 'top', depth: rect.height };
  }
  if (spansWidth && rect.y + rect.height === table.height) {
    return { edge: 'bottom', depth: rect.height };
  }
  if (spansHeight && rect.x === 0) {
    return { edge: 'left', depth: rect.width };
  }
  if (spansHeight && rect.x + rect.width === table.width) {
    return { edge: 'right', depth: rect.width };
  }
  throw new Error(
    `Deployment zone rect ${JSON.stringify(rect)} is not flush against any table edge ` +
      `(zones must span the table's full width or full height)`,
  );
}
```

Note: a rect spanning both the full width and full height (i.e. the whole table) would match the first branch and be classified `top` — not a realistic deployment zone, so not worth a special case.

- [ ] **Step 4: Run tests to verify they pass**

Run: `mise exec -- node --test maps/geometry.test.js`
Expected: PASS (7 tests total).

- [ ] **Step 5: Commit**

```bash
git add maps/geometry.js maps/geometry.test.js
git commit -m "Add deployment zone edge/depth derivation"
```

---

### Task 6: `validate.js` — data validation

**Files:**
- Create: `maps/validate.js`
- Test: `maps/validate.test.js`

Per the spec: validate the top-level `table`, the top-level `colors` map (has an entry for every `side` used anywhere in `missions`), and that each mission has at least one `deployment` zone. Throw with a clear message on any problem. This also reuses `deploymentZoneEdge` from Task 5 to reject a deployment zone that isn't flush against a table edge at validation time — the same rule the renderer needs later (Task 8), caught here with a mission-scoped error message instead of a generic crash mid-render.

- [ ] **Step 1: Write the failing tests**

Create `maps/validate.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateData } from './validate.js';

function validData() {
  return {
    table: { width: 44, height: 30 },
    colors: { a: '#afc6e9', b: '#e9afaf' },
    missions: {
      'point-assault': {
        title: 'Point Assault',
        deployment: [
          { side: 'a', rect: { x: 0, y: 0, width: 44, height: 5 } },
          { side: 'b', rect: { x: 0, y: 25, width: 44, height: 5 } },
        ],
        objectives: [{ x: 22, y: 15 }],
      },
    },
  };
}

test('validateData accepts well-formed data', () => {
  assert.doesNotThrow(() => validateData(validData()));
});

test('validateData rejects a missing table', () => {
  const data = validData();
  delete data.table;
  assert.throws(() => validateData(data), /table.*width.*height/i);
});

test('validateData rejects a non-numeric table dimension', () => {
  const data = validData();
  data.table.width = '44';
  assert.throws(() => validateData(data), /table.*width.*height/i);
});

test('validateData rejects a side used in missions with no color entry', () => {
  const data = validData();
  delete data.colors.b;
  assert.throws(() => validateData(data), /no color defined for side "b"/i);
});

test('validateData rejects a mission with no deployment zones', () => {
  const data = validData();
  data.missions['point-assault'].deployment = [];
  assert.throws(() => validateData(data), /point-assault.*deployment zone/i);
});

test('validateData rejects a deployment zone with an invalid side', () => {
  const data = validData();
  data.missions['point-assault'].deployment[0].side = 'c';
  assert.throws(() => validateData(data), /invalid side "c"/i);
});

test('validateData rejects a deployment zone rect missing a field', () => {
  const data = validData();
  delete data.missions['point-assault'].deployment[0].rect.width;
  assert.throws(() => validateData(data), /rect must have numeric/i);
});

test('validateData rejects a deployment zone not flush against any table edge', () => {
  const data = validData();
  data.missions['point-assault'].deployment[0].rect = { x: 10, y: 10, width: 5, height: 5 };
  assert.throws(() => validateData(data), /point-assault.*invalid deployment zone/i);
});

test('validateData rejects an objective with non-numeric coordinates', () => {
  const data = validData();
  data.missions['point-assault'].objectives[0].x = 'twenty-two';
  assert.throws(() => validateData(data), /objective with non-numeric coordinates/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `mise exec -- node --test maps/validate.test.js`
Expected: FAIL — `validate.js` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `maps/validate.js`:

```js
import { deploymentZoneEdge } from './geometry.js';

export function validateData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Map data must be an object');
  }
  validateTable(data.table);
  validateMissions(data.missions, data.table);
  validateColors(data.colors, data.missions);
  return data;
}

function validateTable(table) {
  if (!table || typeof table.width !== 'number' || typeof table.height !== 'number') {
    throw new Error('Top-level "table" must have numeric width and height');
  }
}

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
    if (!colors[side]) {
      throw new Error(`No color defined for side "${side}"`);
    }
  }
}

function validateMissions(missions, table) {
  if (!missions || typeof missions !== 'object' || Object.keys(missions).length === 0) {
    throw new Error('"missions" must be a non-empty object');
  }
  for (const [key, mission] of Object.entries(missions)) {
    if (!Array.isArray(mission.deployment) || mission.deployment.length === 0) {
      throw new Error(`Mission "${key}" must have at least one deployment zone`);
    }
    for (const zone of mission.deployment) {
      if (zone.side !== 'a' && zone.side !== 'b') {
        throw new Error(`Mission "${key}" has a deployment zone with invalid side "${zone.side}"`);
      }
      requireRect(zone.rect, `Mission "${key}" deployment zone`);
      try {
        deploymentZoneEdge(zone.rect, table);
      } catch (cause) {
        throw new Error(`Mission "${key}" has an invalid deployment zone: ${cause.message}`);
      }
    }
    for (const objective of mission.objectives ?? []) {
      if (typeof objective.x !== 'number' || typeof objective.y !== 'number') {
        throw new Error(`Mission "${key}" has an objective with non-numeric coordinates`);
      }
    }
  }
}

function requireRect(rect, context) {
  const fields = ['x', 'y', 'width', 'height'];
  if (!rect || fields.some((field) => typeof rect[field] !== 'number')) {
    throw new Error(`${context} rect must have numeric x, y, width, height`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `mise exec -- node --test maps/validate.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Run the full test suite**

Run: `mise exec -- npm test`
Expected: PASS (16 tests: 7 from geometry.test.js + 9 from validate.test.js).

- [ ] **Step 6: Commit**

```bash
git add maps/validate.js maps/validate.test.js
git commit -m "Add mission map data validation"
```

---

## Chunk 3: SVG rendering

### Task 7: `svg-template.js` — shape and arrow builders

**Files:**
- Create: `maps/svg-template.js`

String-building helpers only — no branching logic worth unit testing here (per the File Structure notes above); verified visually once wired into the full renderer in Task 8–9.

- [ ] **Step 1: Write `maps/svg-template.js`**

```js
const ARROW_MARKER_ID = 'dim-arrow';
const DIMENSION_FONT_SIZE = 2.1167;
const DIMENSION_STROKE_WIDTH = 0.125;
const SHAPE_STROKE_WIDTH = 0.25;

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

function dimensionText(x, y, label, rotate) {
  const transform = rotate ? ` transform="rotate(-90 ${x} ${y})"` : '';
  return (
    `<text x="${x}" y="${y}" font-family="Arial" font-size="${DIMENSION_FONT_SIZE}" ` +
    `text-anchor="middle"${transform}>${label}</text>`
  );
}

export function horizontalDimension({ x1, x2, y, label }) {
  const line =
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#000000" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  return line + dimensionText((x1 + x2) / 2, y - 1.5, label, false);
}

export function verticalDimension({ y1, y2, x, label }) {
  const line =
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#000000" ` +
    `stroke-width="${DIMENSION_STROKE_WIDTH}" marker-start="url(#${ARROW_MARKER_ID})" ` +
    `marker-end="url(#${ARROW_MARKER_ID})" />`;
  return line + dimensionText(x - 2, (y1 + y2) / 2, label, true);
}
```

- [ ] **Step 2: Commit**

```bash
git add maps/svg-template.js
git commit -m "Add SVG shape and dimension-arrow string builders"
```

---

### Task 8: `mission-svg.js` — full mission document

**Files:**
- Create: `maps/mission-svg.js`

- [ ] **Step 1: Write `maps/mission-svg.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add maps/mission-svg.js
git commit -m "Add full mission SVG document assembly"
```

---

### Task 9: `render.js` — entry point

**Files:**
- Create: `maps/render.js`

- [ ] **Step 1: Write `maps/render.js`**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';
import { validateData } from './validate.js';
import { renderMissionSvg } from './mission-svg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'missions.yaml');
const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'maps');

function main() {
  const raw = readFileSync(DATA_PATH, 'utf8');
  const data = validateData(yaml.load(raw));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [key, mission] of Object.entries(data.missions)) {
    const svg = renderMissionSvg(mission, data.table, data.colors);
    writeFileSync(path.join(OUTPUT_DIR, `${key}.svg`), svg);
    console.log(`Rendered ${key}.svg`);
  }
}

main();
```

- [ ] **Step 2: Run the renderer**

Run: `mise exec -- npm run build:maps`
Expected: prints `Rendered point-assault.svg`, `Rendered forward-push.svg`, `Rendered retrieval.svg`, `Rendered confrontation.svg`, `Rendered conquest.svg`, and creates those 5 files in `static/maps/`.

- [ ] **Step 3: Visually verify one output**

Open `static/maps/point-assault.svg` in a browser or image viewer. Confirm: a white rectangle roughly 44:30 in proportion, a light-blue band across the top, a light-red band across the bottom, three circles down the centre, dimension arrows/labels around the outside reading `44"`, `30"`, and `5"` twice. Compare proportions against `static/squads_layout_inkscape.svg` as a sanity check (per the spec's testing section) — they should look like the same table at the same scale, even though the new file isn't a pixel-identical redraw.

- [ ] **Step 4: Run the full test suite once more**

Run: `mise exec -- npm test`
Expected: PASS (16 tests), confirming the render script didn't require changes to the tested modules.

- [ ] **Step 5: Commit**

```bash
git add maps/render.js static/maps/
git commit -m "Add mission map renderer entry point

Reads maps/missions.yaml, validates it, and writes one SVG per
mission to static/maps/. Includes the first generated output."
```

---

## Chunk 4: Build integration

### Task 10: Wire the renderer into `build.ab`

**Files:**
- Modify: `build.ab`

- [ ] **Step 1: Add the render step before the pandoc call**

In `build.ab`, the `main` block currently starts with:

```
main {
    const files = files()

    $ pandoc -o index.html -c static/style.css -s --toc --toc-depth=2 {files} $ failed {
```

Change it to:

```
main {
    $ node maps/render.js $ failed {
        echo("Error rendering mission maps")
        exit(1)
    }

    const files = files()

    $ pandoc -o index.html -c static/style.css -s --toc --toc-depth=2 {files} $ failed {
```

(Everything after that line is unchanged.)

- [ ] **Step 2: Run the full build**

Run: `amber run build.ab` (the `amber` CLI, installed via Homebrew, is what executes `.ab` scripts in this repo)
Expected: regenerates `static/maps/*.svg`, then regenerates `index.html`, no errors.

- [ ] **Step 3: Commit**

```bash
git add build.ab
git commit -m "Run mission map renderer as part of the build"
```

---

### Task 11: Reference the maps from `missions.md`

**Files:**
- Modify: `src/markdown/missions.md`

- [ ] **Step 1: Remove the "Maps WIP" line and add an `<img>` per mission**

Current top of file:

```markdown
# Missions

Board size _TBD_.
Maps _WIP_.

All missions use Reserves, Seize the Initiative.

## 1. Point Assault
```

Change to:

```markdown
# Missions

Board size _TBD_.

All missions use Reserves, Seize the Initiative.

## 1. Point Assault

<img src="static/maps/point-assault.svg" alt="Point Assault map" />
```

Then add the matching `<img>` tag right after each of the other four mission headings, before their bullet lists:

```markdown
## 2. Forward Push

<img src="static/maps/forward-push.svg" alt="Forward Push map" />
```

```markdown
## 3. Retrieval

<img src="static/maps/retrieval.svg" alt="Retrieval map" />
```

```markdown
## 4. Confrontation

<img src="static/maps/confrontation.svg" alt="Confrontation map" />
```

```markdown
## 5. Conquest

<img src="static/maps/conquest.svg" alt="Conquest map" />
```

- [ ] **Step 2: Rebuild the site**

Run: `amber run build.ab`
Expected: `index.html` regenerates with no errors.

- [ ] **Step 3: Visually verify in a browser**

Open `index.html` in a browser, navigate to the Missions section via the TOC, and confirm all five mission maps render inline, each showing the table outline, coloured deployment zones, dimension labels, and objective circles.

- [ ] **Step 4: Commit**

```bash
git add src/markdown/missions.md
git commit -m "Show mission maps in missions.md

Replaces the 'Maps WIP' placeholder with the generated map for each
of the five missions."
```

---

## Done

At this point: `maps/missions.yaml` is the single source of truth for table size, side colours, and each mission's deployment/objectives; `npm run build:maps` (or the full `build.ab`) regenerates all five SVGs from it; `npm test` covers the geometry and validation logic; and `index.html` shows a map under every mission heading. Adjusting the table size for all missions, or a single mission's deployment zones, is now a YAML edit plus a rebuild — no Inkscape required.
