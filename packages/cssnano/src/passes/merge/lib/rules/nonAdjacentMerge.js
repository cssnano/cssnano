import cssnanoUtils from '#utils';
import LastWriteIndex, { isConditionalGroupRule } from './lastWriteIndex.js';
import { applyChildEdits, detach } from '../deferredChildEdits.js';
import { invalidate } from '../../../ir/blockTable.js';
import joinByDeclarations from './declarationJoin.js';
import { appendToDeclarations, writesOf } from './ruleRewrite.js';
import RepeatScan from './repeatScan.js';
import { getDecls } from './ruleMeta.js';
import { isKeyframes } from './sameContainer.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {AtRule, Container, ChildNode, Declaration, Rule} from 'postcss' */
/** @import {PropertyWrites} from './lastWriteIndex.js' */
/** @import MergeState from './mergeState.js' */

/**
 * The key under which a child can join an earlier sibling, or null if it
 * cannot join any.
 *
 * @param {ChildNode} node
 * @param {boolean} joinRules
 * @param {MergeState} mergeState
 * @return {string | null}
 */
function joinKey(node, joinRules, mergeState) {
  if (node.type === 'rule') {
    return joinRules ? `{${mergeState.meta(node).selectorText()}` : null;
  }
  return isConditionalGroupRule(node) && node.nodes
    ? `@${asciiLowerCase(node.name)} ${node.params}`
    : null;
}

/**
 * Joins siblings that apply under the same circumstances across any nodes
 * between them that set no conflicting property, in every container except
 * style rules, whose rules the scan handles.
 *
 * Rules with the same selector set the same properties on the same elements
 * at the same specificity. The later rule moves up into the earlier one or,
 * failing that, the earlier rule moves down into the later one. Joining
 * always shrinks the output because the selector is not repeated.
 *
 * Sibling `@media`, `@supports` or `@container` blocks with identical
 * conditions apply their content under the same circumstances, so one block
 * joins the other when nothing between them, at any depth, sets a property
 * that its declarations also set. Named `@layer` blocks are left
 * out: their order comes from where each layer first appears.
 *
 * Rules that set the same declarations in the same order also share one
 * rule: a later rule adds its selectors to the earlier one, and is removed,
 * when no node between them sets a property its declarations also set.
 *
 * @param {Container} root
 * @param {MergeState} mergeState
 * @return {boolean} whether anything was joined
 */
export function joinNonAdjacent(root, mergeState) {
  // A container that joined nothing, with no edit since, joins nothing again:
  // its joins read only its own subtree, and every edit to it reaches the table.
  const { blocks } = mergeState;
  if (blocks.isSettled(root)) return false;
  const edits = blocks.edits;
  let joined = joinInParent(root, mergeState);
  joined = joinByDeclarations(root, mergeState) || joined;
  for (const child of /** @type {ChildNode[]} */ (root.nodes)) {
    if (child.type === 'atrule' && child.nodes) {
      joined = joinNonAdjacent(child, mergeState) || joined;
    }
  }
  if (!joined && blocks.edits === edits) blocks.settle(root);
  return joined;
}

/**
 * Moves `earlier`, which already holds the joined content, to the place of
 * `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {Rule | AtRule} earlier
 * @param {Rule | AtRule} later
 * @return {void}
 */
function takePlaceOf(earlier, later) {
  earlier.raws.before = later.raws.before;
  invalidate(earlier);
  earlier.remove();
  invalidate(later);
  later.replaceWith(earlier);
}

/**
 * @param {Container} parent
 * @param {MergeState} mergeState
 * @return {boolean}
 */
