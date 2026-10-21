import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';

const createState = () => {
  const context = createRunContext();
  const { ruleMeta } = context;
  const state = new MergeState(['chrome 120'], context);
  return { state, ruleMeta };
};

const firstRule = (css) => postcss.parse(css).first;

test('forget should make meta describe the rule by its current selector', () => {
  const { state } = createState();
  const rule = firstRule('a{color:red}');
  assert.deepEqual(state.meta(rule).selectors, ['a']);
  rule.selector = 'b';
  state.forget(rule);
  assert.deepEqual(state.meta(rule).selectors, ['b']);
});

test('forget should leave a rule that was never described undescribed', () => {
  const { state, ruleMeta } = createState();
  const rule = firstRule('a{color:red}');
  state.forget(rule);
  assert.equal(ruleMeta.has(rule), false);
});

test('addSelectors should append the selectors to the rule description', () => {
  const { state } = createState();
  const rule = firstRule('a{color:red}');
  state.addSelectors(rule, ['b', 'c']);
  assert.deepEqual(state.meta(rule).selectors, ['a', 'b', 'c']);
});

test('absorbEarlier should list the earlier rule selectors first', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b{color:red}');
  state.absorbEarlier(root.last, root.first);
  assert.deepEqual(state.meta(root.last).selectors, ['a', 'b']);
});

// Marking a rule only spares `canMerge` the compatibility check of its
// selectors; the vendor prefix check still decides, and an incompatible
// selector has an unknown prefix that blocks every merge by itself.
test('canMerge should still accept a pair of compatible rules after one is marked compatible', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b{color:red}');
  state.markCompatible(root.first);
  assert.equal(state.canMerge(root.first, root.last), true);
});

test('canMerge should still reject a pair with different vendor prefixes after one is marked compatible', () => {
  const { state } = createState();
  const root = postcss.parse('a::-moz-selection{color:red}b{color:red}');
  assert.equal(state.canMerge(root.first, root.last), false);
  state.markCompatible(root.first);
  assert.equal(state.canMerge(root.first, root.last), false);
});

test('canMerge should still reject a rule with an unsupported selector after it is marked compatible', () => {
  const state = new MergeState(['ie 9']);
  const root = postcss.parse('a:has(b){color:red}c{color:red}');
  state.markCompatible(root.first);
  assert.equal(state.canMerge(root.first, root.last), false);
});

// `canMerge` remembers that a rule holds no nested rule, until the rule is
// forgotten.
test('canMerge should reject a rule that gained a nested rule once it is forgotten', () => {
  const { state } = createState();
  const root = postcss.parse('a{color:red}b{color:red}');
  state.canMerge(root.first, root.last);
  root.first.append(postcss.rule({ selector: '&:hover' }));
  state.forget(root.first);
  assert.equal(state.canMerge(root.first, root.last), false);
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

test('forget should make declarationKeysOf describe the rule afresh', () => {
  const { state } = createState();
  const rule = firstRule('a{color:red}');
  const before = state.declarationKeysOf(rule);
  state.forget(rule);
  assert.notEqual(state.declarationKeysOf(rule), before);
});
