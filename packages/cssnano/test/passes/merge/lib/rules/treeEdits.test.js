import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
  moveChildren,
  remove,
  removeDeclarations,
  removeRules,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  replaceChildren,
  writeBack,
} from '../../../../../src/passes/merge/lib/rules/writeBack.js';

/** @import {BlockRecord} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

/** @import {ChildNode, Container, Declaration, Rule} from 'postcss' */

// The records check the declarations they hold against the tree at each read,
// so an edit that leaves a record stale throws here.
before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  return { root, state };
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

test('moveChildren should move the declarations of the source into the target and its ancestors', () => {
  const { root, state } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [media, other] = /** @type {Container} */ (supports).nodes;

  moveChildren(
    /** @type {BlockRecord} */ (
      state.records.blockOf(/** @type {Container} */ (media))
    ),
    /** @type {BlockRecord} */ (
      state.records.blockOf(/** @type {Container} */ (other))
    )
  );
  // The source keeps its emptied block until the pair is joined, so the
  // ancestors are read once the source is removed.
  remove(state.records.blockOf(/** @type {Container} */ (other)));
  writeBack(state.records.blocks());

  assert.deepEqual(treeProps(media), ['color', 'width']);
  assert.deepEqual(treeProps(supports), ['color', 'width']);
});

test('moveChildren should leave the source container holding no children', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  const [media, other] = /** @type {Container} */ (root).nodes;
  moveChildren(
    /** @type {BlockRecord} */ (
      state.records.blockOf(/** @type {Container} */ (media))
    ),
    /** @type {BlockRecord} */ (
      state.records.blockOf(/** @type {Container} */ (other))
    )
  );
  writeBack(state.records.blocks());
  assert.deepEqual(/** @type {Container} */ (other).nodes, []);
});

test('remove should drop the declarations of the removed node from its ancestors once written back', () => {
  const { root, state } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [, removed] = /** @type {Container} */ (supports).nodes;

  remove(state.records.blockOf(/** @type {Container} */ (removed)));
  writeBack(state.records.blocks());

  assert.deepEqual(treeProps(supports), ['color']);
});

test('remove should take the node out of the records of its parent at once', () => {
  const { root, state } = setup('a{color:red}b{color:red}');
  const [first, second] = /** @type {Rule[]} */ (root.nodes);
  remove(state.records.metaOf(first));
  assert.deepEqual(state.records.root.liveChildren(), [second]);
});

test('writeBack should drop the removed nodes from the child list of the parent', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  remove(state.records.metaOf(root.first));
  writeBack(state.records.blocks());
  assert.deepEqual(selectorsOf(root), ['b', 'c']);
});

test('takePlaceOf should place the earlier node where the later one stood', () => {
  const { root, state } = setup('a{color:red}\n\nb{color:blue}');
  const [earlier, later] = /** @type {Rule[]} */ (root.nodes);
  takePlaceOf(
    state,
    root,
    state.records.metaOf(earlier),
    state.records.metaOf(later)
  );
  writeBack(state.records.blocks());
  assert.deepEqual(selectorsOf(root), ['a']);
});

test('takePlaceOf should keep the whitespace before the later node', () => {
  const { root, state } = setup('a{color:red}\n\nb{color:blue}');
  const [earlier, later] = /** @type {Rule[]} */ (root.nodes);
  takePlaceOf(
    state,
    root,
    state.records.metaOf(earlier),
    state.records.metaOf(later)
  );
  writeBack(state.records.blocks());
  assert.equal(root.toString(), '\n\na{color:red}');
});

test('takePlaceOf should place the earlier node after a removal in the same parent', () => {
  const { root, state } = setup('x{color:red}\na{color:red}\nb{color:red}');
  const [removed, earlier, later] = /** @type {Rule[]} */ (root.nodes);
  remove(state.records.metaOf(removed));
  takePlaceOf(
    state,
    root,
    state.records.metaOf(earlier),
    state.records.metaOf(later)
  );
  writeBack(state.records.blocks());
  assert.deepEqual(selectorsOf(root), ['a']);
});

test('takePlaceOf should hand the leading whitespace of a removed first root child to the next child', () => {
  const { root, state } = setup('x{color:red}\na{color:red}\nb{color:red}');
  const [removed, earlier, later] = /** @type {Rule[]} */ (root.nodes);
  remove(state.records.metaOf(removed));
  takePlaceOf(
    state,
    root,
    state.records.metaOf(earlier),
    state.records.metaOf(later)
  );
  writeBack(state.records.blocks());
  assert.equal(root.toString(), '\na{color:red}');
});

test('appendToDeclarations should move the declarations of the incoming rule into the receiving rule', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    state.records.metaOf(receiving),
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    state.records.metaOf(incoming)
  );
  assert.deepEqual(treeProps(media), ['color', 'width']);
});

test('removeDeclarations should keep the declarations that are not removed', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  removeDeclarations(state, state.records.metaOf(rule), [
    /** @type {Declaration} */ (rule.first),
  ]);
  assert.deepEqual(treeProps(rule), ['width']);
});

test('removeRules should keep the rules it does not remove', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [, removed] = /** @type {Rule[]} */ (root.nodes);
  removeRules(state, new Set([state.records.metaOf(removed)]));
  writeBack(state.records.blocks());
  assert.deepEqual(selectorsOf(root), ['a', 'c']);
});

// A root that loses its first rule keeps the whitespace of the rest, which
// `removeRules` hands the rest as their own, unlike `remove`.
test('removeRules should keep the leading whitespace of the rule after a removed first root child', () => {
  const { root, state } = setup('a{color:red}\nb{color:red}');
  const [removed] = /** @type {Rule[]} */ (root.nodes);
  removeRules(state, new Set([state.records.metaOf(removed)]));
  writeBack(state.records.blocks());
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

test('replaceChildren should keep the whitespace before a rule moved into another container', () => {
  const { root } = setup(
    '@media print{a{color:red}}\n\n@media print{\n  b{width:1px}\n}'
  );
  const [media1, media2] = /** @type {Container[]} */ (root.nodes);
  const moved = /** @type {ChildNode} */ (media2.first);
  replaceChildren([
    { container: media2, children: [], head: moved },
    { container: media1, children: [media1.first, moved], head: media1.first },
  ]);
  assert.equal(
    root.toString(),
    '@media print{a{color:red}\n  b{width:1px}}\n\n@media print{\n}'
  );
});

test('replaceChildren should move the declarations of a rebuilt container into its ancestors', () => {
  const { root } = setup(
    '@supports (a:b){@media print{a{color:red}}@media print{b{width:1px}}}'
  );
  const [supports] = /** @type {Container} */ (root.nodes);
  const [media1, media2] = /** @type {Container[]} */ (supports.nodes);
  const moved = /** @type {ChildNode} */ (media2.first);
  replaceChildren([
    { container: media2, children: [], head: moved },
    { container: media1, children: [media1.first, moved], head: media1.first },
  ]);
  assert.deepEqual(treeProps(supports), ['color', 'width']);
});

test('removeDeclarations should drop the removed declarations from the rule and its ancestors', () => {
  const { root, state } = setup('@media print{a{color:red;width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {Container} */ (media).first);

  removeDeclarations(state, state.records.metaOf(rule), [
    /** @type {Declaration} */ (rule.first),
  ]);

  assert.deepEqual(treeProps(media), ['width']);
});

test('removeRules should drop the declarations of the removed rules from the parent', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [removed] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );

  removeRules(state, new Set([state.records.metaOf(removed)]));
  writeBack(state.records.blocks());

  assert.deepEqual(treeProps(media), ['width']);
});
