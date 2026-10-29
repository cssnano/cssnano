import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { RuleMeta } from '../../../../../src/passes/merge/lib/rules/ruleMeta.js';

const lookup = () => ({});
const keyOf = (declaration) => declaration.prop.length;
const declarationsOf = (css) => postcss.parse(css).first.nodes;

test('declarationKeys should list the key of each declaration in order', () => {
  const meta = new RuleMeta(['a'], declarationsOf('a{color:red;top:0}'));
  assert.deepEqual(meta.declarationKeys(keyOf).keys, [5, 3]);
});

test('declarationKeys should offer the same keys as a set for membership tests', () => {
  const meta = new RuleMeta(['a'], declarationsOf('a{color:red;top:0}'));
  assert.deepEqual(meta.declarationKeys(keyOf).keySet, new Set([5, 3]));
});

test('declarationKeys should return the cached keys while the declarations are unchanged', () => {
  const meta = new RuleMeta(['a'], declarationsOf('a{color:red}'));
  assert.equal(meta.declarationKeys(keyOf), meta.declarationKeys(keyOf));
});

test('takeDeclarations should make declarationKeys reflect the new declarations', () => {
  const meta = new RuleMeta(['a'], declarationsOf('a{color:red}'));
  meta.declarationKeys(keyOf);
  meta.takeDeclarations(declarationsOf('a{color:red;top:0}'));
  assert.deepEqual(meta.declarationKeys(keyOf).keys, [5, 3]);
});

test('addSelectors should keep the cached declaration keys since it leaves the declarations alone', () => {
  const meta = new RuleMeta(['a'], declarationsOf('a{color:red}'));
  const keys = meta.declarationKeys(keyOf);
  meta.addSelectors(['b'], lookup);
  assert.equal(meta.declarationKeys(keyOf), keys);
});

test('absorbEarlier should keep the cached declaration keys since it leaves the declarations alone', () => {
  const meta = new RuleMeta(['b'], declarationsOf('b{color:red}'));
  const earlier = new RuleMeta(['a'], declarationsOf('a{color:red}'));
  const keys = meta.declarationKeys(keyOf);
  meta.absorbEarlier(earlier, lookup);
  assert.equal(meta.declarationKeys(keyOf), keys);
});

test('elementKeys should list the distinct element of each selector', () => {
  const meta = new RuleMeta(['div h1', 'h1', 'p'], []);
  assert.deepEqual(meta.elementKeys(), ['h1', 'p']);
});

test('elementKeys should be null when a selector has no element key since it could match any element', () => {
  const meta = new RuleMeta(['h1', '.a'], []);
  assert.equal(meta.elementKeys(), null);
});

test('elementKeys should be null for a rule without selectors since an empty key list would claim the rule writes to no element', () => {
  const meta = new RuleMeta([], []);
  assert.equal(meta.elementKeys(), null);
});

test('addSelectors should add the elements of the new selectors to the element keys', () => {
  const meta = new RuleMeta(['h1'], []);
  meta.elementKeys();
  meta.addSelectors(['p', 'h1'], lookup);
  assert.deepEqual(meta.elementKeys(), ['h1', 'p']);
});

test('addSelectors should make the element keys null when a new selector has no element key', () => {
  const meta = new RuleMeta(['h1'], []);
  meta.elementKeys();
  meta.addSelectors(['.a'], lookup);
  assert.equal(meta.elementKeys(), null);
});

test('addSelectors should keep null element keys since later selectors cannot restore a key', () => {
  const meta = new RuleMeta(['.a'], []);
  meta.elementKeys();
  meta.addSelectors(['h1'], lookup);
  assert.equal(meta.elementKeys(), null);
});

test('addSelectors should leave element keys derivable when they were never read', () => {
  const meta = new RuleMeta(['h1'], []);
  meta.addSelectors(['p'], lookup);
  assert.deepEqual(meta.elementKeys(), ['h1', 'p']);
});

test('setSelectors should make elementKeys reflect the new selectors', () => {
  const meta = new RuleMeta(['h1'], []);
  meta.elementKeys();
  meta.setSelectors(['p']);
  assert.deepEqual(meta.elementKeys(), ['p']);
});

test('absorbEarlier should put the elements of both rules in the element keys', () => {
  const meta = new RuleMeta(['p'], []);
  const earlier = new RuleMeta(['h1'], []);
  meta.elementKeys();
  earlier.elementKeys();
  meta.absorbEarlier(earlier, lookup);
  assert.deepEqual(meta.elementKeys()?.toSorted(), ['h1', 'p']);
});

test('absorbEarlier should make the element keys null when the earlier rule has an unknown element', () => {
  const meta = new RuleMeta(['p'], []);
  const earlier = new RuleMeta(['.a'], []);
  earlier.elementKeys();
  meta.absorbEarlier(earlier, lookup);
  assert.equal(meta.elementKeys(), null);
});

test('absorbEarlier should make the element keys null when this rule has an unknown element', () => {
  const meta = new RuleMeta(['.a'], []);
  const earlier = new RuleMeta(['h1'], []);
  earlier.elementKeys();
  meta.absorbEarlier(earlier, lookup);
  assert.equal(meta.elementKeys(), null);
});

test('addSelectors should return the element keys the new selectors add', () => {
  const meta = new RuleMeta(['h1'], []);
  meta.elementKeys();
  assert.deepEqual(meta.addSelectors(['p', 'h1', 'em'], lookup), ['p', 'em']);
});

test('addSelectors should return no element keys when the new selectors add none', () => {
  const meta = new RuleMeta(['h1'], []);
  meta.elementKeys();
  assert.deepEqual(meta.addSelectors(['h1'], lookup), []);
});

test('addSelectors should return null when a new selector has no element key, since its writes may reach any element', () => {
  const meta = new RuleMeta(['h1'], []);
  meta.elementKeys();
  assert.equal(meta.addSelectors(['.a'], lookup), null);
});

test('addSelectors should return null when the element keys were never read, since none are listed to extend', () => {
  const meta = new RuleMeta(['h1'], []);
  assert.equal(meta.addSelectors(['p'], lookup), null);
});
