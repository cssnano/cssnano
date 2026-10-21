import { test } from 'node:test';
import { transformPlugin } from '#passes/merge';
import { assertLinearTime, timeOneRun } from '../linearTiming.js';
const plugin = transformPlugin('mergeRules');

/**
 * @param {string} css
 * @return {number} one run of the whole plugin in milliseconds
 */
function timePlugin(css) {
  return timeOneRun(plugin, css);
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
  assertLinearTime((size) => timePlugin(mediaRuns(size)), 1500);
});
