import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { discardDeadDeclarations } from '../../../../../src/passes/merge/lib/longhand/decl/crossKindCoverage.js';
import { BoxSupport } from '../../../../../src/passes/merge/lib/longhand/targetSupport.js';
import { assertLinearTime } from '../linearTiming.js';

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
 * Values draw on trios of newer units and vary their number once the trios
 * run out, so each declaration is distinct and a fallback that survives, and
 * every later one is a candidate to cover it.
 *
 * @param {number} size
 * @return {string}
 */
function createCSS(size) {
  const values = [];
  for (let n = 1; values.length < size; n++) {
    for (let a = 0; a < units.length && values.length < size; a++) {
      for (let b = a + 1; b < units.length && values.length < size; b++) {
        for (let c = b + 1; c < units.length && values.length < size; c++) {
          values.push(
            `calc(${n}${units[a]} + ${n}${units[b]} + ${n}${units[c]})`
          );
        }
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
 * @return {number} one run in milliseconds, parsing outside the timed span
 */
function timeRun(size) {
  const css = createCSS(size);
  const support = new BoxSupport(['chrome 120']);
  const lane = /** @type {postcss.Declaration[]} */ (
    /** @type {postcss.Rule} */ (postcss.parse(css).first).nodes
  );
  const start = performance.now();
  discardDeadDeclarations(lane, support);
  return performance.now() - start;
}

test('discarding dead box declarations takes linear time as fallbacks accumulate', () => {
  assertLinearTime(timeRun, 13000);
});
