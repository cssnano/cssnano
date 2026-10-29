import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/blockTable.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  flushRemovals,
  moveChildren,
  remove,
  removeDeclarations,
  removeRules,
  replaceChildren,
  retire,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';

/** @import {ChildNode, Container, Declaration, Rule} from 'postcss' */

// A cached summary that an edit failed to drop throws at its next read, so
// every read below proves the edit cleared it.
before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState, blocks: import('../../../../../src/passes/ir/blockTable.js').BlockTable, ruleMeta: WeakMap<Rule, unknown>}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(root);
  return {
    root,
    state: new MergeState(['chrome 120'], context),
    blocks: context.blocks,
    ruleMeta: context.ruleMeta,
  };
}

/**
 * The properties a node holds at any depth, read from the tree alone.
 *
 * @param {ChildNode | Container} node
 * @return {string[]}
 */
function treeProps(node) {
  if (node.type === 'decl') return [/** @type {Declaration} */ (node).prop];
  return (/** @type {Container} */ (node).nodes ?? []).flatMap(treeProps);
}

/**
 * @param {ChildNode | Container} node
 * @return {string[]}
 */
function selectorsOf(node) {
  return /** @type {Container} */ (node).nodes.map(
    (child) => /** @type {Rule} */ (child).selector
  );
}

test('moveChildren should refresh the declarations of the target and of its ancestors', () => {
  const { root, blocks } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [media, other] = /** @type {Container} */ (supports).nodes;
  blocks.declarations(media);
  blocks.declarations(supports);

  moveChildren(
    /** @type {Container} */ (media),
    /** @type {Container} */ (other)
  );
  // The source keeps a stale summary until the pair is joined, so the
  // ancestors are read once the source is removed.
  remove(other);

  assert.deepEqual(
    blocks.declarations(media).map((d) => d.prop),
    treeProps(media)
  );
  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (supports)).map((d) => d.prop),
    ['color', 'width']
  );
});

test('moveChildren should refresh the opaque answer of the target', () => {
  const { root, blocks } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{@font-face{}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [media, other] = /** @type {Container} */ (supports).nodes;
  assert.equal(blocks.opaque(media), false);

  moveChildren(
    /** @type {Container} */ (media),
    /** @type {Container} */ (other)
  );

  assert.equal(blocks.opaque(media), true);
});

test('moveChildren should leave the source container holding no children', () => {
  const { root } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  const [media, other] = /** @type {Container} */ (root).nodes;
  moveChildren(
    /** @type {Container} */ (media),
    /** @type {Container} */ (other)
  );
  assert.deepEqual(/** @type {Container} */ (other).nodes, []);
});

test('remove should refresh the declarations of the ancestors of the removed node', () => {
  const { root, blocks } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [, removed] = /** @type {Container} */ (supports).nodes;
  blocks.declarations(/** @type {ChildNode} */ (supports));

  remove(removed);
  // The parent's child list catches up at its next flush.
  flushRemovals(/** @type {Container} */ (supports));

  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (supports)).map((d) => d.prop),
    ['color']
  );
});

test('remove should take the node out of its parent at once', () => {
  const { root } = setup('a{color:red}b{color:red}');
  const [first] = root.nodes;
  remove(first);
  assert.equal(first.parent, undefined);
});

test('flushRemovals should drop the removed nodes from the child list of the parent', () => {
  const { root } = setup('a{color:red}b{color:red}c{color:red}');
  remove(root.first);
  flushRemovals(root);
  assert.deepEqual(selectorsOf(root), ['b', 'c']);
});

test('takePlaceOf should place the earlier node where the later one stood', () => {
  const { root } = setup('a{color:red}\n\nb{color:blue}');
  const [earlier, later] = /** @type {Rule[]} */ (root.nodes);
  takePlaceOf(root, earlier, later);
  assert.deepEqual(selectorsOf(root), ['a']);
});

test('takePlaceOf should keep the whitespace before the later node', () => {
  const { root } = setup('a{color:red}\n\nb{color:blue}');
  const [earlier, later] = /** @type {Rule[]} */ (root.nodes);
  takePlaceOf(root, earlier, later);
  assert.equal(root.toString(), '\n\na{color:red}');
});

test('takePlaceOf should apply the pending removals of its parent first', () => {
  const { root } = setup('x{color:red}\na{color:red}\nb{color:red}');
  const [removed, earlier, later] = /** @type {Rule[]} */ (root.nodes);
  remove(removed);
  takePlaceOf(root, earlier, later);
  assert.deepEqual(selectorsOf(root), ['a']);
});

test('takePlaceOf should hand the leading whitespace of a removed first root child to the next child', () => {
  const { root } = setup('x{color:red}\na{color:red}\nb{color:red}');
  const [removed, earlier, later] = /** @type {Rule[]} */ (root.nodes);
  remove(removed);
  takePlaceOf(root, earlier, later);
  assert.equal(root.toString(), '\na{color:red}');
});

test('appendToDeclarations should forget the description of the incoming rule', () => {
  const { root, state, ruleMeta } = setup(
    '@media print{a{color:red}b{width:1px}}'
  );
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  state.meta(incoming);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.equal(ruleMeta.has(incoming), false);
});

