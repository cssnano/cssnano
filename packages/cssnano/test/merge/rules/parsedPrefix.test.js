import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../src/merge/rules/mergeState.js';
import { createRunContext } from '../../../src/run/runContext.js';
import { writeSelectorIds } from '../../../src/ir/selectorEdits.js';
import { combineSummaries } from '../../../src/ir/selectorList.js';
import { buildTestRecords, ruleRecordOf } from './liveRecords.js';

const createState = () => new MergeState(['chrome 120'], createRunContext());

/**
 * Gives the rules of `root` their records, as the merge does before it joins any.
 *
 * @param {MergeState} state
 * @param {import('postcss').Root} root
 * @return {import('postcss').Root}
 */
const withRecords = (state, root) => {
  state.records = buildTestRecords(root, state, false);
  return root;
};

test('canMerge should refuse a rule that a merge already checked once absorbEarlier prepends a selector the parser rejects', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('b{color:red}:nth-child(foo){color:red}c{color:red}')
  );
  const [first, invalid, last] = root.nodes.map((node) =>
    ruleRecordOf(state.records, node)
  );
  assert.equal(state.canMerge(first, last), true);
  state.absorbEarlier(last, invalid);
  assert.equal(state.canMerge(first, last), false);
});

test('canMerge should refuse a rule that a merge already checked once addSelectors appends a selector the parser rejects', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('b{color:red}c{color:red}:nth-child(foo){color:red}')
  );
  const [first, second, invalid] = root.nodes.map((node) =>
    ruleRecordOf(state.records, node)
  );
  assert.equal(state.canMerge(first, second), true);
  state.addSelectors(second, invalid.selectorIds);
  assert.equal(state.canMerge(first, second), false);
});

test('canMerge should refuse a rule that a merge already checked once combineSummaries joins a partly parsed list to a parsed one', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse(
      'b,:nth-child(foo){color:red}c{color:red}d{color:red}e{color:red}'
    )
  );
  const [first, second, target, other] = root.nodes.map((node) =>
    ruleRecordOf(state.records, node)
  );
  // Each check leaves a parsed prefix: one selector for `first`, one for `second`.
  assert.equal(state.canMerge(first, other), false);
  assert.equal(state.canMerge(second, other), true);
  writeSelectorIds(target, [...first.selectorIds, ...second.selectorIds]);
  combineSummaries(target, first, second);
  assert.equal(state.canMerge(target, other), false);
});

test('canMerge should refuse a rule that a merge already checked once writeSelectorIds puts a selector the parser rejects first', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('b{color:red}:nth-child(foo){color:red}c{color:red}')
  );
  const [rule, invalid, other] = root.nodes.map((node) =>
    ruleRecordOf(state.records, node)
  );
  assert.equal(state.canMerge(rule, other), true);
  writeSelectorIds(rule, [...invalid.selectorIds, ...rule.selectorIds]);
  assert.equal(state.canMerge(rule, other), false);
});
