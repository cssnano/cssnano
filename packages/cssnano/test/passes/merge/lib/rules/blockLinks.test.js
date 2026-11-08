import {
  firstDeclaration,
  childNodesOf,
  nextDeclaration,
} from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import {
  COMMENT,
  NO_PRELUDE,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import { DeclarationKeys } from '../../../../../src/passes/ir/declarationKey.js';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';

import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  ruleRecordOf,
  blockRecordOf,
  buildTestRecords,
} from './liveRecords.js';
import { adopt } from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {Container, Root, Rule} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: Root, records: BlockRecords}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  return { root, records: state.records };
}

test('block should throw under checks when the entry is a declaration', () => {
  const { root, records } = setup('@media print{color:red}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const declaration = records.links.firstChild(media.index);
  assert.throws(() => records.block(declaration), /not a block/v);
});

test('block should still answer undefined for the -1 that no block has', () => {
  const { records } = setup('a{color:red}');
  assert.equal(records.block(-1), undefined);
});

test('prevSibling should throw under checks when the entry is linked nowhere', () => {
  const { root, records } = setup('@media print{a{color:red}b{width:1px}}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first.first));
  records.unlink(rule.index);
  assert.throws(() => records.links.prevSibling(rule.index), /unlinked/v);
});

test('nextSibling should throw under checks when the entry is linked nowhere', () => {
  const { root, records } = setup('@media print{a{color:red}b{width:1px}}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first.first));
  records.unlink(rule.index);
  assert.throws(() => records.links.nextSibling(rule.index), /unlinked/v);
});

test('enclosingContainer should be undefined for the stylesheet, which has no container', () => {
  const { records } = setup('a{color:red}');
  assert.equal(records.enclosingContainer(records.root.index), undefined);
});

test('enclosingContainer should give the stylesheet for a block at the root', () => {
  const { root, records } = setup('@media print{a{color:red}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  assert.equal(records.enclosingContainer(media.index), records.root);
});

test('enclosingContainer should give the at-rule block that holds an at-rule block', () => {
  const { root, records } = setup('@media (x){@media (y){a{color:red}}}');
  const outer = blockRecordOf(records, /** @type {Container} */ (root.first));
  const inner = blockRecordOf(
    records,
    /** @type {Container} */ (root.first.first)
  );
  assert.equal(records.enclosingContainer(inner.index), outer);
});

test('enclosingContainer should give the rule that nests the rule, and the block that holds that rule', () => {
  const { root, records } = setup('@media (x){a{color:red;b{width:1px}}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const outer = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  const inner = ruleRecordOf(
    records,
    /** @type {Rule} */ (outer.node.nodes[1])
  );
  assert.equal(records.enclosingContainer(inner.index), outer);
  assert.equal(records.enclosingContainer(outer.index), media);
});

test('childCount should count a comment linked into a block', () => {
  const { root, records } = setup('@media print{a{color:red}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const comment = records.bareEntry(
    new NodeEntry(
      postcss.comment({ text: 'c' }),
      COMMENT,
      '',
      '',
      false,
      NO_PRELUDE
    )
  );
  records.linkLast(media.index, comment.index);
  assert.equal(records.links.childCount(media.index), 2);
});

test('childCount should drop by one when a rule is unlinked from its block', () => {
  const { root, records } = setup('@media print{a{color:red}b{width:1px}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const rule = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  records.unlink(rule.index);
  assert.equal(records.links.childCount(media.index), 1);
});

test('childCount should move with an entry that takeLinkOf puts in another block', () => {
  const { root, records } = setup('@media print{a{color:red}}/* c */');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const rule = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  // The comment follows the at-rule in the root's chain.
  const comment = records.links.nextSibling(media.index);
  assert.equal(records.links.childCount(records.root.index), 2);
  records.takeLinkOf(rule.index, comment);
  assert.equal(records.links.childCount(media.index), 1);
  assert.equal(records.links.childCount(records.root.index), 1);
});

test('childCount should give the whole chain to the target and nothing to the source of adopt', () => {
  const { root, records } = setup(
    '@media x{a{color:red}}@media y{b{width:1px}c{height:1px}}'
  );
  const [first, second] = root.nodes;
  const target = blockRecordOf(records, /** @type {Container} */ (first));
  const source = blockRecordOf(records, /** @type {Container} */ (second));
  adopt(records, target.index, source.index);
  assert.equal(records.links.childCount(target.index), 3);
  assert.equal(records.links.childCount(source.index), 0);
});

test('linkLast should throw under checks when a rule is linked into a rule that holds no rules', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const plain = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  const other = ruleRecordOf(records, /** @type {Rule} */ (root.last));
  assert.throws(
    () => records.linkLast(plain.index, other.index),
    /holds no rules/v
  );
});

test('declarationKeys should list a declaration that linkAfter puts in the middle of a rule in its new place', () => {
  const { root, records } = setup('a{color:red;top:0}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  const [color] = rule.declarationsOf(records);
  const width = records.blockDeclaration(
    postcss.decl({ prop: 'width', value: '1px' }),
    new PropertyTable(),
    new DeclarationKeys()
  );
  records.linkAfter(rule.index, color.index, width.index);
  assert.deepEqual(
    rule.declarationsOf(records).map((declaration) => declaration.prop),
    ['color', 'width', 'top']
  );
});

test('declarationsOf should list the declaration that linkLast appends to its rule, after the declarations it held', () => {
  const { root, records } = setup('a{color:red}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  declarationKeys(records, rule.index);
  const top = records.blockDeclaration(
    postcss.decl({ prop: 'top', value: '0' }),
    new PropertyTable(),
    new DeclarationKeys()
  );
  records.linkLast(rule.index, top.index);
  assert.deepEqual(
    rule.declarationsOf(records).map((declaration) => declaration.prop),
    ['color', 'top']
  );
});

test('firstDeclaration and nextDeclaration should walk a declaration that linkAfter puts in the middle of a rule in its new place', () => {
  const { root, records } = setup('a{color:red;top:0}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  const color = firstDeclaration(records, rule.index);
  const width = records.blockDeclaration(
    postcss.decl({ prop: 'width', value: '1px' }),
    new PropertyTable(),
    new DeclarationKeys()
  );
  records.linkAfter(rule.index, color.index, width.index);
  const props = [];
  for (
    let declaration = firstDeclaration(records, rule.index);
    declaration !== undefined;
    declaration = nextDeclaration(records, declaration)
  ) {
    props.push(declaration.prop);
  }
  assert.deepEqual(props, ['color', 'width', 'top']);
});

test('declarationKeys should list the ids in their new order after linkAfter puts a declaration in the middle of a rule', () => {
  const { root, records } = setup('a{color:red;top:0}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  const [color, top] = rule.declarationsOf(records);
  declarationKeys(records, rule.index);
  const width = records.blockDeclaration(
    postcss.decl({ prop: 'width', value: '1px' }),
    new PropertyTable(),
    new DeclarationKeys()
  );
  records.linkAfter(rule.index, color.index, width.index);
  assert.deepEqual(declarationKeys(records, rule.index).keys, [
    color.id,
    width.id,
    top.id,
  ]);
});

/**
 * @param {BlockRecords} records
 * @param {number} index a container
 * @return {string[]} the children of the container at `index`, as their text
 */
function chainText(records, index) {
  return childNodesOf(records, index).map((node) => node.toString());
}

test('takeLinkOf should move an entry of another container into the chain of the later entry, under checks', () => {
  const { root, records } = setup(
    '@media x{a{color:red}}@media y{b{width:1px}}'
  );
  const [x, y] = /** @type {Container[]} */ (root.nodes).map((node) =>
    blockRecordOf(records, node)
  );
  const earlier = ruleRecordOf(records, /** @type {Rule} */ (x.node.first));
  const later = ruleRecordOf(records, /** @type {Rule} */ (y.node.first));
  records.takeLinkOf(later.index, earlier.index);
  assert.deepEqual(chainText(records, x.index), []);
  assert.deepEqual(chainText(records, y.index), ['a{color:red}']);
  assert.equal(records.links.childCount(x.index), 0);
  assert.equal(records.links.childCount(y.index), 1);
});

test('takeLinkOf should put an earlier sibling where the later one stood, when it is directly before it', () => {
  const { root, records } = setup(
    '@media p{a{color:red}b{width:1px}c{height:1px}}'
  );
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const earlier = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  const later = ruleRecordOf(
    records,
    /** @type {Rule} */ (media.node.nodes[1])
  );
  records.takeLinkOf(later.index, earlier.index);
  assert.deepEqual(chainText(records, media.index), [
    'a{color:red}',
    'c{height:1px}',
  ]);
  assert.equal(records.links.childCount(media.index), 2);
});

test('takeLinkOf should put an earlier sibling where the later one stood, when an entry lies between them', () => {
  const { root, records } = setup(
    '@media p{a{color:red}m{margin:0}b{width:1px}}'
  );
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const earlier = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  const later = ruleRecordOf(
    records,
    /** @type {Rule} */ (media.node.nodes[2])
  );
  records.takeLinkOf(later.index, earlier.index);
  assert.deepEqual(chainText(records, media.index), [
    'm{margin:0}',
    'a{color:red}',
  ]);
  assert.equal(records.links.childCount(media.index), 2);
});

test('takeLinkOf should make the earlier sibling the last entry when the later one was last, and it lies directly before it', () => {
  const { root, records } = setup(
    '@media p{m{margin:0}a{color:red}b{width:1px}}'
  );
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const earlier = ruleRecordOf(
    records,
    /** @type {Rule} */ (media.node.nodes[1])
  );
  const later = ruleRecordOf(
    records,
    /** @type {Rule} */ (media.node.nodes[2])
  );
  records.takeLinkOf(later.index, earlier.index);
  assert.deepEqual(chainText(records, media.index), [
    'm{margin:0}',
    'a{color:red}',
  ]);
  assert.equal(records.links.childCount(media.index), 2);
  assert.equal(records.links.lastChild(media.index), earlier.index);
});

test('takeLinkOf should put an unlinked earlier entry where the later one stood', () => {
  const { root, records } = setup(
    '@media p{a{color:red}b{width:1px}c{height:1px}}'
  );
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const earlier = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  const later = ruleRecordOf(
    records,
    /** @type {Rule} */ (media.node.nodes[1])
  );
  records.unlink(earlier.index);
  records.takeLinkOf(later.index, earlier.index);
  assert.deepEqual(chainText(records, media.index), [
    'a{color:red}',
    'c{height:1px}',
  ]);
  assert.equal(records.links.childCount(media.index), 2);
});

test('rule should throw under checks for a rule that nests and was unlinked without being departed', () => {
  const { root, records } = setup('r{a{color:red}}');
  const outer = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  records.unlink(outer.index);
  assert.throws(() => records.rule(outer.index), /does not reach/v);
});
