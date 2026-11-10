import { AT_RULE_BLOCK, RULE, STYLESHEET } from './blockRecord.js';
import { declarationKeys } from './declarationCache.js';

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
  // A stack of blocks still to visit. Each block pushes the blocks it holds
  // from the last, so they pop in document order, each before its own.
  const pending = [records.root.index];
  while (pending.length > 0) {
    const index = /** @type {number} */ (pending.pop());
    if (numbers === null) ids[index] = number++;
    const id = ids[index];
    for (
      let entry = links.lastChild(index);
      entry !== -1;
      entry = links.prevSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item.kind === RULE && item.context === -1) {
        declarations += declarationKeys(records, item.index).kept.length;
        rules++;
        parents += id;
      } else if (
        item.kind === RULE ||
        item.kind === STYLESHEET ||
        item.kind === AT_RULE_BLOCK
      ) {
        pending.push(item.index);
      }
    }
  }
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
  let change = 0;
  for (let index = 0; index < before.length && change === 0; index++) {
    change = after[index] - before[index];
  }
  if (change > 0 || (moved && change === 0)) throw new Error(POTENTIAL);
}
