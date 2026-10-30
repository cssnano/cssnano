import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { BlockRecord } from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { joinNonAdjacent } from '../../../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import runScan from '../../../../../src/passes/merge/lib/rules/scan.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { writeBack } from '../../../../../src/passes/merge/lib/rules/writeBack.js';

/** @import {Container, Root} from 'postcss' */

/**
 * Makes each rule's `parent` and each block's `nodes` throw when read or
 * written, so a join that reads the tree instead of its records fails here.
 * Returns the function that restores the plain properties.
 *
 * @param {Root} root
 * @return {() => void}
 */
function armGuard(root) {
  /** @type {{target: object, property: string, descriptor: PropertyDescriptor | undefined}[]} */
  const saved = [];
  const arm = (target, property) => {
    saved.push({
      target,
      property,
      descriptor: Object.getOwnPropertyDescriptor(target, property),
    });
    Object.defineProperty(target, property, {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error(`guarded read of ${property}`);
      },
      set() {
        throw new Error(`guarded write of ${property}`);
      },
    });
  };
  // Collected before arming, since reading a guarded block would throw.
  const rules = [];
  const blocks = [];
  root.walk((node) => {
    if (node.type === 'rule' || node.type === 'atrule') rules.push(node);
    if (
      node.type !== 'decl' &&
      /** @type {Container} */ (node).nodes?.some(isRuleOrAtRule)
    ) {
      blocks.push(node);
    }
  });
  arm(root, 'nodes');
  for (const node of rules) arm(node, 'parent');
  for (const node of blocks) arm(node, 'nodes');
  return () => {
    for (const { target, property, descriptor } of saved) {
      if (descriptor) Object.defineProperty(target, property, descriptor);
      else delete target[property];
    }
  };
}

/**
 * @param {import('postcss').ChildNode} node
 * @return {boolean}
 */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * Builds the records of `css` and runs the sweep that precedes each join, as
 * `runMerge` does.
 *
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function scanned(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  runScan(state);
  return { root, state };
}

/**
 * The records of the stylesheet and of each at-rule block it holds, without
 * dropped ones. Rule blocks are reached through their slots and not needed here.
 *
 * @param {BlockRecord} block
 * @return {BlockRecord[]}
 */
function liveBlocks(block) {
  const blocks = [block];
  for (const entry of block.children) {
    if (entry instanceof BlockRecord && !entry.dropped) {
      blocks.push(...liveBlocks(entry));
    }
  }
  return blocks;
}

test('joinNonAdjacent should join a selector repeated after another rule without reading the tree', () => {
  const { root, state } = scanned('a{color:red}b{color:blue}a{margin:0}');
  const restore = armGuard(root);
  let joined;
  try {
    joined = joinNonAdjacent(state.records.root, state);
  } finally {
    restore();
  }
  assert.equal(joined, true);
});

test('joinNonAdjacent should move an at-rule block into an earlier one without reading the tree', () => {
  const { root, state } = scanned(
    '@media print{a{color:red}}b{color:blue}@media print{c{margin:0}}'
  );
  const restore = armGuard(root);
  let joined;
  try {
    joined = joinNonAdjacent(state.records.root, state);
  } finally {
    restore();
  }
  assert.equal(joined, true);
});

test('a rule that a join removes has no parent after write-back', () => {
  const { root, state } = scanned('a{color:red}b{color:blue}a{margin:0}');
  const [, , removed] = root.nodes;
  joinNonAdjacent(state.records.root, state);
  writeBack(liveBlocks(state.records.root));
  assert.equal(removed.parent, undefined);
});

test('runScan should merge a pair of adjacent rules without reading the tree', () => {
  const root = postcss.parse('a{color:red}b{color:red}');
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const restore = armGuard(root);
  try {
    assert.doesNotThrow(() => runScan(state));
  } finally {
    restore();
  }
});

test('runScan should leave the child list of the stylesheet as it was until write-back', () => {
  const { root, state } = scanned('a{color:red}b{color:red}');
  assert.equal(root.nodes.length, 2);
  writeBack(liveBlocks(state.records.root));
  assert.equal(root.nodes.length, 1);
});
