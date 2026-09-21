# Mission Maps as Data — Design

## Problem

Mission maps are currently hand-drawn in Inkscape (`static/squads_layout_inkscape.svg`), covering only one map. `missions.md` lists five missions, each currently saying "Maps _WIP_", and the table size for games is not yet decided. Hand-editing SVG in Inkscape makes it slow to try different table sizes or add maps for the remaining four missions.

## Goal

Define mission maps as data, and generate their SVGs at build time, so that:

- Table size can be changed by editing numbers, not redrawing shapes.
- Adding a map for a new mission means adding a data entry, not drawing from scratch.
- The generated maps visually match the conventions of the existing hand-drawn map (table outline, coloured deployment bands, dimension arrows with inch labels).

## Data format

A single YAML file, `maps/missions.yaml`, holds every mission's map definition. One file (not one per mission) because the user wants all map definitions kept together, and because table size — the main thing still being tuned — is then a single place to search-and-replace across missions.

Board size and deployment zones vary per mission (some missions may use different deployment shapes), so each mission entry is self-contained: it repeats its own table size and deployment zones rather than inheriting shared ones. This is intentional duplication, not an oversight — no cross-mission inheritance is introduced in this pass.

### Schema

```yaml
missions:
  <mission-key>:                # e.g. point-assault — used for the output filename
    title: <string>              # display name, informational only
    table:
      width: <number>            # inches
      height: <number>           # inches
    deployment:
      - side: a | b               # neutral physical-position label, not home/enemy
        rect: {x, y, width, height}  # inches, relative to table origin (top-left)
      - side: a | b
        rect: {x, y, width, height}
    objectives:
      - {x, y}                    # inches; unlabelled position markers only
      - {x, y}
```

Notes:

- Units are inches throughout, matching the prose in `missions.md` (e.g. "44 inch table", "5 inch deployment zone"). The renderer converts to mm internally for the SVG viewBox, matching the existing hand-drawn file's convention (`viewBox` in mm, `width`/`height` in inches).
- `side: a` / `side: b` replace "home"/"enemy" terminology for deployment zones, because home/enemy are player-relative (they swap depending who's reading), while the physical map is not. `side` drives a fixed colour mapping (e.g. `a` → blue, `b` → red) so authors don't pick colours per mission.
- Only rectangular deployment zones are supported in this pass. Corner/diagonal (polygon) zones are out of scope — if a future mission needs one, extend the schema then.
- Objectives are plain `{x, y}` position markers, no label or role. The renderer draws every objective as a circle of one fixed radius (a constant in the renderer, not per-objective data).
- Dimension arrows/labels (table width, table height, deployment zone depth) are **not** separately authored — the renderer derives them from the rect coordinates, same as the hand-drawn original shows "44"", "30"", "5"" next to the shapes they measure.

## Renderer

`maps/render.js`, a Node script using `js-yaml` (new dependency — first `package.json` in this repo) to parse `maps/missions.yaml`, and hand-built SVG string templates (no SVG library needed — the shapes involved are just rects, lines with arrow markers, circles, and text).

For each mission entry:

1. Compute an SVG `viewBox` in mm sized to the table plus a margin for dimension arrows and labels (mirrors the existing hand-drawn file's layout).
2. Draw the table outline (white rect, black stroke).
3. Draw each deployment zone rect, coloured by `side`.
4. Draw dimension arrows + inch labels for table width, table height, and each deployment zone's depth, matching the existing file's marker/arrow/font conventions (Arial, small font-size, `ConcaveTriangle` arrowheads).
5. Draw each objective as a circle at fixed radius, no text.
6. Write the result to `static/maps/<mission-key>.svg`.

### Validation / error handling

Before rendering, the script validates each mission entry has a `table` (with `width`/`height`) and at least one `deployment` zone. A missing/malformed field throws and exits non-zero — the build should fail loudly rather than emit a broken or blank SVG. This matches `build.ab`'s existing pattern of exiting on pandoc failure.

## Build integration

`build.ab` gains a step before the pandoc call:

```
$ node maps/render.js $ failed {
    echo("Error rendering mission maps")
    exit(1)
}
```

Generated SVGs land in `static/maps/<mission-key>.svg` and are committed to the repo (same convention as the existing `static/squads_layout_inkscape.svg` and `static/style.css`).

`missions.md` gets an `<img>` tag under each mission heading, replacing "Maps _WIP_":

```markdown
<img src="static/maps/point-assault.svg" alt="Point Assault map" />
```

## Out of scope

- Client-side/in-browser rendering (build-time only for now).
- Polygon or corner/diagonal deployment zones (rectangles only).
- Per-objective marker styling (radius, colour, labels).
- Shared/inherited table config across missions (each mission entry is self-contained).

## Testing / verification

No automated test framework exists in this repo. Verification is visual: run the renderer, open the generated SVGs, and compare the `point-assault` map's proportions (44"×30" table, 5" deployment bands) against the existing hand-drawn `static/squads_layout_inkscape.svg` as a sanity check that scale and conventions match.
