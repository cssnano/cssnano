import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { Slot } from './blockRecords.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { containerContext } from './sameContainer.js';
/** @import {BlockRecord} from './blockRecord.js' */

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import MergeState from './mergeState.js' */

const OUT_OF_STEP = 'block record out of step with the tree';
const REACHED_TWICE = 'a record or slot is reached twice from the root';

/**
 * Throws when the chain of a block is not its live entries in order: each
 * entry is linked to its neighbours and names the block as its container, and
 * `first` and `last` end the chain.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord} block
 * @return {void}
 */
function checkChain(records, block) {
  /** @type {number[]} */
  const live = [];
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const ruleIndex of entry.rules) live.push(ruleIndex);
    } else if (!records.isDropped(entry)) {
      live.push(entry);
    }
  }
  let previous = -1;
  let link = records.links.firstChild(block.index);
  for (const index of live) {
    if (link !== index) throw new Error(OUT_OF_STEP);
    if (
      records.links.prevSibling(index) !== previous ||
      records.links.parentOf(index) !== block.index
    ) {
      throw new Error(OUT_OF_STEP);
    }
    previous = index;
    link = records.links.nextSibling(index);
  }
  if (link !== -1 || records.links.lastChild(block.index) !== previous) {
    throw new Error(OUT_OF_STEP);
  }
}

/**
 * Throws when a block holds the entries of another block, or positions that
 * differ from their index, or a dropped block still holds a live child, or its
 * chain differs from its live children.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord} block
 * @return {void}
 */
function checkBlockStructure(records, block) {
  checkChain(records, block);
  for (const [index, entry] of block.children.entries()) {
    if (entry instanceof Slot) {
      if (entry.block !== block.index || entry.position !== index) {
        throw new Error(OUT_OF_STEP);
      }
      for (const ruleIndex of entry.rules) {
        const record = /** @type {RuleRecord} */ (records.rule(ruleIndex));
        const nested = record.block;
        if (nested === -1) continue;
        const nestedBlock = /** @type {BlockRecord} */ (records.block(nested));
        if (
          nestedBlock.parent !== block.index ||
          records.links.enclosingBlock(nested) !== block
        ) {
          throw new Error(OUT_OF_STEP);
        }
        if (records.links.parentOf(nested) !== ruleIndex) {
          throw new Error(OUT_OF_STEP);
        }
        checkBlockStructure(records, nestedBlock);
      }
    } else if (typeof entry === 'number') {
      const nested = records.blockEntry(entry);
      if (nested === undefined) continue;
      if (nested.parent !== block.index || nested.position !== index) {
        throw new Error(OUT_OF_STEP);
      }
      if (records.isDropped(entry)) {
        // A dropped block is unlinked, so only its live children are checked.
        if (records.liveCount(entry) !== 0) throw new Error(OUT_OF_STEP);
      } else {
        if (records.links.enclosingBlock(entry) !== block) {
          throw new Error(OUT_OF_STEP);
        }
        checkBlockStructure(records, nested);
      }
    }
  }
}

/**
 * Under consistency checks, throws when a slot or a nested block names the wrong
 * block or position, or a dropped block still holds a live child. Reads only
 * the records, so it needs no PostCSS node.
 *
 * @param {{records: BlockRecords}} mergeState
 * @return {void}
 */
export function assertRecordsWellFormed(mergeState) {
  if (!consistencyChecksEnabled()) return;
  checkBlockStructure(mergeState.records, mergeState.records.root);
  assertOwnershipIsTree(mergeState.records);
}

/**
 * Walks the ownership of the records from the root: the children of each block,
 * the rules of each slot, the nested block of each rule, and the declarations
 * of each rule that holds none. Throws when a block, slot, rule or declaration
 * is reached twice, since every record has one owner.
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
    if (record.block !== -1) {
      visit(/** @type {BlockRecord} */ (records.block(record.block)));
      return;
    }
    for (const declaration of record.declarations) reach(declaration);
  };
  /** @param {BlockRecord} block */
  const visit = (block) => {
    reach(block);
    for (const entry of block.children) {
      if (entry instanceof Slot) {
        reach(entry);
        for (const index of entry.rules) {
          visitRule(/** @type {RuleRecord} */ (records.rule(index)));
        }
      } else {
        const nested = records.blockEntry(entry);
        if (nested) {
          visit(nested);
        } else {
          const item = records.entry(entry);
          if (item instanceof DeclarationRecord) reach(item);
        }
      }
    }
  };
  visit(records.root);
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
  const { records, declarationIds, textTable } = mergeState;
  for (const block of records.blocks()) {
    const holder = records.links.enclosingBlock(block.index);
    // An emptied block is unlinked and applies nothing, so it has no place to keep.
    if (holder === undefined && block !== records.root) continue;
    const parent = holder?.context ?? -1;
    if (
      block.context !==
      containerContext(declarationIds, parent, block, textTable)
    ) {
      throw new Error('a block keeps the context of another place');
    }
  }
}
