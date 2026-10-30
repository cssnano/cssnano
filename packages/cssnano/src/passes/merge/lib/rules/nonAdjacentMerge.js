import cssnanoUtils from '#utils';
import LastWriteIndex, { isConditionalGroupRule } from './lastWriteIndex.js';
import joinByDeclarations from './declarationJoin.js';
import { writesOf } from './ruleRewrite.js';
import RepeatScan from './repeatScan.js';
import { BlockRecord, Slot } from './blockRecords.js';
import { RuleRecord, getDecls } from './ruleRecord.js';
import { isKeyframes } from './sameContainer.js';
import {
  appendToDeclarations,
  moveChildren,
  remove,
  takePlaceOf,
} from './treeEdits.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {AtRule, Container, ChildNode, Declaration, Rule} from 'postcss' */
/** @import {PropertyWrites} from './lastWriteIndex.js' */
/** @import MergeState from './mergeState.js' */

/**
 * @param {ChildNode | RuleRecord | BlockRecord} entry
 * @param {Declaration[]} declarations grown in place
 * @return {boolean} see `collectDeclarations`
 */
function collectFrom(entry, declarations) {
  if (entry instanceof RuleRecord) {
    const { block } = entry;
    if (block) return collectDeclarations(block, declarations);
    // A rule without a block holds declarations and comments only.
    for (const child of entry.node.nodes) {
      if (child.type === 'decl') declarations.push(child);
    }
  } else if (entry instanceof BlockRecord) {
    if (!isConditionalGroupRule(/** @type {AtRule} */ (entry.node)))
      return false;
    return collectDeclarations(entry, declarations);
  } else if (entry.type === 'decl') {
    declarations.push(entry);
  } else if (entry.type === 'atrule' && !isConditionalGroupRule(entry)) {
    return false;
  }
  return true;
}

/**
 * @param {BlockRecord} block
 * @param {Declaration[]} declarations grown in place
 * @return {boolean} false when the subtree holds an at-rule outside the
 * conditional groups
 */
function collectDeclarations(block, declarations) {
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const record of entry.rules) {
        if (!collectFrom(record, declarations)) return false;
      }
    } else if (!(entry instanceof BlockRecord && entry.dropped)) {
      if (!collectFrom(entry, declarations)) return false;
    }
  }
  return true;
}

/**
 * The declarations of a block at any depth, in document order, or null when
 * the block holds an at-rule whose place in the cascade is not modelled. The
 * answer is not stored, so an edit cannot leave it stale.
 *
 * @param {BlockRecord} block
 * @return {Declaration[] | null}
 */
export function subtreeDeclarations(block) {
  /** @type {Declaration[]} */
  const declarations = [];
  return collectDeclarations(block, declarations) ? declarations : null;
}

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
  // `@font-face` and `@page` have records too, so the name decides.
  return isConditionalGroupRule(node) && mergeState.records.blockOf(node)
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
 * A block that moves down can unblock a pair of blocks it passed, which a
 * forward pass has already visited, so blocks join again in a backward pass,
 * then alternately forward and backward until a pass joins nothing. Rules join
 * in the first pass alone: joining by selector can remove a declaration that
 * would have merged more selectors, so the scan must see every rule before
 * any join.
 *
 * @param {Container} root
 * @param {MergeState} mergeState
 * @return {boolean} whether anything was joined
 */
export function joinNonAdjacent(root, mergeState) {
  // Each join removes a live child of `root`, so L + 1 passes bound the loop.
  const block = /** @type {BlockRecord} */ (mergeState.records.blockOf(root));
  let budget = block.liveCount() + 1;
  let joined = joinInParent(root, mergeState, true);
  // A forward pass resolves a chain of blocks that move up, a backward pass one
  // that moves down. A pass that joins nothing saw the tree unchanged.
  for (let again = joined, backward = true; again; backward = !backward) {
    if (budget-- === 0) throw new Error('joins repeat past their bound');
    again = backward
      ? joinBlocksBackward(root, mergeState)
      : joinInParent(root, mergeState, false);
  }
  joined = joinByDeclarations(root, mergeState) || joined;
  for (const entry of block.children)
    if (entry instanceof BlockRecord && !entry.dropped)
      joined = joinNonAdjacent(entry.node, mergeState) || joined;
  return joined;
}

/**
 * Joins blocks as `joinInParent` does, visiting them from last to first, so
 * a block that moves down to its counterpart unblocks, in the same pass, the
 * pairs it moved past. The write index sees positions mirrored, so "written
 * after" means written before, in document order.
 *
 * @param {Container} parent
 * @param {MergeState} mergeState
 * @return {boolean}
 */
