import {
  childCountOf,
  holdsOnlyDeclarationsOf,
} from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import {
  COMMENT,
  NO_PRELUDE,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import {
  consistencyChecksEnabled,
  enableConsistencyChecks,
} from '../../../../../src/passes/ir/consistencyChecks.js';
import { isDeclarationRule } from '../../../../../src/passes/merge/lib/rules/declarationJoin.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { ruleRecordOf, buildTestRecords, claimAt } from './liveRecords.js';
import {
  appendChild,
  removeDeclarations,
} from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

const lookup = () => ({});
const lookupB = (selector) => ({ compatible: selector !== 'b' });

/**
 * The records of `css`, built as the run builds them, with the record of its
 * first rule.
 *
 * @param {string} css
 * @return {{state: MergeState, records: BlockRecords, record: RuleRecord}}
 */
const arenaOf = (css) => {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  const { records } = state;
  return { state, records, record: ruleRecordOf(records, root.first) };
};

/**
 * A declaration record for `node`, placed in the arena of `state`, unlinked.
 *
 * @param {MergeState} state
 * @param {import('postcss').Declaration} node
 */
const declarationOf = (state, node) =>
  state.records.blockDeclaration(node, state.properties, state.declarationIds);

test('compatible should look up each selector once across repeated reads', () => {
  const record = new RuleRecord(postcss.rule(), ['a', 'b']);
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
  const record = new RuleRecord(postcss.rule(), ['a']);
  assert.equal(record.compatible(lookupB), true);
  record.addSelectors(['b'], lookupB);
  assert.equal(record.compatible(lookupB), false);
});

test('compatible should be false after absorbEarlier takes an incompatible earlier rule', () => {
  const later = new RuleRecord(postcss.rule(), ['a']);
  const earlier = new RuleRecord(postcss.rule(), ['b']);
  later.absorbEarlier(earlier, lookupB);
  assert.equal(later.compatible(lookupB), false);
});

test('recordRule should give the record of a rule the rule as its node', () => {
  const rule = postcss.parse('a{color:red}').first;
  const { state } = arenaOf('a{}');
  assert.equal(
    state.records.recordRule(rule, rule.selectors, rule.selector).node,
    rule
  );
});

test('declarationKeys should list the id of each declaration in order', () => {
  const { records, record } = arenaOf('a{color:red;top:0}');
  const [color, top] = record.declarationsOf(records);
  assert.deepEqual(declarationKeys(records, record.index).keys, [
    color.id,
    top.id,
  ]);
});

test('declarationKeys should offer the same keys as a set for membership tests', () => {
  const { records, record } = arenaOf('a{color:red;top:0}');
  assert.deepEqual(
    declarationKeys(records, record.index).keySet,
    new Set(record.declarationsOf(records).map((declaration) => declaration.id))
  );
});

test('declarationKeys should return the cached keys while the declarations are unchanged', () => {
  const { records, record } = arenaOf('a{color:red}');
  assert.equal(
    declarationKeys(records, record.index),
    declarationKeys(records, record.index)
  );
});

test('appendChild should make declarationKeys reflect the appended declaration', () => {
  const { state, records, record } = arenaOf('a{color:red}');
  declarationKeys(records, record.index);
  appendChild(
    records,
    record,
    declarationOf(state, postcss.decl({ prop: 'top', value: '0' }))
  );
  assert.deepEqual(
    declarationKeys(records, record.index).keys,
    record.declarationsOf(records).map((declaration) => declaration.id)
  );
  assert.equal(record.declarationsOf(records).length, 2);
});

test('addSelectors should keep the cached declaration keys since it leaves the declarations alone', () => {
  const { records, record } = arenaOf('a{color:red}');
  const keys = declarationKeys(records, record.index);
  record.addSelectors(['b'], lookup);
  assert.equal(declarationKeys(records, record.index), keys);
});

test('absorbEarlier should keep the cached declaration keys since it leaves the declarations alone', () => {
  const { records, record } = arenaOf('b{color:red}');
  const earlier = arenaOf('a{color:red}').record;
  const keys = declarationKeys(records, record.index);
  record.absorbEarlier(earlier, lookup);
  assert.equal(declarationKeys(records, record.index), keys);
});

test('elementKeys should list the distinct element of each selector', () => {
  const record = new RuleRecord(postcss.rule(), ['div h1', 'h1', 'p']);
  assert.deepEqual(record.elementKeys(), ['h1', 'p']);
});

test('elementKeys should be null when a selector has no element key since it could match any element', () => {
  const record = new RuleRecord(postcss.rule(), ['h1', '.a']);
  assert.equal(record.elementKeys(), null);
});

test('elementKeys should be null for a rule without selectors since an empty key list would claim the rule writes to no element', () => {
  const record = new RuleRecord(postcss.rule(), []);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should add the elements of the new selectors to the element keys', () => {
  const record = new RuleRecord(postcss.rule(), ['h1']);
  record.elementKeys();
  record.addSelectors(['p', 'h1'], lookup);
  assert.deepEqual(record.elementKeys(), ['h1', 'p']);
});

test('addSelectors should make the element keys null when a new selector has no element key', () => {
  const record = new RuleRecord(postcss.rule(), ['h1']);
  record.elementKeys();
  record.addSelectors(['.a'], lookup);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should keep null element keys since later selectors cannot restore a key', () => {
  const record = new RuleRecord(postcss.rule(), ['.a']);
  record.elementKeys();
  record.addSelectors(['h1'], lookup);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should leave element keys derivable when they were never read', () => {
  const record = new RuleRecord(postcss.rule(), ['h1']);
  record.addSelectors(['p'], lookup);
  assert.deepEqual(record.elementKeys(), ['h1', 'p']);
});

test('absorbEarlier should put the elements of both rules in the element keys', () => {
  const record = new RuleRecord(postcss.rule(), ['p']);
  const earlier = new RuleRecord(postcss.rule(), ['h1']);
  record.elementKeys();
  earlier.elementKeys();
  record.absorbEarlier(earlier, lookup);
  assert.deepEqual(record.elementKeys()?.toSorted(), ['h1', 'p']);
});

test('absorbEarlier should make the element keys null when the earlier rule has an unknown element', () => {
  const record = new RuleRecord(postcss.rule(), ['p']);
  const earlier = new RuleRecord(postcss.rule(), ['.a']);
  earlier.elementKeys();
  record.absorbEarlier(earlier, lookup);
  assert.equal(record.elementKeys(), null);
});

test('absorbEarlier should make the element keys null when this rule has an unknown element', () => {
  const record = new RuleRecord(postcss.rule(), ['.a']);
  const earlier = new RuleRecord(postcss.rule(), ['h1']);
  earlier.elementKeys();
  record.absorbEarlier(earlier, lookup);
  assert.equal(record.elementKeys(), null);
});

test('addSelectors should return the element keys the new selectors add', () => {
  const record = new RuleRecord(postcss.rule(), ['h1']);
  record.elementKeys();
  assert.deepEqual(record.addSelectors(['p', 'h1', 'em'], lookup), ['p', 'em']);
});

test('addSelectors should return no element keys when the new selectors add none', () => {
  const record = new RuleRecord(postcss.rule(), ['h1']);
  record.elementKeys();
  assert.deepEqual(record.addSelectors(['h1'], lookup), []);
});

test('addSelectors should return null when a new selector has no element key, since its writes may reach any element', () => {
  const record = new RuleRecord(postcss.rule(), ['h1']);
  record.elementKeys();
  assert.equal(record.addSelectors(['.a'], lookup), null);
});

test('addSelectors should return null when the element keys were never read, since none are listed to extend', () => {
  const record = new RuleRecord(postcss.rule(), ['h1']);
  assert.equal(record.addSelectors(['p'], lookup), null);
});

test('childCount should count a comment that a rule holds, which declarations leave out', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(childCountOf(records, record.index), 2);
});

