// Counts the selector analyses a merge run makes, at n and at 2n, over two
// shapes: a chain of rules that each merge into one rule, and wide selector
// lists merged across rules that do not touch. Doubling the input must at most
// double the analyses, so a summary folded again on every merge would fail.
// Checks are off: this file imports no enableChecks.js.
import assert from 'node:assert/strict';
import { Session } from 'node:inspector/promises';
import { test } from 'node:test';
import postcss from 'postcss';
import preset from '../../../../../src/presets/default.js';

const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: false,
});

const ANALYSES = /** @type {const} */ ([
  ['/passes/merge/lib/rules/ensureCompatibility.js', 'selectorInfoOf'],
  ['/passes/merge/lib/rules/elementKeys.js', 'elementKeyOf'],
]);

/** The bound on the ratio of the analyses at 2n to those at n. */
const BOUND = 2.1;

/**
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @return {number} the calls of the selector analyses in the coverage taken
 */
function analysisCalls(coverage) {
  let calls = 0;
  for (const script of coverage) {
    for (const [module, functionName] of ANALYSES) {
      if (!script.url.endsWith(module)) continue;
      for (const fn of script.functions) {
        if (fn.functionName === functionName) calls += fn.ranges[0].count;
      }
    }
  }
  return calls;
}

/**
 * Runs the full preset over `css` and returns the selector analyses it made.
 * The take before the run drops the counts of the imports.
 *
 * @param {string} css
 * @return {Promise<number>}
 */
async function analysesOf(css) {
  await session.post('Profiler.takePreciseCoverage');
  await postcss(preset()).process(css, { from: undefined });
  const { result } = await session.post('Profiler.takePreciseCoverage');
  return analysisCalls(result);
}

/**
 * @param {(i: number) => string} unit
 * @param {number} count
 * @return {string}
 */
function repeat(unit, count) {
  let css = '';
  for (let i = 0; i < count; i++) css += unit(i);
  return css;
}

/**
 * Asserts that doubling the input at most doubles the analyses.
 *
 * @param {(i: number) => string} unit
 * @param {number} n
 */
async function assertLinearAnalyses(unit, n) {
  const half = await analysesOf(repeat(unit, n));
  const full = await analysesOf(repeat(unit, 2 * n));
  assert.ok(half > 0, 'the run makes no selector analyses');
  assert.ok(
    full <= BOUND * half,
    `${half} analyses at ${n}, ${full} at ${2 * n}`
  );
}

// Adjacent rules that share a declaration merge into one rule as it absorbs
// each of them, so its list grows by one selector a merge.
test('a chain of adjacent merges makes a linear number of selector analyses', async () => {
  await assertLinearAnalyses((i) => `.c${i} {color:red}`, 1000);
});

// Wide lists of rules that share a declaration, each separated by a rule that
// does not, merge into one rule whose list grows by the width of each list.
test('wide lists merged across other rules make a linear number of selector analyses', async () => {
  await assertLinearAnalyses(
    (i) =>
      `${Array.from({ length: 20 }, (_, j) => `.w${i}-${j}`).join(',')}{color:red}` +
      `.x${i}{margin:${i}px}`,
    200
  );
});
