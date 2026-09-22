# Mission map dark/light mode

## Problem

The main page (`static/style.css`) already switches between light and dark
colour schemes via CSS custom properties and `light-dark()`, following the
viewer's OS preference. The mission map SVGs (`static/maps/*.svg`, generated
by `maps/render.js`) do not: they're hardcoded to a white background, black
strokes/text, grey objective markers, and fixed light-blue/light-red
deployment zones. In dark mode the maps sit as bright white rectangles on
the dark page. The wrapping `figure` element in `static/style.css` also
forces a white background regardless of theme.

## Constraint

The maps are embedded via Markdown image syntax (`![...](maps/x.svg)`),
which pandoc renders as `<img>`, not inlined SVG. An `<img>`-referenced SVG
is its own document and cannot read the host page's CSS custom properties —
it can only respond to browser-evaluated media features such as
`prefers-color-scheme` and `print`, using colours defined inside its own
`<style>` block.

## Design

Each generated SVG gets an embedded `<style>` block with three rule sets,
applied in this order so `print` always wins:

1. Default (light) values.
2. `@media (prefers-color-scheme: dark)` overrides.
3. `@media print` overrides, reasserting the light values — mirrors the
   existing `@media print { :root { ... } }` block in `static/style.css`,
   which forces light colours for print regardless of OS theme.

Classes and colours (light → dark), chosen to reuse the same literal values
as the page's `--main-bg-color` / `--main-color` custom properties so the
map blends with the page in both themes:

| Class | Light | Dark | Notes |
|---|---|---|---|
| `.table-bg` | `#ffffff` | `#111122` | matches `--main-bg-color` |
| `.dim` (stroke) | `#111122` | `#eeeeee` | matches `--main-color`; arrow markers use `fill:context-stroke` so they follow this automatically |
| `.dim-text` (fill) | `#111122` | `#eeeeee` | matches `--main-color` |
| `.objective` | `#cccccc` | `#555577` | distinct from both the dark background and the zone colours |
| `.zone-<side>` | per-side `light` | per-side `dark` | see below |

The literal hex values are not read from `static/style.css` at build time —
there's no shared source between the CSS file and the Node SVG generator —
so they're duplicated as constants in `maps/svg-template.js` with a comment
pointing back to `static/style.css` to keep them in sync by hand.

### Zone colours

`missions.yaml`'s `colors:` block changes from plain hex strings to
`{light, dark}` objects, since the existing blue/red brand colours need
muted counterparts for contrast against a dark background:

```yaml
colors:
  a:
    light: "#afc6e9"
    dark: "#3a4f70"
  b:
    light: "#e9afaf"
    dark: "#704a4a"
```

`maps/validate.js` is updated to require both `light` and `dark` string
values for every colour entry used by a mission.

### Rendering

`maps/svg-template.js` gains a helper that emits the `<style>` block from a
colours map (so it isn't hardcoded to sides `a`/`b`), and the existing
shape/text helpers (`svgRect`, `svgCircle`, `horizontalDimension`,
`verticalDimension`) take a CSS class name instead of a literal colour.
`maps/mission-svg.js` is updated to pass classes (`table-bg`, `dim`,
`dim-text`, `objective`, `zone-<side>`) instead of hex strings.

### Page CSS

`static/style.css`'s `figure { background-color: white; }` is removed. The
SVG's own `.table-bg` rect now themes itself; the only remaining unfilled
area is the margin around it (where dimension lines/labels are drawn), and
that should just show the page's own background through, which happens
automatically once the hardcoded white is gone (the `figure` element has no
background of its own, so the body's already-themed background shows
through).

## Non-goals

- No change to zone/table geometry, layout, or the mission DSL beyond the
  colour schema.
- No change to how maps are embedded in `missions.md` (stays Markdown
  image syntax).

## Testing

- `maps/validate.test.js`: update the fixture to the new `{light, dark}`
  colour shape; add a case rejecting a colour entry missing `dark`.
- Regenerate all 5 SVGs (`node maps/render.js`) and visually check them in
  both light and dark OS modes, and confirm nothing changes when printed
  (or previewed with print emulation) even under a dark OS theme.
