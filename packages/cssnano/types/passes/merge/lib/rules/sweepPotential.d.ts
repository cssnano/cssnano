import type { Rule } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
/** @import {Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * @param {Rule} rule
 * @return {number} the declarations the rule holds, without copying them
 */
export declare function countDeclarations(rule: Rule): number;
/**
 * The potential that a sweep never raises: the declarations of the live rules
 * that hold no block, then those rules, then the sum over them of the number
 * of the block each stands in. Blocks are numbered in document order, dropped
 * ones included, and nothing is stored between calls.
 *
 * @param {BlockRecords} records
 * @return {[number, number, number]}
 */
export declare function sweepPotential(records: BlockRecords): [number, number, number];
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
export declare function assertSweepLowers(before: [number, number, number], after: [number, number, number], moved: boolean): void;
//# sourceMappingURL=sweepPotential.d.ts.map