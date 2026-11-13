/** @import {PropertyKeys} from './propertyTable.js' */
import type { PropertyKeys } from './propertyTable.js';
/**
 * The positions one claimer has claimed, and the cursor it holds in each list
 * it reads. Claims only grow, so a cursor moves forward once. A new claimer
 * holds no cursors, so it starts every list from its first position.
 */
export declare class Claims {
    /** @type {Set<number>} the positions claimed so far */
    claimed: Set<number>;
    /** @type {Map<number[], number>} the position each list's cursor is at */
    cursors: Map<number[], number>;
}
/**
 * The position of every write, grouped by the keys `PropertyWrites` uses, so
 * the earliest unclaimed conflicting write is read from the lists those keys
 * name. Claims only grow between queries on one index, which lets each cursor
 * move forward once. A query for `all` throws, so callers reject it first.
 */
export declare class WritePositions {
    #private;
    /**
     * @param {PropertyKeys} keys the keys of a declaration's property name
     * @param {number} position greater than every position recorded so far
     */
    record(keys: PropertyKeys, position: number): void;
    /**
     * The earliest unclaimed position of a write that conflicts with
     * `declaration`, or -1. Its keys are those `PropertyWrites.lastConflict`
     * reads.
     *
     * @param {PropertyKeys} keys of a property that is not `all`
     * @param {Claims} claims the claimer's positions and cursors
     * @return {number}
     */
    firstUnclaimed(keys: PropertyKeys, claims: Claims): number;
}
//# sourceMappingURL=writePositions.d.ts.map