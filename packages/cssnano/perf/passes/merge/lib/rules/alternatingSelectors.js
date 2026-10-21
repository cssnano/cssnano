import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

/**
 * @param {number} count
 * @return {string} rules that alternate between two selectors, each setting a property of its own
 */
function alternatingSelectors(count) {
  let css = '';
  for (let i = 0; i < count; i++) {
    css += `.s${i % 2}{c${i}:1}`;
  }
  return css;
}

/**
 * @param {string} css
 * @return {number} best of two runs of the whole plugin in milliseconds, so one GC pause does not decide
 */
function timePlugin(css) {
  const run = () => {
    const start = performance.now();
    postcss([plugin()]).process(css, { from: undefined }).sync();
    return performance.now() - start;
  };
  return Math.min(run(), run());
}

// Every rule joins the first rule with its selector, so that rule grows with
// each join. A join must cost time in the joined rule, not the growing one or
// the parent the joined rule leaves.
test('merging rules that alternate two selectors takes linear time as the rules grow', () => {
  timePlugin(alternatingSelectors(2000));
  const small = timePlugin(alternatingSelectors(1000));
  const large = timePlugin(alternatingSelectors(2000));
  assert.ok(
    large / small < 3,
    `2000/1000 time ratio ${(large / small).toFixed(2)}`
  );
});
