import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inchesToMm, computeViewBox } from './geometry.js';

test('inchesToMm converts inches to millimetres', () => {
  assert.equal(inchesToMm(1), 25.4);
  assert.equal(inchesToMm(44), 1117.6);
  assert.equal(inchesToMm(0), 0);
});

test('computeViewBox sizes the viewBox to the table plus margin on every side', () => {
  const viewBox = computeViewBox({ width: 44, height: 30 }, 15);

  assert.equal(viewBox.tableWidthMm, 1117.6);
  assert.equal(viewBox.tableHeightMm, 762);
  assert.equal(viewBox.minX, -15);
  assert.equal(viewBox.minY, -15);
  assert.equal(viewBox.width, 1117.6 + 30);
  assert.equal(viewBox.height, 762 + 30);
});
