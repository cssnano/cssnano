// Counts the selector verdicts that `canMerge` looks up while one rule gains a
// selector at each join. The parsed prefix keeps the lookups linear in the
// selectors; without it each join would look up the whole list again.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../src/merge/rules/mergeState.js';
import { createRunContext } from '../../../src/run/runContext.js';
import {
  buildTestRecords,
  ruleRecordOf,
} from '../../../test/merge/rules/liveRecords.js';

/**
 * @param {number} joins
 * @return {number} the verdict lookups of `joins` joins that each add a selector
 */
function lookups(joins) {
  const context = createRunContext();
  const state = new MergeState(['chrome 120'], context);
  const css = Array.from({ length: joins + 2 }, (_, i) => `.c${i}{--d:${i}}`);
  const root = postcss.parse(css.join(''));
  state.records = buildTestRecords(root, state);
  const [grown, ...rest] = root.nodes.map((node) =>
    ruleRecordOf(state.records, node)
  );
  const other = rest.pop();
  const { selectorVerdicts } = context;
  const isValid = selectorVerdicts.isValid;
  let calls = 0;
  selectorVerdicts.isValid = function (...args) {
    calls++;
    return isValid.apply(this, args);
  };
  for (const added of rest) {
    assert.equal(state.canMerge(grown, other), true);
    state.addSelectors(grown, added.selectorIds);
  }
  return calls;
}

test('the verdict lookups of a rule that gains a selector at each join grow linearly', () => {
  const small = lookups(100);
  const large = lookups(200);
  assert.ok(large <= 2.2 * small, `${small} lookups, then ${large}`);
});
