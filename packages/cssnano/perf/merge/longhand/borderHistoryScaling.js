import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { timePlugin } from './lib/timing.js';
import { onlyTransform } from '../../../test/merge/onlyTransform.js';
import { withTargets } from '../../../../../util/testHelpers.js';
import { assertLinearTime } from '../linearTiming.js';

const newerUnits = [
  'vi',
  'vb',
  'vmax',
  'dvw',
  'dvh',
  'svw',
  'dvi',
  'dvb',
  'svi',
  'svb',
  'lvi',
  'lvb',
  'svh',
  'lvw',
  'lvh',
  'cqw',
  'cqh',
  'cqi',
  'cqb',
  'ch',
  'lh',
  'rlh',
  'cap',
  'ic',
  'q',
  'cqmin',
  'cqmax',
  'rex',
];

/**
 * Each `border-width` takes a trio of units IE 11 lacks, so the shorthand is a
 * fallback for the later ones. It touches all four width cells, so each cell's
 * history grows with the declarations.
 *
 * @param {number} size
 * @return {string} a rule with `size` border-width declarations
 */
function borderWidthRule(size) {
  const values = [];
  for (let n = 1; values.length < size; n++) {
    for (let a = 0; a < newerUnits.length && values.length < size; a++) {
      for (let b = a + 1; b < newerUnits.length && values.length < size; b++) {
        for (
          let c = b + 1;
          c < newerUnits.length && values.length < size;
          c++
        ) {
          values.push(
            `border-width:${n}${newerUnits[a]} ${n}${newerUnits[b]} ${n}${newerUnits[c]}`
          );
        }
      }
    }
  }
  return `a{${values.join(';')}}`;
}

/**
 * @param {number} size
 * @return {number} one run in milliseconds
 */
function timeRun(size) {
  return timePlugin(borderWidthRule(size), 'ie 11');
}

test('border width fallbacks in every cell all survive the merge', async () => {
  const size = 2000;
  const plugin = onlyTransform(['mergeLonghand'])(withTargets('ie 11'));
  const result = await postcss([plugin]).process(borderWidthRule(size), {
    from: undefined,
  });
  assert.strictEqual(result.css.match(/border-width:/gv)?.length, size);
});

test('border width fallbacks in every cell take linear time as their history accumulates', () => {
  assertLinearTime(timeRun, 2000);
});
