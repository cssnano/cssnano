import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import postcss from 'postcss';
import {
  attachedTableCount,
  BlockTable,
  enableConsistencyChecks,
  invalidate,
} from '../../../src/passes/ir/blockTable.js';
import {
  applyChildEdits,
  detach,
  insertAfter,
} from '../../../src/passes/merge/lib/deferredChildEdits.js';

/** @import {AtRule, ChildNode, Declaration, Root, Rule} from 'postcss' */

/** @type {BlockTable[]} */
const attachedTables = [];

/**
 * A table attached to `root`, detached after the test so the next starts with none.
 *
 * @param {Root} root
 * @return {BlockTable}
 */
function attach(root) {
  const table = new BlockTable(root);
  attachedTables.push(table);
  return table;
}

afterEach(() => {
  for (const table of attachedTables.splice(0)) table.detach();
});

/**
 * Counts the reads of `node.parent` while `invalidate` runs on it.
 *
 * @param {ChildNode} node
 * @return {number}
 */
function parentReadsOf(node) {
  const parent = node.parent;
  let reads = 0;
  Object.defineProperty(node, 'parent', {
    get() {
      reads++;
      return parent;
    },
  });
  invalidate(node);
  return reads;
}

/**
 * @param {string} css
 * @return {Root}
 */
function parse(css) {
  return postcss.parse(css);
}

/**
 * @param {Root} root
 * @return {AtRule}
 */
function firstAtRule(root) {
  return /** @type {AtRule} */ (root.first);
}

test('block table: opaque is true for a block holding an at-rule it cannot analyse', () => {
  const table = new BlockTable();
  assert.equal(
    table.opaque(firstAtRule(parse('@media print{@layer x{a{color:red}}}'))),
    true
  );
});

test('block table: opaque is false for a conditional group rule holding only rules', () => {
  const table = new BlockTable();
  assert.equal(
    table.opaque(firstAtRule(parse('@media print{a{color:red}}'))),
    false
  );
});

test('block table: declarations lists the declarations of a block at any depth and skips comments', () => {
  const table = new BlockTable();
  const root = parse('@media print{a{color:red;& b{width:1px}}/* note */}');
  assert.deepEqual(
    table.declarations(firstAtRule(root)).map((d) => d.prop),
    ['color', 'width']
  );
  assert.deepEqual(
    table.declarations(/** @type {ChildNode} */ (parse('/* x */').first)),
    []
  );
});

test('block table: an unattached table reads the tree on every call, so an unreported edit shows', () => {
  const table = new BlockTable();
  const root = parse('@media print{a{color:red}}');
  const media = firstAtRule(root);
  assert.equal(table.declarations(media).length, 1);
  /** @type {Rule} */ (media.first).append(
    postcss.decl({ prop: 'width', value: '1px' })
  );
  assert.equal(table.declarations(media).length, 2);
});

test('block table: an attached table answers from its summary, so an edit it is not told about stays hidden', () => {
  const root = parse('@media print{a{color:red}}');
  const media = firstAtRule(root);
  const table = attach(root);
  assert.equal(table.declarations(media).length, 1);
  /** @type {Rule} */ (media.first).append(
    postcss.decl({ prop: 'width', value: '1px' })
  );
  assert.equal(table.declarations(media).length, 1);
});

test('block table: an edit reported through invalidate is seen by the next declarations read', () => {
  const root = parse('@media print{a{color:red}}');
  const media = firstAtRule(root);
  const table = attach(root);
  table.declarations(media);
  const rule = /** @type {Rule} */ (media.first);
  invalidate(rule);
  rule.append(postcss.decl({ prop: 'width', value: '1px' }));
  assert.deepEqual(
    table.declarations(media).map((d) => d.prop),
    ['color', 'width']
  );
});

test('block table: invalidate drops the summary of every ancestor of the edited node', () => {
  const root = parse('@media print{@media screen{a{color:red}}}');
  const outer = firstAtRule(root);
  const inner = /** @type {AtRule} */ (outer.first);
  const table = attach(root);
  table.declarations(outer);
  table.declarations(inner);
  const rule = /** @type {Rule} */ (inner.first);
  invalidate(rule);
  rule.append(postcss.decl({ prop: 'width', value: '1px' }));
  assert.equal(table.declarations(outer).length, 2);
});

test('block table: invalidate leaves the summary of a sibling block as it was', () => {
  const root = parse('@media print{a{color:red}}@media screen{b{width:1px}}');
  const [print, screen] = /** @type {AtRule[]} */ (root.nodes);
  const table = attach(root);
  table.declarations(screen);
  invalidate(/** @type {Rule} */ (print.first));
  /** @type {Rule} */ (print.first).append(
    postcss.decl({ prop: 'margin', value: '0' })
  );
  // The sibling's summary is untouched, so it still reads from the table.
  /** @type {Rule} */ (screen.first).append(
    postcss.decl({ prop: 'margin', value: '0' })
  );
  assert.equal(table.declarations(screen).length, 1);
});

