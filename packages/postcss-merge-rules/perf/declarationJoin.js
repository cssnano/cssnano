import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';

test('should join many alternating rules in linear time', () => {
  const css = Array.from(
    { length: 6000 },
    (_, i) => `.r${i}{display:${i % 2 ? 'none' : 'block'}}`
  ).join('');
  const start = performance.now();
  postcss([plugin()]).process(css, { from: undefined }).sync();
  // Quadratic behavior took ten seconds on this input; linear takes < 0.1.
  assert.ok(performance.now() - start < 3000);
});
