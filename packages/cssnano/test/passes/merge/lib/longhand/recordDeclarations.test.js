import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { declarationsFromRecords } from '../../../../../src/passes/merge/lib/longhand/recordDeclarations.js';
import { RUN_END } from '../../../../../src/passes/merge/lib/longhand/blockDeclarations.js';
import { commitDeclarations } from '../../../../../src/passes/ir/arenaEdits.js';
import { buildTestRecords, ruleRecordOf } from '../rules/liveRecords.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';

/** @import {Rule} from 'postcss' */
/** @import {ArenaIndex} from '../../../../../src/passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../../../src/passes/ir/blockRecords.js' */

/**
 * Builds the records of `css` with the checks on, and the run's state.
 *
 * @param {string} css
 * @return {{ records: BlockRecords, state: MergeState, container: ArenaIndex }}
 *   the records, the run's state, and the index of the first rule
 */
function recordsOf(css) {
  const root = postcss.parse(css);
  const context = createRunContext(true);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, true);
  const rule = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  return { records: state.records, state, container: rule.index };
}

test('a nested rule with declarations ends a run of declarations', () => {
  const { records, state, container } = recordsOf(
    'a{color:red;b{x:y}width:1px}'
  );
  const list = declarationsFromRecords(records, state.runContext, container);
  assert.deepEqual(list.chain, [0, RUN_END, 1]);
});

test('an empty nested rule does not end a run of declarations', () => {
  const { records, state, container } = recordsOf('a{color:red;b{}width:1px}');
  const list = declarationsFromRecords(records, state.runContext, container);
  assert.deepEqual(list.chain, [0, 1]);
});

test('an at-rule ends a run of declarations', () => {
  const { records, state, container } = recordsOf(
    'a{color:red;@media print{x:y}width:1px}'
  );
  const list = declarationsFromRecords(records, state.runContext, container);
  assert.deepEqual(list.chain, [0, RUN_END, 1]);
});

test('a comment between declarations does not end a run of declarations', () => {
  const { records, state, container } = recordsOf(
    'a{color:red;/* c */width:1px}'
  );
  const list = declarationsFromRecords(records, state.runContext, container);
  assert.deepEqual(list.chain, [0, 1]);
});

test('a declaration item reads its property, text, importance and raws from its record', () => {
  const { records, state, container } = recordsOf(
    'a{ *COLOR : red !IMPORTANT}'
  );
  const item = declarationsFromRecords(records, state.runContext, container).at(
    0
  );
  assert.equal(item.prop, 'COLOR');
  assert.equal(item.value, 'red');
  assert.equal(item.important, true);
  assert.equal(item.before, ' *');
  assert.equal(item.between, ' : ');
  assert.equal(item.importantSpelling, ' !IMPORTANT');
  assert.equal(item.inheritedSupport, null);
  assert.equal(item.kept, false);
});

test('a value with an important comment is kept, and its item spells the value as written', () => {
  const { records, state, container } = recordsOf('a{margin:0 /*!k*/ 1px}');
  const item = declarationsFromRecords(records, state.runContext, container).at(
    0
  );
  assert.equal(item.kept, true);
  assert.equal(item.value, '0 /*!k*/ 1px');
});

test('a clone that commitDeclarations placed reads back with the support it required', () => {
  const { records, state, container } = recordsOf('a{color:red}');
  const list = declarationsFromRecords(records, state.runContext, container);
  list.insertClone(0, { prop: 'margin', value: '0', important: false });
  commitDeclarations(records, state.runContext, container, list);
  const clone = declarationsFromRecords(
    records,
    state.runContext,
    container
  ).at(1);
  assert.notEqual(clone.inheritedSupport, null);
});
