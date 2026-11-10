import { selectorIdsOf } from './selectorIdsOf.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { childCountOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  buildTestRecords,
  claimAt,
  declarationIds,
  ruleRecordOf,
  placeUnlinked,
  nodeOfEntry,
} from './liveRecords.js';
import {
  appendChild,
  moveDeclarations,
  removeDeclarations,
} from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import {
  COMMENT,
  NO_AT_RULE,
  NO_PRELUDE,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';
import { recordDeclaration } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { TokenLists } from '../../../../../src/passes/ir/tokenLists.js';

const selectorIds = new SelectorIds();
const tokenLists = new TokenLists();

/**
 * The records of `css`, built as the run builds them, with the record of its
 * first rule.
 *
 * @param {string} css
 * @return {{records: BlockRecords, rule: import('postcss').Rule, record: RuleRecord}}
 */
const arenaOf = (css, consistencyChecks = false) => {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, consistencyChecks)
  );
  state.records = buildTestRecords(root, state, undefined, consistencyChecks);
  const { records } = state;
  return {
    state,
    records,
    rule: root.first,
    record: ruleRecordOf(records, root.first),
  };
};

/**
 * A merged rule, which the merge links before it takes declarations, as
 * `buildMergedRule` does. It is linked at the end of the stylesheet.
 *
 * @param {BlockRecords} records
 * @return {RuleRecord}
 */
const mergedRule = (records) => {
  const rule = new RuleRecord(selectorIdsOf(selectorIds, tokenLists, ['b']));
  records.appendEntry(records.root.index, rule);
  return rule;
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
  const { records, record } = arenaOf('a{color:red;/* note */width:1px}', true);
  removeDeclarations(records, record.index, claimAt(records, record, [0]));
  assert.equal(record.declarationsOf(records).length, 1);
});

test('removeDeclarations should drop the keys of the removed declarations from the declaration keys', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  removeDeclarations(records, record.index, claimAt(records, record, [0]));
  assert.deepEqual(declarationIds(records, record.index), [width.id]);
});

test('removeDeclarations should throw under checks for an index that a previous removal already took', () => {
  const { records, record } = arenaOf(
    'a{color:red;width:1px;height:2px}',
    true
  );
  const claim = claimAt(records, record, [1]);
  removeDeclarations(records, record.index, claim);
  assert.throws(() => removeDeclarations(records, record.index, claim));
});

test('removeDeclarations should remove the claimed declarations by index, whatever the positions became', () => {
  const { records, record } = arenaOf('a{color:red;margin:0;width:1px;top:0}');
  const [color] = record.declarationsOf(records);
  const claim = claimAt(records, record, [2, 3]);
  records.detach(color.index);
  removeDeclarations(records, record.index, claim);
  assert.deepEqual(
    record.declarationsOf(records).map((declaration) => declaration.prop),
    ['margin']
  );
});

test("moveDeclarations should keep the claimed declarations in their order in the target's chain", () => {
  const { records, record } = arenaOf('a{color:red;width:1px;height:2px}');
  const target = mergedRule(records);
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
  const { records, record } = arenaOf(
    'a{color:red;width:1px;height:2px}',
    true
  );
  const target = mergedRule(records);
  const [color, , height] = record.declarationsOf(records);
  assert.throws(() =>
    moveDeclarations(records, record.index, target.index, [
      height.index,
      color.index,
    ])
  );
});

test('moveDeclarations should leave the taken declaration nodes in the rule until write-back', () => {
  const { records, rule, record } = arenaOf(
    'a{color:red;width:1px;height:2px}'
  );
  const target = mergedRule(records);
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
  const target = mergedRule(records);
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
  const target = mergedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [0, 1]),
  ]);
  assert.equal(childCountOf(records, record.index), 1);
});

test('moveDeclarations should keep the raws.before of a moved declaration', () => {
  const { records, record } = arenaOf('a{\n    color:red;\n    width:1px}');
  const target = mergedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [1]),
  ]);
  const [taken] = target.declarationsOf(records);
  assert.equal(nodeOfEntry(records, taken).raws.before, '\n    ');
});

test('moveDeclarations should drop the keys of the moved declarations from the declaration keys', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  const target = mergedRule(records);
  moveDeclarations(records, record.index, target.index, [
    ...claimAt(records, record, [0]),
  ]);
  assert.deepEqual(declarationIds(records, record.index), [width.id]);
});

test('unlinking a nested rule should keep the declaration keys of its parent, without a rebuild', () => {
  const { records, rule, record } = arenaOf('a{color:red;b{width:1px}}');
  const nested = ruleRecordOf(records, rule.nodes[1]);
  const kept = declarationKeys(records, record.index);
  records.detach(nested.index);
  assert.equal(declarationKeys(records, record.index), kept);
});

