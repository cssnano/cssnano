// Times font face matching against a long run of identifiers. Each run is
// matched against the declared families word by word from its end, so the
// time stays linear in the run's length instead of building every suffix.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { presetEntryPlugin } from '../../../../util/testHelpers.js';

const plugin = presetEntryPlugin('discardUnused');

/**
 * @param {number} words
 * @returns {number} the milliseconds one run takes
 */
function timeOf(words) {
  const family = Array.from({ length: words }, () => 'a').join(' ');
  const css = `@font-face{font-family:${family};src:url(a.woff)}b{font-family:${family}}`;
  const start = performance.now();
  void postcss([plugin()]).process(css, { from: undefined }).css;
  return performance.now() - start;
}

test('should match a long font family run in linear time', () => {
  const n = 20000;
  timeOf(n);
  const small = timeOf(n);
  const large = timeOf(4 * n);
  assert.ok(
    large < 10 * small + 50,
    `${small}ms for ${n}, ${large}ms for ${4 * n}`
  );
});
