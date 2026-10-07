import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { timePlugin } from './lib/timing.js';

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
  const sample = postcss([
    plugin({ overrideBrowserslist: 'chrome 120' }),
  ]).process(createCSS(3), { from: undefined }).css;
  assert.strictEqual(
    sample,
    'a{margin:0px;&{x:y}margin:1px;&{x:y}margin:2px;&{x:y}}'
  );
  timePlugin(createCSS(500), 'chrome 120');
  const small = timePlugin(createCSS(8000), 'chrome 120');
  const large = timePlugin(createCSS(16000), 'chrome 120');
  // Doubling the input takes about two times as long for a linear pass and
  // about four times as long for a quadratic one.
  assert.ok(
    large / small < 3,
    `16000/8000 time ratio ${(large / small).toFixed(2)}`
  );
});
