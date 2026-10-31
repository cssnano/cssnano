import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { Slot } from './blockRecords.js';
import { BlockRecord } from './blockRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

const OUT_OF_STEP = 'block record out of step with the tree';

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
    } else if (entry instanceof BlockRecord) {
      if (entry.parent !== block.index || entry.position !== index) {
        throw new Error(OUT_OF_STEP);
      }
      if (entry.dropped) {
        if (records.liveCount(entry.index) !== 0) throw new Error(OUT_OF_STEP);
      } else {
        checkBlockStructure(records, entry);
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
}
