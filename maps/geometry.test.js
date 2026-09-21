import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inchesToMm } from './geometry.js';

test('inchesToMm converts inches to millimetres', () => {
  assert.equal(inchesToMm(1), 25.4);
  assert.equal(inchesToMm(44), 1117.6);
  assert.equal(inchesToMm(0), 0);
});
