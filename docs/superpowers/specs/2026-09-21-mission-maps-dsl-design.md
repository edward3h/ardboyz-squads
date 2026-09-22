# Mission Maps as Data — Design

## Problem

Mission maps are currently hand-drawn in Inkscape (`static/squads_layout_inkscape.svg`), covering only one map. `missions.md` lists five missions, each currently saying "Maps _WIP_", and the table size for games is not yet decided. Hand-editing SVG in Inkscape makes it slow to try different table sizes or add maps for the remaining four missions.

## Goal

Define mission maps as data, and generate their SVGs at build time, so that:

- Table size can be changed by editing numbers, not redrawing shapes.
- Adding a map for a new mission means adding a data entry, not drawing from scratch.
- The generated maps visually match the conventions of the existing hand-drawn map (table outline, coloured deployment bands, dimension arrows with inch labels).

## Data format

A single YAML file, `maps/missions.yaml`, holds every mission's map definition. One file (not one per mission) because the user wants all map definitions kept together, and because table size — the main thing still being tuned — is then a single place to change.

Table size is the same for every mission (one game, one table), so it's a single top-level field. Deployment zones and objectives differ per mission, so those stay per-mission.

### Schema

```yaml
table:
  width: <number>              # inches
  height: <number>             # inches

colors:
  a: <string>                   # CSS color for side a's deployment zone
  b: <string>                   # CSS color for side b's deployment zone

missions:
  <mission-key>:                # e.g. point-assault — used for the output filename
    title: <string>              # display name, informational only
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

- Units are inches throughout, matching the prose in `missions.md` (e.g. "44 inch table", "5 inch deployment zone"). The renderer uses these numbers directly as the SVG's `viewBox` units, with no conversion to mm — these maps are representative diagrams, not scaled physical drawings, so there's no need to model a real-world unit like the hand-drawn original did.
- `side: a` / `side: b` replace "home"/"enemy" terminology for deployment zones, because home/enemy are player-relative (they swap depending who's reading), while the physical map is not. Each side's colour is looked up from the top-level `colors` map by `side`, rather than hardcoded in the renderer. `maps/missions.yaml` is initially set to the existing hand-drawn file's values, `a` → `#afc6e9` (light blue), `b` → `#e9afaf` (light red), and can be edited in the YAML without touching code.
- Only rectangular deployment zones are supported in this pass. Corner/diagonal (polygon) zones are out of scope — if a future mission needs one, extend the schema then.
- Deployment zone rects only need to fit within the table (`0 <= x`, `0 <= y`, `x + width <= table.width`, `y + height <= table.height`) — they don't have to touch an edge. A zone that does span the table's full width or height and touch one edge (as in the existing map's top/bottom bands) gets a depth dimension line drawn for it (e.g. `5"`), since that's the one case with a single well-defined "depth" to measure; a zone that doesn't (e.g. a corner zone) is still valid data, it's just drawn without a depth annotation.
- Objectives are plain `{x, y}` position markers, no label or role. The renderer draws every objective as a circle of one fixed radius: **3 inches**, a new convention (the existing hand-drawn file has no objective markers to inherit from — this schema introduces them).
- Objective positions get dimension measurements too, but only the minimum needed to convey positioning without clutter: an objective centered in an axis (relative to the table) gets no measurement in that axis, since a player can see it's centered; and when several objectives are the same distance from their nearest edge in an axis, only the first one is labelled — the rest can be read off it.
- Dimension arrows/labels (table width, table height, deployment zone depth) are **not** separately authored — the renderer derives them from the rect coordinates, same as the hand-drawn original shows "44"", "30"", "5"" next to the shapes they measure.

### Mission keys

The five mission keys, matching `missions.md`'s headings 1:1 in the same order:

| key | heading |
| --- | --- |
| `point-assault` | 1. Point Assault |
| `forward-push` | 2. Forward Push |
| `retrieval` | 3. Retrieval |
| `confrontation` | 4. Confrontation |
| `conquest` | 5. Conquest |

## Renderer

`maps/render.js`, a Node script using `js-yaml` (new dependency — first `package.json` in this repo) to parse `maps/missions.yaml`, and hand-built SVG string templates (no SVG library needed — the shapes involved are just rects, lines with arrow markers, circles, and text).

The Node version is pinned via `mise` (`.mise.toml`, `node = "22"`) — this is the first tool requirement the repo has had, so it's now declared explicitly rather than relying on whatever `node` happens to be on `PATH`.

Unlike the existing hand-drawn file (a fixed US-Letter print page, `width="11in" height="8.5in"`, with the table scaled to fit inside it), each generated SVG's `viewBox` — and its `width`/`height` — scale to the shared table size plus a fixed margin (enough to fit the dimension arrows and labels, e.g. 0.6 units on each side that has a label). This is a deliberate deviation from the original: these maps are shown via `<img>` in a web page, not printed to a fixed page. Since table size is shared, every mission's SVG ends up the same overall size, which also keeps them visually consistent side by side.

For each mission entry:

1. Compute the SVG `viewBox` as the shared table's width/height plus the fixed margin described above (the same for every mission).
2. Draw the table outline (white rect, black stroke).
3. Draw each deployment zone rect, coloured by looking up its `side` in the top-level `colors` map.
4. Draw dimension arrows + inch labels for table width, table height, and each deployment zone's depth, matching the existing file's marker/arrow/font conventions (Arial, small font-size, `ConcaveTriangle` arrowheads).
5. Draw each objective as a circle at the fixed 3" radius, no text.
6. Write the result to `static/maps/<mission-key>.svg`.

### Validation / error handling

Before rendering, the script validates the top-level `table` (has `width`/`height`), the top-level `colors` map (has an entry for every `side` used anywhere in `missions`), and that each mission entry has at least one `deployment` zone. A missing/malformed field throws and exits non-zero — the build should fail loudly rather than emit a broken or blank SVG. This matches `build.ab`'s existing pattern of exiting on pandoc failure.

## Build integration

`build.ab` gains a step before the pandoc call:

```
$ node maps/render.js $ failed {
    echo("Error rendering mission maps")
    exit(1)
}
```

Generated SVGs land in `static/maps/<mission-key>.svg` and are committed to the repo (same convention as the existing `static/squads_layout_inkscape.svg` and `static/style.css`).

`missions.md` gets a Markdown image under each mission heading, replacing "Maps _WIP_":

```markdown
![Point Assault map](static/maps/point-assault.svg)
```

## Out of scope

- Client-side/in-browser rendering (build-time only for now).
- Polygon or corner/diagonal deployment zones (rectangles only).
- Per-objective marker styling (radius, colour, labels) — objectives stay a single fixed style, unlike deployment zone colours which are configurable.
- Per-mission table size overrides (table size is shared across all missions in this pass).

## Testing / verification

No automated test framework exists in this repo. Verification is visual: run the renderer, open the generated SVGs, and compare the `point-assault` map's proportions (44"×30" table, 5" deployment bands) against the existing hand-drawn `static/squads_layout_inkscape.svg` as a sanity check that scale and conventions match.
