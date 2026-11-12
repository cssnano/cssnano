import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/treeMatch.js';
import { appendToDeclarations } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { recordDeclaration } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';
import {
  buildTestRecords,
  declarationIds,
  ruleRecordOf,
  nodesOf,
  tokenListsOf,
} from './liveRecords.js';
import { moveRule } from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';
import { tokensText } from '../../../../../src/values/tokensText.js';

/**
 * The text of each selector of a rule, from its token lists.
 *
 * @param {MergeState} state
 * @param {import('../../../../../src/passes/merge/lib/rules/ruleRecord.js').RuleRecord} record
 * @return {string[]}
 */
const selectorTexts = (state, record) =>
  record.selectorIds.map((id) => tokensText(state.tokenLists.get(id)));

const createState = (consistencyChecks = false) =>
  new MergeState(
    ['chrome 120'],
    createRunContext(undefined, consistencyChecks)
  );

/**
 * Gives the rules of `root` their slots, as the merge does before it joins any.
 *
 * @param {MergeState} state
 * @param {import('postcss').Root} root
 * @return {import('postcss').Root}
 */
const withRecords = (state, root, consistencyChecks = false) => {
  state.records = buildTestRecords(root, state, undefined, consistencyChecks);
  return root;
};

test('addSelectors should keep the record of the rule', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b,c{color:red}'));
  const record = ruleRecordOf(state.records, root.first);
  state.addSelectors(
    ruleRecordOf(state.records, root.first),
    ruleRecordOf(state.records, root.last).selectorIds
  );
  assert.equal(ruleRecordOf(state.records, root.first), record);
});

test('addSelectors should append the selectors to the rule description', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b,c{color:red}'));
  state.addSelectors(
    ruleRecordOf(state.records, root.first),
    ruleRecordOf(state.records, root.last).selectorIds
  );
  assert.deepEqual(
    selectorTexts(state, ruleRecordOf(state.records, root.first)),
    ['a', 'b', 'c']
  );
});

test('absorbEarlier should list the earlier rule selectors first', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  assert.deepEqual(
    selectorTexts(state, ruleRecordOf(state.records, root.last)),
    ['a', 'b']
  );
});

test('under consistency checks, a read of an earlier rule that absorbEarlier then unlinks should throw', () => {
  const state = createState(true);
  const root = withRecords(
    state,
    postcss.parse('a{color:red}b{color:red}'),
    true
  );
  const record = ruleRecordOf(state.records, root.first);
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  state.records.detach(record.index);
  assert.throws(() => state.records.rule(record.index), /does not reach/v);
});

test('without consistency checks, a read of an earlier rule that absorbEarlier then unlinks should not throw', () => {
  const state = createState(false);
  const root = withRecords(
    state,
    postcss.parse('a{color:red}b{color:red}'),
    false
  );
  const record = ruleRecordOf(state.records, root.first);
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  state.records.detach(record.index);
  assert.doesNotThrow(() => record.selectorIds);
});

test('absorbEarlier should leave the record of the later rule readable', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  assert.deepEqual(
    selectorTexts(state, ruleRecordOf(state.records, root.last)),
    ['a', 'b']
  );
});

test('canMerge should accept a pair of compatible rules', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, root.first),
      ruleRecordOf(state.records, root.last)
    ),
    true
  );
});

test('canMerge should reject a pair with different vendor prefixes', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('a::-moz-selection{color:red}b{color:red}')
  );
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, root.first),
      ruleRecordOf(state.records, root.last)
    ),
    false
  );
});

test('canMerge should reject a rule with an unsupported selector', () => {
  const state = new MergeState(['ie 9']);
  const root = withRecords(
    state,
    postcss.parse('a:has(b){color:red}c{color:red}')
  );
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, root.first),
      ruleRecordOf(state.records, root.last)
    ),
    false
  );
});

test('canMerge should reject a rule that gained an unsupported selector after it could merge', () => {
  const state = new MergeState(['ie 9']);
  const root = withRecords(
    state,
    postcss.parse('a{color:red}b{color:red}c:has(d){color:red}')
  );
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, root.first),
      ruleRecordOf(state.records, root.nodes[1])
    ),
    true
  );
  state.addSelectors(ruleRecordOf(state.records, root.first), [
    ruleRecordOf(state.records, root.last).selectorIds[0],
  ]);
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, root.first),
      ruleRecordOf(state.records, root.nodes[1])
    ),
    false
  );
});

test('canMerge should reject a rule that holds a nested rule', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('a{color:red;&:hover{width:1px}}b{color:red}')
  );
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, root.first),
      ruleRecordOf(state.records, root.last)
    ),
    false
  );
});

