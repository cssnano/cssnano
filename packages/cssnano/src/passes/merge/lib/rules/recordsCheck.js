import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord, Slot } from './blockRecords.js';

/** @import {BlockRecords} from './blockRecords.js' */

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
      if (entry.block !== block || entry.position !== index) {
        throw new Error(OUT_OF_STEP);
      }
      for (const rule of entry.rules) {
        const nested = records.metaOf(rule).block;
        if (nested && nested.parent !== block) throw new Error(OUT_OF_STEP);
        if (nested) checkBlockStructure(records, nested);
      }
    } else if (entry instanceof BlockRecord) {
      if (entry.parent !== block || entry.position !== index) {
        throw new Error(OUT_OF_STEP);
      }
      if (entry.dropped) {
        if (entry.liveCount() !== 0) throw new Error(OUT_OF_STEP);
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
