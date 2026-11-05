import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord } from './blockRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { containerContext } from './sameContainer.js';
/** @import {BlockRecords} from './blockRecords.js' */
/** @import MergeState from './mergeState.js' */
/** @typedef {BlockRecord | RuleRecord} Container */

const OUT_OF_STEP = 'block record out of step with the tree';
const REACHED_TWICE = 'a record is reached twice from the root';

/**
 * Throws when the chain of a container does not hold its entries in order: each
 * entry is linked to its neighbours and names the container, `first` and `last`
 * end the chain, and `count` is its length.
 *
 * @param {BlockRecords} records
 * @param {Container} block
 * @return {void}
 */
function checkChain(records, block) {
  const { links } = records;
  let previous = -1;
  let count = 0;
  for (
    let entry = links.firstChild(block.index);
    entry !== -1;
    entry = links.nextSibling(entry)
  ) {
    // A chain longer than its count is a cycle, so the walk stops there.
    if (++count > block.count) throw new Error(OUT_OF_STEP);
    if (
      links.prevSibling(entry) !== previous ||
      links.parentOf(entry) !== block.index
    ) {
      throw new Error(OUT_OF_STEP);
    }
    previous = entry;
  }
  if (count !== block.count || links.lastChild(block.index) !== previous) {
    throw new Error(OUT_OF_STEP);
  }
}

/**
 * Throws when the chain of a container is out of step, for it and for each
 * nested container its chain links.
 *
 * @param {BlockRecords} records
 * @param {Container} block
 * @return {void}
 */
function checkBlockStructure(records, block) {
  checkChain(records, block);
  const { links } = records;
  for (
    let entry = links.firstChild(block.index);
    entry !== -1;
    entry = links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    if (item instanceof BlockRecord) {
      checkBlockStructure(records, item);
    } else if (item instanceof RuleRecord) {
      checkBlockStructure(records, item);
    }
  }
}

/**
 * Under consistency checks, throws when a chain is out of step with its
 * entries or a record is reached twice. Only what the root reaches is checked:
 * a removed block may keep its entries, and write-back never reads them.
 * Reads only the records, so it needs no PostCSS node.
 *
 * @param {{records: BlockRecords}} mergeState
 * @return {void}
 */
export function assertRecordsWellFormed(mergeState) {
  if (!consistencyChecksEnabled()) return;
  const { records } = mergeState;
  // Runs first: a cycle in the chains would loop the structure walk below.
  assertOwnershipIsTree(records);
  checkBlockStructure(records, records.root);
}

/**
 * Walks the ownership of the records from the root along the chains: the
 * entries of each block, and the chain of each rule.
 * Throws when a block, rule or declaration is reached twice, since every record
 * has one owner, or when a chain holds other than the count its block keeps.
 *
 * @param {BlockRecords} records
 * @return {void}
 */
export function assertOwnershipIsTree(records) {
  /** @type {Set<object>} */
  const reached = new Set();
  /** @param {object} record */
  const reach = (record) => {
    if (reached.has(record)) throw new Error(REACHED_TWICE);
    reached.add(record);
  };
  /** @param {RuleRecord} record */
  const visitRule = (record) => {
    reach(record);
    visitChildren(record);
  };
  /** @param {Container} block the block or the rule that nests, already reached */
  const visitChildren = (block) => {
    const { links } = records;
    let count = 0;
    for (
      let entry = links.firstChild(block.index);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item instanceof RuleRecord) visitRule(item);
      else if (item instanceof BlockRecord) {
        reach(item);
        visitChildren(item);
      } else if (item instanceof DeclarationRecord) reach(item);
      count++;
    }
    if (count !== block.count) throw new Error(OUT_OF_STEP);
  };
  reach(records.root);
  visitChildren(records.root);
}

/**
 * Under consistency checks, throws when a block's context differs from the one
 * its prelude and its enclosing block give it now. A context is assigned once,
 * at the build, so a move that crossed into an unequal container would leave
 * it stale.
 *
 * @param {MergeState} mergeState
 * @return {void}
 */
export function assertContextsCurrent(mergeState) {
  if (!consistencyChecksEnabled()) return;
  const { records, declarationIds } = mergeState;
  for (const block of records.containers()) {
    const holder = records.links.enclosingContainer(block.index);
    // An emptied block is unlinked and applies nothing, so it has no place to keep.
    if (holder === undefined && block !== records.root) continue;
    const parent = holder?.context ?? -1;
    if (block.context !== containerContext(declarationIds, parent, block)) {
      throw new Error('a block keeps the context of another place');
    }
  }
}
