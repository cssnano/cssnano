import { invalidate } from '../../../ir/blockTable.js';
import { applyChildEdits, detach } from '../deferredChildEdits.js';
import { declarationIsEqual } from './declarations.js';

/** @import {AtRule, ChildNode, Container, Declaration, Rule} from 'postcss' */
/** @import {PropertyWrites} from './lastWriteIndex.js' */
/** @import MergeState from './mergeState.js' */

/**
 * The only edits that rule merging makes to the live tree. Each one clears the
 * summaries and descriptions of the nodes it changes, so a join cannot leave a
 * stale cache behind. Lib code outside this module edits through these names.
 */

/**
 * Appends the children of `from` to `into`, after its own. `from` is left
 * empty, so the caller removes or replaces it.
 *
 * @param {Container} into
 * @param {Container} from
 * @return {void}
 */
export function moveChildren(into, from) {
  invalidate(into);
  into.append(/** @type {ChildNode[]} */ (from.nodes).slice());
}

/**
 * Takes `node` out of its parent at once. The parent's child list catches up at
 * the next `takePlaceOf` or `flushRemovals`.
 *
 * @param {ChildNode} node
 * @return {void}
 */
export function remove(node) {
  detach(node);
}

/**
 * Applies the pending removals of `parent`, so its child list is current.
 *
 * @param {Container} parent
 * @return {void}
 */
export function flushRemovals(parent) {
  applyChildEdits(parent);
}

/**
 * Moves `earlier`, which already holds the joined content, to the place of
 * `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {Container} parent
 * @param {Rule | AtRule} earlier
 * @param {Rule | AtRule} later
 * @return {void}
 */
export function takePlaceOf(parent, earlier, later) {
  applyChildEdits(parent);
  earlier.raws.before = later.raws.before;
  // `later` leaves the tree, and the parent it shares with `earlier` is
  // cleared with `earlier`.
  invalidate(earlier);
  earlier.remove();
  later.replaceWith(earlier);
}

/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {MergeState} mergeState
 * @param {Rule} receiving
 * @param {Declaration[]} kept the declarations of `receiving`, extended in place
 * @param {PropertyWrites} index the writes of `kept`, extended in place
 * @param {Rule} incoming
 * @return {void}
 */
export function appendToDeclarations(
  mergeState,
  receiving,
  kept,
  index,
  incoming
) {
  // Both rules change, and so do their ancestors.
  invalidate(receiving);
  invalidate(incoming);
  for (const node of incoming.nodes.slice()) {
    if (node.type === 'decl') {
      const last = index.lastConflict(node);
      if (last !== -1 && declarationIsEqual(kept[last], node)) {
        node.remove();
        continue;
      }
      index.record(node, kept.length);
      kept.push(node);
    }
    receiving.append(node);
  }
  mergeState.forget(incoming);
}

/**
 * Removes `declarations` from `rule`, which keeps the others.
 *
 * @param {MergeState} mergeState
 * @param {Rule} rule
 * @param {Declaration[]} declarations
 * @return {void}
 */
export function removeDeclarations(mergeState, rule, declarations) {
  invalidate(rule);
  for (const declaration of declarations) declaration.remove();
  mergeState.forget(rule);
}

/**
 * Removes `rules` from `parent` with one pass over its children.
 *
 * @param {MergeState} mergeState
 * @param {Container} parent
 * @param {Set<Rule>} rules
 * @return {void}
 */
export function removeRules(mergeState, parent, rules) {
  if (rules.size === 0) return;
  invalidate(parent);
  const kept = /** @type {ChildNode[]} */ (parent.nodes).filter((node) => {
    if (!rules.has(/** @type {Rule} */ (node))) return true;
    mergeState.forget(/** @type {Rule} */ (node));
    return false;
  });
  parent.removeAll();
  parent.append(kept);
}

/**
 * @typedef {object} Rebuilt
 * @property {Container} container
 * @property {ChildNode[]} children the children the container takes
 * @property {ChildNode} head the first child the container held before
 */

/**
 * Gives each container its children, after every container has been emptied,
 * so a child that moves between two of them keeps the parent it is given.
 *
 * @param {Rebuilt[]} rebuilt
 * @return {void}
 */
export function replaceChildren(rebuilt) {
  for (const { container } of rebuilt) {
    invalidate(container);
    container.removeAll();
  }
  for (const { container, children, head } of rebuilt) {
    // A rule kept from the source still points at its former container.
    for (const node of children) node.parent = undefined;
    container.append(children);
    // Removing the first child of a root hands its whitespace to the next.
    if (container.type === 'root' && children.length && children[0] !== head) {
      children[0].raws.before = head.raws.before;
    }
  }
}

/**
 * Forgets a rule that a placement drops. The rule leaves the tree when
 * `replaceChildren` applies the placement.
 *
 * @param {MergeState} mergeState
 * @param {Rule} rule
 * @return {void}
 */
export function retire(mergeState, rule) {
  mergeState.forget(rule);
}
