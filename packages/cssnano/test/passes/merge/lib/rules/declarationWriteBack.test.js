import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { keysOfName } from '../../../../../src/passes/ir/propertyTable.js';
import { DeclarationRecord } from '../../../../../src/passes/ir/declarationRecord.js';
import { declarationsOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { writeBack } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import {
  blockRecordOf,
  buildTestRecords,
  nodesOf,
  ruleRecordOf,
  tokenListsOf,
} from './liveRecords.js';

/** @import {Container, Root} from 'postcss' */
/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js' */

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState, records: BlockRecords}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state, records: state.records };
}

/**
 * Gives a declaration the value `text` and marks it, as a rewrite does.
 *
 * @param {MergeState} state
 * @param {import('../../../../../src/passes/ir/declarationRecord.js').DeclarationRecord} declaration
 * @param {string} text
 * @return {void}
 */
function rewriteValue(state, declaration, text) {
  declaration.valueList = state.runContext.valueIds.idOf(
    tokenListsOf(state.records),
    undefined,
    text
  );
  declaration.marked = true;
}

test('write-back should write the new value of a marked declaration in a plain rule and drop its raw value', () => {
  const { root, state, records } = setup('a{color:red/*x*/;}');
  const rule = ruleRecordOf(records, /** @type {Container} */ (root.first));
  const [color] = declarationsOf(records, rule.index);
  rewriteValue(state, color, 'blue');
  records.touchDeclarations(rule.index);
  const node = /** @type {Container} */ (root.first).first;
  writeBack(records, nodesOf(records), state.tokenLists);
  assert.equal(/** @type {Container} */ (root.first).first, node);
  assert.equal(String(root), 'a{color:blue;}');
});

test('write-back should write the new value of a marked declaration in a nested rule and drop its raw value', () => {
  // The rule `& b` holds a rule, so it nests and write-back visits its children.
  const { root, state, records } = setup(
    'a{& b{color:red/*x*/;& c{width:1px}}}'
  );
  const nested = ruleRecordOf(
    records,
    /** @type {Container} */ (/** @type {Container} */ (root.first).first)
  );
  const [color] = declarationsOf(records, nested.index);
  rewriteValue(state, color, 'blue');
  writeBack(records, nodesOf(records), state.tokenLists);
  assert.equal(String(root), 'a{& b{color:blue;& c{width:1px}}}');
});

test('write-back should write the new value of a marked declaration in an at-rule block and drop its raw value', () => {
  const { root, state, records } = setup('@page{color:red/*x*/;}');
  const block = blockRecordOf(records, root.first);
  const [color] = declarationsOf(records, block.index);
  rewriteValue(state, color, 'blue');
  writeBack(records, nodesOf(records), state.tokenLists);
  assert.equal(String(root), '@page{color:blue;}');
});

test('write-back should write the new value of a marked declaration at the root and drop its raw value', () => {
  const { root, state, records } = setup('color:red/*x*/;');
  const [color] = declarationsOf(records, records.root.index);
  rewriteValue(state, color, 'blue');
  writeBack(records, nodesOf(records), state.tokenLists);
  assert.equal(String(root), 'color:blue;');
});

test('write-back should write the list text of a marked prop-only rewrite, so a plain comment in the value goes', () => {
  const { root, state, records } = setup('a{color:red/*x*/;}');
  const rule = ruleRecordOf(records, /** @type {Container} */ (root.first));
  const [color] = declarationsOf(records, rule.index);
  color.prop = 'background-color';
  color.marked = true;
  records.touchDeclarations(rule.index);
  writeBack(records, nodesOf(records), state.tokenLists);
  assert.equal(String(root), 'a{background-color:red;}');
});

test('write-back should keep the raw value of an unmarked declaration, also in a rule that a removal rebuilt', () => {
  const { root, records, state } = setup('a{color:red/*x*/;width:1px}');
  const rule = ruleRecordOf(records, /** @type {Container} */ (root.first));
  const [, width] = declarationsOf(records, rule.index);
  records.detach(width.index);
  writeBack(records, nodesOf(records), state.tokenLists);
  assert.equal(String(root), 'a{color:red/*x*/}');
});

test('write-back should not write a marked declaration of a plain rule whose declaration stamp was not touched', () => {
  const { root, state, records } = setup('a{color:red/*x*/;}');
  const rule = ruleRecordOf(records, /** @type {Container} */ (root.first));
  const [color] = declarationsOf(records, rule.index);
  rewriteValue(state, color, 'blue');
  writeBack(records, nodesOf(records), state.tokenLists);
  assert.equal(String(root), 'a{color:red/*x*/;}');
});

test('touchDeclarations should move the declaration stamp of a container and not its edit stamp', () => {
  const { root, records } = setup('a{color:red}');
  const rule = ruleRecordOf(records, /** @type {Container} */ (root.first));
  assert.equal(records.declarationStamps.isTouched(rule.index), false);
  records.touchDeclarations(rule.index);
  assert.equal(records.declarationStamps.isTouched(rule.index), true);
  assert.equal(records.links.isEdited(rule.index), false);
});

test('write-back should create a node for an appended declaration with the template source, its before, between and importance', () => {
  const { root, state, records } = setup('a{color:red;\n  width:1px}');
  const rule = ruleRecordOf(records, /** @type {Container} */ (root.first));
  const [color] = declarationsOf(records, rule.index);
  const clone = new DeclarationRecord(
    '\n  ',
    'color',
    state.runContext.valueIds.idOf(tokenListsOf(records), undefined, 'blue'),
    true,
    keysOfName('color'),
    0,
    ': ',
    ' '
  );
  clone.template = color.index;
  records.appendEntry(rule.index, clone);
  records.touchDeclarations(rule.index);
  writeBack(records, nodesOf(records), state.tokenLists);
  const node = /** @type {Container} */ (root.first).last;
  assert.equal(node.type, 'decl');
  assert.equal(node.source, nodesOf(records)[color.index].source);
  assert.equal(node.raws.before, '\n  ');
  assert.equal(node.raws.between, ': ');
  assert.equal(node.value, 'blue');
  assert.equal(node.important, true);
});