function joinInParent(parent, mergeState) {
  const joinRules = !isKeyframes(parent);
  // A snapshot, since joining removes nodes from the parent.
  const nodes = /** @type {ChildNode[]} */ (parent.nodes).slice();
  const keys = nodes.map((node) => joinKey(node, joinRules, mergeState));
  const scan = new RepeatScan();
  for (const [i, key] of keys.entries()) {
    if (key !== null) scan.see(key, i);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex(mergeState.properties);
  const keysOf = mergeState.elementKeysOf;
  /** @type {Map<string, {node: Rule | AtRule, position: number}>} */
  const latest = new Map();
  // Every rule with a selector joins the first rule with that selector, so
  // the joined rule keeps its declarations and their writes from one join to
  // the next: rebuilding them would make each join cost time in the growing
  // rule.
  /** @type {Map<Rule, {declarations: Declaration[], writes: PropertyWrites}>} */
  const received = new Map();
  let joined = false;
  for (let position = scan.start; position < nodes.length; position++) {
    const node = nodes[position];
    const key = keys[position];
    const earlier = key === null ? undefined : latest.get(key);
    if (earlier) {
      const direction =
        node.type === 'rule'
          ? joinRule(
              /** @type {Rule} */ (earlier.node),
              node,
              earlier.position,
              position
            )
          : joinBlock(
              /** @type {AtRule} */ (earlier.node),
              /** @type {AtRule} */ (node),
              earlier.position,
              position
            );
      if (direction === 'down') {
        latest.set(/** @type {string} */ (key), {
          node: earlier.node,
          position,
        });
      }
      if (direction) {
        joined = true;
        continue;
      }
    }
    if (key !== null) {
      latest.set(key, { node: /** @type {Rule | AtRule} */ (node), position });
    }
    index.recordNode(node, position, keysOf);
  }
  // PostCSS finds a child by scanning its parent, so the rules that moved up
  // leave the parent in one rebuild.
  applyChildEdits(parent);
  return joined;

  /**
   * Appends the declarations of `later` to `earlier`, whose description
   * follows its declarations.
   *
   * @param {Rule} earlier
   * @param {Rule} later
   * @param {Declaration[]} declarations the declarations of `earlier`
   * @return {void}
   */
  function receive(earlier, later, declarations) {
    let rule = received.get(earlier);
    if (!rule) {
      rule = {
        declarations,
        writes: writesOf(declarations, mergeState.properties),
      };
      received.set(earlier, rule);
    }
    appendToDeclarations(earlier, rule.declarations, rule.writes, later);
    mergeState.meta(earlier).setDeclarations(rule.declarations);
    mergeState.forget(later);
  }

  /**
   * @param {Rule} earlier
   * @param {Rule} later
   * @param {number} earlierPosition
   * @param {number} laterPosition
   * @return {'up' | 'down' | null} where the joined rule stands
   */
  function joinRule(earlier, later, earlierPosition, laterPosition) {
    if (!mergeState.canMerge(earlier, later)) return null;
    const laterDeclarations = getDecls(later);
    // Writes are recorded before the rewrite, while both rules still hold their
    // declarations and cached element keys. Equal selectors give equal keys.
    if (!index.conflictsSinceIn(laterDeclarations, earlierPosition, keysOf)) {
      index.moveWrites(laterDeclarations, earlierPosition, keysOf);
      receive(
        earlier,
        later,
        received.get(earlier)?.declarations ?? getDecls(earlier)
      );
      detach(later);
      return 'up';
    }
    const earlierDeclarations =
      received.get(earlier)?.declarations ?? getDecls(earlier);
    if (!index.conflictsSinceIn(earlierDeclarations, earlierPosition, keysOf)) {
      index.moveWrites(
        [...earlierDeclarations, ...laterDeclarations],
        laterPosition,
        keysOf
      );
      receive(earlier, later, earlierDeclarations);
      // A move edits the parent at once, after the pending removals.
      applyChildEdits(parent);
      takePlaceOf(earlier, later);
      return 'down';
    }
    return null;
  }

  /**
   * @param {AtRule} earlier
   * @param {AtRule} later
   * @param {number} earlierPosition
   * @param {number} laterPosition
   * @return {'up' | 'down' | null} where the joined block stands
   */
  function joinBlock(earlier, later, earlierPosition, laterPosition) {
    const { blocks } = mergeState;
    if (blocks.opaque(later)) return null;
    const declarations = blocks.declarations(later);
    if (!index.conflictsSinceIn(declarations, earlierPosition, keysOf)) {
      invalidate(earlier);
      earlier.append(/** @type {ChildNode[]} */ (later.nodes).slice());
      detach(later);
      index.moveWrites(declarations, earlierPosition, keysOf);
      return 'up';
    }
    // The earlier block's content stays first, so source order is kept.
    if (blocks.opaque(earlier)) return null;
    const earlierDeclarations = blocks.declarations(earlier);
    if (!index.conflictsSinceIn(earlierDeclarations, earlierPosition, keysOf)) {
      invalidate(earlier);
      earlier.append(/** @type {ChildNode[]} */ (later.nodes).slice());
      applyChildEdits(parent);
      takePlaceOf(earlier, later);
      index.moveWrites(
        [...earlierDeclarations, ...declarations],
        laterPosition,
        keysOf
      );
      return 'down';
    }
    return null;
  }
}
