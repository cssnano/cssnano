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
  appendChild,
  moveDeclarations,
  removeDeclarations,
} from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import {
  COMMENT,
  NO_PRELUDE,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';

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
    state,
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
  assert.equal(records.links.isEdited(record.index), true);
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
  assert.deepEqual(declarationKeys(records, record.index).keys, [width.id]);
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
  assert.deepEqual(declarationKeys(records, record.index).keys, [width.id]);
});

test('unlinking a nested rule should keep the declaration keys of its parent, without a rebuild', () => {
  const { records, rule, record } = arenaOf('a{color:red;b{width:1px}}');
  const nested = ruleRecordOf(records, rule.nodes[1]);
  const kept = declarationKeys(records, record.index);
  records.unlink(nested.index);
  assert.equal(declarationKeys(records, record.index), kept);
});

test('linking a nested rule into its parent should keep the declaration keys of the parent, without a rebuild', () => {
  const { records, rule, record } = arenaOf('a{color:red;c{top:0}}b{width:1px}');
  const sibling = ruleRecordOf(records, rule.next());
  const kept = declarationKeys(records, record.index);
  records.unlink(sibling.index);
  records.linkLast(record.index, sibling.index);
  assert.equal(declarationKeys(records, record.index), kept);
});

test('unlinking a declaration should clear the declaration keys of its parent, which then list the rest', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  const kept = declarationKeys(records, record.index);
  records.unlink(record.declarationsOf(records)[0].index);
  assert.notEqual(declarationKeys(records, record.index), kept);
  assert.deepEqual(declarationKeys(records, record.index).keys, [width.id]);
});

/**
 * A declaration of `css` that no rule holds yet, built as a block child.
 *
 * @param {ReturnType<typeof arenaOf>} arena
 * @param {string} prop
 * @return {import('../../../../../src/passes/ir/declarationRecord.js').DeclarationRecord}
 */
const freshDeclaration = ({ state, records }, prop) =>
  records.blockDeclaration(
    postcss.decl({ prop, value: '0' }),
    state.properties,
    state.declarationIds
  );

test('appendChild of a declaration should keep the entry of the rule and list the appended id last', () => {
  const arena = arenaOf('a{color:red}');
  const { records, record } = arena;
  const [color] = record.declarationsOf(records);
  const before = declarationKeys(records, record.index);
  const top = freshDeclaration(arena, 'top');
  appendChild(records, record, top);
  assert.equal(declarationKeys(records, record.index), before);
  assert.deepEqual(declarationKeys(records, record.index).keys, [
    color.id,
    top.id,
  ]);
});

test('appendChild of a declaration after an unlink should list the ids without the unlinked one, in a new entry', () => {
  const arena = arenaOf('a{color:red;width:1px}');
  const { records, record } = arena;
  const [color, width] = record.declarationsOf(records);
  const before = declarationKeys(records, record.index);
  records.unlink(color.index);
  const top = freshDeclaration(arena, 'top');
  appendChild(records, record, top);
  const after = declarationKeys(records, record.index);
  assert.notEqual(after, before);
  assert.deepEqual(after.keys, [width.id, top.id]);
});

test('linking a declaration before the last child should list the ids in chain order, in a new entry', () => {
  const arena = arenaOf('a{color:red;width:1px}');
  const { records, record } = arena;
  const [color, width] = record.declarationsOf(records);
  const before = declarationKeys(records, record.index);
  const top = freshDeclaration(arena, 'top');
  records.linkAfter(record.index, color.index, top.index);
  const after = declarationKeys(records, record.index);
  assert.notEqual(after, before);
  assert.deepEqual(after.keys, [color.id, top.id, width.id]);
});

test('takeLinkOf of a declaration of one rule into another should give each rule a new entry after the move', () => {
  const { records, rule } = arenaOf('a{color:red}b{width:1px}');
  const first = ruleRecordOf(records, rule);
  const second = ruleRecordOf(records, rule.next());
  const [color] = first.declarationsOf(records);
  const [width] = second.declarationsOf(records);
  const firstKeys = declarationKeys(records, first.index);
  const secondKeys = declarationKeys(records, second.index);
  records.takeLinkOf(width.index, color.index);
  assert.notEqual(declarationKeys(records, first.index), firstKeys);
  assert.notEqual(declarationKeys(records, second.index), secondKeys);
  assert.deepEqual(declarationKeys(records, first.index).keys, []);
  assert.deepEqual(declarationKeys(records, second.index).keys, [color.id]);
});

test('appendChild of a comment should make the next read return the same entry', () => {
  const { records, record } = arenaOf('a{color:red}');
  const keys = declarationKeys(records, record.index);
  const note = records.bareEntry(
    new NodeEntry(
      postcss.comment({ text: 'c' }),
      COMMENT,
      '',
      '',
      false,
      NO_PRELUDE
    )
  );
  appendChild(records, record, note);
  assert.equal(declarationKeys(records, record.index), keys);
});

test('linking a declaration into a nested rule should keep the declaration keys of the outer rule', () => {
  const { records, rule, record } = arenaOf('a{b{width:1px}}c{top:0}');
  const nested = ruleRecordOf(records, rule.first);
  const [top] = ruleRecordOf(records, rule.next()).declarationsOf(records);
  const keys = declarationKeys(records, record.index);
  records.unlink(top.index);
  records.linkLast(nested.index, top.index);
  assert.equal(declarationKeys(records, record.index), keys);
});
