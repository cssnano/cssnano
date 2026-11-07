import { childCountOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { ruleRecordOf, buildTestRecords, claimAt } from './liveRecords.js';
import {
  moveDeclarations,
  removeDeclarations,
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

/**
 * An unplaced merged rule, as a merge makes one to take declarations.
 *
 * @param {BlockRecords} records
 * @return {RuleRecord}
 */
const unplacedRule = (records) =>
  records.recordRule(postcss.rule({ selector: 'b' }), ['b'], 'b');

/**
 * Runs `action` with consistency checks on, then restores the setting.
 *
 * @param {() => void} action
 */
const underChecks = (action) => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    action();
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
};

test('removeDeclarations should keep the comment that a rule holds', () => {
  const { records, record } = arenaOf('a{color:red;/* note */width:1px}');
  removeDeclarations(records, record.index, claimAt(records, record, [0]));
  assert.equal(childCountOf(records, record.index), 2);
});

test('removeDeclarations should leave the nodes of a rule holding a comment as they were, until write-back', () => {
  const { records, rule, record } = arenaOf('a{color:red;/* note */width:1px}');
  removeDeclarations(records, record.index, claimAt(records, record, [0]));
  assert.deepEqual(
    rule.nodes.map((node) => node.type),
    ['decl', 'comment', 'decl']
  );
  assert.equal(record.edited, true);
});

test('removeDeclarations should keep the declarations in step with the children under consistency checks', () => {
  underChecks(() => {
    const { records, record } = arenaOf('a{color:red;/* note */width:1px}');
    removeDeclarations(records, record.index, claimAt(records, record, [0]));
    assert.equal(record.declarationsOf(records).length, 1);
  });
});

test('removeDeclarations should drop the keys of the removed declarations from the declaration keys', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  removeDeclarations(records, record.index, claimAt(records, record, [0]));
  assert.deepEqual(record.declarationKeys(records).keys, [width.id]);
});

test('removeDeclarations should throw under checks for an index that a previous removal already took', () => {
  underChecks(() => {
    const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
    const claim = claimAt(records, record, [1]);
    removeDeclarations(records, record.index, claim);
    assert.throws(() => removeDeclarations(records, record.index, claim));
  });
});

test('removeDeclarations should remove the claimed declarations by index, whatever the positions became', () => {
  const { records, record } = arenaOf('a{color:red;margin:0;width:1px;top:0}');
  const [color] = record.declarationsOf(records);
  const claim = claimAt(records, record, [2, 3]);
  records.unlink(color.index);
  removeDeclarations(records, record.index, claim);
  assert.deepEqual(
    record.declarationsOf(records).map((declaration) => declaration.prop),
    ['margin']
  );
});

test("moveDeclarations should keep the claimed declarations in their order in the target's chain", () => {
  const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
  const target = unplacedRule(records);
  const [color, , height] = record.declarationsOf(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [0, 2]),
  ]);
  assert.deepEqual(
    target.declarationsOf(records).map((declaration) => declaration),
    [color, height]
  );
});

test('moveDeclarations should throw under checks for two indices of one rule in reverse chain order', () => {
  underChecks(() => {
    const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
    const target = unplacedRule(records);
    const [color, , height] = record.declarationsOf(records);
    assert.throws(() =>
      moveDeclarations(records, record.index, target.index, [
        height.index,
        color.index,
      ])
    );
  });
});

test('moveDeclarations should leave the taken declaration nodes in the rule until write-back', () => {
  const { records, rule, record } = arenaOf(
    'a{color:red;width:1px;height:2px}'
  );
  const target = unplacedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [0, 2]),
  ]);
  assert.deepEqual(
    rule.nodes.map((node) => node.prop),
    ['color', 'width', 'height']
  );
});

test('moveDeclarations should leave the unclaimed declarations in the record', () => {
  const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
  const target = unplacedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [0, 2]),
  ]);
  assert.deepEqual(
    record.declarationsOf(records).map((declaration) => declaration.prop),
    ['width']
  );
});

test('moveDeclarations should leave the comment that a rule holds', () => {
  const { records, record } = arenaOf('a{color:red;/* note */width:1px}');
  const target = unplacedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [0, 1]),
  ]);
  assert.equal(childCountOf(records, record.index), 1);
});

test('moveDeclarations should keep the raws.before of a moved declaration', () => {
  const { records, record } = arenaOf('a{\n    color:red;\n    width:1px}');
  const target = unplacedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [1]),
  ]);
  const [taken] = target.declarationsOf(records);
  assert.equal(taken.node.raws.before, '\n    ');
});

test('moveDeclarations should drop the keys of the moved declarations from the declaration keys', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  const target = unplacedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [0]),
  ]);
  assert.deepEqual(record.declarationKeys(records).keys, [width.id]);
});
