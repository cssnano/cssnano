import { test } from 'node:test';
import { transformPlugin } from '#passes/merge';
import { assertLinearTime, timeOneRun } from '../linearTiming.js';
const plugin = transformPlugin('mergeRules');

/**
 * @param {number} count
 * @return {string} rules that alternate `display` between `none` and `block`
 */
function alternatingDisplayRules(count) {
  return Array.from(
    { length: count },
    (_, i) => `.r${i}{display:${i % 2 ? 'none' : 'block'}}`
  ).join('');
}

/**
 * @param {number} count
 * @return {string} `x` rules, each followed by a `q` rule and a `y` rule that joins the `x` group
 */
function joinableRuleGroups(count) {
  return Array.from(
    { length: count },
    (_, i) =>
      `x${i}{color:red;top:0}q${i}{margin:0}y${i}::before{color:red;top:0}`
  ).join('');
}

/**
 * @param {string} css
 * @return {number} one run of the whole plugin in milliseconds
 */
function timePlugin(css) {
  return timeOneRun(plugin, css);
}

test('should join many alternating rules in linear time', () => {
  assertLinearTime((size) => timePlugin(alternatingDisplayRules(size)), 6000);
});

// Each `y` rule joins the `x` group across the `q` rule, which sets nothing
// the group sets. The group gains a selector on every join.
test('should join many rules into one growing group in linear time', () => {
  assertLinearTime((size) => timePlugin(joinableRuleGroups(size)), 400);
});