test('declarations should leave out a comment that a rule holds', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(record.declarationsOf(records).length, 1);
});

test('holdsOnlyDeclarations should be false for a rule that holds a comment', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(holdsOnlyDeclarationsOf(records, record.index), false);
});

test('holdsOnlyDeclarations should be true for an empty rule so that empty rules still join', () => {
  const { records, record } = arenaOf('a{}');
  assert.equal(holdsOnlyDeclarationsOf(records, record.index), true);
});

test('isDeclarationRule should reject an empty rule, which holds no declaration to share', () => {
  const { records, record } = arenaOf('a{}');
  assert.equal(isDeclarationRule(records, record), false);
});

test('isDeclarationRule should reject a rule that holds a comment', () => {
  const { records, record } = arenaOf('a{/* note */color:red}');
  assert.equal(isDeclarationRule(records, record), false);
});

test('isDeclarationRule should accept a rule that holds only declarations', () => {
  const { records, record } = arenaOf('a{color:red}');
  assert.equal(isDeclarationRule(records, record), true);
});

test('appendChild should add a declaration to the declarations of a rule that holds a comment', () => {
  const { state, records, record } = arenaOf('a{/* note */color:red}');
  appendChild(
    records,
    record,
    declarationOf(state, postcss.decl({ prop: 'width', value: '1px' }))
  );
  assert.equal(record.declarationsOf(records).length, 2);
});

