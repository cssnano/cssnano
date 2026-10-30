import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  BlockRecord,
  BlockRecords,
} from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';

const lookup = () => ({});
const lookupB = (selector) => ({ compatible: selector !== 'b' });
const keyOf = (declaration) => declaration.prop.length;
const declarationsOf = (css) => postcss.parse(css).first.nodes;

test('compatible should look up each selector once across repeated reads', () => {
  const record = new RuleRecord(postcss.rule(), ['a', 'b'], []);
  const looked = [];
  const lookupOnce = (selector) => {
    looked.push(selector);
    return { compatible: true };
  };
  record.compatible(lookupOnce);
  record.compatible(lookupOnce);
  assert.deepEqual(looked, ['a', 'b']);
});

test('compatible should be false once addSelectors adds an incompatible selector', () => {
  const record = new RuleRecord(postcss.rule(), ['a'], []);
  assert.equal(record.compatible(lookupB), true);
  record.addSelectors(['b'], lookupB);
  assert.equal(record.compatible(lookupB), false);
});

test('compatible should be false after absorbEarlier takes an incompatible earlier rule', () => {
  const later = new RuleRecord(postcss.rule(), ['a'], []);
  const earlier = new RuleRecord(postcss.rule(), ['b'], []);
  later.absorbEarlier(earlier, lookupB);
  assert.equal(later.compatible(lookupB), false);
});

test('recordRule should give the record of a rule the rule as its node', () => {
  const rule = postcss.parse('a{color:red}').first;
  const records = new BlockRecords(
    new BlockRecord(postcss.root(), null, 0, false)
  );
  assert.equal(records.recordRule(rule).node, rule);
});

test('declarationKeys should list the key of each declaration in order', () => {
  const record = new RuleRecord(
    postcss.rule(),
    ['a'],
    declarationsOf('a{color:red;top:0}')
  );
  assert.deepEqual(record.declarationKeys(keyOf).keys, [5, 3]);
});

test('declarationKeys should offer the same keys as a set for membership tests', () => {
  const record = new RuleRecord(
    postcss.rule(),
    ['a'],
    declarationsOf('a{color:red;top:0}')
  );
  assert.deepEqual(record.declarationKeys(keyOf).keySet, new Set([5, 3]));
});

test('declarationKeys should return the cached keys while the declarations are unchanged', () => {
  const record = new RuleRecord(
    postcss.rule(),
    ['a'],
    declarationsOf('a{color:red}')
  );
  assert.equal(record.declarationKeys(keyOf), record.declarationKeys(keyOf));
});

test('takeDeclarations should make declarationKeys reflect the new declarations', () => {
  const record = new RuleRecord(
    postcss.rule(),
    ['a'],
    declarationsOf('a{color:red}')
  );
  record.declarationKeys(keyOf);
  record.takeDeclarations(declarationsOf('a{color:red;top:0}'));
  assert.deepEqual(record.declarationKeys(keyOf).keys, [5, 3]);
});

test('addSelectors should keep the cached declaration keys since it leaves the declarations alone', () => {
  const record = new RuleRecord(
    postcss.rule(),
    ['a'],
    declarationsOf('a{color:red}')
  );
  const keys = record.declarationKeys(keyOf);
  record.addSelectors(['b'], lookup);
  assert.equal(record.declarationKeys(keyOf), keys);
});

test('absorbEarlier should keep the cached declaration keys since it leaves the declarations alone', () => {
  const record = new RuleRecord(
    postcss.rule(),
    ['b'],
    declarationsOf('b{color:red}')
  );
  const earlier = new RuleRecord(
    postcss.rule(),
    ['a'],
    declarationsOf('a{color:red}')
  );
  const keys = record.declarationKeys(keyOf);
  record.absorbEarlier(earlier, lookup);
  assert.equal(record.declarationKeys(keyOf), keys);
});

test('elementKeys should list the distinct element of each selector', () => {
  const record = new RuleRecord(postcss.rule(), ['div h1', 'h1', 'p'], []);
  assert.deepEqual(record.elementKeys(), ['h1', 'p']);
});

test('elementKeys should be null when a selector has no element key since it could match any element', () => {
  const record = new RuleRecord(postcss.rule(), ['h1', '.a'], []);
  assert.equal(record.elementKeys(), null);
});

test('elementKeys should be null for a rule without selectors since an empty key list would claim the rule writes to no element', () => {
  const record = new RuleRecord(postcss.rule(), [], []);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should add the elements of the new selectors to the element keys', () => {
  const record = new RuleRecord(postcss.rule(), ['h1'], []);
  record.elementKeys();
  record.addSelectors(['p', 'h1'], lookup);
  assert.deepEqual(record.elementKeys(), ['h1', 'p']);
});

test('addSelectors should make the element keys null when a new selector has no element key', () => {
  const record = new RuleRecord(postcss.rule(), ['h1'], []);
  record.elementKeys();
  record.addSelectors(['.a'], lookup);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should keep null element keys since later selectors cannot restore a key', () => {
  const record = new RuleRecord(postcss.rule(), ['.a'], []);
  record.elementKeys();
  record.addSelectors(['h1'], lookup);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should leave element keys derivable when they were never read', () => {
  const record = new RuleRecord(postcss.rule(), ['h1'], []);
  record.addSelectors(['p'], lookup);
  assert.deepEqual(record.elementKeys(), ['h1', 'p']);
});

test('absorbEarlier should put the elements of both rules in the element keys', () => {
  const record = new RuleRecord(postcss.rule(), ['p'], []);
  const earlier = new RuleRecord(postcss.rule(), ['h1'], []);
  record.elementKeys();
  earlier.elementKeys();
  record.absorbEarlier(earlier, lookup);
  assert.deepEqual(record.elementKeys()?.toSorted(), ['h1', 'p']);
});

test('absorbEarlier should make the element keys null when the earlier rule has an unknown element', () => {
  const record = new RuleRecord(postcss.rule(), ['p'], []);
  const earlier = new RuleRecord(postcss.rule(), ['.a'], []);
  earlier.elementKeys();
  record.absorbEarlier(earlier, lookup);
  assert.equal(record.elementKeys(), null);
});

test('absorbEarlier should make the element keys null when this rule has an unknown element', () => {
  const record = new RuleRecord(postcss.rule(), ['.a'], []);
  const earlier = new RuleRecord(postcss.rule(), ['h1'], []);
  earlier.elementKeys();
  record.absorbEarlier(earlier, lookup);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should return the element keys the new selectors add', () => {
  const record = new RuleRecord(postcss.rule(), ['h1'], []);
  record.elementKeys();
  assert.deepEqual(record.addSelectors(['p', 'h1', 'em'], lookup), ['p', 'em']);
});

test('addSelectors should return no element keys when the new selectors add none', () => {
  const record = new RuleRecord(postcss.rule(), ['h1'], []);
  record.elementKeys();
  assert.deepEqual(record.addSelectors(['h1'], lookup), []);
});

test('addSelectors should return null when a new selector has no element key, since its writes may reach any element', () => {
  const record = new RuleRecord(postcss.rule(), ['h1'], []);
  record.elementKeys();
  assert.equal(record.addSelectors(['.a'], lookup), null);
});

test('addSelectors should return null when the element keys were never read, since none are listed to extend', () => {
  const record = new RuleRecord(postcss.rule(), ['h1'], []);
  assert.equal(record.addSelectors(['p'], lookup), null);
});
