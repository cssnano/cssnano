import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

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

/**
 * @param {number} count
 * @return {string} a run of `count` `@media` blocks that set `display`, then a run that sets `margin-left` under the same conditions, as in picnic: each block of the first run can move down to its counterpart only after the block after it has
 */
function mediaRuns(count) {
  let css = '';
  for (let i = 1; i <= count; i++) {
    css += `@media (min-width:${i}px){.c${i}{display:none}}`;
  }
  for (let i = 0; i <= count; i++) {
    css += `@media (min-width:${i}px){.d${i}{margin-left:1px}}`;
  }
  return css;
}

test('joining runs of blocks that each move down after the next one takes linear time as the runs grow', () => {
  timePlugin(mediaRuns(800));
  const small = timePlugin(mediaRuns(400));
  const large = timePlugin(mediaRuns(800));
  // Doubling the input takes about two times as long for a linear pass and
  // about four times as long for a quadratic one.
  assert.ok(
    large / small < 3,
    `800/400 time ratio ${(large / small).toFixed(2)}`
  );
});
