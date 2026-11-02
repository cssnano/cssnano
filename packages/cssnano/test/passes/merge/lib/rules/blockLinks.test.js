import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import { DeclarationKeys } from '../../../../../src/passes/ir/declarationKey.js';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';

import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { ruleRecordOf, blockRecordOf } from './liveRecords.js';

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
  state.records = buildRecords(root, state);
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
  records.links.unlink(rule.index);
  assert.throws(() => records.links.prevSibling(rule.index), /unlinked/v);
});

test('nextSibling should throw under checks when the entry is linked nowhere', () => {
  const { root, records } = setup('@media print{a{color:red}b{width:1px}}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first.first));
  records.links.unlink(rule.index);
  assert.throws(() => records.links.nextSibling(rule.index), /unlinked/v);
});

test('enclosingContainer should be undefined for the stylesheet, which has no container', () => {
  const { records } = setup('a{color:red}');
  assert.equal(records.links.enclosingContainer(records.root.index), undefined);
});

test('enclosingContainer should give the stylesheet for a block at the root', () => {
  const { root, records } = setup('@media print{a{color:red}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  assert.equal(records.links.enclosingContainer(media.index), records.root);
});

test('enclosingContainer should give the at-rule block that holds an at-rule block', () => {
  const { root, records } = setup('@media (x){@media (y){a{color:red}}}');
  const outer = blockRecordOf(records, /** @type {Container} */ (root.first));
  const inner = blockRecordOf(
    records,
    /** @type {Container} */ (root.first.first)
  );
  assert.equal(records.links.enclosingContainer(inner.index), outer);
});

test('enclosingContainer should give the rule that nests the rule, and the block that holds that rule', () => {
  const { root, records } = setup('@media (x){a{color:red;b{width:1px}}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const outer = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  const inner = ruleRecordOf(
    records,
    /** @type {Rule} */ (outer.node.nodes[1])
  );
  assert.equal(records.links.enclosingContainer(inner.index), outer);
  assert.equal(records.links.enclosingContainer(outer.index), media);
});

test('liveCount should count a comment linked into a block', () => {
  const { root, records } = setup('@media print{a{color:red}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const comment = records.bareEntry(postcss.comment({ text: 'c' }));
  records.links.linkLast(media.index, comment.index);
  assert.equal(records.liveCount(media.index), 2);
});

test('liveCount should drop by one when a rule is unlinked from its block', () => {
  const { root, records } = setup('@media print{a{color:red}b{width:1px}}');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const rule = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  records.links.unlink(rule.index);
  assert.equal(records.liveCount(media.index), 1);
});

test('liveCount should move with an entry that takeLinkOf puts in another block', () => {
  const { root, records } = setup('@media print{a{color:red}}/* c */');
  const media = blockRecordOf(records, /** @type {Container} */ (root.first));
  const rule = ruleRecordOf(records, /** @type {Rule} */ (media.node.first));
  // The comment follows the at-rule in the root's chain.
  const comment = records.links.nextSibling(media.index);
  assert.equal(records.liveCount(records.root.index), 2);
  records.links.takeLinkOf(rule.index, comment);
  assert.equal(records.liveCount(media.index), 1);
  assert.equal(records.liveCount(records.root.index), 1);
});

test('liveCount should give the whole chain to the target and nothing to the source of adopt', () => {
  const { root, records } = setup(
    '@media x{a{color:red}}@media y{b{width:1px}c{height:1px}}'
  );
  const [first, second] = root.nodes;
  const target = blockRecordOf(records, /** @type {Container} */ (first));
  const source = blockRecordOf(records, /** @type {Container} */ (second));
  records.adopt(target.index, source.index);
  assert.equal(records.liveCount(target.index), 3);
  assert.equal(records.liveCount(source.index), 0);
});

test('linkLast should throw under checks when a rule is linked into a rule that holds no rules', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const plain = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  const other = ruleRecordOf(records, /** @type {Rule} */ (root.last));
  assert.throws(
    () => records.links.linkLast(plain.index, other.index),
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
  records.links.linkAfter(rule.index, color.index, width.index);
  assert.deepEqual(
    rule.declarationsOf(records).map((declaration) => declaration.prop),
    ['color', 'width', 'top']
  );
});

test('declarationsOf should list the declaration that linkLast appends to its rule, after the declarations it held', () => {
  const { root, records } = setup('a{color:red}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  rule.declarationKeys(records);
  const top = records.blockDeclaration(
    postcss.decl({ prop: 'top', value: '0' }),
    new PropertyTable(),
    new DeclarationKeys()
  );
  records.links.linkLast(rule.index, top.index);
  assert.deepEqual(
    rule.declarationsOf(records).map((declaration) => declaration.prop),
    ['color', 'top']
  );
});

test('firstDeclaration and nextDeclaration should walk a declaration that linkAfter puts in the middle of a rule in its new place', () => {
  const { root, records } = setup('a{color:red;top:0}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  const color = records.links.firstDeclaration(rule.index);
  const width = records.blockDeclaration(
    postcss.decl({ prop: 'width', value: '1px' }),
    new PropertyTable(),
    new DeclarationKeys()
  );
  records.links.linkAfter(rule.index, color.index, width.index);
  const props = [];
  for (
    let declaration = records.links.firstDeclaration(rule.index);
    declaration !== undefined;
    declaration = records.links.nextDeclaration(declaration)
  ) {
    props.push(declaration.prop);
  }
  assert.deepEqual(props, ['color', 'width', 'top']);
});

test('declarationKeys should list the ids in their new order after linkAfter puts a declaration in the middle of a rule', () => {
  const { root, records } = setup('a{color:red;top:0}');
  const rule = ruleRecordOf(records, /** @type {Rule} */ (root.first));
  const [color, top] = rule.declarationsOf(records);
  rule.declarationKeys(records);
  const width = records.blockDeclaration(
    postcss.decl({ prop: 'width', value: '1px' }),
    new PropertyTable(),
    new DeclarationKeys()
  );
  records.links.linkAfter(rule.index, color.index, width.index);
  assert.deepEqual(rule.declarationKeys(records).keys, [
    color.id,
    width.id,
    top.id,
  ]);
});
