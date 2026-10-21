/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
import type { PropertyTable } from '../../../ir/propertyTable.js';
export type PositionList = {
    positions: number[];
    cursor: number;
    claimed?: Set<number>;
    claimedSize: number;
};
/**
 * The position of every write, grouped by the keys `PropertyWrites` uses, so
 * the earliest unclaimed conflicting write is read from the lists those keys
 * name. Claims only grow between queries on one index, which lets each cursor
 * move forward once. A query for `all` throws, so callers reject it first.
 */
export declare class WritePositions {
    #private;
    /** @param {PropertyTable} table keys every declaration this index sees */
    constructor(table: PropertyTable);
    /**
     * @param {{prop: string}} declaration
     * @param {number} position greater than every position recorded so far
     */
    record(declaration: {
        prop: string;
    }, position: number): void;
    /**
     * The earliest unclaimed position of a write that conflicts with
     * `declaration`, or -1. Its keys are those `PropertyWrites.lastConflict`
     * reads.
     *
     * @param {{prop: string}} declaration not `all`
     * @param {Set<number>} claimed
     * @return {number}
     */
    firstUnclaimed(declaration: {
        prop: string;
    }, claimed: Set<number>): number;
}
//# sourceMappingURL=writePositions.d.ts.map