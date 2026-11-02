/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord as Rule} from './ruleRecord.js' */
import { NodeEntry } from './blockRecord.js';

/**
 * The first child the block at `index` holds now, without copying the child
 * list.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode | undefined}
 */
/**
 * The number of children the block at `index` holds now. The chain keeps the
 * count, so the answer costs no walk.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {number}
 */
export function liveCount(records, index) {
  return /** @type {BlockRecord | Rule} */ (records.container(index)).count;
}

/**
 * The entries the block at `index` holds now, in order: the record of each
 * rule, the record of each at-rule block, the record of each declaration, and
 * the node of each bare node.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
 */
export function liveEntries(records, index) {
  /** @type {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]} */
  const entries = [];
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    entries.push(
      item instanceof NodeEntry
        ? item.node
        : /** @type {RuleRecord | BlockRecord | DeclarationRecord} */ (item)
    );
  }
  return entries;
}

/**
 * The children the block at `index` holds now, in order: the node of each
 * entry of its chain.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode[]}
 */
export function liveChildren(records, index) {
  /** @type {ChildNode[]} */
  const children = [];
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    children.push(records.nodeOf(entry));
  }
  return children;
}
