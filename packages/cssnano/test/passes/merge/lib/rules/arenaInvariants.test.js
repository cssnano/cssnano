import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  childCountOf,
  holdsOnlyDeclarationsOf,
} from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { ruleRecordOf, buildTestRecords } from './liveRecords.js';

const createState = (consistencyChecks = false) =>
  new MergeState(
    ['chrome 120'],
    createRunContext(undefined, consistencyChecks)
  );

/**
 * Builds the records of `css` and absorbs the first rule into the last, then
 * unlinks the first rule, so the root no longer reaches its record.
 *
 * @param {MergeState} state
 * @param {string} css
 * @param {boolean} consistencyChecks whether the records check their reads
 */
function unreachedRecord(state, css, consistencyChecks) {
  const root = postcss.parse(css);
  state.records = buildTestRecords(root, state, undefined, consistencyChecks);
  const record = ruleRecordOf(state.records, root.first);
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  state.records.detach(record.index);
  return record;
}

test('holdsOnlyDeclarationsOf should be true for a rule of two identical declarations that share one id', () => {
  const state = createState(false);
  const root = postcss.parse('a{color:red;color:red}');
  state.records = buildTestRecords(root, state, undefined, false);
  const record = ruleRecordOf(state.records, root.first);
  assert.equal(holdsOnlyDeclarationsOf(state.records, record.index), true);
});

test('declarationKeys should return the keys of an unreached rule without checks', () => {
  const state = createState(false);
  const record = unreachedRecord(state, 'a{color:red}b{color:red}', false);
  assert.doesNotThrow(() => declarationKeys(state.records, record.index));
});

test('declarationKeys should throw for an unreached rule under checks', () => {
  const state = createState(true);
  const record = unreachedRecord(state, 'a{color:red}b{color:red}', true);
  assert.throws(
    () => declarationKeys(state.records, record.index),
    /does not reach/v
  );
});

test('childCountOf should return the child count of an unreached rule without checks', () => {
  const state = createState(false);
  const record = unreachedRecord(state, 'a{color:red}b{color:red}', false);
  assert.doesNotThrow(() => childCountOf(state.records, record.index));
});

test('childCountOf should throw for an unreached rule under checks', () => {
  const state = createState(true);
  const record = unreachedRecord(state, 'a{color:red}b{color:red}', true);
  assert.throws(
    () => childCountOf(state.records, record.index),
    /does not reach/v
  );
});

test('the selectors of an unreached rule should be readable without checks', () => {
  const state = createState(false);
  const record = unreachedRecord(state, 'a{color:red}b{color:red}', false);
  assert.doesNotThrow(() => record.selectorIds);
});

test('the rule of an unreached record should throw under checks', () => {
  const state = createState(true);
  const record = unreachedRecord(state, 'a{color:red}b{color:red}', true);
  assert.throws(() => state.records.rule(record.index), /does not reach/v);
});
