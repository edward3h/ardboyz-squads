export function computeViewBox(table, margin) {
  return {
    minX: -margin,
    minY: -margin,
    width: table.width + margin * 2,
    height: table.height + margin * 2,
  };
}

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
