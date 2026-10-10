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

test('should join many rules into one growing group in linear time', () => {
  // Each `y` rule joins the `x` group across the `q` rule, which sets nothing
  // the group sets. The group gains a selector on every join.
  const css = Array.from(
    { length: 4000 },
    (_, i) =>
      `x${i}{color:red;top:0}q${i}{margin:0}y${i}::before{color:red;top:0}`
  ).join('');
  const start = performance.now();
  postcss([plugin()]).process(css, { from: undefined }).sync();
  // Re-recording the group on every join took about 19 seconds on this input.
  assert.ok(performance.now() - start < 3000);
});
