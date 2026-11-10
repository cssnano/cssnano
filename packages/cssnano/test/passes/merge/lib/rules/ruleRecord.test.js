import {
  elementKeyOfIds,
  selectorIdsOf,
  tokenListsOfIds,
} from './selectorIdsOf.js';
import { tokensText } from '../../../../../src/values/tokensText.js';
import {
  childCountOf,
  holdsOnlyDeclarationsOf,
} from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import {
  COMMENT,
  NO_AT_RULE,
  NO_PRELUDE,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { isDeclarationRule } from '../../../../../src/passes/merge/lib/rules/declarationJoin.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/treeMatch.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { nodeOf } from '../../../../../src/passes/merge/lib/rules/nodeTable.js';
import {
  buildTestRecords,
  claimAt,
  declarationIds,
  ruleRecordOf,
  placeUnlinked,
  nodesOf,
  tokenListsOf,
} from './liveRecords.js';
import {
  appendChild,
  removeDeclarations,
} from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { recordDeclaration } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

const lookup = () => ({});
const selectorIds = new SelectorIds();
const keyOf = elementKeyOfIds(selectorIds);

/** A record of `selectors`, with the ids of this file's interner. */
const ruleOf = (selectors, selector) =>
  new RuleRecord(selectors, selector, selectorIdsOf(selectorIds, selectors));
/** The facts of the ids of this file's interner: `b` is incompatible. */
const lookupB = (id) => ({
  compatible: tokensText(tokenListsOfIds(selectorIds).get(id)) !== 'b',
});

/**
 * The records of `css`, built as the run builds them, with the record of its
 * first rule.
 *
 * @param {string} css
 * @return {{state: MergeState, records: BlockRecords, record: RuleRecord}}
 */
const arenaOf = (css, consistencyChecks = false) => {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, consistencyChecks)
  );
  state.records = buildTestRecords(root, state, undefined, consistencyChecks);
  const { records } = state;
  return { state, records, record: ruleRecordOf(records, root.first) };
};

/**
 * A declaration record for `node`, placed in the arena of `state`, unlinked.
 *
 * @param {MergeState} state
 * @param {import('postcss').Declaration} node
 */
const declarationOf = (state, node) =>
  placeUnlinked(
    state.records,
    state.records.root.index,
    recordDeclaration(node, state.declarationIds)
  );

test('compatible should look up each selector once across repeated reads', () => {
  const record = ruleOf(['a', 'b']);
  const looked = [];
  const lookupOnce = (id) => {
    looked.push(id);
    return { compatible: true };
  };
  record.compatible(lookupOnce);
  record.compatible(lookupOnce);
  assert.deepEqual(looked, record.selectorIds);
});

test('compatible should be false once addSelectors adds an incompatible selector', () => {
  const record = ruleOf(['a']);
  assert.equal(record.compatible(lookupB), true);
  record.addSelectors(['b'], selectorIdsOf(selectorIds, ['b']), lookupB, keyOf);
  assert.equal(record.compatible(lookupB), false);
});

test('compatible should be false after absorbEarlier takes an incompatible earlier rule', () => {
  const later = ruleOf(['a']);
  const earlier = ruleOf(['b']);
  later.absorbEarlier(earlier, lookupB, keyOf);
  assert.equal(later.compatible(lookupB), false);
});

test('hasSameSelectors should be false after addSelectors grows one of two equal lists', () => {
  const a = ruleOf(['.a']);
  const b = ruleOf(['.a']);
  assert.equal(a.hasSameSelectors(b), true);
  a.addSelectors(['.b'], selectorIdsOf(selectorIds, ['.b']), lookup, keyOf);
  assert.equal(a.hasSameSelectors(b), false);
});

test('a rule placed after the build has no node in the table until write-back', () => {
  const { state } = arenaOf('a{}');
  const { index } = placeUnlinked(
    state.records,
    state.records.root.index,
    ruleOf(['b'], 'b')
  );
  assert.equal(nodeOf(nodesOf(state.records), index), undefined);
});

test('declarationKeys should list the id of each declaration in order', () => {
  const { records, record } = arenaOf('a{color:red;top:0}');
  const [color, top] = record.declarationsOf(records);
  assert.deepEqual(declarationIds(records, record.index), [color.id, top.id]);
});

test('declarationKeys should offer the same keys as a set for membership tests', () => {
  const { records, record } = arenaOf('a{color:red;top:0}');
  assert.deepEqual(
    declarationKeys(records, record.index).keySet,
    new Set(record.declarationsOf(records).map((declaration) => declaration.id))
  );
});

test('declarationKeys should return the cached keys while the declarations are unchanged', () => {
  const { records, record } = arenaOf('a{color:red}');
  assert.equal(
    declarationKeys(records, record.index),
    declarationKeys(records, record.index)
  );
});

