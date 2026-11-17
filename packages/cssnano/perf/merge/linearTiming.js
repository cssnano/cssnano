import assert from 'node:assert/strict';
import postcss from 'postcss';

const SAMPLES = 5;

/**
 * @param {() => import('postcss').Plugin} plugin factory for the plugin under test
 * @param {string} css
 * @return {number} one run of the whole plugin in milliseconds
 */
export function timeOneRun(plugin, css) {
  const start = performance.now();
  postcss([plugin()]).process(css, { from: undefined }).sync();
  return performance.now() - start;
}

/**
 * Quadrupling the input takes about four times as long for a linear pass and
 * about sixteen times as long for a quadratic one, so the bound 8 leaves
 * headroom on both sides. Choose `small` so its run takes at least 50 ms.
 *
 * @param {(size: number) => number} timeOnce milliseconds for one run of an input of `size`
 * @param {number} small the smaller of the two sizes
 * @return {void}
 */
export function assertLinearTime(timeOnce, small) {
  // Warm-up runs keep the JIT's first compilation out of the measured runs.
  timeOnce(small);
  let base = Infinity;
  let grown = Infinity;
  for (let sample = 0; sample < SAMPLES; sample++) {
    base = Math.min(base, timeOnce(small));
  }
  for (let sample = 0; sample < SAMPLES; sample++) {
    grown = Math.min(grown, timeOnce(4 * small));
  }
  assert.ok(
    grown / base < 8,
    `4× size time ratio ${(grown / base).toFixed(2)}`
  );
}
