import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord, Slot } from './blockRecords.js';

/** @import {Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * @param {Rule} rule
 * @return {number} the declarations the rule holds, without copying them
 */
export function countDeclarations(rule) {
  let count = 0;
  for (const node of rule.nodes) {
    if (node.type === 'decl') count++;
  }
  return count;
}

const POTENTIAL =
  'a sweep raised its potential, or moved a rule without lowering it';

/**
 * The potential that a sweep never raises: the declarations of the live rules
 * that hold no block, then those rules, then the sum over them of the number
 * of the block each stands in. Blocks are numbered in document order, dropped
 * ones included, and nothing is stored between calls.
 *
 * @param {BlockRecords} records
 * @return {[number, number, number]}
 */
export function sweepPotential(records) {
  let declarations = 0;
  let rules = 0;
  let parents = 0;
  let number = 0;
  /** @param {BlockRecord} block */
  const visit = (block) => {
    const id = number++;
    for (const entry of block.children) {
      if (entry instanceof Slot) {
        for (const record of entry.rules) {
          const nested = record.block;
          if (nested) {
            visit(nested);
          } else {
            declarations += countDeclarations(record.node);
            rules++;
            parents += id;
          }
        }
      } else if (entry instanceof BlockRecord) {
        visit(entry);
      }
    }
  };
  visit(records.root);
  return [declarations, rules, parents];
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
