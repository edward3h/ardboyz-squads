import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeStyleBlock } from './svg-template.js';

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test('themeStyleBlock emits exactly one rule per shared class per mode', () => {
  const block = themeStyleBlock({ a: { light: '#afc6e9', dark: '#3a4f70' } });
  for (const className of ['table-bg', 'dim', 'dim-text', 'objective']) {
    assert.equal(countOccurrences(block, `.${className} {`), 3, `expected one .${className} rule per mode (light, dark, print)`);
  }
});

test('themeStyleBlock generates a zone rule for every side in the given colors, not just a/b', () => {
  const block = themeStyleBlock({
    a: { light: '#afc6e9', dark: '#3a4f70' },
    b: { light: '#e9afaf', dark: '#704a4a' },
    c: { light: '#cccccc', dark: '#333333' },
  });
  for (const side of ['a', 'b', 'c']) {
    assert.equal(countOccurrences(block, `.zone-${side} {`), 3, `expected one .zone-${side} rule per mode (light, dark, print)`);
  }
});

test('themeStyleBlock uses each side\'s light/dark value in the matching mode', () => {
  const block = themeStyleBlock({ a: { light: '#afc6e9', dark: '#3a4f70' } });
  assert.match(block, /\.zone-a \{ fill: #afc6e9; \}/);
  assert.match(block, /\.zone-a \{ fill: #3a4f70; \}/);
});

test('themeStyleBlock reasserts the light values inside @media print, not the dark ones', () => {
  const block = themeStyleBlock({ a: { light: '#afc6e9', dark: '#3a4f70' } });
  const printBlock = block.slice(block.indexOf('@media print'));
  assert.match(printBlock, /\.table-bg \{ fill: #ffffff; \}/);
  assert.match(printBlock, /\.zone-a \{ fill: #afc6e9; \}/);
  assert.doesNotMatch(printBlock, /#eeeeee|#3a4f70/);
});

test('themeStyleBlock orders rules as light defaults, then dark media query, then print media query', () => {
  const block = themeStyleBlock({ a: { light: '#afc6e9', dark: '#3a4f70' } });
  const darkIndex = block.indexOf('@media (prefers-color-scheme: dark)');
  const printIndex = block.indexOf('@media print');
  assert.ok(darkIndex > 0, 'dark media query should be present');
  assert.ok(printIndex > darkIndex, 'print media query should come after the dark media query, so it wins when both apply');
});
