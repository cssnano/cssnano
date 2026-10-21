import { test } from 'node:test';
import { transformPlugin } from '#passes/merge';
import { assertLinearTime, timeOneRun } from '../linearTiming.js';
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
 * @return {number} one run of the whole plugin in milliseconds
 */
function timePlugin(css) {
  return timeOneRun(plugin, css);
}

// Every rule joins the first rule with its selector, so that rule grows with
// each join. A join must cost time in the joined rule, not the growing one or
// the parent the joined rule leaves.
test('merging rules that alternate two selectors takes linear time as the rules grow', () => {
  assertLinearTime((size) => timePlugin(alternatingSelectors(size)), 4500);
});
