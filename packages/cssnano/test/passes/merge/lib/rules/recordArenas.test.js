import { containers } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  AT_RULE_BLOCK,
  RULE,
  STYLESHEET,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  ruleRecordOf,
  buildTestRecords,
  withCorruptedLinks,
  placeUnlinked,
} from './liveRecords.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { assertOwnershipIsTree } from '../../../../../src/passes/merge/lib/rules/recordsCheck.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/** @import {Root, Rule} from 'postcss' */
/** @import {BlockLinks} from '../../../../../src/passes/merge/lib/rules/blockLinks.js' */
/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @typedef {BlockRecord | RuleRecord} Container */

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state };
}

/**
 * Every container reached from `block` through the chains of its entries: the
 * at-rule blocks and the rules that nest.
 *
 * @param {BlockRecords} records
 * @param {Container} block
 * @param {Container[]} found
 * @return {Container[]}
 */
function reachedBlocks(records, block, found = [block]) {
  for (
    let entry = records.links.firstChild(block.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    if (
      item.kind === STYLESHEET ||
      item.kind === AT_RULE_BLOCK ||
      (item.kind === RULE && item.context !== -1)
    ) {
      found.push(item);
      reachedBlocks(records, item, found);
    }
  }
  return found;
}

test('buildRecords should index the stylesheet as entry 0, then each rule and each declaration of a rule in document order', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  const { records } = state;
  assert.equal(records.root.index, 0);
  assert.equal(records.entryCount(), 5);
  assert.equal(records.rule(1).node.selector, 'a');
  assert.equal(records.rule(3).node.selector, 'b');
  assert.equal(records.rule(5), undefined);
});

test('a rule should keep its index and stay in the arena after it is unlinked', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const record = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  const { index } = record;
  state.records.detach(index);
  assert.equal(record.index, index);
  assert.equal(state.records.entry(index), record);
});

test('a rule recorded mid-run should take the next index of the arena', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  const { records } = state;
  const count = records.entryCount();
  const added = placeUnlinked(
    records,
    records.root.index,
    new RuleRecord(postcss.rule({ selector: 'c' }), ['c'], 'c')
  );
  assert.equal(added.index, count);
  records.moveLast(records.root.index, added.index);
  assert.equal(records.rule(added.index), added);
});

test('containers() should hold every container reached from the stylesheet record, each at its index', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}a{color:red;b{width:1px}}'
  );
  const { records } = state;
  const reached = reachedBlocks(records, records.root);
  const indexed = [...containers(records)];
  assert.equal(reached.length, indexed.length);
  for (const block of reached) {
    assert.ok(indexed.includes(block));
    assert.equal(records.container(block.index), block);
  }
});

/**
 * Whether `holder` holds the entry of `block` in its chain.
 *
 * @param {BlockRecords} records
 * @param {Container} holder
 * @param {Container} block
 * @return {boolean}
 */
function holds(records, holder, block) {
  for (
    let entry = records.links.firstChild(holder.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    if (records.entry(entry) === block) return true;
  }
  return false;
}

test('a block should name the block whose chain holds it by index, -1 for the stylesheet', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}}}a{color:red;b{width:1px}}'
  );
  const { records } = state;
  assert.equal(records.links.parentOf(records.root.index), -1);
  for (const block of reachedBlocks(records, records.root)) {
    if (block !== records.root) {
      const holder = records.enclosingContainer(block.index);
      assert.ok(holder && holds(records, holder, block));
    }
  }
});

test('a rule should name the block whose chain holds it by index', () => {
  const { state } = setup('@media (x){p{width:1px}q{height:2px}}a{color:red}');
  const { records } = state;
  for (const block of reachedBlocks(records, records.root)) {
    for (
      let entry = records.links.firstChild(block.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      if (records.entry(entry).kind === RULE) {
        assert.equal(records.links.parentOf(entry), block.index);
      }
    }
  }
});

test('a nested at-rule block should be linked into its parent chain, naming the block by index', () => {
  const { state } = setup('@media (x){@media (y){p{width:1px}}}');
  const { records } = state;
  const nested = records.blockEntry(
    records.links.firstChild(records.root.index)
  );
  assert.ok(nested);
  assert.equal(records.links.parentOf(nested.index), records.root.index);
});

test('assertOwnershipIsTree should accept the records of a stylesheet', () => {
  const { state } = setup('@media (x){a{color:red;b{width:1px}}}c{top:0}');
  assert.doesNotThrow(() => assertOwnershipIsTree(state.records));
});

test('assertOwnershipIsTree should throw when a rule is linked twice in one chain', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  const { records } = state;
  const second = records.links.lastChild(records.root.index);
  // The arena's edits never link a linked entry, so the raw links table makes
  // the chain loop from `second` to itself, as a bug inside it would.
  /** @type {BlockLinks} */ (records.links).linkLast(
    records.root.index,
    second
  );
  assert.throws(() => assertOwnershipIsTree(records), /reached twice/v);
});

test('assertOwnershipIsTree should throw when a block counts other entries than its chain holds', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  const records = withCorruptedLinks(state.records, state.records.root.index, {
    childCount: (real, index) => real.childCount(index) + 1,
  });
  assert.throws(() => assertOwnershipIsTree(records), /out of step/v);
});
