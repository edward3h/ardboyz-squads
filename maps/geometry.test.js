import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeViewBox, deploymentZoneEdge, rectWithinTable, objectiveMeasurements } from './geometry.js';

test('computeViewBox sizes the viewBox to the table plus margin on every side', () => {
  const viewBox = computeViewBox({ width: 44, height: 30 }, 0.6);

  assert.equal(viewBox.minX, -0.6);
  assert.equal(viewBox.minY, -0.6);
  assert.equal(viewBox.width, 44 + 1.2);
  assert.equal(viewBox.height, 30 + 1.2);
});

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

test('deploymentZoneEdge returns null for a zone not flush against any edge', () => {
  const result = deploymentZoneEdge({ x: 10, y: 10, width: 5, height: 5 }, table);
  assert.equal(result, null);
});

test('rectWithinTable accepts a zone fully inside the table', () => {
  assert.equal(rectWithinTable({ x: 10, y: 10, width: 5, height: 5 }, table), true);
});

test('rectWithinTable accepts a zone flush against an edge', () => {
  assert.equal(rectWithinTable({ x: 0, y: 0, width: 44, height: 5 }, table), true);
});

test('rectWithinTable rejects a zone extending past the right edge', () => {
  assert.equal(rectWithinTable({ x: 40, y: 0, width: 10, height: 5 }, table), false);
});

test('rectWithinTable rejects a zone extending past the bottom edge', () => {
  assert.equal(rectWithinTable({ x: 0, y: 28, width: 5, height: 5 }, table), false);
});

test('rectWithinTable rejects a zone with negative x or y', () => {
  assert.equal(rectWithinTable({ x: -1, y: 0, width: 5, height: 5 }, table), false);
  assert.equal(rectWithinTable({ x: 0, y: -1, width: 5, height: 5 }, table), false);
});

test('objectiveMeasurements omits a measurement for an objective centered in that axis', () => {
  const result = objectiveMeasurements([{ x: 22, y: 15 }], table);
  assert.equal(result.x[0], null);
  assert.equal(result.y[0], null);
});

test('objectiveMeasurements measures from the nearer edge', () => {
  const result = objectiveMeasurements([{ x: 10, y: 5 }], table);
  assert.deepEqual(result.x[0], { distance: 10, edge: 'start' });
  assert.deepEqual(result.y[0], { distance: 5, edge: 'start' });
});

test('objectiveMeasurements measures from the end edge when closer', () => {
  const result = objectiveMeasurements([{ x: 40, y: 27 }], table);
  assert.deepEqual(result.x[0], { distance: 4, edge: 'end' });
  assert.deepEqual(result.y[0], { distance: 3, edge: 'end' });
});

test('objectiveMeasurements only labels the first of several objectives at the same distance in an axis', () => {
  // y=5 is 5" from the top, y=25 is 5" from the bottom — same distance.
  const result = objectiveMeasurements([{ x: 22, y: 5 }, { x: 22, y: 25 }], table);
  assert.deepEqual(result.y[0], { distance: 5, edge: 'start' });
  assert.equal(result.y[1], null);
});

test('objectiveMeasurements labels each objective once distances differ', () => {
  const result = objectiveMeasurements([{ x: 5, y: 15 }, { x: 10, y: 15 }], table);
  assert.deepEqual(result.x[0], { distance: 5, edge: 'start' });
  assert.deepEqual(result.x[1], { distance: 10, edge: 'start' });
});