test('appendChild should make declarationKeys reflect the appended declaration', () => {
  const { state, records, record } = arenaOf('a{color:red}');
  declarationKeys(records, record.index);
  appendChild(
    records,
    record,
    declarationOf(state, postcss.decl({ prop: 'top', value: '0' }))
  );
  assert.deepEqual(
    declarationIds(records, record.index),
    record.declarationsOf(records).map((declaration) => declaration.id)
  );
  assert.equal(record.declarationsOf(records).length, 2);
});

test('addSelectors should keep the cached declaration keys since it leaves the declarations alone', () => {
  const { records, record } = arenaOf('a{color:red}');
  const keys = declarationKeys(records, record.index);
  record.addSelectors(['b'], selectorIdsOf(selectorIds, ['b']), lookup, keyOf);
  assert.equal(declarationKeys(records, record.index), keys);
});

test('absorbEarlier should keep the cached declaration keys since it leaves the declarations alone', () => {
  const { records, record } = arenaOf('b{color:red}');
  const earlier = arenaOf('a{color:red}').record;
  const keys = declarationKeys(records, record.index);
  record.absorbEarlier(earlier, lookup, keyOf);
  assert.equal(declarationKeys(records, record.index), keys);
});

test('childCount should count a comment that a rule holds, which declarations leave out', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(childCountOf(records, record.index), 2);
});

test('declarations should leave out a comment that a rule holds', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(record.declarationsOf(records).length, 1);
});

test('holdsOnlyDeclarations should be false for a rule that holds a comment', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(holdsOnlyDeclarationsOf(records, record.index), false);
});

test('holdsOnlyDeclarations should be true for an empty rule so that empty rules still join', () => {
  const { records, record } = arenaOf('a{}');
  assert.equal(holdsOnlyDeclarationsOf(records, record.index), true);
});

test('isDeclarationRule should reject an empty rule, which holds no declaration to share', () => {
  const { records, record } = arenaOf('a{}');
  assert.equal(isDeclarationRule(records, record), false);
});

test('isDeclarationRule should reject a rule that holds a comment', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(isDeclarationRule(records, record), false);
});

test('isDeclarationRule should accept a rule that holds only declarations', () => {
  const { records, record } = arenaOf('a{color:red}');
  assert.equal(isDeclarationRule(records, record), true);
});

test('appendChild should add a declaration to the declarations of a rule that holds a comment', () => {
  const { state, records, record } = arenaOf('a{/* note */color:red}');
  appendChild(
    records,
    record,
    declarationOf(state, postcss.decl({ prop: 'width', value: '1px' }))
  );
  assert.equal(record.declarationsOf(records).length, 2);
});

test('appendChild should count an appended comment among the children without adding a declaration', () => {
  const { state, records, record } = arenaOf('a{color:red}');
  appendChild(
    records,
    record,
    placeUnlinked(
      state.records,
      state.records.root.index,
      new NodeEntry(COMMENT, '', NO_AT_RULE, '', '', false, NO_PRELUDE)
    )
  );
  assert.equal(childCountOf(records, record.index), 2);
  assert.equal(record.declarationsOf(records).length, 1);
});

test('appendChild should keep the declarations in step with the children under consistency checks', () => {
  const { state, records, record } = arenaOf('a{/* note */color:red}', true);
  appendChild(
    records,
    record,
    declarationOf(state, postcss.decl({ prop: 'width', value: '1px' }))
  );
  assert.equal(record.declarationsOf(records).length, 2);
});

test('declarations should read the records under consistency checks, before write-back brings the node in step', () => {
  const { records, record } = arenaOf('a{color:red}', true);
  removeDeclarations(records, record.index, claimAt(records, record, [0]));
  assert.equal(record.declarationsOf(records).length, 0);
});

test('assertRecordsMatchTree should throw under consistency checks when a comment was added to the node without the record', () => {
  const root = postcss.parse('a{color:red}');
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(root, state, undefined, true);
  root.first.append(postcss.comment({ text: 'note' }));
  assert.throws(
    () =>
      assertRecordsMatchTree(
        state.records,
        nodesOf(state.records),
        tokenListsOf(state.records)
      ),
    /out of step/v
  );
});

test('appendChild should give an appended declaration without raws.before the whitespace of the last child', () => {
  const { state, records, record } = arenaOf('a{\n  color:red}');
  const node = postcss.decl({ prop: 'width', value: '1px' });
  const declaration = declarationOf(state, node);
  appendChild(records, record, declaration);
  assert.equal(declaration.before, '\n  ');
});

test('appendChild should leave the whitespace of a declaration appended to a rule with no children unset', () => {
  const { state, records, record } = arenaOf('a{}');
  const node = postcss.decl({ prop: 'width', value: '1px' });
  const declaration = declarationOf(state, node);
  appendChild(records, record, declaration);
  assert.equal(declaration.before, null);
});
