import cssnanoUtils from '#utils';
import LastWriteIndex, { isConditionalGroupRule } from './lastWriteIndex.js';
import joinByDeclarations from './declarationJoin.js';
import { writesOf } from './ruleRewrite.js';
import RepeatScan from './repeatScan.js';
import { BlockRecord, Slot } from './blockRecords.js';
import { RuleRecord } from './ruleRecord.js';
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
 * @param {(RuleRecord | Declaration)[]} entries grown in place
 * @return {boolean} see `collectEntries`
 */
function collectFrom(entry, entries) {
  if (entry instanceof RuleRecord) {
    entries.push(entry);
    const { block } = entry;
    return block ? collectEntries(block, entries) : true;
  } else if (entry instanceof BlockRecord) {
    if (!isConditionalGroupRule(/** @type {AtRule} */ (entry.node)))
      return false;
    return collectEntries(entry, entries);
  } else if (entry.type === 'decl') {
    entries.push(entry);
  } else if (entry.type === 'atrule' && !isConditionalGroupRule(entry)) {
    return false;
  }
  return true;
}

/**
 * @param {BlockRecord} block
 * @param {(RuleRecord | Declaration)[]} entries grown in place
 * @return {boolean} false when the subtree holds an at-rule outside the
 * conditional groups
 */
function collectEntries(block, entries) {
  // The declarations of a rule stand in its record, so its block skips them.
  const ruleOwned = block.node.type === 'rule';
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const record of entry.rules) {
        if (!collectFrom(record, entries)) return false;
      }
    } else if (entry instanceof BlockRecord) {
      if (!entry.dropped && !collectFrom(entry, entries)) return false;
    } else if (!ruleOwned || entry.type !== 'decl') {
      if (!collectFrom(entry, entries)) return false;
    }
  }
  return true;
}

/**
 * The rule records and bare declarations of a block at any depth, in
 * document order, or null when the block holds an at-rule whose place in the
 * cascade is not modelled. The answer is not stored, so an edit cannot leave
 * it stale.
 *
 * @param {BlockRecord} block
 * @return {(RuleRecord | Declaration)[] | null}
 */
export function subtreeEntries(block) {
  /** @type {(RuleRecord | Declaration)[]} */
  const entries = [];
  return collectEntries(block, entries) ? entries : null;
}

/**
 * The key under which a live entry can join an earlier sibling, or null if it
 * cannot join any.
 *
 * @param {RuleRecord | BlockRecord | ChildNode} entry
 * @param {boolean} joinRules
 * @return {string | null}
 */