test('appendToDeclarations should refresh the declarations of the receiving rule', () => {
  const { root, state, blocks } = setup(
    '@media print{a{color:red}b{width:1px}}'
  );
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  blocks.declarations(/** @type {ChildNode} */ (media));
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (media)).map((d) => d.prop),
    ['color', 'width']
  );
});

test('removeDeclarations should keep the declarations that are not removed', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  removeDeclarations(state, rule, [/** @type {Declaration} */ (rule.first)]);
  assert.deepEqual(treeProps(rule), ['width']);
});

test('removeRules should forget each rule it removes', () => {
  const { root, state, ruleMeta } = setup(
    'a{color:red}b{color:red}c{color:red}'
  );
  const [, removed] = /** @type {Rule[]} */ (root.nodes);
  state.meta(removed);
  removeRules(state, root, new Set([removed]));
  assert.equal(ruleMeta.has(removed), false);
});

test('removeRules should keep the rules it does not remove', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [, removed] = /** @type {Rule[]} */ (root.nodes);
  removeRules(state, root, new Set([removed]));
  assert.deepEqual(selectorsOf(root), ['a', 'c']);
});

// A root that loses its first rule keeps the whitespace of the rest, as the
// local detach of declarationJoin.js did before the edits moved here, which
// differs from the rebuild in applyChildEdits.
test('removeRules should keep the leading whitespace of the rule after a removed first root child', () => {
  const { root, state } = setup('a{color:red}\nb{color:red}');
  const [removed] = /** @type {Rule[]} */ (root.nodes);
  removeRules(state, root, new Set([removed]));
  assert.equal(root.toString(), '\nb{color:red}');
});

test('replaceChildren should move a child to the container given for it', () => {
  const { root } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  const [media1, media2] = /** @type {Container[]} */ (root.nodes);
  const moved = /** @type {ChildNode} */ (media2.first);
  replaceChildren([
    { container: media2, children: [], head: moved },
    { container: media1, children: [media1.first, moved], head: media1.first },
  ]);
  assert.equal(moved.parent, media1);
});

test('replaceChildren should leave the container that gave up a child empty', () => {
  const { root } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  const [media1, media2] = /** @type {Container[]} */ (root.nodes);
  const moved = /** @type {ChildNode} */ (media2.first);
  replaceChildren([
    { container: media2, children: [], head: moved },
    { container: media1, children: [media1.first, moved], head: media1.first },
  ]);
  assert.deepEqual(media2.nodes, []);
});

test('replaceChildren should refresh the declarations of the ancestors of a rebuilt container', () => {
  const { root, blocks } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [media1, media2] = /** @type {Container[]} */ (supports.nodes);
  blocks.declarations(/** @type {ChildNode} */ (supports));
  const moved = /** @type {ChildNode} */ (media2.first);
  replaceChildren([
    { container: media2, children: [], head: moved },
    { container: media1, children: [media1.first, moved], head: media1.first },
  ]);
  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (supports)).map((d) => d.prop),
    ['color', 'width']
  );
});

test('removeDeclarations should refresh the declarations of the rule and of its ancestors', () => {
  const { root, state, blocks } = setup('@media print{a{color:red;width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {Container} */ (media).first);
  blocks.declarations(/** @type {ChildNode} */ (media));
  blocks.declarations(rule);

  removeDeclarations(state, rule, [/** @type {Declaration} */ (rule.first)]);

  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (media)).map((d) => d.prop),
    ['width']
  );
});

test('removeRules should refresh the declarations of the parent', () => {
  const { root, state, blocks } = setup(
    '@media print{a{color:red}b{width:1px}}'
  );
  const [media] = /** @type {Container} */ (root).nodes;
  const [removed] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  blocks.declarations(/** @type {ChildNode} */ (media));

  removeRules(state, /** @type {Container} */ (media), new Set([removed]));

  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (media)).map((d) => d.prop),
    ['width']
  );
});

test('flushRemovals should refresh a summary that was read between the removal and the flush', () => {
  const { root, blocks } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [, removed] = /** @type {Container} */ (supports).nodes;
  remove(removed);
  // The summary still counts the removed node, which the flush takes out.
  blocks.declarations(/** @type {ChildNode} */ (supports));

  flushRemovals(/** @type {Container} */ (supports));

  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (supports)).map((d) => d.prop),
    ['color']
  );
});

test('replaceChildren should refresh the summaries of each rebuilt container', () => {
  const { root, blocks } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [media1, media2] = /** @type {Container[]} */ (supports.nodes);
  blocks.declarations(/** @type {ChildNode} */ (media1));
  blocks.declarations(/** @type {ChildNode} */ (media2));
  blocks.declarations(/** @type {ChildNode} */ (supports));
  const moved = /** @type {ChildNode} */ (media2.first);
  replaceChildren([
    { container: media2, children: [], head: moved },
    { container: media1, children: [moved, media1.first], head: media1.first },
  ]);
  assert.deepEqual(
    blocks.declarations(/** @type {ChildNode} */ (media1)).map((d) => d.prop),
    ['width', 'color']
  );
});

test('retire should forget the description of the rule', () => {
  const { root, state, ruleMeta } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  state.meta(rule);
  retire(state, rule);
  assert.equal(ruleMeta.has(rule), false);
});

test('retire should leave the rule in the tree', () => {
  const { root, state } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  retire(state, rule);
  assert.equal(rule.parent, root);
});
