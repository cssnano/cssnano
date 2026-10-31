import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
  depart,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import { ruleRecordOf } from './liveRecords.js';

const createState = () => new MergeState(['chrome 120'], createRunContext());

/**
 * Gives the rules of `root` their slots, as the merge does before it joins any.
 *
 * @param {MergeState} state
 * @param {import('postcss').Root} root
 * @return {import('postcss').Root}
 */
const withRecords = (state, root) => {
  state.records = buildRecords(root, state);
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

test('absorbEarlier should mark the record of the earlier rule departed', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  const record = ruleRecordOf(state.records, root.first);
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  assert.throws(() => record.selectors, /departed/v);
});

test('absorbEarlier should leave the record of the later rule readable', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  state.absorbEarlier(
    ruleRecordOf(state.records, root.last),
    ruleRecordOf(state.records, root.first)
  );
  assert.equal(ruleRecordOf(state.records, root.last).departed, false);
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
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    /** @type {import('postcss').Declaration[]} */ (kept),
    writesOf(kept, state.properties),
    ruleRecordOf(state.records, incoming)
  );
  assert.equal(
    state.canMerge(
      ruleRecordOf(state.records, receiving),
      ruleRecordOf(state.records, other)
    ),
    true
  );
});

test('declarations should throw when a declaration left the rule without a tree edit', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const state = createState();
    const root = withRecords(state, postcss.parse('a{color:red;width:1px}'));
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    const record = ruleRecordOf(state.records, rule);
    rule.first.remove();
    assert.throws(() => record.declarations, /stale/v);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('blockOf should throw for a departed record, since its rule stands in no block', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}'));
  const record = ruleRecordOf(
    state.records,
    /** @type {import('postcss').Rule} */ (root.first)
  );
  depart(state, record);
  assert.throws(() => state.blockOf(record), /departed/v);
});

const declarationsOf = (css) => postcss.parse(css).first.nodes;

test('declarationKey should give equal declarations the same key', () => {
  const state = createState();
  const [first] = declarationsOf('a{color:red}');
  const [second] = declarationsOf('b{color:red}');
  assert.equal(state.declarationKey(first), state.declarationKey(second));
});

test('declarationKey should give declarations with different values different keys', () => {
  const state = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  assert.notEqual(state.declarationKey(red), state.declarationKey(blue));
});

test('declarationKey should tell an important declaration from a plain one', () => {
  const state = createState();
  const [plain, important] = declarationsOf('a{color:red;color:red!important}');
  assert.notEqual(state.declarationKey(plain), state.declarationKey(important));
});

test('declarationKey should keep a key after other declarations are numbered', () => {
  const state = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  const key = state.declarationKey(red);
  state.declarationKey(blue);
  assert.equal(state.declarationKey(red), key);
});

test('declarationKeysOf should give equal declarations of different rules the same key', () => {
  const state = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  assert.deepEqual(
    state.declarationKeysOf(ruleRecordOf(state.records, root.first)).keys,
    state.declarationKeysOf(ruleRecordOf(state.records, root.last)).keys
  );
});

test('declarationKeysOf should return the cached keys of an unchanged rule', () => {
  const state = createState();
  const rule = withRecords(state, postcss.parse('a{color:red}')).first;
  assert.equal(
    state.declarationKeysOf(ruleRecordOf(state.records, rule)),
    state.declarationKeysOf(ruleRecordOf(state.records, rule))
  );
});
