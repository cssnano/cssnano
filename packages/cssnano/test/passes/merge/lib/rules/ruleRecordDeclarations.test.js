import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { ruleRecordOf, buildTestRecords } from './liveRecords.js';
import {
  removeDeclarationsAt,
  takeDeclarationsAt,
} from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {RuleRecord} from '../../../../../src/passes/merge/lib/rules/ruleRecord.js' */

/**
 * The records of `css`, built as the run builds them, with the record of its
 * first rule.
 *
 * @param {string} css
 * @return {{records: BlockRecords, rule: import('postcss').Rule, record: RuleRecord}}
 */
const arenaOf = (css) => {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  const { records } = state;
  return {
    records,
    rule: root.first,
    record: ruleRecordOf(records, root.first),
  };
};

test('removeDeclarationsAt should keep the comment that a rule holds', () => {
  const { records, record } = arenaOf('a{color:red;/* note */width:1px}');
  removeDeclarationsAt(records, record, new Set([0]));
  assert.equal(record.childCount(), 2);
});

test('removeDeclarationsAt should leave the nodes of a rule holding a comment as they were, until write-back', () => {
  const { records, rule, record } = arenaOf('a{color:red;/* note */width:1px}');
  removeDeclarationsAt(records, record, new Set([0]));
  assert.deepEqual(
    rule.nodes.map((node) => node.type),
    ['decl', 'comment', 'decl']
  );
  assert.equal(record.edited, true);
});

test('removeDeclarationsAt should keep the declarations in step with the children under consistency checks', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const { records, record } = arenaOf('a{color:red;/* note */width:1px}');
    removeDeclarationsAt(records, record, new Set([0]));
    assert.equal(record.declarationsOf(records).length, 1);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('takeDeclarationsAt should return the records of the claimed declarations in order', () => {
  const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
  const [color, , height] = record.declarationsOf(records);
  const taken = takeDeclarationsAt(records, record, new Set([0, 2]));
  assert.equal(taken.length, 2);
  assert.equal(taken[0], color);
  assert.equal(taken[1], height);
});

test('takeDeclarationsAt should leave the taken declaration nodes in the rule until write-back', () => {
  const { records, rule, record } = arenaOf(
    'a{color:red;width:1px;height:2px}'
  );
  takeDeclarationsAt(records, record, new Set([0, 2]));
  assert.deepEqual(
    rule.nodes.map((node) => node.prop),
    ['color', 'width', 'height']
  );
});

test('takeDeclarationsAt should leave the unclaimed declarations in the record', () => {
  const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
  takeDeclarationsAt(records, record, new Set([0, 2]));
  assert.deepEqual(
    record.declarationsOf(records).map((declaration) => declaration.prop),
    ['width']
  );
});

test('takeDeclarationsAt should leave the comment that a rule holds', () => {
  const { records, record } = arenaOf('a{color:red;/* note */width:1px}');
  takeDeclarationsAt(records, record, new Set([0, 1]));
  assert.equal(record.childCount(), 1);
});

test('takeDeclarationsAt should keep the raws.before of a taken declaration', () => {
  const { records, record } = arenaOf('a{\n    color:red;\n    width:1px}');
  const [taken] = takeDeclarationsAt(records, record, new Set([1]));
  assert.equal(taken.node.raws.before, '\n    ');
});

test('removeDeclarationsAt should drop the keys of the removed declarations from the declaration keys', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  removeDeclarationsAt(records, record, new Set([0]));
  assert.deepEqual(record.declarationKeys(records).keys, [width.id]);
});

test('takeDeclarationsAt should drop the keys of the taken declarations from the declaration keys', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  takeDeclarationsAt(records, record, new Set([0]));
  assert.deepEqual(record.declarationKeys(records).keys, [width.id]);
});

test('removeDeclarationsAt should read the positions of the declarations as they stand at the call', () => {
  const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
  removeDeclarationsAt(records, record, new Set([1]));
  removeDeclarationsAt(records, record, new Set([1]));
  assert.deepEqual(
    record.declarationsOf(records).map((declaration) => declaration.prop),
    ['color']
  );
});
