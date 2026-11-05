/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord as Rule} from './ruleRecord.js' */

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
 * the record of each bare node.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[]}
 */
export function liveEntries(records, index) {
  /** @type {(RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[]} */
  const entries = [];
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    entries.push(
      /** @type {RuleRecord | BlockRecord | DeclarationRecord | NodeEntry} */ (
        records.entry(entry)
      )
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

/**
 * Gives an appended child the whitespace of the last child when it has none, as
 * PostCSS gives it, so the records keep what the node will print.
 *
 * @param {{before: string | null}} child the record of the appended child
 * @param {{before: string | null} | undefined} last the record of the child before `child`
 * @return {void}
 */
export function inheritWhitespace(child, last) {
  if (child.before !== null || last === undefined) return;
  const sample = last.before;
  if (sample !== null) child.before = sample.replaceAll(/\S/gv, '');
}
