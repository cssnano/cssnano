// Counts the calls of the selector parser in a merge run, against the distinct
// selector ids that `canMerge` asks about. A verdict is parsed once per id, so
// the calls equal those ids; they must not grow with the rules that repeat the
// same selectors. The fixture's selectors are plain classes, so every one passes
// the scan under any browser target.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Session } from 'node:inspector/promises';
import postcss from 'postcss';
import { onlyTransform } from '../../../../../test/passes/onlyTransform.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';

const plugin = onlyTransform(['mergeRules']);
const POOL = 4;

/** @type {Set<number>} the selector ids that the current run's merges asked about */
let asked = new Set();
const canMerge = MergeState.prototype.canMerge;
MergeState.prototype.canMerge = function (recordA, recordB, ...rest) {
  for (const id of recordA.selectorIds) asked.add(id);
  for (const id of recordB.selectorIds) asked.add(id);
  return canMerge.call(this, recordA, recordB, ...rest);
};

const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: false,
});
after(() => session.disconnect());

/**
 * @param {object[]} scripts the precise coverage of a run
 * @return {number} the calls of the parser's entry point
 */
function parserCalls(scripts) {
  let calls = 0;
  for (const script of scripts) {
    if (!script.url.endsWith('/lib/isInvalidSelector.js')) continue;
    for (const fn of script.functions) {
      if (fn.functionName === 'isInvalidSelector') calls += fn.ranges[0].count;
    }
  }
  return calls;
}

/**
 * @param {number} n
 * @return {string} `n` rules, each with one class of a pool of four and a
 * declaration of its own, so that no two rules are equal
 */
function sharedSelectors(n) {
  return Array.from({ length: n }, (_, i) => `.c${i % POOL}{--d${i}:1}`).join(
    ''
  );
}

/**
 * @param {number} n
 * @return {Promise<{calls: number, askedIds: number}>} the parser calls and the
 * distinct selector ids that `canMerge` asked about, for a stylesheet of `n` rules
 */
async function measure(n) {
  await session.post('Profiler.takePreciseCoverage');
  asked = new Set();
  await postcss([plugin()]).process(sharedSelectors(n), { from: undefined });
  const { result } = await session.post('Profiler.takePreciseCoverage');
  return { calls: parserCalls(result), askedIds: asked.size };
}

test('merges ask about every selector of the fixture', async () => {
  assert.equal((await measure(200)).askedIds, POOL);
});

test('the parser runs once for each selector id that a merge asks about', async () => {
  const { calls, askedIds } = await measure(200);
  assert.equal(calls, askedIds);
});

test('the parser calls do not grow with the rules that repeat a selector', async () => {
  const small = await measure(200);
  const large = await measure(400);
  assert.equal(large.calls, small.calls);
});
