import LastWriteIndex from './lastWriteIndex.js';
import joinByDeclarations from './declarationJoin.js';
import { writesOf } from './ruleRewrite.js';
import RepeatScan from './repeatScan.js';
import {
  BlockRecord,
  CONDITIONAL_GROUP,
  isAtRuleKind,
  RULE,
} from './blockRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { isKeyframes } from './sameContainer.js';
import { appendToDeclarations, remove, takePlaceOf } from './treeEdits.js';

/** @import {PropertyWrites} from './propertyWrites.js' */
/** @import MergeState from './mergeState.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeEntry} from './blockRecord.js' */

/**
 * @param {DeclarationRecord | RuleRecord | BlockRecord | NodeEntry} entry
 * @param {BlockRecords} records
 * @param {(RuleRecord | DeclarationRecord)[]} entries grown in place
 * @return {boolean} see `collectEntries`
 */
function collectFrom(records, entry, entries) {
  if (entry instanceof RuleRecord) {
    entries.push(entry);
    return entry.context === -1
      ? true
      : collectEntries(records, entry, entries);
  } else if (entry instanceof BlockRecord) {
    if (entry.kind !== CONDITIONAL_GROUP) return false;
    return collectEntries(records, entry, entries);
  } else if (entry instanceof DeclarationRecord) {
    entries.push(entry);
  } else if (isAtRuleKind(entry.kind) && entry.kind !== CONDITIONAL_GROUP) {
    return false;
  }
  return true;
}

/**
 * @param {BlockRecords} records
 * @param {BlockRecord | RuleRecord} block the block, or the rule that nests
 * @param {(RuleRecord | DeclarationRecord)[]} entries grown in place
 * @return {boolean} false when the subtree holds an at-rule outside the
 * conditional groups
 */
function collectEntries(records, block, entries) {
  // The declarations of a rule stand in its record, so its block skips them.
  const ruleOwned = block.kind === RULE;
  const { links } = records;
  for (
    let entry = links.firstChild(block.index);
    entry !== -1;
    entry = links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    if (ruleOwned && item instanceof DeclarationRecord) continue;
    if (!collectFrom(records, item, entries)) return false;
  }
  return true;
}

/**
 * The rule records and bare declarations of a block at any depth, in
 * document order, or null when the block holds an at-rule whose place in the
 * cascade is not modelled. The answer is not stored, so an edit cannot leave
 * it stale.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord} block
 * @return {(RuleRecord | DeclarationRecord)[] | null}
 */
export function subtreeEntries(records, block) {
  /** @type {(RuleRecord | DeclarationRecord)[]} */
  const entries = [];
  return collectEntries(records, block, entries) ? entries : null;
}

/**
 * The key under which a live entry can join an earlier sibling, or null if it
 * cannot join any.
 *
 * @param {RuleRecord | BlockRecord | DeclarationRecord | NodeEntry} entry
 * @param {boolean} joinRules
 * @return {string | number | null}
 */
