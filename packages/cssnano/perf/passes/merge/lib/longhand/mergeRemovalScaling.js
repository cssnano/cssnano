import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
const plugin = transformPlugin('mergeLonghand');
import { timePlugin } from './lib/timing.js';
import { assertLinearTime } from '../linearTiming.js';
import { withTargets } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';

/**
 * @param {number} groups
 * @return {string}
 */
function createCSS(groups) {
  const parts = [];
  for (let i = 0; i < groups; i++) {
    parts.push(
      `margin-top:${i}px;margin-right:${i}px;margin-bottom:${i}px;margin-left:${i}px;&{x:y}`
    );
  }
  return `a{${parts.join('')}}`;
}

test('merging declaration groups takes linear time as the rule grows', () => {
  const sample = postcss([plugin(withTargets('chrome 120'))]).process(
    createCSS(3),
    { from: undefined }
  ).css;
  assert.strictEqual(
    sample,
    'a{margin:0px;&{x:y}margin:1px;&{x:y}margin:2px;&{x:y}}'
  );
  assertLinearTime((size) => timePlugin(createCSS(size), 'chrome 120'), 2000);
});
