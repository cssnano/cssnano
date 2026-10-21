import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { generateBorderSizeCases } from '../lib/fuzzSizeGenerate.js';

const cases = generateBorderSizeCases(1, 2000);

test('generateBorderSizeCases returns the same rules for the same seed so two revisions are compared on one corpus', () => {
  assert.deepEqual(generateBorderSizeCases(1, 200), cases.slice(0, 200));
});

test('generateBorderSizeCases writes only border declarations', () => {
  const properties = cases.flatMap((css) =>
    postcss.parse(css).first.nodes.map((node) => node.prop)
  );
  assert.ok(properties.every((prop) => prop.startsWith('border')));
});

test('generateBorderSizeCases reaches every colour function that needs a fallback', () => {
  const all = cases.join('\n');
  for (const fn of ['rgba(', 'lab(', 'oklch(', 'color-mix(']) {
    assert.ok(all.includes(fn), fn);
  }
});
