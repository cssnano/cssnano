import type { BlockRecords } from '../../../ir/blockRecords.js';
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
export declare function sweepPotential(records: BlockRecords, numbers: number[] | null): {
    potential: [number, number, number];
    numbers: number[];
};
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