test('linking a nested rule into its parent should keep the declaration keys of the parent, without a rebuild', () => {
  const { records, rule, record } = arenaOf(
    'a{color:red;c{top:0}}b{width:1px}'
  );
  const sibling = ruleRecordOf(records, rule.next());
  const kept = declarationKeys(records, record.index);
  records.detach(sibling.index);
  records.moveLast(record.index, sibling.index);
  assert.equal(declarationKeys(records, record.index), kept);
});

test('unlinking a declaration should clear the declaration keys of its parent, which then list the rest', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [, width] = record.declarationsOf(records);
  const kept = declarationKeys(records, record.index);
  records.detach(record.declarationsOf(records)[0].index);
  assert.notEqual(declarationKeys(records, record.index), kept);
  assert.deepEqual(declarationIds(records, record.index), [width.id]);
});

/**
 * A declaration of `css` that no rule holds yet, built as a block child.
 *
 * @param {ReturnType<typeof arenaOf>} arena
 * @param {string} prop
 * @return {import('../../../../../src/passes/ir/declarationRecord.js').DeclarationRecord}
 */
const freshDeclaration = ({ state, records }, prop) =>
  placeUnlinked(
    records,
    records.root.index,
    recordDeclaration(postcss.decl({ prop, value: '0' }), state.declarationIds)
  );

test('appendChild of a declaration should keep the entry of the rule and list the appended id last', () => {
  const arena = arenaOf('a{color:red}');
  const { records, record } = arena;
  const [color] = record.declarationsOf(records);
  const before = declarationKeys(records, record.index);
  const top = freshDeclaration(arena, 'top');
  appendChild(records, record, top);
  assert.equal(declarationKeys(records, record.index), before);
  assert.deepEqual(declarationIds(records, record.index), [color.id, top.id]);
});

test('appendChild of a declaration after an unlink should list the ids without the unlinked one, in a new entry', () => {
  const arena = arenaOf('a{color:red;width:1px}');
  const { records, record } = arena;
  const [color, width] = record.declarationsOf(records);
  const before = declarationKeys(records, record.index);
  records.detach(color.index);
  const top = freshDeclaration(arena, 'top');
  appendChild(records, record, top);
  const after = declarationKeys(records, record.index);
  assert.notEqual(after, before);
  assert.deepEqual(declarationIds(records, record.index), [width.id, top.id]);
});

test('linking a declaration before the last child should list the ids in chain order, in a new entry', () => {
  const arena = arenaOf('a{color:red;width:1px}');
  const { records, record } = arena;
  const [color, width] = record.declarationsOf(records);
  const before = declarationKeys(records, record.index);
  const top = freshDeclaration(arena, 'top');
  records.moveBefore(width.index, top.index);
  const after = declarationKeys(records, record.index);
  assert.notEqual(after, before);
  assert.deepEqual(declarationIds(records, record.index), [
    color.id,
    top.id,
    width.id,
  ]);
});

test('moveBefore of a declaration of one rule into another should give each rule a new entry after the move', () => {
  const { records, rule } = arenaOf('a{color:red}b{width:1px}');
  const first = ruleRecordOf(records, rule);
  const second = ruleRecordOf(records, rule.next());
  const [color] = first.declarationsOf(records);
  const [width] = second.declarationsOf(records);
  const firstKeys = declarationKeys(records, first.index);
  const secondKeys = declarationKeys(records, second.index);
  records.moveBefore(width.index, color.index);
  records.detach(width.index);
  assert.notEqual(declarationKeys(records, first.index), firstKeys);
  assert.notEqual(declarationKeys(records, second.index), secondKeys);
  assert.deepEqual(declarationIds(records, first.index), []);
  assert.deepEqual(declarationIds(records, second.index), [color.id]);
});

test('appendChild of a comment should make the next read return the same entry', () => {
  const { records, record } = arenaOf('a{color:red}');
  const keys = declarationKeys(records, record.index);
  const note = placeUnlinked(
    records,
    records.root.index,
    new NodeEntry(COMMENT, '', NO_AT_RULE, '', '', false, NO_PRELUDE)
  );
  appendChild(records, record, note);
  assert.equal(declarationKeys(records, record.index), keys);
});

test('linking a declaration into a nested rule should keep the declaration keys of the outer rule', () => {
  const { records, rule, record } = arenaOf('a{b{width:1px}}c{top:0}');
  const nested = ruleRecordOf(records, rule.first);
  const [top] = ruleRecordOf(records, rule.next()).declarationsOf(records);
  const keys = declarationKeys(records, record.index);
  records.detach(top.index);
  records.moveLast(nested.index, top.index);
  assert.equal(declarationKeys(records, record.index), keys);
});
