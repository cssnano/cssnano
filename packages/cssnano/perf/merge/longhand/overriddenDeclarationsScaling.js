import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timePlugin } from './lib/timing.js';
import { assertLinearTime } from '../linearTiming.js';

/**
 * Distinct identifiers never share a shape, so every declaration survives and
 * each one is a candidate for every later survivor of the same property.
 *
 * @param {number} size
 * @return {number} one run in milliseconds
 */
function timeRun(size) {
  const css = `a{${Array.from({ length: size }, (_, i) => `width:k${i}`).join(';')}}`;
  return timePlugin(css, 'chrome 120');
}

test('discarding overridden declarations takes linear time as survivors accumulate', () => {
  assertLinearTime(timeRun, 13000);
});

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
 * Values draw on trios of units IE 11 lacks, and vary their number once the
 * trios run out, so all values share one shape and each is a fallback for
 * every later one: every declaration survives and is compared with the
 * survivors of its shape.
 *
 * @param {number} size
 * @return {number} one run in milliseconds
 */
function timeFallbackRun(size) {
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
            `box-shadow:${n}${newerUnits[a]} ${n}${newerUnits[b]} ${n}${newerUnits[c]} red`
          );
        }
      }
    }
  }
  assert.strictEqual(values.length, size);
  const css = `a{${values.join(';')}}`;
  return timePlugin(css, 'ie 11');
}

test('discarding overridden declarations takes linear time as fallbacks of one shape accumulate', () => {
  assertLinearTime(timeFallbackRun, 6500);
});
