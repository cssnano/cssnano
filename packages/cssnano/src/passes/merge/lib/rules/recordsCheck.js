import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { Slot } from './blockRecords.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
/** @import {BlockRecord} from './blockRecord.js' */

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

const OUT_OF_STEP = 'block record out of step with the tree';
const REACHED_TWICE = 'a record or slot is reached twice from the root';

/**
 * Throws when a block holds the entries of another block, or positions that
 * differ from their index, or a dropped block still holds a live child.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord} block
 * @return {void}
 */
function checkBlockStructure(records, block) {
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
        if (nestedBlock.parent !== block.index) throw new Error(OUT_OF_STEP);
        checkBlockStructure(records, nestedBlock);
      }
    } else if (typeof entry === 'number') {
      const nested = /** @type {BlockRecord} */ (records.block(entry));
      if (nested.parent !== block.index || nested.position !== index) {
        throw new Error(OUT_OF_STEP);
      }
      if (nested.dropped) {
        if (records.liveCount(entry) !== 0) throw new Error(OUT_OF_STEP);
      } else {
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
      } else if (typeof entry === 'number') {
        visit(/** @type {BlockRecord} */ (records.block(entry)));
      } else if (entry instanceof DeclarationRecord) {
        reach(entry);
      }
    }
  };
  visit(records.root);
}
