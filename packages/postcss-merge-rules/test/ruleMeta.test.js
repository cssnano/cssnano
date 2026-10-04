import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { RuleMeta } from '../src/lib/ruleMeta.js';

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

test('setDeclarations should make declarationKeys reflect the new declarations', () => {
  const meta = new RuleMeta(['a'], declarationsOf('a{color:red}'));
  meta.declarationKeys(keyOf);
  meta.setDeclarations(declarationsOf('a{color:red;top:0}'));
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
