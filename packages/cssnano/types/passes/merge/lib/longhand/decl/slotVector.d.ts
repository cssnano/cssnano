import type { BlockDeclarations } from '../blockDeclarations.js';
import type { RangePiece } from '../../../../../values/joinRanges.js';
export type SlotVector = ({
    value: string;
    decl: number;
    range?: RangePiece;
} | null)[];
/**
 * Byte cost of one emitted declaration: the property and value text, the `:`
 * separator and terminating `;`, and the `!important` annotation.
 *
 * @param {string} prop
 * @param {string} value
 * @param {boolean} [important]
 * @return {number}
 */
export declare function declCost(prop: string, value: string, important?: boolean): number;
/**
 * @param {({ value: string, decl: number } | null)[]} slots
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {{ value: string, decl: number }[] | null} the fully-filled
 * vector ready to be merged, or `null` if any slot is missing, custom,
 * conflicting on CSS-wide keywords, or has mismatched support provenance
 */
export declare function flushableSlots(slots: ({
    value: string;
    decl: number;
} | null)[], list: BlockDeclarations, features: ReadonlySet<string>): {
    value: string;
    decl: number;
}[] | null;
/**
 * The state of one importance lane of a slot-lane reducer: the slot vector, the
 * declarations that contribute to it and the ones kept as fallbacks. A reducer
 * walks its declarations, calls `begin` before writing slots, `assign` for each
 * slot and `reset` wherever a declaration ends the run.
 */
export declare class SlotLane {
    #private;
    /** @type {SlotVector} */
    slots: SlotVector;
    /** @type {Set<number>} */
    contributing: Set<number>;
    /** @type {Set<number>} */
    fallbacks: Set<number>;
    /**
     * The fallbacks behind each slot's declaration, allocated with the first.
     *
     * @type {(number[] | undefined)[] | undefined}
     */
    slotFallbacks: (number[] | undefined)[] | undefined;
    commit: (slots: SlotVector, contributing: Set<number>, fallbacks: Set<number>) => void;
    /**
     * @param {number} size - how many slots the family has
     * @param {(slots: SlotVector, contributing: Set<number>, fallbacks: Set<number>) => void} commit
     * called with the state whenever the run ends, before it is cleared
     * @param {BlockDeclarations} list
     * @param {ReadonlySet<string>} features the features every target supports
     */
    constructor(size: number, commit: (slots: SlotVector, contributing: Set<number>, fallbacks: Set<number>) => void, list: BlockDeclarations, features: ReadonlySet<string>);
    /** Commits the run, then starts an empty one. */
    reset(): void;
    /**
     * Flushes the run if `decl` would invalidate it, before it writes `count`
     * slots from `first` on.
     *
     * @param {number} first
     * @param {number} count
     * @param {number} decl - the declaration's position in the list
     * @return {boolean} whether the vector was full beforehand, to pass to `assign`
     */
    begin(first: number, count: number, decl: number): boolean;
    /**
     * @param {number} idx
     * @param {string} value
     * @param {number} decl - the declaration's position in the list
     * @param {boolean} wasFull - as returned by `begin`
     * @param {RangePiece} [range] the tokens that spell `value`, when kept
     */
    assign(idx: number, value: string, decl: number, wasFull: boolean, range?: RangePiece): void;
}
/**
 * Commits a fully-filled slot vector when its shorthand wins the byte-cost
 * comparison: a lone same-property declaration is rewritten in place, and a
 * profitable cover is inserted after the final represented declaration while
 * the represented, non-fallback declarations are removed.
 *
 * @param {BlockDeclarations} list
 * @param {{ value: string, decl: number }[]} full
 * @param {Set<number>} contributing
 * @param {Set<number>} fallbacks
 * @param {{ prop: string, value: string, important: boolean, inserted?: Map<number, number>, mayInsert?: boolean }} target
 * `mayInsert: false` limits the commit to the in-place rewrite, for a shorthand
 * that some target does not support.
 * @returns {number | undefined} the declaration that now spells the
 * shorthand, or undefined when nothing was written
 */
export declare function commitShorthand(list: BlockDeclarations, full: {
    value: string;
    decl: number;
}[], contributing: Set<number>, fallbacks: Set<number>, target: {
    prop: string;
    value: string;
    important: boolean;
    inserted?: Map<number, number>;
    mayInsert?: boolean;
}): number | undefined;
//# sourceMappingURL=slotVector.d.ts.map