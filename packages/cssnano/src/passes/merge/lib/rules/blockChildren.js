/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
import { NodeEntry, Slot } from './blockRecord.js';

/**
 * Whether the entry at `index` is a block that a sweep dropped. Only a block
 * can be dropped, so any other entry is live.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {boolean}
 */
function droppedAt(records, index) {
  const block = records.blockEntry(index);
  return block !== undefined && block.dropped;
}

/**
 * The first child the block at `index` holds now, without copying the child
 * list.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode | undefined}
 */
export function firstLiveChild(records, index) {
  const block = /** @type {BlockRecord} */ (records.block(index));
  const { children } = block;
  for (; block.firstLive < children.length; block.firstLive++) {
    const entry = children[block.firstLive];
    if (entry instanceof Slot) {
      if (entry.rules.length > 0) {
        return /** @type {RuleRecord} */ (records.rule(entry.rules[0])).node;
      }
    } else if (!droppedAt(records, entry)) {
      return records.nodeOf(entry);
    }
  }
  return undefined;
}

/**
 * The number of children the block at `index` holds now, counted without
 * copying them.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {number}
 */
export function liveCount(records, index) {
  let count = 0;
  const { children } = /** @type {BlockRecord} */ (records.block(index));
  for (const entry of children) {
    if (entry instanceof Slot) {
      count += entry.rules.length;
    } else if (!droppedAt(records, entry)) {
      count++;
    }
  }
  return count;
}

/**
 * The entries the block at `index` holds now, in order: the record of each
 * rule, the record of each at-rule block, the record of each declaration, and
 * the node of each bare node. A block that was dropped is left out.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
 */
export function liveEntries(records, index) {
  /** @type {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]} */
  const entries = [];
  const { children } = /** @type {BlockRecord} */ (records.block(index));
  for (const entry of children) {
    if (entry instanceof Slot) {
      for (const rule of entry.rules) {
        entries.push(/** @type {RuleRecord} */ (records.rule(rule)));
      }
    } else if (!droppedAt(records, entry)) {
      const item = records.entry(entry);
      entries.push(
        item instanceof NodeEntry
          ? item.node
          : /** @type {BlockRecord | DeclarationRecord} */ (item)
      );
    }
  }
  return entries;
}

/**
 * The children the block at `index` holds now, in order: the rules of its
 * slots, and the nodes of its other entries, except a block that was dropped.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode[]}
 */
export function liveChildren(records, index) {
  /** @type {ChildNode[]} */
  const children = [];
  const holder = /** @type {BlockRecord} */ (records.block(index));
  for (const entry of holder.children) {
    if (entry instanceof Slot) {
      for (const rule of entry.rules) {
        children.push(/** @type {RuleRecord} */ (records.rule(rule)).node);
      }
    } else if (!droppedAt(records, entry)) {
      children.push(records.nodeOf(entry));
    }
  }
  return children;
}
