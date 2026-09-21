import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateData } from './validate.js';

function validData() {
  return {
    table: { width: 44, height: 30 },
    colors: { a: '#afc6e9', b: '#e9afaf' },
    missions: {
      'point-assault': {
        title: 'Point Assault',
        deployment: [
          { side: 'a', rect: { x: 0, y: 0, width: 44, height: 5 } },
          { side: 'b', rect: { x: 0, y: 25, width: 44, height: 5 } },
        ],
        objectives: [{ x: 22, y: 15 }],
      },
    },
  };
}

test('validateData accepts well-formed data', () => {
  assert.doesNotThrow(() => validateData(validData()));
});

test('validateData rejects a missing table', () => {
  const data = validData();
  delete data.table;
  assert.throws(() => validateData(data), /table.*width.*height/i);
});

test('validateData rejects a non-numeric table dimension', () => {
  const data = validData();
  data.table.width = '44';
  assert.throws(() => validateData(data), /table.*width.*height/i);
});

test('validateData rejects a side used in missions with no color entry', () => {
  const data = validData();
  delete data.colors.b;
  assert.throws(() => validateData(data), /no color defined for side "b"/i);
});

test('validateData rejects a mission with no deployment zones', () => {
  const data = validData();
  data.missions['point-assault'].deployment = [];
  assert.throws(() => validateData(data), /point-assault.*deployment zone/i);
});

test('validateData rejects a deployment zone with an invalid side', () => {
  const data = validData();
  data.missions['point-assault'].deployment[0].side = 'c';
  assert.throws(() => validateData(data), /invalid side "c"/i);
});

test('validateData rejects a deployment zone rect missing a field', () => {
  const data = validData();
  delete data.missions['point-assault'].deployment[0].rect.width;
  assert.throws(() => validateData(data), /rect must have numeric/i);
});

test('validateData rejects a deployment zone not flush against any table edge', () => {
  const data = validData();
  data.missions['point-assault'].deployment[0].rect = { x: 10, y: 10, width: 5, height: 5 };
  assert.throws(() => validateData(data), /point-assault.*invalid deployment zone/i);
});

test('validateData rejects an objective with non-numeric coordinates', () => {
  const data = validData();
  data.missions['point-assault'].objectives[0].x = 'twenty-two';
  assert.throws(() => validateData(data), /objective with non-numeric coordinates/i);
});
