import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  COMMENT,
  CONDITIONAL_GROUP,
  IMPORT,
  KEYFRAMES,
  LAYER,
  NO_PRELUDE,
  OTHER_AT_RULE,
  RULE,
  STYLESHEET,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import {
  blockRecordOf,
  buildTestRecords,
  entryOf,
  ruleRecordOf,
} from './liveRecords.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/**
 * The records of `css`, with the first child of the stylesheet and the root.
 *
 * @param {string} css
 * @return {{root: import('postcss').Root, records: import('../../../../../src/passes/merge/lib/rules/blockRecords.js').BlockRecords}}
 */
function recordsOf(css) {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, records: state.records };
}

test('an at-rule block record takes the kind of its folded name', () => {
  const { root, records } = recordsOf('@MEDIA print{a{color:red}}');
  assert.equal(
    blockRecordOf(records, root.first).atRuleKind,
    CONDITIONAL_GROUP
  );
  assert.equal(blockRecordOf(records, root.first).name, 'media');
});

test('a vendor-prefixed keyframes block is keyframes', () => {
  const { root, records } = recordsOf('@-webkit-keyframes x{from{top:0}}');
  assert.equal(blockRecordOf(records, root.first).atRuleKind, KEYFRAMES);
});

test('an at-rule whose name spells keyframes with a Kelvin sign is not keyframes', () => {
  // U+212A KELVIN SIGN folds to k under Unicode case mapping, but not under ASCII folding.
  const kelvin = String.fromCodePoint(0x212a);
  const { root, records } = recordsOf(`@${kelvin}eyframes x{from{top:0}}`);
  assert.equal(blockRecordOf(records, root.first).atRuleKind, OTHER_AT_RULE);
});

test('a statement at-rule takes the kind of an import', () => {
  const { root, records } = recordsOf('@import "x.css";');
  assert.equal(entryOf(records, root.first).atRuleKind, IMPORT);
});

test('a comment entry holds the neutral facts of a comment', () => {
  const { root, records } = recordsOf('/* c */');
  const entry = entryOf(records, root.first);
  assert.equal(entry.kind, COMMENT);
  assert.equal(entry.name, '');
  assert.equal(entry.params, '');
  assert.equal(entry.anonymous, false);
  assert.equal(entry.preludeId, NO_PRELUDE);
});

test('a rule record and the stylesheet hold the neutral facts of their kinds', () => {
  const { root, records } = recordsOf('a{color:red}');
  const rule = ruleRecordOf(records, root.first);
  assert.equal(rule.kind, RULE);
  assert.equal(rule.name, '');
  assert.equal(rule.params, '');
  assert.equal(rule.preludeId, NO_PRELUDE);
  assert.equal(records.root.kind, STYLESHEET);
  assert.equal(records.root.name, '');
  assert.equal(records.root.params, '');
});

test('an anonymous layer block is not droppable, and a named layer block is', () => {
  const { root, records } = recordsOf(
    '@layer {a{color:red}}@layer x{a{color:red}}'
  );
  const anonymous = blockRecordOf(records, root.first);
  const named = blockRecordOf(records, root.last);
  assert.equal(anonymous.atRuleKind, LAYER);
  assert.equal(anonymous.anonymous, true);
  assert.equal(anonymous.droppable, false);
  assert.equal(named.anonymous, false);
  assert.equal(named.droppable, true);
});

test('a prelude id ignores the whitespace before the at-rule', () => {
  const { root, records } = recordsOf('\na{}\n@media x{}@media x{}');
  const [, first, second] = root.nodes;
  assert.equal(
    entryOf(records, first).preludeId,
    entryOf(records, second).preludeId
  );
});

test('a prelude id differs when a comment follows the at-rule name', () => {
  const { root, records } = recordsOf('@media/*c*/x{}@media x{}');
  const [first, second] = root.nodes;
  assert.notEqual(
    entryOf(records, first).preludeId,
    entryOf(records, second).preludeId
  );
});

test('a prelude id differs when a stray semicolon precedes the at-rule', () => {
  const { root, records } = recordsOf(';@media x{}@media x{}');
  const [first, second] = root.nodes;
  assert.notEqual(
    entryOf(records, first).preludeId,
    entryOf(records, second).preludeId
  );
});

test('a prelude id differs when the params differ', () => {
  const { root, records } = recordsOf('@media x{}@media y{}');
  const [first, second] = root.nodes;
  assert.notEqual(
    entryOf(records, first).preludeId,
    entryOf(records, second).preludeId
  );
});

test('the tree check throws when an at-rule record names another at-rule than its node', () => {
  const { root, records } = recordsOf('@media print{a{color:red}}');
  root.first.name = 'supports';
  assert.throws(() => assertRecordsMatchTree(records));
});

/**
 * A stylesheet built through the PostCSS API, whose nodes have no
 * `raws.before`, so the printer infers their whitespace.
 *
 * @return {{root: import('postcss').Root, records: import('../../../../../src/passes/merge/lib/rules/blockRecords.js').BlockRecords}}
 */
function recordsOfBuiltTree() {
  const root = postcss.root();
  root.append(
    postcss
      .rule({ selector: 'a' })
      .append(postcss.decl({ prop: 'color', value: 'red' })),
    postcss
      .atRule({ name: 'media', params: 'print' })
      .append(postcss.rule({ selector: 'b' })),
    postcss.atRule({ name: 'import', params: '"x.css"' }),
    postcss.comment({ text: 'c' })
  );
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, records: state.records };
}

test('every record of a node without raws.before holds null, so write-back leaves the inferred whitespace alone', () => {
  const { root, records } = recordsOfBuiltTree();
  const [rule, media, statement, comment] = root.nodes;
  assert.deepEqual(
    [
      ruleRecordOf(records, rule).before,
      ruleRecordOf(records, rule).declarationsOf(records)[0].before,
      blockRecordOf(records, media).before,
      entryOf(records, statement).before,
      entryOf(records, comment).before,
    ],
    [null, null, null, null, null]
  );
});

test('the stylesheet holds null as its leading whitespace when its first child has no raws.before', () => {
  const { records } = recordsOfBuiltTree();
  assert.equal(records.root.leadingWhitespace, null);
});

test('an empty stylesheet holds null as its leading whitespace', () => {
  const { records } = recordsOf('');
  assert.equal(records.root.leadingWhitespace, null);
});