function joinKey(entry, joinRules) {
  if (entry instanceof RuleRecord) {
    return joinRules ? `{${entry.selectorText()}` : null;
  }
  // `@font-face` and `@page` have block records too, so the name decides.
  if (entry instanceof BlockRecord) {
    const atRule = /** @type {AtRule} */ (entry.node);
    if (isConditionalGroupRule(atRule))
      return `@${asciiLowerCase(atRule.name)} ${atRule.params}`;
  }
  return null;
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
 * @param {BlockRecord} block the record of the container
 * @param {MergeState} mergeState
 * @return {boolean} whether anything was joined
 */
export function joinNonAdjacent(block, mergeState) {
  // Each join removes a live child of `block`, so L + 1 passes bound the loop.
  let budget = block.liveCount() + 1;
  let joined = joinInParent(block, mergeState, true);
  // A forward pass resolves a chain of blocks that move up, a backward pass one
  // that moves down. A pass that joins nothing saw the tree unchanged.
  for (let again = joined, backward = true; again; backward = !backward) {
    if (budget-- === 0) throw new Error('joins repeat past their bound');
    again = backward
      ? joinBlocksBackward(block, mergeState)
      : joinInParent(block, mergeState, false);
  }
  joined = joinByDeclarations(block, mergeState) || joined;
  for (const entry of block.children)
    if (entry instanceof BlockRecord && !entry.dropped)
      joined = joinNonAdjacent(entry, mergeState) || joined;
  return joined;
}

/**
 * Joins blocks as `joinInParent` does, visiting them from last to first, so
 * a block that moves down to its counterpart unblocks, in the same pass, the
 * pairs it moved past. The write index sees positions mirrored, so "written
 * after" means written before, in document order.
 *
 * @param {BlockRecord} block
 * @param {MergeState} mergeState
 * @return {boolean}
 */
function joinBlocksBackward(block, mergeState) {
  // A snapshot, since joining removes entries from the block.
  const entries = block.liveEntries();
  const last = entries.length - 1;
  const keys = entries.map((entry) => joinKey(entry, false));
  const scan = new RepeatScan();
  for (let position = last; position >= 0; position--) {
    const key = keys[position];
    if (key !== null) scan.see(key, last - position);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex(mergeState.properties);
  const keysOf = mergeState.elementKeysOf;
  /** @type {Map<string, {block: BlockRecord, position: number}>} */
  const next = new Map();
  let joined = false;
  for (let position = last - scan.start; position >= 0; position--) {
    const entry = entries[position];
    const key = keys[position];
    const later = key === null ? undefined : next.get(key);
    let at = position;
    if (later) {
      const moved = joinBlock(
        /** @type {BlockRecord} */ (entry),
        later.block,
        last - later.position
      );
      if (moved === 'down') at = later.position;
      joined ||= moved !== null;
    }
    if (key !== null) {
      next.set(key, {
        block: /** @type {BlockRecord} */ (entry),
        position: at,
      });
    }
    if (at === position) index.recordNode(entry, last - position, keysOf);
  }
  return joined;

  /**
   * @param {BlockRecord} earlier
   * @param {BlockRecord} later
   * @param {number} laterPosition the mirrored position of `later`
   * @return {'up' | 'down' | null} where the joined block stands
   */
  function joinBlock(earlier, later, laterPosition) {
    const laterEntries = subtreeEntries(later);
    if (!laterEntries) return null;
    if (!index.conflictsSinceIn(laterEntries, laterPosition, keysOf)) {
      moveChildren(earlier, later);
      remove(later);
      return 'up';
    }
    // The earlier block's content stays first, so source order is kept.
    const earlierEntries = subtreeEntries(earlier);
    if (!earlierEntries) return null;
    if (!index.conflictsSinceIn(earlierEntries, laterPosition, keysOf)) {
      index.moveWrites(earlierEntries, laterPosition, keysOf);
      moveChildren(earlier, later);
      takePlaceOf(mergeState, block.node, earlier, later);
      return 'down';
    }
    return null;
  }
}

/**
 * @param {BlockRecord} block
 * @param {MergeState} mergeState
 * @param {boolean} rules whether rules with the same selector join, or only blocks
 * @return {boolean}
 */
function joinInParent(block, mergeState, rules) {
  const joinRules = rules && !isKeyframes(block.node);
  // A snapshot, since joining removes entries from the block.
  const entries = block.liveEntries();
  const keys = entries.map((entry) => joinKey(entry, joinRules));
  const scan = new RepeatScan();
  for (const [i, key] of keys.entries()) {
    if (key !== null) scan.see(key, i);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex(mergeState.properties);
  const keysOf = mergeState.elementKeysOf;
  /** @type {Map<string, {entry: RuleRecord | BlockRecord, position: number}>} */
  const latest = new Map();
  // Every rule with a selector joins the first rule with that selector, so
  // the joined rule keeps its writes from one join to the next: rebuilding
  // them would make each join cost time in the growing rule. Its declarations
  // live in its record.
  /** @type {Map<RuleRecord, PropertyWrites>} */
  const received = new Map();
  let joined = false;
  for (let position = scan.start; position < entries.length; position++) {
    const entry = entries[position];
    const key = keys[position];
    const earlier = key === null ? undefined : latest.get(key);
    if (earlier) {
      const direction =
        entry instanceof RuleRecord
          ? joinRule(
              /** @type {RuleRecord} */ (earlier.entry),
              entry,
              earlier.position,
              position
            )
          : joinBlock(
              /** @type {BlockRecord} */ (earlier.entry),
              /** @type {BlockRecord} */ (entry),
              earlier.position,
              position
            );
      if (direction === 'down') {
        latest.set(/** @type {string} */ (key), {
          entry: earlier.entry,
          position,
        });
      }
      if (direction) {
        joined = true;
        continue;
      }
    }
    if (key !== null) {
      latest.set(key, {
        entry: /** @type {RuleRecord | BlockRecord} */ (entry),
        position,
      });
    }
    index.recordNode(entry, position, keysOf);
  }
  return joined;

  /**
   * Appends the declarations of `later` to `earlier`. The declarations are
   * those of the record of `earlier`, which takes them over as they grow.
   *
   * @param {RuleRecord} earlier
   * @param {RuleRecord} later
   * @return {void}
   */
  function receive(earlier, later) {
    const kept = earlier.declarations;
    let writes = received.get(earlier);
    if (!writes) {
      writes = writesOf(kept, mergeState.properties);
      received.set(earlier, writes);
    }
    appendToDeclarations(mergeState, earlier, kept, writes, later);
  }

  /**
   * @param {RuleRecord} earlier
   * @param {RuleRecord} later
   * @param {number} earlierPosition
   * @param {number} laterPosition
   * @return {'up' | 'down' | null} where the joined rule stands
   */
  function joinRule(earlier, later, earlierPosition, laterPosition) {
    if (!mergeState.canMerge(earlier, later)) return null;
    // Writes are recorded before the rewrite, while both rules still hold their
    // declarations and cached element keys. Equal selectors give equal keys.
    if (!index.conflictsSinceIn([later], earlierPosition, keysOf)) {
      index.moveWrites([later], earlierPosition, keysOf);
      receive(earlier, later);
      remove(later);
      return 'up';
    }
    if (!index.conflictsSinceIn([earlier], earlierPosition, keysOf)) {
      index.moveWrites([earlier, later], laterPosition, keysOf);
      receive(earlier, later);
      // A move edits the parent at once, after the pending removals.
      takePlaceOf(mergeState, block.node, earlier, later);
      return 'down';
    }
    return null;
  }

  /**
   * @param {BlockRecord} earlier
   * @param {BlockRecord} later
   * @param {number} earlierPosition
   * @param {number} laterPosition
   * @return {'up' | 'down' | null} where the joined block stands
   */
  function joinBlock(earlier, later, earlierPosition, laterPosition) {
    const laterEntries = subtreeEntries(later);
    if (!laterEntries) return null;
    if (!index.conflictsSinceIn(laterEntries, earlierPosition, keysOf)) {
      index.moveWrites(laterEntries, earlierPosition, keysOf);
      moveChildren(earlier, later);
      remove(later);
      return 'up';
    }
    // The earlier block's content stays first, so source order is kept.
    const earlierEntries = subtreeEntries(earlier);
    if (!earlierEntries) return null;
    if (!index.conflictsSinceIn(earlierEntries, earlierPosition, keysOf)) {
      index.moveWrites(earlierEntries, laterPosition, keysOf);
      index.moveWrites(laterEntries, laterPosition, keysOf);
      moveChildren(earlier, later);
      takePlaceOf(mergeState, block.node, earlier, later);
      return 'down';
    }
    return null;
  }
}