test('appendChild should count an appended comment among the children without adding a declaration', () => {
  const { state, records, record } = arenaOf('a{color:red}');
  appendChild(
    records,
    record,
    state.records.bareEntry(
      new NodeEntry(
        postcss.comment({ text: 'note' }),
        COMMENT,
        '',
        '',
        false,
        NO_PRELUDE
      )
    )
  );
  assert.equal(childCountOf(records, record.index), 2);
  assert.equal(record.declarationsOf(records).length, 1);
});

test('appendChild should keep the declarations in step with the children under consistency checks', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const { state, records, record } = arenaOf('a{/* note */color:red}');
    appendChild(
      records,
      record,
      declarationOf(state, postcss.decl({ prop: 'width', value: '1px' }))
    );
    assert.equal(record.declarationsOf(records).length, 2);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('declarations should read the records under consistency checks, before write-back brings the node in step', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const { records, record } = arenaOf('a{color:red}');
    removeDeclarations(records, record.index, claimAt(records, record, [0]));
    assert.equal(record.declarationsOf(records).length, 0);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('assertRecordsMatchTree should throw under consistency checks when a comment was added to the node without the record', () => {
  const wasEnabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    const root = postcss.parse('a{color:red}');
    const state = new MergeState(['chrome 120'], createRunContext());
    state.records = buildTestRecords(root, state);
    root.first.append(postcss.comment({ text: 'note' }));
    assert.throws(() => assertRecordsMatchTree(state.records), /out of step/v);
  } finally {
    enableConsistencyChecks(wasEnabled);
  }
});

test('appendChild should give an appended declaration without raws.before the whitespace of the last child', () => {
  const { state, records, record } = arenaOf('a{\n  color:red}');
  const node = postcss.decl({ prop: 'width', value: '1px' });
  const declaration = declarationOf(state, node);
  appendChild(records, record, declaration);
  assert.equal(declaration.before, '\n  ');
});

test('appendChild should leave the whitespace of a declaration appended to a rule with no children unset', () => {
  const { state, records, record } = arenaOf('a{}');
  const node = postcss.decl({ prop: 'width', value: '1px' });
  const declaration = declarationOf(state, node);
  appendChild(records, record, declaration);
  assert.equal(declaration.before, null);
});
