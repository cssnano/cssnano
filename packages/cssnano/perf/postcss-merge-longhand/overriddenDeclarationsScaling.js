import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timePlugin } from './lib/timing.js';

/**
 * Distinct identifiers never share a shape, so every declaration survives and
 * each one is a candidate for every later survivor of the same property.
 *
 * @param {number} size
 * @return {number} best of two runs in milliseconds, so one GC pause does not decide
 */
function timeRun(size) {
  const css = `a{${Array.from({ length: size }, (_, i) => `width:k${i}`).join(';')}}`;
  return timePlugin(css, 'chrome 120');
}

test('discarding overridden declarations takes linear time as survivors accumulate', () => {
  timeRun(500);
  const small = timeRun(2000);
  const large = timeRun(4000);
  // Doubling the input takes about two times as long for a linear pass and
  // about four times as long for a quadratic one.
  assert.ok(
    large / small < 3,
    `4000/2000 time ratio ${(large / small).toFixed(2)}`
  );
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
 * Every value uses a different trio of units IE 11 lacks, so all values share
 * one shape and each is a fallback for every later one: every declaration
 * survives and is compared with the survivors of its shape.
 *
 * @param {number} size
 * @return {number} best of two runs in milliseconds
 */
function timeFallbackRun(size) {
  const values = [];
  for (let a = 0; a < newerUnits.length; a++) {
    for (let b = a + 1; b < newerUnits.length; b++) {
      for (let c = b + 1; c < newerUnits.length && values.length < size; c++) {
        values.push(
          `box-shadow:1${newerUnits[a]} 1${newerUnits[b]} 1${newerUnits[c]} red`
        );
      }
    }
  }
  assert.strictEqual(values.length, size);
  const css = `a{${values.join(';')}}`;
  return timePlugin(css, 'ie 11');
}

test('discarding overridden declarations takes linear time as fallbacks of one shape accumulate', () => {
  timeFallbackRun(500);
  const small = timeFallbackRun(1600);
  const large = timeFallbackRun(3200);
  assert.ok(
    large / small < 3,
    `3200/1600 time ratio ${(large / small).toFixed(2)}`
  );
});
