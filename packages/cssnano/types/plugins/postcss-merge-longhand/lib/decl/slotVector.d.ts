import type { Container, Declaration } from 'postcss';
export type SlotVector = ({
    value: string;
    decl: Declaration;
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
 * @param {({ value: string, decl: Declaration } | null)[]} slots
 * @return {{ value: string, decl: Declaration }[] | null} the fully-filled
 * vector ready to be merged, or `null` if any slot is missing, custom,
 * conflicting on CSS-wide keywords, or has mismatched support provenance
 */
export declare function flushableSlots(slots: ({
    value: string;
    decl: Declaration;
} | null)[]): {
    value: string;
    decl: Declaration;
}[] | null;
/**
 * The state of one importance lane of a slot-lane reducer: the slot vector, the
 * declarations that contribute to it and the ones kept as fallbacks. A reducer
 * walks its declarations, calls `begin` before writing slots, `assign` for each
 * slot and `reset` wherever a declaration ends the run.
 */
export declare class SlotLane {
    /** @type {SlotVector} */
    slots: SlotVector;
    /** @type {Set<Declaration>} */
    contributing: Set<Declaration>;
    /** @type {Set<Declaration>} */
    fallbacks: Set<Declaration>;
    commit: (slots: SlotVector, contributing: Set<Declaration>, fallbacks: Set<Declaration>) => void;
    /**
     * @param {number} size - how many slots the family has
     * @param {(slots: SlotVector, contributing: Set<Declaration>, fallbacks: Set<Declaration>) => void} commit
     * called with the state whenever the run ends, before it is cleared
     */
    constructor(size: number, commit: (slots: SlotVector, contributing: Set<Declaration>, fallbacks: Set<Declaration>) => void);
    /** Commits the run, then starts an empty one. */
    reset(): void;
    /**
     * Flushes the run if `decl` would invalidate it, before it writes `count`
     * slots from `first` on.
     *
     * @param {number} first
     * @param {number} count
     * @param {Declaration} decl
     * @return {boolean} whether the vector was full beforehand, to pass to `assign`
     */
    begin(first: number, count: number, decl: Declaration): boolean;
    /**
     * @param {number} idx
     * @param {string} value
     * @param {Declaration} decl
     * @param {boolean} wasFull - as returned by `begin`
     */
    assign(idx: number, value: string, decl: Declaration, wasFull: boolean): void;
}
/**
 * Commits a fully-filled slot vector when its shorthand wins the byte-cost
 * comparison: a lone same-property declaration is rewritten in place, and a
 * profitable cover is inserted after the final represented declaration while
 * the represented, non-fallback declarations are removed.
 *
 * @param {Container} rule
 * @param {{ value: string, decl: Declaration }[]} full
 * @param {Set<Declaration>} contributing
 * @param {Set<Declaration>} fallbacks
 * @param {{ prop: string, value: string, important: boolean, inserted?: Map<Declaration, Declaration>, mayInsert?: boolean }} target
 * `mayInsert: false` limits the commit to the in-place rewrite, for a
 * shorthand that some target does not support.
 */
export declare function commitShorthand(rule: Container, full: {
    value: string;
    decl: Declaration;
}[], contributing: Set<Declaration>, fallbacks: Set<Declaration>, target: {
    prop: string;
    value: string;
    important: boolean;
    inserted?: Map<Declaration, Declaration>;
    mayInsert?: boolean;
}): void;
//# sourceMappingURL=slotVector.d.ts.map