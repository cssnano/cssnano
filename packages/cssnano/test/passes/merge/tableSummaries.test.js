import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import {
  BlockTable,
  enableConsistencyChecks,
} from '../../../src/passes/ir/blockTable.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { mergePass } from '../../../src/passes/merge/index.js';
import {
  applyChildEdits,
  detach,
} from '../../../src/passes/merge/lib/deferredChildEdits.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import joinByDeclarations from '../../../src/passes/merge/lib/rules/declarationJoin.js';
import RuleSequence from '../../../src/passes/merge/lib/rules/ruleSequence.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';

/** @import {AtRule, Declaration, Root, Rule} from 'postcss' */

// Each test reads a summary before and after an edit, so a summary the edit
// should have dropped throws here.
before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * The properties of a block's declarations, as its summary reports them.
 *
 * @param {BlockTable} table
 * @param {AtRule} block
 * @return {string[]}
 */
function propsOf(table, block) {
  return table.declarations(block).map((declaration) => declaration.prop);
}

test('block table: a join that empties a rule leaves its at-rule summary equal to the tree', () => {
  const root = postcss.parse('@media print{a{color:red}b{color:red}}');
  const context = createRunContext(root);
  try {
    const media = /** @type {AtRule} */ (root.first);
    const mergeState = new MergeState(['Chrome 120'], context);
    assert.deepEqual(propsOf(context.blocks, media), ['color', 'color']);
    joinByDeclarations(media, mergeState);
    assert.equal(media.toString(), '@media print{a,b{color:red}}');
    assert.deepEqual(propsOf(context.blocks, media), ['color']);
  } finally {
    context.blocks.detach();
  }
});

test('block table: a sequence move that rebuilds a conditional group leaves its summary equal to the tree', () => {
  const root = /** @type {Root} */ (
    postcss.parse('@media print{a{color:red}}b{width:1px}')
  );
  const context = createRunContext(root);
  try {
    const media = /** @type {AtRule} */ (root.first);
    assert.deepEqual(propsOf(context.blocks, media), ['color']);
    const sequence = new RuleSequence(root);
    const first = /** @type {NonNullable<typeof sequence.head.next>} */ (
      sequence.head.next
    );
    const second = /** @type {NonNullable<typeof first.next>} */ (first.next);
    assert.equal(sequence.moveIntoParent(first, second), true);
    sequence.write();
    assert.deepEqual(propsOf(context.blocks, media), ['color', 'width']);
  } finally {
    context.blocks.detach();
  }
});

test('block table: a read between a deferred removal and its apply does not hide the removal afterwards', () => {
  const root = postcss.parse('@media print{a{color:red;width:1px}}');
  const table = new BlockTable(root);
  try {
    const media = /** @type {AtRule} */ (root.first);
    const rule = /** @type {Rule} */ (media.first);
    detach(/** @type {Declaration} */ (rule.first));
    // The tree still lists the removed declaration here, so the read is right.
    assert.deepEqual(propsOf(table, media), ['color', 'width']);
    applyChildEdits(rule);
    assert.deepEqual(propsOf(table, media), ['width']);
  } finally {
    table.detach();
  }
});

// In the joined @media (y), the forward pass moves the `a` rule down past the
// first @media (z), so the backward pass hands the second @media (z) up to the
// first, whose summary the next forward pass reads.
test('block table: a backward pass that hands a block up leaves the receiving summary equal to the tree', () => {
  const root = postcss.parse(
    '@media (y){@media (z){a{color:red}}a{color:blue;width:1px}}@media (y){@media (z){b{width:1px}a{margin:0}}a{margin:0}@media (z){a{color:blue}}}'
  );
  mergePass(root, resolveTargets({}, undefined));
  assert.equal(
    root.toString(),
    '@media (y){@media (z){a{color:red;margin:0}b{width:1px}}a{color:blue;width:1px;margin:0}@media (z){a{color:blue}}}'
  );
});
