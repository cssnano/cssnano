import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { declarationsOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { buildTestRecords, ruleRecordOf } from './liveRecords.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/**
 * The declaration records of the first rule of `css`, built as a merge run builds them.
 *
 * @param {string} css
 */
function declarationsOfFirstRule(css) {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(root, state, new TextTable(), true);
  const rule = ruleRecordOf(state.records, /** @type {any} */ (root.first));
  return declarationsOf(state.records, rule.index);
}

test('a declaration record keeps the spelling of the colon and of the important flag its node gives', () => {
  const [record] = declarationsOfFirstRule('a{color : red ! important}');
  assert.equal(record.between, ' : ');
  assert.equal(record.importantSpelling, ' ! important');
});

test('a declaration record without !important keeps no important spelling, and its colon is the node’s', () => {
  const [record] = declarationsOfFirstRule('a{color:red}');
  assert.equal(record.between, ':');
  assert.equal(record.importantSpelling, null);
});

test('a declaration record from the build is not a clone, so its inherited support is null', () => {
  const [record] = declarationsOfFirstRule('a{color:red}');
  assert.equal(record.inheritedSupport, null);
});

test('a declaration record from the build is not marked, since no edit has written it', () => {
  const [record] = declarationsOfFirstRule('a{color:red}');
  assert.equal(record.marked, false);
});