function joinKey(entry, joinRules) {
  if (entry instanceof RuleRecord) {
    return joinRules ? `{${entry.selectorText()}` : null;
  }
  // `@font-face` and `@page` have block records too, so the name decides.
  // Siblings share their enclosing blocks, so their contexts are equal exactly
  // when their names and preludes are.
  if (entry instanceof BlockRecord) {
    if (entry.kind === CONDITIONAL_GROUP) return entry.context;
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
  let budget = mergeState.records.liveCount(block.index) + 1;
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
  const { records } = mergeState;
  for (let entry = records.links.firstChild(block.index); entry !== -1;) {
    // The next entry is read first, since joining a nested block edits only
    // the chain of that block.
    const next = records.links.nextSibling(entry);
    const nested = records.blockEntry(entry);
    if (nested) joined = joinNonAdjacent(nested, mergeState) || joined;
    entry = next;
  }
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
  const entries = mergeState.records.liveEntries(block.index);
  const last = entries.length - 1;
  const keys = entries.map((entry) => joinKey(entry, false));
  const scan = new RepeatScan();
  for (let position = last; position >= 0; position--) {
    const key = keys[position];
    if (key !== null) scan.see(key, last - position);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex(mergeState.records);
  const keysOf = mergeState.elementKeysOf;
  /** @type {Map<string | number, {block: number, position: number}>} */
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
        /** @type {BlockRecord} */ (mergeState.records.block(later.block)),
        last - later.position
      );
      if (moved === 'down') at = later.position;
      joined ||= moved !== null;
    }
    if (key !== null) {
      next.set(key, {
        block: /** @type {BlockRecord} */ (entry).index,
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
    const laterEntries = subtreeEntries(mergeState.records, later);
    if (!laterEntries) return null;
    if (!index.conflictsSinceIn(laterEntries, laterPosition, keysOf)) {
      mergeState.records.adopt(earlier.index, later.index);
      remove(mergeState.records, later);
      return 'up';
    }
    // The earlier block's content stays first, so source order is kept.
    const earlierEntries = subtreeEntries(mergeState.records, earlier);
    if (!earlierEntries) return null;
    if (!index.conflictsSinceIn(earlierEntries, laterPosition, keysOf)) {
      index.moveWrites(earlierEntries, laterPosition, keysOf);
      mergeState.records.adopt(earlier.index, later.index);
      takePlaceOf(mergeState.records, earlier.index, later.index);
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
  const joinRules = rules && !isKeyframes(block);
  // A snapshot, since joining removes entries from the block.
  const entries = mergeState.records.liveEntries(block.index);
  const keys = entries.map((entry) => joinKey(entry, joinRules));
  const scan = new RepeatScan();
  for (const [i, key] of keys.entries()) {
    if (key !== null) scan.see(key, i);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex(mergeState.records);
  const keysOf = mergeState.elementKeysOf;
  // Each entry is named by its place in `entries`, which is not changed.
  /** @type {Map<string | number, {origin: number, position: number}>} */
  const latest = new Map();
  // Every rule with a selector joins the first rule with that selector, so
  // the joined rule keeps its writes from one join to the next: rebuilding
  // them would make each join cost time in the growing rule.
  /** @type {Map<number, {kept: DeclarationRecord[], writes: PropertyWrites}>} keyed by the index of the earlier rule */
  const received = new Map();
  let joined = false;
  for (let position = scan.start; position < entries.length; position++) {
    const entry = entries[position];
    const key = keys[position];
    const earlier = key === null ? undefined : latest.get(key);
    if (earlier) {
      const earlierEntry = entries[earlier.origin];
      const direction =
        entry instanceof RuleRecord
          ? joinRule(
              /** @type {RuleRecord} */ (earlierEntry),
              entry,
              earlier.position,
              position
            )
          : joinBlock(
              /** @type {BlockRecord} */ (earlierEntry),
              /** @type {BlockRecord} */ (entry),
              earlier.position,
              position
            );
      if (direction === 'down') {
        latest.set(/** @type {string | number} */ (key), {
          origin: earlier.origin,
          position,
        });
      }
      if (direction) {
        joined = true;
        continue;
      }
    }
    if (key !== null) {
      latest.set(key, { origin: position, position });
    }
    index.recordNode(entry, position, keysOf);
  }
  return joined;

  /**
   * Appends the declarations of `later` to `earlier`. The declarations and
   * writes of `earlier` are read once and grow with each join.
   *
   * @param {RuleRecord} earlier
   * @param {RuleRecord} later
   * @return {void}
   */
  function receive(earlier, later) {
    let joins = received.get(earlier.index);
    if (!joins) {
      const kept = earlier.declarationsOf(mergeState.records);
      joins = { kept, writes: writesOf(kept) };
      received.set(earlier.index, joins);
    }
    appendToDeclarations(mergeState, earlier, joins.kept, joins.writes, later);
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
      remove(mergeState.records, later);
      return 'up';
    }
    if (!index.conflictsSinceIn([earlier], earlierPosition, keysOf)) {
      index.moveWrites([earlier, later], laterPosition, keysOf);
      receive(earlier, later);
      // A move edits the parent at once, after the pending removals.
      takePlaceOf(mergeState.records, earlier.index, later.index);
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
    const laterEntries = subtreeEntries(mergeState.records, later);
    if (!laterEntries) return null;
    if (!index.conflictsSinceIn(laterEntries, earlierPosition, keysOf)) {
      index.moveWrites(laterEntries, earlierPosition, keysOf);
      mergeState.records.adopt(earlier.index, later.index);
      remove(mergeState.records, later);
      return 'up';
    }
    // The earlier block's content stays first, so source order is kept.
    const earlierEntries = subtreeEntries(mergeState.records, earlier);
    if (!earlierEntries) return null;
    if (!index.conflictsSinceIn(earlierEntries, earlierPosition, keysOf)) {
      index.moveWrites(earlierEntries, laterPosition, keysOf);
      index.moveWrites(laterEntries, laterPosition, keysOf);
      mergeState.records.adopt(earlier.index, later.index);
      takePlaceOf(mergeState.records, earlier.index, later.index);
      return 'down';
    }
    return null;
  }
}
