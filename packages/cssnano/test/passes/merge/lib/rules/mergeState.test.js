import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { appendToDeclarations } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import {
  buildTestRecords,
  declarationIds,
  ruleRecordOf,
} from './liveRecords.js';
import { moveRule } from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';

const createState = () => new MergeState(['chrome 120'], createRunContext());

/**
 * Gives the rules of `root` their slots, as the merge does before it joins any.
 *
 * @param {MergeState} state
 * @param {import('postcss').Root} root
 * @return {import('postcss').Root}
 */
const withRecords = (state, root) => {
  state.records = buildTestRecords(root, state);
  return root;
};

test('addSelectors should keep the record of the rule', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b,c{color:red}'));
  const record = ruleRecordOf(state.records, root.first);
  state.addSelectors(
    ruleRecordOf(state.records, root.first),
    ['b', 'c'],
    ruleRecordOf(state.records, root.last)
  );
  assert.equal(ruleRecordOf(state.records, root.first), record);
});

test('addSelectors should append the selectors to the rule description', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b,c{color:red}'));
  state.addSelectors(
    ruleRecordOf(state.records, root.first),
    ['b', 'c'],
    ruleRecordOf(state.records, root.last)
  );
  assert.deepEqual(ruleRecordOf(state.records, root.first).selectors, [
    'a',
    'b',
    'c',
  ]);
});

test('absorbEarlier should list the earlier rule selectors first', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  assert.deepEqual(ruleRecordOf(state.records, root.last).selectors, [
    'a',
    'b',
  ]);
});

test('under consistency checks, a read of an earlier rule that absorbEarlier then unlinks should throw', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const state = createState();
    const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
    const record = ruleRecordOf(state.records, root.first);
    state.absorbEarlier(
      ruleRecordOf(state.records, root.last),
      ruleRecordOf(state.records, root.first)
    );
    state.records.unlink(record.index);
    assert.throws(() => state.records.rule(record.index), /does not reach/v);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('without consistency checks, a read of an earlier rule that absorbEarlier then unlinks should not throw', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(false);
  try {
    const state = createState();
    const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
    const record = ruleRecordOf(state.records, root.first);
    state.absorbEarlier(
      ruleRecordOf(state.records, root.last),
      ruleRecordOf(state.records, root.first)
    );
    state.records.unlink(record.index);
    assert.doesNotThrow(() => record.selectors);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('absorbEarlier should leave the record of the later rule readable', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  assert.deepEqual(ruleRecordOf(state.records, root.last).selectors, [
    'a',
    'b',
  ]);
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
  state.addSelectors(
    ruleRecordOf(state.records, root.first),
    ['c:has(d)'],
    ruleRecordOf(state.records, root.last)
  );
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
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const state = createState();
    const root = withRecords(state, postcss.parse('a{color:red;width:1px}'));
    /** @type {import('postcss').Rule} */ (root.first).first?.remove();
    assert.throws(() => assertRecordsMatchTree(state.records), /out of step/v);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('under consistency checks, blockOf should throw for an unlinked record, since its rule stands in no block', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const state = createState();
    const root = withRecords(state, postcss.parse('a{color:red}'));
    const record = ruleRecordOf(
      state.records,
      /** @type {import('postcss').Rule} */ (root.first)
    );
    state.records.unlink(record.index);
    assert.throws(() => state.blockOf(record), /does not reach/v);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('without consistency checks, blockOf should not throw for an unlinked record', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(false);
  try {
    const state = createState();
    const root = withRecords(state, postcss.parse('a{color:red}'));
    const record = ruleRecordOf(
      state.records,
      /** @type {import('postcss').Rule} */ (root.first)
    );
    state.records.unlink(record.index);
    assert.doesNotThrow(() => state.blockOf(record));
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

const declarationsOf = (css) => postcss.parse(css).first.nodes;

test('declarationIds.keyOf should give equal declarations the same key', () => {
  const state = createState();
  const [first] = declarationsOf('a{color:red}');
  const [second] = declarationsOf('b{color:red}');
  assert.equal(
    state.declarationIds.keyOf(first),
    state.declarationIds.keyOf(second)
  );
});

test('declarationIds.keyOf should give declarations with different values different keys', () => {
  const state = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  assert.notEqual(
    state.declarationIds.keyOf(red),
    state.declarationIds.keyOf(blue)
  );
});

test('declarationIds.keyOf should tell an important declaration from a plain one', () => {
  const state = createState();
  const [plain, important] = declarationsOf('a{color:red;color:red!important}');
  assert.notEqual(
    state.declarationIds.keyOf(plain),
    state.declarationIds.keyOf(important)
  );
});

test('declarationIds.keyOf should keep a key after other declarations are numbered', () => {
  const state = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  const key = state.declarationIds.keyOf(red);
  state.declarationIds.keyOf(blue);
  assert.equal(state.declarationIds.keyOf(red), key);
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
