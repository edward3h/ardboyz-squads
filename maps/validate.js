import { rectWithinTable } from './geometry.js';

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
      if (!rectWithinTable(zone.rect, table)) {
        throw new Error(`Mission "${key}" has a deployment zone that extends outside the table`);
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
