import { declarationsOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { selectorIdsOf } from './selectorIdsOf.js';

import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';

import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { nodeOf } from '../../../../../src/passes/merge/lib/rules/nodeTable.js';
import {
  buildTestRecords,
  declarationIds,
  ruleRecordOf,
  placeUnlinked,
  nodesOf,
} from './liveRecords.js';
import { appendChild } from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { recordDeclaration } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';
import {
  absorbEarlier,
  addSelectors,
} from '../../../../../src/passes/merge/lib/rules/selectorList.js';
import {
  compatibleOf,
  hasSameSelectors,
} from '../../../../../src/passes/merge/lib/rules/selectorReads.js';
import { foldedRules } from './summaryFixtures.js';
import { TokenLists } from '../../../../../src/passes/ir/tokenLists.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

const selectorIds = new SelectorIds();
const tokenLists = new TokenLists();

/** A record of `selectors`, with the ids of this file's interner. */
const ruleOf = (selectors) =>
  new RuleRecord('', selectorIdsOf(selectorIds, tokenLists, selectors));

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

test('compatibleOf should be false once addSelectors adds an incompatible selector', () => {
  const folded = foldedRules('a{}');
  const [index] = folded.rules;
  assert.equal(compatibleOf(folded.records, index), true);
  addSelectors(
    folded.records,
    index,
    selectorIdsOf(new SelectorIds(), folded.state.tokenLists, [
      'a:unknown-pseudo',
    ]),
    folded.state.tokenLists,
    ['chrome 120']
  );
  assert.equal(compatibleOf(folded.records, index), false);
});

test('compatibleOf should be false after absorbEarlier takes an incompatible earlier rule', () => {
  const { records, rules } = foldedRules('a:unknown-pseudo{}a{}');
  absorbEarlier(records, rules[1], rules[0]);
  assert.equal(compatibleOf(records, rules[1]), false);
});

test('hasSameSelectors should be false after addSelectors grows one of two equal lists', () => {
  const folded = foldedRules('.a{}.a{}');
  const [a, b] = folded.rules;
  assert.equal(hasSameSelectors(folded.records, a, b), true);
  addSelectors(
    folded.records,
    a,
    selectorIdsOf(new SelectorIds(), folded.state.tokenLists, ['.b']),
    folded.state.tokenLists,
    ['chrome 120']
  );
  assert.equal(hasSameSelectors(folded.records, a, b), false);
});

test('a rule placed after the build has no node in the table until write-back', () => {
  const { state } = arenaOf('a{}');
  const { index } = placeUnlinked(
    state.records,
    state.records.root.index,
    ruleOf(['b'])
  );
  assert.equal(nodeOf(nodesOf(state.records), index), undefined);
});

test('declarationKeys should list the id of each declaration in order', () => {
  const { records, record } = arenaOf('a{color:red;top:0}');
  const [color, top] = declarationsOf(records, record.index);
  assert.deepEqual(declarationIds(records, record.index), [color.id, top.id]);
});

test('declarationKeys should offer the same keys as a set for membership tests', () => {
  const { records, record } = arenaOf('a{color:red;top:0}');
  assert.deepEqual(
    declarationKeys(records, record.index).keySet,
    new Set(
      declarationsOf(records, record.index).map((declaration) => declaration.id)
    )
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
    record.index,
    declarationOf(state, postcss.decl({ prop: 'top', value: '0' })).index
  );
  assert.deepEqual(
    declarationIds(records, record.index),
    declarationsOf(records, record.index).map((declaration) => declaration.id)
  );
  assert.equal(declarationsOf(records, record.index).length, 2);
});

test('addSelectors should keep the cached declaration keys since it leaves the declarations alone', () => {
  const { records, record, state } = arenaOf('a{color:red}');
  const keys = declarationKeys(records, record.index);
  addSelectors(
    records,
    record.index,
    selectorIdsOf(new SelectorIds(), state.tokenLists, ['b']),
    state.tokenLists,
    ['chrome 120']
  );
  assert.equal(declarationKeys(records, record.index), keys);
});

test('absorbEarlier should keep the cached declaration keys since it leaves the declarations alone', () => {
  const { records, rules } = foldedRules('a{color:red}b{color:red}');
  const [earlier, later] = rules;
  const keys = declarationKeys(records, later);
  absorbEarlier(records, later, earlier);
  assert.equal(declarationKeys(records, later), keys);
});
