import assert from 'node:assert/strict';
import { test } from 'node:test';
import browserslist from 'browserslist';
import {
  supportsPlaceShorthands,
  targetSupportOf,
} from '../../../src/merge/longhand/targetSupport.js';

/**
 * Summarizing the targets once per run must cost a small multiple of one
 * pass over them. On defaults, measured on the fixed code, targetSupportOf
 * takes about 11 times as long as supportsPlaceShorthands. Rebuilding the
 * profile per feature takes about 41 times, and a box table that parses the
 * version strings on every check about 55 times. The bound 25 lies between.
 */
const bound = 25;
const samples = 1000;

/**
 * @param {() => unknown} run
 * @return {number} the fastest of the samples, in milliseconds
 */
function fastest(run) {
  let best = Infinity;
  for (let sample = 0; sample < samples; sample++) {
    const start = performance.now();
    run();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

test('targetSupportOf costs under 25 passes over the targets on defaults', () => {
  const browsers = browserslist('defaults');
  // Warm-up runs keep the JIT's first compilation out of the measured runs.
  for (let warm = 0; warm < 200; warm++) {
    targetSupportOf(browsers);
    supportsPlaceShorthands(browsers);
  }
  const ratio =
    fastest(() => targetSupportOf(browsers)) /
    fastest(() => supportsPlaceShorthands(browsers));
  assert.ok(ratio < bound, `targetSupportOf ratio ${ratio.toFixed(2)}`);
});
