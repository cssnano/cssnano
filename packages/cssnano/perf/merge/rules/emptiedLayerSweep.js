import { test } from 'node:test';
import { onlyTransform } from '../../../test/merge/onlyTransform.js';
import { assertLinearTime, timeOneRun } from '../linearTiming.js';
const plugin = onlyTransform(['mergeRules']);

/**
 * @param {number} count
 * @return {string} a rule, `count` one-rule layers of the same name, then a rule that joins the first
 */
function emptiedLayers(count) {
  let css = '@layer x{.a{color:red}}';
  for (let i = 0; i < count; i++) {
    css += `@layer x{.s${i}{margin:${i}px}}`;
  }
  return `${css}@layer x{.c{color:red}}`;
}

test('a sweep that passes many emptied @layer blocks takes linear time as the blocks grow', () => {
  assertLinearTime((size) => timeOneRun(plugin, emptiedLayers(size)), 1500);
});