test('block table: invalidate on a detached node reaches no table', () => {
  const root = parse('@media print{a{color:red}}');
  const table = attach(root);
  const media = firstAtRule(root);
  table.declarations(media);
  const detached = parse('a{color:red}').first;
  assert.doesNotThrow(() => invalidate(/** @type {ChildNode} */ (detached)));
});

test('block table: a removed declaration is gone from the next read once the deferred edits apply', () => {
  const root = parse('@media print{a{color:red;width:1px}}');
  const media = firstAtRule(root);
  const table = attach(root);
  const rule = /** @type {Rule} */ (media.first);
  assert.equal(table.declarations(media).length, 2);
  detach(/** @type {Declaration} */ (rule.first));
  applyChildEdits(rule);
  assert.deepEqual(
    table.declarations(media).map((d) => d.prop),
    ['width']
  );
});

test('block table: a declaration inserted by a deferred edit is seen once the edits apply', () => {
  const root = parse('@media print{a{color:red}}');
  const media = firstAtRule(root);
  const table = attach(root);
  const rule = /** @type {Rule} */ (media.first);
  assert.equal(table.declarations(media).length, 1);
  const added = postcss.decl({ prop: 'width', value: '1px' });
  insertAfter(rule, /** @type {Declaration} */ (rule.first), added);
  applyChildEdits(rule);
  assert.deepEqual(
    table.declarations(media).map((d) => d.prop),
    ['color', 'width']
  );
});

test('block table: an at-rule inserted into a block makes the next opaque read true', () => {
  const root = parse('@media print{a{color:red}}');
  const media = firstAtRule(root);
  const table = attach(root);
  assert.equal(table.opaque(media), false);
  const rule = /** @type {Rule} */ (media.first);
  insertAfter(
    media,
    rule,
    postcss.atRule({ name: 'layer', params: 'x', nodes: [] })
  );
  applyChildEdits(media);
  assert.equal(table.opaque(media), true);
});

test('block table: no table is attached at the start of a test', () => {
  assert.equal(attachedTableCount(), 0);
});

test('block table: attaching a table counts it until it is detached', () => {
  const table = attach(parse('a{color:red}'));
  assert.equal(attachedTableCount(), 1);
  table.detach();
  assert.equal(attachedTableCount(), 0);
});

test('block table: invalidate reads no parent while no table is attached', () => {
  const rule = /** @type {ChildNode} */ (
    firstAtRule(parse('@media print{a{color:red}}')).first
  );
  assert.equal(parentReadsOf(rule), 0);
});

test('block table: invalidate reads the parents of the edited node while a table is attached', () => {
  const root = parse('@media print{a{color:red}}');
  attach(root);
  const rule = /** @type {ChildNode} */ (firstAtRule(root).first);
  assert.ok(parentReadsOf(rule) > 0);
});

test('block table: a detached table answers from the tree, so a later edit is seen', () => {
  const root = parse('@media print{a{color:red}}');
  const media = firstAtRule(root);
  const table = attach(root);
  assert.equal(table.declarations(media).length, 1);
  table.detach();
  /** @type {Rule} */ (media.first).append(
    postcss.decl({ prop: 'width', value: '1px' })
  );
  assert.equal(table.declarations(media).length, 2);
});

test('block table: with consistency checks on, a summary that an unreported edit made stale throws on the next read', () => {
  enableConsistencyChecks(true);
  try {
    const root = parse('@media print{a{color:red}}');
    const media = firstAtRule(root);
    const table = attach(root);
    table.declarations(media);
    /** @type {Rule} */ (media.first).append(
      postcss.decl({ prop: 'width', value: '1px' })
    );
    assert.throws(() => table.declarations(media), /stale/v);
  } finally {
    enableConsistencyChecks(false);
  }
});

test('block table: with consistency checks on, a summary that every edit reported reads without throwing', () => {
  enableConsistencyChecks(true);
  try {
    const root = parse('@media print{a{color:red}}');
    const media = firstAtRule(root);
    const table = attach(root);
    table.declarations(media);
    const rule = /** @type {Rule} */ (media.first);
    invalidate(rule);
    rule.append(postcss.decl({ prop: 'width', value: '1px' }));
    assert.equal(table.declarations(media).length, 2);
  } finally {
    enableConsistencyChecks(false);
  }
});

test('block table: with consistency checks off, a stale summary reads without throwing', () => {
  const root = parse('@media print{a{color:red}}');
  const media = firstAtRule(root);
  const table = attach(root);
  table.declarations(media);
  /** @type {Rule} */ (media.first).append(
    postcss.decl({ prop: 'width', value: '1px' })
  );
  assert.equal(table.declarations(media).length, 1);
});
