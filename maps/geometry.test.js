import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeViewBox, deploymentZoneEdge } from './geometry.js';

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

test('deploymentZoneEdge throws for a zone not flush against any edge', () => {
  assert.throws(
    () => deploymentZoneEdge({ x: 10, y: 10, width: 5, height: 5 }, table),
    /not flush against any table edge/,
  );
});