function joinBlocksBackward(parent, mergeState) {
  // A snapshot, since joining removes nodes from the parent.
  const nodes = /** @type {BlockRecord} */ (
    mergeState.records.blockOf(parent)
  ).liveChildren();
  const last = nodes.length - 1;
  const keys = nodes.map((node) => joinKey(node, false, mergeState));
  const scan = new RepeatScan();
  for (let position = last; position >= 0; position--) {
    const key = keys[position];
    if (key !== null) scan.see(key, last - position);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex(mergeState.properties);
  const keysOf = mergeState.elementKeysOf;
  /** @type {Map<string, {node: AtRule, position: number}>} */
  const next = new Map();
  let joined = false;
  for (let position = last - scan.start; position >= 0; position--) {
    const node = nodes[position];
    const key = keys[position];
    const later = key === null ? undefined : next.get(key);
    let at = position;
    if (later) {
      const moved = joinBlock(
        /** @type {AtRule} */ (node),
        later.node,
        last - later.position
      );
      if (moved === 'down') at = later.position;
      joined ||= moved !== null;
    }
    if (key !== null) {
      next.set(key, { node: /** @type {AtRule} */ (node), position: at });
    }
    if (at === position)
      index.recordNode(
        mergeState.records.entryOf(node),
        last - position,
        keysOf
      );
  }
  return joined;

  /**
   * @param {AtRule} earlier
   * @param {AtRule} later
   * @param {number} laterPosition the mirrored position of `later`
   * @return {'up' | 'down' | null} where the joined block stands
   */
  function joinBlock(earlier, later, laterPosition) {
    const { records } = mergeState;
    const laterBlock = /** @type {BlockRecord} */ (records.blockOf(later));
    const declarations = subtreeDeclarations(laterBlock);
    if (!declarations) return null;
    if (!index.conflictsSinceIn(declarations, laterPosition, keysOf)) {
      moveChildren(
        /** @type {BlockRecord} */ (records.blockOf(earlier)),
        laterBlock
      );
      remove(laterBlock);
      return 'up';
    }
    // The earlier block's content stays first, so source order is kept.
    const earlierBlock = /** @type {BlockRecord} */ (records.blockOf(earlier));
    const earlierDeclarations = subtreeDeclarations(earlierBlock);
    if (!earlierDeclarations) return null;
    if (!index.conflictsSinceIn(earlierDeclarations, laterPosition, keysOf)) {
      index.moveWrites(earlierDeclarations, laterPosition, keysOf);
      moveChildren(earlierBlock, laterBlock);
      takePlaceOf(mergeState, parent, earlierBlock, laterBlock);
      return 'down';
    }
    return null;
  }
}

/**
 * @param {Container} parent
 * @param {MergeState} mergeState
 * @param {boolean} rules whether rules with the same selector join, or only blocks
 * @return {boolean}
 */
function joinInParent(parent, mergeState, rules) {
  const joinRules = rules && !isKeyframes(parent);
  // A snapshot, since joining removes nodes from the parent.
  const nodes = /** @type {BlockRecord} */ (
    mergeState.records.blockOf(parent)
  ).liveChildren();
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
  // the joined rule keeps its writes from one join to the next: rebuilding
  // them would make each join cost time in the growing rule. Its declarations
  // live in its record.
  /** @type {Map<Rule, PropertyWrites>} */
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
    index.recordNode(mergeState.records.entryOf(node), position, keysOf);
  }
  return joined;

  /**
   * Appends the declarations of `later` to `earlier`. The declarations are
   * those of the record of `earlier`, which takes them over as they grow.
   *
   * @param {Rule} earlier
   * @param {Rule} later
   * @return {void}
   */
  function receive(earlier, later) {
    const kept = mergeState.meta(earlier).declarations;
    let writes = received.get(earlier);
    if (!writes) {
      writes = writesOf(kept, mergeState.properties);
      received.set(earlier, writes);
    }
    appendToDeclarations(mergeState, earlier, kept, writes, later);
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
      receive(earlier, later);
      remove(mergeState.meta(later));
      return 'up';
    }
    const earlierDeclarations = mergeState.meta(earlier).declarations;
    if (!index.conflictsSinceIn(earlierDeclarations, earlierPosition, keysOf)) {
      index.moveWrites(
        [...earlierDeclarations, ...laterDeclarations],
        laterPosition,
        keysOf
      );
      receive(earlier, later);
      // A move edits the parent at once, after the pending removals.
      takePlaceOf(
        mergeState,
        parent,
        mergeState.meta(earlier),
        mergeState.meta(later)
      );
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
    const { records } = mergeState;
    const laterBlock = /** @type {BlockRecord} */ (records.blockOf(later));
    const declarations = subtreeDeclarations(laterBlock);
    if (!declarations) return null;
    if (!index.conflictsSinceIn(declarations, earlierPosition, keysOf)) {
      moveChildren(
        /** @type {BlockRecord} */ (records.blockOf(earlier)),
        laterBlock
      );
      remove(laterBlock);
      index.moveWrites(declarations, earlierPosition, keysOf);
      return 'up';
    }
    // The earlier block's content stays first, so source order is kept.
    const earlierBlock = /** @type {BlockRecord} */ (records.blockOf(earlier));
    const earlierDeclarations = subtreeDeclarations(earlierBlock);
    if (!earlierDeclarations) return null;
    if (!index.conflictsSinceIn(earlierDeclarations, earlierPosition, keysOf)) {
      moveChildren(earlierBlock, laterBlock);
      takePlaceOf(mergeState, parent, earlierBlock, laterBlock);
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
