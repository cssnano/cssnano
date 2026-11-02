import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { BlockRecords } from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import { BlockRecord } from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import {
  RuleRecord,
  isDeclaration,
} from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import { DeclarationKeys } from '../../../../../src/passes/ir/declarationKey.js';
import { recordDeclaration } from '../../../../../src/passes/ir/declarationRecord.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';

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

/** An arena for the calls that read no nested block. */
const noBlocks = new BlockRecords(new BlockRecord(postcss.root(), false));

test('removeDeclarationsAt should keep the comment that a rule holds', () => {
  const rule = postcss.parse('a{color:red;/* note */width:1px}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.removeDeclarationsAt(new Set([0]));
  assert.equal(record.childCount(), 2);
});

test('removeDeclarationsAt should leave the nodes of a rule holding a comment as they were, until write-back', () => {
  const rule = postcss.parse('a{color:red;/* note */width:1px}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.removeDeclarationsAt(new Set([0]));
  assert.deepEqual(
    rule.nodes.map((node) => node.type),
    ['decl', 'comment', 'decl']
  );
  assert.equal(record.edited, true);
});

test('removeDeclarationsAt should keep the declarations in step with the children under consistency checks', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const rule = postcss.parse('a{color:red;/* note */width:1px}').first;
    const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
    record.removeDeclarationsAt(new Set([0]));
    assert.equal(record.declarations.length, 1);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('takeDeclarationsAt should return the records of the claimed declarations in order', () => {
  const rule = postcss.parse('a{color:red;width:1px;height:2px}').first;
  const records = recordsOf(rule);
  const record = new RuleRecord(rule, rule.selectors, [...records]);
  assert.deepEqual(record.takeDeclarationsAt(new Set([0, 2])), [
    records[0],
    records[2],
  ]);
});

test('takeDeclarationsAt should leave the taken declaration nodes in the rule until write-back', () => {
  const rule = postcss.parse('a{color:red;width:1px;height:2px}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.takeDeclarationsAt(new Set([0, 2]));
  assert.deepEqual(
    rule.nodes.map((node) => node.prop),
    ['color', 'width', 'height']
  );
});

test('takeDeclarationsAt should leave the unclaimed declarations in the record', () => {
  const rule = postcss.parse('a{color:red;width:1px;height:2px}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.takeDeclarationsAt(new Set([0, 2]));
  assert.deepEqual(
    record.declarations.map((declaration) => declaration.prop),
    ['width']
  );
});

test('takeDeclarationsAt should leave the comment that a rule holds', () => {
  const rule = postcss.parse('a{color:red;/* note */width:1px}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  record.takeDeclarationsAt(new Set([0, 1]));
  assert.equal(record.childCount(), 1);
});

test('takeDeclarationsAt should keep the raws.before of a taken declaration', () => {
  const rule = postcss.parse('a{\n    color:red;\n    width:1px}').first;
  const record = new RuleRecord(rule, rule.selectors, recordsOf(rule));
  const [taken] = record.takeDeclarationsAt(new Set([1]));
  assert.equal(taken.node.raws.before, '\n    ');
});

test('removeDeclarationsAt should drop the keys of the removed declarations from the declaration keys', () => {
  const rule = postcss.parse('a{color:red;width:1px}').first;
  const records = recordsOf(rule);
  const record = new RuleRecord(rule, rule.selectors, [...records]);
  record.declarationKeys(noBlocks);
  record.removeDeclarationsAt(new Set([0]));
  assert.deepEqual(record.declarationKeys(noBlocks).keys, [records[1].id]);
});

test('takeDeclarationsAt should drop the keys of the taken declarations from the declaration keys', () => {
  const rule = postcss.parse('a{color:red;width:1px}').first;
  const records = recordsOf(rule);
  const record = new RuleRecord(rule, rule.selectors, [...records]);
  record.declarationKeys(noBlocks);
  record.takeDeclarationsAt(new Set([0]));
  assert.deepEqual(record.declarationKeys(noBlocks).keys, [records[1].id]);
});

test('takeDeclarationsAt should throw on a rule that nests', () => {
  const rule = postcss.parse('a{b{color:red}}').first;
  const record = new RuleRecord(rule, rule.selectors, []);
  record.context = 0; // any context: these tests never read it
  assert.throws(() => record.takeDeclarationsAt(new Set()), /nests/v);
});

test('removeDeclarationsAt should throw on a rule that nests', () => {
  const rule = postcss.parse('a{b{color:red}}').first;
  const record = new RuleRecord(rule, rule.selectors, []);
  record.context = 0; // any context: these tests never read it
  assert.throws(() => record.removeDeclarationsAt(new Set()), /nests/v);
});
