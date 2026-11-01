import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */

const POTENTIAL =
  'a sweep raised its potential, or moved a rule without lowering it';

/**
 * The potential that a sweep never raises: the declarations of the live rules
 * that hold no block, then those rules, then the sum over them of the number
 * of the block each stands in. The call before a sweep numbers the blocks in
 * document order and returns the numbers, which the call after the sweep
 * reuses: renumbering after it would hide a move that does not lower the
 * potential, since a moved rule may stand in a block numbered differently.
 *
 * @param {BlockRecords} records
 * @param {number[] | null} numbers the number of each block by index, from the
 * call before the sweep, or null to number the blocks now
 * @return {{potential: [number, number, number], numbers: number[]}}
 */
export function sweepPotential(records, numbers) {
  const ids = numbers ?? [];
  const { links } = records;
  let declarations = 0;
  let rules = 0;
  let parents = 0;
  let number = 0;
  /** @param {BlockRecord} block */
  const visit = (block) => {
    if (numbers === null) ids[block.index] = number++;
    const id = ids[block.index];
    for (
      let entry = links.firstChild(block.index);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item instanceof RuleRecord) {
        if (item.block !== -1) {
          visit(/** @type {BlockRecord} */ (records.block(item.block)));
        } else {
          declarations += item.declarations.length;
          rules++;
          parents += id;
        }
      } else if (item instanceof BlockRecord) {
        visit(item);
      }
    }
  };
  visit(/** @type {BlockRecord} */ (records.root));
  return { potential: [declarations, rules, parents], numbers: ids };
}

/**
 * Under consistency checks, throws when a sweep raised the potential, or moved
 * a rule and left the potential equal. A move lowers the parent count because
 * `sameContainer` matches whole ancestor chains, so neither parent contains
 * the other and the earlier parent comes first in document order.
 *
 * @param {[number, number, number]} before
 * @param {[number, number, number]} after
 * @param {boolean} moved whether the sweep moved a rule to another parent
 * @return {void}
 */
export function assertSweepLowers(before, after, moved) {
  if (!consistencyChecksEnabled()) return;
  let change = 0;
  for (let index = 0; index < before.length && change === 0; index++) {
    change = after[index] - before[index];
  }
  if (change > 0 || (moved && change === 0)) throw new Error(POTENTIAL);
}