test('canMerge should keep accepting a rule after declarations join it', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('a{color:red}b{width:1px}c{color:red}')
  );
  const [receiving, incoming, other] = /** @type {import('postcss').Rule[]} */ (
    root.nodes
  );
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, receiving),
      ruleRecordOf(state.records, other)
    ),
    true
  );
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving).index,
    ruleRecordOf(state.records, incoming).index
  );
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, receiving),
      ruleRecordOf(state.records, other)
    ),
    true
  );
});

test('assertRecordsMatchTree should throw when a declaration left the rule without a tree edit', () => {
  const state = createState(true);
  const root = withRecords(
    state,
    postcss.parse('a{color:red;width:1px}'),
    true
  );
  /** @type {import('postcss').Rule} */ (root.first).first?.remove();
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

test('under consistency checks, blockOf should throw for an unlinked record, since its rule stands in no block', () => {
  const state = createState(true);
  const root = withRecords(state, postcss.parse('a{color:red}'), true);
  const record = ruleRecordOf(
    state.records,
    /** @type {import('postcss').Rule} */ (root.first)
  );
  state.records.detach(record.index);
  assert.throws(() => state.blockOf(record), /does not reach/v);
});

test('without consistency checks, blockOf should not throw for an unlinked record', () => {
  const state = createState(false);
  const root = withRecords(state, postcss.parse('a{color:red}'), false);
  const record = ruleRecordOf(
    state.records,
    /** @type {import('postcss').Rule} */ (root.first)
  );
  state.records.detach(record.index);
  assert.doesNotThrow(() => state.blockOf(record));
});

const declarationsOf = (css) => postcss.parse(css).first.nodes;

test('recordDeclaration ids should give equal declarations the same key', () => {
  const state = createState();
  const [first] = declarationsOf('a{color:red}');
  const [second] = declarationsOf('b{color:red}');
  assert.equal(
    recordDeclaration(first, state.runContext).id,
    recordDeclaration(second, state.runContext).id
  );
});

test('recordDeclaration ids should give declarations with different values different keys', () => {
  const state = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  assert.notEqual(
    recordDeclaration(red, state.runContext).id,
    recordDeclaration(blue, state.runContext).id
  );
});

test('recordDeclaration ids should tell an important declaration from a plain one', () => {
  const state = createState();
  const [plain, important] = declarationsOf('a{color:red;color:red!important}');
  assert.notEqual(
    recordDeclaration(plain, state.runContext).id,
    recordDeclaration(important, state.runContext).id
  );
});

test('recordDeclaration ids should keep a key after other declarations are numbered', () => {
  const state = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  const key = recordDeclaration(red, state.runContext).id;
  // A later declaration takes its own id, so the first key must not move.
  assert.notEqual(recordDeclaration(blue, state.runContext).id, key);
  assert.equal(recordDeclaration(red, state.runContext).id, key);
});

test('declarationKeys of a record should give equal declarations of different rules the same key', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  assert.deepEqual(
    declarationIds(
      state.records,
      ruleRecordOf(state.records, root.first).index
    ),
    declarationIds(state.records, ruleRecordOf(state.records, root.last).index)
  );
});

test('declarationKeys of a record should return the cached keys of an unchanged rule', () => {
  const state = createState();
  const rule = withRecords(state, postcss.parse('a{color:red}')).first;
  assert.equal(
    declarationKeys(state.records, ruleRecordOf(state.records, rule).index),
    declarationKeys(state.records, ruleRecordOf(state.records, rule).index)
  );
});

test('canMerge should keep refusing a rule whose last nested rule has moved out', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('a{&:hover{width:1px}}b{color:red}')
  );
  const nesting = ruleRecordOf(state.records, root.first);
  const nested = ruleRecordOf(state.records, root.first.first);
  moveRule(state.records, state.records.root.index, nested.index);
  assert.equal(
    state.canMerge(nesting, ruleRecordOf(state.records, root.last)),
    false
  );
});

test('a rule whose last nested rule has moved out should stay in its container chain', () => {
  const state = createState();
  const root = withRecords(
    state,
    postcss.parse('a{&:hover{width:1px}}b{color:red}')
  );
  const nesting = ruleRecordOf(state.records, root.first);
  const nested = ruleRecordOf(state.records, root.first.first);
  moveRule(state.records, state.records.root.index, nested.index);
  assert.equal(
    state.records.links.parentOf(nesting.index),
    state.records.root.index
  );
});
