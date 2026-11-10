// Counts the selector analyses a merge run makes, at n and at 2n, over two
// shapes: a chain of rules that each merge into one rule, and wide selector
// lists merged across rules that do not touch. Doubling the input must at most
// double the analyses, so a summary folded again on every merge would fail.
// Checks are off: this file imports no enableChecks.js.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import { test } from 'node:test';
import postcss from 'postcss';
import preset from '../../../../../src/presets/default.js';
import { executionCount } from '../../../../../../../util/mutation-testing/fragmentReach.js';

const session = new Session();
session.connect();
await session.post('Profiler.enable');
// Block coverage gives the iterations of a loop, the count of its body.
await session.post('Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: true,
});

const ANALYSES = /** @type {const} */ ([
  ['/passes/merge/lib/rules/ensureCompatibility.js', 'selectorInfoOf'],
  ['/passes/merge/lib/rules/elementKeys.js', 'elementKeyOf'],
]);

/**
 * The loops of selector reads, each by the source of its body: the iterations
 * of the body are the iterations of the loop.
 */
const LOOPS = /** @type {const} */ ([
  ['/passes/merge/lib/rules/selectorReads.js', 'key += ids[at];'],
]);

const SELECTOR_READS = new URL(
  '../../../../../src/passes/merge/lib/rules/selectorReads.js',
  import.meta.url
);

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
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @return {number} the iterations of the loops of selector reads in the coverage taken
 */
function loopIterations(coverage) {
  const source = readFileSync(SELECTOR_READS, 'utf8');
  let iterations = 0;
  for (const script of coverage) {
    for (const [module, body] of LOOPS) {
      if (!script.url.endsWith(module)) continue;
      iterations += executionCount(script.functions, source.indexOf(body));
    }
  }
  return iterations;
}

/**
 * Runs the full preset over `css` and returns the selector analyses it made and
 * the iterations of the loops of selector reads. The take before the run drops
 * the counts of the imports.
 *
 * @param {string} css
 * @return {Promise<{calls: number, iterations: number}>}
 */
async function analysesOf(css) {
  await session.post('Profiler.takePreciseCoverage');
  await postcss(preset()).process(css, { from: undefined });
  const { result } = await session.post('Profiler.takePreciseCoverage');
  return { calls: analysisCalls(result), iterations: loopIterations(result) };
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
  assert.ok(half.calls > 0, 'the run makes no selector analyses');
  assert.ok(
    full.calls <= BOUND * half.calls,
    `${half.calls} analyses at ${n}, ${full.calls} at ${2 * n}`
  );
  assert.ok(half.iterations > 0, 'the run runs no loop of selector reads');
  assert.ok(
    full.iterations <= BOUND * half.iterations,
    `${half.iterations} loop iterations at ${n}, ${full.iterations} at ${2 * n}`
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
