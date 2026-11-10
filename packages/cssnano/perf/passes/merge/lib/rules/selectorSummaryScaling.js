// Counts the selector analyses and the iterations of each loop of selector
// reads a merge run makes, at n and at 2n, over three shapes. Doubling the input
// must at most double each count the shape asserts, so a summary folded again
// on every merge would fail.
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

const SELECTOR_READS_MODULE = '/passes/merge/lib/rules/selectorReads.js';

const SELECTOR_READS = new URL(
  '../../../../../src/passes/merge/lib/rules/selectorReads.js',
  import.meta.url
);

/**
 * The loops of selector reads, each by the source of its body: the iterations
 * of the body are the iterations of the loop.
 */
const LOOPS = /** @type {const} */ ({
  listKey: 'key += ids[at];',
  listTextLength: 'total += selectorTextLength(tokenLists, ids[at]);',
});

/** The bound on the ratio of a count at 2n to the count at n. */
const BOUND = 2.1;

/**
 * The counts of one run: the selector analyses, then the iterations of each
 * loop of selector reads.
 *
 * @typedef {{
 *   analyses: number,
 *   listKey: number,
 *   listTextLength: number
 * }} Counts
 */

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
 * @return {Omit<Counts, 'analyses'>} the iterations of each loop of selector
 * reads in the coverage taken
 */
function loopIterations(coverage) {
  const source = readFileSync(SELECTOR_READS, 'utf8');
  const iterations = { listKey: 0, listTextLength: 0 };
  for (const script of coverage) {
    if (!script.url.endsWith(SELECTOR_READS_MODULE)) continue;
    for (const loop of /** @type {const} */ (['listKey', 'listTextLength'])) {
      iterations[loop] += executionCount(
        script.functions,
        source.indexOf(LOOPS[loop])
      );
    }
  }
  return iterations;
}

/**
 * Runs the full preset over `css` and returns its counts. The take before the
 * run drops the counts of the imports.
 *
 * @param {string} css
 * @return {Promise<Counts>}
 */
async function countsOf(css) {
  await session.post('Profiler.takePreciseCoverage');
  await postcss(preset()).process(css, { from: undefined });
  const { result } = await session.post('Profiler.takePreciseCoverage');
  return {
    analyses: analysisCalls(result),
    ...loopIterations(result),
  };
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
 * Asserts that doubling the input at most doubles each asserted count, and that
 * each is nonzero at n so the bound says something.
 *
 * @param {{ unit: (i: number) => string, n: number, asserted: (keyof Counts)[] }} shape
 */
async function assertLinear({ unit, n, asserted }) {
  const half = await countsOf(repeat(unit, n));
  const full = await countsOf(repeat(unit, 2 * n));
  for (const count of asserted) {
    assert.ok(half[count] > 0, `${count} is zero at ${n}`);
    assert.ok(
      full[count] <= BOUND * half[count],
      `${count}: ${half[count]} at ${n}, ${full[count]} at ${2 * n}`
    );
  }
}

// Adjacent rules that share a declaration merge into one rule as it absorbs
// each of them, so its list grows by one selector a merge. Each merge absorbs
// its rule with no delta, so `listTextLength` never runs on this shape.
test('a chain of adjacent merges makes a linear number of selector analyses and key reads', async () => {
  await assertLinear({
    unit: (i) => `.c${i} {color:red}`,
    n: 1000,
    asserted: ['analyses', 'listKey'],
  });
});

// Wide lists of rules that share a declaration, each separated by a rule that
// does not, merge into one rule whose list grows by the width of each list.
test('wide lists merged across other rules make a linear number of selector analyses and reads', async () => {
  await assertLinear({
    unit: (i) =>
      `${Array.from({ length: 20 }, (_, j) => `.w${i}-${j}`).join(',')}{color:red}` +
      `.x${i}{margin:${i}px}`,
    n: 200,
    asserted: ['analyses', 'listKey', 'listTextLength'],
  });
});

// Adjacent rules that share a long declaration and each keep one of their own:
// the first pair merges through a delta, and every later rule joins the shared
// rule through the group, so the shared list grows by one selector a rule.
test('a chain of rules that share a declaration makes a linear number of selector analyses and reads', async () => {
  await assertLinear({
    unit: (i) =>
      `.s${i}{background:url(a-very-long-image-name-for-sharing.png);top:${i}px}`,
    n: 500,
    asserted: ['analyses', 'listKey', 'listTextLength'],
  });
});
