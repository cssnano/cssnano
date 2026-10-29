import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';

const createState = () => {
  const context = createRunContext();
  const { ruleMeta } = context;
  const state = new MergeState(['chrome 120'], context);
  return { state, ruleMeta };
};

const firstRule = (css) => postcss.parse(css).first;

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
  const { state } = createState();
  const root = postcss.parse('a{color:red}b,c{color:red}');
  const record = state.meta(root.first);
  state.addSelectors(root.first, ['b', 'c'], root.last);
  assert.equal(state.meta(root.first), record);
});

test('addSelectors should append the selectors to the rule description', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b,c{color:red}');
  state.addSelectors(root.first, ['b', 'c'], root.last);
  assert.deepEqual(state.meta(root.first).selectors, ['a', 'b', 'c']);
});

test('absorbEarlier should list the earlier rule selectors first', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b{color:red}');
  state.absorbEarlier(root.last, root.first);
  assert.deepEqual(state.meta(root.last).selectors, ['a', 'b']);
});

test('absorbEarlier should mark the record of the earlier rule departed', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b{color:red}');
  const record = state.meta(root.first);
  state.absorbEarlier(root.last, root.first);
  assert.throws(() => record.selectors, /departed/v);
});

test('absorbEarlier should leave the record of the later rule readable', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b{color:red}');
  state.absorbEarlier(root.last, root.first);
  assert.equal(state.meta(root.last).departed, false);
});

// Marking a rule only spares `canMerge` the compatibility check of its
// selectors; the vendor prefix check still decides, and an incompatible
// selector has an unknown prefix that blocks every merge by itself.
test('canMerge should still accept a pair of compatible rules after one is marked compatible', () => {
  const { state } = createState();
  const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
  state.markCompatible(root.first);
  assert.equal(state.canMerge(root.first, root.last), true);
});

test('canMerge should still reject a pair with different vendor prefixes after one is marked compatible', () => {
  const { state } = createState();
  const root = withRecords(
    state,
    postcss.parse('a::-moz-selection{color:red}b{color:red}')
  );
  assert.equal(state.canMerge(root.first, root.last), false);
  state.markCompatible(root.first);
  assert.equal(state.canMerge(root.first, root.last), false);
});

test('canMerge should still reject a rule with an unsupported selector after it is marked compatible', () => {
  const state = new MergeState(['ie 9']);
  const root = withRecords(
    state,
    postcss.parse('a:has(b){color:red}c{color:red}')
  );
  state.markCompatible(root.first);
  assert.equal(state.canMerge(root.first, root.last), false);
});

test('canMerge should reject a rule that holds a nested rule', () => {
  const { state } = createState();
  const root = withRecords(
    state,
    postcss.parse('a{color:red;&:hover{width:1px}}b{color:red}')
  );
  assert.equal(state.canMerge(root.first, root.last), false);
});

test('canMerge should keep accepting a rule after declarations join it', () => {
  const { state } = createState();
  const root = withRecords(
    state,
    postcss.parse('a{color:red}b{width:1px}c{color:red}')
  );
  const [receiving, incoming, other] = /** @type {import('postcss').Rule[]} */ (
    root.nodes
  );
  assert.equal(state.canMerge(receiving, other), true);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {import('postcss').Declaration[]} */ (kept),
    writesOf(kept, state.properties),
    incoming
  );
  assert.equal(state.canMerge(receiving, other), true);
});

test('canMerge should reject a rule with a nested rule that the tree gained after a read', () => {
  enableConsistencyChecks(true);
  try {
    const { state } = createState();
    const root = withRecords(state, postcss.parse('a{color:red}b{color:red}'));
    assert.equal(state.canMerge(root.first, root.last), true);
    root.first.append(postcss.rule({ selector: '&:hover' }));
    assert.throws(() => state.canMerge(root.first, root.last), /stale/v);
  } finally {
    enableConsistencyChecks(false);
  }
});

test('meta should throw when a declaration left the rule without a tree edit', () => {
  enableConsistencyChecks(true);
  try {
    const { state } = createState();
    const root = postcss.parse('a{color:red;width:1px}');
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    state.meta(rule);
    rule.first.remove();
    assert.throws(() => state.meta(rule), /stale/v);
  } finally {
    enableConsistencyChecks(false);
  }
});

const declarationsOf = (css) => postcss.parse(css).first.nodes;

test('declarationKey should give equal declarations the same key', () => {
  const { state } = createState();
  const [first] = declarationsOf('a{color:red}');
  const [second] = declarationsOf('b{color:red}');
  assert.equal(state.declarationKey(first), state.declarationKey(second));
});

test('declarationKey should give declarations with different values different keys', () => {
  const { state } = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  assert.notEqual(state.declarationKey(red), state.declarationKey(blue));
});

test('declarationKey should tell an important declaration from a plain one', () => {
  const { state } = createState();
  const [plain, important] = declarationsOf('a{color:red;color:red!important}');
  assert.notEqual(state.declarationKey(plain), state.declarationKey(important));
});

test('declarationKey should keep a key after other declarations are numbered', () => {
  const { state } = createState();
  const [red, blue] = declarationsOf('a{color:red;color:blue}');
  const key = state.declarationKey(red);
  state.declarationKey(blue);
  assert.equal(state.declarationKey(red), key);
});

test('declarationKeysOf should give equal declarations of different rules the same key', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b{color:red}');
  assert.deepEqual(
    state.declarationKeysOf(root.first).keys,
    state.declarationKeysOf(root.last).keys
  );
});

test('declarationKeysOf should return the cached keys of an unchanged rule', () => {
  const { state } = createState();
  const rule = firstRule('a{color:red}');
  assert.equal(state.declarationKeysOf(rule), state.declarationKeysOf(rule));
});
