import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  BlockRecord,
  BlockRecords,
} from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import {
  RuleRecord,
  isDeclaration,
} from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import { DeclarationKeys } from '../../../../../src/passes/ir/declarationKey.js';
import { isDeclarationRule } from '../../../../../src/passes/merge/lib/rules/declarationJoin.js';
import { recordDeclaration } from '../../../../../src/passes/ir/declarationRecord.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';

const lookup = () => ({});
const lookupB = (selector) => ({ compatible: selector !== 'b' });
const properties = new PropertyTable();
const declarationIds = new DeclarationKeys();
/**
 * The declaration records of `rule`, as the run builds them.
 *
 * @param {import('postcss').Rule} rule
 */
const recordsOf = (rule) =>
  rule.nodes
    .filter(isDeclaration)
    .map((node) => recordDeclaration(node, properties, declarationIds));
/** A record of the rule in `css`, holding the declarations the rule holds. */
const recordOf = (css) => {
  const rule = postcss.parse(css).first;
  return new RuleRecord(rule, rule.selectors, recordsOf(rule));
};

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
  assert.equal(records.recordRule(rule, properties, declarationIds).node, rule);
});

test('declarationKeys should list the id of each declaration in order', () => {
  const record = recordOf('a{color:red;top:0}');
  const [color, top] = record.declarations;
  assert.deepEqual(record.declarationKeys().keys, [color.id, top.id]);
});

test('declarationKeys should offer the same keys as a set for membership tests', () => {
  const record = recordOf('a{color:red;top:0}');
  assert.deepEqual(
    record.declarationKeys().keySet,
    new Set(record.declarations.map((declaration) => declaration.id))
  );
});

test('declarationKeys should return the cached keys while the declarations are unchanged', () => {
  const record = recordOf('a{color:red}');
  assert.equal(record.declarationKeys(), record.declarationKeys());
});

test('append should make declarationKeys reflect the appended declaration', () => {
  const rule = postcss.parse('a{color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.declarationKeys();
  record.append(declarationOf(postcss.decl({ prop: 'top', value: '0' })));
  assert.deepEqual(
    record.declarationKeys().keys,
    record.declarations.map((declaration) => declaration.id)
  );
  assert.equal(record.declarations.length, 2);
});

test('addSelectors should keep the cached declaration keys since it leaves the declarations alone', () => {
  const record = recordOf('a{color:red}');
  const keys = record.declarationKeys();
  record.addSelectors(['b'], lookup);
  assert.equal(record.declarationKeys(), keys);
});

test('absorbEarlier should keep the cached declaration keys since it leaves the declarations alone', () => {
  const record = recordOf('b{color:red}');
  const earlier = recordOf('a{color:red}');
  const keys = record.declarationKeys();
  record.absorbEarlier(earlier, lookup);
  assert.equal(record.declarationKeys(), keys);
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

test('assertFresh should throw under consistency checks once the rule gained a declaration', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const rule = postcss.parse('a{color:red}').first;
    const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
    rule.append(postcss.decl({ prop: 'width', value: '1px' }));
    assert.throws(() => record.assertFresh(), /stale/v);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

/** The declaration record of a declaration node, as a rule record holds it. */
const declarationOf = (node) =>
  recordDeclaration(node, properties, declarationIds);

test('childCount should count a comment that a rule holds, which declarations leave out', () => {
  const rule = postcss.parse('a{/* note */color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  assert.equal(record.childCount(), 2);
});

test('declarations should leave out a comment that a rule holds', () => {
  const rule = postcss.parse('a{/* note */color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  assert.equal(record.declarations.length, 1);
});

test('holdsOnlyDeclarations should be false for a rule that holds a comment', () => {
  const rule = postcss.parse('a{/* note */color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  assert.equal(record.holdsOnlyDeclarations(), false);
});

test('holdsOnlyDeclarations should be true for an empty rule so that empty rules still join', () => {
  const rule = postcss.parse('a{}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  assert.equal(record.holdsOnlyDeclarations(), true);
});

test('isDeclarationRule should reject an empty rule, which holds no declaration to share', () => {
  const rule = postcss.parse('a{}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  assert.equal(isDeclarationRule(record), false);
});

test('isDeclarationRule should reject a rule that holds a comment', () => {
  const rule = postcss.parse('a{/* note */color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  assert.equal(isDeclarationRule(record), false);
});

test('isDeclarationRule should accept a rule that holds only declarations', () => {
  const rule = postcss.parse('a{color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  assert.equal(isDeclarationRule(record), true);
});

test('append should add a declaration to the declarations of a rule that holds a comment', () => {
  const rule = postcss.parse('a{/* note */color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.append(declarationOf(postcss.decl({ prop: 'width', value: '1px' })));
  assert.equal(record.declarations.length, 2);
});

test('append should count an appended comment among the children without adding a declaration', () => {
  const rule = postcss.parse('a{color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.append(postcss.comment({ text: 'note' }));
  assert.equal(record.childCount(), 2);
});

test('append should keep the declarations in step with the children under consistency checks', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const rule = postcss.parse('a{/* note */color:red}').first;
    const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
    record.append(declarationOf(postcss.decl({ prop: 'width', value: '1px' })));
    assert.equal(record.declarations.length, 2);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('declarations should read the records under consistency checks, before write-back brings the node in step', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const rule = postcss.parse('a{color:red}').first;
    const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
    record.removeDeclarationsAt(new Set([0]));
    assert.equal(record.declarations.length, 0);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('assertFresh should throw under consistency checks when a comment was added to the node without the record', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const rule = postcss.parse('a{color:red}').first;
    const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
    rule.append(postcss.comment({ text: 'note' }));
    assert.throws(() => record.assertFresh(), /stale/v);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('childCount should throw on a rule that holds a block', () => {
  const rule = postcss.parse('a{b{color:red}}').first;
  const record = new RuleRecord(rule, rule.selectors, []);
  record.setBlock(new BlockRecord(rule, null, 0, false));
  assert.throws(() => record.childCount(), /block/v);
});

test('holdsOnlyDeclarations should throw on a rule that holds a block', () => {
  const rule = postcss.parse('a{b{color:red}}').first;
  const record = new RuleRecord(rule, rule.selectors, []);
  record.setBlock(new BlockRecord(rule, null, 0, false));
  assert.throws(() => record.holdsOnlyDeclarations(), /block/v);
});

test('append should throw on a rule that holds a block', () => {
  const rule = postcss.parse('a{b{color:red}}').first;
  const record = new RuleRecord(rule, rule.selectors, []);
  record.setBlock(new BlockRecord(rule, null, 0, false));
  assert.throws(
    () =>
      record.append(
        declarationOf(postcss.decl({ prop: 'width', value: '1px' }))
      ),
    /block/v
  );
});

test('declarations should throw on a rule that holds a block', () => {
  const rule = postcss.parse('a{b{color:red}}').first;
  const record = new RuleRecord(rule, rule.selectors, []);
  record.setBlock(new BlockRecord(rule, null, 0, false));
  assert.throws(() => record.declarations, /block/v);
});

test('append should give an appended declaration without raws.before the whitespace of the last child', () => {
  const rule = postcss.parse('a{\n  color:red}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  const node = postcss.decl({ prop: 'width', value: '1px' });
  record.append(declarationOf(node));
  assert.equal(node.raws.before, '\n  ');
});

test('append should leave the whitespace of a declaration appended to a rule with no children unset', () => {
  const rule = postcss.parse('a{}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  const node = postcss.decl({ prop: 'width', value: '1px' });
  record.append(declarationOf(node));
  assert.equal(node.raws.before, undefined);
});
