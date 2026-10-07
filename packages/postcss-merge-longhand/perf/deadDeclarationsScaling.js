import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { discardDeadDeclarations } from '../src/lib/decl/crossKindCoverage.js';
import { BoxSupport } from '../src/lib/targetSupport.js';

const units = [
  'vw',
  'vh',
  'vi',
  'vb',
  'vmin',
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
];

/**
 * Every value uses a different trio of newer units, so no later value is
 * parsed by every browser that parses an earlier one: each declaration is a
 * fallback that survives, and every later one is a candidate to cover it.
 *
 * @param {number} size
 * @return {string}
 */
function createCSS(size) {
  const values = [];
  for (let a = 0; a < units.length; a++) {
    for (let b = a + 1; b < units.length; b++) {
      for (let c = b + 1; c < units.length && values.length < size; c++) {
        values.push(`calc(1${units[a]} + 1${units[b]} + 1${units[c]})`);
      }
    }
  }
  assert.strictEqual(values.length, size);
  return `a{margin-inline-start:0;${values.map((value) => `margin-left:${value}`).join(';')}}`;
}

/**
 * Calls the pass directly, so the overridden-declarations pass that runs
 * before it in the plugin does not hide its cost.
 *
 * @param {number} size
 * @return {number} best of two runs in milliseconds, so one GC pause does not decide
 */
function timeRun(size) {
  const css = createCSS(size);
  const support = new BoxSupport(['chrome 120']);
  const run = () => {
    const lane = /** @type {postcss.Declaration[]} */ (
      /** @type {postcss.Rule} */ (postcss.parse(css).first).nodes
    );
    const start = performance.now();
    discardDeadDeclarations(lane, support);
    return performance.now() - start;
  };
  return Math.min(run(), run());
}

test('discarding dead box declarations takes linear time as fallbacks accumulate', () => {
  timeRun(500);
  const small = timeRun(800);
  const large = timeRun(1600);
  // Doubling the input takes about two times as long for a linear pass and
  // about four times as long for a quadratic one.
  assert.ok(
    large / small < 3,
    `1600/800 time ratio ${(large / small).toFixed(2)}`
  );
});
