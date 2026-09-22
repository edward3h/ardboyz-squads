import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeViewBox, deploymentZoneEdge, rectWithinTable } from './geometry.js';

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
