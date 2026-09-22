export function computeViewBox(table, margin) {
  return {
    minX: -margin,
    minY: -margin,
    width: table.width + margin * 2,
    height: table.height + margin * 2,
  };
}

// A deployment zone is only required to fit within the table — it doesn't
// have to touch an edge. This checks that containment.
export function rectWithinTable(rect, table) {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= table.width &&
    rect.y + rect.height <= table.height
  );
}

// Used only for rendering: a zone that happens to span the table's full
// width or height and touch one edge gets a depth dimension line drawn for
// it. A zone that doesn't (e.g. a corner zone) has no single "depth" to
// measure this way, so this returns null rather than treating it as invalid
// — validity is rectWithinTable's job, not this function's.
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
  return null;
}

// Decides which objectives get a dimension measurement in each axis, to
// keep the diagram uncluttered: a centered objective needs no measurement
// in that axis (players can see it's centered), and when several
// objectives are the same distance from their nearest edge in an axis,
// only the first one needs it labelled — the rest can be read off it.
// Returns { x: [...], y: [...] }, one entry per objective (in the same
// order as `objectives`), each either null (no measurement needed) or
// { distance, edge: 'start' | 'end' } (edge is which side — x/y 0 or the
// table's width/height — the distance is measured from).
export function objectiveMeasurements(objectives, table) {
  return {
    x: axisMeasurements(objectives.map((o) => o.x), table.width),
    y: axisMeasurements(objectives.map((o) => o.y), table.height),
  };
}

function axisMeasurements(positions, length) {
  const seenDistances = new Set();
  return positions.map((position) => {
    if (position === length / 2) {
      return null;
    }
    const distanceFromStart = position;
    const distanceFromEnd = length - position;
    const edge = distanceFromStart <= distanceFromEnd ? 'start' : 'end';
    const distance = edge === 'start' ? distanceFromStart : distanceFromEnd;
    if (seenDistances.has(distance)) {
      return null;
    }
    seenDistances.add(distance);
    return { distance, edge };
  });
}
